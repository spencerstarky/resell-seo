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
                        Connect eBay
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
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                        <button className="btn btn-secondary" style={{ flex: 1, fontSize: '0.8rem' }}><Upload size={14} /> eBay</button>
                        <button className="btn btn-secondary" style={{ flex: 1, fontSize: '0.8rem' }}><Upload size={14} /> Poshmark</button>
                        <button className="btn btn-secondary" style={{ flex: 1, fontSize: '0.8rem' }}><Upload size={14} /> Mercari</button>
                    </div>
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
