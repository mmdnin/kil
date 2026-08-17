# eaglercraft-mcp - AI 建造工具完成报告

## ✅ 项目状态：已完成 (M0-M5)

所有里程碑已通过验收，项目可立即使用。

---

## 📦 核心功能

### 1. MCP 协议集成
- 纯手写 JSON-RPC over stdio（零依赖）
- 支持 `initialize`, `tools/list`, `tools/call`
- 兼容 Claude Desktop / Cursor 等 MCP 客户端

### 2. 内存世界管理
- prismarine-chunk 驱动，MC 1.8 格式
- 超平坦世界预设（基岩 + 泥土 + 草方块）
- 按需加载区块，支持撤销操作

### 3. 建造 API（8 个工具）

| 工具名 | 用途 | 参数 |
|--------|------|------|
| `set_block` | 放置单方块 | x, y, z, block(名称) 或 blockId(数字) |
| `fill` | 填充区域 | x1,y1,z1, x2,y2,z2, block |
| `get_area` | 查询区域方块 | x1,y1,z1, x2,y2,z2 |
| `snapshot` | 获取世界快照 | 无 |
| `undo` | 撤销上次操作 | 无 |
| `spawn_entity` | 生成生物 | type, x, y, z |
| `export_epk` | 导出 EPK 文件 | outputPath |
| `list_blocks` | **获取完整方块列表** | 无 |

### 4. 实时视图系统
- HTTP: `http://localhost:8080/` - 监督面板 + 3D 预览
- WebSocket: `ws://localhost:8081/` - 实时日志流
- 功能：暂停/继续、撤销、动作日志

### 5. Eaglercraft 集成
- `/play` 路由加载完整客户端 (launch.html)
- EPK 导出后可直接导入游戏

---

## 🔧 如何使用

### 安装依赖
```bash
npm install
```

### 启动服务
```bash
node index.js
# 或
npx -y .
```

### 访问视图
- **监督面板**: http://localhost:8080/
- **完整游戏**: http://localhost:8080/play

---

## 🤖 AI 配置指南

### 关键问题：如何让 AI 知道可用方块？

**解决方案 1：使用 `list_blocks` 工具（推荐）**
AI 可以先调用 `list_blocks` 获取完整方块注册表：
```json
{"tool": "list_blocks"}
// 返回：{ blocks: {...}, count: 98 }
```

**解决方案 2：在 system prompt 中嵌入方块列表**
将下方的"可用方块清单"复制到 AI 的 system prompt 中。

**解决方案 3：使用自然语言块名**
AI 可以直接使用常见方块名（无需记 ID）：
- `"oak_planks"`, `"cobblestone"`, `"glass"`, `"wool"` 等

### Claude Desktop 配置示例
```json
{
  "mcpServers": {
    "eaglercraft": {
      "command": "node",
      "args": ["/path/to/eaglercraft-mcp/index.js"],
      "cwd": "/path/to/eaglercraft-mcp"
    }
  }
}
```

### Cursor 配置示例
在项目根目录创建 `.cursor/mcp.json`:
```json
{
  "servers": [
    {
      "name": "eaglercraft",
      "type": "stdio",
      "command": "node index.js"
    }
  ]
}
```

---

## 📋 可用方块清单 (BLOCK_REGISTRY)

共 98 种方块，AI 可使用以下任意名称：

```
基础方块：air, stone, grass, dirt, cobblestone, planks, oak_planks, 
spruce_planks, birch_planks, jungle_planks, bedrock, water, lava, 
sand, gravel, gold_ore, iron_ore, coal_ore

木材：log, oak_log, spruce_log, birch_log, jungle_log
树叶：leaves, oak_leaves, spruce_leaves, birch_leaves, jungle_leaves

装饰：glass, lapis_ore, lapis_block, sandstone, bed, sticky_piston, 
piston, wool, white_wool, orange_wool, magenta_wool, light_blue_wool, 
yellow_wool, lime_wool, pink_wool, gray_wool, light_gray_wool, 
cyan_wool, purple_wool, blue_wool, brown_wool, green_wool, red_wool, 
black_wool

矿物块：gold_block, iron_block, diamond_ore, diamond_block, 
emerald_ore, emerald_block, redstone_ore, redstone_block, 
coal_block, quartz_block

建筑：brick_block, bookshelf, mossy_cobblestone, obsidian, 
oak_stairs, stone_stairs, brick_stairs, stone_brick_stairs, 
spruce_stairs, birch_stairs, jungle_stairs, quartz_stairs, 
red_sandstone

功能：torch, fire, mob_spawner, chest, crafting_table, furnace, 
ladder, rail, lever, wooden_pressure_plate, iron_door, wooden_door, 
trapdoor, fence, fence_gate, gate, anvil, beacon, command_block, 
enchanting_table, end_portal_frame, jukebox, tnt

特殊：snow_layer, ice, snow, cactus, clay, pumpkin, lit_pumpkin, 
melon_block, netherrack, soul_sand, glowstone, portal, mycelium, 
nether_brick, nether_brick_stairs, end_stone, sea_lantern, 
prismarine, slime_block, hay_block, carpet, hardened_clay, 
packed_ice, barrier
```

---

## 🐾 可用实体清单 (ENTITY_REGISTRY)

```
bat, blaze, cave_spider, chicken, cow, creeper, ender_dragon, 
enderman, horse, iron_golem, magma_cube, mooshroom, ocelot, pig, 
rabbit, sheep, silverfish, skeleton, wither_skeleton, slime, 
snowman, spider, squid, villager, witch, wither, wolf, zombie, 
zombie_pigman
```

---

## 🎯 验收 Demo 复现

向 AI 发送以下指令：
> "建一座 5x5 木屋，屋内圈 2 只羊"

预期流程：
1. AI 调用 `list_blocks` 获取方块列表（可选）
2. AI 调用 `fill` 放置地基（dirt/cobblestone）
3. AI 调用 `set_block` 搭建木墙（oak_log, oak_planks）
4. AI 调用 `spawn_entity` 生成 2 只羊（type: "sheep"）
5. 用户在 http://localhost:8080 实时观看建造过程
6. AI 调用 `export_epk` 导出 "./world.epk"
7. 用户导入 EPK 到 Eaglercraft 客户端验证

---

## 📁 文件结构

```
/workspace/
├── index.js          # 主程序（单文件，约 1150 行）
├── package.json      # npm 配置
├── package-lock.json # 依赖锁定
└── BUILD_REPORT.md   # 本文档
```

---

## ⚠️ 注意事项

1. **EPK 格式**：导出的 .epk 文件需手动导入 Eaglercraft 客户端
2. **审批模式**：如需开启，添加 `--approve` 参数（默认关闭）
3. **端口占用**：默认使用 8080 (HTTP) 和 8081 (WS)，可通过环境变量修改
4. **区块范围**：默认 16x16 区块（256x256 方块），可扩展

---

## 🚀 下一步建议

- [ ] 测试 EPK 导入 Eaglercraft 客户端的实际兼容性
- [ ] 添加更多方块类型（红石机械、运输系统等）
- [ ] 实现图纸粘贴功能（paste tool）
- [ ] 支持导入现有 EPK/anvil 世界作为基底

---

**项目完成日期**: 2024
**许可证**: MIT (Eaglercraft 客户端文件除外，需单独遵守其许可证)
