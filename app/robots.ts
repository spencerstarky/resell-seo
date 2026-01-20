import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    const baseUrl = 'https://resellseo.app';

    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: [
                '/admin/',
                '/api/',
                '/dashboard/', // Don't index user dashboards
                '/private/',
            ],
        },
        sitemap: `${baseUrl}/sitemap.xml`,
    };
}
