import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@/lib/supabase-server';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
    try {
        const { title, itemInfo } = await request.json();

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
        }

        if (!title) {
            return NextResponse.json({ error: 'Title is required' }, { status: 400 });
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

        const prompt = `
        Current Date: ${new Date().toISOString()}

        ROLE:
        You are an expert eBay SEO copywriter powered by the official 2025 eBay Growth Strategies. Your goal is to maximize visibility and CTR by strictly following eBay's documentation.

        TASK:
        Rewrite the provided eBay listing title using the official eBay Title Format and SEO rules.

        INPUT:
        - Original Title: "${title}"
        - Additional Info: "${itemInfo || 'None provided'}"

        OFFICIAL EBAY TITLE FORMULA:
        [Brand] + [Product Name/Type] + [Model/Style] + [Gender] + [Size] + [Material] + [Color] + [Keywords]

        STRICT EBAY RULES (From Documentation):
        1. **NO ALL CAPS**: Avoid writing entire words in capital letters (except standard acronyms like NWT, Vtg).
        2. **No Symbols**: Do NOT use asterisks (*), dashes (-), or other markers between words. Use spaces only.
        3. **Redundancy IS Okay**: Explicitly state the Product Name (e.g. "T-Shirt") even if it repeats the Category name.
        4. **New Items**: If the item is New with Tags (NWT), start the title with "NEW" or "NWT".

        CLOTHING SPECIFIC OPTIMIZATION:
        1. **Brand First:** Always start with the Brand.
        2. **Style Keywords:** Include descriptors (Y2K, Boho, Slim Fit, etc.) in the [Keywords] section.
        3. **Material:** Always include if known (Cotton, Silk, Wool).
        4. **Abbreviations:** Use standard ones only: Sz (Size), Vtg (Vintage).

        CRITICAL CONSTRAINTS:
        1. **Character Limit:** MAX 80 characters.
        2. **No Spam**: Remove words like "L@@K", "Wow", "Cute", "Free Shipping".
        3. **Maximize Meaning:** Use every character for descriptive keywords.

        OUTPUT:
        Return ONLY the optimized title string. No explanations.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let optimizedTitle = response.text().trim().replace(/^"|"$/g, ''); // Remove quotes if model adds them

        // Hard stop character limit enforcement
        if (optimizedTitle.length > 80) {
            console.log(`Title truncated from: ${optimizedTitle}`);
            optimizedTitle = optimizedTitle.substring(0, 80);
        }

        // Increment Usage Count
        const { error: rpcError } = await supabase.rpc('increment_usage', { user_id: user.id });

        if (rpcError) {
            console.warn('RPC failed, falling back to direct update:', rpcError);
            // Fallback if RPC doesn't exist (e.g. user hasn't run migration)
            const { data: profile } = await supabase.from('profiles').select('usage_count').eq('id', user.id).single();
            if (profile) {
                await supabase.from('profiles').update({ usage_count: (profile.usage_count || 0) + 1 }).eq('id', user.id);
            }
        }

        return NextResponse.json({ optimizedTitle });
    } catch (error: any) {
        console.error('Gemini Optimization Error:', error);
        return NextResponse.json({ error: `Failed to optimize title: ${error.message}` }, { status: 500 });
    }
}
