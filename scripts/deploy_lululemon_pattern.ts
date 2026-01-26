
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pycwsjxnppiujegpidwp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5Y3dzanhucHBpdWplZ3BpZHdwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTE1NTE3MSwiZXhwIjoyMDgwNzMxMTcxfQ.kV0cdkZIFnSYl-6cNZZaRmIXX10qNccgBjleGNcX6lU';
const supabase = createClient(supabaseUrl, supabaseKey);

async function deployLululemonPattern() {
    console.log('Deploying Lululemon Style Code Pattern...');

    const { data: brand } = await supabase.from('brands').select('id').ilike('name', 'lululemon').single();
    if (!brand) {
        console.error('Lululemon brand not found in DB!');
        return;
    }

    console.log('Found Lululemon ID:', brand.id);

    // Strict Pattern: 
    // Starts with L, followed by W (Women), M (Men), or U/Z (Unisex/Other).
    // Followed by exactly 5 or 6 alphanumeric characters.
    // Total length ~7.
    // Example: LW5BMUS, LM5574S
    const regex = '^L[WMUZ][A-Z0-9]{5,7}$';

    const pattern = {
        brand_id: brand.id,
        regex_pattern: regex,
        min_length: 6,
        max_length: 9,
        allowed_charset: 'Alphanumeric',
        requires_context: false, // It's unique enough to not need "Style:" prefix
        confidence_weight: 1.0, // High trust
        is_active: true
    };

    // Insert or Update
    // We don't have a unique constraint on (brand_id, regex_pattern) likely, so let's delete old ones first to be clean
    await supabase.from('style_code_patterns').delete().eq('brand_id', brand.id);

    const { error } = await supabase.from('style_code_patterns').insert(pattern);

    if (error) {
        console.error('Error deploying pattern:', error);
    } else {
        console.log('Successfully deployed Lululemon pattern:', regex);
    }
}

deployLululemonPattern();
