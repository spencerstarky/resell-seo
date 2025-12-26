import Link from 'next/link';

export default function Footer() {
    return (
        <footer style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)', padding: '5rem 2rem', background: 'var(--color-bg-base)' }}>
            <div className="container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '3rem' }}>
                <div>
                    <h3 className="text-gradient" style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>ResellSEO</h3>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', lineHeight: '1.6' }}>
                        The #1 SEO tool for professional eBay sellers. Optimize titles, reach more buyers, and sell faster.
                    </p>
                </div>
                <div>
                    <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.5rem' }}>Product</h4>
                    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                        <li><Link href="#features">Features</Link></li>
                        <li><Link href="#pricing">Pricing</Link></li>
                        <li><Link href="/dashboard">Dashboard</Link></li>
                    </ul>
                </div>
                <div>
                    <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.5rem' }}>Resources</h4>
                    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                        <li><Link href="/blog">Blog</Link></li>
                        <li><Link href="#">Seller Guide</Link></li>
                        <li><Link href="#">eBay Algorithm Secrets</Link></li>
                        <li><Link href="#">Support</Link></li>
                    </ul>
                </div>
                <div>
                    <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.5rem' }}>Legal</h4>
                    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                        <li><Link href="#">Privacy Policy</Link></li>
                        <li><Link href="#">Terms of Service</Link></li>
                    </ul>
                </div>
            </div>
            <div className="container" style={{ marginTop: '4rem', paddingTop: '2rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)', textAlign: 'center', color: 'var(--color-text-dim)', fontSize: '0.8rem' }}>
                &copy; {new Date().getFullYear()} ResellSEO. Built for power sellers.
            </div>
        </footer>
    );
}
