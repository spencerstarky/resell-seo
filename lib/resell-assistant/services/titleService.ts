import { Listing } from './analysisService';
import { DetectedItem } from './visionService';

/**
 * Title generation engine.
 * Analyzes listing titles to extract top keywords and construct an optimized title.
 */

// Common stop words to filter out
const STOP_WORDS = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'is', 'it', 'as', 'was', 'are', 'be',
    'this', 'that', 'these', 'those', 'has', 'have', 'had', 'not', 'no',
    'new', 'free', 'shipping', 'fast', 'nwt', 'nwob', 'lot', 'set',
    '-', '–', '—', '/', '|', '&', '+', '!', '*',
]);

// Max title length per eBay rules
const MAX_TITLE_LENGTH = 80;

/**
 * Generate an optimized eBay listing title.
 * @param listings - Comparable listings to analyze
 * @param detectedItem - The identified product info
 * @returns Optimized title
 */
export function generateTitle(listings: Listing[], detectedItem: DetectedItem): string {
    // Collect all listing titles
    const titles = listings.map(l => l.title).filter((t): t is string => Boolean(t));

    if (titles.length === 0) {
        // Fallback: use detected item keywords as title
        return toTitleCase(detectedItem.keywords || detectedItem.productName || 'Unknown Item');
    }

    // Tokenize and count keyword frequency
    const keywordCounts = new Map<string, number>();

    for (const title of titles) {
        const tokens = tokenize(title);
        const seen = new Set<string>(); // avoid counting duplicates within same title

        for (const token of tokens) {
            if (seen.has(token)) continue;
            seen.add(token);
            keywordCounts.set(token, (keywordCounts.get(token) || 0) + 1);
        }
    }

    // Sort keywords by frequency (descending)
    const rankedKeywords = [...keywordCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([word]) => word);

    // Build the title, ensuring no duplicates and staying within 80 chars
    const usedWords = new Set<string>();
    const titleWords: string[] = [];

    // First, include the detected product name words (they're most relevant)
    const productWords = tokenize(detectedItem.productName || '');
    for (const word of productWords) {
        const normalized = word.toLowerCase();
        if (!usedWords.has(normalized)) {
            usedWords.add(normalized);
            titleWords.push(toTitleCase(word));
        }
    }

    // Then add ranked keywords from comps
    for (const word of rankedKeywords) {
        const normalized = word.toLowerCase();
        if (usedWords.has(normalized)) continue;

        const candidate = [...titleWords, toTitleCase(word)].join(' ');
        if (candidate.length > MAX_TITLE_LENGTH) break;

        usedWords.add(normalized);
        titleWords.push(toTitleCase(word));
    }

    return titleWords.join(' ');
}

/**
 * Tokenize a title string into meaningful keywords.
 */
function tokenize(text: string): string[] {
    return text
        .replace(/[^\w\s'-]/g, ' ')  // Remove special chars except apostrophes and hyphens
        .split(/\s+/)
        .map(w => w.trim())
        .filter(w => w.length > 1 && !STOP_WORDS.has(w.toLowerCase()));
}

/**
 * Convert a word to Title Case.
 */
function toTitleCase(str: string): string {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
