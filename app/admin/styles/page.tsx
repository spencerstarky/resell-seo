'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Trash2, Plus, Info, Save, ChevronRight, Hash, Eye, Tag, AlertCircle, Edit2, X } from 'lucide-react';
import Link from 'next/link';
import { AdminNav } from '@/components/admin/AdminNav';

// Types
type Style = {
    id: string;
    style_name: string;
    display_name: string;
    category_whitelist: string[];
    confidence_floor: number;
    max_per_title: number;
};

type Signal = {
    id: string;
    style_id: string;
    signal_type: 'visual' | 'text' | 'attribute';
    signal_value: string;
    weight: number;
};

export default function StyleManager() {
    // const [supabase] = useState(() => createClient()); // REMOVED
    const [styles, setStyles] = useState<Style[]>([]);
    const [selectedStyle, setSelectedStyle] = useState<Style | null>(null);
    const [signals, setSignals] = useState<Signal[]>([]);
    const [loading, setLoading] = useState(true);

    // Form States
    const [newStyleName, setNewStyleName] = useState('');
    const [newDisplayName, setNewDisplayName] = useState('');

    // Signal Form
    const [newSignalValue, setNewSignalValue] = useState('');
    const [newSignalType, setNewSignalType] = useState<'visual' | 'text' | 'attribute'>('text');
    const [newSignalWeight, setNewSignalWeight] = useState(0.3);

    // Editing State
    const [editingSignalId, setEditingSignalId] = useState<string | null>(null);
    const [editWeight, setEditWeight] = useState(0.0);

    useEffect(() => {
        fetchStyles();
    }, []);

    useEffect(() => {
        if (selectedStyle) {
            fetchSignals(selectedStyle.id);
        } else {
            setSignals([]);
        }
    }, [selectedStyle]);

    const fetchStyles = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('style_taxonomy').select('*').order('display_name');
        if (data) setStyles(data);
        if (error) alert('Error fetching styles: ' + error.message);
        setLoading(false);
    };

    const fetchSignals = async (styleId: string) => {
        const { data, error } = await supabase
            .from('style_signals')
            .select('*')
            .eq('style_id', styleId)
            .order('weight', { ascending: false });

        if (data) setSignals(data);
    };

    const createStyle = async () => {
        if (!newStyleName || !newDisplayName) return;

        const { data, error } = await supabase.from('style_taxonomy').insert({
            style_name: newStyleName.toLowerCase().replace(/\s+/g, '-'),
            display_name: newDisplayName,
            category_whitelist: [], // Default empty
            confidence_floor: 0.75
        }).select().single();

        if (error) {
            alert('Error creating style: ' + error.message);
        } else {
            setStyles([...styles, data]);
            setNewStyleName('');
            setNewDisplayName('');
        }
    };

    const deleteStyle = async (id: string) => {
        if (!confirm('Are you sure? This will delete all signals associated with this style.')) return;

        const { error } = await supabase.from('style_taxonomy').delete().eq('id', id);
        if (error) {
            alert('Error: ' + error.message);
        } else {
            setStyles(styles.filter(s => s.id !== id));
            if (selectedStyle?.id === id) setSelectedStyle(null);
        }
    };

    const addSignal = async () => {
        if (!selectedStyle || !newSignalValue) return;

        const { data, error } = await supabase.from('style_signals').insert({
            style_id: selectedStyle.id,
            signal_type: newSignalType,
            signal_value: newSignalValue,
            weight: newSignalWeight
        }).select().single();

        if (error) {
            alert('Error adding signal: ' + error.message);
        } else {
            setSignals([...signals, data]); // Add to top or resort?
            // Re-fetch to sort correctly
            fetchSignals(selectedStyle.id);
            setNewSignalValue('');
        }
    };

    const deleteSignal = async (id: string) => {
        const { error } = await supabase.from('style_signals').delete().eq('id', id);
        if (error) {
            alert('Failed to delete signal');
        } else {
            setSignals(signals.filter(s => s.id !== id));
        }
    };

    const updateStyle = async (id: string, updates: Partial<Style>) => {
        const { error } = await supabase.from('style_taxonomy').update(updates).eq('id', id);
        if (error) {
            alert('Update failed: ' + error.message);
        } else {
            setStyles(styles.map(s => s.id === id ? { ...s, ...updates } : s));
            if (selectedStyle?.id === id) setSelectedStyle({ ...selectedStyle, ...updates });
        }
    };

    const startEditing = (signal: Signal) => {
        setEditingSignalId(signal.id);
        setEditWeight(signal.weight);
    };

    const saveSignalWeight = async (id: string) => {
        const { error } = await supabase.from('style_signals').update({ weight: editWeight }).eq('id', id);
        if (error) {
            alert('Update failed: ' + error.message);
        } else {
            // Update local state
            setSignals(signals.map(s => s.id === id ? { ...s, weight: editWeight } : s).sort((a, b) => b.weight - a.weight));
            setEditingSignalId(null);
        }
    };

    // Helper to render type icon
    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'visual': return <Eye size={14} className="text-blue-400" />;
            case 'attribute': return <Tag size={14} className="text-green-400" />;
            case 'text': return <Hash size={14} className="text-purple-400" />;
            default: return <Info size={14} />;
        }
    };



    return (
        <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', color: '#fff' }}>
            <AdminNav />

            <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: 0 }}>Style Intelligence Engine</h1>
                    <p style={{ color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>Define visual trends, keywords, and logic for automated style detection.</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '2rem' }}>

                {/* LEFT: Style Picker */}
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '1.5rem', height: 'fit-content' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        Active Styles
                        <span style={{ fontSize: '0.8rem', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '10px' }}>{styles.length}</span>
                    </h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
                        {loading ? <div className="text-muted">Loading...</div> : styles.map(style => (
                            <div
                                key={style.id}
                                onClick={() => setSelectedStyle(style)}
                                style={{
                                    padding: '0.75rem 1rem',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    background: selectedStyle?.id === style.id ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)',
                                    border: '1px solid',
                                    borderColor: selectedStyle?.id === style.id ? 'var(--color-primary)' : 'transparent',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <span style={{ fontWeight: 500 }}>{style.display_name}</span>
                                <ChevronRight size={16} style={{ opacity: selectedStyle?.id === style.id ? 1 : 0.3 }} />
                            </div>
                        ))}
                    </div>

                    <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
                        <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem' }}>Create New Style</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <input
                                placeholder="Display Name (e.g. Blokecore)"
                                value={newDisplayName}
                                onChange={e => setNewDisplayName(e.target.value)}
                                className="input-dark"
                                style={{ padding: '0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--color-border)', borderRadius: '6px', color: '#fff' }}
                            />
                            <input
                                placeholder="ID (e.g. blokecore)"
                                value={newStyleName}
                                onChange={e => setNewStyleName(e.target.value)}
                                className="input-dark"
                                style={{ padding: '0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--color-border)', borderRadius: '6px', color: '#fff' }}
                            />
                            <button
                                onClick={createStyle}
                                disabled={!newDisplayName || !newStyleName}
                                className="btn btn-primary"
                                style={{ width: '100%', marginTop: '0.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
                            >
                                <Plus size={16} /> Create Style
                            </button>
                        </div>
                    </div>
                </div>

                {/* RIGHT: Detail View */}
                <div>
                    {selectedStyle ? (
                        <>
                            {/* Header / Config */}
                            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                                    <div>
                                        <h2 style={{ fontSize: '1.8rem', fontWeight: 700, margin: 0 }}>{selectedStyle.display_name}</h2>
                                        <code style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>ID: {selectedStyle.style_name}</code>
                                    </div>
                                    <button
                                        onClick={() => deleteStyle(selectedStyle.id)}
                                        style={{ color: '#ff4444', background: 'rgba(255,68,68,0.1)', padding: '0.5rem', borderRadius: '6px', border: 'none', cursor: 'pointer' }}
                                        title="Delete Style"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Confidence Threshold (0.1 - 1.0)</label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <input
                                                type="range" min="0.1" max="1.0" step="0.05"
                                                value={selectedStyle.confidence_floor}
                                                onChange={(e) => updateStyle(selectedStyle.id, { confidence_floor: parseFloat(e.target.value) })}
                                                style={{ flex: 1 }}
                                            />
                                            <span style={{ fontWeight: 600, minWidth: '40px' }}>{selectedStyle.confidence_floor}</span>
                                        </div>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', marginTop: '0.5rem' }}>
                                            Higher = stricter. Lower = more detections but maybe false positives.
                                        </p>
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Allowed Categories (Comma separated)</label>
                                        <input
                                            value={selectedStyle.category_whitelist?.join(', ') || ''}
                                            onChange={(e) => updateStyle(selectedStyle.id, { category_whitelist: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                                            className="input-dark"
                                            style={{ width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--color-border)', borderRadius: '6px', color: '#fff' }}
                                            placeholder="e.g. Outerwear, Pants, Vests"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Signal Manager */}
                            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '1.5rem' }}>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    Detection Signals
                                    <span style={{ fontSize: '0.8rem', background: 'var(--color-primary)', padding: '2px 8px', borderRadius: '10px' }}>{signals.length}</span>
                                </h3>

                                {/* Add New Signal */}
                                <div style={{ display: 'grid', gridTemplateColumns: '120px 2fr 100px 100px', gap: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', marginBottom: '1.5rem', alignItems: 'center' }}>
                                    <select
                                        value={newSignalType}
                                        onChange={(e) => setNewSignalType(e.target.value as any)}
                                        style={{ padding: '0.5rem', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--color-border)', color: '#fff' }}
                                    >
                                        <option value="text">Keyword</option>
                                        <option value="visual">Visual</option>
                                        <option value="attribute">Attribute</option>
                                    </select>

                                    <input
                                        placeholder="Value (e.g. 'zipper', 'patagonia')"
                                        value={newSignalValue}
                                        onChange={e => setNewSignalValue(e.target.value)}
                                        style={{ padding: '0.5rem', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--color-border)', color: '#fff' }}
                                    />

                                    <input
                                        type="number" step="0.1" max="1.0" min="0.1"
                                        value={newSignalWeight}
                                        onChange={e => setNewSignalWeight(parseFloat(e.target.value))}
                                        title="Weight"
                                        style={{ padding: '0.5rem', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--color-border)', color: '#fff' }}
                                    />

                                    <button
                                        onClick={addSignal}
                                        className="btn btn-primary"
                                        disabled={!newSignalValue}
                                        style={{ padding: '0.5rem', display: 'flex', justifyContent: 'center' }}
                                    >
                                        <Plus size={18} />
                                    </button>
                                </div>

                                {/* Signal List */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {signals.length === 0 && <div className="text-muted text-center py-4">No signals defined yet.</div>}

                                    {signals.map(signal => (
                                        <div key={signal.id} style={{
                                            display: 'grid', gridTemplateColumns: '40px 1fr 100px 80px', gap: '1rem', alignItems: 'center',
                                            padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', borderRadius: '8px'
                                        }}>
                                            <div title={signal.signal_type.toUpperCase()} style={{ display: 'flex', justifyContent: 'center' }}>
                                                {getTypeIcon(signal.signal_type)}
                                            </div>

                                            <div style={{ fontWeight: 500 }}>
                                                {signal.signal_value}
                                                <span style={{ marginLeft: '8px', fontSize: '0.75rem', color: 'var(--color-text-dim)', textTransform: 'uppercase' }}>{signal.signal_type}</span>
                                            </div>

                                            {/* Weight Column (View/Edit) */}
                                            {editingSignalId === signal.id ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <input
                                                        type="number" step="0.1" min="0" max="1"
                                                        value={editWeight}
                                                        onChange={e => setEditWeight(parseFloat(e.target.value))}
                                                        style={{ width: '60px', padding: '4px', borderRadius: '4px', background: 'black', border: '1px solid #444', color: 'white' }}
                                                        autoFocus
                                                    />
                                                    <button onClick={() => saveSignalWeight(signal.id)} className="text-green-400 hover:text-green-300"><Save size={16} /></button>
                                                    <button onClick={() => setEditingSignalId(null)} className="text-gray-400 hover:text-gray-300"><X size={16} /></button>
                                                </div>
                                            ) : (
                                                <div style={{ fontWeight: 600, color: signal.weight >= 0.5 ? '#4caf50' : 'var(--color-text-muted)' }}>
                                                    +{signal.weight}
                                                </div>
                                            )}

                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                {editingSignalId !== signal.id && (
                                                    <button
                                                        onClick={() => startEditing(signal)}
                                                        style={{ color: 'var(--color-text-muted)', background: 'transparent', border: 'none', cursor: 'pointer', opacity: 0.6 }}
                                                        className="hover:text-blue-400 hover:opacity-100"
                                                        title="Edit Weight"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => deleteSignal(signal.id)}
                                                    style={{ color: 'var(--color-text-muted)', background: 'transparent', border: 'none', cursor: 'pointer', opacity: 0.6 }}
                                                    className="hover:text-red-400 hover:opacity-100"
                                                    title="Delete Signal"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: '1.2rem', flexDirection: 'column', gap: '1rem', opacity: 0.5 }}>
                            <AlertCircle size={48} />
                            Select a style to manage signals
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
