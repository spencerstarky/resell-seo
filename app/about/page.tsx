import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { BadgeCheck, GraduationCap, Store, TrendingUp, User, Search, ArrowRight } from 'lucide-react';

export default function AboutPage() {
    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <Navbar />

            <main style={{ flex: 1, paddingTop: '8rem' }}>
                {/* Hero Section */}
                <section className="container" style={{ textAlign: 'center', marginBottom: '8rem' }}>
                    <div className="animate-fade-in">
                        <span className="badge">Our Story</span>
                        <h1 className="section-title text-gradient" style={{ marginBottom: '1.5rem', fontSize: 'clamp(2.5rem, 5vw, 4.5rem)' }}>
                            Built by a Reseller,<br />For Resellers.
                        </h1>
                        <p style={{
                            fontSize: '1.25rem',
                            color: 'var(--color-text-dim)',
                            maxWidth: '600px',
                            margin: '0 auto 3rem',
                            lineHeight: 1.6
                        }}>
                            Bridging the gap between professional digital marketing and <br className="hidden md:block" /> the daily hustle of selling online.
                        </p>
                    </div>
                </section>

                {/* The Origin Story - Grid Layout */}
                <section className="container" style={{ marginBottom: '10rem' }}>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                        gap: '4rem',
                        alignItems: 'center'
                    }}>
                        {/* Text Content */}
                        <div className="animate-fade-in delay-100">
                            <h2 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>It Started With a Problem</h2>
                            <div style={{ color: 'var(--color-text-muted)', fontSize: '1.1rem', lineHeight: 1.8 }}>
                                <p style={{ marginBottom: '1.5rem' }}>
                                    Hi, I'm <strong>Spencer Starkey</strong>, the founder of ResellSEO.
                                </p>
                                <p style={{ marginBottom: '1.5rem' }}>
                                    Like many of you, I started reselling because I loved the thrill of the hunt. But as I scaled my eBay store, I hit a wall.
                                    I had great inventory, but my listings weren't getting the visibility they deserved.
                                    The items were there, but the buyers weren't finding them.
                                </p>
                                <p>
                                    I realized that selling online isn't just about having the product—it's about <strong>communicating its value</strong> to the search algorithms.
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
                                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <BadgeCheck size={20} color="var(--color-secondary)" />
                                        <span>E-commerce Consultant</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>

                {/* The "Secret Sauce" Section - 3 Column */}
                <section style={{ backgroundColor: 'var(--color-bg-surface)', padding: '8rem 0' }}>
                    <div className="container">
                        <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
                            <span className="badge">Why It Works</span>
                            <h2 style={{ fontSize: '2.5rem', fontWeight: 700 }}>The Perfect Intersection</h2>
                            <p style={{ color: 'var(--color-text-dim)', marginTop: '1rem' }}>Where academic theory meets street-smart selling.</p>
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
                                    <GraduationCap size={24} color="var(--color-primary)" />
                                </div>
                                <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Professional Marketing Background</h3>
                                <p style={{ color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                                    My Bachelor's degree gave me a deep understanding of SEO, keywords, and consumer psychology.
                                    I learned how search engines "think"—and I applied that knowledge directly to eBay's algorithm.
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
                                    <Store size={24} color="#38bdf8" />
                                </div>
                                <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Built in the Trenches</h3>
                                <p style={{ color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                                    I don't just write code; I pack boxes. Every feature in ResellSEO was built because I needed it myself.
                                    I know the pain of slow listing speeds and the frustration of "0 views" because I've lived it.
                                </p>
                            </div>

                            {/* Card 3 */}
                            <div className="card" style={{ height: '100%' }}>
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
                                <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Validated by Results</h3>
                                <p style={{ color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                                    I use this software daily on my own <strong>actual eBay store</strong>.
                                    Before I release a feature to you, it's already generated sales for me.
                                    This isn't just theory; it's practically applied revenue growth.
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
                            <h2 style={{ fontSize: '2rem', marginBottom: '2rem', fontFamily: 'serif', fontStyle: 'italic', color: 'var(--color-secondary)' }}>
                                "I built the tool that I wished existed when I started."
                            </h2>
                            <p style={{ color: 'var(--color-text-muted)', fontSize: '1.1rem', marginBottom: '3rem', maxWidth: '600px', margin: '0 auto 3rem' }}>
                                ResellSEO is the culmination of years of learning, testing, and selling.
                                It's designed to give you the same advantage that professional marketers have,
                                packaged for the busy reseller.
                            </p>

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
