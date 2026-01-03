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
          <h2 className="section-title">Simple Pricing for <span className="text-gradient">eBay Sellers</span></h2>
          <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', marginBottom: '4rem', fontSize: '1.2rem' }}>
            Choose the plan that matches how you work.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', justifyContent: 'center', marginBottom: '4rem' }}>

            {/* Free: Try It Out */}
            <div className="card glass" style={{ padding: '3rem 2rem', display: 'flex', flexDirection: 'column' }}>
              <div style={{ marginBottom: 'auto' }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Free</h3>
                <p style={{ color: 'var(--color-text-dim)', marginBottom: '1.5rem', fontWeight: 500 }}>Try It Out</p>
                <div style={{ fontSize: '1rem', color: 'var(--color-text-muted)', marginBottom: '2rem', fontStyle: 'italic' }}>
                  "Optimize a few listings. See the results."
                </div>

                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.95rem' }}><Check size={18} color="#4caf50" /> Optimize up to 25 eBay titles</li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.95rem' }}><Check size={18} color="#4caf50" /> Upload & download via CSV</li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.95rem' }}><Check size={18} color="#4caf50" /> See before / after title changes</li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.95rem' }}><Check size={18} color="#4caf50" /> No credit card required</li>
                </ul>

                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '2rem' }}>
                  <strong>Best for:</strong><br /> Sellers who want to test title quality before committing.
                </div>
              </div>

              <Link href="/login" className="btn btn-secondary" style={{ width: '100%', textAlign: 'center' }}>Get started free</Link>
            </div>

            {/* Starter: Manual but Powerful */}
            <div className="card glass" style={{ padding: '3rem 2rem', display: 'flex', flexDirection: 'column' }}>
              <div style={{ marginBottom: 'auto' }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Starter</h3>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1.5rem' }}>$19 <span style={{ fontSize: '1rem', color: 'var(--color-text-dim)', fontWeight: 400 }}> / month</span></div>
                <div style={{ fontSize: '1rem', color: 'var(--color-text-muted)', marginBottom: '2rem' }}>
                  Bulk optimize listings with a simple CSV workflow.
                </div>

                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.95rem' }}><Check size={18} color="#4caf50" /> Optimize up to 400 titles/mo</li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.95rem' }}><Check size={18} color="#4caf50" /> Upload CSVs (50 listings/batch)</li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.95rem' }}><Check size={18} color="#4caf50" /> Download optimized titles</li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.95rem' }}><Check size={18} color="#4caf50" /> Full control before uploading</li>
                </ul>

                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '2rem' }}>
                  <strong>Best for:</strong><br /> Part-time and growing sellers optimizing listings in smaller batches.
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', textAlign: 'center', marginBottom: '1rem' }}>No features locked. No account connection required.</p>
              </div>

              <Link href="/login" className="btn btn-secondary" style={{ width: '100%', textAlign: 'center', background: 'rgba(255,255,255,0.1)' }}>Upgrade to Starter</Link>
            </div>

            {/* Pro: Automation */}
            <div className="card glass" style={{
              padding: '3rem 2rem',
              display: 'flex',
              flexDirection: 'column',
              border: '2px solid var(--color-primary)',
              boxShadow: '0 0 40px rgba(156, 85, 213, 0.15)',
              position: 'relative'
            }}>
              <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'var(--color-primary)', color: 'white', padding: '0.25rem 0.75rem', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 700 }}>RECOMMENDED</div>
              <div style={{ marginBottom: 'auto' }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Pro</h3>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1.5rem' }}>$59 <span style={{ fontSize: '1rem', color: 'var(--color-text-dim)', fontWeight: 400 }}> / month</span></div>
                <div style={{ fontSize: '1rem', color: 'var(--color-text-muted)', marginBottom: '2rem' }}>
                  Update live eBay listings in minutes — <b>no CSVs required.</b>
                </div>

                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.95rem' }}><Check size={18} color="var(--color-primary)" /> <b>Connect eBay Account Securely</b></li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.95rem' }}><Check size={18} color="var(--color-primary)" /> <b>Pull listings directly from eBay</b></li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.95rem' }}><Check size={18} color="var(--color-primary)" /> <b>Push updates live (1-Click)</b></li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.95rem' }}><Check size={18} color="#4caf50" /> Optimize up to 1,200 titles/mo</li>
                </ul>

                <div style={{ background: 'rgba(156, 85, 213, 0.1)', padding: '1rem', borderRadius: '8px', fontSize: '0.85rem', color: 'white', marginBottom: '2rem', border: '1px solid rgba(156, 85, 213, 0.3)' }}>
                  <strong>Best for:</strong><br /> High-volume sellers who want speed, automation, and zero manual work.
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', textAlign: 'center', marginBottom: '1rem' }}>Save hours every month. Never touch a CSV again.</p>
              </div>

              <Link href="/login" className="btn btn-primary" style={{ width: '100%', textAlign: 'center', boxShadow: '0 4px 20px rgba(156, 85, 213, 0.4)' }}>Upgrade to Pro</Link>
            </div>
          </div>

          {/* Micro-Copy */}
          <div style={{ textAlign: 'center', color: 'var(--color-text-dim)', fontSize: '0.9rem', marginBottom: '5rem' }}>
            <p>🔒 Early access pricing — lock it in before public launch. Prices may increase as new features are added.</p>
          </div>

          {/* Why Sellers Choose Pro */}
          <div style={{ maxWidth: '800px', margin: '0 auto', marginBottom: '6rem', padding: '3rem', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <h3 style={{ textAlign: 'center', fontSize: '2rem', marginBottom: '2rem' }}>Why Sellers Choose <span className="text-gradient">Pro</span></h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{ background: 'rgba(76, 175, 80, 0.1)', padding: '0.5rem', borderRadius: '50%' }}><Check size={20} color="#4caf50" /></div>
                <div>
                  <h4 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>No files to manage</h4>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>No exporting CSVs, editing in Excel, and re-uploading. It all happens in the app.</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{ background: 'rgba(76, 175, 80, 0.1)', padding: '0.5rem', borderRadius: '50%' }}><Check size={20} color="#4caf50" /></div>
                <div>
                  <h4 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Fewer Mistakes</h4>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Direct integration reduces the risk of messing up SKU data or prices during CSV import.</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{ background: 'rgba(76, 175, 80, 0.1)', padding: '0.5rem', borderRadius: '50%' }}><Check size={20} color="#4caf50" /></div>
                <div>
                  <h4 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Faster Updates</h4>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Push 50 listings live in the time it takes to download one CSV file.</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{ background: 'rgba(76, 175, 80, 0.1)', padding: '0.5rem', borderRadius: '50%' }}><Check size={20} color="#4caf50" /></div>
                <div>
                  <h4 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Real Workflow</h4>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Built for the daily grind of high-volume reselling.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Not Sure Yet? */}
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Not Sure Yet?</h3>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>Start free. Upgrade when you’re ready. Your work stays saved — switching plans takes seconds.</p>
            <Link href="/login" style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'underline' }}>Create a Free Account →</Link>
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
