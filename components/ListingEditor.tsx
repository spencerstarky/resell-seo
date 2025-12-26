'use client';

import { useState, useEffect } from 'react';
import { Sparkles, Save, Upload, Trash2, CloudDownload as CloudPush, CheckCircle } from 'lucide-react';
import Papa from 'papaparse';

interface Listing {
    id?: string;
    original_title: string;
    optimized_title: string;
    image_url?: string;
    loading?: boolean;
    raw_data?: any;
    sort_index?: number;
    status?: string;
    ebay_item_id?: string;
    pushing?: boolean;
}

interface ListingEditorProps {
    listings: Listing[];
    userId: string;
    autoSaveOnMount?: boolean;
    onClear?: () => void;
}

export default function ListingEditor({ listings: initialListings, userId, autoSaveOnMount = false, onClear }: ListingEditorProps) {
    const [listings, setListings] = useState(initialListings);
    const [saving, setSaving] = useState(false);

    // Auto-save new imports on mount
    useEffect(() => {
        if (autoSaveOnMount && userId) {
            // Find items without IDs and save them all immediately (using the batch save helper)
            // Or just trigger saveProgress() once.
            saveProgress();
        }
    }, []); // Run once on mount
    // const [dbSaving, setDbSaving] = useState(false); // No longer needed for manual save button

    // Track which items are currently saving to avoid race conditions
    const [savingRows, setSavingRows] = useState<Set<number>>(new Set());
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

    // Debounce save trigger
    const handleTitleChange = (index: number, newTitle: string) => {
        const updated = [...listings];
        updated[index].optimized_title = newTitle;
        // Mark as pending save if you wanted to track dirty state,
        // but for now we just update state and let debounce handle it.
        setListings(updated);

        // Trigger autosave for this row
        debouncedSave(index, newTitle, updated[index]);
    };

    const getCharCountColor = (length: number) => {
        if (length > 80) return 'var(--color-accent)';
        if (length >= 75) return 'orange';
        return 'var(--color-text-muted)';
    };

    const [showSuccess, setShowSuccess] = useState(false);

    // Debounce implementation
    const debounceMap = new Map<number, NodeJS.Timeout>();
    const debouncedSave = (index: number, title: string, item: Listing) => {
        if (debounceMap.has(index)) {
            clearTimeout(debounceMap.get(index));
        }

        const timeoutId = setTimeout(() => {
            saveSingleRow(index, item);
            debounceMap.delete(index);
        }, 1500); // 1.5s delay

        debounceMap.set(index, timeoutId);
    };

    // Save a SINGLE row
    const saveSingleRow = async (index: number, item: Listing) => {
        setSavingRows(prev => new Set(prev).add(index));
        try {
            const { supabase } = await import('@/lib/supabase');
            if (!userId) {
                console.error('[Autosave] User ID missing from props');
                return;
            }

            const payload: any = {
                user_id: userId,
                original_title: item.original_title,
                optimized_title: item.optimized_title,
                status: item.optimized_title ? 'optimized' : 'pending',
                raw_data: item.raw_data,
                sort_index: item.sort_index,
                updated_at: new Date().toISOString()
            };

            if (item.id) {
                payload.id = item.id;
            }

            const { data, error } = await supabase
                .from('listings')
                .upsert(payload, { onConflict: 'id' })
                .select()
                .single();

            if (error) throw error;

            // Update local state with real ID if it was a new insert
            if (data && !item.id) {
                setListings(prev => {
                    const next = [...prev];
                    // Verify we are updating the right index still (simple check)
                    if (next[index].original_title === item.original_title) {
                        next[index] = { ...next[index], id: data.id };
                    }
                    return next;
                });
            }

            console.log('[Saving] Success. Data:', data);

            // We don't need to update local state anymore because IDs match!
            setLastSaved(new Date());
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);

        } catch (e: any) {
            console.error('Autosave failed:', e);
        }
        setSavingRows(prev => {
            const next = new Set(prev);
            next.delete(index);
            return next;
        });
    };

    // Manual Save All (also used by AutoSaveOnMount)
    const saveProgress = async () => {
        setSaving(true);
        try {
            const { supabase } = await import('@/lib/supabase');
            if (!userId) {
                setSaving(false);
                return;
            }

            // Prepare data for upsert
            const updates = listings.map(l => ({
                id: l.id,
                user_id: userId,
                original_title: l.original_title,
                optimized_title: l.optimized_title,
                status: l.optimized_title ? 'optimized' : 'pending',
                raw_data: l.raw_data,
                sort_index: l.sort_index,
                updated_at: new Date().toISOString()
            }));

            console.log('[Saving] Attempting DB Upsert...', updates.length);
            const { data, error } = await supabase
                .from('listings')
                .upsert(updates, { onConflict: 'id' })
                .select();

            if (error) {
                console.error('[Saving] DB Error:', error);
                throw error;
            }

            console.log('[Saving] Success. Data:', data);

            if (data) {
                setLastSaved(new Date());
                setShowSuccess(true);
                setTimeout(() => setShowSuccess(false), 3000);
            }

        } catch (e: any) {
            console.error(e);
            alert('Failed to save progress: ' + e.message);
        }
        setSaving(false);
    };
    const pushToEbay = async (index: number) => {
        const listing = listings[index];
        if (!listing.id || !listing.optimized_title) return;

        setListings(prev => {
            const next = [...prev];
            next[index] = { ...next[index], pushing: true };
            return next;
        });

        try {
            const res = await fetch('/api/ebay/push', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ listingId: listing.id })
            });

            const data = await res.json();

            if (res.ok) {
                setListings(prev => {
                    const next = [...prev];
                    next[index] = { ...next[index], pushing: false, status: 'uploaded' };
                    return next;
                });
            } else {
                throw new Error(data.error || 'Push failed');
            }
        } catch (e: any) {
            console.error(e);
            alert('Push failed: ' + e.message);
            setListings(prev => {
                const next = [...prev];
                next[index] = { ...next[index], pushing: false };
                return next;
            });
        }
    };


    const handleClearAll = async () => {
        if (!confirm('Are you sure you want to delete ALL listings? This cannot be undone.')) return;

        setSaving(true);
        try {
            const { supabase } = await import('@/lib/supabase');
            const { error } = await supabase
                .from('listings')
                .delete()
                .eq('user_id', userId);

            if (error) throw error;

            if (onClear) {
                onClear();
            } else {
                window.location.reload();
            }
        } catch (e: any) {
            console.error(e);
            alert('Failed to clear listings: ' + e.message);
        }
        setSaving(false);
    };


    const exportCsv = () => {
        setSaving(true);
        try {
            // Merge optimized titles back into original data
            const exportData = listings.map(l => {
                if (l.raw_data) {
                    // Update the title in the original row
                    // Try to find the correct key for Title
                    const titleKey = Object.keys(l.raw_data).find(k => k.toLowerCase() === 'title' || k.toLowerCase() === 'item name') || 'Title';
                    return {
                        ...l.raw_data,
                        [titleKey]: l.optimized_title || l.original_title // Overwrite with optimized version
                    };
                } else {
                    // Fallback for manually created listings without raw CSV
                    return {
                        'Title': l.optimized_title || l.original_title,
                        'Original Title': l.original_title
                    };
                }
            });

            const csv = Papa.unparse(exportData);

            // Create download link
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', `resell_seo_optimized_${new Date().toISOString().slice(0, 10)}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (e) {
            console.error(e);
            alert('Failed to generate CSV');
        }
        setSaving(false);
    };

    return (
        <div style={{ maxWidth: '100%' }}>
            {/* Header / Actions for the 'Repeating Group' */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.25rem' }}>Listings ({listings.length})</h3>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                    {savingRows.size > 0 ? (
                        <span style={{ color: 'var(--color-primary)' }}><span className="animate-pulse">●</span> Saving...</span>
                    ) : lastSaved ? (
                        <span><Save size={14} style={{ display: 'inline', marginRight: 4 }} /> Saved</span>
                    ) : null}
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                        onClick={rewriteAll}
                        className="btn btn-secondary"
                        disabled={saving || listings.some(l => l.loading)}
                        style={{ border: '1px solid var(--color-primary)', color: 'var(--color-primary)' }}
                    >
                        <Sparkles size={16} /> Rewrite All
                    </button>

                    <button onClick={saveProgress} className="btn btn-secondary">
                        <Save size={16} /> Save Progress
                    </button>

                    <button onClick={exportCsv} className="btn btn-primary" disabled={saving}>
                        <Upload size={16} style={{ transform: 'rotate(180deg)' }} /> Export CSV
                    </button>

                    <button
                        onClick={handleClearAll}
                        className="icon-btn icon-btn-danger"
                        disabled={saving}
                        title="Clear all listings"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            {/* List Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 60px', padding: '0.75rem 1.5rem', color: 'var(--color-text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <div>Original Title</div>
                <div>Optimized Title</div>
                <div style={{}}>Action</div>
            </div>

            {/* The List (Repeating Group) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {listings.map((listing, i) => (
                    <div key={listing.id || i} className="" style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr 60px',
                        gap: '1.5rem',
                        alignItems: 'start',
                        padding: '1.5rem',
                        backgroundColor: 'rgba(255,255,255,0.03)',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid transparent',
                        transition: 'background-color 0.2s'
                    }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'transparent' }}
                    >
                        {/* Original */}
                        <div style={{ color: 'var(--color-text-dim)', fontSize: '0.95rem', lineHeight: 1.4, paddingRight: '1rem', overflowWrap: 'break-word' }}>
                            {listing.original_title}
                        </div>

                        {/* Optimized */}
                        <div>
                            <textarea
                                value={listing.optimized_title || ''}
                                onChange={(e) => handleTitleChange(i, e.target.value)}
                                placeholder="Click Rewrite to generate..."
                                style={{
                                    width: '100%',
                                    padding: '0.5rem',
                                    borderRadius: 'var(--radius-sm)',
                                    border: '1px solid var(--color-border)',
                                    backgroundColor: 'rgba(0,0,0,0.2)',
                                    color: 'var(--color-text-main)',
                                    resize: 'vertical',
                                    minHeight: '60px',
                                    fontFamily: 'inherit',
                                    fontSize: '0.95rem'
                                }}
                            />
                            {/* Char Count */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.25rem', fontSize: '0.75rem' }}>
                                <span style={{ color: getCharCountColor(listing.optimized_title?.length || 0), fontWeight: 600 }}>
                                    {listing.optimized_title?.length || 0}/80
                                </span>
                            </div>
                        </div>

                        {/* Action Button */}
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', paddingTop: '0.25rem' }}>
                            <button
                                onClick={() => rewriteTitle(i)}
                                className="btn"
                                style={{
                                    padding: '0.4rem',
                                    borderRadius: '50%',
                                    background: listing.optimized_title ? 'rgba(76, 175, 80, 0.1)' : 'rgba(156, 85, 213, 0.1)',
                                    color: listing.optimized_title ? '#4caf50' : 'var(--color-primary)'
                                }}
                                title={listing.optimized_title ? "Rewrite Again" : "Optimize"}
                                disabled={listing.loading || listing.pushing}
                            >
                                {listing.loading ?
                                    <div className="animate-spin" style={{ width: 16, height: 16, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%' }} /> :
                                    <Sparkles size={16} />
                                }
                            </button>

                            {listing.optimized_title && (
                                <button
                                    onClick={() => pushToEbay(i)}
                                    className="btn"
                                    style={{
                                        padding: '0.4rem',
                                        borderRadius: '50%',
                                        background: listing.status === 'uploaded' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(156, 85, 213, 0.1)',
                                        color: listing.status === 'uploaded' ? '#4caf50' : '#d6bcfa',
                                        border: listing.status === 'uploaded' ? '1px solid #4caf50' : 'none'
                                    }}
                                    title={listing.status === 'uploaded' ? "Already on eBay" : "Push to eBay"}
                                    disabled={listing.pushing || listing.loading}
                                >
                                    {listing.pushing ?
                                        <div className="animate-spin" style={{ width: 16, height: 16, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%' }} /> :
                                        listing.status === 'uploaded' ? <CheckCircle size={16} /> : <CloudPush size={16} />
                                    }
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div >
    );

    async function rewriteAll() {
        if (!confirm('This will rewrite all titles that haven\'t been optimized yet. Continue?')) return;

        // Find indices of items that need optimization (empty optimized_title or same as original)
        const todoIndices = listings
            .map((l, i) => ({ ...l, index: i }))
            .filter(l => !l.optimized_title || l.optimized_title === l.original_title)
            .map(l => l.index);

        if (todoIndices.length === 0) {
            alert('All titles are already optimized!');
            return;
        }

        // Set loading state for all of them
        setListings(prev => {
            const next = [...prev];
            todoIndices.forEach(idx => {
                next[idx] = { ...next[idx], loading: true };
            });
            return next;
        });

        // Process sequentially to be nice to the API rate limit
        for (const idx of todoIndices) {
            await rewriteTitle(idx);
            // Free Tier Limit: 15 Requests Per Minute = 1 req / 4 seconds
            // We set delay to 4000ms to be 100% safe.
            await new Promise(r => setTimeout(r, 4000));
        }
    }

    async function rewriteTitle(index: number) {
        const listing = listings[index];
        if (!listing.original_title) return;

        // Optimistic UI update for individual click, 
        // but for bulk, the loading state is already set by rewriteAll
        if (!listing.loading) {
            setListings(prev => {
                const next = [...prev];
                next[index] = { ...next[index], loading: true };
                return next;
            });
        }

        try {
            const res = await fetch('/api/optimize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: listing.original_title })
            });

            const data = await res.json();

            if (data.optimizedTitle) {
                // Calculate updated item immediately to avoid React state batching race condition
                const newItem = { ...listings[index], optimized_title: data.optimizedTitle, loading: false };

                setListings(prev => {
                    const next = [...prev];
                    next[index] = newItem;
                    return next;
                });

                // TRIGGER AUTOSAVE immediately for this row
                saveSingleRow(index, newItem);

                // INCREMENT USAGE on profile
                const { supabase } = await import('@/lib/supabase');
                console.log('[Usage] Incrementing for user:', userId);
                const { error: rpcError } = await supabase.rpc('increment_usage', { target_user_id: userId });

                if (rpcError) {
                    console.error('[Usage] Error incrementing count:', rpcError);
                } else {
                    console.log('[Usage] Successfully incremented count in DB');
                }

            } else {
                throw new Error(data.error || 'Unknown error');
            }
        } catch (e: any) {
            console.error(e);
            // Don't alert for every single failure in batch mode, just log it
            // alert(`Failed to optimize: ${e.message || 'Unknown error'}`);
            setListings(prev => {
                const next = [...prev];
                next[index] = { ...next[index], loading: false };
                return next;
            });
        }
    }
}
