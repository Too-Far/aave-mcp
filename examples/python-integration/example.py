import json
import subprocess
import sys

def call_aave_mcp(tool_name: str, params: dict):
    """Call the Aave MCP from Python."""
    # Ensure the MCP server can be found. 
    # This might need adjustment based on how the aave-mcp CLI is installed or located.
    # If running from the project root where ./bin/aave-mcp exists:
    mcp_command = ["./bin/aave-mcp", "start"]
    # If aave-mcp is globally installed or in PATH:
    # mcp_command = ["aave-mcp", "start"]

    try:
        # Start the MCP process
        process = subprocess.Popen(
            mcp_command,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            text=True,
            cwd="." # Assuming this script is run from the project root, or adjust cwd
        )
    except FileNotFoundError:
        print(f"Error: The command '{' '.join(mcp_command)}' was not found. "
              f"Ensure aave-mcp is built and accessible from the current path.", file=sys.stderr)
        return {"error": "MCP command not found", "errorType": "CLIENT_ERROR"}
    
    # Send request
    request = json.dumps({"name": tool_name, "params": params}) + "\n"
    
    if process.stdin:
        process.stdin.write(request)
        process.stdin.flush()
        process.stdin.close() # Close stdin to signal no more input
    else:
        print("Error: Could not open stdin for MCP process.", file=sys.stderr)
        process.terminate()
        process.wait()
        return {"error": "Failed to write to MCP stdin", "errorType": "CLIENT_ERROR"}

    # Read response
    response_str = ""
    if process.stdout:
        for line in iter(process.stdout.readline, b''):
            if not line: # Handle potential empty lines if readline blocks
                break
            response_str = line.strip()
            if response_str: # Process first non-empty line
                break 
        process.stdout.close()
    else:
        print("Error: Could not open stdout for MCP process.", file=sys.stderr)
        process.terminate()
        process.wait()
        return {"error": "Failed to read from MCP stdout", "errorType": "CLIENT_ERROR"}
    
    # Wait for the process to terminate and get return code
    return_code = process.wait()
    # print(f"MCP process exited with code: {return_code}", file=sys.stderr)

    if not response_str:
        print("Error: No response from MCP process.", file=sys.stderr)
        return {"error": "No response from MCP", "errorType": "CLIENT_ERROR"}

    try:
        response = json.loads(response_str)
    except json.JSONDecodeError:
        print(f"Error: Could not decode JSON response from MCP: {response_str}", file=sys.stderr)
        return {"error": "Invalid JSON response from MCP", "errorType": "CLIENT_ERROR"}
    
    return response

if __name__ == "__main__":
    print("Running Aave MCP Python client example...")
    
    # Example: Get USDC reserve data on Ethereum
    print("\nFetching USDC reserve data on Ethereum (Chain ID 1)...")
    example_result_reserve = call_aave_mcp("get_reserve_data", {
        "chain_id": 1,
        "assets": ["USDC"]
    })
    print("Response from get_reserve_data:")
    print(json.dumps(example_result_reserve, indent=2))

    # Example: List available tools
    # This example is a bit different as our CLI handles list-tools directly.
    # To show interaction with a running server for a custom tool:
    # Let's assume we had a tool "echo_tool" that just echoes params.
    # print("\nTesting a generic tool call (echo_tool example)...")
    # example_result_echo = call_aave_mcp("echo_tool", {"message": "Hello from Python"})
    # print("Response from echo_tool:")
    # print(json.dumps(example_result_echo, indent=2))

    # Example: Get Token Info for WETH on Polygon
    print("\nFetching WETH token info on Polygon (Chain ID 137)...")
    example_result_token = call_aave_mcp("get_token_info", {
        "chain_id": 137,
        "tokens": ["WETH"]
    })
    print("Response from get_token_info:")
    print(json.dumps(example_result_token, indent=2))
    
    # Note: For this script to work, the aave-mcp must be built (npm run build)
    # and you might need to adjust the mcp_command path if not running from the project root.
    # Also, ensure RPC_URL environment variables are set if the MCP tools require them (e.g., in a .env file read by the MCP). 