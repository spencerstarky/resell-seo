
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pycwsjxnppiujegpidwp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5Y3dzanhucHBpdWplZ3BpZHdwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTE1NTE3MSwiZXhwIjoyMDgwNzMxMTcxfQ.kV0cdkZIFnSYl-6cNZZaRmIXX10qNccgBjleGNcX6lU';
const supabase = createClient(supabaseUrl, supabaseKey);

async function deployFishingStyle() {
    console.log('Deploying Fishing Style...');

    // 1. Insert Style
    // We check if exists first
    const { data: existing } = await supabase.from('style_taxonomy').select('id').eq('style_name', 'fishing').single();

    let styleId = existing?.id;

    if (!styleId) {
        console.log('Creating "Fishing" style...');
        const { data, error } = await supabase.from('style_taxonomy').insert({
            style_name: 'fishing',
            display_name: 'Fishing',
            category_whitelist: ['Shirts', 'Pants', 'Shorts', 'Hats', 'Vests', 'Coats & Jackets'],
            confidence_floor: 0.8
        }).select().single();

        if (error) {
            console.error('Error creating style:', error);
            return;
        }
        styleId = data.id;
    } else {
        console.log('Style "Fishing" already exists.');
    }

    console.log(`Style ID: ${styleId}`);

    // 2. Insert Signals
    const signals = [
        // Brands (Strongest Indicators)
        { signal_type: 'text', signal_value: 'columbia pfg', weight: 1.0 }, // Explicit PFG
        { signal_type: 'text', signal_value: 'pfg', weight: 1.0 },
        { signal_type: 'text', signal_value: 'huk', weight: 1.0 },
        { signal_type: 'text', signal_value: 'simms', weight: 1.0 },
        { signal_type: 'text', signal_value: 'aftco', weight: 1.0 },
        { signal_type: 'text', signal_value: 'grundens', weight: 1.0 },
        { signal_type: 'text', signal_value: 'pelagic', weight: 1.0 },
        { signal_type: 'text', signal_value: 'salt life', weight: 0.9 },

        // Specific Models / Lines (High Weight)
        { signal_type: 'text', signal_value: 'silver ridge', weight: 0.9 }, // Columbia line mentioned by user
        { signal_type: 'text', signal_value: 'bahama', weight: 0.8 },      // Common Columbia fishing shirt
        { signal_type: 'text', signal_value: 'tamiami', weight: 0.8 },     // Common Columbia fishing shirt
        { signal_type: 'text', signal_value: 'blood and guts', weight: 0.9 }, // Columbia line

        // Attributes / Tech (Medium Weight)
        { signal_type: 'attribute', signal_value: 'vented', weight: 0.6 },
        { signal_type: 'attribute', signal_value: 'rod holder', weight: 0.7 },
        { signal_type: 'attribute', signal_value: 'fishing', weight: 0.8 }, // If literally "fishing" is in text
        { signal_type: 'text', signal_value: 'upf', weight: 0.4 }, // Shared with outdoor, but adds up
        { signal_type: 'text', signal_value: 'omni-shade', weight: 0.5 },
    ];

    // Check for existing signals to avoid duplicates
    const { data: existingSignals } = await supabase.from('style_signals').select('signal_value').eq('style_id', styleId);
    const existingValues = new Set(existingSignals?.map(s => s.signal_value) || []);

    const newSignals = signals.filter(s => !existingValues.has(s.signal_value))
        .map(s => ({ ...s, style_id: styleId }));

    if (newSignals.length > 0) {
        console.log(`Inserting ${newSignals.length} new signals...`);
        const { error: signalError } = await supabase.from('style_signals').insert(newSignals);
        if (signalError) console.error('Error inserting signals:', signalError);
        else console.log('Signals added successfully.');
    } else {
        console.log('All signals already exist.');
    }
}

deployFishingStyle();
