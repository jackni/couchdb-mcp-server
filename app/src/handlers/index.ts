import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { CouchDBClient } from "../couchdb/client.js";
import { AuditLogger } from "../audit/logger.js";

import { DatabaseHandlers } from "./database.js";
import { DocumentHandlers } from "./document.js";
import { SecurityHandlers } from "./security.js";
import { ReplicationHandlers } from "./replication.js";
import { DesignHandlers } from "./design.js";
import { QueryHandlers } from "./query.js";

export class ToolHandlers {
  private databaseHandlers: DatabaseHandlers;
  private documentHandlers: DocumentHandlers;
  private securityHandlers: SecurityHandlers;
  private replicationHandlers: ReplicationHandlers;
  private designHandlers: DesignHandlers;
  private queryHandlers: QueryHandlers;

  constructor(
    couchdbClient: CouchDBClient,
    auditLogger: AuditLogger
  ) {
    this.databaseHandlers = new DatabaseHandlers(couchdbClient, auditLogger);
    this.documentHandlers = new DocumentHandlers(couchdbClient, auditLogger);
    this.securityHandlers = new SecurityHandlers(couchdbClient, auditLogger);
    this.replicationHandlers = new ReplicationHandlers(couchdbClient, auditLogger);
    this.designHandlers = new DesignHandlers(couchdbClient, auditLogger);
    this.queryHandlers = new QueryHandlers(couchdbClient, auditLogger);
  }

  async handleToolCall(name: string, args: any): Promise<CallToolResult> {
    switch (name) {
      // Database Operations
      case "create-database":
        return await this.databaseHandlers.handleCreateDatabase(args);
      case "delete-database":
        return await this.databaseHandlers.handleDeleteDatabase(args);
      case "get-database-info":
        return await this.databaseHandlers.handleGetDatabaseInfo(args);
      case "list-databases":
        return await this.databaseHandlers.handleListDatabases(args);
      
      // Document Operations
      case "create-document":
        return await this.documentHandlers.handleCreateDocument(args);
      case "get-document":
        return await this.documentHandlers.handleGetDocument(args);
      case "update-document":
        return await this.documentHandlers.handleUpdateDocument(args);
      case "delete-document":
        return await this.documentHandlers.handleDeleteDocument(args);
      case "list-documents":
        return await this.documentHandlers.handleListDocuments(args);
      
      // User & Security Management
      case "create-user":
        return await this.securityHandlers.handleCreateUser(args);
      case "delete-user":
        return await this.securityHandlers.handleDeleteUser(args);
      case "set-database-security":
        return await this.securityHandlers.handleSetDatabaseSecurity(args);
      
      // Replication
      case "create-replication":
        return await this.replicationHandlers.handleCreateReplication(args);
      case "delete-replication":
        return await this.replicationHandlers.handleDeleteReplication(args);
      
      // Design Documents
      case "deploy-design-document":
        return await this.designHandlers.handleDeployDesignDocument(args);
      case "get-design-document":
        return await this.designHandlers.handleGetDesignDocument(args);
      
      // Query Operations
      case "create-database-index":
        return await this.queryHandlers.handleCreateIndex(args);
      case "list-database-indexes":
        return await this.queryHandlers.handleListIndexes(args);
      case "delete-database-index":
        return await this.queryHandlers.handleDeleteIndex(args);
      case "mango-query-database":
        return await this.queryHandlers.handleQueryMango(args);
      
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }
}