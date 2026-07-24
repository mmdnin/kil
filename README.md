# ZenLib (.zl) - 个人知识库系统

[![Build and Release](https://github.com/YOUR_USERNAME/zenlib/actions/workflows/build.yml/badge.svg)](https://github.com/YOUR_USERNAME/zenlib/actions/workflows/build.yml)

**ZenLib** 是一个完全离线的个人知识库管理系统，支持多种内容类型（书籍、影视、音乐、日记、笔记等），采用 `.zl` 专有格式存储，所有数据本地化，零网络请求。

## ✨ 特性

- 📦 **单一文件格式** - 所有数据存储在 `.zl` 文件中（SQLite + zstd 压缩 + MessagePack 序列化）
- 🚀 **WASM 加速** - Rust 编译为 WebAssembly，提供高性能数据库操作
- 📊 **双视图模式** - Excel 表格视图 + 画廊视图（7 种预设模板）
- 📖 **多格式预览** - Markdown、EPUB、Mermaid 图表、PDF、音视频等
- 📱 **响应式设计** - PC 侧栏预览 / 移动全屏预览
- ♿ **无障碍支持** - WCAG 2.2 AA 标准，键盘导航，400% 缩放
- 🔒 **完全离线** - 无 CDN、无后端、无网络请求

## 🛠️ 技术栈

### Rust (WASM)
- `wasm-bindgen` - WASM 桥接
- `rusqlite` - SQLite 数据库
- `zstd` - 压缩算法
- `rmp-serde` - MessagePack 序列化
- `pulldown-cmark` - Markdown 渲染
- `epub` - EPUB 元数据提取

### Frontend
- React 18 + TypeScript
- Vite 构建工具
- Zustand 状态管理
- TailwindCSS 样式
- @tanstack/react-virtual 虚拟滚动
- epubjs EPUB 阅读
- mermaid.js 图表渲染（Web Worker）

## 📋 前置要求

### 必需工具
- **Rust** (stable) + `wasm32-unknown-unknown` 目标
- **wasm-pack**
- **Node.js** >= 18
- **npm** >= 9

### 可选工具
- **wasm-opt** (来自 binaryen) - WASM 优化
- **inline-source-cli** - 单文件 HTML 打包

## 🚀 快速开始

### 1. 安装工具链

```bash
# Linux / macOS
./install-tools.sh

# Windows (WSL2)
./install-tools.sh

# 或手动安装
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup target add wasm32-unknown-unknown
curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
```

### 2. 开发模式

```bash
# 一键构建并启动开发服务器
./setup-and-build.sh dev
cd frontend && npm run dev
```

### 3. 生产构建

```bash
# 完整 Release 构建
./setup-and-build.sh release

# 启动本地服务器查看结果
cd release && python3 -m http.server 8000
# 浏览器打开 http://localhost:8000
```

### 4. 其他命令

```bash
# 仅构建 WASM
./setup-and-build.sh wasm

# 仅构建前端
./setup-and-build.sh frontend

# 清理所有构建产物
./setup-and-build.sh clean
```

## 📁 项目结构

```
zenlib/
├── install-tools.sh           # 工具安装脚本
├── setup-and-build.sh         # 统一构建脚本
├── rust-core/                 # Rust WASM 后端
│   ├── Cargo.toml
│   └── src/
│       ├── lib.rs             # WASM 导出入口
│       ├── db.rs              # SQLite 封装
│       ├── storage.rs         # .zl 格式读写
│       └── render.rs          # Markdown 渲染
├── frontend/                  # React + TypeScript 前端
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── store/
│       │   └── useZenStore.ts
│       ├── hooks/
│       │   ├── useZenDb.ts
│       │   └── usePreview.ts
│       ├── workers/
│       │   └── mermaid.worker.ts
│       ├── components/
│       │   ├── FileDropZone.tsx
│       │   ├── TableView/
│       │   ├── GalleryView/
│       │   ├── PreviewModal/
│       │   └── ExportButton.tsx
│       └── templates/
│           ├── book.json
│           ├── movie.json
│           └── ...
└── release/                   # 生产构建输出
```

## 📄 .zl 文件格式

```
偏移  大小    字段              说明
─────────────────────────────────────────────────────
0     8B     Magic             固定 ASCII "ZENLIB01"
8     1B     Version           当前 = 0x01
9     1B     Flags             bit0: SIMD 优化标记
                               bit1: 包含附件 BLOB
10    4B     PayloadLength     u32 小端序，Payload 字节数
14    NB     Payload           zstd(MessagePack({ "db": <SQLite 完整.db 字节> }))
```

## 🎨 预设模板

| 模板 | 用途 | 封面字段 | 标题字段 |
|------|------|----------|----------|
| book | 书库 | col_3 (海报) | col_1 (名称) |
| movie | 影视库 | col_3 (海报) | col_1 (名称) |
| music | 音乐库 | col_3 (封面) | col_1 (曲名) |
| diary | 日记库 | col_4 (图片) | col_1 (标题) |
| dictionary | 词典 | 无 | col_1 (词条) |
| idea | Idea 记录 | 无 | col_1 (标题) |
| notes | 学习笔记 | col_4 (封面) | col_1 (标题) |

## 🌐 CI/CD

本项目包含 GitHub Actions 工作流配置：

- **Build**: 自动构建 WASM + 前端
- **Deploy Pages**: 部署到 GitHub Pages
- **Release**: 创建 GitHub Release 并上传产物

### 启用 GitHub Pages

1. 进入仓库 Settings → Pages
2. Source 选择 "GitHub Actions"
3. 推送到 main 分支后自动部署

### 发布新版本

```bash
git tag v1.0.0
git push origin v1.0.0
```

Actions 会自动创建 Release 并上传构建产物。

## ⚠️ 注意事项

- **不支持 Apple 平台** - 排除 Safari、iOS、iPadOS
- **零网络请求** - 所有资源必须本地化
- **TypeScript 严格模式** - 禁止使用 `any` 类型（WASM 桥接层除外）
- **虚拟滚动** - 避免一次性渲染超过 100 个 DOM 节点

## 📝 License

MIT License

## 🤝 Contributing

欢迎提交 Issue 和 Pull Request！
