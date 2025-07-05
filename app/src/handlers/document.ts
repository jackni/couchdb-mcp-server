import { CallToolResult, TextContent } from "@modelcontextprotocol/sdk/types.js";
import { CouchDBClient } from "../couchdb/client.js";
import { AuditLogger } from "../audit/logger.js";
import { z } from "zod";

export class DocumentHandlers {
  constructor(
    private couchdbClient: CouchDBClient,
    private _auditLogger: AuditLogger
  ) {}


  async handleCreateDocument(args: any): Promise<CallToolResult> {
    const { databaseName, document, documentId } = z.object({
      databaseName: z.string(),
      document: z.record(z.any()),
      documentId: z.string().optional(),
    }).parse(args);
    
    const result = await this.couchdbClient.createDocument(databaseName, document, documentId);
    
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        } as TextContent,
      ],
    };
  }

  async handleGetDocument(args: any): Promise<CallToolResult> {
    const { databaseName, documentId } = z.object({
      databaseName: z.string(),
      documentId: z.string(),
    }).parse(args);
    
    const document = await this.couchdbClient.getDocument(databaseName, documentId);
    
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(document, null, 2),
        } as TextContent,
      ],
    };
  }

  async handleUpdateDocument(args: any): Promise<CallToolResult> {
    const { databaseName, documentId, document } = z.object({
      databaseName: z.string(),
      documentId: z.string(),
      document: z.record(z.any()),
    }).parse(args);
    
    const result = await this.couchdbClient.updateDocument(databaseName, documentId, document);
    
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        } as TextContent,
      ],
    };
  }

  async handleDeleteDocument(args: any): Promise<CallToolResult> {
    const { databaseName, documentId, revision } = z.object({
      databaseName: z.string(),
      documentId: z.string(),
      revision: z.string(),
    }).parse(args);
    
    const result = await this.couchdbClient.deleteDocument(databaseName, documentId, revision);
    
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        } as TextContent,
      ],
    };
  }

  async handleListDocuments(args: any): Promise<CallToolResult> {
    const { databaseName, includeDocs, limit, skip } = z.object({
      databaseName: z.string(),
      includeDocs: z.boolean().optional(),
      limit: z.number().optional(),
      skip: z.number().optional(),
    }).parse(args);
    
    const options: any = {};
    if (includeDocs !== undefined) options.includeDocs = includeDocs;
    if (limit !== undefined) options.limit = limit;
    if (skip !== undefined) options.skip = skip;
    
    const result = await this.couchdbClient.listDocuments(databaseName, options);
    
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        } as TextContent,
      ],
    };
  }
}