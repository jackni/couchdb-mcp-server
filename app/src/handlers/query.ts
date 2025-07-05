import { CallToolResult, TextContent } from "@modelcontextprotocol/sdk/types.js";
import { CouchDBClient } from "../couchdb/client.js";
import { AuditLogger } from "../audit/logger.js";
import { z } from "zod";

export class QueryHandlers {
  constructor(
    private couchdbClient: CouchDBClient,
    private _auditLogger: AuditLogger
  ) {}


  async handleCreateIndex(args: any): Promise<CallToolResult> {
    const { databaseName, fields, name, type, partialFilter } = z.object({
      databaseName: z.string(),
      fields: z.array(z.string()),
      name: z.string().optional(),
      type: z.enum(["json", "text"]).optional(),
      partialFilter: z.object({}).passthrough().optional(),
    }).parse(args);
    
    const options: any = {};
    if (name) options.name = name;
    if (type) options.type = type;
    if (partialFilter) options.partialFilter = partialFilter;
    
    const result = await this.couchdbClient.createIndex(databaseName, fields, options);
    
    return {
      content: [
        {
          type: "text",
          text: `Index created successfully: ${JSON.stringify(result, null, 2)}`,
        } as TextContent,
      ],
    };
  }

  async handleListIndexes(args: any): Promise<CallToolResult> {
    const { databaseName } = z.object({
      databaseName: z.string(),
    }).parse(args);
    
    const result = await this.couchdbClient.listIndexes(databaseName);
    
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        } as TextContent,
      ],
    };
  }

  async handleDeleteIndex(args: any): Promise<CallToolResult> {
    const { databaseName, designDoc, name } = z.object({
      databaseName: z.string(),
      designDoc: z.string(),
      name: z.string(),
    }).parse(args);
    
    const result = await this.couchdbClient.deleteIndex(databaseName, designDoc, name);
    
    return {
      content: [
        {
          type: "text",
          text: `Index deleted successfully: ${JSON.stringify(result, null, 2)}`,
        } as TextContent,
      ],
    };
  }

  async handleQueryMango(args: any): Promise<CallToolResult> {
    const { 
      databaseName, 
      selector, 
      fields, 
      sort, 
      limit, 
      skip, 
      bookmark, 
      use_index, 
      execution_stats 
    } = z.object({
      databaseName: z.string(),
      selector: z.object({}).passthrough(),
      fields: z.array(z.string()).optional(),
      sort: z.array(z.object({}).passthrough()).optional(),
      limit: z.number().min(1).max(10000).optional(),
      skip: z.number().min(0).optional(),
      bookmark: z.string().optional(),
      use_index: z.string().optional(),
      execution_stats: z.boolean().optional(),
    }).parse(args);
    
    const options: any = {};
    if (fields) options.fields = fields;
    if (sort) options.sort = sort;
    if (limit) options.limit = limit;
    if (skip) options.skip = skip;
    if (bookmark) options.bookmark = bookmark;
    if (use_index) options.use_index = use_index;
    if (execution_stats) options.execution_stats = execution_stats;
    
    const result = await this.couchdbClient.queryMango(databaseName, selector, options);
    
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