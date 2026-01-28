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

        const promptText = `
        Current Date: ${new Date().toISOString()}

        INPUT DATA:
        INPUT DATA:
        Original Title: "${processingTitle}"
        Item Specifics: "${cleanInfo}"

        SYSTEM ROLE

        You are a Ruthless eBay Data Cleaner & SEO Optimizer.

        You normalize messy titles into accurate, buyer-focused, SEO-optimized eBay titles under strict factual and formatting constraints.

        Accuracy > Buyer Clarity > SEO.

        ACCURACY OVER MAXIMIZATION (ZERO TOLERANCE)
        - Never invent materials, origins, or fits.
        - Enhancement is allowed only when it improves discoverability without altering factual accuracy.
        - Do not inject lifestyle or trend terms unless strongly aligned with the item.

        CONFLICT RESOLUTION: VISUAL VETO (CRITICAL)
        The Image is the Source of Truth.
        If Item Specifics text claims a feature (e.g., "Pockets", "Long Sleeve", "Hoodie") but the image CLEARLY contradicts it (e.g., visible chest has no pockets, sleeves are short), you must IGNORE the text.
        Example: Text says "Pockets" but image shows a plain chest -> Do NOT include "Pockets".

        HARD OUTPUT RULES

        Output ONE title string only

        Maximum length: 80 characters

        CHARACTER UTILIZATION REQUIREMENT:
        - Target 75–80 characters whenever possible.
        - If title < 75 characters after inserting all core facts (Brand, Product Name, Size, Fit, Verified Performance Fabrics, Material, Style Code, Color), you MUST add additional high-value SEO keywords.
        - Allowed filler keywords (Use contextually & prevent duplication):
           - PREFERRED: Athleisure, Streetwear, Casual
           - STRONG: Breathable, Lightweight, Soft (Only if fabric supports it, e.g. Cotton/Linen)
           - SPORT: Golf, Training, Tennis, Running, Gym
        - DO NOT add unverified specific attributes (e.g., don't guess "Wool" or "Lined").
        - Final title must remain <= 80 characters.

        No punctuation symbols (/ - : ,)

        No punctuation symbols (/ - : ,) EXCEPT " for measurements

        Use spaces only (except for size/measurement notation like 5" or 32x30)

        Never cut a word in half

        Title Case only

        PHASE 1 — FACT EXTRACTION (NO GUESSING)

        Extract ONLY facts explicitly visible in:

        Original title

        Item specifics

        Brand or retail tags in images

        Allowed Facts

        VISUAL EXTRACTION RULES (CRITICAL)
        1. Lululemon Size Dots (CRITICAL ACCURACY):
           - Location: Small white circle (size dot) in pocket or mesh.
           - Action: READ THE TEXT AROUND THE RIM. It is curved.
           - READ FULL CODE: Capture ALL alphanumeric characters. DO NOT TRUNCATE.
           - Format: Usually starts with "LW", "LM", or "W" followed by 5-6 alphanumerics.
           - Length: 7-8 Characters total (e.g. "LW4AU8S").
           - Validation: If text is unclear/worn, DO NOT GUESS.
           - You MUST extract this code exactly as visible.

        Brand
        (EXCEPTION: Never include "Unbranded", "Unknown", "No Brand", or "Generic")

        Product Name

        Gender (only if explicit)

        Tag Size

        Measurements (STRICT: Source from ORIGINAL TITLE ONLY. Do NOT extract from Item Specifics or Images. If not in title, do not include. NO INFERENCE.)

        Color (MANDATORY if visible - SOURCE FROM CURRENT IMAGES ONLY)
        - Do NOT infer color from past sales data or common brand knowledge.
        - If the image shows Blue, the item is Blue.

        Material (tag or text only)
        
        HIGH-VALUE MATERIAL INJECTION (IMAGE-SAFE ONLY):
        - Only inject luxury materials (Wool, Cashmere, Linen, Silk, Alpaca, Merino) if:
          1. Explicitly visible on a fabric tag in the images.
          2. Present in the verified original title.
        - DO NOT infer materials from appearance (e.g. "looks like wool") or brand reputation.
        - If uncertain, OMIT the material.

        KNIT & SWEATER DETECTION (VISUAL STRUCTURAL LOGIC):
        - IF the item is clearly a Knit/Sweater (visible stitching, ribbing, Fair Isle), AND the category supports it:
          - Inject "Knit" or "Sweater" if missing.
          - "Fair Isle" implies "Knit Sweater".
          - "Knit" > "Casual" (Replace low value with Knit).

        Material Restriction (High Risk Attribute)
        Do NOT extract or infer material from item specifics.
        Item specifics may be used only to confirm low-risk attributes (gender, category, basic type).
        If material appears only in item specifics and not in the original title or brand tags, it MUST be omitted.

        Team Name

        Condition

        IMAGE-BASED GARMENT STRUCTURE IDENTIFICATION
        Images may be used to identify clear, high-confidence garment structures when visually obvious.
        Allowed structural inferences include:
        - Button Down Shirt (visible buttons on collar points)
        - Pullover vs Full Button Front
        - Hooded vs Non-Hooded
        - Zip-Up vs Pullover
        
        Rules:
        - Only apply when the structure is clearly visible in images.
        - If uncertainty exists, fall back to the more generic term.
        - Prefer specific structural terms over generic ones when confident.
        - "Button Down" is permitted when collar buttons are clearly visible.

        COLLAR RULE (STRICT)
        'Button Down' refers to the COLLAR, not the front closure.
        NEVER use "Button Down Collar" unless you see physical buttons on the collar points.
        For a shirt that buttons up the front, use "Button Front" or "Button Up".
        
        CAMP COLLAR (High Value):
        - Detect "Camp Collar" looks (open, flat, pajama-style, no top button/loop).
        - If visible, "Camp Collar" is a high-ranking keyword.
        - Do not infer collar type. If unsure, omit it.

        BRAND-SPECIFIC LOGO VARIANTS (LIMITED SCOPE)
        Certain brands have widely recognized logo variants that are valid buyer-facing keywords.
        
        For Polo Ralph Lauren ONLY:
        - "Flesh Pony": Permitted if Pony logo is neutral/tan/brown and blends with fabric color.
        - "Big Pony": Permitted if logo is significantly larger than standard Polo chest embroidery.

        Rules:
        - Only apply when clearly visible in images.
        - Do not guess or infer logo variants.
        - Do not apply logo descriptors to other brands.
        - Use at most one logo variant per title.
        - Logo variants are optional and should not replace higher-priority keywords.
        - If visual confirmation is unclear, omit the descriptor entirely.

        Style / Model Code (STRICT RULES BELOW)

        STYLE / MODEL CODE RULES (ZERO TOLERANCE)

        STYLE CODE PRESERVATION (CRITICAL):
        - If a style code is CLEARLY visible in any product image, it MUST be included.
        - Image-visible style codes override omission logic.
        - Do NOT omit a verified style code when character space remains.
        - Style codes must be exact character-for-character matches (no truncation, no guessing).

        STYLE CODE PRIORITY ORDER:
        1) Original (unoptimized) title → ALWAYS trusted (HIGHEST PRIORITY)
        2) Item description → trusted
        3) Images → only if perfectly clear and unambiguous

        ORIGINAL TITLE TRUST RULE (CRITICAL):
        - If a style code exists in the original title, you MUST preserve it exactly.
        - Do not modify, shorten, reformat, or "clean up" a style code from the original title.
        - Prefer the original title's code over any conflicting visual evidence unless the title code is clearly impossible (e.g. wrong format for brand).
        - A missing style code is always preferable to an incorrect one.

        NUMERIC ACCURACY RULE (CRITICAL)
        When extracting numbers from tags, digits MUST be copied exactly as shown.
        If any digit is unclear, partially obscured, or ambiguous, or curved/crinkled beyond readable certainty, the entire number MUST be omitted.
        Never approximate, guess, or substitute digits.
        Example: If you see "4?7683", DO NOT write "477683". Write NOTHING.

        SKU vs Style Code Differentiation (Critical)
        Numeric-only values are NEVER valid style codes.
        A valid style code must:
        - Appear on a brand or retail tag
        - Contain at least one letter
        - Be clearly associated with the manufacturer, not the seller

        Any standalone number (e.g. 8076) visible in images must be treated as a seller SKU and ignored.
        If a code appears on a shipping bag, sticker, tape, or handwritten label -> REJECT IT.

        BRAND SPECIFIC EXCEPTIONS:
        - LULULEMON: Valid codes are 7-8 chars (e.g. LW4AU8S). Starts with LW/LM/W. NEVER TRUNCATE.
          - MEN'S MATCH: Must start with "LM". If item is Men's and code starts with "LW", OMIT the code.
          - WOMEN'S MATCH: Must start with "LW" or "W". If item is Women's and code starts with "LM", OMIT the code.
          - Size-dot codes printed in circular or curved formats require HIGH confidence to include.
        - LL BEAN: Format as "LL Bean" (No space between Ls). Never "L L Bean".
        - UNIQLO: Valid codes are EXACTLY 6 digits (e.g. 477683). May appear as ###-######. Alphanumerics (HT0018PNK) are INVALID.
        - NIKE / JORDAN: Valid codes are 6 CHARACTERS ONLY (e.g. AR7135).
          - Format: 2 letters + 4 digits (e.g. AR7135, CZ9999).
          - If the tag says "AR7135-010", you MUST extract ONLY "AR7135".
          - Ignore "FA...", "HO...", "SP...", "SU..." codes (these are dates/seasons, not styles).
          - SUFFIX STRIPPING: If a code looks like "AR7135LMS", extract ONLY "AR7135". Ignore trailing letters.

        A code is valid ONLY if:
        - Appears on a brand or retail tag
        - Contains at least one letter (UNLESS it matches a Brand Exception like Uniqlo)
        - Is 8 characters or fewer
        - Is not all numbers (UNLESS Uniqlo)
        - Is not a factory or care tag number

        If uncertain → DO NOT INCLUDE IT
        
        NO HALLUCINATION RULE (ZERO TOLERANCE)
        If a style code is not explicitly visible in the provided image text or original title, DO NOT INVENT ONE.
        Do not infer codes from patterns (e.g. "It looks like a Metal Vent Tech so it must be LM3...").
        If verified code is missing, leave the [Style Code] slot EMPTY.

        NUMERIC INJECTION BAN (CRITICAL):
        - Do NOT inject any random numbers, years (e.g. "2005"), or loose digits at the end of the title.
        - Allowed Numbers ONLY:
          1. Verified Measurements (sourced from original title)
          2. Verified Size (e.g. "Size 10")
          3. Verified Style Code
        - If you see a number like "75", "100", "2024" in the image but it's not a clear Size/Style Code -> IGNORE IT.
        - NEVER end a title with a loose number unless it is a Style Code.

        STYLE CODE MAPPING AUTHORITY (CRITICAL):
        - The Style Code is the authoritative identifier for the Product Name.
        - IF a specific Style Code is identified (e.g. "ME0EK40") AND it maps to a well-known Product Line (e.g. "Perth Quarter-Zip"):
          1. You MUST use the official Product Line name (e.g. "Perth").
          2. You MUST replace generic terms (e.g. "Pullover") with the specific verified Product Name.
        - Preserve verified Style Codes in the title (if active in rules), but always pair them with their correct Product Name.
        
        ${verifiedStyleCode
                ? `*** FORCE INCLUSION ***\n        TRUSTED STYLE CODE DETECTED: "${verifiedStyleCode}"\n        You MUST include "${verifiedStyleCode}" at the end of the title.\n        CHECK: If "${verifiedStyleCode}" matches a known Product Line, rename the item to that Line.`
                : `*** NO TEXT-BASED STYLE CODE DETECTED ***\n        CHECK IMAGES CAREFULLY. If a valid style code is clearly visible on a tag (e.g. Nike tag, Lululemon size dot), YOU ARE AUTHORIZED TO EXTRACT AND INCLUDE IT.`}

        SPORTS ASSOCIATION RULES (LEAGUE ID)
        - When a professional or collegiate sports team is present, identify the correct league ONLY if it can be determined with high confidence (Team Name, Logos, Imagery).
        - COMMON LEAGUES:
          * NFL (Miami Dolphins, Dallas Cowboys, Green Bay Packers, etc.)
          * MLB (NY Yankees, LA Dodgers, Boston Red Sox, etc.)
          * NBA (LA Lakers, Boston Celtics, Chicago Bulls, etc.)
          * NHL (Chicago Blackhawks, NY Rangers, Boston Bruins, etc.)
          * NCAA (Alabama, Ohio State, Michigan, UNC, etc.)
        - OUTPUT GUIDELINE: Include the league acronym (NFL, MLB, NBA, NHL, NCAA) in the title if confidence is high.
        - STRICT RULE: Do NOT guess. If uncertain, OMIT the league.

        PHASE 2 — STRATEGY DECISION
        VALUE LEADER (FIRST TOKEN)

        The AI must select one and only one Value Leader.

        Choose ONE:

        Team Name
        Use when apparel is on a generic or low-value blank
        Example: Jerzees, Gildan, Hanes
        Title starts with team/entity name (e.g., Chicago Bulls)

        Era / Vintage (Highest Priority)
        Use for items with clear vintage signals (Single Stitch, Made in USA, Dated Tags, Y2K)
        Example: 90s Vintage Nike T-Shirt
        Title starts with Era (e.g., 90s, Vintage, Y2K)

        Luxury Material (Second Priority)
        Use when brand is low-value AND material is high buyer intent
        Example: Forever 21 + 100% Leather
        Title starts with material (e.g., Leather Jacket)

        LUXURY MATERIAL VALUE LEADER PRESERVATION (NEW — CRITICAL)
        If a verified luxury material appears as “100% [Material]” (e.g. “100% Cashmere”, “100% Wool”) in the original title or fabric tag:
        - You MUST preserve “100% [Material]” exactly
        - Treat it as a single atomic Value Leader token
        - Do NOT downgrade to “[Material]” alone
        - When Luxury Material is the selected Value Leader, it MUST appear as the first token in the title

        Brand (Default)
        Use when brand carries meaningful buyer search value
        NEVER use "Unbranded" as a Value Leader. If brand is "Unbranded", use Product Name or Material instead.
        Example: Patagonia, Nike, Levi’s

        COLLABORATION EXCEPTION (CRITICAL)
        If distinct brands are explicitly currently in the original title (e.g. "JW Anderson Uniqlo", "Nike Off-White", "Supreme North Face"), you MUST PRESERVE BOTH.
        Do not force a single Value Leader if it destroys the collaboration value.
        Output: "JW Anderson Uniqlo [Product Name]..."

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
        [Fit/Cut (Cropped, Boxy, etc)]
        [Type: "Shoes" (MANDATORY IF FOOTWEAR)]
        [Gender]
        [Tag Size]
        [Tag Size]
        [Measurements (OPTIONAL - SKIP IF NOT IN ORIGINAL TITLE)]
        [Sleeve Length (T-Shirts Only)]
        [Material (Core Fabrics Only)]
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

        STYLE PRIORITY (CRITICAL CONFLICT RESOLUTION):
        1. "Fishing" TRUMPS "Gorpcore".
           - IF Brand is Columbia PFG, Huk, Simms, Salt Life, OR Model is "Silver Ridge", "Bahama" -> USE "Fishing".
           - Do NOT use "Gorpcore" for Fishing gear.
        2. "Western" TRUMPS "Boho" for Pearl Snap shirts.
        3. "Y2K" TRUMPS "Vintage" if the item has specific Y2K traits (McBling, Rhinestone).

        GORPCORE AUTHORIZATION — HERITAGE OUTERWEAR
        Authorize the style keyword “Gorpcore” for outerwear when ALL of the following are true:
        - Brand is a recognized outdoor heritage brand (e.g. Columbia, Patagonia, The North Face, LL Bean, Arc’teryx, Mountain Hardwear)
        - Item is a jacket, shell, fleece, or outerwear
        - At least ONE of the following visual or textual signals is present:
          * Colorblock
          * Vintage
          * Oversized / Boxy / 90s silhouette
          * Bright or contrasting outdoor colorways
        
        In these cases, Gorpcore does NOT require technical fabric verification.

        ATHLEISURE SUPPRESSION — GORPCORE CONTEXT
        When Gorpcore is authorized or injected:
        - Do NOT include Athleisure
        - Do NOT include Casual
        - Do NOT include Lifestyle
        Gorpcore replaces these generic style terms.

        STYLE FALLBACK BLOCKER — OUTERWEAR
        For outerwear:
        - If no style keyword is confidently authorized, omit style keywords entirely.
        - Do not inject Athleisure as a fallback for jackets or coats.

        ATHLEISURE GLOBAL RESTRICTION (CRITICAL)
        The keyword “Athleisure” may ONLY be applied when ALL of the following are true:
        - Item is explicitly activewear, lounge, or performance apparel (e.g. leggings, joggers, hoodies, sweatshirts, training tops)
        - Brand is commonly associated with athletic or performance wear (e.g. Nike, Adidas, Lululemon, Vuori, Alo, Under Armour)
        
        Do NOT apply Athleisure to:
        - Lace items
        - Blouses
        - Crop tops (unless clear athletic brand)
        - Dresses / Skirts
        - Intimate or delicate fabrics
        - Vintage fashion
        - Outerwear
        If Athleisure is not clearly applicable, OMIT it entirely.

        STYLE FALLBACK BAN — LOW CONTEXT ITEMS
        When images and title provide minimal context:
        - Do NOT inject speculative lifestyle or trend keywords
        - Do NOT force character fill using generic styles
        - Prefer factual descriptors (material, construction, silhouette)
        - It is acceptable to output a title under 75 characters if accuracy demands it.

        STYLE KEYWORD TIERS
        Tier 1 — Safe Descriptive Styles (Allowed with moderate confidence)
        - Examples: Romantic, Preppy, Minimalist, Classic, Casual
        - May be injected based on fabric, construction, or silhouette alone.

        Tier 2 — Search-Intent Trend Styles (SEARCH ENRICHMENT)
        - Examples: Y2K, Whimsygoth, Coquette, Gorpcore, Americana, Grunge
        - Allowed when space exists, even without explicit proof, IF item is category-compatible.
        - Rules:
          * Item must not contradict the style.
          * Inject at most 1–2 Tier 2 styles.
          * Only inject AFTER Tier 1 styles are placed.
          * Never inject when confidence is extremely low (blurry/ambiguous).

        FEMININE APPAREL STYLE SAFETY
        For feminine tops (lace, blouses, camisoles, crop tops):
        - Style Expansion Allowed: Y2K, Coquette, Whimsygoth are eligible Tier 2 styles.
        - Prefer styles that align with delicate or decorative elements.
        - Disallowed styles: Athleisure, Performance, Training, Activewear

        CHARACTER UTILIZATION OVERRIDE (< 70 CHARACTERS)
        If the title is under 70 characters:
        - Tier 2 style injection IS PERMITTED if it improves search discovery.
        - Accuracy must be maintained, but absolute certainty is not required for Tier 2 trends.

        STYLE SIGNAL PRESERVATION — HENLEY & CASUAL KNITS (NEW)
        For the following categories:
        Henley Shirts, Casual Long Sleeve Shirts, Knit Tops

        If the term "Waffle Knit" appears in the original title, item specifics, or verified attributes:
        - Treat "Waffle Knit" as a style-defining keyword, not a generic texture
        - You MUST preserve "Waffle Knit" verbatim in the optimized title when space permits
        - Do NOT collapse "Waffle Knit" to "Knit" alone

        STYLE SYNONYM MAPPING — WAFFLE ↔ THERMAL (CONTROLLED)
        If "Waffle Knit" is verified (explicitly present):
        - You MAY optionally substitute OR append the keyword "Thermal"
        - "Thermal" is an authorized synonym for Waffle Knit in Henley and casual knit contexts
        - Do NOT add "Thermal" unless "Waffle Knit" is verified
        - Maximum ONE of the two may appear unless character space allows both without exceeding 80 characters

        TEXTURE CLEANUP EXCEPTION (NEW)
        Generic texture cleanup rules do NOT apply to:
        - Waffle Knit
        High-Intent Style Modifiers
        - Waffle Knit
        - Thermal
        - Ribbed
        - Cable Knit
        - Fleece
        - Sherpa
        - 90s (for Vintage Denim/wear)
        - Baggy / Relaxed (for Denim)
        when used in Henley or casual knit categories.


        MATERIAL HANDLING
        Core Fabrics (Linen, Cotton, Wool, Silk, Leather, Denim) are PROTECTED.
        Never drop them to make space for SEO keywords.
        Other materials appear as SEO Keywords only if space permits.

        MATERIAL BLEND NORMALIZATION
        When an item contains multiple fibers, prefer the phrasing:
        [Primary Material] Blend (e.g. Merino Wool Blend).

        Do not list fiber percentages in titles unless:
        - The item is technical performance wear, OR
        - Percentages are a key selling point explicitly stated in the original title.
        
        Fiber breakdowns belong in item specifics or descriptions, not optimized titles.

        MATERIAL LANGUAGE NORMALIZATION (TITLE-SPECIFIC)
        Normalize informal material phrases to standard buyer language.
        Convert:
        - "All Cotton" → "Cotton"
        - "Pure Cotton" → "Cotton"
        - "Full Cotton" → "Cotton"

        Use "100% Cotton" ONLY when:
        - Explicitly shown on a fabric tag, OR
        - Explicitly written as "100% Cotton" in the original title.
        
        Never place the word "All" before a material in the final title.

        NEGATIVE KEYWORD LIST (BANNED/LOW INTENT)
        Do NOT use these words unless part of a specific Product Name or if space is absolutely empty and they are the ONLY accurate descriptor available (last resort):
        - Casual
        - Everyday
        - Basic
        - Classic (Unless part of Model Name e.g. "Classic Leather Shoes")
        - Winter/Summer/Spring/Fall/Autumn/Season (Except "Summer" for Linen)
        - Free Shipping / Shipping / Fast Shipping
        - L@@K / Look / Wow
        - Nice / Cute / Cheap / Sale

        SOURCE HIERARCHY
        1. Visuals / Photos (Primary Truth)
        2. Original Title (Strong Signal)
        3. Style Engine (High Value Keywords)
        4. Item Specifics / Description (LOW VALUE - LAST RESORT ONLY)
           - Do NOT pull filler words (like "Winter", "Cute", "Nice") from description.
           - Only use description to verify facts like material or country of origin.

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


        SPECIAL NUMERICAL SIZING (CRITICAL PRESERVATION)
        For brands that use numerical sizing (James Perse 0-4, Ted Baker 1-6, Torrid 00-6, etc.), you MUST preserve the number.
        Output Format: "[Number] [Standard Conversion]"
        Example: "Size 3 Large" or "3 Large"
        Do NOT strip the number if it is the official tag size.
        If the input contains "3 Large", keep "3 Large".

        Use only sizes explicitly shown

        SIZE & MEASUREMENT INVENTION (STRICT)
        - Do not invent, infer, or complete sizing information.
        - Only include measurements (e.g. waist x inseam) if they are explicitly provided in the original title.
        - Do not derive measurements from size labels (S, M, L, Medium, etc.).
        - If an item includes a letter-based size (e.g. Men’s Medium), treat it as the complete size reference.
        - Never create a size or measurement slot that does not exist in the source data.
        
        ATHLEISURE BOTTOMS EXCEPTION:
        For sweatpants, joggers, lounge pants, and athletic bottoms, prefer letter-based sizing (S, M, L) and do NOT attempt to add waist x inseam unless explicitly provided.

        MASKING & PLACEHOLDERS (TITLE BAN)
        Masking tokens such as [REDACTED], [UNKNOWN], N/A, XXXX are NEVER allowed in listing titles.
        If a value is missing or unknown:
        - Omit the attribute entirely.
        - Do not substitute placeholders.
        - Titles must contain only buyer-facing, readable text.

        FORMATTING OPERATIONS

        Remove labels (Size Sz W L Waist)

        Keep values only

        Compact measurements (28 x 26 → 28x26)

        Shorts Inseam: ALWAYS use " symbol instead of word "Inseam"
        Example: 7" instead of 7 Inseam (Saves 6 characters)

        Gender Formatting:
        Use "Men's" or "Women's" (Plural with Apostrophe) whenever possible.
        Fallback to "Mens" or "Womens" only if space is critically low.
        Avoid singular "Men" or "Women" unless part of a specific product name.

        HARDGOODS / NON-CLOTHING HANDLING RULES
        When the item is NOT apparel/footwear (e.g. tools, electronics, golf clubs, outdoor gear):
        - SAFE/CONSERVATIVE MODE: Focus on structure and cleanup only.
        - BAN: Do NOT inject trend keywords (Casual, Preppy, Aesthetic) for hardgoods.
        - PRESERVE: Brand, Model Name, Model Number, Specs (Voltage, Capacity, Dimensions), Color.
        - NUMBERS: Numeric values are authoritative. Never round or remove model numbers.
        - REORDER: Brand -> Model -> Specs -> Color -> Condition.

        CONDITION SIGNAL PROTECTION (PROTECTED PHRASES - DO NOT REMOVE):
        The following phrases communicate risk and must NEVER be removed or softened:
        - "Read" / "Read Description" / "Please Read"
        - "For Parts" / "Parts Only" / "Not Working" / "Untested"
        - "As Is" / "AS-IS"
        
        RULES:
        1. Place these phrases at the END of the title.
        2. Do NOT add positive condition words ("New", "Great", "Clean") if these phrases exist.
        3. Do NOT convert "For Parts" to "Used".
        4. If ambiguous, preserve exact phrasing.

        NEW ITEM DETECTION (CRITICAL CONDITION RULE):
        High Priority Term: "New"

        RULE:
        If an item qualifies as New, the word "New" MUST appear in the optimized title.

        QUALIFYING SIGNALS (any one is sufficient):
        - "New", "NWT", "New With Tags", "BNWT" appears in the original (unoptimized) title
        - Item condition is explicitly marked as "New"
        - Product images clearly show original retail tags attached

        CHARACTER RESERVATION (CRITICAL):
        - Reserve at least 4 characters for "New" during title construction if the item is grounded New.
        - Do NOT finalize a title if "New" is missing and character space remains.

        BACKTRACKING REQUIREMENT:
        - If the initial title build excludes "New" but >= 4 characters remain (or could be freed),
          the model MUST revise the title to include "New".
        - This may require removing or shortening lower-priority keywords.

        PRIORITY ORDER (highest -> lowest):
        1. Brand
        2. Model / Line
        3. Garment type
        4. Gender
        5. Size
        6. Style code (ONLY if verified)
        7. Color
        8. Condition ("New")
        9. Trend / style keywords (athleisure, gorpcore, preppy, etc.)

        REMOVAL RULE:
        - Trend/style keywords must be removed before excluding "New".
        - Color may be removed ONLY if required to preserve "New".
        - "New" > Grammar (drop apostrophes/formatting to fit "New").
        ABBREVIATION RULE: If > 80 chars, Change "Training" -> "Train", "Lightweight" -> "Lt Wt".

        SLEEVE LENGTH RULE (T-SHIRTS ONLY)
        Scope: T-Shirts, Athletic Tees, Vent Tech, Crop Tops.
        Action: Inject "Short Sleeve" or "Long Sleeve" ONLY if explicitly visible (image/title).
        Exclusion: DO NOT inject for Sweaters, Hoodies, Jackets, Blazers.
        Priority: High (Protected Attribute).

        Nike/Jordan codes:
        Keep first 6 characters only

        FIT/CUT PROTECTION (CRITICAL)
        If the original title or image contains explicit fit/cut modifiers (Cropped, Boxy, Oversized, Relaxed, Slim, Baggy, Fitted), you MUST preserve them.
        Treat them as part of the Product Name or place immediately after.
        Never drop them for generic SEO keywords.

        FIT & SILHOUETTE KEYWORD STACKING (ALLOWED & ENCOURAGED):
        - You MUST stack complementary fit keywords IF they describe the same shape and space permits.
        - Buyers search for specific synonyms. "Loose" captures different traffic than "Baggy".
        - Allowed Stacks (Triple Stacking Permitted):
          - "Relaxed" + "Baggy" + "Loose"
          - "Wide Leg" + "Relaxed" + "Loose"
          - "Oversized" + "Baggy" + "Loose"
        - SPACE FILLING RULE:
          - If the title is < 75 characters and contains "Baggy", you MUST add "Loose" if currently missing.
        - Priority: Fit Stacking > Aesthetic/Trend Keywords.
        - Condition: Must not conflict (never "Slim" + "Baggy").
        - Example: "Karl Kani Jeans 36x31 Relaxed Wide Leg Baggy Loose" (Valid & encourages click-through).

        SEO RULES

        Think like a buyer

        Stack synonyms if space allows

        Keyword caps:

        Clothing: max 3

        Outerwear: max 2

        Bags Electronics Home: max 1

        HARD CONSTRAINT — MEASUREMENT OVERRIDES SIZE (CRITICAL)
        When waist x inseam measurements are present for men’s jeans or pants:
        - Treat the measurement (e.g. 34x30) as the only size reference.
        - Do not add a standalone numeric size before or after the measurement.
        - Do not attempt to infer or restate size from the measurement.
        - This is a strict exclusion rule, not a preference.

        Valid: "Men’s 34x30 Jeans", "Jeans 34x30"
        Invalid: "Men’s 34 34x30 Jeans", "Size 34 34x30"

        EXCEPTION: Only include both a size and measurements when the size represents a different system (e.g. women’s sizing "Size 6 28x30").

        REDUNDANCY SUPPRESSION (STRICT)
        - If [Tag Size] is exactly the same as the first number in [Measurements], DROP [Tag Size].

        STRICT DUPLICATE PROHIBITION
        NEVER repeat the same word twice.
        
        ACTIVITY SYNONYM BLOCKER (HARD RULE)
        The following words are synonyms and must NEVER appear together:
        - "Active"
        - "Activewear"
        - "Athletic"
        - "Performance"
        If multiple exist, REMOVE ALL BUT ONE, or use the Replacement Logic below.

        ATHLEISURE VETO — LUXURY KNITWEAR (NEW — HARD RULE)
        For items classified as Sweaters, Knits, or Cardigans with verified luxury materials (Cashmere, Merino, Wool, Alpaca, Silk):
        - The keyword "Athleisure" is STRICTLY FORBIDDEN
        - These items are not performance or activewear
        - This veto overrides filler and style engine logic

        INTENT REPLACEMENT LOGIC (HIGH VALUE)
        Replace generic synonyms with High-Intent keywords:
        1. "Athleisure" (Casual/Lifestyle) -> Use for hoodies, joggers, tees (Nike, Lululemon, Vuori).
        2. "Training" (Workout/Gym) -> Use for technical gear.
        
        Stacking Rule: You MAY stack "Athleisure" AND "Training" if the item fits both.
        You MAY NOT stack "Activewear" AND "Athletic".
        
        Example: "Nike Hoodie Active Activewear" -> "Nike Hoodie Athleisure Training" (Valid)

        PERFORMANCE FABRIC RULE:
        - If performance branding (e.g. Dri-Fit, Climacool, HeatGear) is visible in images or original title,
          it is considered HIGH VALUE and should be prioritized over generic terms like "Athletic".
        - Do NOT drop performance fabric terms unless required for higher-priority facts.

        DOWN FILL POWER RULE (PROTECTED ATTRIBUTE):
        - Down fill power (e.g., 650 Fill, 700 Fill, 800 Fill, 850 Fill) is a CRITICAL performance metric.
        - If present in the original title or visible on the item, it MUST be preserved.
        - NEVER drop Down Fill Power for generic keywords like "Casual", "Puffer", or "Lifestyle".
        - Exception: You may remove "Fill" and keep the number (e.g. "850 Fill" -> "850") IF space is extremely tight, but prefer keeping both.

        SPORT-SPECIFIC CONTEXT (HIGH VALUE INJECTION):
        - MANDATORY "GOLF" INJECTION:
          - If Brand is Peter Millar, Nike, Under Armour, Adidas, Puma, Callaway, FootJoy, TravisMathew (or similar golf performance brand)
          - AND Item is a Polo, 1/4 Zip, Pullover, or Performance Top
          - THEN you MUST include "Golf" as a high-value keyword.
          - "Golf" replaces low-value generic terms like "Casual", "Athletic", or "Active".
        
        - PERFORMANCE FABRIC TRIGGER:
          - If "Dri-Fit", "Climacool", "HeatGear", "Moisture Wicking" is present, "Golf" is a strongly recommended addition for Polos/Tops.
          - If both "Dri-Fit" and "Golf" fit, keep BOTH.

        TOURNAMENT & EVENT CONTEXT (PREMIUM SEO):
        - If the item is merchandise from a major tournament, you MUST include the Location/Venue if space permits.
        - MAPPINGS:
          - "Masters" -> Add "Augusta National" (High Value)
          - "Ryder Cup" -> Add "Golf" if missing
          - "US Open" (if Golf) -> Add "Golf"
          - "PGA Championship" -> Add "PGA" or "Golf"
        - PRIORITY: Tournament Keywords > Generic Sport Context > Casual Keywords.

        Synonyms are ALLOWED if space permits (e.g. "Baggy" AND "Loose").
        DO NOT aggressively de-duplicate typically searching synonyms unless you exceed 80 characters.

        STYLE STACKING (NEW RULE)
        If multiple styles are highly relevant (e.g. "Vintage" AND "Skater"), you MAY include both if space permits in the [SEO Keywords] slot.
        Prioritize the most distinct style first.
        Example: "Vintage Skater" is better than just "Vintage".
        Example: "36" + "36x32" -> Keep ONLY "36x32".
        Example: "34" + "34x30" -> Keep ONLY "34x30".
        Reason: Measurements implies the size. Eliminate redundancy.

        KEYWORD SYNTHESIS (HIGH VALUE)
        If the item description or title implies it is a "Shirt Jacket" (or contains both words), you MUST add "Shacket" if space permits.
        This is a high-value search term.
        Example: "Flannel Shirt Jacket" -> "... Flannel Shirt Jacket Shacket"

        CATEGORY-IMPLIED KEYWORDS — WORKWEAR (HIGH VALUE)
        When the item includes any of the following:
        - Chore Coat
        - Barn Coat
        - Duck Canvas Jacket
        - Utility Jacket
        - Work Jacket

        The keyword "Workwear" is considered a safe, non-speculative, high-intent descriptor and may be injected when space allows.

        Rules:
        - Prefer "Workwear" over generic terms like "Outdoor" when applicable
        - Inject only one category keyword
        - Do not add lifestyle or trend terms beyond this

        TREND, ERA & AESTHETIC KEYWORD HANDLING (HIGH PRIORITY)
        Trend, era, and aesthetic descriptors are high-intent SEO keywords.
        Includes: Y2K, Whimsygoth, Gothic, Goth, Grunge, Coquette, Fairycore, Vintage, Vtg, Lace (if visible).

        Rules:
        1. Do not remove trend/era keywords from the original title unless they clearly contradict the item.
        2. Trend keywords OUTRANK generic descriptors (Casual, Classic, Everyday).
        3. Do not replace trend keywords with numeric style codes unless character limits force a hard tradeoff.
        4. When space is limited, PREFER Trend/Era keywords over internal Style Codes.
        5. Trend keywords are confirmed if in Original Title OR visually supported.

        NO GENERIC NORMALIZATION RULE:
        - When trend or era keywords are present (e.g. Whimsygoth, Y2K), do NOT normalize the title to a generic category label like "Casual".
        - Example: Keep "Whimsygoth Tops", do NOT change to "Casual Tops".

        PHASE 4 — SPACE SAVING / DROP PRIORITY
        
        If title exceeds 80 characters, you must remove items.
        Follow this strict hierarchy of value to determine what survives.

        KEYWORD PRIORITY (HIGHEST VALUE → LOWEST VALUE):
        1. Brand / Collection
        2. Team / Organization
        3. Product Type / Garment Type (Knit, Sweater, Cardigan)
        4. Pattern (Fair Isle, Plaid, Stripe)
        5. Gender
        6. Size
        7. Trend / Era / Aesthetic (Y2K, Whimsygoth, Vintage)
        8. Style Code (Verified Only)
        9. Verified Luxury Materials (Wool, Cashmere, Silk - Image Verified)
        10. Fit & Silhouette (Relaxed, Wide Leg, Baggy)
        11. Down Fill Power (e.g. 850 Fill)
        12. Performance Fabric (Dri-Fit, Climacool, etc.)
        13. Color
        14. Sport Context (Golf, Training)
        15. Generic Keywords (Athletic, Casual, Nice, etc.)

        DROP ORDER (REMOVE THESE FIRST → LAST):
        1. Generic Keywords (Athletic, Casual)
        2. Sport Context (Golf, Training - unless highly relevant)
        3. Color (only if critical for space)
        4. Performance Fabric (only if absolutely forced)
        5. Fit & Silhouette (only if forced)
        6. Down Fill Power (PROTECTED - ONLY if absolutely forced)
        7. Style Code (Drop BEFORE Trend keywords)
        8. Trend / Era / Aesthetic Keywords (PROTECTED - Do not drop)



        FINAL CHECK:
        - If characters remain and verified attributes like "Dri-Fit" or "Golf" are available, include them.
        - Do NOT finalize title if < 75 chars and verified attributes remain.

        OUTPUT
        Return ONLY the final optimized title string.

        FINAL CHECK: FILL THE SPACE (MANDATORY)
        Target: 75–80 characters.
        Current performance is stopping short (e.g. 66 chars). This is UNACCEPTABLE.

        KEYWORD INJECTION WHEN SPACE REMAINS (TARGET 75-80 CHARS)
        If the optimized title is under 72 characters:
        - Inject one safe, non-speculative, category-appropriate keyword.
        - Do NOT inject lifestyle or trend terms unless strongly aligned with the item.

        SAFE INJECTIONS:
        - Denim -> "Baggy", "Relaxed", "90s" (If visible/era appropriate)
        - Knitwear -> "Preppy", "Classic"
        - Henleys -> "Thermal", "Waffle"

        IF TITLE < 75 CHARACTERS:
        You MUST add high-value keywords until you hit the limit.

        DENIM SAFE FILL RULE (NEW):
        If the item is Jeans or Denim Pants AND the title is < 75 characters after all verified facts are included, you MAY inject ONE of the following high-intent buyer keywords if space permits:

        Preppy, Heritage, American, Western

        Conditions:
        - Must not conflict with Brand positioning
        - Must not violate keyword caps
        - Must not replace or remove core facts
        - Maximum ONE denim-safe filler term per title

        This rule overrides the NEGATIVE KEYWORD LIST for denim items ONLY when space remains unused.

        LUXURY KNIT SAFE FILL RULE (NEW)
        If the item is a Luxury Knit or Cashmere Sweater AND the title is < 75 characters after all verified facts:
        You MAY inject ONE or TWO of the following buyer-intent keywords if space permits:

        Preppy, Heritage, Refined, Soft, Cozy, Luxury

        Conditions:
        - Must not imply activity, sport, or performance
        - Must not conflict with material or garment type
        - Maximum TWO luxury knit fillers per title

        These keywords are authorized to fill space and do NOT violate the Negative Keyword List in this context


        NON-TERMINAL STYLE RULE (CRITICAL)
        Style keywords (e.g. "Gorpcore") do NOT end the optimization.
        After adding a style, you MUST continue to evaluate "Functional Descriptors" to fill the remaining space.

        PRIORITY OF FILLER KEYWORDS (STRICT HIERARCHY):
        1. STYLE ENGINE OUTPUT (e.g. "Athleisure", "Gorpcore", "Y2K") - HIGHEST VALUE
        2. CONTEXTUAL FILLERS (Category Logic):
           - BLAZERS/JACKETS: "Preppy", "Lightweight", "Breathable", "Classic", "Academia".
           - LINEN ITEMS: "Breathable", "Summer", "Lightweight".
        3. FUNCTIONAL APPRAREL DESCRIPTORS (Post-Style Fill)
           - Insulated, Packable, Lightweight, Quilted, Puffer, Down
        4. Item Specifics (LOWEST PRIORITY)
           - Only use if no Style Keywords or Functional terms are available.

        SPECIFIC STYLE RULES:
        - "Athleisure" > "Activewear" (Always prefer Athleisure)
        - "Vintage" > "Retro"
        - "Gorpcore" > "Outdoor" / "Utility" / "Insulated" (If authorized)

        Rule: Do NOT leave 15 unused characters on the table. Fill it with value.
        Do NOT add "New" or banned seasonal words.
        USE THE SPACE.

        Rule: Do NOT leave 15 unused characters on the table. Fill it with value.
        Do NOT add "New" or banned seasonal words.
        USE THE SPACE.

        🔧 GEMINI OVERRIDE PATCH — SEO STYLE & CHARACTER UTILIZATION
        SYSTEM OVERRIDE — SEO ENRICHMENT CLARIFICATIONS (HIGH PRIORITY)

        1) STYLE INJECTION CLARIFICATION
        Trend and lifestyle keywords are NOT factual claims.
        Tier 2 style keywords (Y2K, Coquette, Whimsygoth, Gorpcore, Americana, Grunge) are SEARCH ENRICHMENT and may be injected when:
        - The item category allows the style
        - The style does not contradict the item
        - Character space exists

        Do NOT require strong visual proof for Tier 2 styles.
        Avoid false positives, but do not suppress search-intent styles due to uncertainty alone.

        ---

        2) MULTI-STYLE INJECTION RULE
        When character space allows, prefer injecting MULTIPLE compatible style keywords rather than stopping at one.

        Rules:
        - Up to 2 Tier 2 styles may be injected
        - Tier 1 styles (Romantic, Preppy, Classic, Minimalist) may coexist with Tier 2
        - If title length < 75 characters, style expansion SHOULD occur unless explicitly disallowed

        Example:
        Cream Lace Crop Top Women's XS Ivory Blouse Y2K Coquette Romantic

        ---

        3) CHARACTER UTILIZATION ENFORCEMENT
        If the final title is under 75 characters:
        - You MUST attempt additional SEO enrichment
        - Style keywords take priority over generic fillers
        - It is NOT acceptable to stop early if safe styles remain available

        ---

        4) ATHLEISURE RECLASSIFICATION
        Athleisure is NOT a filler keyword.
        Athleisure may ONLY be used when ALL conditions are met:
        - Item is performance or activewear
        - Brand is athletic or performance-focused
        - Item construction supports movement or training

        If Athleisure is not explicitly supported, OMIT IT ENTIRELY.
        Never use Athleisure as a fallback for low context.

        ---

        5) STYLE SIGNAL PHASE PRIORITY
        Style Signal Intelligence must be evaluated whenever:
        - The title is under 75 characters
        - The item category is eligible for stylistic search behavior

        This phase is REQUIRED when space exists.

        ---

        6) MEASUREMENT REPLACEMENT RULE (CRITICAL)
        If waist x inseam measurements are present (e.g. 34x30):
        - Do NOT include a standalone numeric size for the same dimension
        - Measurements replace numeric size indicators

        ---

        7) STYLE CODE PRIORITY OVERRIDE
        Verified style codes take priority over SEO filler.
        If a verified style code exists and character space remains:
        - The style code MUST be included
        - SEO keywords may be reduced to preserve it

        ---

        8) IMAGE CONFIDENCE REMINDER
        Images ARE allowed to inform:
        - Garment structure (button down collar, pullover, etc.)
        - Logo variants (brand-authorized only)
        - Obvious construction details

        Do not suppress image-derived keywords due to minor uncertainty if no contradiction exists.

        ---

        9) SYSTEM OVERRIDE — ACCESSORY STYLE SAFETY (CRITICAL)

        ACCESSORY CATEGORY DEFINITION:
        Accessories include hats, caps, berets, beanies, scarves, belts, gloves, bags, and small fashion add-ons.

        RULES FOR ACCESSORIES:
        - Do NOT inject Athleisure, Training, Performance, or Sport styles.
        - Do NOT force lifestyle or trend keywords when context is minimal.
        - It is acceptable for accessory titles to remain under 75 characters.

        STYLE ALLOWANCE FOR ACCESSORIES:
        - Allowed descriptive styles: Classic, Vintage, French, Minimalist.
        - Allowed trend styles ONLY if explicitly supported by title or visuals (e.g. Y2K beanie, Gorpcore cap).

        CHARACTER UTILIZATION EXCEPTION:
        The 75-character target does NOT apply to accessories.
        Accuracy and category relevance override character fill requirements.

        BERET-SPECIFIC GUIDANCE:
        - Berets are fashion accessories, not athletic wear.
        - Never associate berets with Athleisure.
        - If material is known (e.g. Wool), prioritize it over lifestyle terms.
        - If context is limited, stop after core facts.

        ---

        10) SYSTEM OVERRIDE — SIZING NORMALIZATION & CHARACTER OPTIMIZATION (HIGH PRIORITY)

        1) SIZE LABEL REMOVAL (GLOBAL)
        Do NOT use the word "Size" in titles.
        Size descriptors must be written as the full word when applicable.
        Examples:
        - "Men's Medium" (NOT "Men's Size M")
        - "Women's Large" (NOT "Women's Size L")
        - "Men XL" is acceptable only when character space is extremely limited

        Apply this rule to ALL future listings.

        2) LETTER SIZE EXPANSION RULE
        When a letter size is present (S, M, L, XL, XXL):
        - Prefer the FULL WORD form if character space allows
        
        Mapping:
        S → Small
        M → Medium
        L → Large
        XL → XL or Extra Large (choose shorter if space-constrained)
        XXL → XXL

        This rule applies especially when the title is under 75 characters.

        3) OUTERWEAR SIZE PRIORITY
        For jackets, coats, shells, and outerwear:
        - Size clarity is HIGH PRIORITY
        - Prefer "Men's Medium" over compact forms
        - Size wording may be expanded to improve buyer clarity and SEO

        4) CHARACTER UTILIZATION RECHECK
        After inserting:
        - Value Leader
        - Core attributes
        - Authorized style keywords
        
        You MUST re-evaluate size wording.
        If expanding the size increases clarity and character utilization without exceeding 80 characters, it SHOULD be done.

        5) EXAMPLE CORRECTION
        Preferred: Patagonia Jacket Men's Medium Polyester Yellow Gorpcore Waterproof
        Avoid: Patagonia Jacket Men's Size M Polyester Yellow Gorpcore Waterproof

        ---
        
        11) SYSTEM OVERRIDE — TRUE VINTAGE & HIGH-INTENT PATTERNS (CRITICAL)

        1) TRUE VINTAGE NORMALIZATION
        If the original title explicitly references an era that is 50+ years old
        (e.g. 1940s, 1950s, 60s, 1970s):
        - Normalize the era to the keyword "True Vintage"
        - "True Vintage" replaces specific decades
        - Treat "True Vintage" as a HIGH-INTENT buyer keyword
        - "True Vintage" outranks generic "Vintage"

        PRESERVED VINTAGE DESCRIPTORS (DO NOT REMOVE):
        - Buffalo Plaid
        - Loop Collar
        - Workwear
        - Heritage
        - Chore Coat

        Examples:
        - "40s 50s vintage flannel" → "True Vintage Flannel"
        - "1970s loop collar shirt" → "True Vintage Loop Collar Shirt"

        Never downgrade a verified 50+ year item to generic "Vintage".

        2) FLANNEL & PLAID PATTERN PRESERVATION (CRITICAL)
        For flannel shirts and jackets:
        - "Buffalo Plaid" is a CORE IDENTITY keyword
        - If "Buffalo Plaid" appears in the original title, it MUST be preserved
        - Do NOT replace or omit it in favor of generic color descriptors

        Priority: Buffalo Plaid > Plaid > Color adjectives (Red, Black, etc.)

        3) ERA + PATTERN COEXISTENCE
        When applicable, era and pattern MUST coexist.
        Correct: True Vintage Buffalo Plaid Flannel Jacket
        Incorrect: Vintage Red Flannel Jacket

        4) VINTAGE CONFIDENCE RULE
        When an item is identified as True Vintage:
        - Prefer era and construction descriptors over lifestyle styles
        - Do NOT inject modern styles (Athleisure, Streetwear, Casual)
        - Americana, Workwear, Heritage are preferred if space allows

        5) BRAND NAME PRESERVATION — VINTAGE
        For uncommon or legacy vintage brand names:
        - Preserve spelling from the original title exactly
        - Do NOT autocorrect unless the error is obvious and modern

        ---

        12) CONDITION-BASED KEYWORD INJECTION (STRICT VERIFICATION)

        RULE:
        If item specifics explicitly state the condition as "New" or "New With Tags", the model MUST inject "New" or "NWT" into the optimized title.

        PRIORITY:
        - Condition keywords ("New", "NWT") > Vague Descriptors (e.g. "Nice", "Clean")
        - If character space remains, prioritize "New" over generic style words.

        RESTRICTIONS:
        - Condition keywords must be verified by item specifics/title. NEVER INFERRED.
        - Do NOT inject "New" if the item is used, pre-owned, or vintage (unless "NOS" or "Deadstock" is verified).
        - If verified New, "New" is a required keyword, not optional.

        13) CONDITION OVERRIDE PRIORITY
        Condition keywords (New, NWT) are considered verified facts when provided in item specifics.
        - Adding verified condition keywords does not count as adding speculative information.
        - If character space remains and condition is verified, condition keywords must be injected even if not present in the original title.
        - Condition injection overrides conservative output rules, but only for verified condition data.

        14) CONTROLLED ENRICHMENT STOP CONDITION
        Do not force enrichment to meet a character target.
        Enrichment should stop when:
        - All high-confidence attributes are exhausted, OR
        - Remaining attributes would require speculation.
        Accuracy and category correctness always outweigh character utilization.

        15) BASE LAYER / THERMAL CLASSIFICATION (ATHLEISURE BAN)
        Items categorized as Thermal Underwear, Long Johns, Base Layers, or Sleepwear:
        - Prioritize: Thermal, Base Layer, Insulating, Cold Weather.
        - NEVER apply "Athleisure" to these base layers (unless explicit performance marketing).
        - Do not associate underwear or sleep layers with street-style Athleisure.

        END OVERRIDE
        `;

        // DEBUG: Log the full prompt for user inspection
        console.log('\n--- GENERATED PROMPT START ---');
        console.log(promptText);
        console.log('--- GENERATED PROMPT END ---\n');
        const apiKey = process.env.GEMINI_API_KEY;

        // List of models to try in order of preference
        // We prioritize Flash (multimodal) then fallback to Pro (text-only)
        const candidateModels = [
            'gemini-2.0-flash',     // New Stable Multimodal
            'gemini-1.5-flash',     // Previous Stable
            'gemini-1.5-pro'        // High Intel Fallback
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
