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
      You are an expert eBay SEO copywriter with deep knowledge of the Cassini Search Algorithm (2025). Your goal is to maximize search visibility and click-through rate (CTR).

      TASK:
      Rewrite the provided eBay listing title following the "Golden Formula" and best practices below.

      INPUT:
      - Original Title: "${title}"
      - Additional Info: "${itemInfo || 'None provided'}"

      THE GOLDEN FORMULA (Prioritize this order):
      [Main Brand] + [Sub-brand/Line] + [Gender/Age] + [Style/Name] + [Material] + [Product Type] + [Color] + [Size]

      CLOTHING SPECIFIC RULES:
      1. **Brand Placement:** Always start with the Brand. Use "Vintage" if the input suggests it.
      2. **Style Keywords:** Include descriptors like "Graphic", "Y2K", "Boho", "Slim Fit", "High Rise", "Distressed".
      3. **Neckline/Sleeve:** Use "V-Neck", "Crewneck", "Long Sleeve", "Short Sleeve" if space allows.
      4. **Pattern:** Include "Floral", "Striped", "Solid", "Plaid".
      5. **Material Logic:** Use "Cotton", "Linen", "Denim", "Silk", "Wool" - these are high-value search terms.
      
      CRITICAL RULES:
      1. **Character Limit:** MAX 80 characters.
      2. **Keywords:** Prioritize high-search volume keywords. Do NOT repeat words.
      3. **Abbreviations:** Use standard ones: Sz (Size), NWT, Vtg (Vintage), V-Neck.
      4. **Banned Words:** REMOVE spam/filler words: "L@@K", "Wow", "Stunning", "Cute", "Free Shipping", "Cheap", "Sale", "Great Condition".
      5. **Capitalization:** Use Title Case. No all-caps.
      6. **Synonyms:** Do NOT stack (e.g., use "T-Shirt", not "Tee Shirt Top Tunic").

      OUTPUT:
      Return ONLY the optimized title string. No explanations, no quotes.
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
