'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Trash2, Plus, Info, Save, ChevronRight, Hash, Eye, Tag, AlertCircle, Edit2, X, RefreshCw, Layers } from 'lucide-react';
import Link from 'next/link';
import { AdminNav } from '@/components/admin/AdminNav';

// Types matches DB
type Style = {
    id: string;
    style_name: string;
    display_name: string;
};

type MatrixAttribute = {
    id: string;
    style_id: string;
    attribute_value: string;
    attribute_type: 'aesthetic' | 'use_case' | 'material' | 'detail' | 'garment_type';
    weight: number;
};

const ATTRIBUTE_TYPES = ['aesthetic', 'use_case', 'material', 'detail', 'garment_type'];

export default function StyleMatrixManager() {
    const [styles, setStyles] = useState<Style[]>([]);
    const [selectedStyle, setSelectedStyle] = useState<Style | null>(null);
    const [attributes, setAttributes] = useState<MatrixAttribute[]>([]);
    const [loading, setLoading] = useState(true);

    // Form States
    const [newAttrValue, setNewAttrValue] = useState('');
    const [newAttrType, setNewAttrType] = useState<string>('aesthetic');
    const [newAttrWeight, setNewAttrWeight] = useState(0.8);

    // Editing State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editWeight, setEditWeight] = useState(0.0);

    // Preview
    const [previewContext, setPreviewContext] = useState('');

    useEffect(() => {
        fetchStyles();
    }, []);

    useEffect(() => {
        if (selectedStyle) {
            fetchAttributes(selectedStyle.id);
            generatePreview(selectedStyle);
        } else {
            setAttributes([]);
            setPreviewContext('');
        }
    }, [selectedStyle]);

    const fetchStyles = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('style_taxonomy').select('id, style_name, display_name').order('display_name');
        if (data) setStyles(data);
        setLoading(false);
    };

    const fetchAttributes = async (styleId: string) => {
        const { data, error } = await supabase
            .from('style_compatibility_attributes')
            .select('*')
            .eq('style_id', styleId)
            .order('weight', { ascending: false });

        if (data) setAttributes(data as MatrixAttribute[]);
    };

    const addAttribute = async () => {
        if (!selectedStyle || !newAttrValue) return;

        const { data, error } = await supabase.from('style_compatibility_attributes').insert({
            style_id: selectedStyle.id,
            attribute_value: newAttrValue,
            attribute_type: newAttrType,
            weight: newAttrWeight
        }).select().single();

        if (error) {
            alert('Error adding attribute: ' + error.message);
        } else {
            setAttributes([...attributes, data as MatrixAttribute].sort((a, b) => b.weight - a.weight));
            setNewAttrValue('');
            // generatePreview(selectedStyle); // Update preview?
        }
    };

    const deleteAttribute = async (id: string) => {
        const { error } = await supabase.from('style_compatibility_attributes').delete().eq('id', id);
        if (error) {
            alert('Failed to delete');
        } else {
            setAttributes(attributes.filter(a => a.id !== id));
        }
    };

    const saveWeight = async (id: string) => {
        const { error } = await supabase.from('style_compatibility_attributes').update({ weight: editWeight }).eq('id', id);
        if (!error) {
            setAttributes(attributes.map(a => a.id === id ? { ...a, weight: editWeight } : a).sort((a, b) => b.weight - a.weight));
            setEditingId(null);
        }
    };

    const startEditing = (attr: MatrixAttribute) => {
        setEditingId(attr.id);
        setEditWeight(attr.weight);
    };

    const generatePreview = (style: Style) => {
        // Mock generation
        // In reality, we'd trigger the server function, but here we simulate the logic
        // We know the logic: Group by type, filter top weights.

        // Use current state 'attributes' might be stale if just added, but good enough.
    };

    // Live update preview based on attributes state
    useEffect(() => {
        if (!selectedStyle) return;

        const aesthetics = attributes.filter(a => a.attribute_type === 'aesthetic').map(a => a.attribute_value).join(', ');
        const useCases = attributes.filter(a => a.attribute_type === 'use_case').map(a => a.attribute_value).join(', ');
        const materials = attributes.filter(a => ['material', 'detail', 'garment_type'].includes(a.attribute_type)).map(a => a.attribute_value).join(', ');

        const text = `
STYLE COMPATIBILITY MATRIX (DETECTED ARCHETYPE: ${selectedStyle.display_name.toUpperCase()})
- This item matches the "${selectedStyle.display_name}" style archetype.
- When enriching the title, PRIOIRITIZE these compatible attributes (if true):
  - Aesthetics: ${aesthetics || '(None)'}
  - Use Cases: ${useCases || '(None)'}
  - Materials/Details: ${materials || '(None)'}
- Rule: Do not force these if clearly contradicted by images.
        `;
        setPreviewContext(text.trim());
    }, [attributes, selectedStyle]);


    const getTypeColor = (type: string) => {
        switch (type) {
            case 'aesthetic': return 'text-purple-400';
            case 'use_case': return 'text-blue-400';
            case 'material': return 'text-green-400';
            case 'detail': return 'text-yellow-400';
            case 'garment_type': return 'text-pink-400';
            default: return 'text-white';
        }
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', color: '#fff' }}>
            <AdminNav />

            <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Layers className="text-blue-500" />
                        Style Compatibility Matrix
                    </h1>
                    <p style={{ color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
                        Manage relationships between Styles and Attributes. This data powers the Title Enrichment engine.
                    </p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '2rem' }}>

                {/* LEFT: Style Picker */}
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '1.5rem', height: 'fit-content' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        Active Style Nodes
                        <span style={{ fontSize: '0.8rem', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '10px' }}>{styles.length}</span>
                    </h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '70vh', overflowY: 'auto' }}>
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
                                    fontWeight: selectedStyle?.id === style.id ? 600 : 400
                                }}
                            >
                                <span>{style.display_name}</span>
                                <ChevronRight size={16} style={{ opacity: selectedStyle?.id === style.id ? 1 : 0.3 }} />
                            </div>
                        ))}
                    </div>

                    <div style={{ marginTop: '1rem', borderTop: '1px solid #333', paddingTop: '1rem', fontSize: '0.8rem', color: 'gray' }}>
                        Note: Manage Nodes in the "Detection Engine" tab. This tab manages their output attributes.
                    </div>
                </div>

                {/* RIGHT: Detail View */}
                <div>
                    {selectedStyle ? (
                        <>
                            {/* Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <h2 style={{ fontSize: '1.8rem', fontWeight: 700, margin: 0 }}>
                                    {selectedStyle.display_name}
                                    <span style={{ fontSize: '1rem', fontWeight: 400, color: 'gray', marginLeft: '12px' }}>Compatibility Profile</span>
                                </h2>
                            </div>

                            {/* Add Attribute Form */}
                            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem' }}>
                                <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem' }}>Add Compatible Attribute</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '150px 2fr 100px 100px', gap: '1rem', alignItems: 'center' }}>

                                    <select
                                        value={newAttrType}
                                        onChange={(e) => setNewAttrType(e.target.value)}
                                        style={{ padding: '0.6rem', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid #444', color: 'white' }}
                                    >
                                        {ATTRIBUTE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>

                                    <input
                                        placeholder="Attribute Value (e.g. 'Safari', 'Linen')"
                                        value={newAttrValue}
                                        onChange={e => setNewAttrValue(e.target.value)}
                                        style={{ padding: '0.6rem', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid #444', color: 'white' }}
                                    />

                                    <input
                                        type="number" step="0.05" min="0" max="1"
                                        value={newAttrWeight}
                                        onChange={e => setNewAttrWeight(parseFloat(e.target.value))}
                                        title="Weight (0-1)"
                                        style={{ padding: '0.6rem', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid #444', color: 'white' }}
                                    />

                                    <button
                                        onClick={addAttribute}
                                        disabled={!newAttrValue}
                                        className="btn btn-primary"
                                        style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                                    >
                                        <Plus size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Attribute List */}
                            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '1.5rem' }}>
                                <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Attribute Rules ({attributes.length})</h3>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {[...attributes].sort((a, b) => b.weight - a.weight).map(attr => (
                                        <div key={attr.id} style={{
                                            display: 'grid', gridTemplateColumns: '120px 1fr 100px 80px', gap: '1rem', alignItems: 'center',
                                            padding: '0.8rem', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid #333'
                                        }}>
                                            <div className={`${getTypeColor(attr.attribute_type)} text-sm uppercase font-bold`}>
                                                {attr.attribute_type.replace('_', ' ')}
                                            </div>

                                            <div style={{ fontWeight: 500, fontSize: '1.05rem' }}>{attr.attribute_value}</div>

                                            {/* Weight */}
                                            {editingId === attr.id ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <input
                                                        type="number" step="0.05" min="0" max="1"
                                                        value={editWeight}
                                                        onChange={e => setEditWeight(parseFloat(e.target.value))}
                                                        style={{ width: '60px', padding: '4px', borderRadius: '4px', background: 'black', border: '1px solid #444', color: 'white' }}
                                                        autoFocus
                                                    />
                                                    <button onClick={() => saveWeight(attr.id)} className="text-green-400"><Save size={16} /></button>
                                                    <button onClick={() => setEditingId(null)} className="text-gray-400"><X size={16} /></button>
                                                </div>
                                            ) : (
                                                <div style={{ opacity: 0.7 }}>{attr.weight.toFixed(2)}</div>
                                            )}

                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                                {editingId !== attr.id && (
                                                    <button onClick={() => startEditing(attr)} className="text-gray-500 hover:text-blue-400">
                                                        <Edit2 size={16} />
                                                    </button>
                                                )}
                                                <button onClick={() => deleteAttribute(attr.id)} className="text-gray-500 hover:text-red-400">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {attributes.length === 0 && <div className="text-muted p-4 text-center">No attributes defined.</div>}
                                </div>
                            </div>

                            {/* Preview Window */}
                            <div style={{ marginTop: '2rem', background: '#111', border: '1px solid #444', borderRadius: '12px', padding: '1.5rem' }}>
                                <h4 style={{ margin: '0 0 1rem 0', color: '#888', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '1px' }}>
                                    GENERATED AI PROMPT CONTEXT
                                </h4>
                                <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', color: '#0f0', fontSize: '0.9rem' }}>
                                    {previewContext}
                                </pre>
                            </div>

                        </>
                    ) : (
                        <div style={{ height: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: '#555' }}>
                            <Layers size={64} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                            <div>Select a Style Node to configure its matrix</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
