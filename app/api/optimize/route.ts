import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getValidAccessToken, getDetailedItemInfo } from '@/lib/ebay-api';

// NOTE: Bypassing Google Generative AI SDK temporarily to debug connectivity/Key issues directly.
// We use native 'fetch' to control the exact request and see the raw response.

export async function POST(request: NextRequest) {
    try {
        const { title, itemId, imageUrl } = await request.json();

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

        // --- SAFEGUARD: Tier Limits ---
        // 1. Get User Profile for Tier
        const { data: profile } = await supabase
            .from('profiles')
            .select('plan_tier')
            .eq('id', user.id)
            .single();

        const tier = profile?.plan_tier || 'free';

        // Define Limits
        let limit = 25; // Free: 25 Lifetime
        let isMonthly = false;

        if (tier === 'starter') {
            limit = 400;
            isMonthly = true;
        } else if (tier === 'pro') {
            limit = 1200;
            isMonthly = true;
        }

        // 2. Count Usage
        const query = supabase
            .from('listings')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .in('status', ['optimized', 'uploaded']); // Count all optimized work

        if (isMonthly) {
            // Reset on 1st of month
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);
            query.gte('updated_at', startOfMonth.toISOString());
        }

        const { count: usageCount } = await query;

        if (usageCount !== null && usageCount >= limit) {
            console.warn(`[Limit Reached] User ${user.id} (${tier}) hit limit: ${usageCount}/${limit}`);
            const period = isMonthly ? 'this month' : 'total';
            return NextResponse.json(
                { error: `You have reached your ${tier} plan limit of ${limit} rewrites ${period}. Please upgrade to continue.` },
                { status: 429 }
            );
        }
        // ------------------------------

        // 1. Fetch Item Specifics from eBay (Level 2)
        let additionalInfo = '';
        if (itemId) {
            try {
                const accessToken = await getValidAccessToken(user.id, supabase);
                additionalInfo = await getDetailedItemInfo(itemId, accessToken);
                console.log(`[Level 3] Fetched specifics for ${itemId}: ${additionalInfo.slice(0, 100)}...`);
            } catch (err: any) {
                console.warn(`[Level 3] Failed to fetch specifics: ${err.message}`);
            }
        }

        // 2. Prepare Prompt
        const promptText = `
        Current Date: ${new Date().toISOString()}

        ROLE:
        You are a ruthless eBay Data Cleaner & SEO Expert.
        
        INPUT DATA:
        - Original Title: "${title}"
        - Item Specifics: "${additionalInfo || 'None provided'}"

        TASK:
        Refine the title to maximize search volume while fixing formatting.

        CRITICAL PRESERVATION RULES (DO NOT TOUCH):
        1. **Model Numbers:** YOU MUST PRESERVE alphanumeric codes (e.g., "LM7AW2S", "501", "MX-5"). These are vital.
        2. **Specific Colors:** Keep "Tan", "Teal", "Coral". Do NOT change to "Brown" or "Red".
        3. **Good Keywords:** If the original title has high-value specific keywords (e.g. "St33le", "Jock"), keep them.

        FORMATTING OPERATIONS (EXECUTE ALL):
        1. **Remove Labels:** DELETE words like "Sz", "Size", "Waist", "W", "L". 
           - **EXCEPTION:** For Shorts/Inseams, use the inch symbol " (e.g. 3" or 5"). IF clarity is needed, use "3 Inseam".
           - **PANTS:** Use compact "34x30".
        2. **Compact Math:** Change "38 x 9" to "38x9". Change "28 x 26" to "28x26". No spaces around "x".
        3. **Space Saver:** Change "Men's" to "Mens", "Women's" to "Womens", "Levi's" to "Levis". (No apostrophes).
        4. **"New" Placement:** If item is New/NWT, put "New" at the VERY END of the title. Title Case only.
        5. **No Spacing Chars:** Remove / - : , (Use spaces only).

        DECISION LOGIC:
        - If the Original Title is already descriptive and > 70 chars: ONLY apply the "Formatting Operations"(fix 38x9, Mens, Sz).Do not reorder the words significantly.
        - If the Original Title is weak: Apply standard structure: [Brand][Model][Type][Gender][Size][Material][Color][Keywords].

        FINAL CHECK:
        - Is "Sz" gone ?
            - Is "LM7AW2S" present ?
                - Is it under 80 chars ?

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

        // Prepare Image Data (Level 3)
        let imagePart: any = null;
        if (imageUrl) {
            try {
                const imgRes = await fetch(imageUrl);
                if (imgRes.ok) {
                    const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
                    const imgBuffer = await imgRes.arrayBuffer();
                    const base64Image = Buffer.from(imgBuffer).toString('base64');
                    console.log(`[Level 3] Image fetched.Type: ${contentType}, Size: ${imgBuffer.byteLength} `);

                    imagePart = {
                        inline_data: {
                            mime_type: contentType,
                            data: base64Image
                        }
                    };
                }
            } catch (err) {
                console.warn('[Level 3] Failed to fetch image:', err);
            }
        }

        let optimizedTitle = '';
        let lastError = '';

        for (const modelName of candidateModels) {
            try {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
                console.log(`[Attempt] Trying model: ${modelName}`);

                // Construct Payload
                const parts: any[] = [{ text: promptText }];

                // Add image ONLY if model supports it (Flash) and image exists
                if (imagePart && modelName.includes('flash')) {
                    parts.push(imagePart);
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
            optimizedTitle = optimizedTitle.substring(0, 80);
        }

        // Increment Usage
        await supabase.rpc('increment_usage', { user_id: user.id });

        return NextResponse.json({ optimizedTitle });

    } catch (error: any) {
        console.error('Gemini Optimization Error:', error);

        const apiKeyHint = process.env.GEMINI_API_KEY ? `(Key ends in ...${process.env.GEMINI_API_KEY.slice(-4)})` : '(No Key Configured)';
        let detailedError = error.message;

        return NextResponse.json({
            error: `Gemini Error: ${detailedError} ${apiKeyHint}`
        }, { status: 500 });
    }
}
