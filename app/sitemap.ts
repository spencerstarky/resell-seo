import { MetadataRoute } from 'next';
import { createClient } from '@/lib/supabase-server';

export const revalidate = 3600; // Revalidate every hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = 'https://www.resellseo.com'; // TODO: Update this if your domain is different
    const supabase = await createClient();

    // 1. Fetch all brands
    const { data: brands } = await supabase
        .from('brands')
        .select('slug, created_at')
        .not('slug', 'is', null);

    // 2. Map brands to sitemap format
    const brandUrls = (brands || []).map((brand) => ({
        url: `${baseUrl}/top-selling-brands/${brand.slug}`,
        lastModified: new Date(brand.created_at || new Date()),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
    }));

    // 3. Fetch all blog posts (if you have them)
    const { data: posts } = await supabase
        .from('posts')
        .select('slug, published_at')
        .eq('status', 'published');

    const postUrls = (posts || []).map((post) => ({
        url: `${baseUrl}/blog/${post.slug}`,
        lastModified: new Date(post.published_at || new Date()),
        changeFrequency: 'monthly' as const,
        priority: 0.7,
    }));

    // 4. Define static routes
    const staticRoutes = [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: 'monthly' as const,
            priority: 1.0,
        },
        {
            url: `${baseUrl}/about`,
            lastModified: new Date(),
            changeFrequency: 'monthly' as const,
            priority: 0.5,
        },
        {
            url: `${baseUrl}/top-selling-brands`,
            lastModified: new Date(),
            changeFrequency: 'daily' as const,
            priority: 0.9,
        },
        {
            url: `${baseUrl}/login`,
            lastModified: new Date(),
            changeFrequency: 'yearly' as const,
            priority: 0.3,
        },
        // Add more static pages as needed
    ];

    return [...staticRoutes, ...brandUrls, ...postUrls];
}
