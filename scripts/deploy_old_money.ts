
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pycwsjxnppiujegpidwp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5Y3dzanhucHBpdWplZ3BpZHdwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTE1NTE3MSwiZXhwIjoyMDgwNzMxMTcxfQ.kV0cdkZIFnSYl-6cNZZaRmIXX10qNccgBjleGNcX6lU';
const supabase = createClient(supabaseUrl, supabaseKey);

async function deployOldMoney() {
    console.log('Deploying Old Money Style...');

    // 1. Insert Style
    // We check if exists first
    const { data: existing } = await supabase.from('style_taxonomy').select('id').eq('style_name', 'old_money').single();

    let styleId = existing?.id;

    if (!styleId) {
        console.log('Creating "Old Money" style...');
        const { data, error } = await supabase.from('style_taxonomy').insert({
            style_name: 'old_money',
            display_name: 'Old Money',
            // Broad categories, but focused on quality garments
            category_whitelist: ['Blazers', 'Suits', 'Pants', 'Skirts', 'Dresses', 'Shirts', 'Sweaters', 'Coats', 'Vests', 'Accessories'],
            confidence_floor: 0.75
        }).select().single();

        if (error) {
            console.error('Error creating style:', error);
            return;
        }
        styleId = data.id;
    } else {
        console.log('Style "Old Money" already exists.');
    }

    console.log(`Style ID: ${styleId}`);

    // 2. Insert Signals
    const signals = [
        // High Value Brands (Strong Indicators)
        { signal_type: 'text', signal_value: 'polo ralph lauren', weight: 0.8 },
        { signal_type: 'text', signal_value: 'ralph lauren', weight: 0.7 },
        { signal_type: 'text', signal_value: 'brooks brothers', weight: 0.8 },
        { signal_type: 'text', signal_value: 'brunello cucinelli', weight: 1.0 },
        { signal_type: 'text', signal_value: 'loro piana', weight: 1.0 },
        { signal_type: 'text', signal_value: 'burberry', weight: 0.8 },
        { signal_type: 'text', signal_value: 'barbour', weight: 0.9 },
        { signal_type: 'text', signal_value: 'hermes', weight: 0.9 },

        // Materials (Medium-High Indicators)
        { signal_type: 'attribute', signal_value: 'cashmere', weight: 0.7 },
        { signal_type: 'attribute', signal_value: 'linen', weight: 0.5 },
        { signal_type: 'attribute', signal_value: 'tweed', weight: 0.6 },
        { signal_type: 'attribute', signal_value: 'silk', weight: 0.4 },

        // Keywords
        { signal_type: 'text', signal_value: 'quiet luxury', weight: 0.8 },
        { signal_type: 'text', signal_value: 'academia', weight: 0.4 },
        { signal_type: 'text', signal_value: 'preppy', weight: 0.3 }, // Overlap
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

deployOldMoney();
