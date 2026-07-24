#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# ZenLib 统一构建脚本
# 编译 Rust WASM + 前端打包 + 生成 Release
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUST_CORE_DIR="$SCRIPT_DIR/rust-core"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
RELEASE_DIR="$SCRIPT_DIR/release"

echo "════════════════════════════════════════════════════════"
echo "  ZenLib 构建脚本"
echo "════════════════════════════════════════════════════════"
echo "工作目录: $SCRIPT_DIR"

# ═══════════════════════════════════════════════════════════
# 检查工具链
# ═══════════════════════════════════════════════════════════

check_tools() {
    local missing=()
    
    if ! command -v rustc &> /dev/null; then
        missing+=("rustc")
    fi
    
    if ! command -v cargo &> /dev/null; then
        missing+=("cargo")
    fi
    
    if ! command -v wasm-pack &> /dev/null; then
        missing+=("wasm-pack")
    fi
    
    if ! command -v node &> /dev/null; then
        missing+=("node")
    fi
    
    if ! command -v npm &> /dev/null; then
        missing+=("npm")
    fi
    
    if [[ ${#missing[@]} -gt 0 ]]; then
        echo "✗ 缺少必需工具：${missing[*]}"
        echo ""
        echo "请先运行安装脚本:"
        echo "  ./install-tools.sh"
        exit 1
    fi
    
    echo "✓ 所有必需工具已就绪"
}

# ═══════════════════════════════════════════════════════════
# 构建 WASM (开发模式)
# ═══════════════════════════════════════════════════════════

build_wasm_dev() {
    echo ""
    echo "────────────────────────────────────────────────────"
    echo "  构建 WASM (开发模式)"
    echo "────────────────────────────────────────────────────"
    
    cd "$RUST_CORE_DIR"
    
    if ! wasm-pack build --target web --out-dir ../frontend/src/wasm --dev; then
        echo "⚠ WASM 开发构建失败，尝试继续..."
    else
        echo "✓ WASM 开发构建完成"
    fi
    
    cd "$SCRIPT_DIR"
}

# ═══════════════════════════════════════════════════════════
# 构建 WASM (Release 模式)
# ═══════════════════════════════════════════════════════════

build_wasm_release() {
    echo ""
    echo "────────────────────────────────────────────────────"
    echo "  构建 WASM (Release 模式)"
    echo "────────────────────────────────────────────────────"
    
    cd "$RUST_CORE_DIR"
    
    # 检查是否有 Rust 工具链和 wasm-opt
    if ! command -v wasm-opt &> /dev/null; then
        echo "ℹ wasm-opt 未安装，将跳过优化步骤"
    fi
    
    # 尝试构建标准版
    if ! wasm-pack build --target web --out-dir ../frontend/src/wasm --release; then
        echo "⚠ WASM Release 构建失败"
        echo "  可能原因：缺少 Rust 工具链或 wasm-pack"
        echo ""
        echo "提示：请运行 ./install-tools.sh 安装所需工具"
        echo ""
        echo "优雅降级：跳过 WASM 构建，继续前端构建..."
        cd "$SCRIPT_DIR"
        return 0
    fi
    
    echo "✓ WASM Release 构建完成"
    
    # 尝试构建 SIMD 版本 (可选)
    echo ""
    echo "  尝试构建 SIMD 优化版本..."
    if RUSTFLAGS="-C target-feature=+simd128" wasm-pack build --target web --out-dir ../frontend/src/wasm_simd --release 2>/dev/null; then
        echo "  ✓ SIMD 版本构建成功"
        # 移动 SIMD 版本到正确位置
        mv ../frontend/src/wasm_simd/zen_core_simd.wasm ../frontend/src/wasm/ 2>/dev/null || true
        rm -rf ../frontend/src/wasm_simd
    else
        echo "  ℹ SIMD 版本构建跳过 (环境不支持或编译失败)"
    fi
    
    cd "$SCRIPT_DIR"
}

# ═══════════════════════════════════════════════════════════
# 安装前端依赖
# ═══════════════════════════════════════════════════════════

install_frontend_deps() {
    echo ""
    echo "────────────────────────────────────────────────────"
    echo "  安装前端依赖"
    echo "────────────────────────────────────────────────────"
    
    cd "$FRONTEND_DIR"
    
    if [[ -d "node_modules" ]]; then
        echo "ℹ node_modules 已存在，跳过安装"
        echo "  如需重新安装，请先运行：rm -rf node_modules package-lock.json"
    else
        npm install
        echo "✓ 前端依赖安装完成"
    fi
    
    cd "$SCRIPT_DIR"
}

# ═══════════════════════════════════════════════════════════
# 类型检查
# ═══════════════════════════════════════════════════════════

run_type_check() {
    echo ""
    echo "────────────────────────────────────────────────────"
    echo "  TypeScript 类型检查"
    echo "────────────────────────────────────────────────────"
    
    cd "$FRONTEND_DIR"
    
    if ! npx tsc --noEmit; then
        echo "⚠ TypeScript 类型检查发现错误"
        echo "  构建将继续，但请修复类型错误"
    else
        echo "✓ TypeScript 类型检查通过"
    fi
    
    cd "$SCRIPT_DIR"
}

# ═══════════════════════════════════════════════════════════
# 构建前端 (Release)
# ═══════════════════════════════════════════════════════════

build_frontend_release() {
    echo ""
    echo "────────────────────────────────────────────────────"
    echo "  构建前端 (Release)"
    echo "────────────────────────────────────────────────────"
    
    cd "$FRONTEND_DIR"
    
    # 清理旧的 release 目录
    rm -rf "$RELEASE_DIR"
    mkdir -p "$RELEASE_DIR"
    
    if ! npm run build -- --outDir "$RELEASE_DIR"; then
        echo "⚠ 前端构建失败"
        echo "  请检查错误日志"
        cd "$SCRIPT_DIR"
        return 1
    fi
    
    echo "✓ 前端构建完成"
    echo "  输出目录：$RELEASE_DIR"
    
    cd "$SCRIPT_DIR"
}

# ═══════════════════════════════════════════════════════════
# 生成单文件 HTML (可选)
# ═══════════════════════════════════════════════════════════

bundle_single_file() {
    echo ""
    echo "────────────────────────────────────────────────────"
    echo "  尝试生成单文件 HTML (可选)"
    echo "────────────────────────────────────────────────────"
    
    # 检查是否有 inline-source-cli
    if command -v inline-source &> /dev/null; then
        if [[ -f "$RELEASE_DIR/index.html" ]]; then
            inline-source "$RELEASE_DIR/index.html" "$RELEASE_DIR/index.bundle.html" 2>/dev/null && \
                echo "✓ 单文件 HTML 生成成功：$RELEASE_DIR/index.bundle.html" || \
                echo "ℹ 单文件 HTML 生成跳过"
        fi
    else
        echo "ℹ inline-source-cli 未安装，跳过单文件 HTML 生成"
        echo "  如需安装：npm install -g inline-source-cli"
    fi
}

# ═══════════════════════════════════════════════════════════
# 显示构建结果
# ═══════════════════════════════════════════════════════════

show_result() {
    echo ""
    echo "════════════════════════════════════════════════════════"
    echo "  构建完成!"
    echo "════════════════════════════════════════════════════════"
    echo ""
    echo "Release 目录：$RELEASE_DIR"
    echo ""
    echo "文件列表:"
    ls -la "$RELEASE_DIR" 2>/dev/null || echo "  (目录为空或不存在)"
    echo ""
    echo "使用方法:"
    echo "  cd release && python3 -m http.server 8000"
    echo "  浏览器打开：http://localhost:8000"
    echo ""
}

# ═══════════════════════════════════════════════════════════
# 主程序
# ═══════════════════════════════════════════════════════════

main() {
    local mode="${1:-release}"
    
    case "$mode" in
        dev)
            check_tools
            build_wasm_dev
            install_frontend_deps
            echo ""
            echo "开发模式准备完成!"
            echo "运行：cd frontend && npm run dev"
            ;;
        release|build)
            check_tools
            build_wasm_release
            install_frontend_deps
            run_type_check
            build_frontend_release
            bundle_single_file
            show_result
            ;;
        wasm)
            check_tools
            build_wasm_release
            ;;
        frontend)
            install_frontend_deps
            run_type_check
            build_frontend_release
            show_result
            ;;
        clean)
            echo "清理构建产物..."
            rm -rf "$RELEASE_DIR"
            rm -rf "$FRONTEND_DIR/src/wasm"
            rm -rf "$FRONTEND_DIR/node_modules"
            rm -rf "$FRONTEND_DIR/dist"
            rm -rf "$RUST_CORE_DIR/target"
            echo "✓ 清理完成"
            ;;
        *)
            echo "用法：$0 {dev|release|wasm|frontend|clean}"
            echo ""
            echo "  dev      - 开发模式 (快速构建 WASM)"
            echo "  release  - 生产构建 (完整流程)"
            echo "  wasm     - 仅构建 WASM"
            echo "  frontend - 仅构建前端"
            echo "  clean    - 清理所有构建产物"
            exit 1
            ;;
    esac
}

main "$@"
