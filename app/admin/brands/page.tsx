'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { generateRegexFromExample } from '@/lib/regex-generator';
import { Trash2, Plus, Save, ChevronDown, ChevronRight, CheckCircle, AlertTriangle } from 'lucide-react';
import { AdminNav } from '@/components/admin/AdminNav';

function BrandMetadataEditor({ brand }: { brand: any }) {
    const [slug, setSlug] = useState(brand.slug || '');
    const [logoUrl, setLogoUrl] = useState(brand.logo_url || '');
    const [description, setDescription] = useState(brand.description || '');
    const [saving, setSaving] = useState(false);
    const [boloList, setBoloList] = useState<any[]>(brand.marketing_metadata?.bolos || []);

    const handleSave = async () => {
        setSaving(true);
        try {
            // Merge existing metadata with new BOLOs
            const newMetadata = {
                ...brand.marketing_metadata,
                bolos: boloList
            };

            const { error } = await supabase
                .from('brands')
                .update({
                    slug,
                    logo_url: logoUrl,
                    description,
                    marketing_metadata: newMetadata
                })
                .eq('id', brand.id);

            if (error) throw error;
            alert('Saved!');
        } catch (e: any) {
            alert('Error updating brand: ' + e.message);
        } finally {
            setSaving(false);
        }
    };

    const addBolo = () => {
        setBoloList([...boloList, { emoji: '👕', title: '', description: '' }]);
    };

    const updateBolo = (index: number, field: string, value: string) => {
        const newList = [...boloList];
        newList[index] = { ...newList[index], [field]: value };
        setBoloList(newList);
    };

    const removeBolo = (index: number) => {
        setBoloList(boloList.filter((_, i) => i !== index));
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.4rem', color: '#aaa' }}>Slug (URL)</label>
                    <input
                        className="input"
                        value={slug}
                        onChange={e => setSlug(e.target.value)}
                        style={{ width: '100%', padding: '0.5rem', background: '#222', border: '1px solid #444', color: '#fff', borderRadius: '4px' }}
                    />
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.4rem', color: '#aaa' }}>Logo URL</label>
                    <input
                        className="input"
                        value={logoUrl}
                        onChange={e => setLogoUrl(e.target.value)}
                        placeholder="https://..."
                        style={{ width: '100%', padding: '0.5rem', background: '#222', border: '1px solid #444', color: '#fff', borderRadius: '4px' }}
                    />
                </div>
            </div>
            <div>
                <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.4rem', color: '#aaa' }}>Description (HTML ok)</label>
                <textarea
                    className="input"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={3}
                    style={{ width: '100%', padding: '0.5rem', background: '#222', border: '1px solid #444', color: '#fff', borderRadius: '4px' }}
                />
            </div>

            {/* BOLO Section */}
            <div style={{ borderTop: '1px solid #333', paddingTop: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.8rem', color: '#aaa', fontWeight: 'bold' }}>WHAT TO LOOK FOR (BOLO)</label>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                    {boloList.map((item, i) => (
                        <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                            <input
                                value={item.emoji}
                                onChange={(e) => updateBolo(i, 'emoji', e.target.value)}
                                placeholder="Emoji"
                                style={{ width: '50px', padding: '0.5rem', background: '#222', border: '1px solid #444', color: '#fff', borderRadius: '4px', textAlign: 'center' }}
                            />
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                <input
                                    value={item.title}
                                    onChange={(e) => updateBolo(i, 'title', e.target.value)}
                                    placeholder="Title (e.g. T-Shirts)"
                                    style={{ width: '100%', padding: '0.5rem', background: '#222', border: '1px solid #444', color: '#fff', borderRadius: '4px' }}
                                />
                                <input
                                    value={item.description}
                                    onChange={(e) => updateBolo(i, 'description', e.target.value)}
                                    placeholder="Description (e.g. Look for vintage tags...)"
                                    style={{ width: '100%', padding: '0.5rem', background: '#222', border: '1px solid #444', color: '#bbb', borderRadius: '4px', fontSize: '0.9rem' }}
                                />
                            </div>
                            <button onClick={() => removeBolo(i)} style={{ padding: '0.5rem', color: '#ff4444', border: '1px solid #ff4444', background: 'transparent', borderRadius: '4px', cursor: 'pointer' }}>
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                </div>

                <button
                    onClick={addBolo}
                    style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.4rem 0.8rem', background: '#333', color: '#ddd', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                    <Plus size={14} /> Add Item
                </button>
            </div>

            <button
                onClick={handleSave}
                disabled={saving}
                style={{ alignSelf: 'flex-start', padding: '0.5rem 1.5rem', background: '#4caf50', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop: '1rem' }}
            >
                {saving ? 'Saving...' : 'Save Details'}
            </button>
        </div>
    );
}

export default function BrandAdminPage() {
    // const supabase used directly from import
    const [brands, setBrands] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);

    // New Brand State
    const [newBrandName, setNewBrandName] = useState('');

    // Expanded State (for patterns)
    const [expandedBrandId, setExpandedBrandId] = useState<string | null>(null);
    const [patterns, setPatterns] = useState<any[]>([]);

    // New Pattern State
    const [newPatternExample, setNewPatternExample] = useState('');
    const [previewRegex, setPreviewRegex] = useState('');

    useEffect(() => {
        checkAdmin();
    }, []);

    const checkAdmin = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email === 'resellseo@gmail.com') {
            setIsAdmin(true);
            fetchBrands();
        } else {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (newPatternExample) {
            setPreviewRegex(generateRegexFromExample(newPatternExample));
        } else {
            setPreviewRegex('');
        }
    }, [newPatternExample]);

    const fetchBrands = async () => {
        setLoading(true);
        const { data } = await supabase.from('brands').select('*').order('name', { ascending: true });
        setBrands(data || []);
        setLoading(false);
    };

    const fetchPatterns = async (brandId: string) => {
        const { data } = await supabase.from('style_code_patterns').select('*').eq('brand_id', brandId);
        setPatterns(data || []);
    };

    const handleAddBrand = async () => {
        if (!newBrandName.trim()) return;

        try {
            const { error } = await supabase.from('brands').insert({
                name: newBrandName,
                normalized_name: newBrandName.toLowerCase().trim(),
                confidence_tier: 1 // Default to verified since Admin is adding it
            });

            if (error) throw error;

            setNewBrandName('');
            fetchBrands();
        } catch (e: any) {
            alert('Error adding brand: ' + e.message);
        }
    };

    const handleAddPattern = async () => {
        if (!expandedBrandId || !previewRegex) return;

        try {
            const { error } = await supabase.from('style_code_patterns').insert({
                brand_id: expandedBrandId,
                regex_pattern: previewRegex,
                example_codes: [newPatternExample],
                min_length: newPatternExample.length, // conservative default
                max_length: newPatternExample.length, // conservative default
                confidence_weight: 1.0,
                is_active: true
            });

            if (error) throw error;

            setNewPatternExample('');
            fetchPatterns(expandedBrandId);
        } catch (e: any) {
            alert('Error adding pattern: ' + e.message);
        }
    };

    const toggleExpand = (id: string) => {
        if (expandedBrandId === id) {
            setExpandedBrandId(null);
        } else {
            setExpandedBrandId(id);
            fetchPatterns(id);
        }
    };

    const deleteBrand = async (id: string) => {
        if (!confirm('Delete this brand and ALL its patterns?')) return;
        await supabase.from('brands').delete().eq('id', id);
        fetchBrands();
    };

    const deletePattern = async (id: string) => {
        if (!confirm('Delete this pattern?')) return;
        await supabase.from('style_code_patterns').delete().eq('id', id);
        if (expandedBrandId) fetchPatterns(expandedBrandId);
    };

    if (loading) return <div style={{ padding: '2rem', color: '#fff' }}>Loading...</div>;

    if (!isAdmin) {
        return (
            <div style={{ padding: '4rem', textAlign: 'center', color: '#666' }}>
                <AlertTriangle size={48} style={{ marginBottom: '1rem', color: '#f44336' }} />
                <h1>Access Denied</h1>
                <p>You do not have permission to view this page.</p>
            </div>
        );
    }

    return (
        <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', color: '#fff' }}>
            <AdminNav />

            <div style={{ marginBottom: '2rem' }}>
                {/* Back link removed in favor of nav */}
            </div>
            <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>Brand & Style Code Admin</h1>
            <p style={{ color: '#aaa', marginBottom: '2rem' }}>Manage recognized brands and their style code formats.</p>

            {/* Add Brand Section */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '8px' }}>
                <input
                    type="text"
                    placeholder="New Brand Name (e.g. Ralph Lauren)"
                    value={newBrandName}
                    onChange={e => setNewBrandName(e.target.value)}
                    style={{ flex: 1, padding: '0.8rem', borderRadius: '6px', border: '1px solid #333', background: '#000', color: '#fff' }}
                />
                <button
                    onClick={handleAddBrand}
                    className="btn btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#4caf50', padding: '0 1.5rem', borderRadius: '6px', fontWeight: 'bold' }}
                >
                    <Plus size={18} /> Add Brand
                </button>
            </div>

            {/* Brands List */}
            {loading ? (
                <div>Loading...</div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {brands.map(brand => (
                        <div key={brand.id} style={{ border: '1px solid #333', borderRadius: '8px', overflow: 'hidden' }}>
                            {/* Brand Header */}
                            <div
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem',
                                    background: expandedBrandId === brand.id ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255,255,255,0.02)',
                                    cursor: 'pointer'
                                }}
                                onClick={() => toggleExpand(brand.id)}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    {expandedBrandId === brand.id ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                                    <span style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{brand.name}</span>
                                    {brand.confidence_tier === 1 && <CheckCircle size={16} color="#4caf50" />}
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); deleteBrand(brand.id); }}
                                    style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer' }}
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>

                            {/* Patterns & Details Section (Expanded) */}
                            {expandedBrandId === brand.id && (
                                <div style={{ padding: '1.5rem', borderTop: '1px solid #333', background: '#111' }}>

                                    {/* 1. Brand Metadata Editor */}
                                    <div style={{ marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '1px dashed #333' }}>
                                        <h4 style={{ fontSize: '0.9rem', color: '#888', textTransform: 'uppercase', marginBottom: '1rem' }}>Brand Details (Marketing)</h4>
                                        <BrandMetadataEditor brand={brand} />
                                    </div>

                                    {/* 2. Patterns List */}
                                    <h4 style={{ fontSize: '0.9rem', color: '#888', textTransform: 'uppercase', marginBottom: '1rem' }}>Known Style Code Patterns</h4>

                                    {patterns.length === 0 ? (
                                        <div style={{ marginBottom: '1rem', color: '#666', fontStyle: 'italic' }}>No patterns yet. Required for detection.</div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
                                            {patterns.map(p => (
                                                <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem', background: '#222', borderRadius: '4px', fontSize: '0.9rem' }}>
                                                    <div>
                                                        <span style={{ color: '#4caf50', fontFamily: 'monospace', marginRight: '1rem' }}>{p.regex_pattern}</span>
                                                        <span style={{ color: '#888' }}>Ex: {p.example_codes?.[0]}</span>
                                                    </div>
                                                    <button onClick={() => deletePattern(p.id)} style={{ color: '#d32f2f' }}><Trash2 size={14} /></button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Add Pattern Form */}
                                    <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                                        <div style={{ marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 'bold' }}>Add New Pattern</div>
                                        <div style={{ display: 'flex', gap: '1rem' }}>
                                            <div style={{ flex: 1 }}>
                                                <input
                                                    type="text"
                                                    placeholder="Example Code (e.g. 84212 or BV3274)"
                                                    value={newPatternExample}
                                                    onChange={e => setNewPatternExample(e.target.value)}
                                                    style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid #444', background: '#000', color: '#fff', fontSize: '0.9rem' }}
                                                />
                                                {previewRegex && (
                                                    <div style={{ fontSize: '0.8rem', color: '#4caf50', marginTop: '0.4rem', fontFamily: 'monospace' }}>
                                                        Generated Regex: {previewRegex}
                                                    </div>
                                                )}
                                            </div>
                                            <button
                                                onClick={handleAddPattern}
                                                disabled={!newPatternExample}
                                                className="btn"
                                                style={{ background: '#2196f3', color: '#fff', border: 'none', borderRadius: '4px', padding: '0 1rem', cursor: newPatternExample ? 'pointer' : 'not-allowed', opacity: newPatternExample ? 1 : 0.5 }}
                                            >
                                                Save Pattern
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
