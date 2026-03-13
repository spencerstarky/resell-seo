import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getValidAccessToken, getDetailedItemInfo } from '@/lib/ebay-api';
import { getOptimizerCompatibleItemDetails } from '@/lib/ebay-search';
import crypto from 'crypto';
import { StyleCodeEngine } from '@/lib/style-code-intelligence';
import { StyleCompatibilityEngine } from '@/lib/style-compatibility-matrix';

// NOTE: Bypassing Google Generative AI SDK temporarily to debug connectivity/Key issues directly.
// We use native 'fetch' to control the exact request and see the raw response.

export async function POST(request: NextRequest) {
    try {
        const { title, itemId, imageUrl, forceRefresh, auditMode } = await request.json();

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
        }

        if (!title && !itemId) {
            return NextResponse.json({ error: 'Title or Item ID is required' }, { status: 400 });
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user && !auditMode) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // --- HISTORY CHECK (Free Cache) ---
        // Create a consistent hash of the input to detect duplicates
        // We normalize by trimming and lowercasing.
        const normalizedInput = (title || '').trim().toLowerCase();
        const inputHash = crypto.createHash('sha256').update(normalizedInput).digest('hex');

        if (user && !process.env.SKIP_CACHE && !forceRefresh && !auditMode) {
            const { data: historyMatch } = await supabase
                .from('optimization_history')
                .select('optimized_title')
                .eq('user_id', user.id)
                .eq('original_title_hash', inputHash)
                .maybeSingle();

            if (historyMatch) {
                console.log(`[Cache Hit] Returning history for: "${title}"`);
                return NextResponse.json({
                    optimizedTitle: historyMatch.optimized_title,
                    fromCache: true
                });
            }
        }
        // ----------------------------------

        // --- SAFEGUARD: Tier Limits (Skip for Audit Mode/Anonymous) ---
        if (user && !auditMode) {
            // 1. Get User Profile for Tier
            const { data: profile } = await supabase
                .from('profiles')
                .select('plan_tier')
                .eq('id', user.id)
                .single();

            let tier = profile?.plan_tier || 'trial';

            // Admin Override for resellseo@gmail.com
            if (user.email === 'resellseo@gmail.com') {
                tier = 'annual';
            }

            // Define Limits
            let limit = 25; // Free: 25 Lifetime
            let isMonthly = false;
            let isYearly = false;

            if (tier === 'trial') {
                limit = 25; // Trial limit
                isMonthly = false;
            } else if (tier === 'annual') {
                limit = 5000; // Annual Cap
                isYearly = true;
            }

            // 2. Count Usage
            const query = supabase
                .from('optimization_history')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id);

            if (isMonthly) {
                // Reset on 1st of month
                const startOfMonth = new Date();
                startOfMonth.setDate(1);
                startOfMonth.setHours(0, 0, 0, 0);
                query.gte('created_at', startOfMonth.toISOString());
            } else if (isYearly) {
                // Reset on Jan 1st
                const startOfYear = new Date();
                startOfYear.setMonth(0, 1);
                startOfYear.setHours(0, 0, 0, 0);
                query.gte('created_at', startOfYear.toISOString());
            }

            const { count: usageCount } = await query;

            if (usageCount !== null && usageCount >= limit) {
                console.warn(`[Limit Reached] User ${user.id} (${tier}) hit limit: ${usageCount}/${limit}`);
                let period = 'total';
                if (isMonthly) period = 'this month';
                if (isYearly) period = 'this year';

                return NextResponse.json(
                    { error: `You have reached your ${tier} plan limit of ${limit} rewrites ${period}. Please upgrade or contact support.` },
                    { status: 429 }
                );
            }
        }
        // ------------------------------

        // 1. Fetch Item Specifics AND Images from eBay (Level 2)
        let additionalInfo = '';
        let galleryImages: string[] = [];

        // Initialize processing title (mutable)
        let processingTitle = title;
        let debugLastError = '';

        if (itemId) {
            try {
                if (auditMode) {
                    // AUDIT MODE: Use public data (Client Credentials)
                    console.log(`[Optimize] Audit Mode active for Item ${itemId}`);
                    const details = await getOptimizerCompatibleItemDetails(itemId);
                    additionalInfo = details.specifics;
                    galleryImages = details.imageUrls || [];

                    // If title was missing in request, use the one from eBay
                    if (!processingTitle && details.originalTitle) {
                        processingTitle = details.originalTitle;
                    }
                } else if (user) {
                    // STANDARD MODE: Use User's Token (requires connected account)
                    const accessToken = await getValidAccessToken(user.id, supabase);
                    const details = await getDetailedItemInfo(itemId, accessToken);
                    additionalInfo = details.specifics;
                    galleryImages = details.imageUrls || [];
                }

                // If client provided an image but we found none in gallery, keep client's
                if (galleryImages.length === 0 && imageUrl) {
                    galleryImages.push(imageUrl);
                }

                console.log(`[Level 3] Fetched specifics + ${galleryImages.length} images for ${itemId}`);
            } catch (err: any) {
                console.warn(`[Level 3] Failed to fetch specifics: ${err.message}`);
                // Fallback: use client image if DB lookup failed
                if (imageUrl) galleryImages.push(imageUrl);
            }
        } else {
            // New draft scenario? Use client image
            if (imageUrl) galleryImages.push(imageUrl);
        }

        // 2. Prepare Prompt

        // 2. Prepare Prompt

        // --- STYLE CODE INTELLIGENCE ---
        // (Old signal dump removed in favor of Style Compatibility Matrix)

        // --- STYLE CODE INTELLIGENCE ---
        let verifiedStyleCode: string | null = null;
        let detectedBrand = '';

        // Attempt to extract Brand from Item Specifics (most reliable)
        const brandMatch = additionalInfo.match(/Brand:\s*([^,]+)/i);
        if (brandMatch) {
            detectedBrand = brandMatch[1].trim();
        }

        if (detectedBrand) {
            console.log(`[StyleEngine] Analyzing for Brand: ${detectedBrand}`);
            const styleEngine = new StyleCodeEngine(supabase);

            // Gather all text sources
            // Gather all text sources
            const combinedText = `${processingTitle} ${additionalInfo}`;
            const candidates = styleEngine.extractCandidatesFromText(combinedText);

            console.log(`[StyleEngine] Found ${candidates.length} candidates:`, candidates);

            for (const cand of candidates) {
                const result = await styleEngine.validateCandidate(cand, detectedBrand, combinedText);

                // Log detection (Telemetry)
                // We fire-and-forget this insert to not slow down the user
                supabase.from('style_code_detections').insert({
                    brand_id: result.brandId || null,
                    detected_brand_name: detectedBrand, // Helpful for unknown brands
                    candidate_code: cand,
                    confidence_score: result.confidenceScore,
                    source: 'text_scan',
                    accepted: result.isValid,
                    user_confirmed: false
                }).then(({ error }) => {
                    if (error) console.warn('[StyleEngine] Log Error:', error.message);
                });

                if (result.isValid) {
                    verifiedStyleCode = result.candidate;
                    console.log(`[StyleEngine] VALID MATCH: ${verifiedStyleCode} (Score: ${result.confidenceScore})`);
                    break; // Stop at first valid match (greedy)
                }
            }
        }
        // -------------------------------

        // --- STYLE COMPATIBILITY MATRIX ---
        // --- STYLE COMPATIBILITY MATRIX ---
        const matrixEngine = new StyleCompatibilityEngine(supabase);
        const matrixContext = await matrixEngine.generatePromptContext(processingTitle, additionalInfo);
        console.log('[Matrix] Context:', matrixContext.trim());

        // SANITIZATION: Minimal cleanup
        let cleanInfo = additionalInfo || 'None provided';
        // (Redaction logic removed to prevent AI from including "[REDACTED]" in titles)

        // ---------------------------------------------------------
        // TRANSFORM: 3-Layer Prompt Architecture
        // ---------------------------------------------------------

        // Version Control for Prompts
        const PROMPT_VERSIONS = {
            Extraction: "V1.0",
            SEO: "V1.0",
            L1: "V1.2",
            L2: "V1.4",
            L3: "V0.8"
        };
        const apiKey = process.env.GEMINI_API_KEY;

        // 1. PREPARE IMAGES (Fetch Once, Use Everywhere)
        const imagesToProcess = galleryImages.slice(0, 12);
        console.log(`[ImgProc] Processing ${imagesToProcess.length} images...`);

        const imageFetchPromises = imagesToProcess.map(async (imgUrl) => {
            try {
                const imgRes = await fetch(imgUrl);
                if (imgRes.ok) {
                    const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
                    const imgBuffer = await imgRes.arrayBuffer();
                    const base64Image = Buffer.from(imgBuffer).toString('base64');
                    return {
                        inline_data: {
                            mime_type: contentType,
                            data: base64Image
                        }
                    };
                }
            } catch (err) {
                console.warn(`[ImgProc] Failed to fetch image ${imgUrl}:`, err);
            }
            return null;
        });

        const imageResults = await Promise.all(imageFetchPromises);
        const imageParts = imageResults.filter((part): part is any => part !== null);


        // 2. HELPER: GENERIC GEMINI CALLER
        const callGeminiLayer = async (layerName: string, promptText: string, useImages: boolean): Promise<string> => {
            const candidateModels = [
                'gemini-2.0-flash',     // Multimodal & Fast
                'gemini-2.0-flash-001', // Explicit version
                'gemini-1.5-flash',
                'gemini-1.5-flash-latest',
                'gemini-1.5-pro'        // Fallback
            ];

            let lastModelError = '';

            for (const modelName of candidateModels) {
                try {
                    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

                    // Construct Payload
                    const parts: any[] = [{ text: promptText }];

                    // Add images ONLY if model supports it (Has 'flash' or is known multimodal) and images exist and layer requests them
                    // Note: 1.5 Pro can handle images too, but we tend to use Flash for speed/images.
                    if (useImages && imageParts.length > 0) {
                        parts.push(...imageParts);
                    }

                    const payload = { contents: [{ parts }] };

                    const response = await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });

                    if (!response.ok) {
                        const errText = await response.text();

                        // Retry Logic for 400/500 with images (sometimes image format is rejected)
                        if (useImages && parts.length > 1 && (response.status === 400 || response.status === 500)) {
                            console.warn(`[${layerName}] Model ${modelName} failed with images. Retrying Text-Only...`);
                            const textPayload = { contents: [{ parts: [{ text: promptText }] }] };
                            const textResponse = await fetch(url, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(textPayload)
                            });

                            if (textResponse.ok) {
                                const data = await textResponse.json();
                                const textResult = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                                console.log(`[${layerName}] Success (Text-Only Fallback) - ${modelName}`);
                                return textResult;
                            }
                        }

                        if (response.status === 404) {
                            console.warn(`[${layerName}] Model ${modelName} 404.`);
                            continue;
                        }

                        throw new Error(`${response.status} - ${errText}`);
                    }

                    const data = await response.json();
                    const result = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

                    if (result) {
                        console.log(`[${layerName}] Success - ${modelName}`);
                        return result;
                    } else {
                        lastModelError = `Block: ${data.candidates?.[0]?.finishReason}`;
                    }

                } catch (err: any) {
                    console.warn(`[${layerName}] Error ${modelName}: ${err.message}`);
                    lastModelError = err.message;
                }
            }

            throw new Error(`Layer ${layerName} Failed: ${lastModelError}`);
        };


        // 3. EXECUTE LAYERS (3-Stage PRD Architecture)
        let optimizedTitle = '';

        // --- STAGE 1: ATTRIBUTE EXTRACTION ---
        const prompt1_extraction = `
You are an eBay listing attribute extraction engine.

Your task is to analyze the provided item information and extract structured attributes.

Rules:

Only extract attributes explicitly stated in the input.
NEVER guess brand, size, material, color, or features.
Conflict Resolution: If the Original Title provides a clear attribute (like "Linen"), prioritize it over conflicting or messy details in Item Info.
Formatting: Strip all commas from extracted values. Do not use hyphens unless strictly part of a brand name or model number. (e.g. "Viscose, Linen" -> "Viscose Linen", "Button-Up" -> "Button Up").
If an attribute is not explicitly present, return null.
Return ONLY valid JSON.
Do not include explanations.
Return JSON with these exact keys: brand item_type gender size color material features style condition

User Input Template: Item Info: ${cleanInfo}

Original Title: ${processingTitle}

Detected Brand: ${detectedBrand}
`;

        console.log(`--- STAGE 1: EXTRACTION (${PROMPT_VERSIONS.Extraction}) ---`);
        let extractedAttrs: any = {};
        try {
            const rawResp1 = await callGeminiLayer('Extraction', prompt1_extraction, true);
            const cleanedResp1 = rawResp1.replace(/```json/gi, '').replace(/```/g, '').trim();
            extractedAttrs = JSON.parse(cleanedResp1);
            console.log('> Stage 1 Extracted:', extractedAttrs);
        } catch (e: any) {
            console.error('Stage 1 Failed:', e);
            // Fallback: If extraction fails completely, we just use the original title as the base
            extractedAttrs = { item_type: processingTitle };
            debugLastError = e.message;
        }

        // --- STAGE 2: SEO KEYWORD GENERATOR ---
        const prompt2_keywords = `
You are an eBay SEO keyword generator.

Generate safe style or trend keywords that improve search discoverability for eBay clothing listings.

Rules:
- Only generate broad style or trend keywords.
- Do NOT invent materials, sizes, brands, or physical features.
- Use universally safe descriptors such as style, occasion, or fashion trends.
- Return exactly 8 keywords.
- Return JSON only.

Output format:
{
 "keywords": []
}

User Input Template:
Item Attributes:
Brand: ${extractedAttrs.brand || 'Unknown'}
Item Type: ${extractedAttrs.item_type || 'Unknown'}
Gender: ${extractedAttrs.gender || 'Unknown'}
Style: ${extractedAttrs.style || 'Unknown'}
        `;

        console.log(`--- STAGE 2: SEO GENERATION (${PROMPT_VERSIONS.SEO}) ---`);
        let generatedKeywords: string[] = [];
        try {
            // Text only for speed, no images needed for keyword expansion
            const rawResp2 = await callGeminiLayer('SEO', prompt2_keywords, false);
            const cleanedResp2 = rawResp2.replace(/```json/gi, '').replace(/```/g, '').trim();
            const parsedKeywords = JSON.parse(cleanedResp2);
            if (parsedKeywords && Array.isArray(parsedKeywords.keywords)) {
                generatedKeywords = parsedKeywords.keywords;
            }
            console.log('> Stage 2 Keywords:', generatedKeywords);
        } catch (e: any) {
            console.error('Stage 2 Failed:', e);
            // Not a fatal error, just means no padding
        }

        // --- STAGE 3: DETERMINISTIC TITLE CONSTRUCTION (App Logic) ---
        console.log(`--- STAGE 3: TITLE ASSEMBLY ---`);

        // 1. Assemble Core Base
        const baseComponents = [
            extractedAttrs.brand,
            extractedAttrs.gender,
            extractedAttrs.size,
            extractedAttrs.material,
            extractedAttrs.item_type,
            extractedAttrs.color,
            extractedAttrs.features,
            extractedAttrs.style,
            extractedAttrs.condition
        ];

        // Filter out nulls/undefined and join
        let coreKeywords = baseComponents.filter(c => c && typeof c === 'string').map(c => c.trim().replace(/\s+/g, ' '));

        // Remove duplicates case-insensitively just in case extraction duped a word
        coreKeywords = coreKeywords.filter((word, index, self) =>
            index === self.findIndex((t) => (
                t.toLowerCase() === word.toLowerCase()
            ))
        );

        let currentTitle = coreKeywords.join(' ');

        // 2. Padding Logic
        // If title < 70 characters: append next SEO keyword until near 80 characters
        for (const kw of generatedKeywords) {
            // Safety check: don't pad if already long enough
            if (currentTitle.length >= 75) break;

            // Safety check: don't add duplicate keywords
            if (!currentTitle.toLowerCase().includes(kw.toLowerCase())) {
                const potentialTitle = `${currentTitle} ${kw}`;
                // Only add if it doesn't push us over limits (we leave a small buffer, 
                // but the hard truncation step below will catch actual overflow)
                if (potentialTitle.length <= 80) {
                    currentTitle = potentialTitle;
                }
            }
        }

        optimizedTitle = currentTitle;

        // If for some reason we still exceed 80 (e.g. core attributes were massive), hard truncate
        if (optimizedTitle.length > 80) {
            const words = optimizedTitle.split(' ');
            let truncatedTitle = '';
            for (const word of words) {
                const testTitle = truncatedTitle ? `${truncatedTitle} ${word}` : word;
                if (testTitle.length <= 80) {
                    truncatedTitle = testTitle;
                } else {
                    break;
                }
            }
            optimizedTitle = truncatedTitle;
        }

        // Capitalize Words (Formatting)
        optimizedTitle = optimizedTitle.split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');

        console.log('> Final Assembled Title:', optimizedTitle);

        // -------------------------------------

        if (!optimizedTitle) {
            // Debugging: Try to list models to see what IS available
            let debugInfo = '';
            try {
                const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
                const listRes = await fetch(listUrl);
                if (listRes.ok) {
                    const listData = await listRes.json();
                    const modelNames = listData.models ? listData.models.map((m: any) => m.name.replace('models/', '')) : [];
                    debugInfo = `Available Models: ${modelNames.join(', ')}`;
                } else {
                    debugInfo = `ListModels Query Failed: ${listRes.status}`;
                }
            } catch (dbgErr) {
                debugInfo = 'ListModels Exception';
            }

            throw new Error(`Optimization failed to produce a title. ${debugInfo}`);
        }

        optimizedTitle = optimizedTitle.trim().replace(/^"|"$/g, '');

        if (optimizedTitle.length > 80) {
            // Smart Truncate: Don't cut words in half
            const words = optimizedTitle.split(' ');
            let currentTitle = '';

            for (const word of words) {
                const potentialTitle = currentTitle ? `${currentTitle} ${word}` : word;
                if (potentialTitle.length <= 80) {
                    currentTitle = potentialTitle;
                } else {
                    break; // Stop adding words if we hit the limit
                }
            }
            optimizedTitle = currentTitle;
        }

        // --- SAVE TO HISTORY ---
        // Store result so next time it is free (Only for registered users)
        if (user && !auditMode) {
            await supabase.from('optimization_history').insert({
                user_id: user.id,
                original_title: title,
                original_title_hash: inputHash,
                optimized_title: optimizedTitle
            });
            // Increment Usage
            await supabase.rpc('increment_usage', { user_id: user.id });
        }
        // -----------------------

        return NextResponse.json({
            optimizedTitle,
            fromCache: false,
            // Debug Data for Auditor
            analyzedImages: galleryImages, // Return full list so UI can show what was available
            itemSpecifics: cleanInfo,
            originalTitle: processingTitle,
            debugError: debugLastError || null // Expose error if one occurred
        });

    } catch (error: any) {
        console.error('Gemini Optimization Error:', error);

        const apiKeyHint = process.env.GEMINI_API_KEY ? `(Key ends in ...${process.env.GEMINI_API_KEY.slice(-4)})` : '(No Key Configured)';
        let detailedError = error.message;

        return NextResponse.json({
            error: `Gemini Error: ${detailedError} ${apiKeyHint}`
        }, { status: 500 });
    }
}
