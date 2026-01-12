import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import NewsletterForm from '@/components/NewsletterForm';
import { createClient } from '@supabase/supabase-js';

// Admin client to fetch posts
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const revalidate = 60; // ISR: Revalidate every 60 seconds

export default async function BlogPage() {
    const categories = ['eBay Tips', 'SEO Strategy', 'AI & Reselling', 'Success Stories'];

    // Fetch posts from DB
    const { data: posts } = await supabaseAdmin
        .from('posts')
        .select('*')
        .order('published_at', { ascending: false });

    // Fallback if no posts exist yet (so the page isn't empty broken)
    const displayPosts = (posts && posts.length > 0) ? posts : [
        // Placeholder for demo until they migrate
        {
            title: "Welcome to our new Blog!",
            excerpt: "We are migrating our best content. Check back soon for expert eBay tips.",
            published_at: new Date().toISOString(),
            category: "Announcement",
            slug: "#",
            image_url: "https://images.unsplash.com/photo-1557821552-17105176677c?auto=format&fit=crop&q=80&w=800"
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
                        {displayPosts.map((post: any, index: number) => (
                            <Link key={post.slug || index} href={`/blog/${post.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                <article className={`card glass animate-fade-in delay-${(index + 3) * 100}`} style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    padding: 0,
                                    overflow: 'hidden',
                                    transition: 'transform 0.3s ease',
                                    cursor: 'pointer',
                                    height: '100%'
                                }}>
                                    <div style={{
                                        height: '220px',
                                        width: '100%',
                                        overflow: 'hidden',
                                        position: 'relative'
                                    }}>
                                        <img
                                            src={post.image_url || "https://via.placeholder.com/800x400"}
                                            alt={post.title}
                                            style={{
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'cover',
                                                filter: 'brightness(0.8) contrast(1.2)'
                                            }}
                                        />
                                        {post.category && (
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
                                        )}
                                    </div>
                                    <div style={{ padding: '2rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            fontSize: '0.8rem',
                                            color: 'var(--color-text-dim)',
                                            marginBottom: '1rem'
                                        }}>
                                            <span>{new Date(post.published_at).toLocaleDateString()}</span>
                                            <span>5 min read</span>
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
                                            marginBottom: '2rem',
                                            flex: 1
                                        }}>
                                            {post.excerpt}
                                        </p>
                                        <span style={{
                                            color: 'var(--color-primary)',
                                            textDecoration: 'none',
                                            fontSize: '0.95rem',
                                            fontWeight: 600,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem'
                                        }}>
                                            Read Article →
                                        </span>
                                    </div>
                                </article>
                            </Link>
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
