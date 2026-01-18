'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Lock, Unlock, CheckCircle, TrendingUp, Mail } from 'lucide-react';

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
            .select('name, confidence_tier')
            .order('name', { ascending: true });

        setBrands(data || []);
        setLoading(false);
    };

    const handleUnlock = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);

        if (!email.includes('@')) {
            setError('Please enter a valid email address.');
            setSubmitting(false);
            return;
        }

        try {
            // Save lead
            await supabase.from('marketing_leads').insert({
                email,
                source: 'top-selling-brands_guide'
            });

            // Unlock
            localStorage.setItem('brand_guide_unlocked', 'true');
            setIsUnlocked(true);
        } catch (err) {
            // Even if duplicate/error, let them in to avoid friction (fail open for UX)
            localStorage.setItem('brand_guide_unlocked', 'true');
            setIsUnlocked(true);
        } finally {
            setSubmitting(false);
        }
    };

    // Calculate stats
    const totalBrands = brands.length;
    const teaserCount = 8;
    const teaserList = brands.slice(0, teaserCount);

    // Aesthetic Styles
    const containerStyle = { maxWidth: '900px', margin: '0 auto', padding: '4rem 1.5rem', color: '#fff' };
    const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' };
    const cardStyle = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.8rem' };

    return (
        <div style={containerStyle}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(76, 175, 80, 0.15)', color: '#4caf50', padding: '0.4rem 1rem', borderRadius: '100px', fontSize: '0.9rem', fontWeight: 600, marginBottom: '1.5rem' }}>
                    <TrendingUp size={16} /> Live Database • Updated Daily
                </div>
                <h1 className="text-gradient" style={{ fontSize: '3.5rem', lineHeight: 1.1, fontWeight: 800, marginBottom: '1.5rem' }}>
                    High Sell-Through Rate<br />Brand Index
                </h1>
                <p style={{ fontSize: '1.2rem', color: '#aaa', maxWidth: '600px', margin: '0 auto', lineHeight: 1.6 }}>
                    Stop guessing at the bins. Access our curated list of <strong>{totalBrands || '100+'} verified brands</strong> that active resellers use to generate consistent profit.
                </p>
            </div>

            {/* Content Area */}
            <div style={{ position: 'relative' }}>

                {/* The Grid */}
                <div style={gridStyle}>
                    {/* Show Full List if Unlocked, otherwise just Teaser */}
                    {(isUnlocked ? brands : teaserList).map((brand, i) => (
                        <div key={i} style={cardStyle}>
                            <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, #6366f1, #a855f7)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                {brand.name.substring(0, 1)}
                            </div>
                            <span style={{ fontWeight: 600, fontSize: '1.05rem' }}>{brand.name}</span>
                        </div>
                    ))}

                    {/* Fake ghost cards for effect if locked */}
                    {!isUnlocked && Array.from({ length: 6 }).map((_, i) => (
                        <div key={`ghost-${i}`} style={{ ...cardStyle, opacity: 0.3, filter: 'blur(4px)' }}>
                            <div style={{ width: '32px', height: '32px', background: '#333', borderRadius: '8px' }}></div>
                            <div style={{ height: '16px', background: '#333', width: '60%', borderRadius: '4px' }}></div>
                        </div>
                    ))}
                </div>

                {/* The Gate (Overlay) */}
                {!isUnlocked && (
                    <div style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: '400px',
                        background: 'linear-gradient(to bottom, rgba(10,10,10,0) 0%, #0a0a0a 40%, #0a0a0a 100%)',
                        display: 'flex',
                        alignItems: 'flex-end',
                        justifyContent: 'center',
                        paddingBottom: '4rem',
                        zIndex: 10
                    }}>
                        <div style={{
                            background: 'rgba(20, 20, 30, 0.9)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '20px',
                            padding: '3rem',
                            textAlign: 'center',
                            maxWidth: '500px',
                            backdropFilter: 'blur(20px)',
                            boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
                        }}>
                            <Lock size={48} style={{ color: '#6366f1', marginBottom: '1.5rem', margin: '0 auto' }} />
                            <h2 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '0.5rem' }}>Unlock the Full Index</h2>
                            <p style={{ color: '#aaa', marginBottom: '2rem' }}>
                                Join 2,000+ resellers. Enter your email to instantly reveal all {totalBrands} brands and get weekly BOLO alerts.
                            </p>

                            <form onSubmit={handleUnlock} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div style={{ position: 'relative' }}>
                                    <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#666' }} />
                                    <input
                                        type="email"
                                        placeholder="Enter your email address..."
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '1rem 1rem 1rem 3rem',
                                            borderRadius: '8px',
                                            border: '1px solid #333',
                                            background: '#000',
                                            color: '#fff',
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
                                        fontWeight: 'bold',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.5rem'
                                    }}
                                >
                                    {submitting ? 'Unlocking...' : <><Unlock size={20} /> Unlock Database Now</>}
                                </button>
                                <p style={{ fontSize: '0.8rem', color: '#555', marginTop: '1rem' }}>
                                    No spam. Unsubscribe anytime. High sell-through only.
                                </p>
                            </form>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer Upsell */}
            {isUnlocked && (
                <div style={{ marginTop: '6rem', padding: '3rem', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.1))', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                    <h3 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '1rem' }}>Don't just list them. Optimize them.</h3>
                    <p style={{ color: '#ccc', maxWidth: '600px', margin: '0 auto 2rem auto', fontSize: '1.1rem' }}>
                        Knowing the brand is step 1. Listing it with the perfect SEO title is step 2. ResellSEO recognizes these brands automatically.
                    </p>
                    <a href="/login" className="btn btn-primary" style={{ padding: '0.8rem 2rem', fontSize: '1.1rem' }}>
                        Start Optimizing for Free
                    </a>
                </div>
            )}
        </div>
    );
}
