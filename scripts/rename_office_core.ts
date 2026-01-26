
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pycwsjxnppiujegpidwp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5Y3dzanhucHBpdWplZ3BpZHdwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTE1NTE3MSwiZXhwIjoyMDgwNzMxMTcxfQ.kV0cdkZIFnSYl-6cNZZaRmIXX10qNccgBjleGNcX6lU';
const supabase = createClient(supabaseUrl, supabaseKey);

async function renameOfficeCore() {
    console.log('Renaming "Office Core" style to "Office"...');

    // Update the display_name (this is what the AI sees as the Style Name)
    const { data, error } = await supabase
        .from('style_taxonomy')
        .update({ display_name: 'Office' })
        .eq('style_name', 'office_core')
        .select();

    if (error) {
        console.error('Error updating style:', error);
    } else {
        console.log('Update successful:', data);
    }
}

renameOfficeCore();
