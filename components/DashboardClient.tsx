'use client';

import { useState, useEffect, useMemo } from 'react';
import { Monitor, RefreshCw, Loader2, Link as LinkIcon, AlertCircle } from 'lucide-react';
import ListingEditor from './ListingEditor';
import Header from './Header';
import { supabase } from '@/lib/supabase';

interface DashboardClientProps {
    initialIsConnected: boolean;
    authUrl: string;
    userProfile: any;
    initialInventory?: any[];
    userId: string;
    userEmail?: string;
    usageStats?: {
        count: number;
        limit: number;
        tier: string;
        isMonthly: boolean;
        isYearly?: boolean;
    };
}

export default function DashboardClient({ initialIsConnected, authUrl, userProfile, initialInventory = [], userId, userEmail, usageStats }: DashboardClientProps) {
    const isPro = userProfile?.plan_tier === 'annual' || userEmail === 'resellseo@gmail.com';
    const [usageCount, setUsageCount] = useState(usageStats?.count || 0);

    // Simplification: We only have 'ebay' mode now. 
    // If connected, show inventory. If not, show connect screen.
    const [inventory, setInventory] = useState(initialInventory);
    const [inventoryTab, setInventoryTab] = useState<'WORKSPACE' | 'LIVE'>('WORKSPACE');
    const [isConnected, setIsConnected] = useState(initialIsConnected);

    const handleConnectEbay = () => {
        // Free users can now connect!
        if (authUrl) window.open(authUrl, '_blank');
    };

    const [fetching, setFetching] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);

    const handleFetchEbay = async () => {
        setFetching(true);
        setFetchError(null);
        try {
            // 1. Trigger Sync (Upsert to DB)
            const res = await fetch('/api/ebay/sync', { method: 'POST' });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Failed to sync items');

            // 2. Refresh local state from DB (Since sync updates DB, we just need to re-fetch or use returned data)
            // Ideally sync endpoint returns the items, but if not we can query DB or reload page.
            // For now, let's reload the page to be safe and simple, or fetch properly.
            // Let's reload to ensure fresh SSR data.
            window.location.reload();

        } catch (e: any) {
            console.error(e);
            setFetchError(e.message || 'Failed to sync');
        } finally {
            setFetching(false);
        }
    };

    // Manual State Update from Child (to keep tabs in sync)
    const handleUpdateItem = (id: string, updates: any) => {
        setInventory(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
    };

    const headerElement = (
        <Header usageStats={usageStats ? { ...usageStats, count: usageCount } : undefined} />
    );

    // ------------------------------------------------------------------
    // VIEW 1: NOT CONNECTED -> Show Connect Screen
    // ------------------------------------------------------------------
    if (!isConnected) {
        return (
            <div className="container" style={{ padding: '2rem 0' }}>
                {headerElement}
                <div style={{
                    maxWidth: '600px',
                    margin: '4rem auto',
                    textAlign: 'center',
                    padding: '3rem 2rem',
                    background: 'var(--color-card-bg)',
                    borderRadius: 'var(--border-radius-lg)',
                    border: '1px solid var(--color-border)',
                }}>
                    <div style={{ width: 80, height: 80, background: 'rgba(156, 85, 213, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem' }}>
                        <LinkIcon size={40} style={{ color: 'var(--color-primary)' }} />
                    </div>

                    <h2 style={{ fontSize: '2rem', marginBottom: '1rem', fontWeight: 800 }}>Connect Your Store</h2>
                    <p style={{ color: 'var(--color-text-muted)', marginBottom: '2.5rem', fontSize: '1.1rem', lineHeight: '1.6' }}>
                        Connect your eBay account to import your listings automatically. <br />
                        We only read your active listings to optimize them.
                    </p>

                    <button
                        onClick={handleConnectEbay}
                        className="btn btn-primary"
                        style={{ fontSize: '1.1rem', padding: '1rem 3rem', boxShadow: '0 4px 20px rgba(156, 85, 213, 0.3)' }}
                    >
                        Connect eBay Account
                    </button>

                    <p style={{ marginTop: '2rem', fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>
                        <Monitor size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.25rem' }} />
                        Secure Official eBay Integration
                    </p>
                </div>
            </div>
        );
    }

    // ------------------------------------------------------------------
    // VIEW 2: CONNECTED BUT EMPTY -> Show Fetch Screen
    // ------------------------------------------------------------------
    if (inventory.length === 0) {
        return (
            <div className="container" style={{ padding: '2rem 0' }}>
                {headerElement}
                <div style={{
                    maxWidth: '600px',
                    margin: '4rem auto',
                    textAlign: 'center',
                    padding: '3rem 2rem',
                    background: 'var(--color-card-bg)',
                    borderRadius: 'var(--border-radius-lg)',
                    border: '1px solid var(--color-border)',
                }}>
                    <div style={{ width: 70, height: 70, background: 'rgba(76, 175, 80, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                        <Monitor size={35} style={{ color: '#4caf50' }} />
                    </div>
                    <h2 style={{ fontSize: '1.75rem', marginBottom: '1rem' }}>eBay Connected!</h2>
                    <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem' }}>
                        We're ready to import your active listings.
                    </p>

                    {fetchError && (
                        <div style={{ padding: '1rem', background: 'rgba(255, 59, 48, 0.1)', color: '#ff3b30', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                            <AlertCircle size={16} /> {fetchError}
                        </div>
                    )}

                    {!fetching ? (
                        <button
                            onClick={handleFetchEbay}
                            className="btn btn-primary"
                            style={{ width: '100%', marginBottom: '1rem', cursor: 'pointer' }}
                        >
                            Import Listings
                        </button>
                    ) : (
                        <button disabled className="btn btn-secondary" style={{ width: '100%', marginBottom: '1rem', opacity: 0.7 }}>
                            <Loader2 className="spin" size={20} style={{ marginRight: '0.5rem' }} /> Syncing...
                        </button>
                    )}
                </div>
            </div>
        );
    }

    // ------------------------------------------------------------------
    // VIEW 3: INVENTORY (Main App)
    // ------------------------------------------------------------------

    // Filter Inventory
    const activeListings = useMemo(() => inventory
        .filter((item: any) => {
            const status = item.status || 'NEW';
            if (inventoryTab === 'LIVE') return status === 'LIVE' || status === 'UPLOADED' || status === 'IGNORED';
            // WORKSPACE = NEW or OPTIMIZED. EXCLUDE IGNORED.
            return status !== 'LIVE' && status !== 'UPLOADED' && status !== 'IGNORED';
        })
        .map((item: any) => ({
            id: item.id,
            original_title: item.current_title,
            optimized_title: item.optimized_title,
            status: item.status,
            ebay_item_id: item.ebay_item_id,
            image_url: item.image_url,
            raw_data: item
        })), [inventory, inventoryTab]);

    return (
        <div className="container" style={{ padding: '2rem 0' }}>
            {headerElement}

            {/* Title / Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>My Listings</h1>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                        onClick={handleFetchEbay}
                        disabled={fetching}
                        className="btn btn-secondary"
                        style={{
                            fontSize: '0.9rem',
                            padding: '0.5rem 1rem',
                            borderColor: fetching ? 'var(--color-primary)' : 'var(--color-border)',
                            color: fetching ? 'var(--color-primary)' : 'inherit',
                            background: fetching ? 'rgba(156, 85, 213, 0.1)' : 'transparent',
                            transition: 'all 0.3s ease'
                        }}
                    >
                        <RefreshCw size={16} className={fetching ? 'spin' : ''} style={{ marginRight: '0.5rem' }} />
                        {fetching ? 'Syncing...' : 'Sync eBay'}
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '2rem', borderBottom: '1px solid var(--color-border)', marginBottom: '2rem' }}>
                <button
                    onClick={() => setInventoryTab('WORKSPACE')}
                    style={{
                        padding: '0.75rem 0',
                        borderBottom: inventoryTab === 'WORKSPACE' ? '2px solid var(--color-primary)' : '2px solid transparent',
                        color: inventoryTab === 'WORKSPACE' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                        fontWeight: inventoryTab === 'WORKSPACE' ? 600 : 500,
                        fontSize: '1rem',
                        letterSpacing: '0.02em',
                        background: 'none', border: 'none', borderBottomWidth: '2px', cursor: 'pointer'
                    }}
                >
                    Workspace ({inventory.filter((i: any) => i.status === 'NEW' || i.status === 'OPTIMIZED').length})
                </button>
                <button
                    onClick={() => setInventoryTab('LIVE')}
                    style={{
                        padding: '0.75rem 0',
                        borderBottom: inventoryTab === 'LIVE' ? '2px solid var(--color-primary)' : '2px solid transparent',
                        color: inventoryTab === 'LIVE' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                        fontWeight: inventoryTab === 'LIVE' ? 600 : 500,
                        fontSize: '1rem',
                        letterSpacing: '0.02em',
                        background: 'none', border: 'none', borderBottomWidth: '2px', cursor: 'pointer'
                    }}
                >
                    Completed
                </button>
            </div>

            <ListingEditor
                key={inventoryTab}
                listings={activeListings}
                setListings={() => { }} // Read-only derived state basically
                checkCredits={() => usageCount < (usageStats?.limit || 25)}
                onCreditsUsed={() => setUsageCount(p => p + 1)}
                isPro={isPro}
                showPushLive={true}
                hideIgnored={inventoryTab === 'WORKSPACE'}
                showSort={inventoryTab === 'WORKSPACE'}
                simpleView={inventoryTab === 'LIVE'}
                userId={userId}
                onUpdateItem={handleUpdateItem}
            />
        </div>
    );
}
