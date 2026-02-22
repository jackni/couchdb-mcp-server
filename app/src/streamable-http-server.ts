import { randomUUID } from "crypto";
import { Server as MCPServer } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { createServer, IncomingMessage, ServerResponse } from "http";
import { URL } from "url";
import { Config } from "./config.js";
import { CouchDBMCPServer } from "./server.js";

/**
 * Generate OpenAPI 3.0 specification from MCP tools
 */
function generateOpenAPISpec(tools: Tool[], config: Config): any {
  const serverUrl = `http://${config.server.host}:${config.server.port}`;

  const paths: any = {
    "/tools": {
      post: {
        summary: "Execute an MCP tool",
        description: "Direct tool execution endpoint for testing",
        operationId: "executeTool",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  tool: {
                    type: "string",
                    description: "Name of the tool to execute",
                    enum: tools.map((t) => t.name),
                  },
                  arguments: {
                    type: "object",
                    description: "Tool arguments",
                  },
                },
                required: ["tool"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Tool execution result",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    content: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          type: { type: "string" },
                          text: { type: "string" },
                        },
                      },
                    },
                    isError: { type: "boolean" },
                  },
                },
              },
            },
          },
          "400": {
            description: "Bad request",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },
  };

  // Add individual tool endpoints
  tools.forEach((tool) => {
    const path = `/tools/${tool.name}`;
    paths[path] = {
      post: {
        summary: tool.description || `Execute ${tool.name}`,
        description: tool.description,
        operationId: tool.name.replace(/-/g, "_"),
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: tool.inputSchema || {
                type: "object",
                properties: {},
                required: [],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Tool execution result",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    content: {
                      type: "array",
                      items: {
                        type: "object",
                      },
                    },
                    isError: { type: "boolean" },
                  },
                },
              },
            },
          },
          "400": {
            description: "Bad request",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    };
  });

  return {
    openapi: "3.0.0",
    info: {
      title: "CouchDB MCP Server API",
      version: "1.1.0",
      description: "Model Context Protocol server for comprehensive CouchDB management",
      contact: {
        name: "CouchDB MCP Server",
      },
    },
    servers: [
      {
        url: serverUrl,
        description: "CouchDB MCP Server (Streamable HTTP)",
      },
    ],
    paths,
    components: {
      schemas: {
        ToolResult: {
          type: "object",
          properties: {
            content: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string" },
                  text: { type: "string" },
                },
              },
            },
            isError: { type: "boolean" },
          },
        },
        Error: {
          type: "object",
          properties: {
            error: { type: "string" },
          },
        },
      },
    },
    tags: [
      { name: "tools", description: "MCP tool operations" },
      { name: "database", description: "Database operations" },
      { name: "document", description: "Document operations" },
      { name: "security", description: "Security and user management" },
      { name: "replication", description: "Replication operations" },
      { name: "design", description: "Design document operations" },
      { name: "query", description: "Query operations" },
    ],
  };
}

export async function createStreamableHTTPServer(
  mcpServer: MCPServer,
  config: Config
): Promise<void> {
  const couchdbServer = new CouchDBMCPServer(config);
  await couchdbServer.initialize();

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
  });
  await mcpServer.connect(transport);

  const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url || "", `http://${req.headers.host}`);

    // CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
      res.writeHead(200);
      res.end();
      return;
    }

    // Health check endpoint
    if (url.pathname === "/health" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "healthy", timestamp: new Date().toISOString() }));
      return;
    }

    // MCP Info endpoint
    if (url.pathname === "/info" && req.method === "GET") {
      const tools = await couchdbServer.getTools();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          name: "couchdb-mcp-server",
          version: "1.1.0",
          description: "CouchDB Control Plane MCP Server",
          tools,
          transport: "streamable-http",
        })
      );
      return;
    }

    // OpenAPI spec endpoint
    if (url.pathname === "/openapi.json" && req.method === "GET") {
      const tools = await couchdbServer.getTools();
      const openApiSpec = generateOpenAPISpec(tools, config);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(openApiSpec, null, 2));
      return;
    }

    // Direct tool call endpoint (for testing)
    if (url.pathname === "/tools" && req.method === "POST") {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk.toString();
      });

      req.on("end", async () => {
        try {
          const { tool, arguments: args } = JSON.parse(body);
          const result = await couchdbServer.handleToolCall(tool, args);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(result));
        } catch (error) {
          console.error("Tool call error:", error);
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              error: error instanceof Error ? error.message : "Unknown error",
            })
          );
        }
      });

      return;
    }

    // API documentation endpoint
    if (url.pathname === "/" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>CouchDB MCP Server - Streamable HTTP</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            code { background: #f5f5f5; padding: 2px 4px; border-radius: 3px; }
            pre { background: #f5f5f5; padding: 10px; border-radius: 5px; overflow-x: auto; }
            .endpoint { margin: 20px 0; padding: 10px; border: 1px solid #ddd; border-radius: 5px; }
          </style>
        </head>
        <body>
          <h1>CouchDB Control Plane MCP Server (Streamable HTTP)</h1>
          <p>A Model Context Protocol server for comprehensive CouchDB management.</p>

          <h2>Available Endpoints</h2>

          <div class="endpoint">
            <h3>GET /health</h3>
            <p>Health check endpoint</p>
          </div>

          <div class="endpoint">
            <h3>GET /info</h3>
            <p>Server information and available tools</p>
          </div>

          <div class="endpoint">
            <h3>GET /openapi.json</h3>
            <p>OpenAPI 3.0 specification for all available tools</p>
            <p><a href="/openapi.json" target="_blank">View OpenAPI Spec</a></p>
          </div>

          <div class="endpoint">
            <h3>GET /mcp</h3>
            <p>Streamable HTTP transport (SSE stream for server-to-client messages)</p>
          </div>

          <div class="endpoint">
            <h3>POST /mcp</h3>
            <p>Streamable HTTP transport (JSON-RPC messages)</p>
          </div>

          <div class="endpoint">
            <h3>POST /tools</h3>
            <p>Direct tool execution endpoint for testing</p>
            <pre>
curl -X POST http://localhost:${config.server.port}/tools \\
  -H "Content-Type: application/json" \\
  -d '{"tool": "list-databases"}'
            </pre>
          </div>

          <p><strong>Port:</strong> ${config.server.port}</p>
          <p><strong>Transport:</strong> Streamable HTTP (SDK)</p>
        </body>
        </html>
      `);
      return;
    }

    // MCP Streamable HTTP endpoint - delegate to SDK transport
    if (url.pathname === "/mcp") {
      await transport.handleRequest(req, res);
      return;
    }

    // 404 for all other routes
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  });

  httpServer.listen(config.server.port, config.server.host, () => {
    console.info(
      `CouchDB MCP Server (Streamable HTTP) is running on http://${config.server.host}:${config.server.port}`
    );
    console.info(`Available endpoints:`);
    console.info(`  - GET  http://${config.server.host}:${config.server.port}/         (Documentation)`);
    console.info(`  - GET  http://${config.server.host}:${config.server.port}/health   (Health check)`);
    console.info(`  - GET  http://${config.server.host}:${config.server.port}/info     (Server info)`);
    console.info(`  - GET  http://${config.server.host}:${config.server.port}/openapi.json (OpenAPI spec)`);
    console.info(`  - GET  http://${config.server.host}:${config.server.port}/mcp      (Streamable HTTP - SSE)`);
    console.info(`  - POST http://${config.server.host}:${config.server.port}/mcp      (Streamable HTTP)`);
    console.info(`  - POST http://${config.server.host}:${config.server.port}/tools    (Direct tool calls)`);
  });

  // Graceful shutdown
  let isShuttingDown = false;
  const gracefulShutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.info(`\nReceived ${signal}. Shutting down Streamable HTTP server...`);
    httpServer.close(async (err) => {
      if (err) console.error("Error closing HTTP server:", err);
      try {
        await couchdbServer.cleanup();
        await new Promise((r) => setTimeout(r, 100));
        console.info("Graceful shutdown complete");
        process.exit(0);
      } catch (error) {
        console.error("Error during shutdown:", error);
        process.exit(1);
      }
    });
    setTimeout(() => {
      console.error("Force shutdown due to timeout");
      process.exit(1);
    }, 5000);
  };
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
}
