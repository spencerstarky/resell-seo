import { SupabaseClient } from '@supabase/supabase-js';

// --- Interfaces ---

export type AttributeType = 'aesthetic' | 'use_case' | 'material' | 'detail' | 'garment_type';

export interface CompatibleAttribute {
    value: string;
    type: AttributeType;
    weight: number; // 0.0 to 1.0, determines priority
}

export interface StyleNode {
    id: string;
    name: string; // The primary style key (e.g., "Utility", "Preppy")
    fingerprints: string[]; // Keywords that trigger this node detection
    attributes: CompatibleAttribute[];
    incompatibleStyles: string[]; // IDs of incompatible styles
}

export interface MatrixScoringMock {
    input: string;
    matchedStyle: string | null;
    suggestions: string[];
}

// --- Data: Initial 20 Style Nodes ---

export const STYLE_NODES: StyleNode[] = [
    {
        id: 'utility',
        name: 'Utility',
        fingerprints: ['utility', 'cargo', 'field', 'safari', 'tactical'],
        attributes: [
            { value: 'Safari', type: 'aesthetic', weight: 0.95 },
            { value: 'Travel', type: 'use_case', weight: 0.90 },
            { value: 'Workwear', type: 'aesthetic', weight: 0.85 },
            { value: 'Outdoor', type: 'use_case', weight: 0.85 },
            { value: 'Nylon', type: 'material', weight: 0.80 },
            { value: 'Lipstop', type: 'material', weight: 0.80 },
            { value: 'Canvas', type: 'material', weight: 0.75 },
            { value: 'Multi-Pocket', type: 'detail', weight: 0.90 },
            { value: 'Fishing', type: 'use_case', weight: 0.70 },
            { value: 'Hiking', type: 'use_case', weight: 0.65 },
        ],
        incompatibleStyles: ['evening', 'boho', 'cottagecore']
    },
    {
        id: 'gorpcore',
        name: 'Gorpcore',
        fingerprints: ['gorpcore', 'technical', 'hiking', 'shell', 'fleece'],
        attributes: [
            { value: 'Technical', type: 'aesthetic', weight: 0.95 },
            { value: 'Outdoor', type: 'use_case', weight: 0.90 },
            { value: 'Waterproof', type: 'detail', weight: 0.85 },
            { value: 'Gore-Tex', type: 'material', weight: 0.95 },
            { value: 'Trekking', type: 'use_case', weight: 0.80 },
            { value: 'Camping', type: 'use_case', weight: 0.75 },
            { value: 'Windbreaker', type: 'garment_type', weight: 0.85 },
            { value: 'Fleece', type: 'material', weight: 0.80 },
        ],
        incompatibleStyles: ['formal', 'preppy', 'glam']
    },
    {
        id: 'preppy',
        name: 'Preppy',
        fingerprints: ['preppy', 'polo', 'rugby', 'ivy', 'collegiate'],
        attributes: [
            { value: 'Ivy League', type: 'aesthetic', weight: 0.90 },
            { value: 'Collegiate', type: 'aesthetic', weight: 0.88 },
            { value: 'Heritage', type: 'aesthetic', weight: 0.85 },
            { value: 'Classic', type: 'aesthetic', weight: 0.80 },
            { value: 'Nautical', type: 'aesthetic', weight: 0.75 },
            { value: 'Country Club', type: 'use_case', weight: 0.70 },
            { value: 'Golf', type: 'use_case', weight: 0.70 },
            { value: 'Cotton', type: 'material', weight: 0.60 },
            { value: 'Wool', type: 'material', weight: 0.65 },
        ],
        incompatibleStyles: ['gorpcore', 'grunge', 'streetwear', 'y2k']
    },
    {
        id: 'y2k',
        name: 'Y2K',
        fingerprints: ['y2k', '2000s', '00s', 'millennium', 'rhinestone'],
        attributes: [
            { value: 'Retro', type: 'aesthetic', weight: 0.85 },
            { value: '2000s', type: 'aesthetic', weight: 0.95 },
            { value: 'Cyber', type: 'aesthetic', weight: 0.80 },
            { value: 'McBling', type: 'aesthetic', weight: 0.85 },
            { value: 'Low Rise', type: 'detail', weight: 0.90 },
            { value: 'Baby Tee', type: 'garment_type', weight: 0.85 },
            { value: 'Bedazzled', type: 'detail', weight: 0.80 },
            { value: 'Rhinestone', type: 'detail', weight: 0.80 },
            { value: 'Denim', type: 'material', weight: 0.70 },
        ],
        incompatibleStyles: ['minimalist', 'dark_academia', 'workwear']
    },
    {
        id: 'minimalist',
        name: 'Minimalist',
        fingerprints: ['minimalist', 'simple', 'clean', 'scandi', 'neutral'],
        attributes: [
            { value: 'Modern', type: 'aesthetic', weight: 0.85 },
            { value: 'Clean', type: 'aesthetic', weight: 0.90 },
            { value: 'Scandinavian', type: 'aesthetic', weight: 0.85 },
            { value: 'Neutral', type: 'aesthetic', weight: 0.80 },
            { value: 'Capsule Wardrobe', type: 'use_case', weight: 0.75 },
            { value: 'Boxy', type: 'detail', weight: 0.70 },
            { value: 'Oversized', type: 'detail', weight: 0.65 },
            { value: 'Linen', type: 'material', weight: 0.80 },
        ],
        incompatibleStyles: ['y2k', 'boho', 'western', 'maximalist']
    },
    {
        id: 'workwear',
        name: 'Workwear',
        fingerprints: ['workwear', 'carpenter', 'double knee', 'chore', 'union'],
        attributes: [
            { value: 'Rugged', type: 'aesthetic', weight: 0.90 },
            { value: 'Durable', type: 'aesthetic', weight: 0.80 },
            { value: 'Carpenter', type: 'detail', weight: 0.95 },
            { value: 'Double Knee', type: 'detail', weight: 0.95 },
            { value: 'Canvas', type: 'material', weight: 0.85 },
            { value: 'Denim', type: 'material', weight: 0.80 },
            { value: 'Heavyweight', type: 'detail', weight: 0.75 },
            { value: 'Chore', type: 'garment_type', weight: 0.85 },
        ],
        incompatibleStyles: ['evening', 'boho', 'y2k', 'glam']
    },
    {
        id: 'western',
        name: 'Western',
        fingerprints: ['western', 'cowboy', 'ranch', 'rodeo', 'pearl snap'],
        attributes: [
            { value: 'Cowboy', type: 'aesthetic', weight: 0.95 },
            { value: 'Ranch', type: 'use_case', weight: 0.85 },
            { value: 'Rodeo', type: 'use_case', weight: 0.90 },
            { value: 'Pearl Snap', type: 'detail', weight: 0.95 },
            { value: 'Yoke', type: 'detail', weight: 0.80 },
            { value: 'Southwestern', type: 'aesthetic', weight: 0.85 },
            { value: 'Denim', type: 'material', weight: 0.80 },
            { value: 'Leather', type: 'material', weight: 0.75 },
            { value: 'Aztec', type: 'detail', weight: 0.75 },
        ],
        incompatibleStyles: ['minimalist', 'techwear', 'sport']
    },
    {
        id: 'streetwear',
        name: 'Streetwear',
        fingerprints: ['streetwear', 'hype', 'urban', 'skate', 'grail'],
        attributes: [
            { value: 'Urban', type: 'aesthetic', weight: 0.85 },
            { value: 'Hypebeast', type: 'aesthetic', weight: 0.80 },
            { value: 'Graphic', type: 'detail', weight: 0.85 },
            { value: 'Oversized', type: 'detail', weight: 0.90 },
            { value: 'Logo', type: 'detail', weight: 0.85 },
            { value: 'Hoodie', type: 'garment_type', weight: 0.80 },
            { value: 'Sneakerhead', type: 'use_case', weight: 0.70 },
        ],
        incompatibleStyles: ['boho', 'western', 'cottagecore', 'formal']
    },
    {
        id: 'boho',
        name: 'Boho',
        fingerprints: ['boho', 'bohemian', 'festival', 'peasant', 'hippie'],
        attributes: [
            { value: 'Bohemian', type: 'aesthetic', weight: 0.95 },
            { value: 'Festival', type: 'use_case', weight: 0.90 },
            { value: 'Romance', type: 'aesthetic', weight: 0.75 },
            { value: 'Peasant', type: 'garment_type', weight: 0.85 },
            { value: 'Floral', type: 'detail', weight: 0.80 },
            { value: 'Embroidered', type: 'detail', weight: 0.85 },
            { value: 'Crochet', type: 'detail', weight: 0.85 },
            { value: 'Flowy', type: 'detail', weight: 0.80 },
        ],
        incompatibleStyles: ['minimalist', 'techwear', 'workwear', 'preppy']
    },
    {
        id: 'cottagecore',
        name: 'Cottagecore',
        fingerprints: ['cottagecore', 'prairie', 'farm', 'romantic', 'nap dress'],
        attributes: [
            { value: 'Prairie', type: 'aesthetic', weight: 0.90 },
            { value: 'Romantic', type: 'aesthetic', weight: 0.85 },
            { value: 'Feminine', type: 'aesthetic', weight: 0.80 },
            { value: 'Floral', type: 'detail', weight: 0.85 },
            { value: 'Puff Sleeve', type: 'detail', weight: 0.90 },
            { value: 'Linen', type: 'material', weight: 0.80 },
            { value: 'Gingham', type: 'detail', weight: 0.85 },
        ],
        incompatibleStyles: ['streetwear', 'gorpcore', 'biker', 'techwear']
    },
    {
        id: 'dark_academia',
        name: 'Dark Academia',
        fingerprints: ['dark academia', 'professor', 'tweed', 'library', 'scholarly'],
        attributes: [
            { value: 'Scholarly', type: 'aesthetic', weight: 0.85 },
            { value: 'Moody', type: 'aesthetic', weight: 0.80 },
            { value: 'Vintage', type: 'aesthetic', weight: 0.75 },
            { value: 'Tweed', type: 'material', weight: 0.95 },
            { value: 'Wool', type: 'material', weight: 0.90 },
            { value: 'Plaid', type: 'detail', weight: 0.85 },
            { value: 'Blazer', type: 'garment_type', weight: 0.90 },
        ],
        incompatibleStyles: ['y2k', 'surf', 'neon', 'sport']
    },
    {
        id: 'athleisure',
        name: 'Athleisure',
        fingerprints: ['athleisure', 'gym', 'yoga', 'training', 'activewear'],
        attributes: [
            { value: 'Sport', type: 'use_case', weight: 0.90 },
            { value: 'Gym', type: 'use_case', weight: 0.95 },
            { value: 'Yoga', type: 'use_case', weight: 0.95 },
            { value: 'Running', type: 'use_case', weight: 0.90 },
            { value: 'Performance', type: 'aesthetic', weight: 0.80 },
            { value: 'Stretch', type: 'detail', weight: 0.85 },
            { value: 'Moisture Wicking', type: 'detail', weight: 0.90 },
            { value: 'Leggings', type: 'garment_type', weight: 0.95 },
        ],
        incompatibleStyles: ['formal', 'western', 'dark_academia']
    },
    {
        id: 'vintage',
        name: 'Vintage',
        fingerprints: ['vintage', 'retro', 'VtG', '90s', '80s'],
        attributes: [
            { value: 'Retro', type: 'aesthetic', weight: 0.95 },
            { value: 'Classic', type: 'aesthetic', weight: 0.75 },
            { value: 'Single Stitch', type: 'detail', weight: 0.90 }, // T-shirt specific often, but strong signal
            { value: 'Made in USA', type: 'detail', weight: 0.85 },
            { value: 'Faded', type: 'detail', weight: 0.80 },
            { value: 'Distressed', type: 'detail', weight: 0.80 },
        ],
        incompatibleStyles: [] // Vintage can overlap with almost anything
    },
    {
        id: 'grunge',
        name: 'Grunge',
        fingerprints: ['grunge', 'distressed', 'nirvana', 'flannel', 'ripped'],
        attributes: [
            { value: 'Distressed', type: 'aesthetic', weight: 0.95 },
            { value: 'Ripped', type: 'detail', weight: 0.90 },
            { value: 'Flannel', type: 'material', weight: 0.95 },
            { value: 'Oversized', type: 'detail', weight: 0.85 },
            { value: '90s', type: 'aesthetic', weight: 0.90 },
            { value: 'Plaid', type: 'detail', weight: 0.80 },
        ],
        incompatibleStyles: ['preppy', 'polished', 'minimalist']
    },
    {
        id: 'skate',
        name: 'Skate',
        fingerprints: ['skate', 'skater', 'thrasher', 'baggy', 'vans'],
        attributes: [
            { value: 'Skater', type: 'aesthetic', weight: 0.95 },
            { value: 'Board', type: 'use_case', weight: 0.85 },
            { value: 'Baggy', type: 'detail', weight: 0.90 },
            { value: 'Durable', type: 'aesthetic', weight: 0.80 },
            { value: 'Cargo', type: 'detail', weight: 0.85 },
        ],
        incompatibleStyles: ['formal', 'boho', 'cottagecore']
    },
    {
        id: 'coastal',
        name: 'Coastal / Resort',
        fingerprints: ['coastal', 'resort', 'vacation', 'beach', 'nautical'],
        attributes: [
            { value: 'Resort', type: 'aesthetic', weight: 0.95 },
            { value: 'Vacation', type: 'use_case', weight: 0.90 },
            { value: 'Beach', type: 'use_case', weight: 0.90 },
            { value: 'Summer', type: 'use_case', weight: 0.85 },
            { value: 'Linen', type: 'material', weight: 0.95 },
            { value: 'Tropical', type: 'detail', weight: 0.85 },
            { value: 'Lightweight', type: 'detail', weight: 0.80 },
            { value: 'Breezy', type: 'aesthetic', weight: 0.80 },
        ],
        incompatibleStyles: ['gorpcore', 'grunge', 'dark_academia']
    },
    {
        id: 'military',
        name: 'Military',
        fingerprints: ['military', 'surplus', 'camo', 'army', 'field jacket'],
        attributes: [
            { value: 'Tactical', type: 'aesthetic', weight: 0.90 },
            { value: 'Surplus', type: 'aesthetic', weight: 0.85 },
            { value: 'Camo', type: 'detail', weight: 0.95 },
            { value: 'Olive', type: 'detail', weight: 0.80 },
            { value: 'Utility', type: 'aesthetic', weight: 0.85 },
            { value: 'Field', type: 'use_case', weight: 0.80 },
        ],
        incompatibleStyles: ['boho', 'cottagecore', 'glam']
    },
    {
        id: 'biker',
        name: 'Biker',
        fingerprints: ['biker', 'motorcycle', 'moto', 'rider', 'leather'],
        attributes: [
            { value: 'Moto', type: 'aesthetic', weight: 0.95 },
            { value: 'Rider', type: 'use_case', weight: 0.90 },
            { value: 'Edgy', type: 'aesthetic', weight: 0.85 },
            { value: 'Leather', type: 'material', weight: 0.95 },
            { value: 'Zipper', type: 'detail', weight: 0.80 },
            { value: 'Punk', type: 'aesthetic', weight: 0.75 },
        ],
        incompatibleStyles: ['preppy', 'cottagecore', 'boho']
    },
    {
        id: 'evening',
        name: 'Evening / Formal',
        fingerprints: ['evening', 'formal', 'cocktail', 'gown', 'tuxedo'],
        attributes: [
            { value: 'Black Tie', type: 'aesthetic', weight: 0.95 },
            { value: 'Cocktail', type: 'use_case', weight: 0.90 },
            { value: 'Wedding', type: 'use_case', weight: 0.90 },
            { value: 'Elegant', type: 'aesthetic', weight: 0.85 },
            { value: 'Silk', type: 'material', weight: 0.85 },
            { value: 'Satin', type: 'material', weight: 0.80 },
            { value: 'Sequins', type: 'detail', weight: 0.85 },
        ],
        incompatibleStyles: ['utility', 'gorpcore', 'athleisure', 'grunge']
    },
    {
        id: 'avant_garde',
        name: 'Avant Garde',
        fingerprints: ['avant garde', 'deconstructed', 'archival', 'designer', 'runway'],
        attributes: [
            { value: 'Archival', type: 'aesthetic', weight: 0.95 },
            { value: 'Runway', type: 'aesthetic', weight: 0.90 },
            { value: 'Deconstructed', type: 'detail', weight: 0.95 },
            { value: 'Asymmetric', type: 'detail', weight: 0.90 },
            { value: 'High Fashion', type: 'aesthetic', weight: 0.85 },
            { value: 'Artistic', type: 'aesthetic', weight: 0.80 },
        ],
        incompatibleStyles: ['basic', 'preppy', 'generic']
    }
];


// --- Engine Logic ---

export class StyleCompatibilityEngine {
    private nodes: StyleNode[];

    constructor() {
        this.nodes = STYLE_NODES; // Load static nodes for MVP
    }

    /**
     * Phase 1: Simple keyword matching to find the "Primary Style"
     * In future phases, this would come from the AI analysis or Brand DB.
     */
    detectPrimaryStyle(inputString: string): StyleNode | null {
        const lowerInput = inputString.toLowerCase();
        let bestMatch: StyleNode | null = null;
        let maxOverlap = 0;

        for (const node of this.nodes) {
            let overlap = 0;
            for (const finger of node.fingerprints) {
                if (lowerInput.includes(finger)) {
                    overlap++;
                }
            }
            if (overlap > maxOverlap) {
                maxOverlap = overlap;
                bestMatch = node;
            }
        }

        return bestMatch; // Returns the strongest style signal found
    }

    /**
     * Generates a context block to be injected into the Unified Prompt.
     * This guides the LLM on which attributes are valid overrides/enrichments.
     */
    generatePromptContext(originalTitle: string, itemSpecifics: string): string {
        const combinedInput = `${originalTitle} ${itemSpecifics}`;
        const style = this.detectPrimaryStyle(combinedInput);

        if (!style) {
            return "Style Engine: No distinct style archetype detected. Proceed with standard optimization.";
        }

        // Format attributes for the prompt
        const aesthetics = style.attributes.filter(a => a.type === 'aesthetic').map(a => a.value).join(', ');
        const useCases = style.attributes.filter(a => a.type === 'use_case').map(a => a.value).join(', ');
        const materials = style.attributes.filter(a => a.type === 'material').map(a => a.value).join(', ');

        // Build the Prompt Block
        return `
STYLE COMPATIBILITY MATRIX (DETECTED ARCHETYPE: ${style.name.toUpperCase()})
- This item matches the "${style.name}" style archetype.
- When enriching the title, PRIOIRITIZE these compatible attributes (if true):
  - Aesthetics: ${aesthetics}
  - Use Cases: ${useCases}
  - Materials/Details: ${materials}
- AVOID incompatible aesthetics: ${style.incompatibleStyles.join(', ')}.
- Rule: Do not force these if clearly contradicted by images, but prefer them over generic synonyms.
`;
    }
}
