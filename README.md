# eaglercraft-mcp

让 AI 在 Eaglercraft 世界里建造的 Node 工具。通过 MCP 协议，AI 可以以创造模式在超平坦世界中建造建筑（包括用刷蛋机制放置生物），用户通过浏览器实时观看建造过程并可随时监督，最终产出 .epk 世界文件，可导入 Eaglercraft 客户端进入游玩。

## 一句话目标

`npx eaglercraft-mcp`：AI 以创造模式在超平坦世界里建造建筑（含用刷蛋机制放置生物），用户通过浏览器实时观看建造过程并可随时监督，最终产出 .epk 世界文件，可导入 Eaglercraft 客户端进入游玩。

## 快速开始

```bash
# 一键启动
npx -y eaglercraft-mcp

# 或者本地开发
npm install
npm start
```

启动后：
- **http://localhost:8080/** - 监督面板 + 简易 3D 查看器（实时监控 AI 建造过程）
- **http://localhost:8080/play** - 完整 Eaglercraft 客户端（用于最终游戏测试）
- **ws://localhost:8081/** - 监督 WebSocket（暂停/继续/撤销/日志）

## 架构

```
AI 客户端 (Claude Desktop/Cursor) --MCP stdio--> node 进程
  ├─ 内存世界（prismarine-chunk，MC 1.8 格式，超平坦：基岩 + 泥土 + 草方块）
  ├─ 建造 API：set_block / fill / spawn_entity / get_area / snapshot / undo / export_epk
  ├─ 实时视图：prismarine-viewer → http://localhost:8080
  │   ├─ 默认轨道相机 + WASD/鼠标视角的旁观者飞行相机
  │   └─ 监督面板（WebSocket）：暂停/继续、撤销、实时动作日志流
  └─ EPK 导出器：导出兼容 Eaglercraft 的 .epk 世界文件
```

## MCP Tools

| Tool | 描述 | 参数 |
|------|------|------|
| `set_block` | 放置单个方块 | `x, y, z, blockId` |
| `fill` | 填充矩形区域 | `x1, y1, z1, x2, y2, z2, blockId` |
| `spawn_entity` | 生成生物（等价刷蛋） | `type, x, y, z` |
| `get_area` | 获取区域内所有非空气方块 | `x1, y1, z1, x2, y2, z2` |
| `snapshot` | 获取当前世界完整状态 | 无 |
| `undo` | 撤销上一次操作 | 无 |
| `export_epk` | 导出为 .epk 文件 | `outputPath` |

### 支持的生物类型

`sheep`, `cow`, `pig`, `chicken`, `zombie`, `skeleton`, `creeper`, `spider`, `villager`, `horse`, `wolf`, `ocelot`

### 方块 ID 参考

- 1: stone, 2: grass, 3: dirt, 4: cobblestone, 5: wood, 6: sapling, 7: bedrock, 8: water, 10: lava, 12: sand, 14: gold_ore, 15: iron_ore, 16: coal_ore, 17: log, 20: glass, 35: wool, 43: double_stone_slab, 44: stone_slab, 98: stone_bricks, 126: wood_slab

## Claude Desktop 配置

在 `claude_desktop_config.json` 中添加：

```json
{
  "mcpServers": {
    "eaglercraft-mcp": {
      "command": "npx",
      "args": ["-y", "eaglercraft-mcp"]
    }
  }
}
```

## Cursor 配置

在项目根目录创建 `.cursor/mcp.json`：

```json
{
  "mcpServers": {
    "eaglercraft-mcp": {
      "command": "npx",
      "args": ["-y", "eaglercraft-mcp"]
    }
  }
}
```

## 验收 Demo

启动后 AI 收到"建一座 5x5 木屋，屋内圈 2 只羊"→ viewer 实时可见建造，暂停/撤销可用 → 产出 .epk → 导入 Eaglercraft 进入后屋在、羊活。

## 可选功能：审批模式

使用 `--approve` 手动开启（默认关闭）。开启后每次写操作前在页面弹确认，批准才执行。

容错铁律：审批通道自身报错/超时一律静默降级为直接执行，记日志即可，绝不阻塞建造主流程。

## 依赖

- prismarine-chunk: MC 1.8 区块格式处理
- prismarine-nbt: NBT 数据序列化
- minecraft-data: MC 1.8.9 方块/实体数据
- ws: WebSocket 通信

## 许可证

MIT

## 注意事项

- Eaglercraft 客户端文件不入库（许可证），仅提供显式手动执行的 fetch 脚本
- 纯 Node 运行时，无 Java、无编译打包、无框架
- npm bin 打包，`npx -y eaglercraft-mcp` 一键启动
