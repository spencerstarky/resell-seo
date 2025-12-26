'use client';

import Link from 'next/link';

export default function Navbar() {
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

            {/* Desktop Links (Hidden on mobile for now, or just simple) */}
            <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                <Link href="#features" style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                    Features
                </Link>
                <Link href="/blog" style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                    Blog
                </Link>
                <Link href="#how-it-works" style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                    How it Works
                </Link>
            </div>

            {/* Auth Buttons */}
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <Link href="/login" style={{ color: 'var(--color-text-main)', fontSize: '0.9rem', fontWeight: 500 }}>
                    Log in
                </Link>
                <Link href="/login" className="btn btn-primary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.9rem' }}>
                    Get Started
                </Link>
            </div>
        </nav>
    );
}
