'use client';

import { useState, useRef } from 'react';
import { Upload, FileText, Trash2, Download, Monitor } from 'lucide-react';
import Papa from 'papaparse';
import ListingEditor from './ListingEditor';

interface DashboardClientProps {
    initialIsConnected: boolean;
    authUrl: string;
    userProfile: any;
    initialListings?: any[];
    userId: string;
}

export default function DashboardClient({ initialIsConnected, authUrl, userProfile, initialListings = [], userId }: DashboardClientProps) {
    const [mode, setMode] = useState<'empty' | 'upload' | 'ebay'>(
        initialListings.length > 0 ? 'upload' : (initialIsConnected ? 'ebay' : 'empty')
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
                        id: `csv-${Date.now()}-${index}`,
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
        if (authUrl) {
            window.location.href = authUrl;
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

            const ebayListings = data.listings.map((item: any) => ({
                id: `ebay-${item.ebay_item_id}`,
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
                // The mode is already 'ebay', so it will fall through to ListingEditor
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
                    <Monitor size={48} style={{ color: 'var(--color-primary)', marginBottom: '1.5rem' }} />
                    <h2 style={{ fontSize: '1.75rem', marginBottom: '1rem' }}>Connect your eBay Account</h2>
                    <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem' }}>
                        To fetch real listings, connect eBay. Or use CSV upload below.
                    </p>
                    <button
                        onClick={handleConnectEbay}
                        className="btn btn-primary"
                        style={{ width: '100%', marginBottom: '1rem', cursor: 'pointer' }}
                    >
                        Connect eBay Account
                    </button>
                    <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
                        <button
                            type="button"
                            onClick={() => {
                                setMode('upload');
                            }}
                            className="btn btn-secondary"
                            style={{ width: '100%' }}
                        >
                            <Upload size={16} style={{ marginRight: '0.5rem' }} />
                            Upload CSV Instead
                        </button>
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

                    <button
                        onClick={handleFetchEbay}
                        className="btn btn-primary"
                        disabled={fetching}
                        style={{ width: '100%', marginBottom: '1rem', cursor: 'pointer' }}
                    >
                        {fetching ? 'Fetching items...' : 'Import from eBay'}
                    </button>

                    <button
                        onClick={() => setMode('upload')}
                        className="btn btn-secondary"
                        style={{ width: '100%' }}
                    >
                        <Upload size={16} style={{ marginRight: '0.5rem' }} />
                        Actually, let me upload a CSV
                    </button>
                </div>
            </div>
        );
    }

    if (mode === 'upload' && listings.length === 0) {
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

                    {/* If connected, allow switching back to eBay import */}
                    {initialIsConnected && (
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
            autoSaveOnMount={false}
            onClear={handleClearListings}
        />
    );
}
