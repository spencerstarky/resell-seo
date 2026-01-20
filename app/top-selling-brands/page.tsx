'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Lock, Unlock, CheckCircle, TrendingUp, Mail, ArrowRight } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Link from 'next/link';

export default function TopSellingBrandsPage() {
    const [brands, setBrands] = useState<any[]>([]);
    const [email, setEmail] = useState('');
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        // specific check for prior unlock (localStorage)
        const unlocked = localStorage.getItem('brand_guide_unlocked');
        if (unlocked) setIsUnlocked(true);

        fetchBrands();
    }, []);

    const fetchBrands = async () => {
        // Fetch only safe public fields
        const { data } = await supabase
            .from('brands')
            .select('name, confidence_tier, slug, logo_url')
            .order('name', { ascending: true });

        setBrands(data || []);
        setLoading(false);
    };

    const [statusMessage, setStatusMessage] = useState('');

    const handleUnlock = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setStatusMessage('');
        setSubmitting(true);

        if (!email.includes('@')) {
            setError('Please enter a valid email address.');
            setSubmitting(false);
            return;
        }

        try {
            // Try to save lead
            const { error } = await supabase.from('marketing_leads').insert({
                email,
                source: 'top-selling-brands_guide'
            });

            if (error) {
                // Check for duplicate (Postgres code 23505)
                if (error.code === '23505') {
                    setStatusMessage("Welcome back! Unlocking...");
                } else {
                    // unexpected error, but we still want to let them in (fail open)
                    console.error('Marketing lead error:', error);
                    setStatusMessage("Access Unlocked!");
                }
            } else {
                setStatusMessage("Access Granted!");
            }

            // Save state
            localStorage.setItem('brand_guide_unlocked', 'true');

            // Give them a moment to read the success message
            setTimeout(() => {
                setIsUnlocked(true);
            }, 1000);

        } catch (err) {
            // Fallback for any other crash
            localStorage.setItem('brand_guide_unlocked', 'true');
            setIsUnlocked(true);
        } finally {
            // setSubmitting(false); // Valid to keep submitting true during the timeout transition
        }
    };

    // Calculate stats
    const totalBrands = brands.length;
    const teaserCount = 12; // Show a bit more to tease
    const teaserList = brands.slice(0, teaserCount);

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <Navbar />

            <main className="container" style={{
                paddingTop: '8rem',
                paddingBottom: '8rem',
                flex: 1
            }}>
                {/* Header Section */}
                <div style={{ textAlign: 'center', marginBottom: '4rem' }}>

                    <div className="badge" style={{ marginBottom: '1.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                        <TrendingUp size={14} /> Live Database • Updated Daily
                    </div>

                    <h1 className="text-gradient" style={{
                        fontSize: 'clamp(2.5rem, 5vw, 4rem)',
                        lineHeight: 1.1,
                        fontWeight: 800,
                        marginBottom: '1.5rem'
                    }}>
                        {totalBrands} Brands That Actually Sell
                    </h1>

                    <div style={{
                        fontSize: '1.25rem',
                        color: 'var(--color-text-muted)',
                        maxWidth: '600px',
                        margin: '0 auto',
                        lineHeight: 1.6
                    }}>
                        <p style={{ marginBottom: '1rem' }}>
                            Skip the guesswork. This high sell-through brand guide shows you what brands to sell for profit.
                        </p>
                        <p>
                            Each brand includes best-selling categories and common item types to help you sell more items.
                        </p>
                    </div>
                </div>

                {/* Main Content Area */}
                <div style={{ position: 'relative', marginTop: '2rem' }}>

                    {/* The Grid */}
                    {/* The Grid: Faded at bottom if locked */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                        gap: '1.5rem',
                        position: 'relative',
                        // Mask the bottom if locked to fade out cleanly
                        maskImage: !isUnlocked ? 'linear-gradient(to bottom, black 40%, transparent 100%)' : 'none',
                        WebkitMaskImage: !isUnlocked ? 'linear-gradient(to bottom, black 40%, transparent 100%)' : 'none',
                        marginBottom: !isUnlocked ? '-150px' : '0' // Pull the lock card up into the faded area
                    }}>
                        {/* Show Full List if Unlocked, otherwise just Teaser */}
                        {(isUnlocked ? brands : teaserList).map((brand, i) => (
                            <Link key={i} href={`/top-selling-brands/${brand.slug || '#'}`} style={{ display: 'contents' }}>
                                <div className="card glass" style={{
                                    padding: '1.5rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1rem',
                                    transition: 'transform 0.2s',
                                    cursor: 'pointer'
                                }}
                                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                >
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                                        borderRadius: '10px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '1.1rem',
                                        fontWeight: 'bold',
                                        color: '#fff',
                                        flexShrink: 0
                                    }}>
                                        {brand.logo_url ? <img src={brand.logo_url} style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '8px', background: 'white', padding: '2px' }} /> : brand.name.substring(0, 1)}
                                    </div>
                                    <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>{brand.name}</span>
                                    {brand.confidence_tier === 1 && <CheckCircle size={16} color="#4caf50" style={{ marginLeft: 'auto' }} />}
                                </div>
                            </Link>
                        ))}
                    </div>

                    {/* The Locked Gate (Clean Block) */}
                    {!isUnlocked && (
                        <div style={{
                            position: 'relative',
                            zIndex: 10,
                            display: 'flex',
                            justifyContent: 'center',
                            marginTop: '2rem'
                        }}>
                            <div className="card glass" style={{
                                width: '100%',
                                maxWidth: '500px',
                                padding: '3rem',
                                textAlign: 'center',
                                boxShadow: '0 20px 80px rgba(0,0,0,0.6)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                background: 'rgba(10, 10, 10, 0.85)', // slightly more opaque to stand out against fade
                                backdropFilter: 'blur(20px)'
                            }}>
                                <div style={{
                                    width: '60px',
                                    height: '60px',
                                    background: 'rgba(156, 85, 213, 0.1)',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    margin: '0 auto 1.5rem auto'
                                }}>
                                    <Lock size={28} color="var(--color-primary)" />
                                </div>

                                <h2 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '0.75rem' }}>Unlock the full list</h2>
                                <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem' }}>
                                    Enter your email to instantly access our database of {totalBrands}+ high-performing reseller brands.
                                </p>

                                <form onSubmit={handleUnlock} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div style={{ position: 'relative' }}>
                                        <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-dim)' }} />
                                        <input
                                            type="email"
                                            placeholder="Enter your email address..."
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            style={{
                                                width: '100%',
                                                padding: '1rem 1rem 1rem 3rem',
                                                borderRadius: 'var(--radius-lg)',
                                                border: '1px solid var(--color-border)',
                                                background: 'rgba(0,0,0,0.3)',
                                                color: 'var(--color-text-main)',
                                                fontSize: '1rem'
                                            }}
                                            required
                                        />
                                    </div>
                                    {error && <div style={{ color: '#f44336', fontSize: '0.9rem' }}>{error}</div>}
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="btn btn-primary"
                                        style={{
                                            padding: '1rem',
                                            width: '100%',
                                            fontSize: '1.1rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '0.5rem',
                                            background: statusMessage ? '#4caf50' : 'var(--color-primary)', // Green if success
                                            transition: 'background 0.3s'
                                        }}
                                    >
                                        {statusMessage ? (
                                            <><CheckCircle size={20} /> {statusMessage}</>
                                        ) : (
                                            submitting ? 'Unlocking...' : <><Unlock size={20} /> Unlock Database</>
                                        )}
                                    </button>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', marginTop: '0.5rem' }}>
                                        Join 500+ sellers improving their sourcing game. <Link href="/unsubscribe" style={{ textDecoration: 'underline' }}>Unsubscribe</Link> anytime.
                                    </p>
                                </form>
                            </div>
                        </div>
                    )}
                </div>

                {/* Upsell Section (Visible only when unlocked) */}
                {isUnlocked && (
                    <div className="card glass" style={{
                        marginTop: '6rem',
                        padding: '4rem 2rem',
                        textAlign: 'center',
                        position: 'relative',
                        overflow: 'hidden'
                    }}>
                        {/* Decorative background accent */}
                        <div style={{
                            position: 'absolute',
                            top: '-50%',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: '400px',
                            height: '400px',
                            background: 'radial-gradient(circle, rgba(156, 85, 213, 0.2) 0%, transparent 70%)',
                            filter: 'blur(60px)',
                            zIndex: 0
                        }}></div>

                        <div style={{ position: 'relative', zIndex: 1 }}>
                            <h3 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1.5rem' }}>
                                Don't just list them. <span className="text-gradient">Optimize them.</span>
                            </h3>
                            <p style={{ fontSize: '1.2rem', color: 'var(--color-text-muted)', maxWidth: '600px', margin: '0 auto 2.5rem auto' }}>
                                Identifying the brand is step 1. Writing a title that ranks on eBay is step 2. ResellSEO optimizes your titles automatically.
                            </p>
                            <Link href="/login" className="btn btn-primary" style={{ padding: '1.25rem 3rem', fontSize: '1.1rem' }}>
                                Start Optimizing Free <ArrowRight size={20} />
                            </Link>
                        </div>
                    </div>
                )}
            </main>

            <Footer />
        </div>
    );
}
