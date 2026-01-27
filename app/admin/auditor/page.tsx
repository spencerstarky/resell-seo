'use client';

import React, { useState } from 'react';
import { ArrowLeft, Search, Loader2, Sparkles, AlertCircle, Copy, Check, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ListingAuditorPage() {
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);

    const handleAudit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setResult(null);

        // Extract ID from URL if valid
        let itemId = input.trim();
        const urlMatch = itemId.match(/\/itm\/(\d+)/) || itemId.match(/item=(\d+)/);
        if (urlMatch) {
            itemId = urlMatch[1];
        }

        if (!/^\d+$/.test(itemId)) {
            setError('Invalid Item ID. Please enter a numerical ID or a valid specific eBay URL.');
            setLoading(false);
            return;
        }

        try {
            const res = await fetch('/api/optimize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    itemId: itemId,
                    auditMode: true // Special flag to use Client Credentials
                })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Optimization failed');
            }

            const data = await res.json();
            setResult(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        if (result?.optimizedTitle) {
            navigator.clipboard.writeText(result.optimizedTitle);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div style={{ padding: '3rem', maxWidth: '1200px', margin: '0 auto', color: '#fff', minHeight: '100vh' }}>
            {/* Header */}
            <div style={{ marginBottom: '3rem' }}>
                <Link href="/admin" style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--color-primary)', textDecoration: 'none', marginBottom: '1rem', fontSize: '0.9rem', fontWeight: 600 }}>
                    <ArrowLeft size={16} style={{ marginRight: '0.5rem' }} /> Back to Dashboard
                </Link>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>
                    Public Listing Auditor
                </h1>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '1.1rem', maxWidth: '600px' }}>
                    Test the AI Optimizer on ANY live eBay listing without importing it.
                    Uses the live production logic (Visuals, Style Codes, Trends).
                </p>
            </div>

            {/* Input Section */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)', borderRadius: '24px', padding: '2rem', marginBottom: '2rem' }}>
                <form onSubmit={handleAudit} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '300px' }}>
                        <input
                            type="text"
                            placeholder="Paste eBay URL or Item ID (e.g. 1234567890)"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '1rem 1.5rem',
                                borderRadius: '12px',
                                border: '1px solid rgba(255,255,255,0.1)',
                                background: 'rgba(0,0,0,0.3)',
                                color: '#fff',
                                fontSize: '1.1rem',
                                outline: 'none'
                            }}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading || !input}
                        style={{
                            padding: '0 2rem',
                            height: '60px',
                            borderRadius: '12px',
                            border: 'none',
                            background: 'var(--color-primary)',
                            color: '#fff',
                            fontSize: '1.1rem',
                            fontWeight: 600,
                            cursor: loading ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            opacity: loading ? 0.7 : 1
                        }}
                    >
                        {loading ? <Loader2 className="animate-spin" size={24} /> : <Sparkles size={24} />}
                        {loading ? 'Analyzing...' : 'Run Audit'}
                    </button>
                </form>
                {error && (
                    <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <AlertCircle size={20} />
                        {error}
                    </div>
                )}
            </div>

            {/* Results Section */}
            {result && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>

                    {/* Column 1: Titles & Analysis */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {/* Optimized Title Card */}
                        <div style={{ background: 'linear-gradient(145deg, rgba(76, 175, 80, 0.1), rgba(76, 175, 80, 0.02))', border: '1px solid rgba(76, 175, 80, 0.3)', borderRadius: '20px', padding: '2rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                <h3 style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', color: '#4caf50', fontWeight: 700 }}>AI Optimized Result</h3>
                                <button onClick={handleCopy} style={{ background: 'transparent', border: 'none', color: copied ? '#4caf50' : 'rgba(255,255,255,0.5)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                                    {copied ? <Check size={16} /> : <Copy size={16} />}
                                    {copied ? 'Copied' : 'Copy'}
                                </button>
                            </div>
                            <div style={{ fontSize: '1.4rem', fontWeight: 600, lineHeight: 1.4, color: '#fff' }}>
                                {result.optimizedTitle}
                            </div>
                            <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
                                <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)' }}>
                                    {result.optimizedTitle.length} chars
                                </span>
                            </div>
                        </div>

                        {/* Comparison - Original */}
                        <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>Original Title</h3>
                            <div style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.4 }}>
                                {result.originalTitle || 'N/A'}
                            </div>
                            <a href={`https://www.ebay.com/itm/${input.match(/(\d+)/)?.[0] || input}`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem', color: 'var(--color-primary)', fontSize: '0.9rem', textDecoration: 'none' }}>
                                View on eBay <ExternalLink size={14} />
                            </a>
                        </div>

                        {/* Debug / Info */}
                        {result.fromCache && (
                            <div style={{ padding: '0.75rem 1rem', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '12px', color: '#fbbf24', fontSize: '0.9rem' }}>
                                ⚡ Result served from cache
                            </div>
                        )}
                    </div>

                    {/* Column 2: Visual Context */}
                    <div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>Visual Context ({result.analyzedImages?.length || 0})</h3>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                            gap: '0.5rem',
                            background: 'rgba(0,0,0,0.2)',
                            padding: '1rem',
                            borderRadius: '16px'
                        }}>
                            {result.analyzedImages && result.analyzedImages.length > 0 ? (
                                result.analyzedImages.slice(0, 12).map((imgUrl: string, idx: number) => (
                                    <div key={idx} style={{ position: 'relative', aspectRatio: '1/1', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                                        <img src={imgUrl} alt={`Analyzed ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        <div style={{ position: 'absolute', top: 2, left: 2, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '10px', padding: '2px 6px', borderRadius: '4px' }}>
                                            #{idx + 1}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div style={{ gridColumn: '1 / -1', padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
                                    No images processed.
                                </div>
                            )}
                        </div>

                        {/* Item Specifics Dump */}
                        <div style={{ marginTop: '2rem' }}>
                            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-text-muted)' }}>Analyzed specificS</h3>
                            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '12px', fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', wordBreak: 'break-word', maxHeight: '200px', overflowY: 'auto' }}>
                                {result.itemSpecifics || 'None provided'}
                            </div>
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
}
