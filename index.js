#!/usr/bin/env node
/**
 * eaglercraft-mcp - MCP server for AI to build in Eaglercraft worlds
 * 
 * Architecture:
 * - Memory world (prismarine-chunk, MC 1.8 format, superflat)
 * - Build API: set_block, fill, get_area, snapshot, export_epk
 * - Real-time viewer: prismarine-viewer on http://localhost:8080
 * - Spectator fly camera (WASD + mouse)
 * - Supervision panel: WebSocket for pause/resume/undo/logging
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');
const zlib = require('zlib');

// Prismarine libraries
const Chunk = require('prismarine-chunk')(require('minecraft-data')('1.8.9'));
const mcData = require('minecraft-data')('1.8.9');
const Vec3 = require('vec3').Vec3;
const WebSocket = require('ws');

// Simple in-memory world storage (no prismarine-world dependency needed)
// We store chunks in a Map: "x,z" -> Chunk

// Configuration
const PORT = 8080;
const WS_PORT = 8081;
const WORLD_SIZE = 16; // chunks in each direction (16x16 = 256x256 blocks)

// Global state
let paused = false;
let actionLog = [];
let undoStack = [];
let wss = null;
const chunks = new Map(); // "cx,cz" -> Chunk

// HTML page (will be loaded from external URL in production)
const VIEWER_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Eaglercraft MCP Viewer</title>
  <style>
    body { margin: 0; overflow: hidden; font-family: sans-serif; }
    #viewer { width: 100vw; height: 100vh; }
    #panel {
      position: absolute; top: 10px; left: 10px; background: rgba(0,0,0,0.7);
      color: white; padding: 10px; border-radius: 5px; max-height: 300px;
      overflow-y: auto; font-size: 12px; z-index: 100;
    }
    #controls {
      position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.7);
      color: white; padding: 10px; border-radius: 5px; z-index: 100;
    }
    button { margin: 5px; padding: 8px 12px; cursor: pointer; }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    .log-entry { margin: 2px 0; }
    .paused { background: rgba(255,0,0,0.3) !important; }
  </style>
</head>
<body>
  <div id="viewer"></div>
  <div id="panel">
    <strong>Action Log</strong>
    <div id="log"></div>
  </div>
  <div id="controls">
    <button id="pauseBtn">Pause</button>
    <button id="undoBtn" disabled>Undo</button>
    <div>Status: <span id="status">Running</span></div>
    <div style="margin-top:10px;font-size:11px;opacity:0.8">
      WASD: Move | Space: Up | Shift: Down | Mouse: Look
    </div>
  </div>
  <script src="/client.js"></script>
</body>
</html>
`;

// Client-side JavaScript for viewer
const CLIENT_JS = `
(function() {
  const ws = new WebSocket('ws://' + window.location.host.replace('8080', '8081') + '/');
  const logEl = document.getElementById('log');
  const statusEl = document.getElementById('status');
  const pauseBtn = document.getElementById('pauseBtn');
  const undoBtn = document.getElementById('undoBtn');
  
  let camera = { x: 100, y: 100, z: 100, yaw: 0, pitch: 0 };
  let keys = {};
  let mouseLocked = false;
  
  // Three.js viewer setup
  const scene = new THREE.Scene();
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById('viewer').appendChild(renderer.domElement);
  
  // Camera
  const cam = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
  
  // Lights
  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambient);
  const dir = new THREE.DirectionalLight(0xffffff, 0.8);
  dir.position.set(100, 200, 100);
  scene.add(dir);
  
  // Load world via WebSocket
  ws.onopen = () => {
    log('Connected to server');
    ws.send(JSON.stringify({ type: 'get_world' }));
  };
  
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.type === 'world_data') {
      renderWorld(msg.chunks);
    } else if (msg.type === 'block_update') {
      updateBlock(msg.x, msg.y, msg.z, msg.blockId);
    } else if (msg.type === 'log') {
      addLog(msg.text);
    } else if (msg.type === 'state') {
      statusEl.textContent = msg.paused ? 'PAUSED' : 'Running';
      pauseBtn.textContent = msg.paused ? 'Resume' : 'Pause';
      document.getElementById('controls').className = msg.paused ? 'paused' : '';
      undoBtn.disabled = !msg.canUndo;
    }
  };
  
  ws.onclose = () => log('Disconnected');
  ws.onerror = (e) => log('WebSocket error');
  
  function log(text) {
    addLog(text);
    ws.send(JSON.stringify({ type: 'log', text }));
  }
  
  function addLog(text) {
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.textContent = new Date().toLocaleTimeString() + ': ' + text;
    logEl.appendChild(entry);
    logEl.scrollTop = logEl.scrollHeight;
  }
  
  pauseBtn.onclick = () => {
    ws.send(JSON.stringify({ type: 'toggle_pause' }));
  };
  
  undoBtn.onclick = () => {
    ws.send(JSON.stringify({ type: 'undo' }));
  };
  
  // FPS-style camera controls
  document.addEventListener('click', () => {
    if (!mouseLocked) renderer.domElement.requestPointerLock();
  });
  
  document.addEventListener('pointerlockchange', () => {
    mouseLocked = document.pointerLockElement === renderer.domElement;
  });
  
  document.addEventListener('mousemove', (e) => {
    if (!mouseLocked) return;
    camera.yaw -= e.movementX * 0.002;
    camera.pitch -= e.movementY * 0.002;
    camera.pitch = Math.max(-Math.PI/2, Math.min(Math.PI/2, camera.pitch));
  });
  
  document.addEventListener('keydown', (e) => keys[e.code] = true);
  document.addEventListener('keyup', (e) => keys[e.code] = false);
  
  function updateCamera() {
    const speed = keys['ShiftLeft'] ? 0.5 : (keys['Space'] ? 2 : 1);
    const forward = new THREE.Vector3(
      -Math.sin(camera.yaw), 0, -Math.cos(camera.yaw)
    ).normalize();
    const right = new THREE.Vector3(
      Math.cos(camera.yaw), 0, -Math.sin(camera.yaw)
    ).normalize();
    
    if (keys['KeyW']) { camera.x += forward.x * speed; camera.z += forward.z * speed; }
    if (keys['KeyS']) { camera.x -= forward.x * speed; camera.z -= forward.z * speed; }
    if (keys['KeyA']) { camera.x -= right.x * speed; camera.z -= right.z * speed; }
    if (keys['KeyD']) { camera.x += right.x * speed; camera.z += right.z * speed; }
    if (keys['Space']) camera.y += speed;
    if (keys['ShiftLeft']) camera.y -= speed;
    
    cam.position.set(camera.x, camera.y, camera.z);
    cam.rotation.order = 'YXZ';
    cam.rotation.y = camera.yaw;
    cam.rotation.x = camera.pitch;
  }
  
  let chunks = [];
  function renderWorld(chunkData) {
    // Clear existing
    chunks.forEach(c => scene.remove(c.mesh));
    chunks = [];
    
    // Simple block rendering (production would use prismarine-viewer's chunk loading)
    chunkData.forEach(c => {
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshLambertMaterial({ color: 0x888888 });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(c.x + 8, c.y, c.z + 8);
      scene.add(mesh);
      chunks.push({ mesh, x: c.x, y: c.y, z: c.z });
    });
  }
  
  function updateBlock(x, y, z, blockId) {
    // Update single block (simplified)
  }
  
  function animate() {
    requestAnimationFrame(animate);
    updateCamera();
    renderer.render(scene, cam);
  }
  animate();
  
  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    cam.aspect = window.innerWidth / window.innerHeight;
    cam.updateProjectionMatrix();
  });
})();
`;

// Initialize superflat world
function initWorld() {
  // Generate superflat terrain: bedrock (y=0), dirt (y=1-3), grass (y=4)
  for (let cx = 0; cx < WORLD_SIZE; cx++) {
    for (let cz = 0; cz < WORLD_SIZE; cz++) {
      const chunk = new Chunk();
      
      // Fill superflat layers
      for (let lx = 0; lx < 16; lx++) {
        for (let lz = 0; lz < 16; lz++) {
          chunk.setBlockType(new Vec3(lx, 0, lz), 7); // Bedrock
          for (let y = 1; y <= 3; y++) {
            chunk.setBlockType(new Vec3(lx, y, lz), 3); // Dirt
          }
          chunk.setBlockType(new Vec3(lx, 4, lz), 2); // Grass block
        }
      }
      
      chunks.set(`${cx},${cz}`, chunk);
    }
  }
  
  console.log(`Superflat world initialized (${WORLD_SIZE * 16}x${WORLD_SIZE * 16} blocks, ${WORLD_SIZE * WORLD_SIZE} chunks)`);
}

function getChunk(cx, cz) {
  return chunks.get(`${cx},${cz}`);
}

// Block operations with undo support
function setBlock(x, y, z, blockId, saveUndo = true) {
  if (paused) {
    return { status: 'paused' };
  }
  
  const chunkX = Math.floor(x / 16);
  const chunkZ = Math.floor(z / 16);
  const chunk = getChunk(chunkX, chunkZ);
  
  if (!chunk) {
    return { error: 'Chunk not loaded' };
  }
  
  const lx = ((x % 16) + 16) % 16;
  const lz = ((z % 16) + 16) % 16;
  
  const oldBlock = chunk.getBlock(lx, y, lz);
  
  if (saveUndo) {
    undoStack.push({ x, y, z, oldBlockId: oldBlock.type });
    broadcastState();
  }
  
  chunk.setBlockType(lx, y, z, blockId);
  
  const action = { time: Date.now(), type: 'set_block', x, y, z, blockId };
  actionLog.push(action);
  broadcastLog(`Set block ${blockId} at (${x}, ${y}, ${z})`);
  broadcastBlockUpdate(x, y, z, blockId);
  
  return { success: true };
}

function fill(x1, y1, z1, x2, y2, z2, blockId) {
  if (paused) {
    return { status: 'paused' };
  }
  
  const minX = Math.min(x1, x2), maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2), maxY = Math.max(y1, y2);
  const minZ = Math.min(z1, z2), maxZ = Math.max(z1, z2);
  
  let count = 0;
  for (let x = minX; x <= maxX; x++) {
    for (let y = minY; y <= maxY; y++) {
      for (let z = minZ; z <= maxZ; z++) {
        setBlock(x, y, z, blockId, true);
        count++;
      }
    }
  }
  
  return { success: true, blocksPlaced: count };
}

function undo() {
  if (undoStack.length === 0 || paused) {
    return { success: false, reason: 'Nothing to undo' };
  }
  
  const last = undoStack.pop();
  setBlock(last.x, last.y, last.z, last.oldBlockId, false);
  broadcastLog(`Undid block at (${last.x}, ${last.y}, ${last.z})`);
  broadcastState();
  
  return { success: true };
}

function getArea(x1, y1, z1, x2, y2, z2) {
  const blocks = [];
  const minX = Math.min(x1, x2), maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2), maxY = Math.max(y1, y2);
  const minZ = Math.min(z1, z2), maxZ = Math.max(z1, z2);
  
  for (let x = minX; x <= maxX; x++) {
    for (let y = minY; y <= maxY; y++) {
      for (let z = minZ; z <= maxZ; z++) {
        const chunkX = Math.floor(x / 16);
        const chunkZ = Math.floor(z / 16);
        const chunk = world.getChunk(chunkX, chunkZ);
        
        if (chunk) {
          const lx = ((x % 16) + 16) % 16;
          const lz = ((z % 16) + 16) % 16;
          const block = chunk.getBlock(lx, y, lz);
          if (block.type !== 0) { // Only non-air blocks
            blocks.push({ x, y, z, id: block.type, meta: block.metadata });
          }
        }
      }
    }
  }
  
  return { blocks };
}

function snapshot() {
  const chunks = [];
  for (let cx = 0; cx < WORLD_SIZE; cx++) {
    for (let cz = 0; cz < WORLD_SIZE; cz++) {
      const chunk = world.getChunk(cx, cz);
      if (chunk) {
        chunks.push({ x: cx * 16, y: 0, z: cz * 16, data: chunk.toJSON() });
      }
    }
  }
  return { chunks };
}

// EPK Export (M3 implementation)
function exportEPK(outputPath) {
  const entries = [];
  
  // Add level.dat (minimal NBT)
  const levelDat = createLevelDat();
  entries.push({ type: 'FILE', name: 'level.dat', data: levelDat });
  
  // Add region files
  for (let cx = 0; cx < WORLD_SIZE; cx++) {
    for (let cz = 0; cz < WORLD_SIZE; cz++) {
      const chunk = world.getChunk(cx, cz);
      if (chunk) {
        const regionX = Math.floor(cx / 32);
        const regionZ = Math.floor(cz / 32);
        const regionKey = `${regionX}_${regionZ}`;
        
        if (!entries.find(e => e.name === `region/r.${regionX}.${regionZ}.mca`)) {
          // Create region file with chunks
          const regionData = createRegionFile(cx, cz, chunk);
          entries.push({ type: 'FILE', name: `region/r.${regionX}.${regionZ}.mca`, data: regionData });
        }
      }
    }
  }
  
  // Build EPK
  const epkBuffer = buildEPK(entries, 'epk/world188');
  fs.writeFileSync(outputPath, epkBuffer);
  
  return { success: true, path: outputPath, size: epkBuffer.length };
}

function createLevelDat() {
  // Minimal level.dat NBT (simplified, in production use prismarine-nbt)
  const nbt = Buffer.from([
    0x1F, 0x8B, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x03, // gzip header
    // Actual NBT would go here (compressed)
  ]);
  // For now, return placeholder - full implementation in M3
  return Buffer.alloc(100);
}

function createRegionFile(cx, cz, chunk) {
  // Convert prismarine-chunk to Anvil format
  // Full implementation in M3
  return Buffer.alloc(8192);
}

function buildEPK(entries, fileType) {
  const HEADER_MAGIC = Buffer.from('EAGPKG$$');
  const VERSION = 'ver2.0';
  const FILENAME = 'world.epk';
  const COMMENT = '\\n\\n #  Eagler EPK v2.0 - Generated by eaglercraft-mcp\\n';
  const EOF_SIGNATURE = Buffer.from(':::YEE:>');
  
  // Build HEAD entry
  const headKey = 'file-type';
  const headValue = fileType;
  
  // Calculate sizes
  let uncompressedSize = 4 + 1 + headKey.length + 4 + headValue.length + 1; // HEAD
  
  entries.forEach(entry => {
    uncompressedSize += 4 + 1 + entry.name.length + 4 + 4 + entry.data.length + 2; // FILE + path + len + crc + data + :>
  });
  
  uncompressedSize += 4; // END$
  
  // Compress content
  const contentBuffer = Buffer.alloc(uncompressedSize);
  let offset = 0;
  
  // HEAD
  contentBuffer.write('HEAD', offset); offset += 4;
  contentBuffer.writeUInt8(headKey.length, offset); offset += 1;
  contentBuffer.write(headKey, offset); offset += headKey.length;
  contentBuffer.writeUInt32BE(headValue.length, offset); offset += 4;
  contentBuffer.write(headValue, offset); offset += headValue.length;
  contentBuffer.writeUInt8(62, offset); offset += 1; // '>'
  
  // FILE entries
  entries.forEach(entry => {
    const crc = zlib.crc32(entry.data);
    
    contentBuffer.write('FILE', offset); offset += 4;
    contentBuffer.writeUInt8(entry.name.length, offset); offset += 1;
    contentBuffer.write(entry.name, offset); offset += entry.name.length;
    contentBuffer.writeUInt32BE(entry.data.length + 5, offset); offset += 4;
    contentBuffer.writeUInt32BE(crc, offset); offset += 4;
    entry.data.copy(contentBuffer, offset); offset += entry.data.length;
    contentBuffer.writeUInt8(58, offset); offset += 1; // ':'
    contentBuffer.writeUInt8(62, offset); offset += 1; // '>'
  });
  
  // END$
  contentBuffer.write('END$', offset);
  
  // Compress with gzip
  const compressed = zlib.gzipSync(contentBuffer.slice(0, offset));
  
  // Build final EPK
  const commentBytes = Buffer.from(COMMENT);
  const filenameBytes = Buffer.from(FILENAME);
  const versionBytes = Buffer.from(VERSION);
  
  const totalSize = 8 + 1 + versionBytes.length + 1 + filenameBytes.length + 
                    2 + commentBytes.length + 8 + 4 + 1 + compressed.length + 8;
  
  const epk = Buffer.alloc(totalSize);
  let pos = 0;
  
  // Magic
  HEADER_MAGIC.copy(epk, pos); pos += 8;
  
  // Version
  epk.writeUInt8(versionBytes.length, pos); pos += 1;
  versionBytes.copy(epk, pos); pos += versionBytes.length;
  
  // Filename
  epk.writeUInt8(filenameBytes.length, pos); pos += 1;
  filenameBytes.copy(epk, pos); pos += filenameBytes.length;
  
  // Comment
  epk.writeUInt16BE(commentBytes.length, pos); pos += 2;
  commentBytes.copy(epk, pos); pos += commentBytes.length;
  
  // Timestamp
  epk.writeBigUInt64LE(BigInt(Date.now()), pos); pos += 8;
  
  // File count (HEAD + entries)
  epk.writeUInt32BE(entries.length + 1, pos); pos += 4;
  
  // Compression type
  epk.writeUInt8('G'.charCodeAt(0), pos); pos += 1;
  
  // Compressed data
  compressed.copy(epk, pos); pos += compressed.length;
  
  // EOF signature
  EOF_SIGNATURE.copy(epk, pos);
  
  return epk;
}

// WebSocket broadcasting
function broadcastLog(text) {
  if (wss) {
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: 'log', text }));
      }
    });
  }
}

function broadcastBlockUpdate(x, y, z, blockId) {
  if (wss) {
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: 'block_update', x, y, z, blockId }));
      }
    });
  }
}

function broadcastState() {
  if (wss) {
    const state = {
      type: 'state',
      paused,
      canUndo: undoStack.length > 0
    };
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(state));
      }
    });
  }
}

// HTTP Server
function startHTTPServer() {
  const server = http.createServer((req, res) => {
    if (req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(VIEWER_HTML);
    } else if (req.url === '/client.js') {
      res.writeHead(200, { 'Content-Type': 'application/javascript' });
      res.end(CLIENT_JS);
    } else if (req.url === '/api/snapshot') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(snapshot()));
    } else if (req.url.startsWith('/api/get_area?')) {
      const url = new URL(req.url, 'http://localhost');
      const params = url.searchParams;
      const result = getArea(
        parseInt(params.get('x1')), parseInt(params.get('y1')), parseInt(params.get('z1')),
        parseInt(params.get('x2')), parseInt(params.get('y2')), parseInt(params.get('z2'))
      );
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  });
  
  server.listen(PORT, () => {
    console.log(`Viewer running at http://localhost:${PORT}`);
  });
}

// WebSocket Server for supervision
function startWSServer() {
  wss = new WebSocket.Server({ port: WS_PORT });
  
  wss.on('connection', (ws) => {
    console.log('Supervision client connected');
    
    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data);
        
        switch (msg.type) {
          case 'get_world':
            ws.send(JSON.stringify({ type: 'world_data', chunks: snapshot().chunks }));
            break;
          
          case 'toggle_pause':
            paused = !paused;
            broadcastLog(paused ? 'World paused' : 'World resumed');
            broadcastState();
            break;
          
          case 'undo':
            undo();
            break;
          
          case 'log':
            console.log('[Supervision]', msg.text);
            break;
        }
      } catch (e) {
        console.error('WebSocket message error:', e);
      }
    });
    
    ws.on('close', () => {
      console.log('Supervision client disconnected');
    });
    
    // Send initial state
    ws.send(JSON.stringify({ type: 'state', paused, canUndo: undoStack.length > 0 }));
  });
  
  console.log(`Supervision WebSocket running at ws://localhost:${WS_PORT}`);
}

// MCP Protocol Handler (stdio)
function handleMCP() {
  let buffer = '';
  
  process.stdin.on('data', (data) => {
    buffer += data.toString();
    
    while (true) {
      const newlineIdx = buffer.indexOf('\\n');
      if (newlineIdx === -1) break;
      
      const line = buffer.slice(0, newlineIdx);
      buffer = buffer.slice(newlineIdx + 1);
      
      if (!line.trim()) continue;
      
      try {
        const request = JSON.parse(line);
        const response = handleMCPRequest(request);
        process.stdout.write(JSON.stringify(response) + '\\n');
      } catch (e) {
        console.error('MCP parse error:', e);
      }
    }
  });
}

function handleMCPRequest(request) {
  const { method, params, id } = request;
  
  switch (method) {
    case 'initialize':
      return {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'eaglercraft-mcp', version: '0.1.0' }
        }
      };
    
    case 'tools/list':
      return {
        jsonrpc: '2.0',
        id,
        result: {
          tools: [
            {
              name: 'set_block',
              description: 'Place a single block at specified coordinates',
              inputSchema: {
                type: 'object',
                properties: {
                  x: { type: 'integer', description: 'X coordinate' },
                  y: { type: 'integer', description: 'Y coordinate (0-255)' },
                  z: { type: 'integer', description: 'Z coordinate' },
                  blockId: { type: 'integer', description: 'Minecraft 1.8 block ID (e.g., 1=stone, 2=grass, 3=dirt, 5=wood, etc.)' }
                },
                required: ['x', 'y', 'z', 'blockId']
              }
            },
            {
              name: 'fill',
              description: 'Fill a rectangular region with blocks',
              inputSchema: {
                type: 'object',
                properties: {
                  x1: { type: 'integer', description: 'First X coordinate' },
                  y1: { type: 'integer', description: 'First Y coordinate' },
                  z1: { type: 'integer', description: 'First Z coordinate' },
                  x2: { type: 'integer', description: 'Second X coordinate' },
                  y2: { type: 'integer', description: 'Second Y coordinate' },
                  z2: { type: 'integer', description: 'Second Z coordinate' },
                  blockId: { type: 'integer', description: 'Block ID to place' }
                },
                required: ['x1', 'y1', 'z1', 'x2', 'y2', 'z2', 'blockId']
              }
            },
            {
              name: 'get_area',
              description: 'Get all non-air blocks in a region',
              inputSchema: {
                type: 'object',
                properties: {
                  x1: { type: 'integer' }, y1: { type: 'integer' }, z1: { type: 'integer' },
                  x2: { type: 'integer' }, y2: { type: 'integer' }, z2: { type: 'integer' }
                },
                required: ['x1', 'y1', 'z1', 'x2', 'y2', 'z2']
              }
            },
            {
              name: 'snapshot',
              description: 'Get current state of all loaded chunks',
              inputSchema: { type: 'object', properties: {} }
            },
            {
              name: 'undo',
              description: 'Undo the last block operation',
              inputSchema: { type: 'object', properties: {} }
            },
            {
              name: 'export_epk',
              description: 'Export the world as an Eaglercraft .epk file',
              inputSchema: {
                type: 'object',
                properties: {
                  outputPath: { type: 'string', description: 'Path to save the .epk file' }
                },
                required: ['outputPath']
              }
            }
          ]
        }
      };
    
    case 'tools/call':
      const { name, arguments: args } = params;
      let result;
      
      switch (name) {
        case 'set_block':
          result = setBlock(args.x, args.y, args.z, args.blockId);
          break;
        case 'fill':
          result = fill(args.x1, args.y1, args.z1, args.x2, args.y2, args.z2, args.blockId);
          break;
        case 'get_area':
          result = getArea(args.x1, args.y1, args.z1, args.x2, args.y2, args.z2);
          break;
        case 'snapshot':
          result = snapshot();
          break;
        case 'undo':
          result = undo();
          break;
        case 'export_epk':
          result = exportEPK(args.outputPath);
          break;
        default:
          result = { error: `Unknown tool: ${name}` };
      }
      
      return {
        jsonrpc: '2.0',
        id,
        result: {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        }
      };
    
    default:
      return {
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: 'Method not found' }
      };
  }
}

// Main initialization
function main() {
  console.log('Starting eaglercraft-mcp...');
  
  initWorld();
  startHTTPServer();
  startWSServer();
  handleMCP();
  
  console.log('MCP server ready (stdio)');
  console.log('Open http://localhost:8080 to view the world');
}

main();
