'use client';

import { useState } from 'react';

export default function NewsletterForm() {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<{ type: 'success' | 'error' | 'loading' | null, message: string | null }>({ type: null, message: null });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;

        setStatus({ type: 'loading', message: 'Joining...' });

        try {
            const response = await fetch('/api/newsletter/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (response.ok) {
                setStatus({ type: 'success', message: data.message });
                setEmail('');
            } else {
                setStatus({ type: 'error', message: data.error });
            }
        } catch (err) {
            setStatus({ type: 'error', message: 'Failed to connect. Try again later.' });
        }
    };

    return (
        <div style={{ maxWidth: '500px', marginInline: 'auto' }}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={{
                        flex: 1,
                        padding: '0.75rem 1.25rem',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid var(--color-border)',
                        color: 'white',
                        outline: 'none'
                    }}
                />
                <button
                    type="submit"
                    disabled={status.type === 'loading'}
                    className="btn btn-primary"
                    style={{ opacity: status.type === 'loading' ? 0.7 : 1 }}
                >
                    {status.type === 'loading' ? 'Joining...' : 'Subscribe'}
                </button>
            </form>

            {status.message && (
                <p style={{
                    fontSize: '0.85rem',
                    color: status.type === 'success' ? '#4caf50' : '#ff4444',
                    marginTop: '0.5rem'
                }}>
                    {status.message}
                </p>
            )}
        </div>
    );
}
