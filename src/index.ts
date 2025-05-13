import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import chalk from "chalk";

import { getReserveData } from "./tools/getReserveData";
import { getUserData } from "./tools/getUserData";
import { getTokenInfo } from "./tools/getTokenInfo";
import { getInterestRateStrategies } from "./tools/getInterestRateStrategies";
import { getHistoricalRates } from "./tools/getHistoricalRates";

// Define Tool objects (GET_RESERVE_DATA_TOOL, etc. - these definitions should be okay)
const GET_RESERVE_DATA_TOOL: Tool = {
  name: "get_reserve_data",
  description:
    "Fetches Aave reserve data for a specific chain, with caching and optional external price enrichment.",
  inputSchema: {
    type: "object",
    properties: {
      chain_id: {
        type: "integer",
        description: "The numerical ID of the blockchain network.",
      },
      assets: {
        type: "array",
        items: { type: "string" },
        description: "Optional array of asset symbols to filter.",
      },
      version: {
        type: "string",
        description: "Optional Aave version (e.g., 'v3').",
      },
    },
    required: ["chain_id"],
  },
};

const GET_USER_DATA_TOOL: Tool = {
  name: "get_user_data",
  description:
    "Fetches user-specific Aave data including positions and health factor for a specific chain.",
  inputSchema: {
    type: "object",
    properties: {
      chain_id: { type: "integer", description: "Blockchain network ID." },
      user_address: {
        type: "string",
        description: "The Ethereum address of the user.",
      },
    },
    required: ["chain_id", "user_address"],
  },
};

const GET_TOKEN_INFO_TOOL: Tool = {
  name: "get_token_info",
  description:
    "Fetches detailed information about tokens in the Aave market for a given chain.",
  inputSchema: {
    type: "object",
    properties: {
      chain_id: { type: "integer", description: "Blockchain network ID." },
      tokens: {
        type: "array",
        items: { type: "string" },
        description: "Optional array of token symbols.",
      },
    },
    required: ["chain_id"],
  },
};

const GET_INTEREST_RATE_STRATEGIES_TOOL: Tool = {
  name: "get_interest_rate_strategies",
  description:
    "Fetches interest rate strategy parameters for Aave assets on a given chain.",
  inputSchema: {
    type: "object",
    properties: {
      chain_id: { type: "integer", description: "Blockchain network ID." },
      asset: { type: "string", description: "Optional asset symbol." },
    },
    required: ["chain_id"],
  },
};

const GET_HISTORICAL_RATES_TOOL: Tool = {
  name: "get_historical_rates",
  description:
    "(Placeholder) Fetches historical supply and borrow APYs for an asset.",
  inputSchema: {
    type: "object",
    properties: {
      chain_id: { type: "integer", description: "Blockchain network ID." },
      asset: { type: "string", description: "Asset symbol." },
      days: {
        type: "integer",
        description: "Number of past days for historical data.",
      },
    },
    required: ["chain_id", "asset", "days"],
  },
};

export const ALL_TOOLS: Tool[] = [
  GET_RESERVE_DATA_TOOL,
  GET_USER_DATA_TOOL,
  GET_TOKEN_INFO_TOOL,
  GET_INTEREST_RATE_STRATEGIES_TOOL,
  GET_HISTORICAL_RATES_TOOL,
];

// Server Instantiation - directly pass metadata and capabilities objects
const server = new Server(
  {
    // ServerInfo equivalent
    name: "aave-mcp-server-ts",
    version: "1.0.0",
  },
  {
    // ServerCapabilities equivalent
    capabilities: {
      tools: {
        [GET_RESERVE_DATA_TOOL.name]: GET_RESERVE_DATA_TOOL,
        [GET_USER_DATA_TOOL.name]: GET_USER_DATA_TOOL,
        [GET_TOKEN_INFO_TOOL.name]: GET_TOKEN_INFO_TOOL,
        [GET_INTEREST_RATE_STRATEGIES_TOOL.name]:
          GET_INTEREST_RATE_STRATEGIES_TOOL,
        [GET_HISTORICAL_RATES_TOOL.name]: GET_HISTORICAL_RATES_TOOL,
      },
    },
  }
);

// Define handler return types based on sequentialthinking example structure
interface HandlerToolResponseContentItem {
  type: string;
  text: string;
}
interface HandlerToolSuccessResponse {
  content: HandlerToolResponseContentItem[];
  isError?: false;
}
interface HandlerToolErrorResponse {
  content: HandlerToolResponseContentItem[];
  isError: true;
}
type HandlerToolResponseType =
  | HandlerToolSuccessResponse
  | HandlerToolErrorResponse;
interface HandlerListToolsResponse {
  tools: Tool[];
}

// ListTools Handler - sequentialthinking example returns { tools: Tool[] }
server.setRequestHandler(
  ListToolsRequestSchema,
  async (): Promise<{ tools: Tool[] }> => {
    console.error(
      chalk.blueBright("[DEBUG_SDK] ListToolsRequestSchema handler ENTERED.")
    );
    return {
      tools: ALL_TOOLS,
    };
  }
);

// CallTool Handler
server.setRequestHandler(
  CallToolRequestSchema,
  async (
    request
  ): Promise<{
    content: Array<{ type: string; text: string }>;
    isError?: boolean;
  }> => {
    console.error("[DEBUG_SDK] RAW CALLTOOLHANDLER ENTRY");
    console.error(
      chalk.magenta(
        "[DEBUG_SDK] CallToolRequestSchema handler ENTERED. Request:"
      ),
      JSON.stringify(request, null, 2)
    );
    const toolName = request.params.name as string;
    const toolArguments = request.params.arguments as any;

    try {
      let resultData: any;
      switch (toolName) {
        case GET_RESERVE_DATA_TOOL.name:
          resultData = await getReserveData(toolArguments);
          break;
        case GET_USER_DATA_TOOL.name:
          resultData = await getUserData(toolArguments);
          break;
        case GET_TOKEN_INFO_TOOL.name:
          resultData = await getTokenInfo(toolArguments);
          break;
        case GET_INTEREST_RATE_STRATEGIES_TOOL.name:
          resultData = await getInterestRateStrategies(toolArguments);
          break;
        case GET_HISTORICAL_RATES_TOOL.name:
          resultData = await getHistoricalRates(toolArguments);
          break;
        default:
          console.error(
            chalk.yellow(
              `[DEBUG_SDK] Unknown tool in CallToolRequest: ${toolName}`
            )
          );
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  error: `Unknown tool: ${toolName}`,
                  status: "failed",
                }),
              },
            ],
            isError: true,
          };
      }
      console.error(
        chalk.cyan(
          `[DEBUG_SDK] Tool '${toolName}' executed successfully. Result (before stringify):`
        ),
        resultData
      );
      return {
        content: [{ type: "text", text: JSON.stringify(resultData) }],
      };
    } catch (error: any) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(
        chalk.red(`[ERROR] Error executing tool ${toolName}: ${errorMessage}`),
        error.stack
      );
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ error: errorMessage, status: "failed" }),
          },
        ],
        isError: true,
      };
    }
  }
);

// --- Server Start Logic ---
async function run() {
  // --- STDIN Debugging ---
  console.error(
    chalk.yellow(`[DEBUG_STDIN] process.stdin.isTTY: ${process.stdin.isTTY}`)
  );
  console.error(
    chalk.yellow(
      `[DEBUG_STDIN] process.stdin.readable: ${process.stdin.readable}`
    )
  );
  // console.error(chalk.yellow(`[DEBUG_STDIN] process.stdin.writable: ${process.stdin.writable}`)); // stdin is not typically writable
  console.error(
    chalk.yellow(
      `[DEBUG_STDIN] process.stdin.destroyed: ${process.stdin.destroyed}`
    )
  );
  console.error(
    chalk.yellow(
      `[DEBUG_STDIN] process.stdin.readableEnded: ${process.stdin.readableEnded}`
    )
  );
  console.error(
    chalk.yellow(
      `[DEBUG_STDIN] process.stdin.readableFlowing: ${process.stdin.readableFlowing}`
    )
  );
  // --- End STDIN Debugging ---

  const transport = new StdioServerTransport();
  console.error(
    chalk.green(
      "Aave MCP Server (SDK version) initializing transport and connecting..."
    )
  );
  await server.connect(transport);
  console.error(
    chalk.yellow(
      "Aave MCP Server (SDK version) transport connection ended (stdio closed)."
    )
  );
}

// Exported function to be called by the CLI or other entry points
export function startMcpServer(
  options?: any /* McpServerOptions can be defined here if needed */
): void {
  console.error(
    chalk.blue("[INFO] startMcpServer called. Initializing stdio server...")
  );
  run().catch((error) => {
    console.error(
      chalk.red("[FATAL_ERROR] Error running Aave MCP server:"),
      error
    );
    process.exit(1);
  });
}

// NO auto-start (if require.main === module) block here.
// The CLI (bin/aave-mcp) is now responsible for calling startMcpServer.
