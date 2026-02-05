'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function AdminNav() {
    const pathname = usePathname();

    const tabs = [
        { name: 'Dashboard', href: '/admin', exact: true },
        { name: 'Style Codes (Brands)', href: '/admin/brands' },
        { name: 'Style Signal Engine', href: '/admin/styles' },
        { name: 'Style Compatibility Matrix', href: '/admin/style-matrix' },
    ];

    return (
        <div style={{ padding: '1rem 0', marginBottom: '2rem', borderBottom: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', gap: '2rem', fontSize: '0.95rem' }}>
                {tabs.map(tab => {
                    const isActive = tab.exact
                        ? pathname === tab.href
                        : pathname.startsWith(tab.href);

                    return (
                        <Link
                            key={tab.href}
                            href={tab.href}
                            style={{
                                color: isActive ? '#fff' : 'var(--color-text-muted)',
                                textDecoration: 'none',
                                paddingBottom: '1rem',
                                borderBottom: isActive ? '2px solid var(--color-primary)' : '2px solid transparent',
                                fontWeight: isActive ? 600 : 400,
                                transition: 'all 0.2s'
                            }}
                        >
                            {tab.name}
                        </Link>
                    )
                })}
            </div>
        </div>
    );
}
