#!/bin/sh
set -e

case "${MCP_TRANSPORT:-sse}" in
  stdio)
    exec node /app/index.js
    ;;
  sse)
    exec node /app/index.js --sse
    ;;
  streamable-http|http-stream)
    exec node /app/index.js --streamable-http
    ;;
  *)
    echo "Unknown MCP_TRANSPORT: $MCP_TRANSPORT (use stdio, sse, or streamable-http)" >&2
    exit 1
    ;;
esac
