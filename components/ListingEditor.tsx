'use client';

import { useState, useEffect } from 'react';
import { Sparkles, Save, Trash2, CloudDownload as CloudPush, CheckCircle, Lock, Ban, Undo2, X, Loader2 } from 'lucide-react';

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
    display_priority?: string; // Optional property from DB that might exist
    last_optimized_at?: number; // For Rate Limiting
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
    hideIgnored?: boolean;
    showSort?: boolean;
    simpleView?: boolean;
    onUpdateItem?: (id: string, updates: any) => void;
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
    showPushLive = false,
    hideIgnored = false,
    showSort = true,
    simpleView = false,
    onUpdateItem
}: ListingEditorProps) {
    const [listings, setListings] = useState(initialListings);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);

    // --- UPGRADE MODAL COMPONENT ---
    const UpgradeModal = () => {
        const [isRedirecting, setIsRedirecting] = useState(false);

        const handleUpgrade = async () => {
            setIsRedirecting(true);
            try {
                const res = await fetch('/api/stripe/checkout', { method: 'POST' });
                const data = await res.json();
                if (data.url) window.location.href = data.url;
                else {
                    alert('Checkout Error: ' + (data.error || 'No URL returned'));
                    setIsRedirecting(false);
                }
            } catch (e) {
                console.error(e);
                alert('Connection failed');
                setIsRedirecting(false);
            }
        };

        return (
            <div style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backdropFilter: 'blur(4px)'
            }} onClick={() => setShowUpgradeModal(false)}>
                <div style={{
                    background: 'var(--color-bg-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0',
                    maxWidth: '600px',
                    width: '90%',
                    position: 'relative',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                    overflow: 'hidden'
                }} onClick={e => e.stopPropagation()}>

                    {/* Header / Close */}
                    <button
                        onClick={() => setShowUpgradeModal(false)}
                        style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', zIndex: 10 }}
                    >
                        <X size={20} />
                    </button>

                    {/* Content - Using the Green Theme from Account Page */}
                    <div style={{
                        padding: '2.5rem',
                        background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.1), rgba(28, 126, 32, 0.1))',
                        border: '1px solid rgba(76, 175, 80, 0.2)'
                    }}>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: '#fff' }}>Upgrade to Annual Plan</h2>
                            <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.8)', lineHeight: 1.5 }}>
                                You've reached your trial limit. Upgrade to bulk-optimize 5,000 titles and rank higher in eBay search.
                            </p>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <button
                                onClick={handleUpgrade}
                                disabled={isRedirecting}
                                className="btn btn-primary"
                                style={{
                                    width: '100%',
                                    padding: '0.8rem',
                                    fontSize: '1rem',
                                    boxShadow: '0 0 20px rgba(76, 175, 80, 0.4)',
                                    background: '#4caf50',
                                    borderColor: '#4caf50',
                                    justifyContent: 'center',
                                    opacity: isRedirecting ? 0.7 : 1
                                }}
                            >
                                {isRedirecting ? 'Redirecting to Checkout...' : 'Upgrade and Optimize my store'}
                            </button>
                            <p style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.5)', textAlign: 'center' }}>
                                $99/year - No monthly plan
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

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
            if (item.status === 'IGNORED') newStatus = 'IGNORED';
            else if (item.status === 'live' || item.status === 'uploaded' || item.status === 'LIVE') newStatus = 'LIVE';
            else if (item.optimized_title) newStatus = 'OPTIMIZED';

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
        // ALLOWED FOR ALL USERS

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
            setShowUpgradeModal(true);
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

    const handleBatchVerify = async (items: any[]) => {
        try {
            const { supabase } = await import('@/lib/supabase');
            if (!userId || items.length === 0) return;

            const updates = items.map(item => ({
                id: item.id,
                user_id: userId,
                ebay_item_id: item.ebay_item_id,
                original_title: item.original_title,
                current_title: item.original_title, // REQUIRED: Fixes "null value in column current_title" error
                status: 'IGNORED', // Acts as VERIFIED
                updated_at: new Date().toISOString()
            }));

            // DB Update
            const { error } = await supabase
                .from('ebay_inventory')
                .upsert(updates, { onConflict: 'id' });

            if (error) throw error;

            // Local Update (Remove from current view immediately)
            // We set them to IGNORED, so if we are in WORKSPACE, they will disappear.
            setListings(prev => {
                const next = [...prev];
                items.forEach(item => {
                    next[item.index].status = 'IGNORED';
                });
                return next;
            });

            // Notify Parent (optional, if using external state management)
            items.forEach(item => {
                if (onUpdateItem && item.id) onUpdateItem(item.id, { status: 'IGNORED' });
            });

            console.log(`[Batch Verify] Moved ${items.length} items to Completed/Verified.`);

        } catch (e: any) {
            console.error('Batch Verify Failed:', e);
            alert('Failed to move verified items: ' + e.message);
        }
    };

    const rewriteAll = async () => {
        if (!checkCredits) return;

        // SMART FILTER: Identify items that are already great
        const allPendingIndices = listings
            .map((l, i) => ({
                ...l,
                index: i,
                score: calculateSeoScore(l.original_title)
            }))
            .filter(l => !l.optimized_title || l.optimized_title === l.original_title);

        const highScoreItems = allPendingIndices.filter(l => l.score >= 90);
        const normalItems = allPendingIndices.filter(l => l.score < 90);

        let todoIndices = normalItems.map(l => l.index);
        let skippedCount = highScoreItems.length;
        let confirmMessage = `Ready to rewrite ${todoIndices.length} titles.`;

        if (skippedCount > 0) {
            confirmMessage = `🎉 We found ${skippedCount} titles that already have a Perfect SEO Score (90+)! \n\nWe will automatically move these to your 'Completed' tab as VERIFIED.\n\nReady to optimize the remaining ${todoIndices.length} items?`;
        } else {
            confirmMessage = `This will rewrite ${todoIndices.length} titles.`;
        }

        if (todoIndices.length === 0 && skippedCount > 0) {
            // ONLY high score items found. Just move them and exit.
            if (confirm(`🎉 found ${skippedCount} titles that already have a Perfect SEO Score (90+)! \n\nMove them to 'Completed' tab now?`)) {
                await handleBatchVerify(highScoreItems);
            }
            return;
        }

        if (todoIndices.length === 0) {
            alert('All titles are already optimized!');
            return;
        }

        // Estimated Time Calculation (approx 1.5s per 4 items)
        const estimatedMinutes = Math.ceil((todoIndices.length * 0.4) / 60);

        if (!confirm(`${confirmMessage}\n\nEstimated time: ~${estimatedMinutes} minute(s).\n\nPlease keep this tab open while we work!`)) return;

        // 1. Move High Scores First
        if (skippedCount > 0) {
            await handleBatchVerify(highScoreItems);
        }

        setListings((prev: Listing[]) => {
            const next = [...prev];
            // Set loading state ONLY for the ones we are actually doing
            todoIndices.forEach(idx => {
                next[idx] = { ...next[idx], loading: true };
            });
            return next;
        });

        // SPEED UP: Batch 4, Delay 1000ms => ~100 items/min
        const BATCH_SIZE = 4;
        for (let i = 0; i < todoIndices.length; i += BATCH_SIZE) {
            const batch = todoIndices.slice(i, i + BATCH_SIZE);

            // Execute batch in parallel
            await Promise.all(batch.map(idx => rewriteTitle(idx)));

            // Short delay to let the server breathe, but much faster than before
            if (i + BATCH_SIZE < todoIndices.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    };

    const rewriteTitle = async (index: number) => {
        const listing = listings[index];
        if (!listing.original_title) return;

        // --- SAFETY: Rate Limit (2s) ---
        // Prevents UI loops or double-clicks from consuming credits rapidly
        const now = Date.now();
        if (listing.last_optimized_at && now - listing.last_optimized_at < 2000) {
            console.warn(`[SafeGuard] Blocked rapid optimization for item ${index}`);
            return;
        }

        if (checkCredits && !checkCredits()) {
            setShowUpgradeModal(true);
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
                const newItem = {
                    ...listings[index],
                    optimized_title: data.optimizedTitle,
                    loading: false,
                    last_optimized_at: Date.now() // Set timestamp
                };

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
        const sorted = [...listings].filter(l => !hideIgnored || l.status !== 'IGNORED');
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
                    {showSort && (
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
                    )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                    {savingRows.size > 0 ? (
                        <span style={{ color: 'var(--color-primary)' }}><span className="animate-pulse">●</span> Saving...</span>
                    ) : lastSaved ? (
                        <span><Save size={14} style={{ display: 'inline', marginRight: 4 }} /> Saved</span>
                    ) : null}
                </div>

                {/* Header Actions - ONLY SHOW IN WORKSPACE VIEW */}
                {!simpleView && displayListings.length > 0 && (
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
                            <Save size={16} /> Save
                        </button>

                        {showPushLive && (
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
                        )}
                    </div>
                )}
            </div>

            {/* Empty State / List Header */}
            {displayListings.length === 0 ? (
                !simpleView ? (
                    <div style={{ textAlign: 'center', padding: '4rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--color-border)', marginTop: '2rem' }}>
                        <div style={{ width: 60, height: 60, background: 'rgba(76, 175, 80, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                            <CheckCircle size={30} style={{ color: '#4caf50' }} />
                        </div>
                        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>You're all caught up!</h3>
                        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem', maxWidth: '400px', margin: '0 auto' }}>
                            No pending listings in your workspace. List more items on eBay, then sync to optimize them!
                        </p>
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>No completed items found.</div>
                )
            ) : (
                <>
                    {/* List Header */}
                    {simpleView ? (
                        <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 100px 40px', gap: '1.5rem', padding: '0.75rem 1.5rem', color: 'var(--color-text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            <div>Image</div>
                            <div>Title</div>
                            <div style={{ textAlign: 'right' }}>Score</div>
                            <div></div>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr 140px', gap: '1.5rem', padding: '0.75rem 1.5rem', color: 'var(--color-text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            <div>Image</div>
                            <div>Original Title</div>
                            <div>Optimized Title</div>
                            <div style={{ textAlign: 'right' }}>Action</div>
                        </div>
                    )}

                    {/* The List Logic */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {displayListings.map((listing, _) => {
                            // Match sorting to original index
                            const realIndex = listings.findIndex(l => l.id === listing.id);
                            // Fallback if ID is missing (should verify handled)
                            if (realIndex === -1) return null;

                            // --- SIMPLE VIEW RENDER ---
                            if (simpleView) {
                                return (
                                    <div key={listing.id || realIndex} style={{
                                        display: 'grid', gridTemplateColumns: '80px 1fr 100px 40px', gap: '1.5rem', alignItems: 'center', padding: '1rem 1.5rem',
                                        backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)', border: '1px solid transparent'
                                    }}>
                                        {/* Image */}
                                        <div style={{ width: '80px', height: '80px', borderRadius: '6px', overflow: 'hidden', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {listing.image_url ? (
                                                <img src={listing.image_url} alt="Item" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                            ) : (
                                                <span style={{ fontSize: '1.5rem', opacity: 0.2 }}>📷</span>
                                            )}
                                        </div>

                                        {/* content */}
                                        <div>
                                            <div style={{ color: 'var(--color-text-main)', fontSize: '1rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                                                {listing.optimized_title || listing.original_title}
                                            </div>
                                            {/* Optional Status Badge */}
                                            {listing.status === 'IGNORED' && <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px' }}>Ignored (Active on eBay)</span>}
                                            {(listing.status === 'LIVE' || listing.status === 'uploaded') && <span style={{ fontSize: '0.75rem', color: '#4caf50', background: 'rgba(76, 175, 80, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>Live on eBay</span>}
                                        </div>

                                        {/* Score */}
                                        <div style={{ textAlign: 'right' }}>
                                            <span style={{ fontSize: '1.2rem', fontWeight: 700, color: getScoreColor(calculateSeoScore(listing.optimized_title || listing.original_title)) }}>
                                                {calculateSeoScore(listing.optimized_title || listing.original_title)}
                                            </span>
                                            {calculateSeoScore(listing.optimized_title || listing.original_title) >= 90 && (
                                                <div style={{ fontSize: '0.7rem', color: '#4caf50', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', marginTop: '4px' }}>
                                                    <CheckCircle size={12} fill="#4caf50" color="#fff" /> Verified
                                                </div>
                                            )}
                                        </div>

                                        {/* Restore Action */}
                                        <div style={{ textAlign: 'right' }}>
                                            {listing.status === 'IGNORED' && (
                                                <button
                                                    title="Restore to Workspace"
                                                    onClick={() => {
                                                        const updated = [...listings];
                                                        const nextStatus = updated[realIndex].optimized_title ? 'OPTIMIZED' : 'NEW';
                                                        updated[realIndex].status = nextStatus;
                                                        setListings(updated);
                                                        saveSingleRow(realIndex, { ...updated[realIndex], status: nextStatus });
                                                        onUpdateItem?.(listing.id!, { status: nextStatus });
                                                    }}
                                                    className="btn"
                                                    style={{
                                                        padding: '0.4rem', borderRadius: '50%', background: 'transparent', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)', cursor: 'pointer'
                                                    }}
                                                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-primary)'; e.currentTarget.style.borderColor = 'var(--color-primary)'; }}
                                                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-muted)'; e.currentTarget.style.borderColor = 'var(--color-border)'; }}
                                                >
                                                    <Undo2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            }

                            // --- COMPEX VIEW RENDER (Existing) ---
                            return (
                                <div key={listing.id || realIndex} className="" style={{
                                    display: 'grid', gridTemplateColumns: '80px 1fr 1fr 140px', gap: '1.5rem', alignItems: 'start', padding: '1.5rem',
                                    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)', border: '1px solid transparent'
                                }}
                                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
                                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'transparent' }}
                                >
                                    {/* Image Thumbnail */}
                                    <div style={{ width: '80px', height: '80px', borderRadius: '6px', overflow: 'hidden', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {listing.image_url ? (
                                            <img
                                                src={listing.image_url}
                                                alt="Item"
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                            />
                                        ) : (
                                            <span style={{ fontSize: '1.5rem', opacity: 0.2 }}>📷</span>
                                        )}
                                    </div>

                                    {/* Original */}
                                    <div style={{ color: 'var(--color-text-dim)', fontSize: '0.95rem', lineHeight: 1.4, paddingRight: '1rem', overflowWrap: 'break-word' }}>
                                        <div style={{ marginBottom: '0.5rem' }}>{listing.original_title}</div>
                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 600, backgroundColor: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px' }}>
                                            <span style={{ color: getScoreColor(calculateSeoScore(listing.original_title)) }}>
                                                SEO Score: {calculateSeoScore(listing.original_title)}
                                            </span>
                                            {calculateSeoScore(listing.original_title) >= 90 && (
                                                <CheckCircle size={14} fill="#4caf50" color="#000" style={{ marginLeft: 4 }} />
                                            )}
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

                                    {/* Actions Column */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'stretch' }}>

                                        {/* CASE 1: IGNORED */}
                                        {listing.status === 'IGNORED' ? (
                                            <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem', padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
                                                <Ban size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'text-bottom' }} />
                                                Ignored
                                            </div>
                                        ) :

                                            /* CASE 2: LIVE / UPLOADED */
                                            (listing.status === 'LIVE' || listing.status === 'uploaded') ? (
                                                <div style={{ textAlign: 'center', color: '#4caf50', fontSize: '0.85rem', padding: '0.5rem', background: 'rgba(76, 175, 80, 0.1)', borderRadius: '6px', border: '1px solid rgba(76, 175, 80, 0.2)' }}>
                                                    <CheckCircle size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'text-bottom' }} />
                                                    Live on eBay
                                                </div>
                                            ) :

                                                /* CASE 3: WORKSPACE ACTIONS */
                                                (
                                                    <>
                                                        {/* Optimize Button - Default Primary Action */}
                                                        {!listing.optimized_title && (
                                                            <button
                                                                onClick={() => rewriteTitle(realIndex)}
                                                                className="btn"
                                                                style={{
                                                                    padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.8rem', width: '100%',
                                                                    background: 'rgba(156, 85, 213, 0.15)', color: 'var(--color-primary)', border: '1px solid rgba(156, 85, 213, 0.3)'
                                                                }}
                                                                disabled={listing.loading}
                                                            >
                                                                {listing.loading ? (
                                                                    <><div className="animate-spin" style={{ width: 14, height: 14, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', marginRight: 6 }} /> Working...</>
                                                                ) : (
                                                                    <><Sparkles size={14} style={{ marginRight: 6 }} /> Optimize</>
                                                                )}
                                                            </button>
                                                        )}

                                                        {/* Push/Re-Optimize Actions */}
                                                        {listing.optimized_title && (
                                                            <>
                                                                <button
                                                                    onClick={() => pushToEbay(realIndex)}
                                                                    className="btn"
                                                                    style={{
                                                                        padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.8rem', width: '100%',
                                                                        background: 'linear-gradient(135deg, var(--color-primary), #7928ca)',
                                                                        color: '#fff',
                                                                        border: 'none',
                                                                    }}
                                                                    disabled={listing.pushing}
                                                                    title="Push to eBay"
                                                                >
                                                                    {listing.pushing ? 'Syncing...' : <><CloudPush size={14} style={{ marginRight: 6 }} /> Push Live</>}
                                                                </button>

                                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                                    <button
                                                                        onClick={() => {
                                                                            console.log('Re-optimizing item:', realIndex);
                                                                            rewriteTitle(realIndex);
                                                                        }}
                                                                        disabled={listing.loading}
                                                                        className="btn"
                                                                        title={listing.loading ? "Optimizing..." : "Try Again (Re-Optimize)"}
                                                                        onMouseEnter={(e) => {
                                                                            if (listing.loading) return;
                                                                            e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
                                                                            e.currentTarget.style.color = 'var(--color-primary)';
                                                                            e.currentTarget.style.transform = 'translateY(-1px)';
                                                                        }}
                                                                        onMouseLeave={(e) => {
                                                                            e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                                                            e.currentTarget.style.color = 'var(--color-text-muted)';
                                                                            e.currentTarget.style.transform = 'translateY(0)';
                                                                        }}
                                                                        style={{
                                                                            padding: '0.4rem',
                                                                            borderRadius: '6px',
                                                                            flex: 1,
                                                                            background: 'rgba(255,255,255,0.05)',
                                                                            color: 'var(--color-text-muted)',
                                                                            transition: 'all 0.2s ease',
                                                                            cursor: listing.loading ? 'wait' : 'pointer',
                                                                            opacity: listing.loading ? 0.7 : 1,
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center'
                                                                        }}
                                                                    >
                                                                        {listing.loading ? (
                                                                            <Loader2 size={14} className="animate-spin" />
                                                                        ) : (
                                                                            <Sparkles size={14} />
                                                                        )}
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            // Ignore Logic: Set status to IGNORED and save
                                                                            const updated = [...listings];
                                                                            updated[realIndex].status = 'IGNORED';
                                                                            setListings(updated);
                                                                            saveSingleRow(realIndex, { ...updated[realIndex], status: 'IGNORED' });
                                                                        }}
                                                                        className="btn btn-hover-danger"
                                                                        title="Ignore / Dismiss"
                                                                        style={{ padding: '0.4rem', borderRadius: '6px', flex: 1, background: 'rgba(255,255,255,0.05)', color: 'var(--color-text-muted)', border: '1px solid transparent' }}
                                                                    >
                                                                        <Ban size={14} />
                                                                    </button>
                                                                </div>
                                                            </>
                                                        )}

                                                        {/* Initial Ignore (if not optimized yet) */}
                                                        {!listing.optimized_title && (
                                                            <button
                                                                onClick={() => {
                                                                    const updated = [...listings];
                                                                    updated[realIndex].status = 'IGNORED';
                                                                    setListings(updated);
                                                                    saveSingleRow(realIndex, { ...updated[realIndex], status: 'IGNORED' });
                                                                    onUpdateItem?.(listing.id!, { status: 'IGNORED' });
                                                                }}
                                                                className="btn btn-hover-danger"
                                                                style={{
                                                                    padding: '0.3rem', borderRadius: '6px', fontSize: '0.75rem', width: '100%',
                                                                    background: 'transparent', color: 'var(--color-text-dim)', border: '1px solid transparent'
                                                                }}
                                                            >
                                                                Ignore
                                                            </button>
                                                        )}
                                                    </>
                                                )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}

            {/* Render Modal */}
            {showUpgradeModal && <UpgradeModal />}
        </div>
    );
}
