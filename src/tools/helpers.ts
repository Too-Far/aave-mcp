import { ethers } from "ethers";
import {
  AaveV3Ethereum,
  AaveV3Arbitrum,
  AaveV3Optimism,
  AaveV3Polygon,
  AaveV3Avalanche,
  AaveV3Base,
  // Add other network imports from @bgd-labs/aave-address-book as needed
} from "@bgd-labs/aave-address-book";

// Define a type for the RPC URLs configuration
interface RpcUrls {
  [chainId: number]: string;
}

// RPC URL configuration
export const RPC_URLS: RpcUrls = {
  1:
    process.env.ETHEREUM_RPC_URL || "https://mainnet.infura.io/v3/YOUR_API_KEY", // Ethereum Mainnet
  42161: process.env.ARBITRUM_RPC_URL || "https://arb1.arbitrum.io/rpc", // Arbitrum
  10: process.env.OPTIMISM_RPC_URL || "https://mainnet.optimism.io", // Optimism
  137: process.env.POLYGON_RPC_URL || "https://polygon-rpc.com", // Polygon
  43114:
    process.env.AVALANCHE_RPC_URL || "https://api.avax.network/ext/bc/C/rpc", // Avalanche
  8453: process.env.BASE_RPC_URL || "https://mainnet.base.org", // Base
  // Add other chains as needed, ensuring IDs are numbers
};

// Define a type for the Aave Address Book instances
// Using 'any' for now as the specific types from the library can be complex to map dynamically for all chains
// A more specific type could be constructed if needed, e.g., by looking at the type of AaveV3Ethereum etc.
interface AaveAddressBookInstances {
  [chainId: number]: any;
}

// Map chain IDs to Aave Address Book instances
export const AAVE_ADDRESS_BOOK: AaveAddressBookInstances = {
  1: AaveV3Ethereum,
  42161: AaveV3Arbitrum,
  10: AaveV3Optimism,
  137: AaveV3Polygon,
  43114: AaveV3Avalanche,
  8453: AaveV3Base,
  // Add other chains as needed
};

// Define a type for the market addresses returned by getMarketAddresses
export interface MarketAddresses {
  POOL: string;
  POOL_ADDRESSES_PROVIDER: string;
  UI_POOL_DATA_PROVIDER: string;
  UI_INCENTIVE_DATA_PROVIDER: string;
  ORACLE: string;
  // Add other relevant addresses from the address book if needed
}

/**
 * Get market addresses for a specific chain from the Aave Address Book.
 */
export function getMarketAddresses(chainId: number): MarketAddresses {
  const addressBook = AAVE_ADDRESS_BOOK[chainId];
  if (!addressBook) {
    throw new Error(`No address book available for chain ID ${chainId}`);
  }

  // Ensure all expected keys are present. Adjust this based on which addresses you actually need.
  if (
    !addressBook.POOL ||
    !addressBook.POOL_ADDRESSES_PROVIDER ||
    !addressBook.UI_POOL_DATA_PROVIDER ||
    !addressBook.UI_INCENTIVE_DATA_PROVIDER ||
    !addressBook.ORACLE
  ) {
    throw new Error(
      `Address book for chain ID ${chainId} is missing one or more required addresses.`
    );
  }

  return {
    POOL: addressBook.POOL,
    POOL_ADDRESSES_PROVIDER: addressBook.POOL_ADDRESSES_PROVIDER,
    UI_POOL_DATA_PROVIDER: addressBook.UI_POOL_DATA_PROVIDER,
    UI_INCENTIVE_DATA_PROVIDER: addressBook.UI_INCENTIVE_DATA_PROVIDER,
    ORACLE: addressBook.ORACLE,
  };
}

const providerCache: { [chainId: number]: ethers.providers.JsonRpcProvider } =
  {};

/**
 * Get ethers provider for a specific chain, with caching.
 */
export function getProvider(chainId: number): ethers.providers.JsonRpcProvider {
  if (providerCache[chainId]) {
    return providerCache[chainId];
  }

  const rpcUrl = RPC_URLS[chainId];
  if (!rpcUrl) {
    // console.error(`[DEBUG] No RPC URL configured in RPC_URLS for chain ID ${chainId}`); // Keep this one if you like, or remove
    throw new Error(`No RPC URL configured for chain ID ${chainId}`);
  }

  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
  providerCache[chainId] = provider;
  return provider;
}

// Later, we can add functions like getTokenInfo and getInterestRateStrategies here
// as described in the "Enhanced Features Using Aave Address Book" section of plan.md.

// --- Caching Utilities (as per plan.md) ---

interface CacheEntry {
  data: any;
  timestamp: number;
}

interface CacheStore {
  [key: string]: CacheEntry | undefined; // Allow undefined for keys that might not exist
}

// In-memory cache store. For a production MCP, you might consider a more robust
// caching solution (e.g., Redis) if the MCP is long-running and stateful,
// or if multiple instances run. For a simple stdin/stdout MCP, this in-memory cache
// will reset with each new process, but can still be useful for multiple calls within a single "session".
const CACHE: CacheStore = {
  // Example structure: reserveData_1_v3: { data: { ... }, timestamp: 1234567890 }
};

const DEFAULT_CACHE_TTL = 60 * 1000; // 1 minute TTL, as per plan.md

/**
 * Retrieves data from cache if available and not expired.
 * @param key The cache key.
 * @param ttl Custom Time-To-Live in milliseconds for this specific key (optional).
 * @returns Cached data or null if not found or expired.
 */
export function getCachedData(
  key: string,
  ttl: number = DEFAULT_CACHE_TTL
): any | null {
  const entry = CACHE[key];
  if (entry && Date.now() - entry.timestamp < ttl) {
    // console.log(`Cache HIT for key: ${key}`);
    return entry.data;
  }
  // console.log(`Cache MISS for key: ${key}`);
  return null;
}

/**
 * Stores data in the cache.
 * @param key The cache key.
 * @param data The data to store.
 */
export function setCachedData(key: string, data: any): void {
  // console.log(`Caching data for key: ${key}`);
  CACHE[key] = {
    data,
    timestamp: Date.now(),
  };
}
