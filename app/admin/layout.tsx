import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // 1. Check if user is logged in
    if (!user) {
        redirect('/login');
    }

    // 2. Strict Email Check (Server-Side)
    // This prevents any non-admin from even rendering the admin pages.
    if (user.email !== 'resellseo@gmail.com') {
        // Redirect them to the dashboard or a 404
        redirect('/dashboard');
    }

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <main style={{ flex: 1 }}>
                {children}
            </main>
        </div>
    );
}
