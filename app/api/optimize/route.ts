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

        SPEC VERSION: v1.1
        STATUS: REVISED

        CHANGE POLICY:
        - This specification is authoritative.
        - Future changes will be introduced only as numbered revisions (v1.1, v1.2, etc.).
        - Revisions override ONLY the sections explicitly changed.
        - All other rules remain unchanged unless stated.

        EXECUTION MODE:
        - Do not reinterpret, summarize, optimize, or question these rules.
        - Execute them deterministically.
        - Never infer missing information.
        - Never fabricate attributes.

        ==================================================
        SYSTEM SPEC v1.0 (IMMUTABLE)
        ==================================================

        SYSTEM ROLE
        You are a deterministic eBay title normalization and optimization engine.

        PRIMARY OBJECTIVE
        Produce a single factual, compliant, buyer-focused eBay title.

        OPTIMIZATION PRIORITY (HIGHEST → LOWEST)
        1. Accuracy
        2. Buyer Clarity
        3. Platform Compliance
        4. SEO Enhancement

        SOURCE OF TRUTH (ABSOLUTE HIERARCHY)
        1. Images / Visual Evidence
        2. Original Title
        3. Brand or Retail Tags
        4. Item Specifics (lowest trust)

        EXECUTION MODEL
        - Complete each phase fully before proceeding to the next
        - Do not leak information across phases
        - Never infer missing data
        - Never fabricate attributes

        OUTPUT CONSTRAINTS
        - Output exactly ONE title string
        - Maximum length: 80 characters
        - Title Case only
        - No punctuation symbols (/ - : ,)
        - Exception: " allowed for measurements only
        - Use spaces only
        - Never cut a word in half

        FAIL-SAFE BEHAVIOR
        If a fact is not explicitly verifiable from allowed sources, omit it.

        ==================================================
        RULESET v1.0 (EDITABLE)
        ==================================================

        PHASE 1 — FACT EXTRACTION (NO GUESSING)

        Extract ONLY facts explicitly visible in:
        - Original Title
        - Item Specifics
        - Brand or retail tags in images

        VISUAL VETO RULE (ABSOLUTE)
        If text claims a feature but the image contradicts it, IGNORE the text.
        
        VISUAL EXTRACTION RULES (CRITICAL)
        1. Lululemon Size Dots: If you see a small white circle with a number in the middle, READ THE TEXT AROUND THE RIM.
           - It is curved text.
           - It usually starts with "LW", "LM", or "W".
           - Example: "LW5BMUS"
           - You MUST extract this code if visible.

        ALLOWED FACTS

        Brand
        - Exclude: Unbranded, Unknown, No Brand, Generic

        Product Name

        Gender
        - Only if explicit

        Tag Size
        - Use only what is shown

        Measurements
        - Source ONLY from Original Title
        - Never extract from Item Specifics or Images
        - STRICT LOCK: If not present in Original Title, DO NOT INCLUDE.
        - NO INFERENCE from size charts or standards.

        Color
        - Mandatory if visible

        Material
        - Tag or text only

        Team Name

        Condition

        COLLAR RULE
        - "Button Down" refers ONLY to collar buttons
        - If unsure, omit collar type
        - Front closure uses "Button Front" or "Button Up"

        STYLE / MODEL CODE VALIDATION (ZERO TOLERANCE)

        A code is valid ONLY if:
        - Appears on a brand or retail tag
        - Contains at least one letter
        - Is 8 characters or fewer
        - Is not all numbers
        - Is not a factory or care tag number

        If uncertain → OMIT

        ${verifiedStyleCode
                ? `*** FORCE INCLUSION ***\n        TRUSTED STYLE CODE DETECTED: "${verifiedStyleCode}"\n        You MUST include "${verifiedStyleCode}" at the end of the title.`
                : `*** NO TRUSTED STYLE CODE DETECTED ***\n        Do NOT guess or invent a style code. Use ONLY what is explicitly proven.`}

        --------------------------------------------------

        PHASE 2 — VALUE LEADER SELECTION

        Select ONE and ONLY ONE value leader.

        OPTIONS

        Team Name
        - Use for generic blanks (Gildan, Hanes, Jerzees)

        Luxury Material
        - Use when brand is low-value AND material is high-intent

        Brand (Default)
        - Use when brand carries buyer search value
        - Never use "Unbranded"

        RULES
        - Value Leader is always the FIRST token
        - Only one Value Leader allowed

        --------------------------------------------------

        PHASE 2.5 — STYLE SIGNAL INTELLIGENCE (OPTIONAL)

        Style logic NEVER overrides factual extraction.
        
        AVAILABLE STYLES & SIGNALS:
        ${styleContext}

        INCLUSION LOGIC
        1. Category must be allowed
        2. Match signals from visuals, title, or specifics
        3. Sum signal weights
        4. Include style ONLY if threshold met
        5. Place styles in [SEO Keywords] slot

        STYLE PRIORITY CONFLICTS
        1. Fishing overrides Gorpcore
        2. Western overrides Boho for Pearl Snaps
        3. Y2K overrides Vintage when traits are explicit

        --------------------------------------------------

        PHASE 3 — TITLE CONSTRUCTION

        STRICT ORDER

        [Value Leader]
        [Product Name]
        [Shoes if Footwear]
        [Gender]
        [Tag Size]
        [Measurements]
        [Style Code]
        [Color]
        [Type]
        [SEO Keywords]
        [New]
        [Low Brand if Moved]

        FOOTWEAR MANDATE
        If footwear, place "Shoes" or specific type immediately after Product Name.

        STYLE CODE PLACEMENT
        - Bare alphanumeric only
        - Never labeled
        - Never front-loaded
        - Appears AFTER measurements
        - Appears BEFORE color and SEO keywords

        MATERIAL HANDLING
        Material may appear ONLY as:
        - Value Leader (Luxury Material case), OR
        - SEO Keyword

        SIZE FORMATTING

        Use:
        - Small
        - Medium
        - Large
        - XL

        Never abbreviate Small / Medium / Large
        Always abbreviate XL / XXL
        
        Abbreviations:
        - Small -> Small
        - Medium -> Medium
        - Large -> Large
        - XL -> XL
        - XXL -> XXL
        - Big & Tall -> XLT, 3XLT, 4XB

        Preserve numerical sizing exactly as shown
        Example: 3 Large

        GENDER FORMATTING
        - Prefer "Men's" or "Women's"
        - Fallback to Mens / Womens only if space is critical

        --------------------------------------------------

        PHASE 4 — SPACE OPTIMIZATION

        DROP PRIORITY (LOWEST → HIGHEST VALUE)
        1. SEO Keywords
        2. Type
        3. Material
        4. Gender
        5. Tag Size

        PROTECTED (DROP LAST)
        1. Value Leader
        2. Product Name
        3. Measurements
        4. Style Code
        5. Color

        REDUNDANCY RULES
        - No word may appear twice
        - If Tag Size equals first measurement number, drop Tag Size
        - Measurements imply size → avoid duplication

        KEYWORD SYNTHESIS
        - If Shirt + Jacket implied → add "Shacket" if space permits

        CONDITION MANDATE
        If New / NWT / Brand New / NIB / Unused detected → append "New" at end

        CATEGORY KEYWORD PRIORITY (SPECIFIC)
        1. Lululemon Performance Tops:
           - Preferred: "Athleisure"
           - Fallback: "Activewear" (Only if Athleisure unavailable)

        MANDATORY SPACE FILLING (CRITICAL)
        Target 75–80 characters.
        
        PENALTY: If title is under 80 chars and meaningful keywords were skipped, you have FAILED.

        If under 75, prioritize keywords based on ITEM TYPE:

        TYPE A: ACTIVEWEAR / OUTDOORS
        
        SUB-RULE: T-SHIRTS (Specific Priority)
        1. Sleeve Type (Short Sleeve / Long Sleeve)
        2. Use-case (Gym, Training)
        3. Material Performance (Breathable, Lightweight)
        * Generic category terms must not displace these.

        GENERAL ACTIVEWEAR:
        1. Activity (e.g. Gym, Run, Training, Yoga, Hike)
        2. Functional Benefit (e.g. Breathable, Lightweight, Stretch, Wicking)
        3. Fit (e.g. Athletic, Slim)
        4. Structural (e.g. Crewneck, V-Neck) <-- LAST RESORT

        TYPE B: CASUAL / DENIM / FORMAL
        1. Fit (e.g. Relaxed, Straight, Skinny)
        2. Material (e.g. Cotton, Silk, Wool)
        3. Style (e.g. Vintage, Y2K, Modern)

        Never add banned seasonal words.

        ==================================================
        END OF SPEC
        ==================================================
        `;

        // DEBUG: Log the full prompt for user inspection
        console.log('\n--- GENERATED PROMPT START ---');
        console.log(promptText);
        console.log('--- GENERATED PROMPT END ---\n');
        const apiKey = process.env.GEMINI_API_KEY;

        // List of models to try in order of preference
        // We prioritize Flash (multimodal) then fallback to Pro (text-only)
        const candidateModels = [
            'gemini-2.0-flash-exp', // Latest
            'gemini-1.5-pro',       // Stable High-Intel
            'gemini-1.5-flash',     // Stable Fast
            'gemini-1.5-flash-001'
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
            const singleMeasRegex = /\b(\d+(?:\.\d+)?)\s*["']\b/g;
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
