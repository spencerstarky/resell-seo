
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
        const accessToken = await getValidAccessToken(user.id, supabase);

        // API Endpoint Setup
        const clientId = process.env.EBAY_CLIENT_ID;
        const isSandbox = clientId?.includes('-SBX-');
        const endpoint = isSandbox
            ? 'https://api.sandbox.ebay.com/ws/api.dll'
            : 'https://api.ebay.com/ws/api.dll';

        let allItems: any[] = [];
        let pageNumber = 1;
        let hasMorePages = true;
        const MAX_PAGES = 20; // Safety limit to prevent infinite loops (approx 4000 items)

        while (hasMorePages && pageNumber <= MAX_PAGES) {
            console.log(`[eBay Fetch] Fetching page ${pageNumber}...`);

            const xmlBody = `<?xml version="1.0" encoding="utf-8"?>
<GetMyeBaySellingRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <ErrorLanguage>en_US</ErrorLanguage>
  <WarningLevel>High</WarningLevel>
  <ActiveList>
    <Include>true</Include>
    <Pagination>
      <EntriesPerPage>200</EntriesPerPage>
      <PageNumber>${pageNumber}</PageNumber>
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
                throw new Error(`Failed to fetch listings from eBay (Page ${pageNumber})`);
            }

            // Parse Items
            const itemMatches = resultText.match(/<Item>[\s\S]*?<\/Item>/g) || [];

            for (const itemXml of itemMatches) {
                const titleMatch = itemXml.match(/<Title>(.*?)<\/Title>/);
                const idMatch = itemXml.match(/<ItemID>(.*?)<\/ItemID>/);
                const picMatch = itemXml.match(/<GalleryURL>(.*?)<\/GalleryURL>/);

                if (titleMatch && idMatch) {
                    allItems.push({
                        title: titleMatch[1],
                        ebay_item_id: idMatch[1],
                        image_url: picMatch ? picMatch[1] : null,
                        status: 'active'
                    });
                }
            }

            // Check Pagination Logic
            const totalPagesMatch = resultText.match(/<TotalNumberOfPages>(\d+)<\/TotalNumberOfPages>/);
            const totalPages = totalPagesMatch ? parseInt(totalPagesMatch[1], 10) : 1;

            console.log(`[eBay Fetch] Page ${pageNumber} done. Found ${itemMatches.length} items. Total Pages likely: ${totalPages}`);

            if (pageNumber >= totalPages) {
                hasMorePages = false;
            } else {
                pageNumber++;
            }
        }

        console.log(`[eBay Fetch] Completed. Total items fetched: ${allItems.length}`);
        return NextResponse.json({ listings: allItems });

    } catch (error: any) {
        console.error('Fetch Handler Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
