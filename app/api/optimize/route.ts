import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getValidAccessToken, getDetailedItemInfo } from '@/lib/ebay-api';
import { getOptimizerCompatibleItemDetails } from '@/lib/ebay-search';
import crypto from 'crypto';
import { StyleCodeEngine } from '@/lib/style-code-intelligence';

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

        // --- STYLE SIGNAL INTELLIGENCE (NEW: Moved Up to allow logging) ---
        // Fetch active styles and their signals to feed the AI
        let styleContext = "NO ACTIVE STYLES FOUND.";
        try {
            const { data: activeStyles } = await supabase
                .from('style_taxonomy')
                .select(`
                    style_name,
                    display_name,
                    category_whitelist,
                    confidence_floor,
                    style_signals (
                        signal_type,
                        signal_value,
                        weight
                    )
                `);

            if (activeStyles && activeStyles.length > 0) {
                styleContext = activeStyles.map((style: any) => {
                    const signals = style.style_signals.map((s: any) => `${s.signal_value} (${s.signal_type}: ${s.weight})`).join(', ');
                    return `
                    STYLE: ${style.display_name} (Threshold: ${style.confidence_floor})
                    Allowed Categories: ${JSON.stringify(style.category_whitelist)}
                    SIGNALS: ${signals}
                    `;
                }).join('\n');
            }
            console.log('[StyleSignalEngine] Context Prepared:', styleContext.substring(0, 500) + '...');
        } catch (err) {
            console.error('Failed to fetch style signals:', err);
        }

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

        // SANITIZATION: Blind the AI to measurements in Item Specifics
        // This prevents the "inference" problem where AI reads "Chest: 44" in specifics and adds "22 Pit to Pit" to title.
        let cleanInfo = additionalInfo || 'None provided';
        if (cleanInfo !== 'None provided') {
            // Strip numbers followed by measurement keywords or units
            cleanInfo = cleanInfo.replace(/\b\d+(?:\.\d+)?\s*(?:"|'|in|cm|mm|ft)?\s*(?:Length|Chest|Pit|Sleeve|Inseam|Waist|Rise|Width)\b/gi, '[REDACTED_MEASUREMENT]');
            // Strip explicit "Size: 44" type patterns if they look like measurements (simple heuristic)
            cleanInfo = cleanInfo.replace(/\b(Chest|Bust|Length|Inseam)\s*:?\s*\d+(?:\.\d+)?\b/gi, '$1: [REDACTED]');
            // Strip explicit Material/Fabric fields to prevent hallucination
            cleanInfo = cleanInfo.replace(/\b(Material|Fabric|Shell|Lining|Content)\s*:?\s*[a-zA-Z0-9\s,\/]+\b/gi, '$1: [REDACTED_MATERIAL]');
        }

        // ---------------------------------------------------------
        // TRANSFORM: 3-Layer Prompt Architecture
        // ---------------------------------------------------------

        // Version Control for Prompts
        const PROMPT_VERSIONS = {
            Unified: "V1.3",
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
                'gemini-1.5-flash',
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


        // 3. EXECUTE LAYERS
        let pipelineTitle = title || ''; // Start with original
        let optimizedTitle = '';

        // --- UNIFIED PROMPT (V1.0) ---
        // Consolidates L1 (Structure), L2 (SEO/Functional), and L3 (Style) into one pass.

        const unifiedPrompt = `
You are an experienced eBay clothing reseller and SEO specialist.

Your task is to rewrite the provided listing title to maximize visibility and click-through on eBay, following a strict three-layer workflow.

CONTEXT:
Item Info:
${cleanInfo}

Current Title:
${processingTitle}

${styleContext ? `Style Signal Engine Data (Trends/Styles):\n${styleContext}` : ''}
${detectedBrand ? `Detected Brand: ${detectedBrand}` : ''}

WORKFLOW:

Step 1 — STRUCTURE & CLEAN TITLE:
- Rewrite the title according to this order, using only applicable attributes:
  Value Leader (Brand, luxury material, or sports team if brand is weak)
  + Product Name
  + Item Type (refine with category terms if applicable)
  + Gender
  + Size
  + Color
  + Style Code (if applicable)
  + Descriptors
  + Keywords
- Spell out Small, Medium, and Large. Use abbreviations for XXS, XS, XL, XXL, etc.
- Preserve functional attributes (e.g., zip up, hooded, packable, insulated) unless clearly contradicted.
- If both a general item type (e.g., Jacket) and specific category (e.g., Overcoat) exist, combine into one refined item type.
- Functional modifiers must directly follow the item type.
- Do NOT use dashes or separators unless they are part of the item name.
- Keep it readable, buyer-friendly, and within eBay’s character limit.
- Do NOT invent details; rely only on images, item specifics, or strong context.

SIZE AUTHORITY RULE:
- Size in the title must reflect the tagged or explicitly specified size only.
- Do NOT convert sizes based on fit notes (e.g. “fits small”, “runs large”).
- Fit notes may be referenced only as descriptors if space allows.

BRAND INTEGRITY RULE:
- Preserve the full, commonly searched brand name when present (e.g. "Polo Ralph Lauren").
- Do not shorten or simplify brand names unless the shortened form is more commonly searched.

Step 2 — DESCRIPTORS & KEYWORDS:
- Enrich the title with additional descriptors or keywords from the item info that are accurate and buyer-relevant.
- Prioritize high-value, commonly searched terms.
- Avoid redundancy with Step 1.

DESCRIPTOR PRIORITY RULE:
- Prefer style, aesthetic, or identity-based descriptors over care or utility features.
- De-prioritize or omit low-intent item specifics (e.g. pockets, easy care, wrinkle resistant) unless they are a known buyer search driver for that category.

Step 3 — STYLE SIGNAL INJECTION:
- Optionally inject style codes or trend keywords from the Style Signal Engine if contextually accurate and buyer-relevant.
- Do NOT force trends if confidence is low.

OUTPUT:
- Return ONLY ONE optimized title.
- Do NOT label the output (e.g., "Title:").
- Follow Steps 1-3 exactly in order.
        `;

        console.log(`--- EXECUTE UNIFIED PROMPT (${PROMPT_VERSIONS.Unified}) ---`);
        try {
            pipelineTitle = await callGeminiLayer('Unified', unifiedPrompt, true); // Pass images

            // Aggressive Cleanup
            pipelineTitle = pipelineTitle
                .replace(/^(Title|Output|Optimized Title):/i, '')
                .trim()
                .replace(/^"|"$/g, '');

            console.log(`> Unified Result: ${pipelineTitle}`);
        } catch (e) {
            console.error('Unified Prompt Failed', e);
        }



        optimizedTitle = pipelineTitle;

        // --- POST-PROCESSING SAFETY FILTER ---
        if (optimizedTitle) {
            // 0. CLEANUP MARKDOWN & LABELS
            // Remove markdown code blocks (```text, ```)
            optimizedTitle = optimizedTitle.replace(/```[a-z]*\s*/gi, '').replace(/```/g, '').trim();

            // Remove explicit labels if the model added them
            optimizedTitle = optimizedTitle.replace(/^(OUTPUT|Final Title|Title|Optimized Title):\s*/i, '');

            // 0.5. CLEANUP INTERNAL MONOLOGUE (AI forgot to be silent)
            if (optimizedTitle.includes('PHASE') || optimizedTitle.includes('STEP')) {
                console.log('[Filter] Detected Internal Monologue. Cleaning...');
                const lines = optimizedTitle.split('\n');
                // Look for the last substantial line that DOES NOT contain internal keywords
                const cleanLine = lines.reverse().find(l =>
                    l.trim().length > 10 &&
                    !l.includes('PHASE') &&
                    !l.includes('STEP') &&
                    !l.includes('Input:')
                );
                if (cleanLine) optimizedTitle = cleanLine.trim();
            }

            // AI models (especially Flash) are stubborn about adding "Mens Medium" to bags.
            const lowerOrig = (title || '').toLowerCase();
            const lowerOpt = optimizedTitle.toLowerCase();
            const isBagOrTech = /backpack|bag|tote|purse|wallet|camera|laptop|phone|monitor|console|remote/.test(lowerOrig);

            if (isBagOrTech) {
                // 1. Check for Phantom Size
                if (!lowerOrig.includes('medium') && !lowerOrig.includes('med ') && lowerOpt.includes('medium')) {
                    console.log('[Filter] Removing hallucinated "Medium"');
                    optimizedTitle = optimizedTitle.replace(/\bMedium\b/gi, '').replace(/\s+/g, ' ').trim();
                }
                if (!lowerOrig.includes('large') && !lowerOrig.includes('lg ') && lowerOpt.includes('large')) {
                    console.log('[Filter] Removing hallucinated "Large"');
                    optimizedTitle = optimizedTitle.replace(/\bLarge\b/gi, '').replace(/\s+/g, ' ').trim();
                }

                // 2. Check for Phantom Gender
                if (!lowerOrig.includes('men') && lowerOpt.includes('mens')) {
                    console.log('[Filter] Removing hallucinated "Mens"');
                    optimizedTitle = optimizedTitle.replace(/\bMens\b/gi, '').replace(/\s+/g, ' ').trim();
                }
                if (!lowerOrig.includes('women') && lowerOpt.includes('womens')) {
                    console.log('[Filter] Removing hallucinated "Womens"');
                    optimizedTitle = optimizedTitle.replace(/\bWomens\b/gi, '').replace(/\s+/g, ' ').trim();
                }
            }

            // 3. CHECK FOR HALLUCINATED MEASUREMENTS (NxN format)
            const measRegex = /\b(\d+(?:\.\d+)?)\s*["']?\s*[xX]\s*(\d+(?:\.\d+)?)\s*["']?\b/g;
            // Create a "clean" original title for comparison (remove spaces/punctuation to fuzzy match numbers)
            const cleanOrig = lowerOrig.replace(/[^0-9x.]/g, '');

            // We must loop manually because replace with global regex behaves partly on iteration
            optimizedTitle = optimizedTitle.replace(measRegex, (fullMatch, n1, n2) => {
                // Check if this n1 x n2 combo exists in original
                const simpleLook = `${n1}x${n2}`;
                if (cleanOrig.includes(simpleLook)) return fullMatch;

                // Strict Check:
                const hasSpaced = new RegExp(`${n1}\\s*[xX]\\s*${n2}`).test(lowerOrig);
                if (hasSpaced) return fullMatch;

                console.log(`[Filter] Removing hallucinated measurement: ${fullMatch}`);
                return ''; // Remove it
            });

            // 4. CHECK FOR HALLUCINATED SINGLE MEASUREMENTS (e.g. 26", 29")
            // Pattern: Number followed by quote (26", 26')
            // fixed regex: Remove trailing boundary \b to match 24" followed by space
            const singleMeasRegex = /\b(\d+(?:\.\d+)?)\s*["'\u201C\u201D\u2033\u2036]/g;
            optimizedTitle = optimizedTitle.replace(singleMeasRegex, (fullMatch, num) => {
                // Check if this number exists in the original title
                // We verify if "26" exists as a whole word in lowerOrig
                const val = num.trim();
                // Simple check: does the original title contain this number? 
                // We use a boundary check regex for the number
                if (new RegExp(`\\b${val}\\b`).test(lowerOrig)) {
                    return fullMatch;
                }

                // Also check if original had it with quote (e.g. 26")
                if (lowerOrig.includes(fullMatch.toLowerCase().trim())) {
                    return fullMatch;
                }

                console.log(`[Filter] Removing hallucinated single measurement: ${fullMatch}`);
                return '';
            });

            // 5. ORPHAN KEYWORD CLEANUP
            // Remove "Sleeve" if it is not preceded by "Short" or "Long"
            if (/\b(?<!Short\s)(?<!Long\s)Sleeve\b/i.test(optimizedTitle)) {
                // Check if "Sleeve" was in original title alone? If not, remove it.
                if (!lowerOrig.includes(' sleeve ')) {
                    console.log('[Filter] Removing orphan "Sleeve"');
                    optimizedTitle = optimizedTitle.replace(/\b(?<!Short\s)(?<!Long\s)Sleeve\b/gi, '').trim();
                }
            }

            // 6. CONTEXTUAL MEASUREMENT CLEANUP (Aggressive)
            // If we see a pattern like "38 Length" or "Pit 24" where the number was NOT in the original title, nuke it.
            const measKeywords = ['Pit', 'P2P', 'Length', 'Width', 'Inseam', 'Rise', 'Waist', 'Chest', 'Bust', 'Sleeve', 'Shoulder'];

            measKeywords.forEach(kw => {
                // Regex to find "NumberKW" or "KWNumber"
                // Match: (Number) (Possible Unit) (Keyword) OR (Keyword) (Number)
                const patterns = [
                    new RegExp(`\\b(\\d+(?:\\.\\d+)?)\\s*(?:["']|in|cm)?\\s*${kw}\\b`, 'gi'), // "38 Length"
                    new RegExp(`\\b${kw}\\s*:?\\s*(\\d+(?:\\.\\d+)?)\\s*(?:["']|in|cm)?\\b`, 'gi') // "Length: 38"
                ];

                patterns.forEach(regex => {
                    optimizedTitle = optimizedTitle.replace(regex, (match, num) => {
                        // Check if the number (e.g. "38") is in the original title.
                        // Use strict boundary check.
                        if (num && new RegExp(`\\b${num.trim()}\\b`).test(lowerOrig)) {
                            return match; // It's valid (e.g. original said "38 Length")
                        }
                        console.log(`[Filter] Removing contextual measurement hallucination: ${match}`);
                        return '';
                    });
                });
            });

            // 7. ORPHAN MEASUREMENT LABEL CHECK
            // Clean up any surviving labels (e.g. "Pit to Pit") that lost their numbers
            const orphanLabels = [
                /\bPit\s+To\s+Pit\b/gi,
                /\bP2P\b/gi,
                /\b(Shoulder\s+)?To\s+(Shoulder|Hem|Cuff)\b/gi,
                /\bLength\b/gi,
                /\bInseam\b/gi,
                /\bWidth\b/gi,
                /\bRise\b/gi
            ];
            orphanLabels.forEach(regex => {
                const matches = optimizedTitle.match(regex);
                if (matches) {
                    matches.forEach(m => {
                        if (!lowerOrig.includes(m.toLowerCase())) {
                            console.log(`[Filter] Removing orphan label: ${m}`);
                            optimizedTitle = optimizedTitle.replace(m, '').trim();
                        }
                    });
                }
            });

            // 8. FINAL UNIT SWEEP
            // Catch "24in" or "24cm" leftovers
            const unitRegex = /\b(\d+(?:\.\d+)?)\s*(?:in|inch|inches|cm|mm)\b/gi;
            optimizedTitle = optimizedTitle.replace(unitRegex, (match, num) => {
                if (new RegExp(`\\b${num.trim()}\\b`).test(lowerOrig)) return match;
                console.log(`[Filter] Removing unit measurement: ${match}`);
                return '';
            });

            // Clean up double spaces left by removal
            optimizedTitle = optimizedTitle.replace(/\s+/g, ' ').trim();

            // 4. CHECK FOR FALSE "NEW" (Strict eBay Rule)
            // If the AI inserts "New" but the original text has NO mention of "New", "NWT", or "NWOT", strip it.
            // We assume "Excellent", "Mint", "Great" != "New".
            const lowerInfo = (additionalInfo || '').toLowerCase(); // Check Item Specifics too
            const combinedSource = lowerOrig + ' ' + lowerInfo;

            if (/\bNew\b/i.test(optimizedTitle)) {
                // If source does NOT contain "new", "nwt", "nwot", or strong indicators like "nib", "tags", "unused"
                if (!/\b(new|nwt|nwot|nib|tags|unused|sealed|box)\b/i.test(combinedSource)) {
                    console.log('[Filter] Removing hallucinated "New" keyword');
                    // Remove "New" (case-insensitive) but keep surrounding spaces clean
                    optimizedTitle = optimizedTitle.replace(/\bNew\b/gi, '').replace(/\s+/g, ' ').trim();
                }
            }
        }
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
            originalTitle: processingTitle
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
