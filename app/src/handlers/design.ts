import { CallToolResult, TextContent } from "@modelcontextprotocol/sdk/types.js";
import { CouchDBClient } from "../couchdb/client.js";
import { AuditLogger } from "../audit/logger.js";
import { z } from "zod";

export class DesignHandlers {
  constructor(
    private couchdbClient: CouchDBClient,
    private _auditLogger: AuditLogger
  ) {}


  async handleDeployDesignDocument(args: any): Promise<CallToolResult> {
    const { databaseName, designName, designDoc } = z.object({
      databaseName: z.string(),
      designName: z.string(),
      designDoc: z.record(z.any()),
    }).parse(args);
    
    await this.couchdbClient.deployDesignDocument(databaseName, designName, designDoc);
    
    return {
      content: [
        {
          type: "text",
          text: `Design document ${designName} deployed successfully to database ${databaseName}`,
        } as TextContent,
      ],
    };
  }

  async handleGetDesignDocument(args: any): Promise<CallToolResult> {
    const { databaseName, designName } = z.object({
      databaseName: z.string(),
      designName: z.string(),
    }).parse(args);
    
    const designDoc = await this.couchdbClient.getDesignDocument(databaseName, designName);
    
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(designDoc, null, 2),
        } as TextContent,
      ],
    };
  }
}