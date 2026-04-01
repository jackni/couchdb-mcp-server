import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Config } from "./config.js";
import { CouchDBMCPServer } from "./server.js";

/**
 * Start the MCP server with STDIO transport.
 * Caller must have already registered request handlers on the server.
 */
export async function createStdioServer(
  server: Server,
  _config: Config,
  couchdbServer: CouchDBMCPServer
): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // IMPORTANT: In STDIO transport, stdout is the JSON-RPC channel.
  // Some MCP clients may also merge stderr into the same reader.
  // Therefore STDIO mode must be completely silent (no console output).

  let isShuttingDown = false;
  const gracefulShutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    try {
      await couchdbServer.cleanup();
      process.exit(0);
    } catch (error) {
      // Intentionally silent in STDIO mode to avoid corrupting JSON-RPC stream.
      process.exit(1);
    }
  };

  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
}
