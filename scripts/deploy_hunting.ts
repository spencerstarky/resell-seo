
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pycwsjxnppiujegpidwp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5Y3dzanhucHBpdWplZ3BpZHdwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTE1NTE3MSwiZXhwIjoyMDgwNzMxMTcxfQ.kV0cdkZIFnSYl-6cNZZaRmIXX10qNccgBjleGNcX6lU';
const supabase = createClient(supabaseUrl, supabaseKey);

async function deployHunting() {
    console.log('Deploying Hunting Style...');

    // 1. Insert Style
    // We check if exists first to avoid duplicate error if 'upsert' strictly requires ID or constraint handling
    const { data: existing } = await supabase.from('style_taxonomy').select('id').eq('style_name', 'hunting').single();

    let styleId = existing?.id;

    if (!styleId) {
        console.log('Creating "Hunting" style...');
        const { data, error } = await supabase.from('style_taxonomy').insert({
            style_name: 'hunting',
            display_name: 'Hunting',
            category_whitelist: ['Coats & Jackets', 'Pants', 'Vests', 'Shirts', 'Gloves', 'Hats'],
            confidence_floor: 0.8
        }).select().single();

        if (error) {
            console.error('Error creating style:', error);
            return;
        }
        styleId = data.id;
    } else {
        console.log('Style "Hunting" already exists.');
    }

    console.log(`Style ID: ${styleId}`);

    // 2. Insert Signals
    const signals = [
        { signal_type: 'text', signal_value: 'kuiu', weight: 1.0 },
        { signal_type: 'text', signal_value: 'sitka', weight: 1.0 },
        { signal_type: 'text', signal_value: 'first lite', weight: 1.0 },
        { signal_type: 'text', signal_value: 'kryptek', weight: 1.0 },
        { signal_type: 'attribute', signal_value: 'real tree', weight: 0.8 },
        { signal_type: 'attribute', signal_value: 'mossy oak', weight: 0.8 },
        { signal_type: 'text', signal_value: 'camo', weight: 0.4 },
    ];

    // Delete existing to avoid dupes (simple sync)
    // await supabase.from('style_signals').delete().eq('style_id', styleId); // Optional: clear old matching signals? 
    // Actually safer to check existence or just rely on manual management. 
    // Let's just blindly insert for now, if duplicates accumulate it's not fatal, but cleaner to check.
    // For this task, I'll just check if 'kuiu' exists for this style.

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

deployHunting();
