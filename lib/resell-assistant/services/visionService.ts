import { GoogleGenerativeAI } from '@google/generative-ai';
// @ts-ignore - heic-convert lacks TypeScript definitions
import convert from 'heic-convert';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export interface StructuredAttributes {
    brand: string | null;
    model_or_style: string | null;
    item_type: string | null;
    gender_department: string | null;
    size: string | null;
    color: string | null;
    material: string | null;
    key_features: string[];
}

export interface DetectedItem {
    productName: string;
    category: string | null;
    compingQuery: string;
    keywords: string;
    structuredAttributes: StructuredAttributes;
}

/**
 * Analyze product images using Gemini's multimodal capabilities.
 * Adapted for Next.js native File objects from FormData (instead of multer).
 */
export async function identifyProduct(imageUrls: string[]): Promise<DetectedItem> {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY is not configured. Please add it to your Vercel Environment variables.');
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Download images from Supabase Storage and covert HEIC to JPEG if necessary
    const processedFiles = await Promise.all(
        imageUrls.map(async (url) => {
            const ext = url.split('?')[0].split('.').pop()?.toLowerCase();
            const isHeic = ext === 'heic' || ext === 'heif';

            const res = await fetch(url);
            if (!res.ok) throw new Error(`[Vision] Failed to pull image from storage: ${url}`);

            const arrayBuffer = await res.arrayBuffer();
            let buffer = Buffer.from(arrayBuffer);
            let mimeType = res.headers.get('content-type') || 'image/jpeg';

            if (isHeic) {
                console.log(`[Vision] Converting HEIC URL: ${url}`);
                const jpegBuffer = await convert({
                    buffer: buffer,
                    format: 'JPEG',
                    quality: 0.9,
                });
                buffer = Buffer.from(jpegBuffer);
                mimeType = 'image/jpeg';
            }

            return {
                buffer,
                mimeType,
            };
        })
    );

    // Prep base64 data for Gemini
    const imageParts = processedFiles.map(file => ({
        inlineData: {
            data: file.buffer.toString('base64'),
            mimeType: file.mimeType,
        },
    }));

    // Google Lens Context Shield
    let lensContext = "";
    if (process.env.SERPAPI_API_KEY && imageUrls.length > 0) {
        try {
            console.log("[Vision/Lens] Executing Visual Matching indexing tunnel...");
            const targetUrl = imageUrls[0];
            const lensApiUrl = `https://serpapi.com/search.json?engine=google_lens&url=${encodeURIComponent(targetUrl)}&api_key=${process.env.SERPAPI_API_KEY}`;
            const lensRes = await fetch(lensApiUrl);
            
            if (lensRes.ok) {
                const lensData = await lensRes.json();
                if (lensData.visual_matches && lensData.visual_matches.length > 0) {
                    const topMatches = lensData.visual_matches
                        .slice(0, 5) // Take top 5 definitive matches
                        .map((m: any) => m.title)
                        .filter(Boolean);
                        
                    if (topMatches.length > 0) {
                        lensContext = `\n\nCRITICAL CONTEXT: A Google Lens reverse-image search executed on this exact photo yielded these 100% exact web matches: [ ${topMatches.join(' | ')} ]. Use these hardcoded web-grounding clues to definitively compute the EXACT Brand and Manufacturer Model Name, rather than guessing based strictly on visuals.`;
                        console.log("[Vision/Lens] Successfully bridged Web Grounding Context:", topMatches);
                    }
                }
            } else {
                console.warn("[Vision/Lens] SerpAPI rejected request. Check limits/keys.");
            }
        } catch (lensErr) {
            console.warn("[Vision/Lens] Non-fatal Google Lens API bypass:", lensErr);
        }
    } else {
        console.log("[Vision/Lens] SERPAPI_API_KEY not found or no URL available. Operating heuristically.");
    }

    const prompt = `You are a product identification expert specializing in secondhand and vintage items commonly sold on eBay.

Analyze the provided product photo(s) and identify:
1. The structured SEO attributes (brand, model_or_style, item_type, gender_department, size, color, material, key_features). You may logically infer 'gender_department' from the item's visual cut/style. However, you MUST return \`null\` for 'size' or 'material' if physical tags are not explicitly visible to prevent hallucination.
2. The product category (e.g., "Men's Jackets", "Women's Shoes", "Vintage Electronics")
3. A highly accurate, human-readable 2-4 word "compingQuery" that explicitly follows this Semantic Market Formula: [Brand] + [Consumer Collection/Line] + [Core Silhouette/Type]. You MUST explicitly BAN alphanumeric factory/clothing tag codes (e.g., "TM110", "RN8921"), obscure material fractions, and descriptive adjectives. (Exception: For Electronics/Hardgoods ONLY, you may include exact Model Numbers if that is how a standard consumer would search).${lensContext}

Respond ONLY in this exact JSON format, with no additional text:
{
  "category": "Category Name",
  "compingQuery": "Brand Exact-Model Gender/Size",
  "structuredAttributes": {
     "brand": "string | null",
     "model_or_style": "string | null",
     "item_type": "string | null (e.g., Shirt, Jacket, Sneakers)",
     "gender_department": "string | null",
     "size": "string | null",
     "color": "string | null (1-2 primary colors or style like 'Multicolor'. NO commas)",
     "material": "string | null",
     "key_features": ["array", "of", "strings"]
  }
}

Be as specific as possible. Include brand names, model numbers, and distinguishing features visible in the photos.`;

    let result;
    try {
        result = await model.generateContent([prompt, ...imageParts]);
    } catch (geminiError: any) {
        console.error('[Vision Error]', geminiError);
        throw new Error(`Google Gemini Error: ${geminiError.message || 'Unknown API Error'}`);
    }
    const responseText = result.response.text().trim();

    // Parse JSON from response (handle markdown code blocks)
    let parsed;
    try {
        const jsonStr = responseText.replace(/\`\`\`json\n?/g, '').replace(/\`\`\`\n?/g, '').trim();
        parsed = JSON.parse(jsonStr);
    } catch (parseErr) {
        console.error('[Vision] Failed to parse response:', responseText);
        throw new Error('Image recognition failed. Please try again or enter a manual search query.');
    }

    // Fallback UI generation logic (synthesizes productName/keywords from structured attributes)
    const attr = parsed.structuredAttributes || {};
    const featuresStr = Array.isArray(attr.key_features) ? attr.key_features.join(' ') : '';
    const generatedProductName = [attr.brand, attr.model_or_style, attr.item_type, attr.gender_department, attr.size, attr.color, attr.material, featuresStr]
        .filter(Boolean).join(' ');

    return {
        productName: generatedProductName || 'Unknown Item',
        category: parsed.category || null,
        compingQuery: parsed.compingQuery || generatedProductName || 'Unknown Item',
        keywords: generatedProductName || 'Unknown Item',
        structuredAttributes: attr,
    };
}
