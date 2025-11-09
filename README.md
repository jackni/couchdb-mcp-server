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

## Quick Start

### Installation

```bash
cd app
npm install
npm run build
```

### Configuration

Copy the example environment file and configure your CouchDB settings:

```bash
cd app
cp .env.example .env
```

Edit `.env` with your CouchDB connection details:

```env
COUCHDB_URL=http://localhost:5984
COUCHDB_ADMIN_USERNAME=admin
COUCHDB_ADMIN_PASSWORD=password
```

### Running the Server

**With STDIO transport (default):**
```bash
cd app
npm run dev
# Communicates via stdin/stdout for MCP clients
```

**With HTTP/SSE transport:**
```bash
cd app
npm run dev -- --sse
# Starts HTTP server on port 3000 (configurable via PORT env var)
```

**Production:**
```bash
cd app
npm start -- --sse
```

### HTTP Endpoints (SSE Mode)

When running with `--sse`, the server provides these HTTP endpoints:

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
- `query-documents`: Query documents using MongoDB-style Mango query syntax
- `query-view`: Query a CouchDB view (MapReduce)
- `create-index`: Create a Mango index for efficient querying
- `list-indexes`: List all indexes in a database
- `delete-index`: Delete a Mango index

## Example Usage

### HTTP Tool Testing (SSE mode)
```bash
# Create a database
curl -X POST http://localhost:3000/tools \
  -H "Content-Type: application/json" \
  -d '{"tool": "create-database", "arguments": {"databaseName": "my-app-db"}}'

# List all databases
curl -X POST http://localhost:3000/tools \
  -H "Content-Type: application/json" \
  -d '{"tool": "list-databases"}'

# Get server info
curl http://localhost:3000/info
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
  "tool": "query-documents",
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

## Development

### Building
```bash
cd app
npm run build
```

### Type Checking
```bash
cd app
npm run typecheck
```

### Linting
```bash
cd app
npm run lint
```

## Architecture

The server is built with a modular architecture:

- **Server**: Main MCP server handling tool calls
- **CouchDB Client**: Low-level CouchDB operations using nano
- **Tool Handlers**: Modular handlers for different operation categories
- **Credential Manager**: Security credential generation and management
- **Audit Logger**: Comprehensive operation logging and metrics

## Security

- Admin credentials are securely stored and used only by the MCP server
- Generated credentials follow configurable naming conventions
- All operations are logged with sensitive data redacted
- Database security is enforced through CouchDB's built-in role system

## Extensibility

The generic foundation makes it easy to add domain-specific extensions:

- Custom workflow endpoints
- Business-specific validation
- Integration with external systems
- Custom audit requirements

## License

MIT