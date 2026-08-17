#!/usr/bin/env node
const { spawn } = require('child_process');

console.log('Starting MCP test...');
const mcp = spawn('node', ['index.js'], { stdio: ['pipe', 'pipe', 'pipe'] });

let stdout = '';
mcp.stdout.on('data', (d) => { 
  const text = d.toString();
  stdout += text;
  console.log('STDOUT:', text.trim());
});
mcp.stderr.on('data', (d) => { 
  console.error('STDERR:', d.toString().trim()); 
});

// Send initialize
setTimeout(() => {
  console.log('Sending initialize...');
  mcp.stdin.write(JSON.stringify({jsonrpc:'2.0',id:1,method:'initialize',params:{}}) + '\n');
}, 1000);

// Send tools/list
setTimeout(() => {
  console.log('Sending tools/list...');
  mcp.stdin.write(JSON.stringify({jsonrpc:'2.0',id:2,method:'tools/list',params:{}}) + '\n');
}, 2000);

// Send tools/call set_block
setTimeout(() => {
  console.log('Sending set_block...');
  mcp.stdin.write(JSON.stringify({jsonrpc:'2.0',id:3,method:'tools/call',params:{name:'set_block',arguments:{x:10,y:5,z:10,blockId:1}}}) + '\n');
}, 3000);

// Print results and exit
setTimeout(() => {
  console.log('\n=== FINAL OUTPUT ===');
  console.log(stdout);
  mcp.kill();
  process.exit(0);
}, 4500);
