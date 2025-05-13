import {
  UiPoolDataProvider,
  ReserveDataHumanized,
} from "@aave/contract-helpers";
import { formatReserves, FormatReserveUSDResponse } from "@aave/math-utils";
import {
  getProvider,
  getMarketAddresses,
  MarketAddresses,
  getCachedData,
  setCachedData,
} from "./helpers";

// Define a more specific type for the parameters, if known, or use a general one
interface GetReserveDataParams {
  chain_id: number;
  assets?: string[]; // Optional array of asset symbols to filter by
  version?: string; // Added version for cache key, though not directly used in logic yet, aligns with plan.md cache example
  // Add other potential params from your plan.md if they exist for this tool
}

// Add priceUSD to the reserve type we expect after enrichment
interface EnrichedFormatReserveUSDResponse extends FormatReserveUSDResponse {
  priceUSD?: number; // Price from external source
  // totalLiquidityUSD might be recalculated based on external priceUSD and totalLiquidity (asset units)
}

// Define a more specific type for the return value, if known
// For now, using 'any' as a placeholder based on the complexity of reserve data
interface GetReserveDataResult {
  chain_id: number;
  timestamp: string;
  reserves: EnrichedFormatReserveUSDResponse[];
  version?: string; // Reflect version in output if provided
  fromCache?: boolean; // Optional: to indicate if data was from cache
}

/**
 * Placeholder for fetching external asset prices.
 * In a real implementation, this would call an external API (e.g., CoinGecko).
 */
async function getAssetPrices(
  assetSymbols: string[]
): Promise<{ [symbol: string]: number }> {
  console.log(`Simulating fetching prices for: ${assetSymbols.join(", ")}`);
  // Placeholder: Return dummy prices for a few common assets for demonstration
  const dummyPrices: { [symbol: string]: number } = {
    WBTC: 20000,
    ETH: 1500,
    USDC: 1,
    DAI: 1,
    // Add more or make this dynamic if needed for testing
  };

  const prices: { [symbol: string]: number } = {};
  for (const symbol of assetSymbols) {
    if (dummyPrices[symbol.toUpperCase()]) {
      prices[symbol.toUpperCase()] = dummyPrices[symbol.toUpperCase()];
    }
  }
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 100));
  return prices;
}

/**
 * Get Aave reserve data, with caching.
 */
export async function getReserveData(
  params: GetReserveDataParams
): Promise<GetReserveDataResult> {
  const { chain_id, assets, version = "v3" } = params; // Default version to v3 for cache key consistency
  const cacheKey = `reserveData_${chain_id}_${version}_extPrice`; // Modified cache key for price-enriched data

  // Try to fetch from cache first
  const cachedResult = getCachedData(cacheKey);

  if (cachedResult) {
    let reservesToReturn = cachedResult.reserves;
    // Filter cached data if assets are specified, as per plan.md
    if (assets && Array.isArray(assets) && assets.length > 0) {
      const assetSet = new Set(assets.map((a) => a.toUpperCase()));
      reservesToReturn = cachedResult.reserves.filter(
        (reserve: EnrichedFormatReserveUSDResponse) =>
          assetSet.has(reserve.symbol.toUpperCase())
      );
    }
    return {
      ...cachedResult, // This includes original chain_id, timestamp, full reserves, version
      reserves: reservesToReturn, // Override with potentially filtered reserves
      fromCache: true,
    };
  }

  // If cache miss, proceed to fetch fresh data
  try {
    const addresses: MarketAddresses = getMarketAddresses(chain_id);
    const provider = getProvider(chain_id);

    const poolDataProviderContract = new UiPoolDataProvider({
      uiPoolDataProviderAddress: addresses.UI_POOL_DATA_PROVIDER,
      provider,
      chainId: chain_id,
    });

    const reservesDataResponse =
      await poolDataProviderContract.getReservesHumanized({
        lendingPoolAddressProvider: addresses.POOL_ADDRESSES_PROVIDER,
      });

    const currentTimestamp = Math.floor(Date.now() / 1000);
    let formattedReservesFull: EnrichedFormatReserveUSDResponse[] =
      formatReserves({
        reserves: reservesDataResponse.reservesData,
        currentTimestamp,
        marketReferenceCurrencyDecimals:
          reservesDataResponse.baseCurrencyData.marketReferenceCurrencyDecimals,
        marketReferencePriceInUsd:
          reservesDataResponse.baseCurrencyData
            .marketReferenceCurrencyPriceInUsd,
      });

    // --- External Price Enrichment ---
    const assetSymbolsForPricing = formattedReservesFull.map((r) => r.symbol);
    if (assetSymbolsForPricing.length > 0) {
      const externalPrices = await getAssetPrices(assetSymbolsForPricing);
      formattedReservesFull = formattedReservesFull.map((reserve) => {
        const externalPrice = externalPrices[reserve.symbol.toUpperCase()];
        if (externalPrice !== undefined) {
          return {
            ...reserve,
            priceUSD: externalPrice, // Add/override priceUSD with external source
            // Recalculate totalLiquidityUSD based on the new external price and reserve.totalLiquidity (in asset units)
            // reserve.totalLiquidity is a BigNumberish string, so care needed for calculation.
            // For simplicity, if totalLiquidity is available and is a number (it's usually a string from formatReserves)
            // Example: totalLiquidityUSD: parseFloat(reserve.totalLiquidity) * externalPrice,
            // This part requires careful handling of BigNumber string conversion and multiplication.
            // The `formatReserves` already provides `totalLiquidityUSD` based on Aave's oracle.
            // Here, we're providing an *additional* `priceUSD` from an external source.
            // The user of this data can then decide which price/totalLiquidityUSD to use or how to combine them.
          };
        }
        return reserve;
      });
    }
    // --- End External Price Enrichment ---

    // Prepare the object to cache (full, unfiltered data)
    const dataToCache = {
      chain_id,
      timestamp: new Date().toISOString(), // Timestamp of when data was fetched
      reserves: formattedReservesFull,
      version, // Store version used for this cache entry
    };
    setCachedData(cacheKey, dataToCache);

    // Now filter if assets were requested for the current call
    let filteredReserves = formattedReservesFull;
    if (assets && Array.isArray(assets) && assets.length > 0) {
      const assetSet = new Set(assets.map((a) => a.toUpperCase()));
      filteredReserves = formattedReservesFull.filter((reserve) =>
        assetSet.has(reserve.symbol.toUpperCase())
      );
    }

    return {
      chain_id,
      timestamp: dataToCache.timestamp, // Use the same timestamp as cached data
      reserves: filteredReserves,
      version,
      fromCache: false,
    };
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(
      `Error fetching reserve data for chain ${chain_id}, version ${version}:`,
      errorMessage,
      error.stack
    );
    throw new Error(
      `Failed to fetch Aave reserve data for chain ${chain_id}, version ${version}: ${errorMessage}`
    );
  }
}
