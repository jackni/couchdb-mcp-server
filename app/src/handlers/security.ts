import { CallToolResult, TextContent } from "@modelcontextprotocol/sdk/types.js";
import { CouchDBClient } from "../couchdb/client.js";
import { AuditLogger } from "../audit/logger.js";
import { z } from "zod";

export class SecurityHandlers {
  constructor(
    private couchdbClient: CouchDBClient,
    private _auditLogger: AuditLogger
  ) {}


  async handleCreateUser(args: any): Promise<CallToolResult> {
    const { username, password, roles } = z.object({
      username: z.string(),
      password: z.string(),
      roles: z.array(z.string()).default([]),
    }).parse(args);
    
    await this.couchdbClient.createUser(username, password, roles);
    
    return {
      content: [
        {
          type: "text",
          text: `User ${username} created successfully`,
        } as TextContent,
      ],
    };
  }

  async handleDeleteUser(args: any): Promise<CallToolResult> {
    const { username } = z.object({
      username: z.string(),
    }).parse(args);
    
    await this.couchdbClient.deleteUser(username);
    
    return {
      content: [
        {
          type: "text",
          text: `User ${username} deleted successfully`,
        } as TextContent,
      ],
    };
  }

  async handleSetDatabaseSecurity(args: any): Promise<CallToolResult> {
    const { databaseName, security } = z.object({
      databaseName: z.string(),
      security: z.object({
        admins: z.object({
          names: z.array(z.string()).default([]),
          roles: z.array(z.string()).default([]),
        }).default({ names: [], roles: [] }),
        members: z.object({
          names: z.array(z.string()).default([]),
          roles: z.array(z.string()).default([]),
        }).default({ names: [], roles: [] }),
      }),
    }).parse(args);
    
    await this.couchdbClient.setDatabaseSecurity(databaseName, security);
    
    return {
      content: [
        {
          type: "text",
          text: `Security settings updated for database ${databaseName}`,
        } as TextContent,
      ],
    };
  }
}