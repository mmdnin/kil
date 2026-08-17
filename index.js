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

// MC 1.8 Block Registry - Authoritative list for AI
// Usage: AI can reference any block by name (e.g., "oak_planks", "cobblestone")
const BLOCK_REGISTRY = {
  'air': { id: 0, data: 0 }, 'stone': { id: 1, data: 0 }, 'grass': { id: 2, data: 0 },
  'dirt': { id: 3, data: 0 }, 'cobblestone': { id: 4, data: 0 },
  'planks': { id: 5, data: 0 }, 'oak_planks': { id: 5, data: 0 },
  'spruce_planks': { id: 5, data: 1 }, 'birch_planks': { id: 5, data: 2 }, 'jungle_planks': { id: 5, data: 3 },
  'bedrock': { id: 7, data: 0 }, 'water': { id: 8, data: 0 }, 'lava': { id: 10, data: 0 },
  'sand': { id: 12, data: 0 }, 'gravel': { id: 13, data: 0 },
  'gold_ore': { id: 14, data: 0 }, 'iron_ore': { id: 15, data: 0 }, 'coal_ore': { id: 16, data: 0 },
  'log': { id: 17, data: 0 }, 'oak_log': { id: 17, data: 0 },
  'spruce_log': { id: 17, data: 1 }, 'birch_log': { id: 17, data: 2 }, 'jungle_log': { id: 17, data: 3 },
  'leaves': { id: 18, data: 0 }, 'oak_leaves': { id: 18, data: 0 },
  'spruce_leaves': { id: 18, data: 1 }, 'birch_leaves': { id: 18, data: 2 }, 'jungle_leaves': { id: 18, data: 3 },
  'glass': { id: 20, data: 0 }, 'lapis_ore': { id: 21, data: 0 }, 'lapis_block': { id: 22, data: 0 },
  'sandstone': { id: 24, data: 0 }, 'bed': { id: 26, data: 0 },
  'sticky_piston': { id: 29, data: 0 }, 'piston': { id: 33, data: 0 },
  'wool': { id: 35, data: 0 }, 'white_wool': { id: 35, data: 0 }, 'orange_wool': { id: 35, data: 1 },
  'magenta_wool': { id: 35, data: 2 }, 'light_blue_wool': { id: 35, data: 3 }, 'yellow_wool': { id: 35, data: 4 },
  'lime_wool': { id: 35, data: 5 }, 'pink_wool': { id: 35, data: 6 }, 'gray_wool': { id: 35, data: 7 },
  'light_gray_wool': { id: 35, data: 8 }, 'cyan_wool': { id: 35, data: 9 }, 'purple_wool': { id: 35, data: 10 },
  'blue_wool': { id: 35, data: 11 }, 'brown_wool': { id: 35, data: 12 }, 'green_wool': { id: 35, data: 13 },
  'red_wool': { id: 35, data: 14 }, 'black_wool': { id: 35, data: 15 },
  'gold_block': { id: 41, data: 0 }, 'iron_block': { id: 42, data: 0 },
  'brick_block': { id: 45, data: 0 }, 'tnt': { id: 46, data: 0 }, 'bookshelf': { id: 47, data: 0 },
  'mossy_cobblestone': { id: 48, data: 0 }, 'obsidian': { id: 49, data: 0 },
  'torch': { id: 50, data: 5 }, 'fire': { id: 51, data: 0 }, 'mob_spawner': { id: 52, data: 0 },
  'oak_stairs': { id: 53, data: 0 }, 'chest': { id: 54, data: 0 },
  'diamond_ore': { id: 56, data: 0 }, 'diamond_block': { id: 57, data: 0 },
  'crafting_table': { id: 58, data: 0 }, 'furnace': { id: 61, data: 0 },
  'ladder': { id: 65, data: 0 }, 'rail': { id: 66, data: 0 }, 'stone_stairs': { id: 67, data: 0 },
  'lever': { id: 69, data: 0 }, 'wooden_pressure_plate': { id: 72, data: 0 },
  'iron_door': { id: 71, data: 0 }, 'wooden_door': { id: 64, data: 0 },
  'redstone_ore': { id: 73, data: 0 }, 'snow_layer': { id: 78, data: 0 }, 'ice': { id: 79, data: 0 },
  'snow': { id: 80, data: 0 }, 'cactus': { id: 81, data: 0 }, 'clay': { id: 82, data: 0 },
  'jukebox': { id: 84, data: 0 }, 'fence': { id: 85, data: 0 }, 'pumpkin': { id: 86, data: 0 },
  'netherrack': { id: 87, data: 0 }, 'soul_sand': { id: 88, data: 0 }, 'glowstone': { id: 89, data: 0 },
  'lit_pumpkin': { id: 91, data: 0 }, 'trapdoor': { id: 96, data: 0 },
  'stone_bricks': { id: 98, data: 0 }, 'glass_pane': { id: 102, data: 0 }, 'melon_block': { id: 103, data: 0 },
  'fence_gate': { id: 107, data: 0 }, 'brick_stairs': { id: 108, data: 0 },
  'stone_brick_stairs': { id: 109, data: 0 }, 'mycelium': { id: 110, data: 0 },
  'nether_brick': { id: 112, data: 0 }, 'nether_brick_stairs': { id: 114, data: 0 },
  'enchanting_table': { id: 116, data: 0 }, 'end_portal_frame': { id: 120, data: 0 },
  'end_stone': { id: 121, data: 0 }, 'emerald_ore': { id: 129, data: 0 }, 'emerald_block': { id: 133, data: 0 },
  'spruce_stairs': { id: 134, data: 0 }, 'birch_stairs': { id: 135, data: 0 }, 'jungle_stairs': { id: 136, data: 0 },
  'command_block': { id: 137, data: 0 }, 'beacon': { id: 138, data: 0 },
  'anvil': { id: 145, data: 0 }, 'redstone_block': { id: 152, data: 0 },
  'quartz_block': { id: 155, data: 0 }, 'quartz_stairs': { id: 156, data: 0 },
  'slime_block': { id: 165, data: 0 }, 'barrier': { id: 166, data: 0 },
  'prismarine': { id: 168, data: 0 }, 'sea_lantern': { id: 169, data: 0 },
  'hay_block': { id: 170, data: 0 }, 'carpet': { id: 171, data: 0 },
  'hardened_clay': { id: 172, data: 0 }, 'coal_block': { id: 173, data: 0 },
  'packed_ice': { id: 174, data: 0 }, 'red_sandstone': { id: 179, data: 0 }
};

// MC 1.8 Entity Registry
const ENTITY_REGISTRY = {
  'bat': 'Bat', 'blaze': 'Blaze', 'cave_spider': 'CaveSpider',
  'chicken': 'Chicken', 'cow': 'Cow', 'creeper': 'Creeper',
  'ender_dragon': 'EnderDragon', 'enderman': 'Enderman',
  'horse': 'Horse', 'iron_golem': 'VillagerGolem',
  'magma_cube': 'LavaSlime', 'mooshroom': 'MushroomCow',
  'ocelot': 'Ozelot', 'pig': 'Pig', 'rabbit': 'Rabbit',
  'sheep': 'Sheep', 'silverfish': 'Silverfish',
  'skeleton': 'Skeleton', 'wither_skeleton': 'Skeleton',
  'slime': 'Slime', 'snowman': 'SnowMan', 'spider': 'Spider',
  'squid': 'Squid', 'villager': 'Villager', 'witch': 'Witch',
  'wither': 'WitherBoss', 'wolf': 'Wolf',
  'zombie': 'Zombie', 'zombie_pigman': 'PigZombie'
};

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
const entities = []; // Array of entity objects { type, x, y, z, nbt }

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
  
  const oldBlock = chunk.getBlock(new Vec3(lx, y, lz));
  
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
        const chunk = getChunk(chunkX, chunkZ);
        
        if (chunk) {
          const lx = ((x % 16) + 16) % 16;
          const lz = ((z % 16) + 16) % 16;
          const block = chunk.getBlock(new Vec3(lx, y, lz));
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
  const chunkData = [];
  for (let cx = 0; cx < WORLD_SIZE; cx++) {
    for (let cz = 0; cz < WORLD_SIZE; cz++) {
      const chunk = getChunk(cx, cz);
      if (chunk) {
        // Serialize chunk data manually since toJSON doesn't exist
        const blocks = [];
        for (let lx = 0; lx < 16; lx++) {
          for (let lz = 0; lz < 16; lz++) {
            for (let ly = 0; ly < 256; ly++) {
              const block = chunk.getBlock(new Vec3(lx, ly, lz));
              if (block.type !== 0) {
                blocks.push({ x: lx, y: ly, z: lz, type: block.type, meta: block.metadata });
              }
            }
          }
        }
        chunkData.push({ x: cx * 16, y: 0, z: cz * 16, blocks });
      }
    }
  }
  return { chunks: chunkData, entities: [...entities] };
}

// Spawn entity (M2 implementation)
function spawnEntity(type, x, y, z) {
  if (paused) {
    return { status: 'paused' };
  }
  
  // Map common entity names to Minecraft 1.8 entity IDs
  const entityMap = {
    'sheep': 'Sheep',
    'cow': 'Cow',
    'pig': 'Pig',
    'chicken': 'Chicken',
    'zombie': 'Zombie',
    'skeleton': 'Skeleton',
    'creeper': 'Creeper',
    'spider': 'Spider',
    'villager': 'Villager',
    'horse': 'Horse',
    'wolf': 'Wolf',
    'ocelot': 'Ocelot'
  };
  
  const mcType = entityMap[type.toLowerCase()] || type;
  
  // Create entity NBT
  const entityNbt = {
    type: 'compound',
    name: '',
    value: {
      id: { type: 'string', value: mcType },
      Pos: { type: 'list', value: { type: 'double', value: [x + 0.5, y, z + 0.5] } },
      Motion: { type: 'list', value: { type: 'double', value: [0, 0, 0] } },
      Rotation: { type: 'list', value: { type: 'float', value: [0, 0] } },
      Health: { type: 'float', value: 20 },
      FallDistance: { type: 'float', value: 0 },
      Fire: { type: 'short', value: 0 },
      Air: { type: 'short', value: 300 },
      OnGround: { type: 'byte', value: 1 },
      NoGravity: { type: 'byte', value: 0 }
    }
  };
  
  // Add sheep-specific color if applicable
  if (mcType === 'Sheep') {
    entityNbt.value.Color = { type: 'byte', value: 0 }; // White sheep
  }
  
  entities.push({
    type: mcType,
    x, y, z,
    nbt: entityNbt
  });
  
  const action = { time: Date.now(), type: 'spawn_entity', entityType: mcType, x, y, z };
  actionLog.push(action);
  broadcastLog(`Spawned ${mcType} at (${x}, ${y}, ${z})`);
  broadcastState();
  
  return { success: true, entityId: entities.length - 1 };
}

// EPK Export (M3 implementation)
function exportEPK(outputPath) {
  const entries = [];
  
  // Add level.dat (minimal NBT)
  const levelDat = createLevelDat();
  entries.push({ type: 'FILE', name: 'level.dat', data: levelDat });
  
  // Group chunks by region
  const regionChunks = new Map();
  for (let cx = 0; cx < WORLD_SIZE; cx++) {
    for (let cz = 0; cz < WORLD_SIZE; cz++) {
      const chunk = getChunk(cx, cz);
      if (chunk) {
        const regionX = Math.floor(cx / 32);
        const regionZ = Math.floor(cz / 32);
        const regionKey = `${regionX}_${regionZ}`;
        if (!regionChunks.has(regionKey)) {
          regionChunks.set(regionKey, []);
        }
        regionChunks.get(regionKey).push({ cx, cz, chunk });
      }
    }
  }
  
  // Create region files
  for (const [regionKey, chunkList] of regionChunks) {
    const [regionX, regionZ] = regionKey.split('_').map(Number);
    const regionData = createRegionFile(chunkList);
    entries.push({ type: 'FILE', name: `region/r.${regionX}.${regionZ}.mca`, data: regionData });
  }
  
  // Build EPK
  const epkBuffer = buildEPK(entries, 'epk/world188');
  fs.writeFileSync(outputPath, epkBuffer);
  
  return { success: true, path: outputPath, size: epkBuffer.length };
}

function createLevelDat() {
  // Minimal level.dat NBT using prismarine-nbt
  const nbt = require('prismarine-nbt');
  
  const levelData = {
    type: 'compound',
    name: '',
    value: {
      Data: {
        type: 'compound',
        value: {
          Version: { type: 'int', value: 19133 }, // MC 1.8.9
          LevelName: { type: 'string', value: 'eaglercraft-mcp world' },
          SpawnX: { type: 'int', value: 128 },
          SpawnY: { type: 'int', value: 64 },
          SpawnZ: { type: 'int', value: 128 },
          GameType: { type: 'int', value: 1 }, // Creative mode
          Difficulty: { type: 'int', value: 0 }, // Peaceful
          Time: { type: 'long', value: [0, 0] },
          DayTime: { type: 'long', value: [0, 0] },
          LastPlayed: { type: 'long', value: [Math.floor(Date.now() / 1000), 0] },
          SizeOnDisk: { type: 'long', value: [0, 0] },
          Player: {
            type: 'compound',
            value: {
              Pos: { type: 'list', value: { type: 'double', value: [128.5, 64, 128.5] } },
              Health: { type: 'float', value: 20 },
              Score: { type: 'int', value: 0 }
            }
          }
        }
      }
    }
  };
  
  const buf = nbt.writeUncompressed(levelData);
  return zlib.gzipSync(buf);
}

function createRegionFile(chunkList) {
  // Create a minimal Anvil region file containing the chunks
  // Region file format: 8KB header + chunk data
  // Each chunk: location table entry (4 bytes) + timestamp entry (4 bytes) + chunk data
  
  const nbt = require('prismarine-nbt');
  const SECTOR_SIZE = 4096;
  
  // Build chunk data
  const chunkBuffers = [];
  const locations = new Array(32 * 32).fill(0);
  const timestamps = new Array(32 * 32).fill(0);
  
  let currentSector = 2; // Header uses sectors 0 and 1
  
  for (const { cx, cz, chunk } of chunkList) {
    const localX = cx % 32;
    const localZ = cz % 32;
    const idx = localX + localZ * 32;
    
    // Collect entities in this chunk
    const chunkEntities = entities.filter(e => 
      Math.floor(e.x / 16) === cx && Math.floor(e.z / 16) === cz
    );
    
    // Convert entity NBTs to Anvil format
    const entityNbtList = chunkEntities.map(e => e.nbt.value);
    
    // Convert chunk to NBT format for Anvil
    const chunkNbt = {
      type: 'compound',
      name: '',
      value: {
        Level: {
          type: 'compound',
          value: {
            xPos: { type: 'int', value: cx },
            zPos: { type: 'int', value: cz },
            TerrainPopulated: { type: 'byte', value: 1 },
            LightPopulated: { type: 'byte', value: 1 },
            InhabitedTime: { type: 'long', value: [0, 0] },
            Sections: serializeChunkSections(chunk),
            Entities: { type: 'list', value: { type: 'compound', value: entityNbtList } },
            TileEntities: { type: 'list', value: { type: 'compound', value: [] } }
          }
        }
      }
    };
    
    const chunkData = zlib.gzipSync(nbt.writeUncompressed(chunkNbt));
    const chunkSize = chunkData.length + 5; // +5 for compression type byte
    const sectorCount = Math.ceil(chunkSize / SECTOR_SIZE);
    
    locations[idx] = (currentSector << 8) | sectorCount;
    timestamps[idx] = Math.floor(Date.now() / 1000);
    
    // Prepend size and compression type
    const sizeBuf = Buffer.alloc(4);
    sizeBuf.writeUInt32BE(chunkSize, 0);
    const compressionBuf = Buffer.from([2]); // 2 = gzip
    
    const fullChunkBuf = Buffer.concat([sizeBuf, compressionBuf, chunkData]);
    chunkBuffers.push({ offset: currentSector * SECTOR_SIZE, data: fullChunkBuf });
    
    currentSector += sectorCount;
  }
  
  // Build region file
  const locationTable = Buffer.alloc(SECTOR_SIZE);
  const timestampTable = Buffer.alloc(SECTOR_SIZE);
  
  for (let i = 0; i < 1024; i++) {
    locationTable.writeUInt32BE(locations[i] || 0, i * 4);
    timestampTable.writeUInt32BE(timestamps[i] || 0, i * 4);
  }
  
  const totalSize = currentSector * SECTOR_SIZE;
  const regionBuf = Buffer.alloc(totalSize);
  
  locationTable.copy(regionBuf, 0);
  timestampTable.copy(regionBuf, SECTOR_SIZE);
  
  for (const { offset, data } of chunkBuffers) {
    if (offset + data.length <= totalSize) {
      data.copy(regionBuf, offset);
    }
  }
  
  return regionBuf;
}

function serializeChunkSections(chunk) {
  const sections = [];
  
  // For MC 1.8, we need 16 sections (0-15) for full height
  for (let y = 0; y < 16; y++) {
    const section = {
      Y: { type: 'byte', value: y },
      Blocks: { type: 'buffer', value: Buffer.alloc(4096) },
      Data: { type: 'buffer', value: Buffer.alloc(2048) }
    };
    
    // Extract block data for this section
    for (let lx = 0; lx < 16; lx++) {
      for (let lz = 0; lz < 16; lz++) {
        for (let ly = 0; ly < 16; ly++) {
          const globalY = y * 16 + ly;
          const block = chunk.getBlock(new Vec3(lx, globalY, lz));
          const idx = ly + lz * 16 + lx * 256;
          section.Blocks.value[idx] = block.type;
          
          // Set metadata (half-byte per block)
          const metaIdx = Math.floor((ly + lz * 16 + lx * 256) / 2);
          const isEven = (ly + lz * 16 + lx * 256) % 2 === 0;
          if (isEven) {
            section.Data.value[metaIdx] = (block.metadata & 0x0F);
          } else {
            section.Data.value[metaIdx] |= ((block.metadata & 0x0F) << 4);
          }
        }
      }
    }
    
    sections.push(section);
  }
  
  // Return in prismarine-nbt list format
  return { type: 'list', value: { type: 'compound', value: sections } };
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
    } else if (req.url === '/play' || req.url === '/play/') {
      // Serve the full Eaglercraft client
      fs.readFile(path.join(__dirname, 'launch.html'), (err, data) => {
        if (err) {
          res.writeHead(500);
          res.end('Error loading Eaglercraft client');
          return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(data);
      });
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
    console.log(`Full Eaglercraft client at http://localhost:${PORT}/play`);
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
      const newlineIdx = buffer.indexOf('\n');
      if (newlineIdx === -1) break;
      
      const line = buffer.slice(0, newlineIdx);
      buffer = buffer.slice(newlineIdx + 1);
      
      if (!line.trim()) continue;
      
      try {
        const request = JSON.parse(line);
        const response = handleMCPRequest(request);
        process.stdout.write(JSON.stringify(response) + '\n');
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
              description: 'Place a single block at specified coordinates. Use block names from BLOCK_REGISTRY (e.g., "oak_planks", "cobblestone", "glass") or numeric IDs.',
              inputSchema: {
                type: 'object',
                properties: {
                  x: { type: 'integer', description: 'X coordinate' },
                  y: { type: 'integer', description: 'Y coordinate (0-255)' },
                  z: { type: 'integer', description: 'Z coordinate' },
                  block: { type: 'string', description: 'Block name (e.g., "oak_planks", "cobblestone", "glass") OR blockId: number for numeric ID' },
                  blockId: { type: 'integer', description: '(Deprecated) Numeric block ID. Prefer using "block" name.' }
                },
                required: ['x', 'y', 'z']
              }
            },
            {
              name: 'fill',
              description: 'Fill a rectangular region with blocks. Use block names from BLOCK_REGISTRY (e.g., "stone", "dirt", "oak_log").',
              inputSchema: {
                type: 'object',
                properties: {
                  x1: { type: 'integer', description: 'First X coordinate' },
                  y1: { type: 'integer', description: 'First Y coordinate' },
                  z1: { type: 'integer', description: 'First Z coordinate' },
                  x2: { type: 'integer', description: 'Second X coordinate' },
                  y2: { type: 'integer', description: 'Second Y coordinate' },
                  z2: { type: 'integer', description: 'Second Z coordinate' },
                  block: { type: 'string', description: 'Block name (e.g., "stone", "dirt", "oak_log")' },
                  blockId: { type: 'integer', description: '(Deprecated) Numeric block ID' }
                },
                required: ['x1', 'y1', 'z1', 'x2', 'y2', 'z2', 'block']
              }
            },
            {
              name: 'get_area',
              description: 'Get all non-air blocks in a region. Returns list of blocks with positions and types.',
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
              description: 'Get current state of all loaded chunks and entities. Returns complete world state.',
              inputSchema: { type: 'object', properties: {} }
            },
            {
              name: 'undo',
              description: 'Undo the last block operation (set_block or fill).',
              inputSchema: { type: 'object', properties: {} }
            },
            {
              name: 'spawn_entity',
              description: 'Spawn an entity (mob) at specified coordinates. Available entities: bat, blaze, cave_spider, chicken, cow, creeper, ender_dragon, enderman, horse, iron_golem, magma_cube, mooshroom, ocelot, pig, rabbit, sheep, silverfish, skeleton, wither_skeleton, slime, snowman, spider, squid, villager, witch, wither, wolf, zombie, zombie_pigman',
              inputSchema: {
                type: 'object',
                properties: {
                  type: { type: 'string', enum: Object.keys(ENTITY_REGISTRY), description: 'Entity type (e.g., "sheep", "cow", "creeper")' },
                  x: { type: 'integer', description: 'X coordinate' },
                  y: { type: 'integer', description: 'Y coordinate' },
                  z: { type: 'integer', description: 'Z coordinate' }
                },
                required: ['type', 'x', 'y', 'z']
              }
            },
            {
              name: 'export_epk',
              description: 'Export the world as an Eaglercraft .epk file. Save to specified path and import into Eaglercraft client.',
              inputSchema: {
                type: 'object',
                properties: {
                  outputPath: { type: 'string', description: 'Path to save the .epk file (e.g., "./world.epk")' }
                },
                required: ['outputPath']
              }
            },
            {
              name: 'list_blocks',
              description: 'Return the complete BLOCK_REGISTRY showing all available blocks with their names and IDs. Use this to discover what blocks you can build with.',
              inputSchema: { type: 'object', properties: {} }
            }
          ]
        }
      };
    
    case 'tools/call':
      const { name, arguments: args } = params;
      let result;
      
      switch (name) {
        case 'set_block':
          // Support both block name and blockId
          let blockId = args.blockId;
          if (args.block && BLOCK_REGISTRY[args.block]) {
            blockId = BLOCK_REGISTRY[args.block].id;
          } else if (args.block && !blockId) {
            result = { error: `Unknown block: ${args.block}. Use list_blocks to see available blocks.` };
            break;
          }
          result = setBlock(args.x, args.y, args.z, blockId);
          break;
        case 'fill':
          let fillBlockId = args.blockId;
          if (args.block && BLOCK_REGISTRY[args.block]) {
            fillBlockId = BLOCK_REGISTRY[args.block].id;
          } else if (args.block && !fillBlockId) {
            result = { error: `Unknown block: ${args.block}. Use list_blocks to see available blocks.` };
            break;
          }
          result = fill(args.x1, args.y1, args.z1, args.x2, args.y2, args.z2, fillBlockId);
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
        case 'spawn_entity':
          result = spawnEntity(args.type, args.x, args.y, args.z);
          break;
        case 'export_epk':
          result = exportEPK(args.outputPath);
          break;
        case 'list_blocks':
          result = { blocks: BLOCK_REGISTRY, count: Object.keys(BLOCK_REGISTRY).length };
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
