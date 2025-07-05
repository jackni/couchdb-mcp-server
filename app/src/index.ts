#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { CouchDBMCPServer } from "./server.js";
import { config } from "./config.js";
import { createSSEServer } from "./sse-server.js";

async function main() {
  const server = new Server(
    {
      name: "couchdb-mcp-server",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
    }
  );

  // Initialize the CouchDB MCP server
  const couchdbServer = new CouchDBMCPServer(config);
  await couchdbServer.initialize();

  // Register tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: await couchdbServer.getTools(),
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    return await couchdbServer.handleToolCall(name, args || {});
  });

  // Transport selection
  if (process.argv.includes("--sse")) {
    console.error(`Starting CouchDB MCP Server with SSE transport on port ${config.server.port}...`);
    await createSSEServer(server, config);
  } else {
    console.error("Starting CouchDB MCP Server with STDIO transport...");
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("CouchDB MCP Server started successfully!");
    
    // Handle graceful shutdown for STDIO mode
    let isShuttingDown = false;
    
    const gracefulShutdown = async (signal: string) => {
      if (isShuttingDown) return;
      isShuttingDown = true;
      
      console.error(`\nReceived ${signal}. Shutting down gracefully...`);
      try {
        await couchdbServer.cleanup();
        console.error("Graceful shutdown complete");
        process.exit(0);
      } catch (error) {
        console.error("Error during shutdown:", error);
        process.exit(1);
      }
    };

    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  }
}

main().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});