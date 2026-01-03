'use client';

import { useState, useRef } from 'react';
import { Upload, FileText, Trash2, Download, Monitor, RefreshCw, Loader2, Lock } from 'lucide-react';
import Papa from 'papaparse';
import ListingEditor from './ListingEditor';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface DashboardClientProps {
    initialIsConnected: boolean;
    authUrl: string;
    userProfile: any;
    initialListings?: any[];
    userId: string;
    userEmail?: string;
}

export default function DashboardClient({ initialIsConnected, authUrl, userProfile, initialListings = [], userId, userEmail }: DashboardClientProps) {
    const isPro = userProfile?.plan_tier === 'pro' || userEmail === 'resellseo@gmail.com';

    const [mode, setMode] = useState<'empty' | 'upload' | 'ebay'>(
        initialListings.length > 0 ? 'upload' : (initialIsConnected && isPro ? 'ebay' : 'empty')
    );
    const [listings, setListings] = useState(initialListings);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        Papa.parse(file, {
            header: true,
            complete: (results) => {
                const parsedListings = results.data
                    .filter((row: any) => row.title && row.title.trim())
                    .map((row: any, index: number) => ({
                        id: crypto.randomUUID(), // Generate UUID for new CSV item
                        title: row.title || row.Title || '',
                        original_title: row.title || row.Title || '',
                        optimized_title: null,
                        source: 'csv',
                    }));

                setListings(parsedListings);
                setMode('upload');
            },
            error: (error) => {
                console.error('CSV Parse Error:', error);
                alert('Failed to parse CSV file. Please check the format.');
            },
        });
    };

    const handleConnectEbay = () => {
        if (!isPro) {
            // Optional: Redirect to pricing or show modal
            alert("Upgrade to Pro to connect your eBay account!");
            return;
        }
        if (authUrl) {
            window.open(authUrl, '_blank');
        } else {
            console.error('Auth URL is not available');
            alert('Unable to connect to eBay. Please try again later.');
        }
    };

    const handleClearListings = () => {
        setListings([]);
        setMode('empty');
    };

    const [fetching, setFetching] = useState(false);

    const handleFetchEbay = async () => {
        setFetching(true);
        try {
            const res = await fetch('/api/ebay/fetch', { method: 'POST' });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Failed to fetch items');

            // Deduplication & UUID Assignment
            const ebayIds = data.listings.map((l: any) => l.ebay_item_id);
            let idMap = new Map<string, string>();

            if (ebayIds.length > 0 && userId) {
                const { data: existing } = await supabase
                    .from('listings')
                    .select('id, ebay_item_id')
                    .eq('user_id', userId)
                    .in('ebay_item_id', ebayIds);

                if (existing) {
                    existing.forEach((row: any) => {
                        idMap.set(row.ebay_item_id, row.id);
                    });
                }
            }

            const ebayListings = data.listings.map((item: any) => ({
                id: idMap.get(item.ebay_item_id) || crypto.randomUUID(), // Use existing or Generate New UUID
                original_title: item.title,
                optimized_title: null,
                source: 'ebay',
                ebay_item_id: item.ebay_item_id,
                image_url: item.image_url
            }));

            if (ebayListings.length === 0) {
                alert('No active listings found on your eBay account.');
            } else {
                setListings(ebayListings);
            }
        } catch (e: any) {
            console.error(e);
            alert('Error fetching listings: ' + e.message);
        }
        setFetching(false);
    };

    if (mode === 'empty') {
        return (
            <div className="container" style={{ padding: '2rem 0' }}>
                <h2 style={{ marginBottom: '2rem', textAlign: 'center' }}>Choose an Import Method</h2>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
                    {/* Option 1: CSV Upload (Always Active) */}
                    <div style={{
                        padding: '2.5rem',
                        background: 'var(--color-card-bg)',
                        borderRadius: 'var(--border-radius-lg)',
                        border: '1px solid var(--color-border)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'transform 0.2s, border-color 0.2s'
                    }}
                        onClick={() => setMode('upload')}
                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = 'var(--color-primary)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--color-border)'; }}
                    >
                        <div style={{ width: 64, height: 64, background: 'rgba(255, 255, 255, 0.05)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                            <FileText size={32} style={{ color: 'var(--color-text)' }} />
                        </div>
                        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>Upload CSV File</h3>
                        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                            Upload your listings via CSV. Free & Starter supported.
                        </p>
                        <button className="btn btn-secondary" style={{ width: '100%' }}>Select CSV</button>
                    </div>

                    {/* Option 2: eBay Connect (Pro Only) */}
                    <div style={{
                        padding: '2.5rem',
                        background: isPro ? 'var(--color-card-bg)' : 'rgba(156, 85, 213, 0.05)',
                        borderRadius: 'var(--border-radius-lg)',
                        border: isPro ? '1px solid var(--color-border)' : '1px solid rgba(156, 85, 213, 0.2)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center',
                        cursor: isPro ? 'pointer' : 'default',
                        transition: 'transform 0.2s, border-color 0.2s',
                        position: 'relative',
                        opacity: isPro ? 1 : 0.9
                    }}
                        onClick={() => {
                            if (isPro) {
                                if (initialIsConnected) {
                                    setMode('ebay');
                                } else {
                                    handleConnectEbay();
                                }
                            }
                        }}
                        onMouseEnter={(e) => { if (isPro) { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = 'var(--color-secondary)'; } }}
                        onMouseLeave={(e) => { if (isPro) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--color-border)'; } }}
                    >
                        {!isPro && (
                            <div style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'var(--color-primary)', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <Lock size={12} /> PRO
                            </div>
                        )}
                        <div style={{ width: 64, height: 64, background: isPro ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255,255,255,0.05)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                            <Monitor size={32} style={{ color: isPro ? '#4caf50' : 'var(--color-text-muted)' }} />
                        </div>
                        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>Import from eBay</h3>
                        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                            {isPro ? 'Sync active listings directly.' : 'Upgrade to sync active listings automatically.'}
                        </p>
                        {isPro ? (
                            <button className="btn btn-primary" style={{ width: '100%' }}>{initialIsConnected ? 'View Listings' : 'Connect eBay'}</button>
                        ) : (
                            <Link href="/#pricing" className="btn btn-primary" style={{ width: '100%', opacity: 1 }}>Upgrade to Unlock</Link>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    if (mode === 'ebay' && listings.length === 0) {
        return (
            <div className="container" style={{ padding: '2rem 0' }}>
                <div
                    style={{
                        maxWidth: '600px',
                        margin: '0 auto',
                        textAlign: 'center',
                        padding: '3rem 2rem',
                        background: 'var(--color-card-bg)',
                        borderRadius: 'var(--border-radius-lg)',
                        border: '1px solid var(--color-border)',
                    }}
                >
                    <div style={{ width: 64, height: 64, background: 'rgba(76, 175, 80, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                        <Monitor size={32} style={{ color: '#4caf50' }} />
                    </div>
                    <h2 style={{ fontSize: '1.75rem', marginBottom: '1rem' }}>eBay Connected!</h2>
                    <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem' }}>
                        We're ready to fetch your active listings.
                    </p>

                    {!fetching ? (
                        <button
                            onClick={handleFetchEbay}
                            className="btn btn-primary"
                            style={{ width: '100%', marginBottom: '1rem', cursor: 'pointer' }}
                        >
                            Import from eBay
                        </button>
                    ) : (
                        <div style={{
                            padding: '1.5rem',
                            borderRadius: '8px',
                            marginBottom: '1rem',
                            textAlign: 'center',
                            border: '1px solid var(--color-border)',
                            background: 'rgba(255, 255, 255, 0.05)'
                        }}>
                            <Loader2 size={32} style={{
                                animation: 'spin 1.5s linear infinite',
                                margin: '0 auto 1rem',
                                color: 'var(--color-primary)'
                            }} />
                            <h3 style={{ marginBottom: '0.5rem', fontWeight: 500, color: 'var(--color-text)' }}>Fetching listings, please wait...</h3>
                            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                                This may take a moment for large stores.
                            </p>
                            <style jsx>{`
                                @keyframes spin { 100% { transform: rotate(360deg); } }
                            `}</style>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                        <button
                            onClick={async () => {
                                if (confirm('Are you sure you want to disconnect your eBay account?')) {
                                    await fetch('/api/ebay/disconnect', { method: 'POST' });
                                    window.location.reload();
                                }
                            }}
                            className="btn btn-secondary"
                            style={{ flex: 1, borderColor: '#ff4444', color: '#ff4444' }}
                        >
                            <Trash2 size={16} style={{ marginRight: '0.5rem' }} />
                            Disconnect
                        </button>

                        <button
                            onClick={() => setMode('upload')}
                            className="btn btn-secondary"
                            style={{ flex: 1 }}
                        >
                            <Upload size={16} style={{ marginRight: '0.5rem' }} />
                            Upload CSV
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (mode === 'upload' && listings.length === 0) {
        return (
            <div className="container" style={{ padding: '2rem 0' }}>
                {/* ... (Existing upload card logic, but updated if needed) ... Reuse existing, just copy/paste to be safe */}
                <div
                    style={{
                        maxWidth: '600px',
                        margin: '0 auto',
                        textAlign: 'center',
                        padding: '3rem 2rem',
                        background: 'var(--color-card-bg)',
                        borderRadius: 'var(--border-radius-lg)',
                        border: '1px solid var(--color-border)',
                    }}
                >
                    <FileText size={48} style={{ color: 'var(--color-primary)', marginBottom: '1.5rem' }} />
                    <h2 style={{ fontSize: '1.75rem', marginBottom: '1rem' }}>Upload Your Listings</h2>
                    <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem' }}>
                        Upload a CSV file with a "title" column to get started.
                    </p>
                    <input
                        type="file"
                        ref={fileInputRef}
                        accept=".csv"
                        onChange={handleFileUpload}
                        style={{ display: 'none' }}
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="btn btn-primary"
                        style={{ width: '100%', marginBottom: '1rem' }}
                    >
                        <Upload size={16} style={{ marginRight: '0.5rem' }} />
                        Choose CSV File
                    </button>

                    {initialIsConnected && isPro && (
                        <button
                            onClick={() => setMode('ebay')}
                            className="btn btn-secondary"
                            style={{ width: '100%', marginTop: '0.5rem' }}
                        >
                            <Monitor size={16} style={{ marginRight: '0.5rem' }} />
                            Import from eBay instead
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <ListingEditor
            listings={listings}
            userId={userId}
            autoSaveOnMount={true}
            onClear={handleClearListings}
        />
    );
}
