import { NextResponse } from 'next/server';
import { searchSoldListings } from '@/lib/resell-assistant/services/ebayService';

export const maxDuration = 60; // Allow enough time for the native fetch to run

export async function POST(request: Request) {
  try {
    const { keyword } = await request.json();

    if (!keyword) {
      return NextResponse.json({ error: 'Keyword is required to search for comps.' }, { status: 400 });
    }

    console.log(`[get-comps] Starting native scrape for keyword: ${keyword}`);

    // Call the newly optimized serverless native eBay Scraper
    const listings = await searchSoldListings(keyword, 20);

    // Map the returned dataset into the legacy format expected by this endpoint
    const comps = listings.items.map((item: any) => ({
      title: item.title,
      price: item.price,
      currency: 'USD',
      dateSold: null,
      imageUrl: item.image,
      url: item.itemWebUrl
    }));

    return NextResponse.json({ success: true, comps });

  } catch (error: any) {
    console.error('Error fetching comps natively:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch the eBay sold listings natively.', details: error.message },
      { status: 500 }
    );
  }
}
