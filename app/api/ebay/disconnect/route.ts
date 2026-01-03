
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Delete the eBay token for the user
        const { error } = await supabase
            .from('ebay_tokens')
            .delete()
            .eq('user_id', user.id);

        if (error) throw error;

        return NextResponse.json({ success: true, message: 'eBay account disconnected.' });
    } catch (error: any) {
        console.error('Error disconnecting eBay:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
