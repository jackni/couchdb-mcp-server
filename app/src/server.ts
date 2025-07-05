import { Tool, CallToolResult, TextContent } from "@modelcontextprotocol/sdk/types.js";
import { Config } from "./config.js";
import { CouchDBClient } from "./couchdb/client.js";
import { CredentialManager } from "./security/credentials.js";
import { AuditLogger } from "./audit/logger.js";
import { getAllTools } from "./tools/definitions.js";
import { ToolHandlers } from "./handlers/index.js";

export class CouchDBMCPServer {
  private couchdbClient: CouchDBClient;
  private _credentialManager: CredentialManager;
  private auditLogger: AuditLogger;
  private toolHandlers: ToolHandlers;

  constructor(config: Config) {
    this.couchdbClient = new CouchDBClient(config);
    this._credentialManager = new CredentialManager(config.security);
    this.auditLogger = new AuditLogger({ maxEvents: 10000, logLevel: config.server.logLevel });
    this.toolHandlers = new ToolHandlers(this.couchdbClient, this.auditLogger);
  }

  async initialize(): Promise<void> {
    console.error("Initializing CouchDB MCP Server...");
    
    // Test connection to CouchDB
    try {
      await this.couchdbClient.getServerInfo();
      console.error("Successfully connected to CouchDB");
    } catch (error) {
      console.error("Failed to connect to CouchDB:", error);
      throw error;
    }
    
    console.error("CouchDB MCP Server initialized successfully!");
  }

  async getTools(): Promise<Tool[]> {
    return getAllTools();
  }

  async handleToolCall(name: string, args: any): Promise<CallToolResult> {
    try {
      this.auditLogger.logOperation(name, args);
      return await this.toolHandlers.handleToolCall(name, args);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.auditLogger.logError(name, args, errorMessage);
      
      return {
        content: [
          {
            type: "text",
            text: `Error executing ${name}: ${errorMessage}`,
          } as TextContent,
        ],
        isError: true,
      };
    }
  }

  async cleanup(): Promise<void> {
    console.error("Cleaning up CouchDB MCP Server...");
    try {
      await this.couchdbClient.cleanup();
      console.error("CouchDB MCP Server cleanup completed");
    } catch (error) {
      console.error("Error during CouchDB MCP Server cleanup:", error);
    }
  }
}