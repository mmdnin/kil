# ZenLib Windows 平台完整使用指南

## 📋 系统要求

- **操作系统**: Windows 10/11 (64-bit)
- **PowerShell**: 7.0+ (推荐) 或 5.1
- **磁盘空间**: 约 2GB (含工具链)

---

## 🚀 快速开始

### 步骤 1: 安装所需工具

以**管理员身份**打开 PowerShell，执行：

```powershell
cd zenlib
powershell -ExecutionPolicy Bypass -File install-tools.ps1
```

该脚本会自动安装：
- ✅ Rust (含 wasm32-unknown-unknown 目标)
- ✅ Node.js v20 LTS
- ✅ wasm-pack
- ✅ binaryen (wasm-opt)

> ⏱️ 首次安装约需 5-10 分钟（取决于网络速度）

### 步骤 2: 重启 PowerShell

安装完成后，**关闭并重新打开 PowerShell** 以刷新环境变量。

### 步骤 3: 开发模式

```powershell
.\build.ps1 --dev
```

这将：
1. 编译调试版 WASM
2. 启动 Vite 开发服务器
3. 自动打开浏览器访问 http://localhost:5173

### 步骤 4: 生产构建

```powershell
.\build.ps1 --release
```

构建产物输出到 `release/` 目录。

### 步骤 5: 本地测试

```powershell
cd release
python -m http.server 8000
# 访问 http://localhost:8000
```

---

## 🛠️ 构建命令详解

| 命令 | 说明 |
|------|------|
| `.\build.ps1 --dev` | 开发模式：调试版 WASM + Vite 热重载 |
| `.\build.ps1 --release` | 生产构建：优化版 WASM + 压缩前端 |
| `.\build.ps1 --wasm` | 仅编译 WASM (不启动前端) |
| `.\build.ps1 --frontend` | 仅构建前端 (假设 WASM 已存在) |
| `.\build.ps1 --clean` | 清理所有构建产物 |
| `.\build.ps1 --help` | 显示帮助信息 |

---

## 🔧 故障排除

### 问题 1: "无法加载文件，因为在此系统上禁止运行脚本"

**解决方案**:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### 问题 2: Rust 安装失败

**手动安装**:
1. 访问 https://rustup.rs/
2. 下载 `rustup-init.exe`
3. 运行时勾选 "Install without asking" 和 "Add to PATH"
4. 完成后执行：`rustup target add wasm32-unknown-unknown`

### 问题 3: wasm-pack 找不到

**手动安装**:
```powershell
cargo install wasm-pack
```

### 问题 4: Node.js 版本过低

**解决方案**:
1. 访问 https://nodejs.org/
2. 下载 v20 LTS 版本
3. 安装后重启 PowerShell

### 问题 5: SIMD 编译失败

这是**正常现象**，表示你的 CPU 不支持 WASM SIMD。脚本会自动降级到标准版，不影响功能。

### 问题 6: 构建时出现链接错误

尝试清理后重新构建：
```powershell
.\build.ps1 --clean
.\build.ps1 --dev
```

---

## 📦 项目结构

```
zenlib/
├── install-tools.ps1       # Windows 工具安装脚本
├── build.ps1               # Windows 构建脚本
├── rust-core/              # Rust WASM 后端
│   ├── Cargo.toml
│   └── src/
│       ├── lib.rs          # WASM 导出入口
│       ├── db.rs           # SQLite 封装
│       ├── storage.rs      # .zl 格式读写
│       └── render.rs       # Markdown 渲染
├── frontend/               # React + TypeScript 前端
│   ├── package.json
│   ├── vite.config.ts
│   └── src/
│       ├── components/     # UI 组件
│       ├── hooks/          # React Hooks
│       ├── store/          # Zustand 状态管理
│       ├── workers/        # Web Workers
│       └── templates/      # 画廊模板
└── release/                # 生产构建输出
```

---

## 🌐 GitHub Actions 自动构建

如需在 GitHub 上自动构建，创建 `.github/workflows/build.yml`:

```yaml
name: Build ZenLib

on: [push, pull_request]

jobs:
  build-windows:
    runs-on: windows-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Install Rust
      uses: dtolnay/rust-action@stable
      with:
        targets: wasm32-unknown-unknown
    
    - name: Install Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
    
    - name: Install wasm-pack
      run: cargo install wasm-pack
    
    - name: Build WASM
      run: |
        cd rust-core
        wasm-pack build --target web --out-dir ../frontend/src/wasm --release
    
    - name: Build Frontend
      run: |
        cd frontend
        npm install
        npm run build
    
    - name: Upload Artifact
      uses: actions/upload-artifact@v4
      with:
        name: zenlib-release
        path: release/
```

---

## 📝 注意事项

1. **首次构建较慢**：Rust 需要编译大量依赖，后续构建会快很多
2. **保持网络连接**：安装工具和 npm 依赖时需要访问外部源
3. **不要手动修改 `frontend/src/wasm/`**：该目录由 wasm-pack 自动生成
4. **移动端测试**：使用 Chrome DevTools 的设备模拟功能
5. **Apple 平台不支持**：本项目明确排除 Safari/iOS/macOS

---

## 📞 获取帮助

如遇到其他问题：
1. 检查 `rust-core/target/wasm32-unknown-unknown/` 下的编译日志
2. 查看 `frontend/node_modules/.vite/` 下的前端构建日志
3. 确保所有工具均为最新版本
