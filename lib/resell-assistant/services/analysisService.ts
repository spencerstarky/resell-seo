export interface Listing {
    price: number;
    title?: string;
    image?: string;
    itemWebUrl?: string;
    condition?: string;
}

export interface MarketData {
    averagePrice: number | null;
    medianPrice: number | null;
    activeCount: number;
    soldCount: number | null;
    sellThroughRate: number | null;
    priceSource: 'sold' | 'active';
}

/**
 * Compute market analytics from listing data.
 */
export function computeMarketData(activeListings: Listing[], soldListings: Listing[] = []): MarketData {
    const activePrices = activeListings
        .map(l => l.price)
        .filter(p => p > 0)
        .sort((a, b) => a - b);

    const soldPrices = soldListings
        .map(l => l.price)
        .filter(p => p > 0)
        .sort((a, b) => a - b);

    // Use sold prices if available, otherwise use active listing prices
    const pricingData = soldPrices.length > 0 ? soldPrices : activePrices;

    const averagePrice = pricingData.length > 0
        ? pricingData.reduce((sum, p) => sum + p, 0) / pricingData.length
        : null;

    const medianPrice = pricingData.length > 0
        ? calculateMedian(pricingData)
        : null;

    // Sell-through rate: sold / (sold + active)
    const sellThroughRate = soldListings.length > 0
        ? soldListings.length / (soldListings.length + activeListings.length)
        : null;

    return {
        averagePrice,
        medianPrice,
        activeCount: activeListings.length,
        soldCount: soldListings.length || null,
        sellThroughRate,
        priceSource: soldPrices.length > 0 ? 'sold' : 'active',
    };
}

function calculateMedian(sortedArr: number[]): number {
    const mid = Math.floor(sortedArr.length / 2);
    if (sortedArr.length % 2 === 0) {
        return (sortedArr[mid - 1] + sortedArr[mid]) / 2;
    }
    return sortedArr[mid];
}
