#!/usr/bin/env node

/**
 * eaglercraft-mcp - MCP server for building in Eaglercraft worlds
 * 
 * Architecture:
 * - Memory world (prismarine-chunk, MC 1.8 format, superflat)
 * - Build API: set_block, fill, get_area, snapshot, spawn_entity
 * - Real-time viewer: prismarine-viewer + WebSocket for supervision
 * - EPK export (coming in M3)
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const { WebSocketServer } = require('ws');
const registry = require('prismarine-registry')('1.8.9');
const Chunk = require('prismarine-chunk')(registry);
const Vec3 = require('vec3').Vec3;

// Configuration
const PORT = process.env.PORT || 8080;
const WORLD_SIZE = 256; // blocks in each direction (not chunks)
const SUPERFLAT_LAYERS = [
  { y: 0, type: 'bedrock' },
  { y: 1, type: 'dirt' },
  { y: 2, type: 'grass' }
];

// Global state
let world = null; // Map of chunkKey -> Chunk
let paused = false;
let actionLog = [];
let approveMode = false;
let wss = null;
let viewerServer = null;

// Initialize memory world
function initWorld() {
  console.log('Initializing superflat world...');
  world = new Map();
  
  // Generate superflat terrain for all chunks
  const numChunks = WORLD_SIZE / 16;
  for (let cx = 0; cx < numChunks; cx++) {
    for (let cz = 0; cz < numChunks; cz++) {
      const chunk = new Chunk();
      
      // Add superflat layers
      for (let x = 0; x < 16; x++) {
        for (let z = 0; z < 16; z++) {
          chunk.setBlockType(new Vec3(x, 0, z), 7); // bedrock
          chunk.setBlockType(new Vec3(x, 1, z), 3); // dirt
          chunk.setBlockType(new Vec3(x, 2, z), 2); // grass
        }
      }
      
      world.set(`${cx},${cz}`, chunk);
    }
  }
  
  console.log(`World initialized: ${WORLD_SIZE}x${WORLD_SIZE} blocks (${numChunks}x${numChunks} chunks)`);
  return world;
}

// Block operations
function getChunk(chunkX, chunkZ) {
  return world.get(`${chunkX},${chunkZ}`);
}

function setBlock(x, y, z, blockType, data = 0) {
  if (paused) {
    return { status: 'paused' };
  }
  
  const chunkX = x >> 4;
  const chunkZ = z >> 4;
  const chunk = getChunk(chunkX, chunkZ);
  
  if (!chunk) {
    return { error: 'Chunk not loaded' };
  }
  
  const cx = x & 15;
  const cz = z & 15;
  
  try {
    chunk.setBlockType(new Vec3(cx, y, cz), blockType);
    if (data > 0) {
      chunk.setBlockData(new Vec3(cx, y, cz), data);
    }
    
    logAction(`set_block: ${x},${y},${z} -> ${blockType}`);
    broadcastUpdate({ type: 'block_update', x, y, z, blockType, data });
    
    return { success: true, x, y, z, blockType };
  } catch (err) {
    return { error: err.message };
  }
}

function fill(x1, y1, z1, x2, y2, z2, blockType, data = 0) {
  if (paused) {
    return { status: 'paused' };
  }
  
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);
  const minZ = Math.min(z1, z2);
  const maxZ = Math.max(z1, z2);
  
  let count = 0;
  for (let x = minX; x <= maxX; x++) {
    for (let y = minY; y <= maxY; y++) {
      for (let z = minZ; z <= maxZ; z++) {
        const result = setBlock(x, y, z, blockType, data);
        if (result.success) count++;
      }
    }
  }
  
  return { success: true, blocks_filled: count };
}

function getArea(x1, y1, z1, x2, y2, z2) {
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);
  const minZ = Math.min(z1, z2);
  const maxZ = Math.max(z1, z2);
  
  const blocks = [];
  for (let x = minX; x <= maxX; x++) {
    for (let y = minY; y <= maxY; y++) {
      for (let z = minZ; z <= maxZ; z++) {
        const chunkX = x >> 4;
        const chunkZ = z >> 4;
        const chunk = getChunk(chunkX, chunkZ);
        
        if (chunk) {
          const cx = x & 15;
          const cz = z & 15;
          const blockType = chunk.getBlockType(new Vec3(cx, y, cz));
          const blockData = chunk.getBlockData(new Vec3(cx, y, cz));
          
          if (blockType !== 0) { // Skip air
            blocks.push({ x, y, z, type: blockType, data: blockData });
          }
        }
      }
    }
  }
  
  return { blocks, count: blocks.length };
}

// Entity spawning (simplified for M1, full NBT in M2)
function spawnEntity(type, x, y, z) {
  if (paused) {
    return { status: 'paused' };
  }
  
  // For now, just log the entity spawn request
  // Full implementation with NBT will come in M2
  logAction(`spawn_entity: ${type} at ${x},${y},${z}`);
  broadcastUpdate({ type: 'entity_spawn', entityType: type, x, y, z });
  
  return { success: true, entityType: type, x, y, z };
}

// Undo system (simple last-action tracking)
let lastActions = [];
function undo() {
  if (lastActions.length === 0) {
    return { error: 'No actions to undo' };
  }
  
  const lastAction = lastActions.pop();
  // Simplified undo - in production would need proper state tracking
  logAction(`undo: ${lastAction.type}`);
  
  return { success: true, undone: lastAction };
}

function logAction(action) {
  const entry = {
    timestamp: Date.now(),
    action
  };
  actionLog.push(entry);
  lastActions.push(entry);
  
  // Keep log size manageable
  if (actionLog.length > 1000) {
    actionLog = actionLog.slice(-500);
  }
  if (lastActions.length > 100) {
    lastActions = lastActions.slice(-50);
  }
  
  broadcastUpdate({ type: 'log', entry });
}

// WebSocket supervision
function broadcastUpdate(update) {
  if (wss && wss.clients.size > 0) {
    const message = JSON.stringify(update);
    for (const client of wss.clients) {
      if (client.readyState === 1) { // OPEN
        client.send(message);
      }
    }
  }
}

function handleWebSocketMessage(client, message) {
  try {
    const data = JSON.parse(message);
    
    switch (data.command) {
      case 'pause':
        paused = true;
        logAction('pause');
        client.send(JSON.stringify({ status: 'paused' }));
        break;
        
      case 'resume':
        paused = false;
        logAction('resume');
        client.send(JSON.stringify({ status: 'resumed' }));
        break;
        
      case 'get_log':
        client.send(JSON.stringify({ type: 'log_history', entries: actionLog }));
        break;
        
      case 'approve':
        // Approval mode handling (for --approve flag)
        if (approveMode && data.actionId) {
          // Process approval
          client.send(JSON.stringify({ status: 'approved', actionId: data.actionId }));
        }
        break;
        
      default:
        client.send(JSON.stringify({ error: 'Unknown command' }));
    }
  } catch (err) {
    client.send(JSON.stringify({ error: err.message }));
  }
}

// HTTP server for viewer and static files
function createHTTPServer() {
  const server = http.createServer((req, res) => {
    // Serve viewer HTML
    if (req.url === '/' || req.url === '/viewer') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(getViewerHTML());
      return;
    }
    
    // Health check
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        status: 'ok', 
        paused, 
        world_size: WORLD_SIZE,
        actions_logged: actionLog.length 
      }));
      return;
    }
    
    res.writeHead(404);
    res.end('Not found');
  });
  
  return server;
}

// Viewer HTML with flying camera and supervision panel
function getViewerHTML() {
  return `<!DOCTYPE html>
<html>
<head>
  <title>Eaglercraft MCP Viewer</title>
  <style>
    body { margin: 0; overflow: hidden; font-family: monospace; }
    #viewer { width: 100vw; height: 100vh; }
    #panel {
      position: absolute;
      top: 10px;
      left: 10px;
      background: rgba(0,0,0,0.8);
      color: white;
      padding: 10px;
      border-radius: 5px;
      max-height: 300px;
      overflow-y: auto;
      font-size: 12px;
      z-index: 100;
    }
    #controls {
      position: absolute;
      top: 10px;
      right: 10px;
      background: rgba(0,0,0,0.8);
      color: white;
      padding: 10px;
      border-radius: 5px;
      z-index: 100;
    }
    button {
      margin: 5px;
      padding: 5px 10px;
      cursor: pointer;
    }
    .log-entry { margin: 2px 0; }
    .paused { background: rgba(255,0,0,0.3); }
  </style>
</head>
<body>
  <div id="viewer"></div>
  <div id="panel">
    <h3>Action Log</h3>
    <div id="log"></div>
  </div>
  <div id="controls">
    <button onclick="togglePause()">Pause/Resume</button>
    <button onclick="clearLog()">Clear Log</button>
    <div id="status">Connected</div>
  </div>
  
  <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/prismarine-viewer@1.33.0/dist/viewer.js"></script>
  <script>
    const { Viewer, WorldView, ChunkColumnUpdate } = PrismarineViewer;
    
    // Three.js setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Sky blue
    
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('viewer').appendChild(renderer.domElement);
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(100, 100, 50);
    scene.add(directionalLight);
    
    // Flying camera controls
    let camX = 128, camY = 50, camZ = 128;
    let camYaw = 0, camPitch = 0;
    const keys = {};
    
    camera.position.set(camX, camY, camZ);
    
    document.addEventListener('keydown', e => {
      keys[e.code] = true;
      keys[e.code.toLowerCase()] = true;
    });
    document.addEventListener('keyup', e => {
      keys[e.code] = false;
      keys[e.code.toLowerCase()] = false;
    });
    document.addEventListener('mousemove', e => {
      if (document.pointerLockElement) {
        camYaw -= e.movementX * 0.002;
        camPitch -= e.movementY * 0.002;
        camPitch = Math.max(-Math.PI/2, Math.min(Math.PI/2, camPitch));
      }
    });
    document.addEventListener('click', () => {
      document.body.requestPointerLock();
    });
    
    function updateCamera() {
      const speed = keys['ShiftLeft'] || keys['shiftleft'] ? 2 : 0.5;
      if (keys['KeyW'] || keys['keyw']) {
        camX -= Math.sin(camYaw) * speed;
        camZ -= Math.cos(camYaw) * speed;
      }
      if (keys['KeyS'] || keys['keys']) {
        camX += Math.sin(camYaw) * speed;
        camZ += Math.cos(camYaw) * speed;
      }
      if (keys['KeyA'] || keys['keya']) {
        camX -= Math.cos(camYaw) * speed;
        camZ += Math.sin(camYaw) * speed;
      }
      if (keys['KeyD'] || keys['keyd']) {
        camX += Math.cos(camYaw) * speed;
        camZ -= Math.sin(camYaw) * speed;
      }
      if (keys['Space'] || keys['space']) camY += speed;
      if (keys['ControlLeft'] || keys['controlleft']) camY -= speed;
      
      camera.position.set(camX, camY, camZ);
      camera.rotation.set(camPitch, camYaw, 0, 'YXZ');
    }
    
    // WebSocket for supervision and world data
    const ws = new WebSocket('ws://' + window.location.host);
    const logDiv = document.getElementById('log');
    const statusDiv = document.getElementById('status');
    
    let worldView = null;
    const chunks = {}; // Store chunk data
    
    ws.onopen = () => {
      statusDiv.textContent = 'Connected';
      statusDiv.className = '';
      console.log('WebSocket connected');
    };
    
    ws.onclose = () => {
      statusDiv.textContent = 'Disconnected';
      statusDiv.className = 'paused';
    };
    
    ws.onerror = (err) => {
      console.error('WebSocket error:', err);
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'log') {
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        entry.textContent = new Date(data.entry.timestamp).toLocaleTimeString() + ': ' + data.entry.action;
        logDiv.insertBefore(entry, logDiv.firstChild);
        
        while (logDiv.children.length > 50) {
          logDiv.removeChild(logDiv.lastChild);
        }
      }
      
      if (data.type === 'block_update') {
        // Handle block updates for viewer
        console.log('Block update:', data);
        // In a full implementation, we'd update the voxel mesh here
      }
      
      if (data.status === 'paused') {
        document.body.classList.add('paused');
      } else if (data.status === 'resumed') {
        document.body.classList.remove('paused');
      }
    };
    
    function togglePause() {
      ws.send(JSON.stringify({ command: paused ? 'resume' : 'pause' }));
    }
    
    function clearLog() {
      logDiv.innerHTML = '';
    }
    
    // Simple voxel rendering for demonstration
    // In production, would use proper prismarine-viewer integration
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    
    function createVoxel(x, y, z, color) {
      const material = new THREE.MeshLambertMaterial({ color });
      const voxel = new THREE.Mesh(geometry, material);
      voxel.position.set(x + 0.5, y + 0.5, z + 0.5);
      scene.add(voxel);
      return voxel;
    }
    
    // Render initial superflat terrain (simplified visualization)
    function renderTerrain() {
      const colors = {
        7: 0x555555,  // bedrock
        3: 0x8B4513,  // dirt
        2: 0x228B22   // grass
      };
      
      // Render a sample area (not all 256x256 for performance)
      const sampleSize = 32;
      for (let x = 0; x < sampleSize; x++) {
        for (let z = 0; z < sampleSize; z++) {
          createVoxel(x, 0, z, colors[7]);
          createVoxel(x, 1, z, colors[3]);
          createVoxel(x, 2, z, colors[2]);
        }
      }
      console.log('Terrain rendered');
    }
    
    // Animation loop
    function animate() {
      requestAnimationFrame(animate);
      updateCamera();
      renderer.render(scene, camera);
    }
    
    // Initialize
    renderTerrain();
    animate();
    
    // Handle resize
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
    
    console.log('Viewer initialized');
  </script>
</body>
</html>`;
}

// Start servers
function start() {
  const args = process.argv.slice(2);
  approveMode = args.includes('--approve');
  
  console.log('Starting Eaglercraft MCP Server...');
  console.log('Approve mode:', approveMode ? 'ON' : 'OFF');
  
  // Initialize world
  initWorld();
  
  // Create HTTP server
  const server = createHTTPServer();
  
  // WebSocket server for supervision
  wss = new WebSocketServer({ server });
  
  wss.on('connection', (ws) => {
    console.log('Supervision client connected');
    
    ws.on('message', (message) => {
      handleWebSocketMessage(ws, message.toString());
    });
    
    ws.on('close', () => {
      console.log('Supervision client disconnected');
    });
  });
  
  // Start listening
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Viewer available at: http://localhost:${PORT}`);
    console.log(`WebSocket supervision on: ws://localhost:${PORT}`);
  });
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\nShutting down...');
    server.close();
    wss.close();
    process.exit(0);
  });
}

start();
