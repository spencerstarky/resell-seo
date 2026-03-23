import { GoogleGenerativeAI } from '@google/generative-ai';
// @ts-ignore - heic-convert lacks TypeScript definitions
import convert from 'heic-convert';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export interface DetectedItem {
    productName: string;
    category: string | null;
    keywords: string;
}

/**
 * Analyze product images using Gemini's multimodal capabilities.
 * Adapted for Next.js native File objects from FormData (instead of multer).
 */
export async function identifyProduct(imageUrls: string[]): Promise<DetectedItem> {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY is not configured. Please add it to your .env file.');
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

    // Prepare image parts for the multimodal request
    const imageParts = processedFiles.map(file => ({
        inlineData: {
            data: file.buffer.toString('base64'),
            mimeType: file.mimeType,
        },
    }));

    const prompt = `You are a product identification expert specializing in secondhand and vintage items commonly sold on eBay.

Analyze the provided product photo(s) and identify:
1. The specific product name (include brand, model, style, and key features)
2. The product category (e.g., "Men's Jackets", "Women's Shoes", "Vintage Electronics")
3. A keyword string optimized for eBay search (include brand, item type, key attributes like color, size indicators, material, era/vintage if applicable)

Respond ONLY in this exact JSON format, with no additional text:
{
  "productName": "Brand Model/Style Description",
  "category": "Category Name",
  "keywords": "brand model style color material key-features"
}

Examples:
- A Carhartt jacket photo → {"productName": "Carhartt Detroit Jacket Blanket Lined", "category": "Men's Jackets & Coats", "keywords": "Carhartt Detroit Jacket Blanket Lined Workwear"}
- A pair of Nike shoes → {"productName": "Nike Air Max 90 Essential", "category": "Men's Athletic Shoes", "keywords": "Nike Air Max 90 Essential Running Shoes"}

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

    return {
        productName: parsed.productName || 'Unknown Item',
        category: parsed.category || null,
        keywords: parsed.keywords || parsed.productName || 'Unknown Item',
    };
}
