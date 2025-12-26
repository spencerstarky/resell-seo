
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getValidAccessToken } from '@/lib/ebay-api';

export async function POST(request: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const accessToken = await getValidAccessToken(user.id);

        // Call eBay Trading API (GetMyeBaySelling)
        const clientId = process.env.EBAY_CLIENT_ID;
        const isSandbox = clientId?.includes('-SBX-');
        const endpoint = isSandbox
            ? 'https://api.sandbox.ebay.com/ws/api.dll'
            : 'https://api.ebay.com/ws/api.dll';

        const xmlBody = `<?xml version="1.0" encoding="utf-8"?>
<GetMyeBaySellingRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <ErrorLanguage>en_US</ErrorLanguage>
  <WarningLevel>High</WarningLevel>
  <ActiveList>
    <Include>true</Include>
    <Pagination>
      <EntriesPerPage>100</EntriesPerPage>
      <PageNumber>1</PageNumber>
    </Pagination>
  </ActiveList>
</GetMyeBaySellingRequest>`;

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'X-EBAY-API-SITEID': '0', // US
                'X-EBAY-API-COMPATIBILITY-LEVEL': '1111',
                'X-EBAY-API-CALL-NAME': 'GetMyeBaySelling',
                'X-EBAY-API-IAF-TOKEN': accessToken,
                'Content-Type': 'text/xml',
            },
            body: xmlBody
        });

        const resultText = await response.text();

        if (!response.ok || resultText.includes('<Ack>Failure</Ack>')) {
            console.error('eBay Fetch Error:', resultText);
            throw new Error('Failed to fetch listings from eBay');
        }

        // Parse XML (Simple Regex parsing or use a library if available, but regex is lighter for 1 call)
        // We need Title, ItemID, PictureDetails.GalleryURL

        const items = [];
        const itemMatches = resultText.match(/<Item>[\s\S]*?<\/Item>/g) || [];

        for (const itemXml of itemMatches) {
            const titleMatch = itemXml.match(/<Title>(.*?)<\/Title>/);
            const idMatch = itemXml.match(/<ItemID>(.*?)<\/ItemID>/);
            const picMatch = itemXml.match(/<GalleryURL>(.*?)<\/GalleryURL>/);

            if (titleMatch && idMatch) {
                items.push({
                    title: titleMatch[1],
                    ebay_item_id: idMatch[1],
                    image_url: picMatch ? picMatch[1] : null,
                    status: 'active'
                });
            }
        }

        return NextResponse.json({ listings: items });

    } catch (error: any) {
        console.error('Fetch Handler Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
