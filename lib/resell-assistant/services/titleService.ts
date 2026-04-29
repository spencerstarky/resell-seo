import { Listing } from './analysisService';
import { DetectedItem } from './visionService';

/**
 * Title generation engine.
 * Deterministically assembles a maximum 80-character SEO title based strictly on verified AI attributes.
 */

const MAX_TITLE_LENGTH = 80;

/**
 * Generate an optimized eBay listing title using strict Bin-Packing.
 * @param listings - Comparable listings (No longer used for word-soup, kept for API signature)
 * @param detectedItem - The identified product info
 * @returns Optimized title clamped at 80 characters
 */
export function generateTitle(listings: Listing[], detectedItem: DetectedItem): string {
    const attr = detectedItem.structuredAttributes;
    
    // Fallback if AI structural output fails
    if (!attr || Object.keys(attr).length === 0) {
        return detectedItem.productName ? detectedItem.productName.substring(0, MAX_TITLE_LENGTH) : 'Unknown Item';
    }

    // eBay SEO Documentation Priority Hierarchy
    const orderedAttributes: string[] = [
        attr.brand,
        attr.model_or_style,
        attr.item_type,
        attr.gender_department,
        attr.size,
        attr.color,
        attr.material,
        ...(Array.isArray(attr.key_features) ? attr.key_features : [])
    ].filter((val): val is string => Boolean(val));

    const titleWords: string[] = [];
    let currentLength = 0;

    for (const rawAttr of orderedAttributes) {
        // Break up features like "Short Sleeve" into single tokens to pack tighter
        const words = rawAttr.trim().split(/\s+/);
        
        for (const word of words) {
            const formattedWord = toTitleCase(word);
            
            // Add +1 for the space (unless it's the very first word)
            const addedLength = titleWords.length === 0 ? formattedWord.length : formattedWord.length + 1;
            
            if (currentLength + addedLength <= MAX_TITLE_LENGTH) {
                titleWords.push(formattedWord);
                currentLength += addedLength;
            }
            // If the next word busts the 80 char limit, it is seamlessly discarded.
        }
    }

    return titleWords.join(' ');
}

/**
 * Convert a word to Title Case, preserving strict capitalized abbreviations and internal punctuation.
 */
function toTitleCase(str: string): string {
    if (!str) return '';
    const upperStr = str.toUpperCase();
    
    // Reserve specific uppercase codes common in fashion/hardgoods
    if (['XL', 'XXL', 'S', 'M', 'L', 'US', 'UK', 'EU', 'NWT', 'NWOT', 'Y2K', 'AOP'].includes(upperStr)) {
        return upperStr;
    }
    
    // Handle hyphenated words (e.g., "Short-Sleeve")
    if (str.includes('-')) {
        return str.split('-').map(toTitleCase).join('-');
    }
    
    // Handle dotted words (e.g., "J.Crew")
    if (str.includes('.')) {
        return str.split('.').map(toTitleCase).join('.');
    }
    
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
