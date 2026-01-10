import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getValidAccessToken, getDetailedItemInfo } from '@/lib/ebay-api';
import crypto from 'crypto';

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

        let tier = profile?.plan_tier || 'free';

        // Admin Override for resellseo@gmail.com
        if (user.email === 'resellseo@gmail.com') {
            tier = 'pro';
        }

        // Define Limits
        let limit = 25; // Free: 25 Lifetime
        let isMonthly = false;
        let isYearly = false;

        if (tier === 'starter') {
            limit = 400;
            isMonthly = true; // Still monthly?
        } else if (tier === 'pro') {
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
        const promptText = `
        Current Date: ${new Date().toISOString()}

        ROLE:
        You are a ruthless eBay Data Cleaner & SEO Expert.
        
        INPUT DATA:
        - Original Title: "${title}"
        - Item Specifics: "${additionalInfo || 'None provided'}"
        - IMAGES: Access the attached images to find Material Tags (e.g. 100% Silk), Flaws, or Specific Model names.


        TASK:
        Refine the title to maximize search volume while fixing formatting.

        SEO STRATEGY (BUYER MENTALITY):
        1. **Think like a Customer:** What 3-5 words would a buyer type to find this specific item? Ensure those EXACT words are in the title.
        2. **High-Volume Synonyms:** Redundancy is GOOD for SEO. If space permits, stack synonyms (e.g. "Sweater Pullover Knit", "Coat Jacket", "Polo Shirt", "Pants Trousers Slacks").
        3. **Style & Occasion:** Add strong keywords (e.g. "Boho", "Minimalist", "Oversized", "Vintage", "Y2K", "Office", "Winter").
        4. **Material is Key:** If you see "Silk", "Wool", "Linen" in the images, YOU MUST INCLUDE IT.
        5. **FILL THE SPACE (GREEDY MODE):** You have 80 characters. If you have >10 chars left, ADD MORE KEYWORDS.
           - **Apparel:** "Stretch", "Breathable", "Tour", "Classic", "Modern", "Print", "Solid", "Lightweight", "Casual".
           - **Active:** "Gym", "Run", "Performance", "Moisture Wicking", "Athletic".
           - **Descriptions:** Describe the item! "Blade Collar", "Mock Neck", "Zip", "Button".

        HALLUCINATION POLICY (ZERO TOLERANCE):
        1. **NO GUESSING:** If the input (Title/Image/Specifics) does not explicitly indicate a Size or Gender, DO NOT ADD IT.
        2. **CATEGORY AWARENESS:** Bags, Electronics, and Home Goods often DO NOT have a Size (like S/M/L) or Gender. Do not force "Mens" or "Medium" on a Backpack unless proven.
        3. **ONLY FACTUAL DATA:** Use the visible model number, brand, and color. Do not invent "Leather" if it looks like Nylon.
        4. **NUMERIC SAFETY:** Trust the measurements in the original title (e.g. "30x29.5"). DO NOT change "30" to "31". measurement numbers must match the input unless the Image Tag clearly says otherwise.

        BRAND STRATEGY (SMART POSITIONING):
        1. **Value Leader Rule:** The FIRST word must be the highest value keyword. Usually, this is the Brand (e.g. Nike, J.Crew).
        2. **Team Exception:** If the item is Sports Fan Apparel (NCAA/NFL/NBA) on a generic blank (e.g. Gildan, Hanes), lead with the TEAM NAME (e.g. "UGA Bulldogs"). Move the maker brand to the end.
        3. **Luxury Exception:** If the item is Luxury Material (Cashmere, Silk, Leather) but Low-End Brand (e.g. Merona, Apt 9, Gildan, Unbranded), lead with the MATERIAL (e.g. "100% Cashmere Sweater"). Move the brand to the end.
        4. **Mid-Tier Protection:** Brands like J.Crew, Banana Republic, Zara ARE valuable. Keep them FIRST. Only move truly generic/mass-market brands.

        CRITICAL PRESERVATION RULES (DO NOT TOUCH):
        1. **Product Name vs Code:** The Descriptive Name (e.g. "Slouch Coat", "501 Jeans") is KING. Never remove it to make room for a long alphanumeric SKU (e.g. "LB43360...").
        2. **Model Numbers:** Keep short, searchable codes (e.g. "501", "MX-5"). If a code is very long (>10 chars) and not a known model name, prioritize the Product Name instead.
        3. **Specific Colors:** Keep "Tan", "Teal", "Coral". Do NOT change to "Brown" or "Red".

        FORMATTING OPERATIONS (EXECUTE ALL):
        1. **Remove Labels vs Values:** DELETE the word "Size", "Sz", "Waist", "W", "L" (as a label). BUT **KEEP THE VALUE**.
        2. **Spell Out Sizes:** Prefer "Small", "Medium", "Large", "X-Large" over "S", "M", "L", "XL" for better readability. Only abbreviate if you are desperate for space (>80 chars).
        3. **Sizing Priority:** For Pants/Jeans, include BOTH the Tag Size (e.g. 8) AND Measurements (e.g. 28x26) if available.
        4. **Compact Math:** Change "38 x 9" to "38x9". Change "28 x 26" to "28x26". No spaces around "x".
        5. **Space Saver:** Change "Men's" to "Mens", "Women's" to "Womens", "Levi's" to "Levis". (No apostrophes).
        6. **"New" Placement:** If item is New/NWT, put "New" at the VERY END of the title. Title Case only.
        7. **No Spacing Chars:** Remove / - : , (Use spaces only).

        DECISION LOGIC:
        - **HARD LIMIT:** The output MUST be under 80 characters.
        - **PRIORITY:** Value Leader > Product Name > Gender > Size > Color > Type > Model No.
        - **TRUNCATION STRATEGY:** If running out of space, DROP "Keywords" first. NEVER cut a word in half. Remove the last word entirely if it doesn't fit.

        DEFINITIONS:
        - **[Product Name]:** The Core Category (e.g. Sweater, Shirt, Pants, Hoodie). Keep this BEFORE Size.
        - **[Type]:** The Style/Cut (e.g. Pullover, Button Up, Skinny, Bootcut). Put this AFTER Size.

        STRICT STRUCTURE (Follow this order):
        [Value Leader] [Product Name] [Gender] [Tag Size] [Color] [Type] [Measurements] [Keywords] [New?] [Low Brand?]

        Example:
        Input: "Gildan UGA Bulldogs Red Shirt"
        Output: "UGA Bulldogs Shirt Mens Large Red Polo Football NCAA Gildan" (Color before Type)

        Example 2:
        Input: "Quince Italian Wool Double Breasted Slouch Coat Black"
        Output: "Quince Italian Wool Slouch Coat Womens XL Trench Double Breasted Black"

        FINAL CHECK:
        - Is "Sz" gone?
        - Is "8" present?
        - Is "New" at the end?
        - Is it under 80 chars?

        OUTPUT :
        Return ONLY the final string.
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
