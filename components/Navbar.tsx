'use client';

import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useState, useEffect } from 'react';

export default function Navbar() {
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        // Check initial user
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
        };
        getUser();

        // Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                setUser(session?.user ?? null);
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    return (
        <nav style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem 2rem',
            position: 'sticky',
            top: 0,
            zIndex: 100,
            background: 'rgba(15, 15, 30, 0.6)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
        }}>
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Link href="/" className="text-gradient" style={{ fontSize: '1.5rem', fontWeight: 700, textDecoration: 'none' }}>
                    ResellSEO
                </Link>
            </div>

            {/* Desktop Links */}
            <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                <Link href="/about" style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                    About Us
                </Link>
                <Link href="#pricing" style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                    Pricing
                </Link>
                <Link href="/top-selling-brands" style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                    Top Brands
                </Link>
                <Link href="/blog" style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                    Blog
                </Link>
                <Link href="/contact" style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                    Contact
                </Link>
            </div>

            {/* Auth Buttons */}
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                {user ? (
                    <>
                        {user.email === 'resellseo@gmail.com' && (
                            <a href="/admin/brands" style={{ color: '#4caf50', fontSize: '0.9rem', fontWeight: 600, textDecoration: 'none' }}>
                                Admin
                            </a>
                        )}
                        <Link href="/dashboard" className="btn btn-primary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.9rem' }}>
                            Go to Dashboard
                        </Link>
                    </>
                ) : (
                    <>
                        <Link href="/login" style={{ color: 'var(--color-text-main)', fontSize: '0.9rem', fontWeight: 500 }}>
                            Log in
                        </Link>
                        <Link href="/login" className="btn btn-primary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.9rem' }}>
                            Get Started
                        </Link>
                    </>
                )}
            </div>
        </nav>
    );
}
