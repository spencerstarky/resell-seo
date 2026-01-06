
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
        const syncStartTime = new Date().toISOString();

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

            // Parse Items for this page
            const itemMatches = resultText.match(/<Item>[\s\S]*?<\/Item>/g) || [];
            const pageItems: any[] = [];

            for (const itemXml of itemMatches) {
                const titleMatch = itemXml.match(/<Title>(.*?)<\/Title>/);
                const idMatch = itemXml.match(/<ItemID>(.*?)<\/ItemID>/);
                const picMatch = itemXml.match(/<GalleryURL>(.*?)<\/GalleryURL>/);

                if (titleMatch && idMatch) {
                    pageItems.push({
                        title: titleMatch[1],
                        ebay_item_id: idMatch[1],
                        image_url: picMatch ? picMatch[1] : null,
                        status: 'active'
                    });
                    allItems.push(true); // Just to track count
                }
            }

            // --- SYNC THIS PAGE TO DB IMMEDIATELY ---
            if (pageItems.length > 0) {
                const batchIds = pageItems.map(item => item.ebay_item_id);

                // 1. Fetch existing
                const { data: existingItems } = await supabase
                    .from('ebay_inventory')
                    .select('ebay_item_id, status, original_title, optimized_title')
                    .eq('user_id', user.id)
                    .in('ebay_item_id', batchIds);

                const dbMap = new Map();
                existingItems?.forEach(dbItem => {
                    dbMap.set(dbItem.ebay_item_id, dbItem);
                });

                // 2. Prepare Updates
                const upsertPayload = pageItems.map(item => {
                    const existing = dbMap.get(item.ebay_item_id);
                    return {
                        user_id: user.id,
                        ebay_item_id: item.ebay_item_id,
                        current_title: item.title,
                        image_url: item.image_url,
                        last_synced_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                        original_title: existing?.original_title || item.title,
                        status: ['NEW', 'OPTIMIZED', 'LIVE'].includes(existing?.status) ? existing.status : 'NEW',
                        optimized_title: existing?.optimized_title || null
                    };
                });

                // 3. Upsert Page
                const { error: upsertError } = await supabase
                    .from('ebay_inventory')
                    .upsert(upsertPayload, { onConflict: 'user_id, ebay_item_id' });

                if (upsertError) {
                    console.error('[Sync] Page Upsert failed:', upsertError);
                    // Decide whether to throw or continue. Continue allows partial sync.
                } else {
                    console.log(`[Sync] Page ${pageNumber} synced (${pageItems.length} items).`);
                }
            }
            // ------------------------------------------

            // Check Pagination Logic
            const totalPagesMatch = resultText.match(/<TotalNumberOfPages>(\d+)<\/TotalNumberOfPages>/);
            const totalPages = totalPagesMatch ? parseInt(totalPagesMatch[1], 10) : 1;

            console.log(`[eBay Fetch] Page ${pageNumber} done. Found ${pageItems.length} items. Total Pages likely: ${totalPages}`);

            if (pageNumber >= totalPages) {
                hasMorePages = false;
            } else {
                pageNumber++;
            }
        }

        // --- CLEANUP: REMOVE ENDED ITEMS ---
        console.log('[Sync] Starting cleanup of ended items (DELETE strategy)...');
        // Items not updated in this sync cycle = Ended/Sold on eBay
        const { error: cleanupError } = await supabase
            .from('ebay_inventory')
            .delete()
            .eq('user_id', user.id)
            .lt('last_synced_at', syncStartTime);

        if (cleanupError) {
            console.error('[Sync] Cleanup failed:', cleanupError);
        } else {
            console.log('[Sync] Cleanup complete.');
        }

        // Return success + maybe count? 
        // Frontend will re-fetch from DB to display smart tabs.
        return NextResponse.json({ success: true, count: allItems.length });

    } catch (error: any) {
        console.error('Fetch Handler Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
