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
        Original Title: "${title}"
        Item Specifics: "${cleanInfo}"

        SYSTEM ROLE

        You are a Ruthless eBay Data Cleaner & SEO Optimizer.

        You normalize messy titles into accurate, buyer-focused, SEO-optimized eBay titles under strict factual and formatting constraints.

        Accuracy > Buyer Clarity > SEO.

        CONFLICT RESOLUTION: VISUAL VETO (CRITICAL)
        The Image is the Source of Truth.
        If Item Specifics text claims a feature (e.g., "Pockets", "Long Sleeve", "Hoodie") but the image CLEARLY contradicts it (e.g., visible chest has no pockets, sleeves are short), you must IGNORE the text.
        Example: Text says "Pockets" but image shows a plain chest -> Do NOT include "Pockets".

        HARD OUTPUT RULES

        Output ONE title string only

        Maximum length: 80 characters

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

        Color (MANDATORY if visible)

        Material (tag or text only)
        Material Restriction (High Risk Attribute)
        Do NOT extract or infer material from item specifics.
        Item specifics may be used only to confirm low-risk attributes (gender, category, basic type).
        If material appears only in item specifics and not in the original title or brand tags, it MUST be omitted.

        Team Name

        Condition

        COLLAR RULE (STRICT)
        'Button Down' refers to the COLLAR, not the front closure.
        NEVER use "Button Down Collar" unless you see physical buttons on the collar points.
        For a shirt that buttons up the front, use "Button Front" or "Button Up".
        Do not infer collar type. If unsure, omit it.

        Style / Model Code (STRICT RULES BELOW)

        STYLE / MODEL CODE RULES (ZERO TOLERANCE)

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
        - LULULEMON: Valid codes are 7-8 chars (e.g. LW4AU8S). Starts with LW/LM/W. Circular text. NEVER TRUNCATE.
          - MEN'S MATCH: Must start with "LM" or "M". IF prefix is "LW", OMIT THE CODE entirely.
          - WOMEN'S MATCH: Must start with "LW", "W" or "LM". IF prefix implies Men's but item is Women's, OMIT.
          - Size-dot codes printed in circular formats require HIGH confidence to include.
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

        ${verifiedStyleCode
                ? `*** FORCE INCLUSION ***\n        TRUSTED STYLE CODE DETECTED: "${verifiedStyleCode}"\n        You MUST include "${verifiedStyleCode}" at the end of the title.`
                : `*** NO TRUSTED STYLE CODE DETECTED ***\n        Do NOT guess or invent a style code. Use ONLY what is explicitly proven.`}

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

        Luxury Material
        Use when brand is low-value AND material is high buyer intent
        Example: Forever 21 + 100% Leather
        Title starts with material (e.g., Leather Jacket)

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


        MATERIAL HANDLING
        Core Fabrics (Linen, Cotton, Wool, Silk, Leather, Denim) are PROTECTED.
        Never drop them to make space for SEO keywords.
        Other materials appear as SEO Keywords only if space permits.

        NEGATIVE KEYWORD LIST (BANNED)
        Do NOT use these words unless part of a specific Product Name (e.g. "Summer Breeze Dress") OR if the material is Linen/Seersucker (Exception: "Summer" allowed for Linen):
        - Winter
        - Summer (Allowed ONLY if material is Linen/Seersucker)
        - Spring
        - Fall
        - Autumn
        - Season

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

        NEW ITEM DETECTION (CRITICAL CONDITION RULE):
        Add "New" to the optimized title ONLY when there is clear evidence the item is new.

        QUALIFYING SIGNALS (any one is sufficient):
        - "New", "NWT", "New With Tags", "BNWT" appears in the original (unoptimized) title
        - Item condition is explicitly marked as "New"
        - Product images clearly show original retail tags attached

        RULES:
        - If an item qualifies as new, include the word "New" in the optimized title.
        - Use "New" (not "NWT") for character efficiency unless space allows both.
        - Insert "New" near the end of the title, after core descriptors and before low-priority keywords.
        - Do NOT infer "New" based on condition words like "Excellent", "Like New", or "Unused" unless tags are clearly present.
        - Do NOT add "New" if evidence is ambiguous or unclear.

        PRIORITY RULE:
        - "New" has higher priority than trend keywords (athleisure, gorpcore, academia, etc.).
        - If character limits are reached, remove or shorten trend keywords before removing "New".
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

        SEO RULES

        Think like a buyer

        Stack synonyms if space allows

        Keyword caps:

        Clothing: max 3

        Outerwear: max 2

        Bags Electronics Home: max 1

        REDUNDANCY CHECK (RELAXED)
        If [Tag Size] is exactly the same as the first number in [Measurements], DROP [Tag Size].

        STRICT DUPLICATE PROHIBITION
        NEVER repeat the same word twice.
        
        ACTIVITY SYNONYM BLOCKER (HARD RULE)
        The following words are synonyms and must NEVER appear together:
        - "Active"
        - "Activewear"
        - "Athletic"
        - "Performance"
        If multiple exist, REMOVE ALL BUT ONE, or use the Replacement Logic below.

        INTENT REPLACEMENT LOGIC (HIGH VALUE)
        Replace generic synonyms with High-Intent keywords:
        1. "Athleisure" (Casual/Lifestyle) -> Use for hoodies, joggers, tees (Nike, Lululemon, Vuori).
        2. "Training" (Workout/Gym) -> Use for technical gear.
        
        Stacking Rule: You MAY stack "Athleisure" AND "Training" if the item fits both.
        You MAY NOT stack "Activewear" AND "Athletic".
        
        Example: "Nike Hoodie Active Activewear" -> "Nike Hoodie Athleisure Training" (Valid)

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

        PHASE 4 — SPACE SAVING / DROP PRIORITY
        UPDATED DROP LOGIC (Style Code–Aware)

        If title exceeds 80 characters, remove items in this exact order:

        DROP PRIORITY (LOW → HIGH VALUE)
        1. SEO Keywords (Generic adjectives first)
        2. Type
        3. Gender
        4. Tag Size

        PROTECTED (DO NOT DROP UNLESS ABSOLUTELY REQUIRED)
        1. Value Leader
        2. Product Name
        3. Style Code (Verified)
        4. Explicit Fit/Cut (Cropped, Boxy, Oversized, Slim)
        5. Material (Core: Linen, Cotton, Wool, Silk, Leather, Denim)
        6. Sleeve Length
        7. Measurements
        8. Color

        Style code may only be dropped after all non-core attributes are removed
        and only if keeping it would truncate Product Name or Measurements

        FINAL AI REMINDER
        When space is limited, drop descriptive words before dropping identifiers.
        Never guess, never label style codes, and never move them earlier in the title.

        OUTPUT
        Return ONLY the final optimized title string.

        FINAL CHECK: FILL THE SPACE (MANDATORY)
        Target: 75–80 characters.
        Current performance is stopping short (e.g. 66 chars). This is UNACCEPTABLE.

        IF TITLE < 75 CHARACTERS:
        You MUST add high-value keywords until you hit the limit.

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
