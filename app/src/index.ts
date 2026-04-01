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
  const isStdioTransport =
    !process.argv.includes("--sse") &&
    !process.argv.includes("--streamable-http") &&
    !process.argv.includes("--http-stream");

  if (isStdioTransport) {
    // In STDIO mode, stdout must be reserved exclusively for JSON-RPC messages.
    // Many MCP clients treat any output from the process as protocol data (and some may merge stderr).
    // To avoid breaking clients with non-JSON logs, keep STDIO mode completely silent.
    process.env.MCP_TRANSPORT = "stdio";
  }

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
    await createStdioServer(server, config, couchdbServer);
  }
}

main().catch((error) => {
  // Avoid writing non-JSON logs in STDIO mode (some clients may merge stderr into the protocol reader).
  const isStdioTransport =
    !process.argv.includes("--sse") &&
    !process.argv.includes("--streamable-http") &&
    !process.argv.includes("--http-stream");
  if (!isStdioTransport) {
    console.error("Failed to start server:", error);
  }
  process.exit(1);
});