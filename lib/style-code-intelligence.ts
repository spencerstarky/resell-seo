import { SupabaseClient } from '@supabase/supabase-js';

// --- Interfaces ---

export interface Brand {
    id: string;
    name: string;
    normalized_name: string;
    confidence_tier: number;
}

export interface StyleCodePattern {
    id: string;
    brand_id: string;
    regex_pattern: string;
    min_length: number;
    max_length: number;
    allowed_charset: string; // Description only, logic mostly in regex
    requires_context: boolean;
    disallowed_context: string[]; // e.g. ["RN", "CA"]
    confidence_weight: number;
}

export interface ExtractionCandidate {
    value: string;
    source: 'title' | 'description' | 'specifics' | 'ocr';
    index?: number;
    contextBefore?: string;
    contextAfter?: string;
}

export interface ValidationResult {
    isValid: boolean;
    confidenceScore: number;
    matchedPatternId?: string;
    brandId?: string; // ID of the brand if found in DB
    rejectionReason?: string;
    candidate: string;
}

// --- Constants ---

const DISALLOWED_KEYWORDS = ['RN', 'CA', 'LOT', 'SKU', 'UPC', 'PO', 'INTERNAL', 'SERIAL', '#'];
const STYLE_KEYWORDS = ['STYLE', 'MODEL', 'MPN'];

// --- Engine Class ---

export class StyleCodeEngine {
    private supabase: SupabaseClient;

    constructor(supabaseClient: SupabaseClient) {
        this.supabase = supabaseClient;
    }

    /**
     * Main entry point: Validates a simple string candidate against a brand.
     */
    async validateCandidate(
        candidate: string,
        brandName: string,
        contextText: string = '' // The full text where candidate was found, for context checks
    ): Promise<ValidationResult> {
        // 1. Normalize
        const cleanCandidate = candidate.trim().replace(/[^a-zA-Z0-9]/g, ''); // Strip punctuation

        // 2. Fetch Potential Brands (Handle Duplicates)
        // We fetch ALL brands that match the name, in case multiple entries exist (one with rules, one without).
        const { data: brands, error: brandError } = await this.supabase
            .from('brands')
            .select('id, name, confidence_tier')
            .eq('normalized_name', brandName.toLowerCase().trim());

        if (brandError || !brands || brands.length === 0) {
            return { isValid: false, confidenceScore: 0, candidate: cleanCandidate, rejectionReason: 'Brand not found or untrusted' };
        }

        // 3. Iterate through all matching brand entries to find one with matching patterns
        // This solves the issue where "Nike" (empty) blocks "Nike" (with rules).
        let bestMatch: ValidationResult | null = null;
        let checkedPatternsCount = 0;

        for (const brand of brands) {
            if (brand.confidence_tier === 3) continue; // Skip untrusted

            // Fetch patterns for this specific brand instance
            const { data: patterns } = await this.supabase
                .from('style_code_patterns')
                .select('*')
                .eq('brand_id', brand.id)
                .eq('is_active', true);

            if (!patterns || patterns.length === 0) continue;
            checkedPatternsCount += patterns.length;

            for (const pattern of patterns) {
                // A. Length Check
                if (cleanCandidate.length < pattern.min_length || cleanCandidate.length > pattern.max_length) {
                    continue;
                }

                // B. Regex Check
                try {
                    const regex = new RegExp(pattern.regex_pattern, 'i');
                    if (!regex.test(cleanCandidate)) {
                        continue;
                    }
                } catch (e) {
                    console.error(`Invalid regex for brand ${brand.name}:`, pattern.regex_pattern);
                    continue;
                }

                // C. Contextual Filtering (Hard Rejection)
                if (this.isNearDisallowedContext(cleanCandidate, contextText, pattern.disallowed_context)) {
                    return { isValid: false, confidenceScore: -1, candidate: cleanCandidate, rejectionReason: 'Found near disallowed context (RN/CA/etc)' };
                }

                // D. Scoring
                let score = 0.5; // Base for pattern match
                if (contextText.toLowerCase().includes('style') || contextText.toLowerCase().includes('model')) {
                    score += 0.2;
                }

                // Weight from pattern
                score *= pattern.confidence_weight;

                if (!bestMatch || score > bestMatch.confidenceScore) {
                    bestMatch = {
                        isValid: score >= 0.8, // Threshold per PRD
                        confidenceScore: score,
                        matchedPatternId: pattern.id,
                        candidate: cleanCandidate,
                        brandId: brand.id
                    };
                }
            }

            if (!bestMatch) {
                // Fallback if no match found across all brands
                return { isValid: false, confidenceScore: 0, candidate: cleanCandidate, rejectionReason: 'No matching pattern found', brandId: brands[0]?.id };
            }

            return bestMatch;
        }

    /**
     * Checks if the candidate appears near forbidden words (RN, CA, etc.)
     */
    private isNearDisallowedContext(candidate: string, fullText: string, customDisallowed: string[] = []): boolean {
        if (!fullText) return false;

        const mergedDisallowed = [...new Set([...DISALLOWED_KEYWORDS, ...customDisallowed])];
        const lowerText = fullText.toLowerCase();
        const lowerCandidate = candidate.toLowerCase();
        const index = lowerText.indexOf(lowerCandidate);

        if (index === -1) return false;

        // Check 20 chars before
        const start = Math.max(0, index - 20);
        const contextChunk = lowerText.slice(start, index);

        return mergedDisallowed.some(badWord => {
            // exact word match in the chunk
            const regex = new RegExp(`\\b${badWord.toLowerCase()}\\b`);
            return regex.test(contextChunk);
        });
    }

    /**
     * Extracts potential candidates from raw text using heuristics before validation.
     * This is a "dumb" scanner to feed into the validator.
     */
    extractCandidatesFromText(text: string): string[] {
        if (!text) return [];
        // Extract all "potential" tokens:
        // - Alphanumeric
        // - At least 3 chars
        // - No more than 15 chars (safety)
        // - Mixed numbers/letters often good, or specific rigid formats

        // Simple tokenizer
        const tokens = text.split(/[\s,.\-\/()]+/);
        return tokens.filter(t => {
            const clean = t.trim();
            if (clean.length < 3 || clean.length > 20) return false;
            if (!/[a-zA-Z0-9]/.test(clean)) return false; // Must have alphanum
            return true;
        });
    }

    /**
     * Determinisitcally injects code into title according to PRD rules.
     */
    injectIntoTitle(currentTitle: string, styleCode: string): string {
        // Canonical Structure: Brand + ... + Style Code + ...
        // "Style code appears: After measurements, At the end of the core title, Before optional trailing keywords"

        // For simplicity in this function, we assume "currentTitle" is the "Core Title" or "Full Title".
        // If it's the full title, we append to end, but check for dupes.

        const cleanCode = styleCode.trim();
        if (currentTitle.includes(cleanCode)) return currentTitle; // Already present

        // Logic: Append to end. The "mid-title vs end" logic is often handled by the general optimizer structure,
        // but here we just ensure it's present.

        // Check 80 char limit
        const projected = `${currentTitle} ${cleanCode}`;
        if (projected.length <= 80) return projected;

        // Truncation required
        // "Drop style code only if core identifiers would be truncated" -> This implies Style Code is high priority? 
        // PRD: "Preserve style code if possible ... Remove optional keywords first"

        // Since we don't know which parts are "optional keywords" here easily without parsing,
        // we might just return the title + code truncated, OR fail to inject.
        // PRD says: "If character limit exceeded: Remove optional keywords first"

        // MVP approach: Just append and hard truncate? No, that cuts words.
        // Better: Return null or throw if it doesn't fit, so the caller (Optimizer) can decide what to cut.
        // OR: We return the projected string and let the optimizer's truncate function handle it.

        return projected; // Let the caller handle strict 80 char truncation if needed, or we implement smart truncation here.
    }
}
