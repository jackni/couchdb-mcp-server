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
  console.info("CouchDB MCP Server started successfully!");

  let isShuttingDown = false;
  const gracefulShutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.info(`\nReceived ${signal}. Shutting down gracefully...`);
    try {
      await couchdbServer.cleanup();
      console.info("Graceful shutdown complete");
      process.exit(0);
    } catch (error) {
      console.error("Error during shutdown:", error);
      process.exit(1);
    }
  };

  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
}
