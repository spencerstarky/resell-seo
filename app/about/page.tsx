import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function AboutPage() {
    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <Navbar />

            <main className="container" style={{
                paddingTop: '8rem',
                paddingBottom: '8rem',
                maxWidth: '800px',
                flex: 1
            }}>
                {/* Header */}
                <div style={{ marginBottom: '4rem', textAlign: 'center' }}>
                    <span className="badge">About Us</span>
                    <h1 className="text-gradient" style={{ fontSize: 'clamp(2.5rem, 5vw, 3.5rem)', fontWeight: 800, marginTop: '1.5rem', lineHeight: 1.2 }}>
                        Built by a Reseller,<br />for Resellers.
                    </h1>
                </div>

                {/* Main Content */}
                <div style={{ fontSize: '1.2rem', lineHeight: 1.8, color: 'var(--color-text-muted)' }}>

                    <p style={{ marginBottom: '2rem' }}>
                        ResellSEO was created to solve a problem I ran into every single day as an active eBay reseller: <strong style={{ color: 'var(--color-text-main)' }}>great products don’t sell if they can’t be found.</strong>
                    </p>

                    <p style={{ marginBottom: '4rem' }}>
                        After years of sourcing, photographing, listing, and shipping thousands of items, I realized that success on marketplaces like eBay isn’t just about having good inventory, it’s about search visibility. Titles matter. Keywords matter. Structure matters. And yet, most resellers are left guessing.
                        <br /><br />
                        <span style={{ color: 'var(--color-primary)', fontWeight: 600, fontSize: '1.3rem' }}>ResellSEO exists to remove that guesswork.</span>
                    </p>

                    <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '4rem 0' }} />

                    <h2 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-text-main)', marginBottom: '1.5rem', lineHeight: 1.3 }}>
                        The Founder: Where Marketing Meets Real-World Reselling
                    </h2>

                    <p style={{ marginBottom: '2rem' }}>
                        I’m the founder of ResellSEO, a full-time reseller turned product builder with a Bachelor’s degree in Digital Marketing and years of hands-on eBay business experience.
                    </p>

                    <p style={{ marginBottom: '2rem' }}>
                        My background in digital marketing taught me how search engines work, how keywords, structure, relevance, and intent influence visibility. My years as a reseller taught me the real constraints sellers face: limited time, inconsistent data, messy item specifics, and constantly changing trends.
                    </p>

                    {/* Intersection Box */}
                    <div className="card glass" style={{ padding: '2.5rem', margin: '3rem 0' }}>
                        <h3 style={{ fontSize: '1.4rem', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '1.5rem' }}>
                            ResellSEO sits at the intersection of those two worlds:
                        </h3>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                            <li style={{ marginBottom: '1rem', display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                                <span style={{ color: 'var(--color-primary)', fontSize: '1.5rem', lineHeight: 1 }}>•</span>
                                <span>
                                    <strong style={{ color: 'var(--color-text-main)' }}>Marketing theory</strong>
                                    <br />
                                    (SEO, keyword intent, search optimization)
                                </span>
                            </li>
                            <li style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                                <span style={{ color: 'var(--color-secondary)', fontSize: '1.5rem', lineHeight: 1 }}>•</span>
                                <span>
                                    <strong style={{ color: 'var(--color-text-main)' }}>Marketplace reality</strong>
                                    <br />
                                    (thrifted inventory, inconsistent tags, limited product info)
                                </span>
                            </li>
                        </ul>
                    </div>

                    <p style={{ marginBottom: '5rem' }}>
                        This product wasn’t built in a vacuum. It was built inside my actual eBay store.
                    </p>

                    {/* Footer/Quote Section */}
                    <div style={{ textAlign: 'center' }}>
                        <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--color-text-main)', marginBottom: '1.5rem' }}>
                            Built in Production, Not in Theory
                        </h2>
                        <p style={{
                            fontSize: '1.5rem',
                            fontStyle: 'italic',
                            color: 'var(--color-primary)',
                            maxWidth: '600px',
                            margin: '0 auto 3rem',
                            lineHeight: 1.4
                        }}>
                            "Every feature in ResellSEO exists because I needed it myself."
                        </p>
                        <Link href="/dashboard" className="btn btn-primary" style={{ padding: '1rem 3rem', fontSize: '1.1rem' }}>
                            Get Started
                        </Link>
                    </div>

                </div>
            </main>

            <Footer />
        </div>
    );
}
