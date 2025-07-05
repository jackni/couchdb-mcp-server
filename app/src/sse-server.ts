import { Server as MCPServer } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { createServer, IncomingMessage, ServerResponse } from "http";
import { URL } from "url";
import { Config } from "./config.js";
import { CouchDBMCPServer } from "./server.js";

export async function createSSEServer(mcpServer: MCPServer, config: Config): Promise<void> {
  // Create CouchDB server for direct tool calls endpoint
  const couchdbServer = new CouchDBMCPServer(config);
  await couchdbServer.initialize();
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
      res.end(JSON.stringify({
        name: "couchdb-mcp-server",
        version: "1.0.0",
        description: "CouchDB Control Plane MCP Server",
        tools: tools,
        transport: "sse"
      }));
      return;
    }

    // SSE endpoint - proper MCP SSE transport
    if (url.pathname === "/sse") {
      if (req.method === "GET") {
        console.error("SSE connection attempt received");
        
        // Create SSE transport and connect the MCP server
        const transport = new SSEServerTransport("/sse", res);
        
        // Set up connection lifecycle handlers
        transport.onclose = () => {
          console.error("SSE connection closed");
        };
        
        transport.onerror = (error: Error) => {
          console.error("SSE transport error:", error);
        };
        
        try {
          console.error("Starting SSE transport");
          await transport.start();
          
          console.error("Connecting MCP server to SSE transport");
          await mcpServer.connect(transport);
          console.error("MCP server connected successfully to SSE transport");
          
          // Handle client disconnection
          req.on('close', async () => {
            console.error("Client disconnected, closing transport");
            try {
              await transport.close();
            } catch (error) {
              console.error("Error closing transport:", error);
            }
          });
          
        } catch (error) {
          console.error("Failed to connect MCP server to SSE transport:", error);
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Failed to establish SSE connection" }));
        }
        
        return;
      } else if (req.method === "POST") {
        // This should be handled by the SSE transport's handlePostMessage
        // But we need to find the correct transport instance for this session
        console.error("SSE POST request received - this should be handled by transport");
        
        // For now, fallback to direct handling to maintain compatibility
        let body = "";
        req.on("data", chunk => {
          body += chunk.toString();
        });

        req.on("end", async () => {
          try {
            // Parse the MCP request
            const mcpRequest = JSON.parse(body);
            console.error("MCP Request:", mcpRequest);
            
            // Handle the request through the MCP server
            let result;
            if (mcpRequest.method === "tools/list") {
              const tools = await couchdbServer.getTools();
              result = { tools };
            } else if (mcpRequest.method === "tools/call") {
              const { name, arguments: args } = mcpRequest.params;
              result = await couchdbServer.handleToolCall(name, args || {});
            } else if (mcpRequest.method === "resources/list") {
              // Return empty resources list since this server doesn't expose resources
              result = { resources: [] };
            } else if (mcpRequest.method === "resources/templates/list") {
              // Return empty resource templates list since this server doesn't expose resource templates
              result = { resourceTemplates: [] };
            } else if (mcpRequest.method === "initialize") {
              result = {
                protocolVersion: "2024-11-05",
                capabilities: {
                  tools: {},
                  resources: {}
                },
                serverInfo: {
                  name: "couchdb-mcp-server",
                  version: "1.0.0"
                }
              };
            } else if (mcpRequest.method === "prompts/list") {
              // Return empty prompts list since this server doesn't expose prompts
              result = { prompts: [] };
            } else if (mcpRequest.method === "notifications/initialized") {
              // Handle initialization notification - no response needed for notifications
              console.error("Client initialized notification received");
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(); // No response body for notifications
              return;
            } else {
              throw new Error(`Unsupported method: ${mcpRequest.method}`);
            }
            
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
              jsonrpc: "2.0",
              id: mcpRequest.id,
              result
            }));
          } catch (error) {
            console.error("SSE POST error:", error);
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
              jsonrpc: "2.0", 
              id: body ? JSON.parse(body).id : null,
              error: {
                code: -32603,
                message: error instanceof Error ? error.message : "Unknown error"
              }
            }));
          }
        });
        
        return;
      }
    }

    // Direct tool call endpoint (for testing)
    if (url.pathname === "/tools" && req.method === "POST") {
      let body = "";
      req.on("data", chunk => {
        body += chunk.toString();
      });

      req.on("end", async () => {
        try {
          const { tool, arguments: args } = JSON.parse(body);
          
          // Simulate MCP tool call request
          const request = {
            method: "tools/call",
            params: {
              name: tool,
              arguments: args || {}
            }
          };

          // Call the tool directly through our CouchDB server
          const result = await couchdbServer.handleToolCall(tool, args);
          
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(result));
        } catch (error) {
          console.error("Tool call error:", error);
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ 
            error: error instanceof Error ? error.message : "Unknown error" 
          }));
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
          <title>CouchDB MCP Server</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            code { background: #f5f5f5; padding: 2px 4px; border-radius: 3px; }
            pre { background: #f5f5f5; padding: 10px; border-radius: 5px; overflow-x: auto; }
            .endpoint { margin: 20px 0; padding: 10px; border: 1px solid #ddd; border-radius: 5px; }
          </style>
        </head>
        <body>
          <h1>CouchDB Control Plane MCP Server</h1>
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
            <h3>GET /sse</h3>
            <p>Server-Sent Events endpoint for MCP communication</p>
          </div>
          
          <div class="endpoint">
            <h3>POST /tools</h3>
            <p>Direct tool execution endpoint for testing</p>
            <pre>
curl -X POST http://localhost:${config.server.port}/tools \\
  -H "Content-Type: application/json" \\
  -d '{"tool": "list-clusters"}'
            </pre>
          </div>
          
          <h2>Example Tool Calls</h2>
          
          <div class="endpoint">
            <h3>List Clusters</h3>
            <pre>{"tool": "list-clusters"}</pre>
          </div>
          
          <div class="endpoint">
            <h3>Create Database</h3>
            <pre>{"tool": "create-database", "arguments": {"databaseName": "my-db"}}</pre>
          </div>
          
          <div class="endpoint">
            <h3>Create Document</h3>
            <pre>{"tool": "create-document", "arguments": {"databaseName": "my-db", "document": {"name": "test"}}}</pre>
          </div>
          
          <p><strong>Port:</strong> ${config.server.port}</p>
          <p><strong>Transport:</strong> Server-Sent Events (SSE)</p>
        </body>
        </html>
      `);
      return;
    }

    // 404 for all other routes
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  });

  // Start HTTP server
  httpServer.listen(config.server.port, config.server.host, () => {
    console.error(`CouchDB MCP Server is running on http://${config.server.host}:${config.server.port}`);
    console.error(`Available endpoints:`);
    console.error(`  - GET  http://${config.server.host}:${config.server.port}/         (Documentation)`);
    console.error(`  - GET  http://${config.server.host}:${config.server.port}/health   (Health check)`);
    console.error(`  - GET  http://${config.server.host}:${config.server.port}/info     (Server info)`);
    console.error(`  - GET  http://${config.server.host}:${config.server.port}/sse      (SSE transport)`);
    console.error(`  - POST http://${config.server.host}:${config.server.port}/tools    (Direct tool calls)`);
  });

  // Handle graceful shutdown
  let isShuttingDown = false;
  
  const gracefulShutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    
    console.error(`\nReceived ${signal}. Shutting down gracefully...`);
    
    // Close HTTP server and stop accepting new connections
    httpServer.close(async (err) => {
      if (err) {
        console.error("Error closing HTTP server:", err);
      } else {
        console.error("HTTP server closed");
      }
      
      try {
        // Cleanup CouchDB server
        await couchdbServer.cleanup();
        
        // Give any pending operations a chance to complete
        await new Promise(resolve => setTimeout(resolve, 100));
        console.error("Graceful shutdown complete");
        process.exit(0);
      } catch (error) {
        console.error("Error during shutdown:", error);
        process.exit(1);
      }
    });
    
    // Force shutdown after timeout
    setTimeout(() => {
      console.error("Force shutdown due to timeout");
      process.exit(1);
    }, 5000); // 5 second timeout
  };

  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  
  // Handle uncaught exceptions and unhandled rejections
  process.on("uncaughtException", (error) => {
    console.error("Uncaught Exception:", error);
    gracefulShutdown("uncaughtException");
  });
  
  process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);
    gracefulShutdown("unhandledRejection");
  });
}