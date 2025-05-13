import { AAVE_ADDRESS_BOOK } from "./helpers";

interface GetInterestRateStrategiesParams {
  chain_id: number;
  asset?: string; // Optional asset symbol
}

// Define a type for the detailed strategy parameters
interface StrategyDetails {
  OPTIMAL_USAGE_RATIO: string; // These are often strings in the address book, representing large numbers
  BASE_VARIABLE_BORROW_RATE: string;
  VARIABLE_RATE_SLOPE_1: string;
  VARIABLE_RATE_SLOPE_2: string;
  STABLE_RATE_SLOPE_1: string;
  STABLE_RATE_SLOPE_2: string;
  BASE_STABLE_RATE_OFFSET?: string; // Optional as per plan.md example
  STABLE_RATE_EXCESS_OFFSET?: string; // Optional
  OPTIMAL_STABLE_TO_TOTAL_DEBT_RATIO?: string; // Optional
  // Add any other fields that are consistently present
}

interface SingleAssetStrategyResult {
  chain_id: number;
  asset: string;
  timestamp: string;
  strategy: StrategyDetails & { address: string };
}

interface AllStrategiesResult {
  chain_id: number;
  timestamp: string;
  strategies: {
    [strategyAddress: string]: StrategyDetails & { assets: string[] };
  };
}

/**
 * Get interest rate strategy information for Aave markets.
 */
export async function getInterestRateStrategies(
  params: GetInterestRateStrategiesParams
): Promise<SingleAssetStrategyResult | AllStrategiesResult> {
  const { chain_id, asset: requestedAsset } = params;

  try {
    const addressBookForChain = AAVE_ADDRESS_BOOK[chain_id];
    if (
      !addressBookForChain ||
      !addressBookForChain.ASSETS ||
      !addressBookForChain.INTEREST_RATE_STRATEGY
    ) {
      throw new Error(
        `Aave address book data (ASSETS or INTEREST_RATE_STRATEGY) not found for chain ID ${chain_id}`
      );
    }

    const availableAssets = addressBookForChain.ASSETS;
    const availableStrategies = addressBookForChain.INTEREST_RATE_STRATEGY;

    if (requestedAsset) {
      const upperAsset = requestedAsset.toUpperCase();
      const assetDetail = availableAssets[upperAsset];
      if (!assetDetail || !assetDetail.INTEREST_RATE_STRATEGY) {
        throw new Error(
          `Asset ${requestedAsset} or its interest rate strategy not found for chain ${chain_id}`
        );
      }

      const strategyAddress = assetDetail.INTEREST_RATE_STRATEGY;
      const strategyParams = availableStrategies[strategyAddress];
      if (!strategyParams) {
        throw new Error(
          `Interest rate strategy details not found for address ${strategyAddress} on chain ${chain_id}`
        );
      }

      return {
        chain_id,
        asset: upperAsset,
        timestamp: new Date().toISOString(),
        strategy: {
          address: strategyAddress,
          ...strategyParams,
        },
      };
    } else {
      const allStrategiesResult: {
        [key: string]: StrategyDetails & { assets: string[] };
      } = {};

      for (const strategyAddress in availableStrategies) {
        const strategyParams = availableStrategies[strategyAddress];
        const assetsUsingThisStrategy: string[] = [];

        for (const assetSymbol in availableAssets) {
          if (
            availableAssets[assetSymbol].INTEREST_RATE_STRATEGY ===
            strategyAddress
          ) {
            assetsUsingThisStrategy.push(assetSymbol);
          }
        }
        allStrategiesResult[strategyAddress] = {
          ...strategyParams,
          assets: assetsUsingThisStrategy,
        };
      }

      return {
        chain_id,
        timestamp: new Date().toISOString(),
        strategies: allStrategiesResult,
      };
    }
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(
      `Error fetching interest rate strategies for chain ${chain_id}:`,
      errorMessage,
      error.stack
    );
    throw new Error(
      `Failed to fetch interest rate strategies for chain ${chain_id}: ${errorMessage}`
    );
  }
}
