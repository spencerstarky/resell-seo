'use client';

import { useState, useEffect } from 'react';

const examples = [
    { before: "Nike shoes blue da1234", after: "Nike Air Zoom Pegasus 39 Men's Athletic Running Shoes Blue DA1234-400" },
    { before: "sony camera a7iii", after: "Sony Alpha a7 III Mirrorless Digital Camera Body Only - 24.2MP 4K Video ILCE-7M3" },
    { before: "charizard card holo", after: "1999 Pokémon Base Set Charizard Holo Rare 4/102 - Near Mint Condition" },
    { before: "kitchenaid mixer red", after: "KitchenAid Artisan Series 5-Quart Tilt-Head Stand Mixer - Empire Red KSM150PS" },
    { before: "vintage levi 501", after: "Vintage Levi's 501 Original Fit Men's Jeans - Made in USA Denim Dark Wash 34x32" }
];

export default function TitleTicker() {
    const [index, setIndex] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false);

    useEffect(() => {
        const interval = setInterval(() => {
            setIsTransitioning(true);

            // Middle of the transition - swap the content
            setTimeout(() => {
                setIndex((prev) => (prev + 1) % examples.length);
                setIsTransitioning(false);
            }, 1000);

        }, 8000);

        return () => clearInterval(interval);
    }, []);

    const current = examples[index];

    return (
        <div style={{ position: 'relative', minHeight: '140px' }}>
            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '2rem',
                textAlign: 'left',
                opacity: isTransitioning ? 0 : 1,
                transform: isTransitioning ? 'translateY(5px)' : 'translateY(0)',
                filter: isTransitioning ? 'blur(4px)' : 'blur(0)',
                transition: 'opacity 1s ease-in-out, transform 1s ease-in-out, filter 1s ease-in-out',
                willChange: 'opacity, transform, filter'
            }}>
                <div className="card glass" style={{ border: 'none', background: 'rgba(255, 68, 68, 0.05)', padding: '2rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#ff4444', marginBottom: '0.75rem', letterSpacing: '0.1em' }}>Before</div>
                    <div style={{ fontSize: '1rem', color: 'var(--color-text-dim)', textDecoration: 'line-through' }}>
                        {current.before}
                    </div>
                </div>
                <div className="card glass" style={{ border: 'none', background: 'rgba(100, 255, 100, 0.05)', padding: '2rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#4caf50', marginBottom: '0.75rem', letterSpacing: '0.1em' }}>After</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 600, lineHeight: 1.3 }}>
                        {current.after}
                    </div>
                </div>
            </div>
        </div>
    );
}
