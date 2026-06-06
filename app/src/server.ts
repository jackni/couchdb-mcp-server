import {
  CallToolResult,
  GetPromptResult,
  Prompt,
  TextContent,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { Config } from "./config.js";
import { CouchDBClient } from "./couchdb/client.js";
import { CredentialManager } from "./security/credentials.js";
import { AuditLogger } from "./audit/logger.js";
import { getAllPrompts, getPrompt } from "./prompts/definitions.js";
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

  private isStdioTransport(): boolean {
    return (
      process.env.MCP_TRANSPORT === "stdio" ||
      (!process.argv.includes("--sse") &&
        !process.argv.includes("--streamable-http") &&
        !process.argv.includes("--http-stream"))
    );
  }

  async initialize(): Promise<void> {
    if (!this.isStdioTransport()) {
      console.info("Initializing CouchDB MCP Server...");
    }

    // Test connection to CouchDB
    try {
      await this.couchdbClient.getServerInfo();
      if (!this.isStdioTransport()) {
        console.info("Successfully connected to CouchDB");
      }
    } catch (error) {
      if (!this.isStdioTransport()) {
        console.error("Failed to connect to CouchDB:", error);
      }
      throw error;
    }

    if (!this.isStdioTransport()) {
      console.info("CouchDB MCP Server initialized successfully!");
    }
  }

  async getTools(): Promise<Tool[]> {
    return getAllTools();
  }

  async getPrompts(): Promise<Prompt[]> {
    return getAllPrompts();
  }

  async resolvePrompt(name: string, args: Record<string, string> = {}): Promise<GetPromptResult> {
    return getPrompt(name, args);
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
    if (!this.isStdioTransport()) {
      console.info("Cleaning up CouchDB MCP Server...");
    }
    try {
      await this.couchdbClient.cleanup();
      if (!this.isStdioTransport()) {
        console.info("CouchDB MCP Server cleanup completed");
      }
    } catch (error) {
      if (!this.isStdioTransport()) {
        console.error("Error during CouchDB MCP Server cleanup:", error);
      }
    }
  }
}