import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { BadgeCheck, GraduationCap, Store, TrendingUp, User, Search, ArrowRight, BookOpen, ShoppingBag } from 'lucide-react';

export default function AboutPage() {
    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <Navbar />

            <main style={{ flex: 1, paddingTop: '8rem' }}>
                {/* Hero Section */}
                <section className="container" style={{ textAlign: 'center', marginBottom: '8rem' }}>
                    <div className="animate-fade-in">
                        <span className="badge">About ResellSEO</span>
                        <h1 className="section-title text-gradient" style={{ marginBottom: '1.5rem', fontSize: 'clamp(2.5rem, 5vw, 4.5rem)' }}>
                            Built by a Reseller,<br />For Resellers.
                        </h1>
                        <p style={{
                            fontSize: '1.25rem',
                            color: 'var(--color-text-dim)',
                            maxWidth: '800px',
                            margin: '0 auto 3rem',
                            lineHeight: 1.6
                        }}>
                            ResellSEO was created to solve a problem I ran into every single day as an active eBay reseller:
                            <span style={{ color: 'var(--color-text-main)' }}> great products don’t sell if they can’t be found.</span>
                        </p>

                        <div style={{ maxWidth: '700px', margin: '0 auto', color: 'var(--color-text-muted)', lineHeight: '1.8', fontSize: '1.1rem' }}>
                            After years of sourcing, photographing, listing, and shipping thousands of items, I realized that success on marketplaces like eBay isn’t just about having good inventory, it’s about search visibility. Titles matter. Keywords matter. Structure matters. And yet, most resellers are left guessing.
                            <br /><br />
                            <strong style={{ color: 'var(--color-primary)' }}>ResellSEO exists to remove that guesswork.</strong>
                        </div>
                    </div>
                </section>

                {/* The Founder Story - Grid Layout */}
                <section className="container" style={{ marginBottom: '10rem' }}>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                        gap: '4rem',
                        alignItems: 'center'
                    }}>
                        {/* Text Content */}
                        <div className="animate-fade-in delay-100">
                            <h2 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '1.5rem', lineHeight: 1.2 }}>
                                The Founder: Where Marketing Meets Real-World Reselling
                            </h2>
                            <div style={{ color: 'var(--color-text-muted)', fontSize: '1.1rem', lineHeight: 1.8 }}>
                                <p style={{ marginBottom: '1.5rem' }}>
                                    I’m the founder of ResellSEO, a full-time reseller turned product builder with a Bachelor’s degree in Digital Marketing and years of hands-on eBay business experience.
                                </p>
                                <p>
                                    My background in digital marketing taught me how search engines work, how keywords, structure, relevance, and intent influence visibility. My years as a reseller taught me the real constraints sellers face: limited time, inconsistent data, messy item specifics, and constantly changing trends.
                                </p>
                            </div>
                        </div>

                        {/* Visual/Card */}
                        <div className="card glass animate-fade-in delay-200" style={{ position: 'relative' }}>
                            <div style={{
                                position: 'absolute',
                                top: '-20px',
                                right: '-20px',
                                background: 'var(--color-primary)',
                                padding: '1rem',
                                borderRadius: 'var(--radius-lg)',
                                boxShadow: 'var(--shadow-glow)'
                            }}>
                                <User size={32} color="white" />
                            </div>
                            <div style={{ padding: '2rem' }}>
                                <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Spencer Starkey</h3>
                                <p style={{ color: 'var(--color-primary)', marginBottom: '2rem', fontWeight: 600 }}>Founder & Developer</p>
                                <ul style={{ listStyle: 'none', color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <GraduationCap size={20} color="var(--color-secondary)" />
                                        <span>B.S. in Digital Marketing</span>
                                    </li>
                                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <Store size={20} color="var(--color-secondary)" />
                                        <span>Active eBay Top Rated Seller</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>

                {/* The "Intersection" Section - 3 Column */}
                <section style={{ backgroundColor: 'var(--color-bg-surface)', padding: '8rem 0' }}>
                    <div className="container">
                        <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
                            <span className="badge">Our Advantage</span>
                            <h2 style={{ fontSize: '2.5rem', fontWeight: 700 }}>ResellSEO sits at the intersection of two worlds</h2>
                        </div>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                            gap: '2rem'
                        }}>
                            {/* Card 1 */}
                            <div className="card" style={{ height: '100%' }}>
                                <div style={{
                                    width: '50px',
                                    height: '50px',
                                    background: 'rgba(156, 85, 213, 0.1)',
                                    borderRadius: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: '1.5rem'
                                }}>
                                    <BookOpen size={24} color="var(--color-primary)" />
                                </div>
                                <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Marketing Theory</h3>
                                <p style={{ color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                                    SEO, keyword intent, and search optimization. We apply the science of search to your listings.
                                </p>
                            </div>

                            {/* Card 2 */}
                            <div className="card" style={{ height: '100%' }}>
                                <div style={{
                                    width: '50px',
                                    height: '50px',
                                    background: 'rgba(56, 189, 248, 0.1)',
                                    borderRadius: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: '1.5rem'
                                }}>
                                    <ShoppingBag size={24} color="#38bdf8" />
                                </div>
                                <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Marketplace Reality</h3>
                                <p style={{ color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                                    Thrifted inventory, inconsistent tags, and limited product info. We understand the actual constraints you face.
                                </p>
                            </div>

                            {/* Card 3 */}
                            <div className="card" style={{ height: '100%', borderColor: 'var(--color-primary)' }}>
                                <div style={{
                                    width: '50px',
                                    height: '50px',
                                    background: 'rgba(236, 72, 153, 0.1)',
                                    borderRadius: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: '1.5rem'
                                }}>
                                    <TrendingUp size={24} color="#ec4899" />
                                </div>
                                <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Actual Store Data</h3>
                                <p style={{ color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                                    This product wasn’t built in a vacuum. It was built inside my actual eBay store.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Final Quote/Mission */}
                <section className="container" style={{ padding: '10rem 0', textAlign: 'center' }}>
                    <div className="glass" style={{
                        padding: '4rem',
                        borderRadius: '2rem',
                        maxWidth: '900px',
                        margin: '0 auto',
                        position: 'relative',
                        overflow: 'hidden'
                    }}>
                        {/* Background Accent */}
                        <div style={{
                            position: 'absolute',
                            top: '-50%',
                            left: '-50%',
                            width: '200%',
                            height: '200%',
                            background: 'radial-gradient(circle at center, rgba(156,85,213,0.1) 0%, transparent 60%)',
                            pointerEvents: 'none',
                            zIndex: 0
                        }} />

                        <div style={{ position: 'relative', zIndex: 1 }}>
                            <span className="badge" style={{ marginBottom: '2rem' }}>Built in Production, Not in Theory</span>
                            <h2 style={{ fontSize: '2rem', marginBottom: '2rem', fontFamily: 'serif', fontStyle: 'italic', color: 'var(--color-text-main)' }}>
                                "Every feature in ResellSEO exists because I needed it myself."
                            </h2>

                            <Link href="/dashboard" className="btn btn-primary" style={{ padding: '1rem 2.5rem', fontSize: '1.1rem' }}>
                                Start Optimizing Your Store <ArrowRight size={18} />
                            </Link>
                        </div>
                    </div>
                </section>

            </main>
            <Footer />
        </div>
    );
}
