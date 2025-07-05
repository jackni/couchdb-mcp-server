import { CallToolResult, TextContent } from "@modelcontextprotocol/sdk/types.js";
import { CouchDBClient } from "../couchdb/client.js";
import { AuditLogger } from "../audit/logger.js";
import { z } from "zod";

export class DatabaseHandlers {
  constructor(
    private couchdbClient: CouchDBClient,
    private _auditLogger: AuditLogger
  ) {}

  async handleCreateDatabase(args: any): Promise<CallToolResult> {
    const { databaseName } = z.object({
      databaseName: z.string(),
    }).parse(args);
    
    await this.couchdbClient.createDatabase(databaseName);
    
    return {
      content: [
        {
          type: "text",
          text: `Database ${databaseName} created successfully`,
        } as TextContent,
      ],
    };
  }

  async handleDeleteDatabase(args: any): Promise<CallToolResult> {
    const { databaseName } = z.object({
      databaseName: z.string(),
    }).parse(args);
    
    await this.couchdbClient.deleteDatabase(databaseName);
    
    return {
      content: [
        {
          type: "text",
          text: `Database ${databaseName} deleted successfully`,
        } as TextContent,
      ],
    };
  }

  async handleGetDatabaseInfo(args: any): Promise<CallToolResult> {
    const { databaseName } = z.object({
      databaseName: z.string(),
    }).parse(args);
    
    const info = await this.couchdbClient.getDatabaseInfo(databaseName);
    
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(info, null, 2),
        } as TextContent,
      ],
    };
  }

  async handleListDatabases(args: any): Promise<CallToolResult> {
    const databases = await this.couchdbClient.listDatabases();
    
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(databases, null, 2),
        } as TextContent,
      ],
    };
  }
}