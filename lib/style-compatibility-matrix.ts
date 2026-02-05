import { SupabaseClient } from '@supabase/supabase-js';

// --- Interfaces ---

export type AttributeType = 'aesthetic' | 'use_case' | 'material' | 'detail' | 'garment_type';

export interface CompatibleAttribute {
    value: string;
    type: AttributeType;
    weight: number;
}

export interface StyleNode {
    id: string;
    name: string; // The primary style key (e.g., "Utility", "Preppy")
    display_name?: string;
    fingerprints: string[]; // derived from style_signals w/ type='text'
    attributes?: CompatibleAttribute[]; // derived from style_compatibility_attributes
    incompatibleStyles?: string[]; // Not currently in DB, using placeholder or could add column later
}

// --- Engine Logic ---

export class StyleCompatibilityEngine {
    private supabase: SupabaseClient;

    constructor(supabase: SupabaseClient) {
        this.supabase = supabase;
    }

    /**
     * Phase 1: Simple keyword matching to find the "Primary Style"
     * Fetches styles and signals from DB.
     */
    async detectPrimaryStyle(inputString: string): Promise<StyleNode | null> {
        const lowerInput = inputString.toLowerCase();

        // 1. Fetch styles and their detection signals
        const { data: styles, error } = await this.supabase
            .from('style_taxonomy')
            .select(`
                id,
                style_name,
                display_name,
                style_signals (
                    signal_value,
                    signal_type,
                    weight
                )
            `);

        if (error || !styles) {
            console.error('StyleMatrix: Failed to fetch styles', error);
            return null;
        }

        let bestMatch: StyleNode | null = null;
        let maxScore = 0;

        // 2. Score each style
        for (const styleData of styles) {
            let score = 0;
            const signals = styleData.style_signals || [];

            // Only care about text signals for now, or maybe visual if we had vision data
            const keywords = signals
                .filter((s: any) => s.signal_type === 'text')
                .map((s: any) => ({ val: s.signal_value.toLowerCase(), w: s.weight }));

            // Heuristic: If style_name itself is in input, big boost
            if (lowerInput.includes(styleData.style_name.replace(/_/g, ' '))) {
                score += 2.0;
            }

            for (const kw of keywords) {
                if (lowerInput.includes(kw.val)) {
                    score += (kw.w || 0.5);
                }
            }

            if (score > maxScore && score > 0.5) { // Min threshold
                maxScore = score;
                bestMatch = {
                    id: styleData.id,
                    name: styleData.style_name,
                    display_name: styleData.display_name,
                    fingerprints: keywords.map((k: any) => k.val),
                    incompatibleStyles: [] // Todo from DB if needed
                };
            }
        }

        return bestMatch;
    }

    /**
     * Generates a context block to be injected into the Unified Prompt.
     */
    async generatePromptContext(originalTitle: string, itemSpecifics: string): Promise<string> {
        const combinedInput = `${originalTitle} ${itemSpecifics}`;
        const style = await this.detectPrimaryStyle(combinedInput);

        if (!style) {
            // console.log("Style Matrix: No primary style detected.");
            return "";
        }

        // Fetch Output Attributes for this style
        const { data: attributes } = await this.supabase
            .from('style_compatibility_attributes')
            .select('*')
            .eq('style_id', style.id)
            .order('weight', { ascending: false });

        if (!attributes || attributes.length === 0) {
            return "";
        }

        // Format attributes
        const aesthetics = attributes.filter((a: any) => a.attribute_type === 'aesthetic').map((a: any) => a.attribute_value).join(', ');
        const useCases = attributes.filter((a: any) => a.attribute_type === 'use_case').map((a: any) => a.attribute_value).join(', ');
        const materials = attributes.filter((a: any) => ['material', 'detail', 'garment_type'].includes(a.attribute_type)).map((a: any) => a.attribute_value).join(', ');

        const displayName = style.display_name || style.name;

        // Build the Prompt Block
        return `
STYLE COMPATIBILITY MATRIX (DETECTED ARCHETYPE: ${displayName.toUpperCase()})
- This item matches the "${displayName}" style archetype.
- When enriching the title, PRIOIRITIZE these compatible attributes (if true):
  - Aesthetics: ${aesthetics}
  - Use Cases: ${useCases}
  - Materials/Details: ${materials}
- Rule: Do not force these if clearly contradicted by images, but prefer them over generic synonyms.
`;
    }
}
