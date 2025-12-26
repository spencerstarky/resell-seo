import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import TitleTicker from '@/components/TitleTicker';
import { Sparkles, Zap, BarChart3, ShieldCheck, Check, ArrowRight, Star, Quote } from 'lucide-react';

export default function Home() {
  return (
    <>
      <Navbar />

      {/* Hero Section */}
      <header style={{
        position: 'relative',
        overflow: 'hidden',
        padding: '8rem 0 6rem',
        textAlign: 'center'
      }}>
        {/* Background Glows */}
        <div style={{
          position: 'absolute',
          top: '-20%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '600px',
          height: '600px',
          background: 'radial-gradient(circle, rgba(156, 85, 213, 0.15) 0%, transparent 70%)',
          filter: 'blur(60px)',
          zIndex: -1
        }} />

        <div className="container animate-fade-in">
          <div className="badge">AI-Powered Optimization</div>
          <h1 style={{
            fontSize: 'max(4rem, 5vw)',
            fontWeight: 900,
            lineHeight: 1.1,
            marginBottom: '1.5rem',
            letterSpacing: '-0.02em',
            color: 'white'
          }}>
            Stop Guessing. <br />
            <span className="text-gradient">Start Selling.</span>
          </h1>
          <p style={{
            fontSize: '1.25rem',
            color: 'var(--color-text-muted)',
            marginBottom: '3rem',
            maxWidth: '650px',
            marginInline: 'auto',
            lineHeight: 1.6
          }}>
            ResellSEO uses advanced AI to rewrite your eBay titles for maximum visibility and clicks. Reach the top of the search results instantly.
          </p>

          <div style={{ display: 'flex', gap: '1.25rem', justifyContent: 'center' }}>
            <Link href="/login" className="btn btn-primary" style={{ fontSize: '1.1rem', padding: '1.25rem 2.5rem', boxShadow: '0 0 40px rgba(156, 85, 213, 0.4)' }}>
              Launch for Free <ArrowRight size={20} />
            </Link>
            <Link href="#pricing" className="btn btn-secondary" style={{ fontSize: '1.1rem', padding: '1.25rem 2.5rem' }}>
              View Pricing
            </Link>
          </div>

          {/* Dashboard Preview / Mockup */}
          <div style={{
            marginTop: '5rem',
            position: 'relative',
            padding: '1.5rem',
            background: 'rgba(255,255,255,0.02)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid rgba(255,255,255,0.05)',
            maxWidth: '900px',
            marginInline: 'auto',
            boxShadow: '0 20px 80px rgba(0,0,0,0.5)'
          }}>
            {/* Animated Title Ticker */}
            <TitleTicker />
          </div>
        </div>
      </header>

      {/* Trusted By Section */}
      <section style={{ padding: '4rem 0', borderTop: '1px solid rgba(255, 255, 255, 0.05)', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', background: 'rgba(255,255,255,0.01)' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--color-text-dim)', marginBottom: '2.5rem' }}>Proven results for sellers on</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '4rem', opacity: 0.5, filter: 'grayscale(100%) brightness(200%)' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 800 }}>eBay</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 800 }}>Mercari</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 800 }}>Poshmark</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 800 }}>Etsy</span>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="section-padding">
        <div className="container">
          <h2 className="section-title">Built for the <span className="text-gradient">Next Generation</span> of Sellers</h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            <div className="card glass animate-fade-in delay-100" style={{ padding: '2.5rem' }}>
              <div className="icon-btn" style={{ marginBottom: '1.5rem', width: '50px', height: '50px' }}>
                <Zap size={24} color="var(--color-primary)" />
              </div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Instant Bulk Rewrite</h3>
              <p style={{ color: 'var(--color-text-muted)', lineHeight: '1.6' }}>
                Upload 100 listings and watch the AI optimize them in seconds. No more manual keyword research or typing.
              </p>
            </div>

            <div className="card glass animate-fade-in delay-200" style={{ padding: '2.5rem' }}>
              <div className="icon-btn" style={{ marginBottom: '1.5rem', width: '50px', height: '50px' }}>
                <BarChart3 size={24} color="var(--color-secondary)" />
              </div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>SEO Algorithm Dominance</h3>
              <p style={{ color: 'var(--color-text-muted)', lineHeight: '1.6' }}>
                Our models are trained on eBay's "Cassini" search engine logic. We target the keywords that buyers are actually typing.
              </p>
            </div>

            <div className="card glass animate-fade-in delay-300" style={{ padding: '2.5rem' }}>
              <div className="icon-btn" style={{ marginBottom: '1.5rem', width: '50px', height: '50px' }}>
                <ShieldCheck size={24} color="var(--color-accent)" />
              </div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Risk-Free Imports</h3>
              <p style={{ color: 'var(--color-text-muted)', lineHeight: '1.6' }}>
                We preserve every field in your original CSV. Export your data knowing your prices, SKUs, and Item IDs are 100% safe.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="section-padding" style={{ background: 'rgba(156, 85, 213, 0.02)' }}>
        <div className="container">
          <h2 className="section-title">Simple, Transparent <span className="text-gradient">Pricing</span></h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 400px))', gap: '2rem', justifyContent: 'center' }}>
            {/* Free Tier */}
            <div className="card glass" style={{ padding: '3rem 2.5rem', position: 'relative' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Starter</h3>
              <div style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '2rem' }}>$0 <span style={{ fontSize: '1rem', color: 'var(--color-text-dim)', fontWeight: 400 }}>/ month</span></div>

              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '3rem' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.95rem' }}><Check size={18} color="#4caf50" /> 50 Optimizations / Month</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.95rem' }}><Check size={18} color="#4caf50" /> CSV Upload Support</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.95rem' }}><Check size={18} color="#4caf50" /> Standard AI Model</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.95rem', opacity: 0.5 }}><Check size={18} /> Priority Support</li>
              </ul>

              <Link href="/login" className="btn btn-secondary" style={{ width: '100%' }}>Get Started</Link>
            </div>

            {/* Pro Tier */}
            <div className="card glass" style={{
              padding: '3rem 2.5rem',
              border: '2px solid var(--color-primary)',
              position: 'relative',
              boxShadow: '0 0 40px rgba(156, 85, 213, 0.15)'
            }}>
              <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'var(--color-primary)', color: 'white', padding: '0.25rem 0.75rem', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 700 }}>MOST POPULAR</div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Pro</h3>
              <div style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '2rem' }}>$19 <span style={{ fontSize: '1rem', color: 'var(--color-text-dim)', fontWeight: 400 }}>/ month</span></div>

              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '3rem' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.95rem' }}><Check size={18} color="#4caf50" /> Unlimited Optimizations</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.95rem' }}><Check size={18} color="#4caf50" /> Priority API Access (Faster)</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.95rem' }}><Check size={18} color="#4caf50" /> Premium "Big Brain" Models</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.95rem' }}><Check size={18} color="#4caf50" /> Priority Email Support</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.95rem' }}><Check size={18} color="#4caf50" /> Direct eBay Push (Coming Soon)</li>
              </ul>

              <Link href="/login" className="btn btn-primary" style={{ width: '100%', boxShadow: '0 4px 20px rgba(156, 85, 213, 0.4)' }}>Upgrade to Pro</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section style={{ padding: '8rem 0', textAlign: 'center' }}>
        <div className="container">
          <h2 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1.5rem' }}>Ready to Crush Your Competition?</h2>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '3rem', fontSize: '1.2rem' }}>Join hundreds of sellers who have already optimized their stores.</p>
          <Link href="/login" className="btn btn-primary" style={{ fontSize: '1.1rem', padding: '1.25rem 3rem' }}>
            Start Your Free Trial Now
          </Link>
        </div>
      </section>

      <Footer />
    </>
  );
}
