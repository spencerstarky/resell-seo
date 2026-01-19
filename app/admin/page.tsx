'use client';

import React from 'react';
import Link from 'next/link';
import { Shirt, Tag, ChevronRight, BarChart3, Database } from 'lucide-react';

export default function AdminDashboard() {
    return (
        <div style={{ padding: '3rem', maxWidth: '1200px', margin: '0 auto', color: '#fff' }}>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.5rem', background: 'linear-gradient(to right, #fff, #aaa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Admin Control Center
            </h1>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '3rem', fontSize: '1.1rem' }}>
                Manage system intelligence, style databases, and platform configurations.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>

                {/* 1. Style Code Intelligence */}
                <Link href="/admin/brands" style={{ textDecoration: 'none' }}>
                    <div style={{
                        background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '2rem',
                        transition: 'all 0.2s ease', cursor: 'pointer', height: '100%', display: 'flex', flexDirection: 'column', gap: '1rem'
                    }}
                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = 'var(--color-primary)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--color-border)'; }}
                    >
                        <div style={{ width: 50, height: 50, borderRadius: '12px', background: 'rgba(156, 85, 213, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' }}>
                            <Tag size={24} />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#fff', marginBottom: '0.5rem' }}>Style Code Manager</h2>
                            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                                Manage validated style codes (e.g., Nike "CU4495-010"). Review AI detections and manage brands.
                            </p>
                        </div>
                        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', color: 'var(--color-primary)', fontSize: '0.9rem', fontWeight: 600 }}>
                            Open Manager <ChevronRight size={16} />
                        </div>
                    </div>
                </Link>

                {/* 2. Style Signal Intelligence (NEW) */}
                <Link href="/admin/styles" style={{ textDecoration: 'none' }}>
                    <div style={{
                        background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '2rem',
                        transition: 'all 0.2s ease', cursor: 'pointer', height: '100%', display: 'flex', flexDirection: 'column', gap: '1rem'
                    }}
                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = '#4caf50'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--color-border)'; }}
                    >
                        <div style={{ width: 50, height: 50, borderRadius: '12px', background: 'rgba(76, 175, 80, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4caf50' }}>
                            <Shirt size={24} />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#fff', marginBottom: '0.5rem' }}>Style Signal Engine</h2>
                            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                                Define visual trends and keywords (e.g., Gorpcore, Preppy). Tune weighting and confidence thresholds.
                            </p>
                        </div>
                        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', color: '#4caf50', fontSize: '0.9rem', fontWeight: 600 }}>
                            Configure Trends <ChevronRight size={16} />
                        </div>
                    </div>
                </Link>

                {/* Placeholder for Analytics */}
                <div style={{
                    background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '2rem',
                    height: '100%', display: 'flex', flexDirection: 'column', gap: '1rem', opacity: 0.5, cursor: 'not-allowed'
                }}>
                    <div style={{ width: 50, height: 50, borderRadius: '12px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
                        <BarChart3 size={24} />
                    </div>
                    <div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#fff', marginBottom: '0.5rem' }}>System Analytics</h2>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                            Usage stats, ROI tracking, and performance metrics.
                        </p>
                    </div>
                    <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', color: 'var(--color-text-muted)', fontSize: '0.9rem', fontWeight: 600 }}>
                        Coming Soon
                    </div>
                </div>

            </div>
        </div>
    );
}
