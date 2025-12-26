import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import NewsletterForm from '@/components/NewsletterForm';

export default function BlogPage() {
    const categories = ['eBay Tips', 'SEO Strategy', 'AI & Reselling', 'Success Stories'];

    const blogPosts = [
        {
            title: "How to Double Your eBay Traffic with AI Titles",
            excerpt: "Learn the specific keyword structures that eBay's search algorithm loves and how to automate them.",
            date: "Dec 20, 2025",
            readTime: "5 min read",
            category: "SEO Strategy",
            slug: "double-ebay-traffic-ai-titles",
            image: "https://images.unsplash.com/photo-1557821552-17105176677c?auto=format&fit=crop&q=80&w=800"
        },
        {
            title: "The 2026 eBay Keyword Blueprint",
            excerpt: "Everything you need to know about changes to eBay search habits this coming year.",
            date: "Dec 18, 2025",
            readTime: "8 min read",
            category: "eBay Tips",
            slug: "2026-ebay-keyword-blueprint",
            image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800"
        },
        {
            title: "Why Resellers are Switching from Manual to AI Optimization",
            excerpt: "Time is money. Discover how automation is giving full-time resellers 10+ hours back per week.",
            date: "Dec 15, 2025",
            readTime: "6 min read",
            category: "AI & Reselling",
            slug: "manual-vs-ai-optimization",
            image: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&q=80&w=800"
        }
    ];

    return (
        <>
            <Navbar />

            <main style={{ minHeight: '100vh', paddingTop: '8rem', paddingBottom: '6rem' }}>
                <div className="container">
                    {/* Header */}
                    <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
                        <div className="badge animate-fade-in" style={{ marginBottom: '1rem' }}>ResellSEO Blog</div>
                        <h1 className="animate-fade-in" style={{
                            fontSize: 'max(3rem, 4vw)',
                            fontWeight: 800,
                            marginBottom: '1.5rem',
                            letterSpacing: '-0.02em'
                        }}>
                            Master the Art of <span className="text-gradient">Selling</span>
                        </h1>
                        <p className="animate-fade-in delay-100" style={{
                            color: 'var(--color-text-muted)',
                            fontSize: '1.2rem',
                            maxWidth: '600px',
                            marginInline: 'auto'
                        }}>
                            Expert insights on eBay SEO, reselling strategies, and leveraging AI to grow your business.
                        </p>
                    </div>

                    {/* Categories Filter (Visual only for now) */}
                    <div className="animate-fade-in delay-200" style={{
                        display: 'flex',
                        justifyContent: 'center',
                        gap: '0.75rem',
                        marginBottom: '4rem',
                        flexWrap: 'wrap'
                    }}>
                        {categories.map((cat) => (
                            <button key={cat} style={{
                                padding: '0.5rem 1.25rem',
                                borderRadius: '99px',
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid var(--color-border)',
                                color: 'var(--color-text-muted)',
                                fontSize: '0.9rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}>
                                {cat}
                            </button>
                        ))}
                    </div>

                    {/* Blog Grid */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
                        gap: '2.5rem'
                    }}>
                        {blogPosts.map((post, index) => (
                            <article key={post.slug} className={`card glass animate-fade-in delay-${(index + 3) * 100}`} style={{
                                display: 'flex',
                                flexDirection: 'column',
                                padding: 0,
                                overflow: 'hidden',
                                transition: 'transform 0.3s ease',
                                cursor: 'pointer'
                            }}>
                                <div style={{
                                    height: '220px',
                                    width: '100%',
                                    overflow: 'hidden',
                                    position: 'relative'
                                }}>
                                    <img
                                        src={post.image}
                                        alt={post.title}
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover',
                                            filter: 'brightness(0.8) contrast(1.2)'
                                        }}
                                    />
                                    <div style={{
                                        position: 'absolute',
                                        top: '1rem',
                                        left: '1rem',
                                        padding: '0.25rem 0.75rem',
                                        background: 'var(--color-primary)',
                                        color: 'white',
                                        borderRadius: '99px',
                                        fontSize: '0.75rem',
                                        fontWeight: 600
                                    }}>
                                        {post.category}
                                    </div>
                                </div>
                                <div style={{ padding: '2rem' }}>
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        fontSize: '0.8rem',
                                        color: 'var(--color-text-dim)',
                                        marginBottom: '1rem'
                                    }}>
                                        <span>{post.date}</span>
                                        <span>{post.readTime}</span>
                                    </div>
                                    <h2 style={{
                                        fontSize: '1.4rem',
                                        fontWeight: 700,
                                        marginBottom: '1rem',
                                        lineHeight: 1.3
                                    }}>
                                        {post.title}
                                    </h2>
                                    <p style={{
                                        color: 'var(--color-text-muted)',
                                        fontSize: '0.95rem',
                                        lineHeight: 1.6,
                                        marginBottom: '2rem'
                                    }}>
                                        {post.excerpt}
                                    </p>
                                    <Link href={`#`} style={{
                                        color: 'var(--color-primary)',
                                        textDecoration: 'none',
                                        fontSize: '0.95rem',
                                        fontWeight: 600,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem'
                                    }}>
                                        Read Article →
                                    </Link>
                                </div>
                            </article>
                        ))}
                    </div>

                    {/* CTA Section */}
                    <section style={{
                        marginTop: '8rem',
                        padding: '4rem',
                        borderRadius: 'var(--radius-lg)',
                        background: 'linear-gradient(135deg, rgba(156, 85, 213, 0.1), rgba(121, 40, 202, 0.05))',
                        border: '1px solid rgba(156, 85, 213, 0.2)',
                        textAlign: 'center'
                    }}>
                        <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '1rem' }}>Never Miss an Update</h2>
                        <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem' }}>Get the latest eBay SEO strategies delivered to your inbox.</p>
                        <NewsletterForm />
                    </section>
                </div>
            </main>

            <Footer />
        </>
    );
}
