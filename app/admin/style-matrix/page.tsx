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
    priority_role: string; // 'lead_descriptor' | 'ordering_bias' | 'protect_from_trimming' | 'include_if_space' | 'avoid_signal'
};

const ATTRIBUTE_TYPES = ['aesthetic', 'use_case', 'material', 'detail', 'garment_type'];
const PRIORITY_ROLES = [
    { value: 'include_if_space', label: 'Filler (Include if Space)' },
    { value: 'lead_descriptor', label: 'Lead (High Priority)' },
    { value: 'protect_from_trimming', label: 'Protected (Do Not Trim)' },
    { value: 'ordering_bias', label: 'Ordering Bias' },
    { value: 'avoid_signal', label: 'AVOID (Negative)' },
];

export default function StyleMatrixManager() {
    const [styles, setStyles] = useState<Style[]>([]);
    const [selectedStyle, setSelectedStyle] = useState<Style | null>(null);
    const [attributes, setAttributes] = useState<MatrixAttribute[]>([]);
    const [loading, setLoading] = useState(true);

    // Form States
    const [newAttrValue, setNewAttrValue] = useState('');
    const [newAttrType, setNewAttrType] = useState<string>('aesthetic');
    const [newAttrWeight, setNewAttrWeight] = useState(0.8);
    const [newAttrRole, setNewAttrRole] = useState<string>('include_if_space');

    // Editing State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editWeight, setEditWeight] = useState(0.0);
    const [editRole, setEditRole] = useState('');

    // Preview
    const [previewContext, setPreviewContext] = useState('');

    useEffect(() => {
        fetchStyles();
    }, []);

    useEffect(() => {
        if (selectedStyle) {
            fetchAttributes(selectedStyle.id);
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
            weight: newAttrWeight,
            priority_role: newAttrRole
        }).select().single();

        if (error) {
            alert('Error adding attribute: ' + error.message);
        } else {
            setAttributes([...attributes, data as MatrixAttribute].sort((a, b) => b.weight - a.weight));
            setNewAttrValue('');
            // Reset to defaults
            setNewAttrWeight(0.8);
            setNewAttrRole('include_if_space');
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

    const saveChanges = async (id: string) => {
        const { error } = await supabase.from('style_compatibility_attributes').update({
            weight: editWeight,
            priority_role: editRole
        }).eq('id', id);

        if (!error) {
            setAttributes(attributes.map(a => a.id === id ? { ...a, weight: editWeight, priority_role: editRole } : a).sort((a, b) => b.weight - a.weight));
            setEditingId(null);
        }
    };

    const startEditing = (attr: MatrixAttribute) => {
        setEditingId(attr.id);
        setEditWeight(attr.weight);
        setEditRole(attr.priority_role || 'include_if_space');
    };

    // Live update preview based on attributes state - PRIORITY DRIVEN
    useEffect(() => {
        if (!selectedStyle) return;

        const leadDescriptors = attributes.filter(a => a.priority_role === 'lead_descriptor').map(a => a.attribute_value).join(', ');
        const protectedAttrs = attributes.filter(a => a.priority_role === 'protect_from_trimming').map(a => a.attribute_value).join(', ');
        const includeIfSpace = attributes.filter(a => !['lead_descriptor', 'protect_from_trimming', 'avoid_signal'].includes(a.priority_role)).map(a => a.attribute_value).join(', ');
        const avoidList = attributes.filter(a => a.priority_role === 'avoid_signal').map(a => a.attribute_value).join(', ');

        const text = `
STYLE CONSTRUCTION DIRECTIVE (DETECTED ARCHETYPE: ${selectedStyle.display_name.toUpperCase()})
Detected Archetype: ${selectedStyle.display_name}

Behavior Rules:
- Protect functional attributes from trimming
- Prefer use-case descriptors before aesthetics
- Allocate character space toward durability and function
- Trim aesthetic/trend descriptors first

Lead Descriptors (Prioritize Early):
- ${leadDescriptors || '(None defined)'}

Protected Attributes (Do NOT Trim):
- ${protectedAttrs || '(None defined)'}

Include If Space (Fillers):
- ${includeIfSpace || '(None defined)'}

Avoid (Incompatible):
- ${avoidList || '(None defined)'}
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

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'lead_descriptor': return { text: 'LEAD', color: 'bg-yellow-600 text-white' };
            case 'protect_from_trimming': return { text: 'PROTECT', color: 'bg-green-600 text-white' };
            case 'avoid_signal': return { text: 'AVOID', color: 'bg-red-900 text-red-100' };
            case 'ordering_bias': return { text: 'ORDER', color: 'bg-blue-900 text-blue-100' };
            default: return { text: 'FILLER', color: 'bg-gray-700 text-gray-300' };
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
                        Define behavioral priorities: control what the AI protects, trims, or prioritizes for each style.
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
                                <div style={{ display: 'grid', gridTemplateColumns: 'min-content 1fr min-content min-content min-content', gap: '1rem', alignItems: 'center' }}>

                                    <select
                                        value={newAttrType}
                                        onChange={(e) => setNewAttrType(e.target.value)}
                                        style={{ padding: '0.6rem', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid #444', color: 'white', maxWidth: '120px' }}
                                    >
                                        {ATTRIBUTE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>

                                    <input
                                        placeholder="Value (e.g. 'Safari')"
                                        value={newAttrValue}
                                        onChange={e => setNewAttrValue(e.target.value)}
                                        style={{ padding: '0.6rem', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid #444', color: 'white' }}
                                    />

                                    <select
                                        value={newAttrRole}
                                        onChange={(e) => setNewAttrRole(e.target.value)}
                                        style={{ padding: '0.6rem', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid #444', color: 'white', maxWidth: '160px' }}
                                    >
                                        {PRIORITY_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                                    </select>

                                    <input
                                        type="number" step="0.05" min="0" max="1"
                                        value={newAttrWeight}
                                        onChange={e => setNewAttrWeight(parseFloat(e.target.value))}
                                        title="Weight (0-1)"
                                        style={{ width: '80px', padding: '0.6rem', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid #444', color: 'white' }}
                                    />

                                    <button
                                        onClick={addAttribute}
                                        disabled={!newAttrValue}
                                        className="btn btn-primary"
                                        style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0.6rem' }}
                                    >
                                        <Plus size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Attribute List */}
                            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '1.5rem' }}>
                                <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Rules & Priorities ({attributes.length})</h3>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {[...attributes].sort((a, b) => b.weight - a.weight).map(attr => (
                                        <div key={attr.id} style={{
                                            display: 'grid', gridTemplateColumns: '120px 1fr 140px 100px 80px', gap: '1rem', alignItems: 'center',
                                            padding: '0.8rem', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid #333'
                                        }}>
                                            <div className={`${getTypeColor(attr.attribute_type)} text-xs uppercase font-bold`}>
                                                {attr.attribute_type.replace('_', ' ')}
                                            </div>

                                            <div style={{ fontWeight: 500, fontSize: '1.05rem' }}>{attr.attribute_value}</div>

                                            {/* Priority Role Badge/Edit */}
                                            {editingId === attr.id ? (
                                                <select
                                                    value={editRole}
                                                    onChange={(e) => setEditRole(e.target.value)}
                                                    style={{ padding: '0.2rem', borderRadius: '4px', background: 'black', border: '1px solid #444', color: 'white', fontSize: '0.8rem' }}
                                                    autoFocus
                                                >
                                                    {PRIORITY_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                                                </select>
                                            ) : (
                                                <span className={`text-xs px-2 py-1 rounded font-bold text-center ${getRoleBadge(attr.priority_role || 'include_if_space').color}`}>
                                                    {getRoleBadge(attr.priority_role || 'include_if_space').text}
                                                </span>
                                            )}

                                            {/* Weight */}
                                            {editingId === attr.id ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <input
                                                        type="number" step="0.05" min="0" max="1"
                                                        value={editWeight}
                                                        onChange={e => setEditWeight(parseFloat(e.target.value))}
                                                        style={{ width: '50px', padding: '4px', borderRadius: '4px', background: 'black', border: '1px solid #444', color: 'white' }}
                                                    />
                                                    <button onClick={() => saveChanges(attr.id)} className="text-green-400"><Save size={16} /></button>
                                                    <button onClick={() => setEditingId(null)} className="text-gray-400"><X size={16} /></button>
                                                </div>
                                            ) : (
                                                <div style={{ opacity: 0.7, textAlign: 'right' }}>{attr.weight.toFixed(2)}</div>
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
                                    GENERATED BEHAVIORAL DIRECTIVE
                                </h4>
                                <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', color: '#0f0', fontSize: '0.9rem' }}>
                                    {previewContext}
                                </pre>
                            </div>

                        </>
                    ) : (
                        <div style={{ height: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: '#555' }}>
                            <Layers size={64} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                            <div>Select a Style Node to configure priority rules</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
