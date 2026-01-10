'use client';

import { useState, useEffect } from 'react';
import { Sparkles, Save, Trash2, CloudDownload as CloudPush, CheckCircle, Lock } from 'lucide-react';

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
    setListings?: any; // Allow state update
    userId?: string;
    checkCredits?: () => boolean;
    onCreditsUsed?: () => void;
    isPro?: boolean;
    showPushLive?: boolean;
}

// --- SCORING HELPER FUNCTIONS ---
const calculateSeoScore = (title: string | null | undefined): number => {
    if (!title) return 0;
    let score = 0;
    const len = title.length;

    // 1. Length Score (Max 50)
    // eBay prefers utilizing all 80 chars. Sweet spot 70-80.
    if (len >= 75) score += 50;
    else if (len >= 60) score += 40;
    else if (len >= 40) score += 25;
    else score += 5;

    // 2. Word Count (Max 30)
    // More keywords = better visibility
    const wordCount = title.trim().split(/\s+/).length;
    if (wordCount >= 10) score += 30;
    else if (wordCount >= 7) score += 20;
    else if (wordCount >= 4) score += 10;

    // 3. Quality & Formatting (Max 20)
    // Deduct for ALL CAPS
    if (title !== title.toUpperCase() || len < 10) score += 10;

    // Deduct for Filler Words
    const fillers = ['l@@k', 'look', 'wow', 'must see', 'cheap', 'sale', 'offer', 'nice'];
    const lower = title.toLowerCase();
    const hasFiller = fillers.some(w => lower.includes(w));
    if (!hasFiller) score += 10;

    // Deduct for excessive punctuation
    if ((title.match(/[!.*?]/g) || []).length > 2) score -= 10;

    return Math.max(0, Math.min(100, score));
};

const getScoreColor = (score: number) => {
    if (score >= 90) return '#4caf50'; // Green
    if (score >= 70) return '#ffa726'; // Orange
    return '#f44336'; // Red
};

export default function ListingEditor({
    listings: initialListings,
    setListings: parentSetListings,
    userId,
    checkCredits,
    onCreditsUsed,
    isPro = false,
    showPushLive = false
}: ListingEditorProps) {
    const [listings, setListings] = useState(initialListings);

    // State is initialized only once (or when key changes).
    // We REMOVED the useEffect here that was causing resets when parend updated credits.

    const [saving, setSaving] = useState(false);
    const [savingRows, setSavingRows] = useState<Set<number>>(new Set());
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

    const handleTitleChange = (index: number, newTitle: string) => {
        const updated = [...listings];
        updated[index].optimized_title = newTitle;
        setListings(updated);
        debouncedSave(index, newTitle, updated[index]);
    };

    const getCharCountColor = (length: number) => {
        if (length > 80) return 'var(--color-accent)';
        if (length >= 75) return 'orange';
        return 'var(--color-text-muted)';
    };

    const [showSuccess, setShowSuccess] = useState(false);

    const debounceMap = new Map<number, NodeJS.Timeout>();
    const debouncedSave = (index: number, title: string, item: Listing) => {
        if (debounceMap.has(index)) {
            clearTimeout(debounceMap.get(index));
        }

        const timeoutId = setTimeout(() => {
            saveSingleRow(index, item);
            debounceMap.delete(index);
        }, 1500);

        debounceMap.set(index, timeoutId);
    };

    // Save a SINGLE row
    const saveSingleRow = async (index: number, item: Listing) => {
        setSavingRows(prev => new Set(prev).add(index));
        try {
            const { supabase } = await import('@/lib/supabase');
            if (!userId || !item.id) return;

            // Always assume Inventory Mode now (since CSV is gone)
            let newStatus = 'NEW';
            if (item.optimized_title) newStatus = 'OPTIMIZED';
            if (item.status === 'live' || item.status === 'uploaded' || item.status === 'LIVE') newStatus = 'LIVE';

            const { error } = await supabase
                .from('ebay_inventory')
                .update({
                    optimized_title: item.optimized_title,
                    status: newStatus,
                    updated_at: new Date().toISOString()
                })
                .eq('id', item.id)
                .eq('user_id', userId);

            if (error) throw error;

            console.log('[Saving] Inventory Updated:', item.id);
            setLastSaved(new Date());

        } catch (e: any) {
            console.error('Autosave failed:', e);
        }
        setSavingRows(prev => {
            const next = new Set(prev);
            next.delete(index);
            return next;
        });
    };

    // Manual Save All
    const saveProgress = async () => {
        setSaving(true);
        try {
            const { supabase } = await import('@/lib/supabase');
            if (!userId) {
                setSaving(false); return;
            }

            const updates = listings
                .filter(l => l.id)
                .map(l => {
                    let newStatus = 'NEW';
                    if (l.optimized_title) newStatus = 'OPTIMIZED';
                    if (l.status === 'live' || l.status === 'uploaded' || l.status === 'LIVE') newStatus = 'LIVE';

                    return {
                        id: l.id,
                        user_id: userId,
                        ebay_item_id: l.ebay_item_id,
                        original_title: l.original_title, // Ensure we don't lose this
                        current_title: l.original_title, // Fallback
                        optimized_title: l.optimized_title,
                        status: newStatus,
                        image_url: l.image_url,
                        updated_at: new Date().toISOString()
                    };
                });

            if (updates.length > 0) {
                const { error } = await supabase
                    .from('ebay_inventory')
                    .upsert(updates, { onConflict: 'id' });

                if (error) throw error;
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
        if (!isPro) {
            alert('Pushing live updates is a Pro feature. Please upgrade to unlock Instant Sync.');
            return;
        }

        const listing = listings[index];
        if (!listing.id || !listing.optimized_title) return;

        setListings((prev: Listing[]) => {
            const next = [...prev];
            next[index] = { ...next[index], pushing: true };
            return next;
        });

        try {
            const res = await fetch('/api/ebay/push', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    listingId: listing.id,
                    optimizedTitle: listing.optimized_title // Send explicitly to avoid race condition
                })
            });

            const data = await res.json();

            if (res.ok) {
                setListings((prev: Listing[]) => {
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
            setListings((prev: Listing[]) => {
                const next = [...prev];
                next[index] = { ...next[index], pushing: false };
                return next;
            });
        }
    };

    const pushAllToEbay = async () => {
        if (!isPro) {
            alert('Bulk Push is a Pro feature. Upgrade to sync your entire store.');
            return;
        }

        const eligibleIndices = listings
            .map((l, i) => ({ ...l, index: i }))
            .filter(l => l.optimized_title && l.status !== 'posted' && l.status !== 'LIVE' && l.status !== 'uploaded' && !l.pushing)
            .map(l => l.index);

        if (eligibleIndices.length === 0) {
            alert('No optimized items ready to push!');
            return;
        }

        if (!confirm(`Are you sure you want to push ${eligibleIndices.length} items to eBay live?`)) return;

        setListings((prev: Listing[]) => {
            const next = [...prev];
            eligibleIndices.forEach(idx => {
                next[idx] = { ...next[idx], pushing: true };
            });
            return next;
        });

        const BATCH_SIZE = 3;
        for (let i = 0; i < eligibleIndices.length; i += BATCH_SIZE) {
            const batch = eligibleIndices.slice(i, i + BATCH_SIZE);
            await Promise.all(batch.map(idx => pushToEbay(idx)));
        }
    };

    const rewriteAll = async () => {
        if (!checkCredits) return;

        // Find indices of items that need optimization
        const todoIndices = listings
            .map((l, i) => ({ ...l, index: i }))
            .filter(l => !l.optimized_title || l.optimized_title === l.original_title)
            .map(l => l.index);

        if (todoIndices.length === 0) {
            alert('All titles are already optimized!');
            return;
        }

        // Limit Check?
        // Since we don't know EXACT credits here easily without a separate call, we'll iterate and check per item logic, 
        // OR better, we just warn them.
        // But checkCredits() is sync boolean. So it checks if CURRENT > LIMIT. 
        // It doesn't predict FUTURE usage. 
        // So we might hit limit mid-batch. That's fine.

        if (!confirm(`This will rewrite ${todoIndices.length} titles. Continue?`)) return;

        setListings((prev: Listing[]) => {
            const next = [...prev];
            todoIndices.forEach(idx => {
                next[idx] = { ...next[idx], loading: true };
            });
            return next;
        });

        const BATCH_SIZE = 5;
        for (let i = 0; i < todoIndices.length; i += BATCH_SIZE) {
            const batch = todoIndices.slice(i, i + BATCH_SIZE);
            // We check credits for EACH batch roughly? 
            // If we run out, rewriteTitle will simply fail/alert on the first failure.
            await Promise.all(batch.map(idx => rewriteTitle(idx)));
        }
    };

    const rewriteTitle = async (index: number) => {
        const listing = listings[index];
        if (!listing.original_title) return;

        if (checkCredits && !checkCredits()) {
            alert('You have reached your optimization limit. Please upgrade for more.');
            setListings((prev: Listing[]) => {
                const next = [...prev];
                next[index] = { ...next[index], loading: false };
                return next;
            });
            return;
        }

        // Optimistic UI update
        if (!listing.loading) {
            setListings((prev: Listing[]) => {
                const next = [...prev];
                next[index] = { ...next[index], loading: true };
                return next;
            });
        }

        try {
            const res = await fetch('/api/optimize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: listing.original_title,
                    itemId: listing.ebay_item_id,
                    imageUrl: listing.image_url,
                    forceRefresh: !!listing.optimized_title
                })
            });

            const data = await res.json();

            if (data.optimizedTitle) {
                const newItem = { ...listings[index], optimized_title: data.optimizedTitle, loading: false };
                setListings((prev: Listing[]) => {
                    const next = [...prev];
                    next[index] = newItem;
                    return next;
                });

                saveSingleRow(index, newItem);

                if (!data.fromCache && onCreditsUsed) {
                    onCreditsUsed();
                    // Optional: You could show a toast here "1 Credit Used"
                } else {
                    console.log('Optimization served from cache (Free)');
                }

            } else {
                throw new Error(data.error || 'Unknown error');
            }
        } catch (e: any) {
            console.error(e);
            setListings((prev: Listing[]) => {
                const next = [...prev];
                next[index] = { ...next[index], loading: false };
                return next;
            });
        }
    };

    // --- SORTING ---
    const [sortBy, setSortBy] = useState<'date-desc' | 'score-asc' | 'score-desc' | 'status-pending'>('date-desc');

    const getSortedListings = () => {
        const sorted = [...listings];
        return sorted.sort((a, b) => {
            if (sortBy === 'date-desc') {
                // eBay Item IDs (e.g. 156...) increase over time. 
                // Higher ID = Newer Listing.
                const idA = a.ebay_item_id || '';
                const idB = b.ebay_item_id || '';
                // Numeric string sort
                if (idA.length !== idB.length) return idB.length - idA.length;
                return idB.localeCompare(idA);
            }
            if (sortBy === 'score-asc') {
                return calculateSeoScore(a.original_title) - calculateSeoScore(b.original_title);
            }
            if (sortBy === 'score-desc') {
                return calculateSeoScore(b.original_title) - calculateSeoScore(a.original_title);
            }
            if (sortBy === 'status-pending') {
                const aOpt = !!a.optimized_title;
                const bOpt = !!b.optimized_title;
                if (aOpt === bOpt) return 0;
                return aOpt ? 1 : -1;
            }
            return 0;
        });
    };

    const displayListings = getSortedListings();

    return (
        <div style={{ maxWidth: '100%' }}>
            {/* Header / Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <h3 style={{ fontSize: '1.25rem', margin: 0 }}>Listings ({listings.length})</h3>
                    {/* Sort Dropdown */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '0.25rem 0.75rem', borderRadius: '6px' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Sort:</span>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as any)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--color-text-main)', fontSize: '0.85rem', outline: 'none', cursor: 'pointer' }}
                        >
                            <option value="date-desc">Newest Uploads</option>
                            <option value="score-asc">Lowest Score (Needs Work)</option>
                            <option value="score-desc">Highest Score</option>
                            <option value="status-pending">Not Optimized First</option>
                        </select>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                    {savingRows.size > 0 ? (
                        <span style={{ color: 'var(--color-primary)' }}><span className="animate-pulse">●</span> Saving...</span>
                    ) : lastSaved ? (
                        <span><Save size={14} style={{ display: 'inline', marginRight: 4 }} /> Saved</span>
                    ) : null}
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <button
                        onClick={rewriteAll}
                        className="btn btn-secondary"
                        disabled={saving || listings.some(l => l.loading)}
                        style={{ border: '1px solid var(--color-primary)', color: 'var(--color-primary)' }}
                    >
                        <Sparkles size={16} /> Rewrite All
                    </button>

                    <button onClick={saveProgress} className="btn btn-secondary">
                        <Save size={16} /> Save
                    </button>

                    <button
                        onClick={pushAllToEbay}
                        className="btn btn-primary"
                        disabled={saving || listings.some(l => l.pushing)}
                        title={isPro ? "Push all optimized items to eBay" : "Upgrade to Pro to push items"}
                        style={{ opacity: isPro ? 1 : 0.5, cursor: isPro ? 'pointer' : 'not-allowed' }}
                    >
                        {isPro ? <CloudPush size={16} /> : <Lock size={16} />}
                        {isPro ? ' Push All Live' : ' Push All (Pro)'}
                    </button>
                </div>
            </div>

            {/* List Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 60px', padding: '0.75rem 1.5rem', color: 'var(--color-text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <div>Original Title</div>
                <div>Optimized Title</div>
                <div style={{}}>Action</div>
            </div>

            {/* The List Logic */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {displayListings.map((listing, _) => {
                    // Match sorting to original index
                    const realIndex = listings.findIndex(l => l.id === listing.id);
                    // Fallback if ID is missing (should verify handled)
                    if (realIndex === -1) return null;

                    return (
                        <div key={listing.id || realIndex} className="" style={{
                            display: 'grid', gridTemplateColumns: '1fr 1fr 60px', gap: '1.5rem', alignItems: 'start', padding: '1.5rem',
                            backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)', border: '1px solid transparent'
                        }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'transparent' }}
                        >
                            {/* Original */}
                            <div style={{ color: 'var(--color-text-dim)', fontSize: '0.95rem', lineHeight: 1.4, paddingRight: '1rem', overflowWrap: 'break-word' }}>
                                <div style={{ marginBottom: '0.5rem' }}>{listing.original_title}</div>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 600, backgroundColor: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px' }}>
                                    <span style={{ color: getScoreColor(calculateSeoScore(listing.original_title)) }}>
                                        SEO Score: {calculateSeoScore(listing.original_title)}
                                    </span>
                                </div>
                            </div>

                            {/* Optimized */}
                            <div>
                                <textarea
                                    value={listing.optimized_title || ''}
                                    onChange={(e) => handleTitleChange(realIndex, e.target.value)}
                                    placeholder="Click Rewrite to generate..."
                                    style={{
                                        width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)',
                                        backgroundColor: 'rgba(0,0,0,0.2)', color: 'var(--color-text-main)', resize: 'vertical', minHeight: '60px', fontFamily: 'inherit', fontSize: '0.95rem'
                                    }}
                                />
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem', fontSize: '0.75rem' }}>
                                    {listing.optimized_title && (
                                        <span style={{ fontWeight: 600, color: getScoreColor(calculateSeoScore(listing.optimized_title)) }}>
                                            New Score: {calculateSeoScore(listing.optimized_title)}
                                            {calculateSeoScore(listing.optimized_title) > calculateSeoScore(listing.original_title) && (
                                                <span style={{ color: '#4caf50', marginLeft: '4px' }}>(+{calculateSeoScore(listing.optimized_title) - calculateSeoScore(listing.original_title)})</span>
                                            )}
                                        </span>
                                    )}
                                    <span style={{ color: getCharCountColor(listing.optimized_title?.length || 0), fontWeight: 600, marginLeft: 'auto' }}>
                                        {listing.optimized_title?.length || 0}/80
                                    </span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', paddingTop: '0.25rem' }}>
                                <button
                                    onClick={() => rewriteTitle(realIndex)}
                                    className="btn"
                                    style={{
                                        padding: '0.4rem', borderRadius: '50%',
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
                                        onClick={() => pushToEbay(realIndex)}
                                        className="btn"
                                        style={{
                                            padding: '0.4rem', borderRadius: '50%',
                                            background: !isPro ? 'rgba(255,255,255,0.05)' : listing.status === 'uploaded' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(156, 85, 213, 0.1)',
                                            color: !isPro ? 'var(--color-text-dim)' : listing.status === 'uploaded' ? '#4caf50' : '#d6bcfa',
                                            border: listing.status === 'uploaded' ? '1px solid #4caf50' : 'none',
                                            cursor: !isPro ? 'pointer' : 'pointer'
                                        }}
                                        title={!isPro ? "Upgrade to Push Live" : listing.status === 'uploaded' ? "Already on eBay" : "Push to eBay"}
                                        disabled={listing.pushing || listing.loading}
                                    >
                                        {listing.pushing ?
                                            <div className="animate-spin" style={{ width: 16, height: 16, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%' }} /> :
                                            !isPro ? <Lock size={14} /> :
                                                listing.status === 'uploaded' ? <CheckCircle size={16} /> : <CloudPush size={16} />
                                        }
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
