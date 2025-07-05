import { CallToolResult, TextContent } from "@modelcontextprotocol/sdk/types.js";
import { CouchDBClient } from "../couchdb/client.js";
import { AuditLogger } from "../audit/logger.js";
import { z } from "zod";

export class ReplicationHandlers {
  constructor(
    private couchdbClient: CouchDBClient,
    private _auditLogger: AuditLogger
  ) {}


  async handleCreateReplication(args: any): Promise<CallToolResult> {
    const { replicationDoc } = z.object({
      replicationDoc: z.object({
        _id: z.string(),
        source: z.string(),
        target: z.string(),
        continuous: z.boolean().default(false),
        filter: z.string().optional(),
      }),
    }).parse(args);
    
    await this.couchdbClient.createReplication(replicationDoc);
    
    return {
      content: [
        {
          type: "text",
          text: `Replication ${replicationDoc._id} created successfully`,
        } as TextContent,
      ],
    };
  }

  async handleDeleteReplication(args: any): Promise<CallToolResult> {
    const { replicationId } = z.object({
      replicationId: z.string(),
    }).parse(args);
    
    await this.couchdbClient.deleteReplication(replicationId);
    
    return {
      content: [
        {
          type: "text",
          text: `Replication ${replicationId} deleted successfully`,
        } as TextContent,
      ],
    };
  }
}