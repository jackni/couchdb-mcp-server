import nano from "nano";
import { Config } from "../config.js";

export interface CouchDBCredentials {
  username: string;
  password: string;
}

export interface SecurityDocument {
  admins: {
    names: string[];
    roles: string[];
  };
  members: {
    names: string[];
    roles: string[];
  };
}

export interface ReplicationDocument {
  _id: string;
  source: string;
  target: string;
  continuous?: boolean;
  filter?: string;
  [key: string]: any;
}

export class CouchDBClient {
  private connection: nano.ServerScope;

  constructor(config: Config) {
    this.connection = nano({
      url: config.couchdb.url,
      requestDefaults: {
        auth: {
          username: config.couchdb.adminUsername,
          password: config.couchdb.adminPassword,
        },
      },
    });
  }

  // Cleanup method to close connections
  async cleanup(): Promise<void> {
    try {
      // Nano doesn't expose connection cleanup methods directly,
      // but we can try to destroy the connection
      if (this.connection && typeof (this.connection as any).destroy === 'function') {
        (this.connection as any).destroy();
      }
      console.error("CouchDB client cleanup completed");
    } catch (error) {
      console.error("Error during CouchDB client cleanup:", error);
    }
  }

  // Server Operations
  async getServerInfo(): Promise<any> {
    return await this.connection.info();
  }

  // Database Operations
  async createDatabase(databaseName: string): Promise<void> {
    await this.connection.db.create(databaseName);
  }

  async deleteDatabase(databaseName: string): Promise<void> {
    await this.connection.db.destroy(databaseName);
  }

  async getDatabaseInfo(databaseName: string): Promise<any> {
    const db = this.connection.db.use(databaseName);
    return await db.info();
  }

  async listDatabases(): Promise<string[]> {
    return await this.connection.db.list();
  }

  // Document Operations
  async createDocument(
    databaseName: string,
    document: any,
    documentId?: string
  ): Promise<any> {
    const db = this.connection.db.use(databaseName);
    
    if (documentId) {
      return await db.insert(document, documentId);
    } else {
      return await db.insert(document);
    }
  }

  async getDocument(
    databaseName: string,
    documentId: string
  ): Promise<any> {
    const db = this.connection.db.use(databaseName);
    return await db.get(documentId);
  }

  async updateDocument(
    databaseName: string,
    documentId: string,
    document: any
  ): Promise<any> {
    const db = this.connection.db.use(databaseName);
    
    // Get current document to get revision
    const currentDoc = await db.get(documentId);
    document._rev = currentDoc._rev;
    
    return await db.insert(document, documentId);
  }

  async deleteDocument(
    databaseName: string,
    documentId: string,
    revision: string
  ): Promise<any> {
    const db = this.connection.db.use(databaseName);
    return await db.destroy(documentId, revision);
  }

  async listDocuments(
    databaseName: string,
    options: {
      includeDocs?: boolean;
      limit?: number;
      skip?: number;
    } = {}
  ): Promise<any> {
    const db = this.connection.db.use(databaseName);
    
    const listOptions: any = {};
    
    if (options.includeDocs !== undefined) {
      listOptions.include_docs = options.includeDocs;
    }
    
    if (options.limit !== undefined) {
      listOptions.limit = options.limit;
    }
    
    if (options.skip !== undefined) {
      listOptions.skip = options.skip;
    }
    
    const result = await db.list(listOptions);
    
    // Filter out design documents for cleaner output
    const filteredRows = result.rows.filter(row => !row.id.startsWith('_design/'));
    
    return {
      total_rows: filteredRows.length,
      offset: result.offset || 0,
      rows: filteredRows
    };
  }

  // User Management
  async createUser(
    username: string,
    password: string,
    roles: string[] = []
  ): Promise<void> {
    const usersDb = this.connection.db.use("_users");
    
    const userDoc = {
      _id: `org.couchdb.user:${username}`,
      name: username,
      type: "user",
      password: password,
      roles: roles,
    };
    
    await usersDb.insert(userDoc);
  }

  async deleteUser(username: string): Promise<void> {
    const usersDb = this.connection.db.use("_users");
    
    const userId = `org.couchdb.user:${username}`;
    const userDoc = await usersDb.get(userId);
    await usersDb.destroy(userId, userDoc._rev);
  }

  async createRole(roleName: string): Promise<void> {
    // CouchDB doesn't have explicit role creation - roles are created implicitly
    // when assigned to users or used in security documents
    console.log(`Role ${roleName} will be created implicitly when used`);
  }

  async assignUserToRole(username: string, role: string): Promise<void> {
    const usersDb = this.connection.db.use("_users");
    
    const userId = `org.couchdb.user:${username}`;
    const userDoc = await usersDb.get(userId) as any;
    
    if (!userDoc.roles) {
      userDoc.roles = [];
    }
    
    if (!userDoc.roles.includes(role)) {
      userDoc.roles.push(role);
      await usersDb.insert(userDoc);
    }
  }

  // Security Management
  async setDatabaseSecurity(
    databaseName: string,
    security: SecurityDocument
  ): Promise<void> {
    const db = this.connection.db.use(databaseName);
    
    // Use nano's built-in security method if available, otherwise use direct API call
    if (typeof (db as any).security === 'function') {
      await (db as any).security(security);
    } else {
      // Fallback to direct HTTP request
      await this.connection.request({
        method: 'PUT',
        path: `${databaseName}/_security`,
        body: security,
      });
    }
  }

  async getDatabaseSecurity(databaseName: string): Promise<SecurityDocument> {
    const db = this.connection.db.use(databaseName);
    
    // Use nano's built-in security method if available, otherwise use direct API call
    if (typeof (db as any).security === 'function') {
      return await (db as any).security();
    } else {
      // Fallback to direct HTTP request
      return await this.connection.request({
        method: 'GET',
        path: `${databaseName}/_security`,
      });
    }
  }

  // Replication Management
  async createReplication(replicationDoc: ReplicationDocument): Promise<void> {
    const replicatorDb = this.connection.db.use("_replicator");
    await replicatorDb.insert(replicationDoc);
  }

  async deleteReplication(replicationId: string): Promise<void> {
    const replicatorDb = this.connection.db.use("_replicator");
    
    const replicationDoc = await replicatorDb.get(replicationId);
    await replicatorDb.destroy(replicationId, replicationDoc._rev);
  }

  async getReplication(replicationId: string): Promise<any> {
    const replicatorDb = this.connection.db.use("_replicator");
    return await replicatorDb.get(replicationId);
  }

  async listReplications(): Promise<any[]> {
    const replicatorDb = this.connection.db.use("_replicator");
    const result = await replicatorDb.list({ include_docs: true });
    return result.rows.map(row => row.doc).filter(doc => doc && !doc._id.startsWith('_design/'));
  }

  // Design Document Management
  async deployDesignDocument(
    databaseName: string,
    designName: string,
    designDoc: any
  ): Promise<void> {
    const db = this.connection.db.use(databaseName);
    
    const designId = `_design/${designName}`;
    
    try {
      // Try to get existing design document to preserve revision
      const existingDoc = await db.get(designId);
      designDoc._rev = existingDoc._rev;
    } catch (error) {
      // Design document doesn't exist, that's fine
    }
    
    await db.insert(designDoc, designId);
  }

  async getDesignDocument(
    databaseName: string,
    designName: string
  ): Promise<any> {
    const db = this.connection.db.use(databaseName);
    return await db.get(`_design/${designName}`);
  }

  async deleteDesignDocument(
    databaseName: string,
    designName: string
  ): Promise<void> {
    const db = this.connection.db.use(databaseName);
    
    const designId = `_design/${designName}`;
    const designDoc = await db.get(designId);
    await db.destroy(designId, designDoc._rev);
  }

  // Query Operations
  async queryView(
    databaseName: string,
    designName: string,
    viewName: string,
    options: any = {}
  ): Promise<any> {
    const db = this.connection.db.use(databaseName);
    return await db.view(designName, viewName, options);
  }

  async queryMango(
    databaseName: string,
    selector: any,
    options: any = {}
  ): Promise<any> {
    const db = this.connection.db.use(databaseName);
    
    // Build MangoQuery object according to nano's expected interface
    const query: any = {
      selector,
    };
    
    // Add optional parameters if provided
    if (options.fields) query.fields = options.fields;
    if (options.sort) query.sort = options.sort;
    if (options.limit) query.limit = options.limit;
    if (options.skip) query.skip = options.skip;
    if (options.bookmark) query.bookmark = options.bookmark;
    if (options.use_index) query.use_index = options.use_index;
    if (options.r) query.r = options.r;
    if (options.execution_stats) query.execution_stats = options.execution_stats;
    
    return await db.find(query);
  }

  // Bulk Operations
  async bulkInsert(
    databaseName: string,
    documents: any[]
  ): Promise<any> {
    const db = this.connection.db.use(databaseName);
    return await db.bulk({ docs: documents });
  }

  // Index Management
  async createIndex(
    databaseName: string,
    fields: string[],
    options: {
      name?: string;
      type?: "json" | "text";
      partialFilter?: any;
    } = {}
  ): Promise<any> {
    const db = this.connection.db.use(databaseName);
    
    const indexDef: any = {
      index: {
        fields: fields
      }
    };
    
    if (options.name) {
      indexDef.name = options.name;
    }
    
    if (options.type) {
      indexDef.type = options.type;
    }
    
    if (options.partialFilter) {
      indexDef.index.partial_filter_selector = options.partialFilter;
    }
    
    return await (db as any).createIndex(indexDef);
  }

  async listIndexes(databaseName: string): Promise<any> {
    // Use direct HTTP request since nano doesn't have listIndexes method
    return await this.connection.request({
      method: 'GET',
      path: `${databaseName}/_index`,
    });
  }

  async deleteIndex(databaseName: string, designDoc: string, name: string): Promise<any> {
    // Use direct HTTP request since nano doesn't have deleteIndex method
    return await this.connection.request({
      method: 'DELETE',
      path: `${databaseName}/_index/${designDoc}/json/${name}`,
    });
  }


  // Utility Methods
  async compact(databaseName: string): Promise<void> {
    const db = this.connection.db.use(databaseName);
    await db.compact();
  }

  async compactDesign(
    databaseName: string,
    designName: string
  ): Promise<void> {
    // Use the server-level compact method which supports design document compaction
    await this.connection.db.compact(databaseName, designName);
  }
}