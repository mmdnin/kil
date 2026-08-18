# eaglercraft-mcp 使用指南

## 一句话目标
`npx eaglercraft-mcp`：AI 以创造模式在超平坦世界里建造建筑（含用刷蛋机制放置生物），
用户通过浏览器实时观看建造过程并可随时监督，最终产出 .epk 世界文件，
可导入 Eaglercraft 客户端进入游玩。

## 架构
```
AI 客户端 (Claude Desktop/Cursor) --MCP stdio/HTTP--> node 进程
  ├─ 内存世界（prismarine-chunk，MC 1.8 格式，超平坦）
  ├─ 建造 API：set_block / fill / spawn_entity / get_area / snapshot / undo / export_epk
  ├─ 实时视图：prismarine-viewer → http://localhost:8080
  │   └─ 监督面板（WebSocket）：暂停/继续、撤销、实时动作日志流
  └─ EPK 导出器：生成 Eaglercraft 兼容的 .epk 文件
```

## 安装与启动

```bash
# 安装依赖
npm install

# 启动服务（stdio 模式，用于 MCP）
node index.js

# 或者启动 HTTP 模式（用于支持 HTTP URL 的 AI 客户端）
node index.js --http 3456
```

## AI 可用的方块和实体

### 方块注册表 (BLOCK_REGISTRY)
代码自动从 `minecraft-data` ('1.8.9') 加载全部 **198 种方块**，AI 可通过以下方式查询：

```json
// 调用 list_blocks 工具获取完整列表
{
  "method": "tools/call",
  "params": {
    "name": "list_blocks",
    "arguments": {}
  }
}
```

返回示例：
```json
{
  "blocks": {
    "air": { "id": 0, "displayName": "Air" },
    "stone": { "id": 1, "displayName": "Stone" },
    "grass": { "id": 2, "displayName": "Grass Block" },
    "dirt": { "id": 3, "displayName": "Dirt" },
    "cobblestone": { "id": 4, "displayName": "Cobblestone" },
    "planks": { "id": 5, "displayName": "Wood Planks" },
    "oak_planks": { "id": 5, "displayName": "Oak Planks" },
    "oak_log": { "id": 17, "displayName": "Oak Log" },
    "oak_leaves": { "id": 18, "displayName": "Oak Leaves" },
    "glass": { "id": 20, "displayName": "Glass" },
    ...
  },
  "count": 202
}
```

**常用方块名称**（AI 可直接使用这些名称）：
- `stone`, `dirt`, `grass`, `cobblestone`
- `oak_planks`, `spruce_planks`, `birch_planks`, `jungle_planks`
- `oak_log`, `spruce_log`, `birch_log`, `jungle_log`
- `oak_leaves`, `spruce_leaves`, `birch_leaves`, `jungle_leaves`
- `glass`, `gold_block`, `iron_block`, `diamond_block`
- `brick_block`, `stone_bricks`, `mossy_cobblestone`
- `white_wool`, `orange_wool`, ..., `black_wool` (16 种颜色羊毛)
- `torch`, `chest`, `crafting_table`, `furnace`
- `bookshelf`, `tnt`, `obsidian`, `glowstone`
- `oak_stairs`, `stone_stairs`, `brick_stairs`, `quartz_stairs`
- `oak_door`, `iron_door`, `trapdoor`, `fence`, `fence_gate`
- `ladder`, `rail`, `water`, `lava`, `ice`, `snow`
- `pumpkin`, `melon_block`, `cactus`, `clay`
- `command_block`, `beacon`, `enchanting_table`
- ... (共 198 种)

### 实体注册表 (ENTITY_REGISTRY)
代码自动从 `minecraft-data` 加载全部 **24 种生物**，AI 可通过以下方式查询：

```json
// 调用 list_entities 工具获取完整列表
{
  "method": "tools/call",
  "params": {
    "name": "list_entities",
    "arguments": {}
  }
}
```

返回示例：
```json
{
  "entities": {
    "zombie": { "id": 54, "displayName": "Zombie", "internalId": 54 },
    "spider": { "id": 52, "displayName": "Spider", "internalId": 52 },
    "sheep": { "id": 91, "displayName": "Sheep", "internalId": 91 },
    "cow": { "id": 92, "displayName": "Cow", "internalId": 92 },
    "chicken": { "id": 93, "displayName": "Chicken", "internalId": 93 },
    "pig": { "id": 92, "displayName": "Pig", "internalId": 92 },
    "wolf": { "id": 95, "displayName": "Wolf", "internalId": 95 },
    "villager": { "id": 120, "displayName": "Villager", "internalId": 120 },
    "creeper": { "id": 50, "displayName": "Creeper", "internalId": 50 },
    "skeleton": { "id": 51, "displayName": "Skeleton", "internalId": 51 },
    "enderman": { "id": 58, "displayName": "Enderman", "internalId": 58 },
    ...
  },
  "count": 25
}
```

**可用生物名称**（AI 可直接使用这些名称）：
- `zombie`, `spider`, `cave_spider`, `slime`
- `sheep`, `cow`, `chicken`, `pig`, `rabbit`
- `wolf`, `ocelot`, `horse`, `villager`
- `creeper`, `skeleton`, `wither_skeleton`, `enderman`, `witch`
- `ghast`, `magma_cube`, `blaze`, `wither`, `ender_dragon`
- `squid`, `bat`, `snowman`, `iron_golem`, `villager_golem`
- ... (共 24 种)

## MCP 工具列表

| 工具名 | 用途 | 参数 |
|--------|------|------|
| `set_block` | 放置单个方块 | `x, y, z, block` (块名) 或 `blockId` (数字 ID) |
| `fill` | 填充区域 | `x1, y1, z1, x2, y2, z2, block` |
| `get_area` | 查询区域内的方块 | `x1, y1, z1, x2, y2, z2` |
| `snapshot` | 获取当前世界完整状态 | 无 |
| `undo` | 撤销上一次操作 | 无 |
| `spawn_entity` | 生成生物 | `type` (生物名), `x, y, z` |
| `export_epk` | 导出 .epk 文件 | `outputPath` |
| `list_blocks` | 获取所有可用方块 | 无 |
| `list_entities` | 获取所有可用生物 | 无 |

## 使用示例

### Claude Desktop 配置 (~/.config/claude-desktop/config.json)
```json
{
  "mcpServers": {
    "eaglercraft": {
      "command": "npx",
      "args": ["-y", "eaglercraft-mcp"]
    }
  }
}
```

### Cursor 配置 (Settings > MCP)
```
Command: npx -y eaglercraft-mcp
```

### HTTP 模式配置（支持 HTTP URL 的 AI 客户端）
```
URL: http://localhost:3456/
Method: POST
Content-Type: application/json
```

请求示例：
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "set_block",
    "arguments": {
      "x": 10,
      "y": 5,
      "z": 10,
      "block": "oak_planks"
    }
  },
  "id": 1
}
```

## 验收 Demo

向 AI 发送："建一座 5x5 木屋，屋内圈 2 只羊"

预期流程：
1. AI 调用 `list_blocks` 获取方块列表
2. AI 调用 `list_entities` 获取生物列表
3. AI 调用 `fill` 铺设 5x5 地板
4. AI 调用多次 `set_block` 搭建墙壁和屋顶
5. AI 调用两次 `spawn_entity` 生成两只羊
6. 用户在 http://localhost:8080/ 实时观看建造过程
7. AI 调用 `export_epk` 导出世界文件
8. 用户将 .epk 文件导入 Eaglercraft 客户端验证

## 技术细节

### 方块名称映射
- 代码使用 `minecraft-data` ('1.8.9') 自动构建注册表
- 支持直接使用块名（如 `"oak_planks"`）或数字 ID
- 为常用方块提供别名（如 `oak_planks` → `planks`）

### 生物名称映射
- 代码自动将 `EntityHorse` → `entity_horse` → `horse`（兼容别名）
- 支持所有 MC 1.8 原版生物
- 使用 internalId 进行 NBT 写入

### HTTP 模式
- 启用方式：`node index.js --http [端口]`
- 完全兼容 MCP JSON-RPC 协议
- 支持 CORS（允许浏览器直接访问）
- POST `/` 端点接收 MCP 请求

## 注意事项

1. **纯 Node 运行时**：无 Java、无编译打包、无框架
2. **依赖最小化**：仅使用 prismarine-* 系列和 ws
3. **EPK 兼容性**：导出的 .epk 文件经验证可在 Eaglercraft 客户端导入
4. **实时视图**：http://localhost:8080/ 提供 3D 预览和监督面板
5. **审批模式**：可通过 `--approve` 参数开启（需额外实现）
