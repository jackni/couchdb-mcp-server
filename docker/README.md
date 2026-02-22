# CouchDB Control Plane MCP Server

A Model Context Protocol (MCP) server that provides comprehensive CouchDB management capabilities. This server offers both high-level workflows and low-level operations for managing CouchDB databases, documents, users, security, replications, and design documents.

## Features

### Core Operations
- **Database Operations**: Create, delete, list, and get database information
- **Document Operations**: Full CRUD operations
- **User & Security Management**: User creation, role management, database security
- **Replication Management**: Create and manage database replications
- **Design Document Management**: Deploy and manage views, indexes, and filters
- **Query Operations**: Support for views, Mango queries, and index management

### Advanced Features
- **Two-Tier Security**: Admin credentials + generated per-resource credentials
- **Comprehensive Audit Logging**: Full audit trail of all operations
- **SSE Transport Support**: Server-Sent Events for real-time communication
- **Configurable**: Environment-based configuration with validation



### Configuration

### Running the Server

**With HTTP/SSE transport:**

## Transport selection (`MCP_TRANSPORT`)

The image supports three transports. Set the `MCP_TRANSPORT` environment variable (default: `sse`):

| Value | Description |
|-------|-------------|
| `stdio` | STDIO transport (for MCP clients that run the container and use stdin/stdout) |
| `sse` | SSE transport; single `/sse` endpoint (GET for stream, POST for messages) |
| `streamable-http` | Streamable HTTP transport; single `/mcp` endpoint (GET for SSE, POST for JSON-RPC) |

Example with Streamable HTTP:

``` yml
environment:
  MCP_TRANSPORT: "streamable-http"
```

## Example Setup
``` yml
services:
  couchdb-mcp:
    image: "deviljackni/couchdb-mcp-server:latest"
    container_name: "couchdb-mcp"
    environment:
      MCP_TRANSPORT: "streamable-http"   # or stdio | sse
    volumes: 
     - ./config.json/:/app/config.json 
    ports:
      - 3006:3008
```

Content of config.json
``` json
{
  "couchdb": {
    "url": "https://your-couchdb-url",
    "adminUsername": "your-admin-username",
    "adminPassword": "your-admin-password"
  },
  "server": {
    "port": 3008,
    "host": "0.0.0.0",
    "logLevel": "info"
  },
  "security": {
    "credentialPrefix": "U-",
    "passwordLength": 32,
    "rolePrefix": "role-"
  }
}
```

Edit `.env` with your CouchDB connection details:

```env
COUCHDB_URL=http://localhost:5984
COUCHDB_ADMIN_USERNAME=admin
COUCHDB_ADMIN_PASSWORD=password
```

- `GET /` - API documentation and usage examples
- `GET /health` - Health check endpoint  
- `GET /info` - Server info and available tools
- `GET /sse` - Server-Sent Events endpoint for MCP protocol
- `POST /tools` - Direct tool execution for testing

## Available Tools

### Database Operations
- `create-database`: Create a new database
- `delete-database`: Delete a database
- `get-database-info`: Get database information
- `list-databases`: List all databases on a cluster

### Document Operations
- `create-document`: Create a document
- `get-document`: Retrieve a document
- `update-document`: Update a document
- `delete-document`: Delete a document

### User & Security Management
- `create-user`: Create a new user
- `delete-user`: Delete a user
- `set-database-security`: Configure database access permissions

### Replication Management
- `create-replication`: Set up database replication
- `delete-replication`: Remove a replication

### Design Document Management
- `deploy-design-document`: Deploy views, filters, and indexes
- `get-design-document`: Retrieve design documents

### Query Operations
- `mango-query-database`: Query documents using MongoDB-style Mango query syntax
- `create-database-index`: Create a Mango index for efficient querying
- `list-database-indexes`: List all indexes in a database
- `delete-database-index`: Delete a Mango index


### HTTP Tool Testing (SSE mode)
```bash
# Create a database
curl -X POST http://localhost:3008/tools \
  -H "Content-Type: application/json" \
  -d '{"tool": "create-database", "arguments": {"databaseName": "my-app-db"}}'

# List all databases
curl -X POST http://localhost:3008/tools \
  -H "Content-Type: application/json" \
  -d '{"tool": "list-databases"}'

# Get server info
curl http://localhost:3008/info
```

### MCP Tool Schema
```json
{
  "tool": "create-database",
  "arguments": {
    "databaseName": "my-app-db"
  }
}
```

### Setting Up Replication
```json
{
  "tool": "create-replication",
  "arguments": {
    "replicationDoc": {
      "_id": "my-replication",
      "source": "source-db",
      "target": "target-db",
      "continuous": true
    }
  }
}
```

### Creating a User with Database Access
```json
{
  "tool": "create-user",
  "arguments": {
    "username": "appuser",
    "password": "secure-password",
    "roles": ["app-role"]
  }
}
```

```json
{
  "tool": "set-database-security",
  "arguments": {
    "databaseName": "my-app-db",
    "security": {
      "members": {
        "roles": ["app-role"]
      }
    }
  }
}
```

### Querying Documents
```json
{
  "tool": "mango-query-database",
  "arguments": {
    "databaseName": "my-app-db",
    "selector": {
      "name": "John",
      "age": {"$gt": 25}
    },
    "limit": 10
  }
}
```

### Index Management Examples
```json
{
  "tool": "create-database-index",
  "arguments": {
    "databaseName": "my-app-db",
    "fields": ["name", "age"]
  }
}

{
  "tool": "list-database-indexes",
  "arguments": {
    "databaseName": "my-app-db"
  }
}

{
  "tool": "delete-database-index",
  "arguments": {
    "databaseName": "my-app-db",
    "designDoc": "_design/my-index-design",
    "name": "my-index"
  }
}
```
## License

MIT