import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function AboutPage() {
    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <Navbar />
            <main className="container" style={{ padding: '6rem 1rem', maxWidth: '800px', flex: 1 }}>
                <h1 style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '2rem' }}>About ResellSEO</h1>

                <div style={{ lineHeight: '1.8', color: 'var(--color-text-dim)', fontSize: '1.1rem' }}>
                    <p style={{ marginBottom: '1.5rem' }}>
                        Welcome to <strong>ResellSEO</strong>. We are dedicated to helping online resellers
                        maximize their sales through intelligent data optimization.
                    </p>

                    <p style={{ marginBottom: '1.5rem' }}>
                        Selling on marketplaces like eBay requires more than just good products;
                        it requires visibility. Our tools are designed to surface your listings to
                        the right buyers at the right time.
                    </p>

                    <h2 style={{ fontSize: '2rem', fontWeight: 700, marginTop: '3rem', marginBottom: '1rem', color: 'var(--color-text-main)' }}>Our Mission</h2>
                    <p style={{ marginBottom: '1.5rem' }}>
                        To provide professional-grade SEO tools that are accessible, easy to use,
                        and powerful enough to make a real difference in your bottom line.
                    </p>

                    <h2 style={{ fontSize: '2rem', fontWeight: 700, marginTop: '3rem', marginBottom: '1rem', color: 'var(--color-text-main)' }}>Get in Touch</h2>
                    <p>
                        Have questions or suggestions? We'd love to hear from you.
                        <br />
                        <Link href="/contact" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>
                            Contact our support team
                        </Link>.
                    </p>
                </div>
            </main>
            <Footer />
        </div>
    );
}
