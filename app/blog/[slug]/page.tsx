import { createClient } from '@supabase/supabase-js';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { ArrowLeft, Calendar, Clock } from 'lucide-react';
import { notFound } from 'next/navigation';

// Admin client to fetch posts (SSG/SSR)
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// This ensures the page is dynamic
export const revalidate = 60; // Revalidate every minute

export default async function BlogPost({ params }: { params: { slug: string } }) {
    const { slug } = params;

    // Fetch post from Supabase
    const { data: post, error } = await supabaseAdmin
        .from('posts')
        .select('*')
        .eq('slug', slug)
        .single();

    if (error || !post) {
        // Fallback or 404
        return notFound();
    }

    // Format date
    const date = new Date(post.published_at).toLocaleDateString();

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <Navbar />

            <main style={{ flex: 1, paddingTop: '6rem', paddingBottom: '6rem' }}>
                <article className="container" style={{ maxWidth: '800px' }}>
                    {/* Back Link */}
                    <Link href="/blog" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>
                        <ArrowLeft size={16} /> Back to Blog
                    </Link>

                    {/* Header */}
                    <div style={{ marginBottom: '3rem', textAlign: 'center' }}>
                        {post.category && (
                            <span className="badge" style={{ marginBottom: '1rem' }}>{post.category}</span>
                        )}
                        <h1 style={{ fontSize: 'max(2rem, 3.5vw)', fontWeight: 800, marginBottom: '1.5rem', lineHeight: 1.2 }}>
                            {post.title}
                        </h1>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', color: 'var(--color-text-dim)', fontSize: '0.9rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Calendar size={16} />
                                <span>{date}</span>
                            </div>
                            {/* Read Time could be calculated from word count ideally */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Clock size={16} />
                                <span>5 min read</span>
                            </div>
                        </div>
                    </div>

                    {/* Featured Image */}
                    {post.image_url && (
                        <div style={{ marginBottom: '3rem', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
                            <img src={post.image_url} alt={post.title} style={{ width: '100%', height: 'auto', display: 'block' }} />
                        </div>
                    )}

                    {/* Content */}
                    <div
                        className="blog-content"
                        style={{ fontSize: '1.1rem', lineHeight: 1.8, color: 'var(--color-text-main)' }}
                        dangerouslySetInnerHTML={{ __html: post.content }}
                    />

                </article>
            </main>

            <Footer />

            {/* Simple CSS for the blog content readability */}
            <style>{`
                .blog-content h2 { font-size: 1.8rem; font-weight: 700; margin-top: 3rem; margin-bottom: 1rem; color: white; }
                .blog-content h3 { font-size: 1.4rem; font-weight: 600; margin-top: 2rem; margin-bottom: 0.75rem; color: white; }
                .blog-content p { margin-bottom: 1.5rem; color: var(--color-text-dim); }
                .blog-content ul, .blog-content ol { margin-bottom: 1.5rem; padding-left: 1.5rem; color: var(--color-text-dim); }
                .blog-content li { margin-bottom: 0.5rem; }
                .blog-content a { color: var(--color-primary); text-decoration: underline; }
                .blog-content img { max-width: 100%; border-radius: 8px; margin: 2rem 0; }
                .blog-content blockquote { border-left: 4px solid var(--color-primary); padding-left: 1rem; font-style: italic; color: var(--color-text-muted); margin: 2rem 0; }
            `}</style>
        </div>
    );
}
