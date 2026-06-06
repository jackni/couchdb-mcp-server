import { Tool } from "@modelcontextprotocol/sdk/types.js";

export function getDatabaseTools(): Tool[] {
  return [
    {
      name: "create-database",
      description: "Create a new database",
      inputSchema: {
        type: "object",
        properties: {
          databaseName: { type: "string", description: "Name of the database to create" },
        },
        required: ["databaseName"],
      },
    },
    {
      name: "delete-database",
      description:
        "Permanently delete a database and all its documents. Destructive — confirm with the user before calling.",
      inputSchema: {
        type: "object",
        properties: {
          databaseName: { type: "string", description: "Name of the database to delete" },
        },
        required: ["databaseName"],
      },
    },
    {
      name: "get-database-info",
      description:
        "Get metadata for one database: doc count, update sequence, disk size, and purge seq. Use after list-databases to inspect a specific DB. Read-only.",
      inputSchema: {
        type: "object",
        properties: {
          databaseName: { type: "string", description: "Name of the database" },
        },
        required: ["databaseName"],
      },
    },
    {
      name: "list-databases",
      description:
        "List all database names on the CouchDB instance. Use this first to discover databases. Returns system DBs (_users, _replicator, _global_changes) and user DBs. Read-only.",
      inputSchema: {
        type: "object",
        properties: {
        },
      },
    },
  ];
}

export function getDocumentTools(): Tool[] {
  return [
    {
      name: "create-document",
      description: "Create a document in a database",
      inputSchema: {
        type: "object",
        properties: {
          databaseName: { type: "string", description: "Database name" },
          document: { type: "object", description: "Document to create" },
          documentId: { type: "string", description: "Optional document ID" },
        },
        required: ["databaseName", "document"],
      },
    },
    {
      name: "get-document",
      description: "Get a document from a database",
      inputSchema: {
        type: "object",
        properties: {
          databaseName: { type: "string", description: "Database name" },
          documentId: { type: "string", description: "Document ID" },
        },
        required: ["databaseName", "documentId"],
      },
    },
    {
      name: "update-document",
      description:
        "Update a document. Must include current _rev in the document body or the update will fail with a conflict.",
      inputSchema: {
        type: "object",
        properties: {
          databaseName: { type: "string", description: "Database name" },
          documentId: { type: "string", description: "Document ID" },
          document: { type: "object", description: "Full document body including _id and _rev" },
        },
        required: ["databaseName", "documentId", "document"],
      },
    },
    {
      name: "delete-document",
      description:
        "Delete a document by ID. Requires current _rev. Destructive — confirm with the user before calling.",
      inputSchema: {
        type: "object",
        properties: {
          databaseName: { type: "string", description: "Database name" },
          documentId: { type: "string", description: "Document ID" },
          revision: {
            type: "string",
            description: "Current document revision (_rev). Required to avoid deleting the wrong version.",
          },
        },
        required: ["databaseName", "documentId", "revision"],
      },
    },
    {
      name: "list-documents",
      description:
        "List document IDs (and optionally full docs) from a database. Use only for small DBs or with limit. For filtered search, prefer mango-query-database.",
      inputSchema: {
        type: "object",
        properties: {
          databaseName: { 
            type: "string", 
            description: "Database name",
            minLength: 1
          },
          includeDocs: { 
            type: "boolean", 
            description: "Optional: include full document content (default: false)" 
          },
          limit: { 
            type: "number", 
            description: "Optional: maximum number of documents to return",
            minimum: 1,
            maximum: 10000
          },
          skip: { 
            type: "number", 
            description: "Optional: number of documents to skip",
            minimum: 0
          },
        },
        required: ["databaseName"],
      },
    },
  ];
}

export function getSecurityTools(): Tool[] {
  return [
    {
      name: "create-user",
      description: "Create a new user",
      inputSchema: {
        type: "object",
        properties: {
          username: { type: "string", description: "Username" },
          password: { type: "string", description: "Password" },
          roles: { type: "array", items: { type: "string" }, description: "User roles" },
        },
        required: ["username", "password"],
      },
    },
    {
      name: "delete-user",
      description:
        "Remove a CouchDB user from _users. Destructive — confirm with the user before calling.",
      inputSchema: {
        type: "object",
        properties: {
          username: { type: "string", description: "Username to delete" },
        },
        required: ["username"],
      },
    },
    {
      name: "set-database-security",
      description:
        "Update admin/member access for a database. Changes who can read/write. Confirm target DB and permissions before calling.",
      inputSchema: {
        type: "object",
        properties: {
          databaseName: { type: "string", description: "Database name" },
          security: {
            type: "object",
            properties: {
              admins: {
                type: "object",
                properties: {
                  names: { type: "array", items: { type: "string" } },
                  roles: { type: "array", items: { type: "string" } },
                },
              },
              members: {
                type: "object",
                properties: {
                  names: { type: "array", items: { type: "string" } },
                  roles: { type: "array", items: { type: "string" } },
                },
              },
            },
          },
        },
        required: ["databaseName", "security"],
      },
    },
  ];
}

export function getReplicationTools(): Tool[] {
  return [
    {
      name: "create-replication",
      description:
        "Create a replication job in _replicator. Requires source, target, and replication ID. Use continuous: true for ongoing sync.",
      inputSchema: {
        type: "object",
        properties: {
          replicationDoc: {
            type: "object",
            properties: {
              _id: { type: "string", description: "Replication ID" },
              source: { type: "string", description: "Source database" },
              target: { type: "string", description: "Target database" },
              continuous: { type: "boolean", description: "Continuous replication" },
              filter: { type: "string", description: "Filter function" },
            },
            required: ["_id", "source", "target"],
          },
        },
        required: ["replicationDoc"],
      },
    },
    {
      name: "delete-replication",
      description: "Delete a replication",
      inputSchema: {
        type: "object",
        properties: {
          replicationId: { type: "string", description: "Replication ID" },
        },
        required: ["replicationId"],
      },
    },
  ];
}

export function getDesignTools(): Tool[] {
  return [
    {
      name: "deploy-design-document",
      description: "Deploy a design document to a database",
      inputSchema: {
        type: "object",
        properties: {
          databaseName: { type: "string", description: "Database name" },
          designName: {
            type: "string",
            description: "Design doc name without _design/ prefix (e.g. 'myview')",
          },
          designDoc: { type: "object", description: "Design document content" },
        },
        required: ["databaseName", "designName", "designDoc"],
      },
    },
    {
      name: "get-design-document",
      description: "Get a design document from a database",
      inputSchema: {
        type: "object",
        properties: {
          databaseName: { type: "string", description: "Database name" },
          designName: {
            type: "string",
            description: "Design doc name without _design/ prefix (e.g. 'myview')",
          },
        },
        required: ["databaseName", "designName"],
      },
    },
  ];
}

export function getQueryTools(): Tool[] {
  return [
    {
      name: "create-database-index",
      description: "Create a Mango index for efficient querying",
      inputSchema: {
        type: "object",
        properties: {
          databaseName: { type: "string", description: "Database name" },
          fields: { type: "array", items: { type: "string" }, description: "Fields to index (e.g., ['name', 'age'])" },
          name: { type: "string", description: "Optional: custom index name" },
          type: { type: "string", enum: ["json", "text"], description: "Optional: index type (default: json)" },
          partialFilter: { type: "object", description: "Optional: partial filter selector" },
        },
        required: ["databaseName", "fields"],
      },
    },
    {
      name: "list-database-indexes",
      description: "List all indexes in a database",
      inputSchema: {
        type: "object",
        properties: {
          databaseName: { type: "string", description: "Database name" },
        },
        required: ["databaseName"],
      },
    },
    {
      name: "delete-database-index",
      description: "Delete a Mango index",
      inputSchema: {
        type: "object",
        properties: {
          databaseName: { type: "string", description: "Database name" },
          designDoc: { type: "string", description: "Design document ID (e.g., '_design/a5f4711fc9448864a13c81dc71e660b524d7410c')" },
          name: { type: "string", description: "Index name" },
        },
        required: ["databaseName", "designDoc", "name"],
      },
    },
    {
      name: "mango-query-database",
      description:
        "Search documents with Mango selectors. Preferred for filtered/paginated reads. Create an index first if queries are slow. Read-only.",
      inputSchema: {
        type: "object",
        properties: {
          databaseName: { 
            type: "string", 
            description: "Database name" 
          },
          selector: { 
            type: "object", 
            description: "MongoDB-style selector object (e.g., {\"name\": \"John\", \"age\": {\"$gt\": 25}})" 
          },
          fields: { 
            type: "array", 
            items: { type: "string" }, 
            description: "Optional: fields to return (e.g., [\"name\", \"age\", \"email\"])" 
          },
          sort: { 
            type: "array", 
            items: { 
              type: "object" 
            }, 
            description: "Optional: sort specification (e.g., [{\"name\": \"asc\"}, {\"age\": \"desc\"}])" 
          },
          limit: { 
            type: "number", 
            description: "Optional: maximum number of documents to return",
            minimum: 1,
            maximum: 10000
          },
          skip: { 
            type: "number", 
            description: "Optional: number of documents to skip",
            minimum: 0
          },
          bookmark: { 
            type: "string", 
            description: "Optional: bookmark for pagination" 
          },
          use_index: { 
            type: "string", 
            description: "Optional: specific index to use for the query" 
          },
          execution_stats: { 
            type: "boolean", 
            description: "Optional: include execution statistics in response" 
          }
        },
        required: ["databaseName", "selector"],
      },
    },
  ];
}

export function getAllTools(): Tool[] {
  return [
    ...getDatabaseTools(),
    ...getDocumentTools(),
    ...getSecurityTools(),
    ...getReplicationTools(),
    ...getDesignTools(),
    ...getQueryTools(),
  ];
}