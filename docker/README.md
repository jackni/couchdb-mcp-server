# CouchDB Control Plane MCP Server — Docker

Run the CouchDB MCP server in a container. The image supports **STDIO**, **SSE**, and **Streamable HTTP** transports and is configured via a mounted `config.json` (and optional environment variables).

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
- **Multiple Transports**: STDIO, SSE, and Streamable HTTP
- **Configurable**: `config.json` with environment variable overrides

---

## Prerequisites

- Docker (and optionally Docker Compose)
- A running CouchDB instance (URL, admin username, password)
- For HTTP transports: port **3008** exposed in the container (map as needed on the host)

---

## Quick Start

### 1. Pull and run with Docker Compose

```bash
cd docker
# Create config.json with your CouchDB URL and credentials (see Configuration below)

docker compose -f mcp-docker-compose.yml up -d
```

The server will listen on **port 3006** on the host (mapped from 3008 in the container). Use `http://localhost:3006` for health, info, and tools.

### 2. Run with Docker only

```bash
# Create a config file (see Configuration below)
docker run -d \
  --name couchdb-mcp \
  -p 3006:3008 \
  -v $(pwd)/config.json:/app/config.json \
  -e MCP_TRANSPORT=streamable-http \
  deviljackni/couchdb-mcp-server:1.1.0
```

---

## Building the image

From the **repository root**:

```bash
docker build -f docker/Dockerfile -t couchdb-mcp-server:local .
```

Then run with your tag:

```bash
docker run -d --name couchdb-mcp -p 3006:3008 \
  -v $(pwd)/docker/config.json:/app/config.json \
  -e MCP_TRANSPORT=streamable-http \
  couchdb-mcp-server:local
```

To use the built image in Compose, set the image name in `mcp-docker-compose.yml` or use the `build` block:

```yaml
services:
  couchdb-mcp:
    build:
      context: ..
      dockerfile: docker/Dockerfile
    image: couchdb-mcp-server:local
    # ... rest of service config
```

---

## Configuration

### Config file (`config.json`)

The server reads **`/app/config.json`** inside the container. Mount your own file:

- **Docker:** `-v /path/on/host/config.json:/app/config.json`
- **Compose:** `- ./config.json:/app/config.json` (path relative to the compose file)

Example **`config.json`**:

```json
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

- **`server.port`**: Must be **3008** if you use the default port mapping in the examples.
- **`server.host`**: Use **`0.0.0.0`** so the server is reachable from outside the container.

### Environment overrides

You can override settings with environment variables (handy for secrets or different environments):

| Variable | Overrides |
|----------|-----------|
| `COUCHDB_URL` | `couchdb.url` |
| `COUCHDB_ADMIN_USERNAME` | `couchdb.adminUsername` |
| `COUCHDB_ADMIN_PASSWORD` | `couchdb.adminPassword` |
| `PORT` | `server.port` |
| `HOST` | `server.host` |
| `LOG_LEVEL` | `server.logLevel` |
| `MCP_TRANSPORT` | Transport (see below) |

Example with env file in Compose:

```yaml
services:
  couchdb-mcp:
    image: "deviljackni/couchdb-mcp-server:1.1.0"
    env_file:
      - ./dev.env
    environment:
      MCP_TRANSPORT: "streamable-http"
    volumes:
      - ./config.json:/app/config.json
    ports:
      - 3006:3008
```

---

## Transport selection (`MCP_TRANSPORT`)

Set **`MCP_TRANSPORT`** in the container (default if unset: **`sse`**):

| Value | Description |
|-------|-------------|
| `stdio` | STDIO transport (for MCP clients that run the container and use stdin/stdout) |
| `sse` | SSE transport; endpoint **`GET /sse`** for the stream, **`POST /sse`** for messages |
| `streamable-http` | Streamable HTTP; single **`/mcp`** endpoint (GET for SSE, POST for JSON-RPC) |

Example:

```yaml
environment:
  MCP_TRANSPORT: "streamable-http"
```

For **STDIO**, keep the container attached (e.g. no `-d`) and use **`stdin_open: true`** in Compose if your client needs it for tunneling.

---

## Example: full Compose setup

**`mcp-docker-compose.yml`**:

```yaml
services:
  couchdb-mcp:
    image: "deviljackni/couchdb-mcp-server:1.1.0"
    container_name: "couchdb-mcp"
    environment:
      MCP_TRANSPORT: "streamable-http"   # or stdio | sse
    volumes:
      - ./config.json:/app/config.json
    stdin_open: true   # useful for STDIO / tunnel usage
    ports:
      - 3006:3008
```

**`config.json`** (in the same directory as the compose file, or adjust the volume path):

```json
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

Run:

```bash
docker compose -f mcp-docker-compose.yml up -d
```

---

## HTTP endpoints (when using SSE or Streamable HTTP)

With the default port mapping **3006:3008**, use **port 3006** on the host:

| Endpoint | Description |
|----------|-------------|
| `GET http://localhost:3006/` | API documentation and usage examples |
| `GET http://localhost:3006/health` | Health check |
| `GET http://localhost:3006/info` | Server info and available tools |
| `GET http://localhost:3006/sse` | SSE transport (when `MCP_TRANSPORT=sse`) |
| `GET http://localhost:3006/mcp` | Streamable HTTP (when `MCP_TRANSPORT=streamable-http`) |
| `POST http://localhost:3006/tools` | Direct tool execution for testing |

---

## Available tools (overview)

- **Database:** `create-database`, `delete-database`, `get-database-info`, `list-databases`
- **Documents:** `create-document`, `get-document`, `update-document`, `delete-document`
- **User & security:** `create-user`, `delete-user`, `set-database-security`
- **Replication:** `create-replication`, `delete-replication`
- **Design docs:** `deploy-design-document`, `get-design-document`
- **Query:** `mango-query-database`, `create-database-index`, `list-database-indexes`, `delete-database-index`

---

## Example: HTTP tool testing

Use **port 3006** if you kept the default mapping:

```bash
# Create a database
curl -X POST http://localhost:3006/tools \
  -H "Content-Type: application/json" \
  -d '{"tool": "create-database", "arguments": {"databaseName": "my-app-db"}}'

# List all databases
curl -X POST http://localhost:3006/tools \
  -H "Content-Type: application/json" \
  -d '{"tool": "list-databases"}'

# Server info
curl http://localhost:3006/info

# Health check
curl http://localhost:3006/health
```

### Example tool payloads

**Create database:**
```json
{
  "tool": "create-database",
  "arguments": {
    "databaseName": "my-app-db"
  }
}
```

**Replication:**
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

**Create user and set database security:**
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

**Mango query:**
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

**Index management:**
```json
{
  "tool": "create-database-index",
  "arguments": {
    "databaseName": "my-app-db",
    "fields": ["name", "age"]
  }
}
```
```json
{
  "tool": "list-database-indexes",
  "arguments": {
    "databaseName": "my-app-db"
  }
}
```
```json
{
  "tool": "delete-database-index",
  "arguments": {
    "databaseName": "my-app-db",
    "designDoc": "_design/my-index-design",
    "name": "my-index"
  }
}
```

---

## License

MIT
