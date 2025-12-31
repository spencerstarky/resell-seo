import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@/lib/supabase-server';
import { getValidAccessToken, getDetailedItemInfo } from '@/lib/ebay-api';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

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
                // Fallback to title-only if fetch fails
            }
        }

        // DEBUG RESTORATION: Revert to simplest possible config (Gemini Pro Text-Only)
        // This is to verify the API Key and connectivity are working, ruling out Model/Image issues.
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

        // Prompt Text
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

        // Simple Text-Only Part
        const inputParts = [{ text: promptText }];

        // 3. Generate
        console.log('[Debug] Sending Text-Only request to Gemini Pro...');
        const result = await model.generateContent(inputParts);
        const response = await result.response;
        let optimizedTitle = response.text().trim().replace(/^"|"$/g, '');

        if (optimizedTitle.length > 80) {
            optimizedTitle = optimizedTitle.substring(0, 80);
        }

        // Increment Usage
        await supabase.rpc('increment_usage', { user_id: user.id });

        return NextResponse.json({ optimizedTitle });
    } catch (error: any) {
        console.error('Gemini Optimization Error:', error);
        return NextResponse.json({ error: `Failed to optimize title: ${error.message}` }, { status: 500 });
    }
}
