#!/bin/bash
# Test MCP protocol

echo "Testing initialize..."
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}' | timeout 3 node /workspace/index.js 2>/dev/null

echo ""
echo "Testing tools/list..."
echo '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' | timeout 3 node /workspace/index.js 2>/dev/null

echo ""
echo "Testing tools/call set_block..."
echo '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"set_block","arguments":{"x":10,"y":3,"z":10,"blockType":5}}}' | timeout 3 node /workspace/index.js 2>/dev/null
