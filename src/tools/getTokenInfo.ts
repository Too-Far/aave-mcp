import { AAVE_ADDRESS_BOOK, MarketAddresses } from "./helpers"; // Assuming MarketAddresses might be relevant or AAVE_ADDRESS_BOOK contains all needed types

interface GetTokenInfoParams {
  chain_id: number;
  tokens?: string[]; // Optional array of token symbols
}

// Define a more specific type for individual token information
interface TokenInfo {
  symbol: string;
  underlying: string;
  aToken: string;
  variableDebtToken: string;
  stableDebtToken: string;
  decimals: number;
  interestRateStrategy?: string; // This can be optional or have a default
}

interface GetTokenInfoResult {
  chain_id: number;
  timestamp: string;
  tokens: TokenInfo[];
}

/**
 * Get detailed information about tokens in the Aave market for a specific chain.
 */
export async function getTokenInfo(
  params: GetTokenInfoParams
): Promise<GetTokenInfoResult> {
  const { chain_id, tokens: requestedTokens } = params;

  try {
    const addressBookForChain = AAVE_ADDRESS_BOOK[chain_id];
    if (!addressBookForChain || !addressBookForChain.ASSETS) {
      throw new Error(
        `No Aave ASSETS found in address book for chain ID ${chain_id}`
      );
    }

    const availableAssets = addressBookForChain.ASSETS;
    const tokenInfoList: TokenInfo[] = [];

    const tokensToProcess =
      requestedTokens &&
      Array.isArray(requestedTokens) &&
      requestedTokens.length > 0
        ? requestedTokens.map((t) => t.toUpperCase())
        : Object.keys(availableAssets);

    for (const symbol of tokensToProcess) {
      const assetDetails = availableAssets[symbol]; // Symbol should be uppercase for lookup
      if (assetDetails) {
        tokenInfoList.push({
          symbol: symbol, // Keep the original casing or consistent casing as per your needs
          underlying: assetDetails.UNDERLYING,
          aToken: assetDetails.A_TOKEN,
          variableDebtToken: assetDetails.VARIABLE_DEBT_TOKEN,
          stableDebtToken: assetDetails.STABLE_DEBT_TOKEN,
          decimals: assetDetails.DECIMALS,
          interestRateStrategy: assetDetails.INTEREST_RATE_STRATEGY,
        });
      }
    }

    return {
      chain_id,
      timestamp: new Date().toISOString(),
      tokens: tokenInfoList,
    };
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(
      `Error fetching token info for chain ${chain_id}:`,
      errorMessage,
      error.stack
    );
    throw new Error(
      `Failed to fetch token info for chain ${chain_id}: ${errorMessage}`
    );
  }
}
