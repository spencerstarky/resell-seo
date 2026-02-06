import { SupabaseClient } from '@supabase/supabase-js';

// --- Interfaces ---

export type AttributeType = 'aesthetic' | 'use_case' | 'material' | 'detail' | 'garment_type';

export type PriorityRole = 'lead_descriptor' | 'ordering_bias' | 'protect_from_trimming' | 'include_if_space' | 'fallback_descriptor' | 'avoid_signal';

export interface CompatibleAttribute {
    value: string;
    type: AttributeType;
    weight: number;
    priorityRole: PriorityRole;
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

        // Process Attributes by Role
        const leadDescriptors = attributes.filter((a: any) => a.priority_role === 'lead_descriptor').map((a: any) => a.attribute_value);
        const protectedAttrs = attributes.filter((a: any) => a.priority_role === 'protect_from_trimming').map((a: any) => a.attribute_value);
        const includeIfSpace = attributes.filter((a: any) => a.priority_role === 'include_if_space' || a.priority_role === 'ordering_bias').map((a: any) => a.attribute_value);
        const avoidList = attributes.filter((a: any) => a.priority_role === 'avoid_signal').map((a: any) => a.attribute_value);

        const displayName = style.display_name || style.name;

        // Build the Prompt Block - Priority Driven
        return `
STYLE CONSTRUCTION DIRECTIVE (DETECTED ARCHETYPE: ${displayName.toUpperCase()})
Detected Archetype: ${displayName}

Behavior Rules:
- Protect functional attributes from trimming
- Prefer use-case descriptors before aesthetics
- Allocate character space toward durability and function
- Trim aesthetic/trend descriptors first

Lead Descriptors (Prioritize Early):
- ${leadDescriptors.length > 0 ? leadDescriptors.join(', ') : '(None defined)'}

Protected Attributes (Do NOT Trim):
- ${protectedAttrs.length > 0 ? protectedAttrs.join(', ') : '(None defined)'}

Include If Space (Fillers):
- ${includeIfSpace.length > 0 ? includeIfSpace.join(', ') : '(None defined)'}

Avoid (Incompatible):
- ${avoidList.length > 0 ? avoidList.join(', ') : '(None defined)'}
`;
    }
}
