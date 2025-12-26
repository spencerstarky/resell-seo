'use client';

import { User } from '@supabase/supabase-js';
import { User as UserIcon, Mail, Shield, Zap, ExternalLink, LogOut, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface AccountClientProps {
    user: User;
    profile: any;
    hasEbayConnected: boolean;
}

function EbayStatus() {
    const [status, setStatus] = useState<{ type: 'success' | 'error' | null, message: string | null }>({ type: null, message: null });

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const connected = params.get('connected');
        const error = params.get('error');
        const details = params.get('details');

        if (connected === 'ebay') {
            setStatus({ type: 'success', message: 'eBay account connected successfully!' });
        } else if (error) {
            setStatus({ type: 'error', message: `Connection failed: ${details || error}` });
        }
    }, []);

    if (!status.type) return null;

    return (
        <div style={{
            marginTop: '1rem',
            padding: '0.75rem',
            background: status.type === 'success' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 68, 68, 0.1)',
            color: status.type === 'success' ? '#4caf50' : '#ff4444',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.85rem',
            border: `1px solid ${status.type === 'success' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255, 68, 68, 0.2)'}`
        }}>
            {status.type === 'success' ? '✓' : '✕'} {status.message}
        </div>
    );
}

export default function AccountClient({ user, profile, hasEbayConnected: initialHasEbayConnected }: AccountClientProps) {
    const router = useRouter();
    const [hasEbayConnected, setHasEbayConnected] = useState(initialHasEbayConnected);
    const [progressWidth, setProgressWidth] = useState(0);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('connected') === 'ebay') {
            setHasEbayConnected(true);
        }

        // Trigger progress bar animation
        const timer = setTimeout(() => {
            const usage = profile?.usage_count || 0;
            const percentage = Math.min((usage / 50) * 100, 100);
            setProgressWidth(percentage);
        }, 100);

        return () => clearTimeout(timer);
    }, [profile]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
        router.refresh();
    };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '4rem' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Account Settings</h1>
                <p style={{ color: 'var(--color-text-muted)' }}>Manage your profile, connections, and subscription.</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {/* Profile Section */}
                <section className="card glass" style={{ padding: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                        <div style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: '50%',
                            background: 'var(--gradient-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 0 20px rgba(156, 85, 213, 0.4)'
                        }}>
                            <UserIcon size={32} color="white" />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{user.email?.split('@')[0]}</h2>
                            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Member since {new Date(user.created_at).toLocaleDateString()}</p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <Mail size={20} style={{ color: 'var(--color-primary)' }} />
                            <div style={{ flex: 1 }}>
                                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email Address</p>
                                <p style={{ fontSize: '1rem' }}>{user.email}</p>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <Shield size={20} style={{ color: 'var(--color-primary)' }} />
                            <div style={{ flex: 1 }}>
                                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Account Status</p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <p style={{ fontSize: '1rem' }}>Free Plan</p>
                                    <span style={{
                                        padding: '0.2rem 0.6rem',
                                        background: 'rgba(156, 85, 213, 0.1)',
                                        color: 'var(--color-primary)',
                                        borderRadius: '100px',
                                        fontSize: '0.7rem',
                                        fontWeight: 600
                                    }}>FREE</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Usage Section */}
                <section className="card glass" style={{ padding: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <Zap size={20} style={{ color: 'var(--color-accent)' }} />
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Trial Credits</h2>
                        </div>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: (profile?.usage_count || 0) >= 40 ? '#ff4444' : 'var(--color-primary)' }}>
                            {50 - (profile?.usage_count || 0)} Credits Remaining
                        </span>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <span style={{ color: 'var(--color-text-muted)' }}>Free optimizations used</span>
                            <span style={{ fontWeight: 600 }}>{profile?.usage_count || 0} / 50</span>
                        </div>
                        <div style={{ width: '100%', height: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <div style={{
                                width: `${progressWidth}%`,
                                height: '100%',
                                background: (profile?.usage_count || 0) >= 40 ? 'linear-gradient(90deg, #ff4444, #ff8888)' : 'var(--gradient-primary)',
                                transition: 'width 1.5s cubic-bezier(0.4, 0, 0.2, 1)'
                            }} />
                        </div>
                        <p style={{ marginTop: '1.25rem', fontSize: '0.9rem', lineHeight: '1.5', color: 'var(--color-text-dim)' }}>
                            You are currently on the <strong style={{ color: 'white' }}>Free Starter Plan</strong>. Upgrade today to unlock unlimited bulk optimizations and priority AI processing.
                        </p>
                    </div>

                    {/* Pro Call to Action */}
                    <div style={{
                        marginTop: '1.5rem',
                        padding: '1.5rem',
                        borderRadius: 'var(--radius-sm)',
                        background: 'linear-gradient(135deg, rgba(156, 85, 213, 0.2), rgba(121, 40, 202, 0.2))',
                        border: '1px solid var(--color-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '1rem'
                    }}>
                        <div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.25rem' }}>Upgrade to ResellSEO Pro</h3>
                            <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>Unlimited listings, priority support, and expert SEO keywords.</p>
                        </div>
                        <button className="btn btn-primary" style={{ whiteSpace: 'nowrap', boxShadow: '0 0 20px rgba(156, 85, 213, 0.4)' }}>
                            Go Pro Only $19/mo
                        </button>
                    </div>
                </section>

                {/* Connections Section */}
                <section className="card glass" style={{ padding: '2rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Connections</h2>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                            <div style={{
                                width: '48px',
                                height: '48px',
                                background: 'white',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '6px',
                                boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
                            }}>
                                <img
                                    src="/ebay-logo.png"
                                    alt="eBay"
                                    style={{ width: '100%', height: 'auto', objectFit: 'contain' }}
                                />
                            </div>
                            <div>
                                <p style={{ fontWeight: 600, fontSize: '1rem' }}>eBay Marketplace</p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <div style={{
                                        width: '6px',
                                        height: '6px',
                                        borderRadius: '50%',
                                        backgroundColor: hasEbayConnected ? '#4caf50' : '#888',
                                        boxShadow: hasEbayConnected ? '0 0 8px #4caf50' : 'none'
                                    }} />
                                    <p style={{ fontSize: '0.8rem', color: hasEbayConnected ? '#4caf50' : 'var(--color-text-muted)' }}>
                                        {hasEbayConnected ? 'Connected' : 'Not connected'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {!hasEbayConnected && (
                            <Link
                                href="/api/auth/ebay/login"
                                className="btn btn-primary"
                                style={{ fontSize: '0.85rem', padding: '0.6rem 1.2rem', textDecoration: 'none' }}
                            >
                                Connect eBay
                            </Link>
                        )}
                    </div>

                    {/* Status Notifications */}
                    <EbayStatus />
                </section>

                {/* Danger Zone */}
                <section className="card glass" style={{ padding: '2rem', border: '1px solid rgba(255, 68, 68, 0.2)' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', color: '#ff4444' }}>Danger Zone</h2>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <p style={{ fontWeight: 600 }}>Sign Out</p>
                            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Logout of your current session on this device.</p>
                        </div>
                        <button onClick={handleLogout} className="btn btn-secondary" style={{ color: '#ff4444', borderColor: 'rgba(255, 68, 68, 0.2)' }}>
                            <LogOut size={16} style={{ marginRight: '0.5rem' }} /> Log Out
                        </button>
                    </div>
                </section>
            </div>
        </div>
    );
}
