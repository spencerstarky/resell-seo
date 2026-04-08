import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    try {
        const query = 'Polo Ralph Lauren Shirt Mens Large';
        const url = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}&LH_Sold=1&LH_Complete=1`;
        
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            }
        });
        
        const html = await res.text();
        const hasItems = html.includes('s-item__title') || html.includes('s-item');
        
        return NextResponse.json({
            status: res.status,
            size: html.length,
            hasItems,
            snippet: html.substring(0, 500)
        });
    } catch(e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
