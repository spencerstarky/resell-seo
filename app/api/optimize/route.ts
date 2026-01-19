import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getValidAccessToken, getDetailedItemInfo } from '@/lib/ebay-api';
import crypto from 'crypto';
import { StyleCodeEngine } from '@/lib/style-code-intelligence';

// NOTE: Bypassing Google Generative AI SDK temporarily to debug connectivity/Key issues directly.
// We use native 'fetch' to control the exact request and see the raw response.

export async function POST(request: NextRequest) {
    try {
        const { title, itemId, imageUrl, forceRefresh } = await request.json();

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
        }

        if (!title && !itemId) {
            return NextResponse.json({ error: 'Title or Item ID is required' }, { status: 400 });
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // --- HISTORY CHECK (Free Cache) ---
        // Create a consistent hash of the input to detect duplicates
        // We normalize by trimming and lowercasing.
        const normalizedInput = (title || '').trim().toLowerCase();
        const inputHash = crypto.createHash('sha256').update(normalizedInput).digest('hex');

        if (!process.env.SKIP_CACHE && !forceRefresh) {
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

        // --- SAFEGUARD: Tier Limits ---
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
        // ------------------------------

        // 1. Fetch Item Specifics AND Images from eBay (Level 2)
        let additionalInfo = '';
        let galleryImages: string[] = [];

        if (itemId) {
            try {
                const accessToken = await getValidAccessToken(user.id, supabase);
                const details = await getDetailedItemInfo(itemId, accessToken);
                additionalInfo = details.specifics; // Extract specifics string
                galleryImages = details.imageUrls || []; // Extract images array

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
            const combinedText = `${title} ${additionalInfo}`;
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

        const promptText = `
        Current Date: ${new Date().toISOString()}

        INPUT DATA:
        Original Title: "${title}"
        Item Specifics: "${additionalInfo || 'None provided'}"

        SYSTEM ROLE

        You are a Ruthless eBay Data Cleaner & SEO Optimizer.

        You normalize messy titles into accurate, buyer-focused, SEO-optimized eBay titles under strict factual and formatting constraints.

        Accuracy > Buyer Clarity > SEO.

        HARD OUTPUT RULES

        Output ONE title string only

        Maximum length: 80 characters

        No punctuation symbols (/ - : ,)

        Use spaces only

        Never cut a word in half

        Title Case only

        PHASE 1 — FACT EXTRACTION (NO GUESSING)

        Extract ONLY facts explicitly visible in:

        Original title

        Item specifics

        Brand or retail tags in images

        Allowed Facts

        Brand

        Product Name

        Gender (only if explicit)

        Tag Size

        Measurements (STRICT: Source from ORIGINAL TITLE ONLY. Do NOT extract from Item Specifics or Images. If not in title, do not include.)

        Color (MANDATORY if visible)

        Material (tag or text only)

        Team Name

        Condition

        Style / Model Code (STRICT RULES BELOW)

        STYLE / MODEL CODE RULES (ZERO TOLERANCE)

        A code is valid ONLY if:

        Appears on a brand or retail tag

        Contains at least one letter

        Is 8 characters or fewer

        Is not all numbers

        Is not a long factory or care tag number

        If uncertain → DO NOT INCLUDE IT

        ${verifiedStyleCode
                ? `*** FORCE INCLUSION ***\n        TRUSTED STYLE CODE DETECTED: "${verifiedStyleCode}"\n        You MUST include "${verifiedStyleCode}" at the end of the title.`
                : `*** NO TRUSTED STYLE CODE DETECTED ***\n        Do NOT guess or invent a style code. Use ONLY what is explicitly proven.`}

        PHASE 2 — STRATEGY DECISION
        VALUE LEADER (FIRST TOKEN)

        The AI must select one and only one Value Leader.

        Choose ONE:

        Team Name
        Use when apparel is on a generic or low-value blank
        Example: Jerzees, Gildan, Hanes
        Title starts with team/entity name (e.g., Chicago Bulls)

        Luxury Material
        Use when brand is low-value AND material is high buyer intent
        Example: Forever 21 + 100% Leather
        Title starts with material (e.g., Leather Jacket)

        Brand (Default)
        Use when brand carries meaningful buyer search value
        Example: Patagonia, Nike, Levi’s

        Hard Rule
        Only one Value Leader
        Value Leader is always the first token in the title

        PHASE 2.5 — STYLE SIGNAL INTELLIGENCE (OPTIONAL)
        You have access to a database of Style Signals below.
        
        INSTRUCTIONS:
        1. Check the item's Category (from Item Specifics) against the "Allowed Categories" for each style.
        2. If allowed, check for matches in the Title, Item Specifics, or Visuals against the "SIGNALS" list.
        3. Sum the weights of matched signals.
        4. If Total Weight >= Threshold, you MAY include the [Style Keyword] (e.g., Gorpcore).
        5. If included, place it in the [SEO Keywords] slot.
        
        AVAILABLE STYLES & SIGNALS:
        ${styleContext}

        PHASE 3 — TITLE CONSTRUCTION
        STRICT ORDER (UPDATED WITH STYLE CODE)

        [Value Leader]
        [Product Name]
        [Type: "Shoes" (MANDATORY IF FOOTWEAR)]
        [Gender]
        [Tag Size]
        [Measurements (OPTIONAL - SKIP IF NOT IN ORIGINAL TITLE)]
        [Style Code]          <-- NEW: validated only, bare code, no label
        [Color]
        [Type]
        [SEO Keywords]
        [New]
        [Low Brand If Moved]

        FOOTWEAR MANDATE (CRITICAL)
        If the item is footwear (sneakers, boots, etc.), you MUST place the word "Shoes" (or specific type like "Boots") immediately after the [Product Name].
        Usage: "[Brand] [Model] Shoes [Gender]..."
        
        Style Code Rules (Critical)
        Style code is only included if pre-validated
        Appears as bare alphanumeric text
        ❌ No “Style”, “Model”, “#”, or punctuation
        ❌ Never inferred
        ❌ Never front-loaded
        ❌ Never mid-title

        Placement Rule
        Always appears after Measurements
        Always part of the core title
        Appears before Color / Type / SEO Keywords

        Example
        Patagonia Nano Puff Jacket Men’s Large 22x28 84212 Black Puffer
        Hoka One One Rincon 3 Shoes Men 10.5 D 1119395 Blue Running

        MATERIAL HANDLING
        Material has no dedicated slot.
        Material only appears as:
        Value Leader (Luxury Material case), OR
        SEO Keyword

        SIZE FORMATTING RULES (MANDATORY)

        Use:

        Small

        Medium

        Large

        XL

        NEVER abbreviate:

        Small

        Medium

        Large

        ALWAYS abbreviate:

        XL

        XXL

        Big & Tall sizes (XLT 3XLT 4XB)

        Use only sizes explicitly shown

        FORMATTING OPERATIONS

        Remove labels (Size Sz W L Waist)

        Keep values only

        Compact measurements (28 x 26 → 28x26)

        Gender Formatting:
        Use "Men's" or "Women's" (Plural with Apostrophe) whenever possible.
        Fallback to "Mens" or "Womens" only if space is critically low.
        Avoid singular "Men" or "Women" unless part of a specific product name.

        New / NWT → add New at end

        Nike/Jordan codes:

        Keep first 6 characters only

        SEO RULES

        Think like a buyer

        Stack synonyms if space allows

        Keyword caps:

        Clothing: max 3

        Outerwear: max 2

        Bags Electronics Home: max 1
        
        REDUNDANCY CHECK (CRITICAL)
        If [Tag Size] is exactly the same as the first number in [Measurements], DROP [Tag Size].
        
        STYLE STACKING (NEW RULE)
        If multiple styles are highly relevant (e.g. "Vintage" AND "Skater"), you MAY include both if space permits in the [SEO Keywords] slot.
        Prioritize the most distinct style first.
        Example: "Vintage Skater" is better than just "Vintage".
        Example: "36" + "36x32" -> Keep ONLY "36x32".
        Example: "34" + "34x30" -> Keep ONLY "34x30".
        Reason: Measurements implies the size. Eliminate redundancy.

        PHASE 4 — SPACE SAVING / DROP PRIORITY
        UPDATED DROP LOGIC (Style Code–Aware)

        If title exceeds 80 characters, remove items in this exact order:

        DROP PRIORITY (LOW → HIGH VALUE)
        1. SEO Keywords
        2. Type
        3. Material (if present)
        4. Gender
        5. Tag Size

        PROTECTED (DO NOT DROP UNLESS ABSOLUTELY REQUIRED)
        1. Value Leader
        2. Product Name
        3. Measurements
        4. Style Code ← NEW PROTECTION
        5. Color

        Style code may only be dropped after all non-core attributes are removed
        and only if keeping it would truncate Product Name or Measurements

        FINAL AI REMINDER
        When space is limited, drop descriptive words before dropping identifiers.
        Never guess, never label style codes, and never move them earlier in the title.
        
        OUTPUT
        Return ONLY the final optimized title string.
        `;

        // 3. Generate using DIRECT FETCH with Model Failover Strategy
        const apiKey = process.env.GEMINI_API_KEY;

        // List of models to try in order of preference
        // We prioritize Flash (multimodal) then fallback to Pro (text-only)
        const candidateModels = [
            'gemini-2.5-flash',      // Detected available model
            'gemini-2.0-flash',      // Detected available model
            'gemini-2.0-flash-exp',  // Detected available model
            'gemini-1.5-flash',      // Fallback
            'gemini-1.5-flash-001',
            'gemini-pro'
        ];

        // Prepare Image Data (Multi-Image Level 3)
        // Process up to 12 images (standard eBay max)
        const imagesToProcess = galleryImages.slice(0, 12);

        console.log(`[Level 3] Processing ${imagesToProcess.length} images in parallel...`);

        // Fetch all images in parallel for speed
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
                console.warn(`[Level 3] Failed to fetch image ${imgUrl}:`, err);
            }
            return null;
        });

        const imageResults = await Promise.all(imageFetchPromises);
        // Filter out failures
        const imageParts = imageResults.filter((part): part is any => part !== null);

        let optimizedTitle = '';
        let lastError = '';

        for (const modelName of candidateModels) {
            try {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
                // console.log(`[Attempt] Trying model: ${modelName}`);

                // Construct Payload
                const parts: any[] = [{ text: promptText }];

                // Add images ONLY if model supports it (Flash) and images exist
                if (imageParts.length > 0 && modelName.includes('flash')) {
                    parts.push(...imageParts);
                }

                const payload = {
                    contents: [{ parts }]
                };

                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    const errText = await response.text();

                    // If 404, specific model not found -> continue
                    if (response.status === 404) {
                        console.warn(`[Skip] Model ${modelName} not found (404).`);
                        lastError = `Model ${modelName} 404`;
                        continue;
                    }

                    // If 400/500 on a Flash model with Image, maybe image format is bad?
                    // Retry SAME model without image if it was a multimodal attempt
                    if (parts.length > 1 && (response.status === 400 || response.status === 500)) {
                        console.warn(`[Retry] Model ${modelName} failed with image. Retrying Text-Only...`);
                        const textPayload = { contents: [{ parts: [{ text: promptText }] }] };
                        const textResponse = await fetch(url, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(textPayload)
                        });

                        if (textResponse.ok) {
                            const data = await textResponse.json();
                            optimizedTitle = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                            console.log(`[Success] Generated with ${modelName} (Text-Only Fallback)`);
                            break;
                        }
                    }

                    throw new Error(`${response.status} - ${errText}`);
                }

                // If success, parse and break
                const data = await response.json();
                optimizedTitle = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                console.log(`[Success] Generated with ${modelName}`);
                break; // Stop loop

            } catch (err: any) {
                console.warn(`[Fail] Model ${modelName} failed: ${err.message}`);
                lastError = err.message;
            }
        }

        // --- POST-PROCESSING SAFETY FILTER ---
        // AI models (especially Flash) are stubborn about adding "Mens Medium" to bags.
        // We manually strip these if they weren't in the original and the category suggests they are wrong.
        if (optimizedTitle) {
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

            throw new Error(`All models failed. Last error: ${lastError}. ${debugInfo}`);
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
        // Store result so next time it is free
        await supabase.from('optimization_history').insert({
            user_id: user.id,
            original_title: title,
            original_title_hash: inputHash,
            optimized_title: optimizedTitle
        });
        // -----------------------

        // Increment Usage
        await supabase.rpc('increment_usage', { user_id: user.id });

        return NextResponse.json({ optimizedTitle, fromCache: false });

    } catch (error: any) {
        console.error('Gemini Optimization Error:', error);

        const apiKeyHint = process.env.GEMINI_API_KEY ? `(Key ends in ...${process.env.GEMINI_API_KEY.slice(-4)})` : '(No Key Configured)';
        let detailedError = error.message;

        return NextResponse.json({
            error: `Gemini Error: ${detailedError} ${apiKeyHint}`
        }, { status: 500 });
    }
}
