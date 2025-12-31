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

        // 3. Generate using DIRECT FETCH (Bypassing SDK to debug)
        const apiKey = process.env.GEMINI_API_KEY;
        // Using 'gemini-1.5-flash-latest' to verify if this key supports it.
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

        console.log('[Direct Fetch] Sending request to:', url.replace(apiKey, 'HIDDEN_KEY'));

        const payload = {
            contents: [{
                parts: [{ text: promptText }]
            }]
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const debugStatus = response.status;
        const debugText = await response.text();

        console.log(`[Direct Fetch] Status: ${debugStatus}`);
        console.log(`[Direct Fetch] Response: ${debugText.slice(0, 500)}`);

        if (!response.ok) {
            let errorMsg = `Google API Error: ${debugStatus}`;
            try {
                const errJson = JSON.parse(debugText);
                if (errJson.error && errJson.error.message) {
                    errorMsg += ` - ${errJson.error.message}`;
                } else {
                    errorMsg += ` - ${debugText}`;
                }
            } catch (e) {
                errorMsg += ` - ${debugText}`;
            }
            throw new Error(errorMsg);
        }

        const data = JSON.parse(debugText);
        let optimizedTitle = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
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
