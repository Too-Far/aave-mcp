import {
  UiPoolDataProvider,
  UserReserveDataHumanized,
  ReserveDataHumanized,
} from "@aave/contract-helpers";
import {
  formatUserSummary,
  FormatUserSummaryResponse,
  formatReserves,
  FormatReserveUSDResponse,
} from "@aave/math-utils";
import { getProvider, getMarketAddresses, MarketAddresses } from "./helpers";

interface GetUserDataParams {
  chain_id: number;
  user_address: string;
  // Add other potential params from your plan.md if they exist
}

interface GetUserDataResult {
  chain_id: number;
  user_address: string;
  timestamp: string;
  summary: FormatUserSummaryResponse; // Type from @aave/math-utils
  user_reserves: UserReserveDataHumanized[]; // Type from @aave/contract-helpers
  // Add other potential fields from your plan.md
}

/**
 * Get Aave user data
 */
export async function getUserData(
  params: GetUserDataParams
): Promise<GetUserDataResult> {
  const { chain_id, user_address } = params;

  // Validate user address (basic validation)
  if (
    !user_address ||
    !user_address.startsWith("0x") ||
    user_address.length !== 42
  ) {
    // A more robust validation might use ethers.utils.isAddress
    throw new Error("Invalid user address provided.");
  }

  try {
    const addresses: MarketAddresses = getMarketAddresses(chain_id);
    const provider = getProvider(chain_id);

    const poolDataProviderContract = new UiPoolDataProvider({
      uiPoolDataProviderAddress: addresses.UI_POOL_DATA_PROVIDER,
      provider,
      chainId: chain_id,
    });

    // Get user and reserve data in parallel
    const [userReservesResponse, reservesDataResponse] = await Promise.all([
      poolDataProviderContract.getUserReservesHumanized({
        lendingPoolAddressProvider: addresses.POOL_ADDRESSES_PROVIDER,
        user: user_address,
      }),
      poolDataProviderContract.getReservesHumanized({
        lendingPoolAddressProvider: addresses.POOL_ADDRESSES_PROVIDER,
      }),
    ]);

    const currentTimestamp = Math.floor(Date.now() / 1000);

    // First, format the general reserves data
    const formattedReserves: FormatReserveUSDResponse[] = formatReserves({
      reserves: reservesDataResponse.reservesData,
      currentTimestamp,
      marketReferenceCurrencyDecimals:
        reservesDataResponse.baseCurrencyData.marketReferenceCurrencyDecimals,
      marketReferencePriceInUsd:
        reservesDataResponse.baseCurrencyData.marketReferenceCurrencyPriceInUsd,
    });

    // Then, format the user summary using the formatted general reserves data
    const formattedUserSummary: FormatUserSummaryResponse = formatUserSummary({
      currentTimestamp,
      marketReferencePriceInUsd:
        reservesDataResponse.baseCurrencyData.marketReferenceCurrencyPriceInUsd,
      marketReferenceCurrencyDecimals:
        reservesDataResponse.baseCurrencyData.marketReferenceCurrencyDecimals,
      userReserves: userReservesResponse.userReserves,
      formattedReserves: formattedReserves,
      userEmodeCategoryId: userReservesResponse.userEmodeCategoryId,
    });

    return {
      chain_id,
      user_address,
      timestamp: new Date().toISOString(),
      summary: formattedUserSummary,
      user_reserves: userReservesResponse.userReserves,
    };
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(
      `Error fetching user data for address ${user_address} on chain ${chain_id}:`,
      errorMessage,
      error.stack
    );
    throw new Error(
      `Failed to fetch Aave user data for ${user_address} on chain ${chain_id}: ${errorMessage}`
    );
  }
}
