'use client';

import { useState, useRef } from 'react';
import { Upload, FileText, Trash2, Download, Monitor, RefreshCw, Loader2, Lock } from 'lucide-react';
import Papa from 'papaparse';
import ListingEditor from './ListingEditor';
import Header from './Header';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface DashboardClientProps {
    initialIsConnected: boolean;
    authUrl: string;
    userProfile: any;
    initialListings?: any[];
    initialInventory?: any[];
    userId: string;
    userEmail?: string;
    usageStats?: {
        count: number;
        limit: number;
        tier: string;
        isMonthly: boolean;
    };
}

export default function DashboardClient({ initialIsConnected, authUrl, userProfile, initialListings = [], initialInventory = [], userId, userEmail, usageStats }: DashboardClientProps) {
    const isPro = userProfile?.plan_tier === 'pro' || userEmail === 'resellseo@gmail.com';
    const [usageCount, setUsageCount] = useState(usageStats?.count || 0);

    // Legacy Mode Handling vs Inventory Mode
    const [mode, setMode] = useState<'empty' | 'upload' | 'ebay'>(
        initialListings.length > 0 ? 'upload' : (initialIsConnected && isPro ? 'ebay' : 'empty')
    );

    const [listings, setListings] = useState(initialListings); // Legacy/CSV
    const [inventory, setInventory] = useState(initialInventory); // New Shadow Inventory
    const [inventoryTab, setInventoryTab] = useState<'NEW' | 'OPTIMIZED' | 'LIVE' | 'IGNORED'>('NEW');

    const fileInputRef = useRef<HTMLInputElement>(null);

    // ... (reuse handleFileUpload) ...
    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        Papa.parse(file, {
            header: true,
            complete: (results) => {
                const parsedListings = results.data
                    .filter((row: any) => {
                        const t = row.title || row.Title || row['Item Name'] || row['Item Name'] || '';
                        return t && t.trim().length > 0;
                    })
                    .map((row: any, index: number) => ({
                        id: crypto.randomUUID(),
                        title: row.title || row.Title || row['Item Name'] || '',
                        original_title: row.title || row.Title || row['Item Name'] || '',
                        optimized_title: null,
                        source: 'csv',
                        ebay_item_id: row['Item ID'] || row['ItemID'] || row['item_id'] || row['ebay_item_id'] || null,
                    }));

                setListings(parsedListings);
                setMode('upload');
            },
            error: (error) => {
                console.error('CSV Parse Error:', error);
                alert('Failed to parse CSV file.');
            },
        });
    };
    // ...

    const handleConnectEbay = () => {
        if (!isPro) {
            alert("Upgrade to Pro to connect your eBay account!");
            return;
        }
        if (authUrl) window.open(authUrl, '_blank');
    };

    const handleClearListings = () => {
        setListings([]);
        setInventory([]);
        setMode('empty');
    };

    const [fetching, setFetching] = useState(false);

    const handleFetchEbay = async () => {
        setFetching(true);
        try {
            // 1. Trigger Sync (Upsert to DB)
            const res = await fetch('/api/ebay/fetch', { method: 'POST' });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Failed to sync items');

            // 2. Refresh Local Inventory from DB
            const { data: refreshedInventory } = await supabase
                .from('ebay_inventory')
                .select('*')
                .eq('user_id', userId)
                .order('last_synced_at', { ascending: false });

            if (refreshedInventory) {
                setInventory(refreshedInventory);
                setMode('ebay');
                // Default to NEW tab if we have new items
                if (refreshedInventory.some((i: any) => i.status === 'NEW')) {
                    setInventoryTab('NEW');
                }
            } else {
                alert('Sync complete but no items returned from DB.');
            }

        } catch (e: any) {
            console.error(e);
            alert('Error syncing listings: ' + e.message);
        }
        setFetching(false);
    };

    const headerElement = (
        <Header usageStats={usageStats ? { ...usageStats, count: usageCount } : undefined} />
    );

    // Compute Derived List for ListingEditor based on Mode & Tab
    let activeListings: any[] = [];
    if (mode === 'upload') {
        activeListings = listings;
    } else if (mode === 'ebay') {
        activeListings = inventory
            .filter((item: any) => item.status === inventoryTab)
            .map((item: any) => ({
                id: item.id, // DB UUID
                original_title: item.current_title, // For optimization, we start with current
                optimized_title: item.optimized_title,
                status: item.status, // mapped
                ebay_item_id: item.ebay_item_id,
                image_url: item.image_url,
                raw_data: item
            }));
    }

    if (mode === 'empty') {
        return (
            <div className="container" style={{ padding: '2rem 0' }}>
                {headerElement}
                <div style={{ paddingBottom: '2rem' }}>
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
            </div>
        );
    }

    if (mode === 'ebay' && inventory.length === 0) {
        return (
            <div className="container" style={{ padding: '2rem 0' }}>
                {headerElement}
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
                {headerElement}
                {/* ... Reuse existing upload card logic ... */}
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

    // --- TABS RENDER FOR EBAY MODE ---
    const getTabCount = (status: string) => inventory.filter((i: any) => i.status === status).length;

    return (
        <>
            {headerElement}

            {/* INVENTORY TABS - ONLY SHOW IN EBAY MODE */}
            {mode === 'ebay' && (
                <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
                    <button
                        onClick={() => setInventoryTab('NEW')}
                        style={{
                            padding: '0.5rem 1rem',
                            background: inventoryTab === 'NEW' ? 'var(--color-primary)' : 'transparent',
                            color: inventoryTab === 'NEW' ? 'white' : 'var(--color-text-muted)',
                            borderRadius: 'var(--radius-sm)',
                            border: 'none',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}>
                        Needs Optimization ({getTabCount('NEW')})
                    </button>
                    <button
                        onClick={() => setInventoryTab('OPTIMIZED')}
                        style={{
                            padding: '0.5rem 1rem',
                            background: inventoryTab === 'OPTIMIZED' ? 'rgba(76, 175, 80, 0.2)' : 'transparent',
                            color: inventoryTab === 'OPTIMIZED' ? '#4caf50' : 'var(--color-text-muted)',
                            borderRadius: 'var(--radius-sm)',
                            border: inventoryTab === 'OPTIMIZED' ? '1px solid #4caf50' : 'none',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}>
                        Review ({getTabCount('OPTIMIZED')})
                    </button>
                    <button
                        onClick={() => setInventoryTab('LIVE')}
                        style={{
                            padding: '0.5rem 1rem',
                            background: inventoryTab === 'LIVE' ? 'rgba(33, 150, 243, 0.2)' : 'transparent',
                            color: inventoryTab === 'LIVE' ? '#2196f3' : 'var(--color-text-muted)',
                            borderRadius: 'var(--radius-sm)',
                            border: inventoryTab === 'LIVE' ? '1px solid #2196f3' : 'none',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}>
                        Live ({getTabCount('LIVE')})
                    </button>
                    <div style={{ flex: 1 }} />
                    <button
                        onClick={handleFetchEbay}
                        disabled={fetching}
                        className="btn btn-secondary"
                        style={{ padding: '0.5rem 1rem' }}
                    >
                        {fetching ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
                        Sync from eBay
                    </button>
                </div>
            )}

            <ListingEditor
                key={mode + inventoryTab} // Force re-mount when switching tabs/modes
                listings={activeListings}
                userId={userId}
                autoSaveOnMount={mode === 'upload'} // Only autosave CSVs
                onClear={handleClearListings}
                onUsageIncrement={() => setUsageCount(c => c + 1)}
            />
        </>
    );
}
