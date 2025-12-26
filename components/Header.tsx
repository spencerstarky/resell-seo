'use client';

import Link from 'next/link';
import { Settings, LogOut, User as UserIcon, Keyboard } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';

export default function Header() {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.email) {
                setUserEmail(user.email);
            }
        };
        getUser();

        // Close dropdown when clicking outside
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
        router.refresh();
    };

    const initial = userEmail ? userEmail.charAt(0).toUpperCase() : null;

    return (
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem 0', marginBottom: '2rem', position: 'relative' }}>
            <Link href="/dashboard" className="text-gradient" style={{ fontSize: '1.5rem', fontWeight: 700, textDecoration: 'none' }}>
                ResellSEO
            </Link>

            <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                <Link href="/dashboard" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500 }}>
                    Dashboard
                </Link>

                {/* User Account Section */}
                <div
                    ref={dropdownRef}
                    style={{ position: 'relative' }}
                    onMouseEnter={() => setIsOpen(true)}
                    onMouseLeave={() => setIsOpen(false)}
                >
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: 'var(--gradient-primary)',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: 'white',
                            fontWeight: 600,
                            fontSize: '1rem',
                            padding: 0,
                            boxShadow: '0 0 15px rgba(156, 85, 213, 0.3)',
                            transition: 'transform 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        {initial || <UserIcon size={20} />}
                    </button>

                    {/* Dropdown Menu */}
                    {isOpen && (
                        <div style={{
                            position: 'absolute',
                            top: '40px',
                            right: 0,
                            paddingTop: '8px',
                            zIndex: 1000,
                        }}>
                            <div style={{
                                width: '220px',
                                background: '#161625',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                borderRadius: 'var(--radius-sm)',
                                boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
                                overflow: 'hidden',
                                animation: 'fadeIn 0.2s ease'
                            }}>
                                <div style={{ padding: '1rem', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Signed in as</p>
                                    <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userEmail}</p>
                                </div>

                                <div style={{ padding: '0.5rem' }}>
                                    <Link href="/account" onClick={() => setIsOpen(false)} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                        padding: '0.75rem',
                                        color: 'var(--color-text-muted)',
                                        textDecoration: 'none',
                                        fontSize: '0.9rem',
                                        borderRadius: '6px',
                                        transition: 'all 0.2s ease'
                                    }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                            e.currentTarget.style.color = 'white';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'transparent';
                                            e.currentTarget.style.color = 'var(--color-text-muted)';
                                        }}
                                    >
                                        <Settings size={16} />
                                        Account Settings
                                    </Link>

                                    <button
                                        onClick={handleLogout}
                                        style={{
                                            width: '100%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.75rem',
                                            padding: '0.75rem',
                                            color: '#ff4444',
                                            background: 'transparent',
                                            border: 'none',
                                            fontSize: '0.9rem',
                                            cursor: 'pointer',
                                            borderRadius: '6px',
                                            transition: 'all 0.2s ease',
                                            textAlign: 'left'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = 'rgba(255, 68, 68, 0.05)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'transparent';
                                        }}
                                    >
                                        <LogOut size={16} />
                                        Sign Out
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </header>
    );
}
