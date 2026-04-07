import { NextResponse } from 'next/server';
import { ApifyClient } from 'apify-client';

export const maxDuration = 60; // Allow enough time for the Apify Actor to run

export async function POST(request: Request) {
  try {
    const { keyword } = await request.json();

    if (!keyword) {
      return NextResponse.json({ error: 'Keyword is required to search for comps.' }, { status: 400 });
    }

    if (!process.env.APIFY_API_TOKEN) {
      console.error('Missing APIFY_API_TOKEN in `.env.local`.');
      return NextResponse.json({ error: 'Apify API token is not configured on the server.' }, { status: 500 });
    }

    // Initialize the ApifyClient
    const client = new ApifyClient({
      token: process.env.APIFY_API_TOKEN,
    });

    console.log(`Starting Apify scrape for keyword: ${keyword}`);

    // Call the Apify eBay scraper actor (using dvadeset/ebay-scraper or epctex/ebay-scraper)
    // We will use 'dvadeset/ebay-scraper' as it has a very simple interface.
    const run = await client.actor('dvadeset/ebay-scraper').call({
      search: keyword,
      soldItems: true,
      maxItems: 20
    });

    console.log(`Apify run completed. Run ID: ${run.id}`);

    // Fetch the scraped items from the dataset
    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    // Map the returned dataset into a clean format
    const comps = items.map((item: any) => ({
      title: item.title,
      price: item.price,
      currency: item.currency || 'USD',
      dateSold: item.soldDate || item.date || null,
      imageUrl: item.image || item.imageUrl,
      url: item.url
    }));

    return NextResponse.json({ success: true, comps });

  } catch (error: any) {
    console.error('Error fetching comps via Apify:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch the eBay sold listings.', details: error.message },
      { status: 500 }
    );
  }
}
