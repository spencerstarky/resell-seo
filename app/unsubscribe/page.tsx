'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function UnsubscribePage() {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

    const handleUnsubscribe = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('loading');

        try {
            // Delete from database
            const { error } = await supabase
                .from('marketing_leads')
                .delete()
                .eq('email', email);

            if (error) throw error;

            // Clear local storage lock too, just in case
            localStorage.removeItem('brand_guide_unlocked');

            setStatus('success');
        } catch (err) {
            console.error(err);
            // Even on error (e.g. email not found), we should probably tell them success to avoid email scraping/probing
            setStatus('success');
        }
    };

    return (
        <div style={{ padding: '4rem 1rem', maxWidth: '500px', margin: '0 auto', color: '#fff', textAlign: 'center' }}>
            <h1 className="text-gradient" style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '2rem' }}>
                Unsubscribe
            </h1>

            {status === 'success' ? (
                <div style={{ background: 'rgba(76, 175, 80, 0.1)', border: '1px solid #4caf50', padding: '2rem', borderRadius: '12px' }}>
                    <CheckCircle size={48} style={{ display: 'block', margin: '0 auto 1rem auto', color: '#4caf50' }} />
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '1rem' }}>You have been unsubscribed.</h2>
                    <p style={{ color: '#aaa', marginBottom: '1.5rem' }}>
                        Your email has been removed from our marketing list. You will no longer receive updates.
                    </p>
                    <Link href="/" className="btn btn-secondary">Return Home</Link>
                </div>
            ) : (
                <div style={{ background: '#111', padding: '2rem', borderRadius: '12px', border: '1px solid #333' }}>
                    <p style={{ color: '#aaa', marginBottom: '2rem' }}>
                        We're sorry to see you go. Enter your email below to remove yourself from our list.
                    </p>

                    <form onSubmit={handleUnsubscribe} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <input
                            type="email"
                            placeholder="Enter your email address"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                            style={{
                                padding: '1rem',
                                borderRadius: '8px',
                                border: '1px solid #444',
                                background: '#000',
                                color: '#fff',
                                fontSize: '1rem'
                            }}
                        />
                        <button
                            type="submit"
                            disabled={status === 'loading'}
                            className="btn btn-primary"
                            style={{ padding: '1rem', fontWeight: 'bold' }}
                        >
                            {status === 'loading' ? 'Processing...' : 'Unsubscribe'}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}
