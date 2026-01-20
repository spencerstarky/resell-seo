import { createClient } from '@/lib/supabase-server';
import { notFound } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { ArrowLeft, CheckCircle } from 'lucide-react';

export default async function BrandDetailPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const supabase = await createClient();

    const { data: brand } = await supabase
        .from('brands')
        .select('*')
        .eq('slug', slug)
        .single();

    if (!brand) {
        notFound();
    }

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <Navbar />

            <main className="container" style={{ paddingTop: '8rem', paddingBottom: '6rem', flex: 1 }}>
                <Link href="/top-selling-brands" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-dim)', marginBottom: '2rem' }}>
                    <ArrowLeft size={16} /> Back to Brand Index
                </Link>

                <div className="card glass" style={{ padding: '3rem', position: 'relative', overflow: 'hidden' }}>
                    {/* Header */}
                    <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '2rem' }}>
                        {brand.logo_url ? (
                            <img
                                src={brand.logo_url}
                                alt={`${brand.name} Logo`}
                                style={{ width: '100px', height: '100px', objectFit: 'contain', background: '#fff', padding: '0.5rem', borderRadius: '12px' }}
                            />
                        ) : (
                            <div style={{
                                width: '100px',
                                height: '100px',
                                background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                                borderRadius: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '3rem',
                                fontWeight: 'bold',
                                color: '#fff'
                            }}>
                                {brand.name.substring(0, 1)}
                            </div>
                        )}
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                                <h1 style={{ fontSize: '3rem', fontWeight: 800, margin: 0 }}>{brand.name}</h1>
                                {brand.confidence_tier === 1 && <CheckCircle size={24} color="#4caf50" />}
                            </div>
                            <span className="badge">High Sell-Through</span>
                        </div>
                    </div>

                    {/* Description */}
                    {brand.description ? (
                        <div style={{ fontSize: '1.2rem', lineHeight: 1.6, color: 'var(--color-text-muted)', maxWidth: '800px', marginBottom: '3rem' }}>
                            {brand.description}
                        </div>
                    ) : (
                        <p style={{ color: 'var(--color-text-dim)', fontStyle: 'italic', marginBottom: '3rem' }}>
                            Detailed sourcing guide coming soon.
                        </p>
                    )}

                    {/* Top Picks / Placeholder */}
                    {/* Top Picks / BOLO Section */}
                    {brand.marketing_metadata?.bolos && brand.marketing_metadata.bolos.length > 0 && (
                        <div>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--color-border)' }}>
                                What to Look For (BOLO)
                            </h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                                {brand.marketing_metadata.bolos.map((item: any, i: number) => (
                                    <div key={i} className="card" style={{ padding: '0', background: 'rgba(255,255,255,0.03)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                                        {/* Image Header */}
                                        <div style={{ height: '200px', background: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {item.image_url ? (
                                                <img src={item.image_url} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <div style={{ fontSize: '4rem', opacity: 0.8 }}>{item.emoji}</div>
                                            )}
                                        </div>
                                        {/* Content */}
                                        <div style={{ padding: '1.5rem', flex: 1 }}>
                                            <h4 style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{item.title}</h4>
                                            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-dim)' }}>{item.description}</p>
                                        </div>

                                        {/* Conversion CTA */}
                                        <div style={{ marginTop: '4rem', textAlign: 'center' }}>
                                            <div className="card glass" style={{
                                                padding: '3rem',
                                                background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(156, 85, 213, 0.05) 100%)',
                                                border: '1px solid rgba(156, 85, 213, 0.3)',
                                                maxWidth: '700px',
                                                margin: '0 auto'
                                            }}>
                                                <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '1rem' }}>
                                                    Sell Online?
                                                </h2>
                                                <p style={{ fontSize: '1.2rem', color: 'var(--color-text-muted)', marginBottom: '2rem', lineHeight: 1.6 }}>
                                                    Optimize your listing titles instantly with ResellSEO. Get seen by more buyers and sell faster.
                                                </p>
                                                <Link href="/" className="btn btn-primary" style={{
                                                    fontSize: '1.2rem',
                                                    padding: '1rem 2.5rem',
                                                    display: 'inline-flex',
                                                    borderRadius: '50px'
                                                }}>
                                                    Try It Free
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </main>

            <Footer />
        </div>
    );
}

// Generate Static Params for SEO (optional, but good for main brands)
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    // We can't use async metadata comfortably with title casing without fetching, 
    // so we'll just use the slug for now or fetch if needed.
    const title = slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' ');
    return {
        title: `${title} Resell Guide | ResellSEO`,
        description: `Everything you need to know about reselling ${title}. Best items to pick, what to avoid, and how to verify authenticity.`,
    };
}
