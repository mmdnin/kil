# 🦅 Eaglercraft MCP - AI 建造工具完成报告

## ✅ 项目状态：已完成 (M0-M5 全部验收通过)

本项目已成功实现"让 AI 在 Eaglercraft 世界里建造"的核心目标。通过 `npx eaglercraft-mcp` 即可启动服务，AI 助手（Claude Desktop/Cursor）可通过 MCP 协议控制 Node 进程在内存世界中建造建筑、生成生物，用户可通过浏览器实时观看并监督，最终导出 .epk 文件导入 Eaglercraft 客户端游玩。

---

## 🏗️ 架构概览

```
AI 客户端 (Claude/Cursor)
       ↓ MCP stdio (JSON-RPC)
Node 进程 (index.js)
       ├── 内存世界 (prismarine-chunk, MC 1.8 超平坦)
       ├── 建造 API (set_block, fill, spawn_entity, export_epk...)
       ├── 实时视图 (prismarine-viewer → http://localhost:8080)
       │      ├── 3D 建造预览 (轨道相机 + WASD 飞行相机)
       │      └── 监督面板 (WebSocket: 暂停/继续/撤销/日志)
       └── EPK 导出器 (兼容 Eaglercraft 1.8 格式)
```

---

## 📦 已实现功能清单

### M0 - EPK 格式侦察 ✅
- 确认 EPK 内部使用标准 Anvil 格式 (MC 1.8)
- 确认实体 NBT 兼容性 (刷蛋机制等价实现)
- 产出格式笔记 (`M0_EPK_FORMAT_NOTES.md`)

### M1 - 内存世界 + 实时视图 ✅
- **内存世界**: 基于 `prismarine-chunk` 的 1.8 超平坦世界 (基岩 + 泥土 + 草方块)
- **建造 API**: 
  - `set_block(x, y, z, type)` - 放置单方块
  - `fill(x1,y1,z1, x2,y2,z2, type)` - 区域填充
  - `get_area(x1,y1,z1, x2,y2,z2)` - 获取区域方块数据
  - `snapshot()` - 获取完整世界快照 (含方块+实体)
  - `undo()` - 撤销上一次操作
- **实时视图**: 
  - `http://localhost:8080` 提供 3D 预览
  - 集成 `launch.html` (Eaglercraft 完整版) 于 `/play` 路由
  - WASD+ 鼠标视角的旁观者飞行相机
  - 监督面板 (WebSocket): 暂停/继续/撤销/实时日志流
  - 审批模式 (--approve 手动开启): 写操作前弹窗确认 (容错降级设计)

### M2 - 实体生成 ✅
- `spawn_entity(type, x, y, z)` 支持生物:
  - 被动生物: sheep, cow, pig, chicken
  - 敌对生物: zombie, skeleton, creeper, spider
  - 其他: villager, wolf, horse
- 实体数据持久化到区块 NBT
- 快照包含实体列表供 AI 查询

### M3 - EPK 导出验证 ✅
- 实现 `export_epk(filename)` 函数
- 生成标准 Anvil 格式 .epk 文件
- 包含完整区块数据 + 实体 NBT
- **验证路径**: 导出文件可直接导入 Eaglercraft 客户端

### M4 - MCP 协议集成 ✅
- 手写零依赖 JSON-RPC over stdio
- 实现标准 MCP 方法:
  - `initialize` - 握手初始化
  - `tools/list` - 列出所有可用工具
  - `tools/call` - 调用指定工具
- 每个 Tool 附带详细 description (AI 的唯一说明书)
- 内置 --approve 审批模式支持

### M5 - 打包发布 ✅
- `package.json` 配置 bin 入口
- 支持 `npx -y eaglercraft-mcp` 一键启动
- README 含 Claude Desktop / Cursor 的 MCP 配置样例
- npm pack 验证通过

---

## 🚀 快速开始

### 1. 安装依赖
```bash
cd /workspace
npm install
```

### 2. 启动服务
```bash
# 直接运行
node index.js

# 或通过 npx (安装后)
npx -y eaglercraft-mcp

# 带审批模式
node index.js --approve
```

### 3. 配置 AI 客户端

#### Claude Desktop 配置 (`claude_desktop_config.json`)
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

#### Cursor 配置
在项目根目录创建 `.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "eaglercraft": {
      "command": "node",
      "args": ["/absolute/path/to/workspace/index.js"]
    }
  }
}
```

### 4. 开始建造
向 AI 发送指令:
> "建一座 5x5 木屋，屋内圈 2 只羊"

AI 将自动调用 MCP 工具完成建造，您可在 `http://localhost:8080` 实时观看过程。

---

## 🌐 访问端点

| 端点 | 用途 |
|------|------|
| `http://localhost:8080/` | 监督面板 + 简易 3D 预览 (实时监控 AI 建造) |
| `http://localhost:8080/play` | 完整 Eaglercraft 客户端 (加载当前世界进行测试) |

---

## 🛠️ 可用 MCP 工具

| 工具名 | 参数 | 说明 |
|--------|------|------|
| `set_block` | `{x,y,z,type}` | 在指定坐标放置方块 |
| `fill` | `{x1,y1,z1,x2,y2,z2,type}` | 填充矩形区域 |
| `spawn_entity` | `{type,x,y,z}` | 生成生物 (等价刷蛋) |
| `get_area` | `{x1,y1,z1,x2,y2,z2}` | 获取区域方块数据 (供 AI 感知) |
| `snapshot` | 无 | 获取完整世界快照 (方块 + 实体) |
| `undo` | 无 | 撤销上一次建造操作 |
| `export_epk` | `{filename}` | 导出世界为 .epk 文件 |

---

## 📝 技术细节

### 依赖最小化
仅使用以下纯 JS 库 (无原生编译模块):
- `prismarine-chunk` - 内存区块管理 (MC 1.8 格式)
- `prismarine-viewer` - 3D 渲染
- `ws` - WebSocket 通信
- `prismarine-provider-anvil` - EPK 导出 (按需)

### 容错设计
- 审批通道报错/超时 → 静默降级为直接执行，记录日志但不阻塞主流程
- MCP 调用失败 → 返回标准错误格式，不崩溃进程
- 世界数据异常 → 边界检查 + 默认值兜底

### 性能优化
- `get_area` 按需切片，控制 token 消耗
- 增量更新 viewer，避免全量重绘
- 实体数据懒加载

---

## 🎯 验收 Demo 复现

1. 启动服务: `node index.js`
2. 打开 `http://localhost:8080` 确认视图正常
3. 向 AI 发送: "建一座 5x5 木屋，屋内圈 2 只羊"
4. 观察 viewer 中实时建造过程
5. 测试暂停/撤销功能
6. AI 调用 `export_epk("house.epk")`
7. 在 Eaglercraft 客户端导入 `house.epk`
8. **验证**: 房屋存在，两只羊存活并可互动

---

## 📂 项目结构

```
/workspace
├── index.js              # 主程序 (MCP 服务器 + 建造 API + HTTP/WebSocket)
├── package.json          # 依赖配置 + bin 入口
├── package-lock.json     # 依赖锁定
├── M0_EPK_FORMAT_NOTES.md  # EPK 格式调研报告
├── README.md             # 本文档
├── test_mcp.js           # MCP 协议测试脚本
└── launch.html           # Eaglercraft 客户端 (GitHub 托管，运行时动态加载)
```

---

## ⚠️ 注意事项

1. **许可证**: Eaglercraft 客户端文件 (`launch.html`) 不入库，需手动从 GitHub 分支获取
2. **端口占用**: 默认使用 8080 端口，如有冲突请修改代码中的 `PORT` 常量
3. **内存限制**: 超大建筑可能消耗较多内存，建议分区域建造
4. **浏览器兼容**: viewer 需要 WebGL 支持，推荐使用 Chrome/Firefox 最新版

---

## 🔮 后续扩展建议

- [ ] 支持更多实体类型 (村民交易、宠物驯服等)
- [ ] 图纸系统: 导入/导出 JSON 格式建筑蓝图
- [ ] 多人协作: 多客户端同时观看/监督
- [ ] 命令方块支持: 实现红石逻辑自动化
- [ ] 材质包自定义: 允许替换默认纹理

---

## 🙏 致谢

- [PrismarineJS](https://github.com/PrismarineJS) 提供的优秀 Node.js Minecraft 库
- [Eaglercraft](https://github.com/LAX1DUDE/eaglercraft) 团队实现的浏览器版 Minecraft
- [Model Context Protocol](https://modelcontextprotocol.io/) 提供的 AI 通信标准

---

**项目完成日期**: 2024
**版本**: v0.1.0
**状态**: ✅ 生产就绪

> "让 AI 在 Minecraft 世界里自由建造" —— 愿景已实现
