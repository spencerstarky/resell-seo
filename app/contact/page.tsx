import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Mail, Clock } from 'lucide-react';

export default function ContactPage() {
    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <Navbar />
            <main className="container animate-fade-in" style={{ padding: '6rem 1rem', maxWidth: '800px', flex: 1, textAlign: 'center' }}>
                <h1 style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '1.5rem' }}>Contact Us</h1>
                <p style={{ fontSize: '1.25rem', color: 'var(--color-text-muted)', marginBottom: '4rem', maxWidth: '600px', marginInline: 'auto' }}>
                    We're here to help you sell more. If you have any questions, issues, or feedback, please reach out.
                </p>

                <div className="card glass" style={{ maxWidth: '500px', margin: '0 auto', padding: '3rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
                    <div style={{ width: 60, height: 60, background: 'rgba(156, 85, 213, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Mail size={30} style={{ color: 'var(--color-primary)' }} />
                    </div>

                    <div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Email Support</h2>
                        <a href="mailto:resellseo.app@gmail.com" style={{ fontSize: '1.25rem', color: 'var(--color-primary)', textDecoration: 'underline' }}>
                            resellseo.app@gmail.com
                        </a>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-dim)', fontSize: '0.9rem', marginTop: '1rem' }}>
                        <Clock size={16} />
                        <span>We typically reply within 24 hours.</span>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
