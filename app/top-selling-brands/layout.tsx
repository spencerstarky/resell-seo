import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Top Selling Brands Guide | ResellSEO',
    description: 'Get our curated list of high sell-through rate brands. Stop guessing at the bins and start sourcing inventory that actually sells.',
    openGraph: {
        title: 'Top Selling Brands Guide | ResellSEO',
        description: 'Get our curated list of high sell-through rate brands. Stop guessing at the bins.',
        type: 'website',
    }
};

export default function BrandsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            {children}
        </>
    );
}
