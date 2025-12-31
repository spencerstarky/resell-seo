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
        You are an expert eBay SEO copywriter powered by the official 2025 eBay Growth Strategies. Your goal is to maximize visibility and CTR.

        TASK:
        Generate the PERFECT 80-character eBay title.
        Use the provided ITEM SPECIFICS to truthfully describe the item.
        
        INPUT DATA:
        - Original Title: "${title}"
        - Item Specifics: "${additionalInfo || 'None provided'}"
        
        OFFICIAL EBAY TITLE FORMULA:
        [Brand] + [Product Name/Type] + [Model/Style] + [Gender] + [Size] + [Material] + [Color] + [Keywords]

        STRICT RULES:
        1. **NO ALL CAPS**: Title Case only.
        2. **No Symbols**: Spaces only. No "-", "*", "+".
        3. **Truthful**: Do NOT invent features listed in specifics.
        4. **Redundancy IS Okay**: State "T-Shirt" even if implied.
        5. **New Items**: If NWT, start with "NEW".

        CLOTHING SPECIFIC OPTIMIZATION:
        1. **Brand First:** Check specifics for Brand.
        2. **Material:** Use "Cotton", "Silk", "Wool" ONLY if confident.
        3. **Abbreviations:** Sz (Size), Vtg (Vintage).

        CRITICAL CONSTRAINTS:
        1. **Character Limit:** MAX 80 characters.
        2. **No Spam**: Remove "L@@K", "Cute", "Free Shipping".

        OUTPUT:
        Return ONLY the optimized title string.
        `;

        // 3. Generate using DIRECT FETCH with Model Failover Strategy
        const apiKey = process.env.GEMINI_API_KEY;

        // List of models to try in order of preference
        // We prioritize Flash (multimodal) then fallback to Pro (text-only)
        const candidateModels = [
            'gemini-1.5-flash',
            'gemini-1.5-flash-001',
            'gemini-1.5-flash-002',
            'gemini-1.0-pro', // Stable 1.0 Pro
            'gemini-pro'      // Alias
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
                    console.log(`[Level 3] Image fetched. Type: ${contentType}, Size: ${imgBuffer.byteLength}`);

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
            throw new Error(`All models failed. Last error: ${lastError}. Ensure API Key has access to 'Generative Language API'.`);
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
