'use client';

import { useState } from 'react';
import CsvUploader from './CsvUploader';
import ListingEditor from './ListingEditor';
import { Upload, Monitor } from 'lucide-react';

interface DashboardClientProps {
    initialIsConnected: boolean;
    authUrl: string;
    userProfile?: any;
    initialListings?: any[];
    userId: string;
}

export default function DashboardClient({ initialIsConnected, authUrl, userProfile, initialListings = [], userId }: DashboardClientProps) {
    // If we have saved listings, start in 'edit' mode to show them
    const [mode, setMode] = useState<'empty' | 'upload' | 'edit'>(initialListings.length > 0 ? 'edit' : 'empty');

    // Map DB listings to Component state if needed, or just use them directly
    // The DB schema matches our Listing interface closely enough for now
    const [listings, setListings] = useState<any[]>(initialListings);

    const handleCsvUpload = async (data: any[]) => {
        // Map CSV data to our schema roughly
        const mapped = data.map((row: any, index: number) => ({
            id: crypto.randomUUID(), // CRITICAL: Every item must have a unique ID before being sent to DB
            sort_index: index, // Maintain original file order
            original_title: row['Title'] || row['title'] || row['Item Name'] || '',
            optimized_title: '', // Pending optimization
            raw_data: row // Preserve original data for export
        })).filter((l: any) => l.original_title);

        setListings(mapped);
        setMode('edit');

        // Tricky: we need to save these to DB. 
        // ListingEditor is about to mount. 
        // We could pass a "shouldAutoSave" prop to ListingEditor?
        // Or just let ListingEditor handle "unsaved" items logic.
        // Let's pass a flag to ListingEditor to trigger initial save.
    };

    // Simplified layout: Sidebar is always on the left if we have IDs/Context, 
    // but for 'upload' or 'edit' we can choose to show a "Focused" view or the Sidebar view.
    // The user's screenshot shows a "Back to Dashboard" link, suggesting a focused view.

    if (mode === 'upload') {
        return (
            <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
                <button onClick={() => setMode('empty')} style={{ marginBottom: '1rem', background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    &larr; Back to Dashboard
                </button>
                <div className="card glass" style={{ padding: '2rem' }}>
                    <h2 style={{ marginBottom: '1.5rem' }}>Upload Listings CSV</h2>
                    <CsvUploader onUpload={handleCsvUpload} />
                </div>
            </div>
        );
    }

    if (mode === 'edit') {
        return (
            <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
                <button onClick={() => setMode('empty')} style={{ marginBottom: '1rem', background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    &larr; Back to Dashboard
                </button>
                <ListingEditor
                    listings={listings}
                    userId={userId}
                    autoSaveOnMount={true}
                    onClear={() => {
                        setListings([]);
                        setMode('upload');
                    }}
                />
            </div>
        );
    }

    if (!initialIsConnected && mode === 'empty') {
        return (
            <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                <div className="card glass" style={{ maxWidth: '500px', padding: '3rem' }}>
                    <Monitor size={48} style={{ color: 'var(--color-primary)', marginBottom: '1.5rem' }} />
                    <h2 style={{ fontSize: '1.75rem', marginBottom: '1rem' }}>Connect your eBay Account</h2>
                    <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem' }}>
                        To fetch real listings, connect eBay. Or use CSV upload below.
                    </p>
                    <a href={authUrl} className="btn btn-primary" style={{ width: '100%', marginBottom: '1rem' }}>
                        Connect eBay
                    </a>
                    <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
                        <button
                            type="button"
                            onClick={() => {
                                setMode('upload');
                            }}
                            className="btn btn-secondary"
                            style={{ width: '100%' }}
                        >
                            Skip & Use CSV Upload
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Default Dashboard (Connected and Empty)
    return (
        <div style={{ padding: '0 2rem', maxWidth: '1400px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 3fr', gap: '2rem', alignItems: 'start' }}>

            {/* Left Sidebar: Actions & Controls */}
            <div className="card glass" style={{ position: 'sticky', top: '2rem' }}>
                <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', color: 'var(--color-primary)' }}>Actions</h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ padding: '1rem', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)' }}>
                        <h3 style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>1. Import Data</h3>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className="btn btn-secondary" style={{ flex: 1, fontSize: '0.8rem' }}><Upload size={14} /> eBay</button>
                            <button onClick={() => setMode('upload')} className="btn btn-secondary" style={{ flex: 1, fontSize: '0.8rem' }}>CSV</button>
                        </div>
                    </div>

                    <div style={{ padding: '1rem', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)' }}>
                        <h3 style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Dashboard Stats</h3>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.75rem' }}>
                            <span style={{ color: 'var(--color-text-muted)' }}>Items Loaded:</span>
                            <span style={{ fontWeight: 600 }}>{listings.length}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                            <span style={{ color: 'var(--color-text-muted)' }}>Total Optimized:</span>
                            <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{userProfile?.usage_count || 0}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Content */}
            <div className="card glass" style={{ padding: '4rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                <div style={{ marginBottom: '1rem', fontSize: '2rem' }}>📭</div>
                <p>No listings imported yet.</p>
                <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>Use the actions on the left to get started.</p>
            </div>
        </div>
    );
}
