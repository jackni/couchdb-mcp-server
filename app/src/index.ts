#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { config } from "./config.js";
import { CouchDBMCPServer } from "./server.js";
import { createSSEServer } from "./sse-server.js";
import { createStdioServer } from "./stdio-server.js";
import { createStreamableHTTPServer } from "./streamable-http-server.js";

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
  if (process.argv.includes("--streamable-http") || process.argv.includes("--http-stream")) {
    console.info(`Starting CouchDB MCP Server with Streamable HTTP transport on port ${config.server.port}...`);
    await createStreamableHTTPServer(server, config);
  } else if (process.argv.includes("--sse")) {
    console.info(`Starting CouchDB MCP Server with SSE transport on port ${config.server.port}...`);
    await createSSEServer(server, config);
  } else {
    console.info('Starting CouchDB MCP Server with STDIO transport');
    await createStdioServer(server, config, couchdbServer);
  }
}

main().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});