#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# ZenLib 工具安装脚本
# 安装 Rust、wasm-pack、Node.js 等构建所需工具
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

echo "════════════════════════════════════════════════════════"
echo "  ZenLib 工具安装脚本"
echo "════════════════════════════════════════════════════════"

# 检测操作系统
OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
ARCH="$(uname -m)"

case "$ARCH" in
    x86_64) ARCH="x86_64" ;;
    aarch64|arm64) ARCH="aarch64" ;;
    *) echo "不支持的架构: $ARCH"; exit 1 ;;
esac

echo "检测到系统: $OS ($ARCH)"

# ═══════════════════════════════════════════════════════════
# 1. 安装 Rust (如果未安装)
# ═══════════════════════════════════════════════════════════

install_rust() {
    if command -v rustc &> /dev/null; then
        RUST_VERSION="$(rustc --version)"
        echo "✓ Rust 已安装: $RUST_VERSION"
        return 0
    fi

    echo "正在安装 Rust..."
    
    if [[ "$OS" == "linux" ]]; then
        curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain stable
        echo "✓ Rust 安装完成"
        
        # 添加环境变量到当前会话
        export PATH="$HOME/.cargo/bin:$PATH"
        echo "  已将 ~/.cargo/bin 添加到 PATH"
        
    elif [[ "$OS" == "darwin" ]]; then
        if command -v brew &> /dev/null; then
            brew install rust
            echo "✓ Rust 已通过 Homebrew 安装"
        else
            echo "警告: 未检测到 Homebrew，尝试使用 rustup..."
            curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain stable
            export PATH="$HOME/.cargo/bin:$PATH"
        fi
        
    elif [[ "$OS" == "mingw"* ]] || [[ "$OS" == "msys"* ]]; then
        echo "Windows  detected. Please install Rust from https://rustup.rs/"
        echo "或使用 WSL2 进行构建"
        return 1
    else
        echo "不支持的操作系统: $OS"
        return 1
    fi
    
    # 验证安装
    rustc --version
    cargo --version
}

# ═══════════════════════════════════════════════════════════
# 2. 添加 WASM 目标支持
# ═══════════════════════════════════════════════════════════

install_wasm_target() {
    echo "正在添加 WASM 目标支持..."
    rustup target add wasm32-unknown-unknown
    echo "✓ WASM 目标已添加"
}

# ═══════════════════════════════════════════════════════════
# 3. 安装 wasm-pack
# ═══════════════════════════════════════════════════════════

install_wasm_pack() {
    if command -v wasm-pack &> /dev/null; then
        WASM_PACK_VERSION="$(wasm-pack --version)"
        echo "✓ wasm-pack 已安装: $WASM_PACK_VERSION"
        return 0
    fi

    echo "正在安装 wasm-pack..."
    
    if [[ "$OS" == "linux" ]] || [[ "$OS" == "darwin" ]]; then
        curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
        echo "✓ wasm-pack 安装完成"
        wasm-pack --version
        
    elif [[ "$OS" == "mingw"* ]] || [[ "$OS" == "msys"* ]]; then
        echo "Windows: 请手动安装 wasm-pack:"
        echo "  cargo install wasm-pack"
        return 1
    else
        echo "不支持的操作系统: $OS"
        return 1
    fi
}

# ═══════════════════════════════════════════════════════════
# 4. 安装 Node.js (如果未安装)
# ═══════════════════════════════════════════════════════════

install_nodejs() {
    if command -v node &> /dev/null; then
        NODE_VERSION="$(node --version)"
        NPM_VERSION="$(npm --version)"
        echo "✓ Node.js 已安装: $NODE_VERSION, npm: $NPM_VERSION"
        
        # 检查版本是否 >= 18
        NODE_MAJOR="$(echo "$NODE_VERSION" | cut -d'.' -f1 | sed 's/v//')"
        if [[ "$NODE_MAJOR" -lt 18 ]]; then
            echo "⚠ 警告: Node.js 版本过低 (需要 >= 18)，当前: $NODE_VERSION"
            echo "  建议升级 Node.js"
        fi
        return 0
    fi

    echo "正在安装 Node.js..."
    
    if [[ "$OS" == "linux" ]]; then
        # 使用 NodeSource 仓库
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
        apt-get install -y nodejs
        echo "✓ Node.js 已安装"
        
    elif [[ "$OS" == "darwin" ]]; then
        if command -v brew &> /dev/null; then
            brew install node@20
            echo "✓ Node.js 已通过 Homebrew 安装"
        else
            echo "错误: 未检测到 Homebrew"
            echo "请先安装 Homebrew: /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
            return 1
        fi
        
    elif [[ "$OS" == "mingw"* ]] || [[ "$OS" == "msys"* ]]; then
        echo "Windows: 请从 https://nodejs.org/ 下载并安装 Node.js LTS"
        return 1
    else
        echo "不支持的操作系统: $OS"
        return 1
    fi
    
    node --version
    npm --version
}

# ═══════════════════════════════════════════════════════════
# 5. 安装 wasm-opt (来自 binaryen)
# ═══════════════════════════════════════════════════════════

install_wasm_opt() {
    if command -v wasm-opt &> /dev/null; then
        echo "✓ wasm-opt 已安装"
        return 0
    fi

    echo "正在安装 wasm-opt (binaryen)..."
    
    if [[ "$OS" == "linux" ]]; then
        BINARYEN_VERSION="117"
        wget -q "https://github.com/WebAssembly/binaryen/releases/download/version_${BINARYEN_VERSION}/binaryen-version_${BINARYEN_VERSION}-${ARCH}-linux.tar.gz"
        tar -xzf "binaryen-version_${BINARYEN_VERSION}-${ARCH}-linux.tar.gz"
        mv "binaryen-version_${BINARYEN_VERSION}/bin/wasm-opt" /usr/local/bin/
        mv "binaryen-version_${BINARYEN_VERSION}/bin/wasm-dis" /usr/local/bin/ 2>/dev/null || true
        rm -rf "binaryen-version_${BINARYEN_VERSION}" "binaryen-version_${BINARYEN_VERSION}-${ARCH}-linux.tar.gz"
        echo "✓ wasm-opt 已安装"
        
    elif [[ "$OS" == "darwin" ]]; then
        if command -v brew &> /dev/null; then
            brew install binaryen
            echo "✓ wasm-opt 已通过 Homebrew 安装"
        else
            echo "⚠ wasm-opt 未安装，构建将跳过优化步骤"
        fi
        
    else
        echo "⚠ wasm-opt 未安装，构建将跳过优化步骤"
    fi
    
    if command -v wasm-opt &> /dev/null; then
        wasm-opt --version
    fi
}

# ═══════════════════════════════════════════════════════════
# 6. 验证所有工具
# ═══════════════════════════════════════════════════════════

verify_installation() {
    echo ""
    echo "════════════════════════════════════════════════════════"
    echo "  验证安装"
    echo "════════════════════════════════════════════════════════"
    
    local all_ok=true
    
    if command -v rustc &> /dev/null; then
        echo "✓ rustc: $(rustc --version)"
    else
        echo "✗ rustc: 未安装"
        all_ok=false
    fi
    
    if command -v cargo &> /dev/null; then
        echo "✓ cargo: $(cargo --version)"
    else
        echo "✗ cargo: 未安装"
        all_ok=false
    fi
    
    if command -v wasm-pack &> /dev/null; then
        echo "✓ wasm-pack: $(wasm-pack --version)"
    else
        echo "✗ wasm-pack: 未安装"
        all_ok=false
    fi
    
    if command -v node &> /dev/null; then
        echo "✓ node: $(node --version)"
    else
        echo "✗ node: 未安装"
        all_ok=false
    fi
    
    if command -v npm &> /dev/null; then
        echo "✓ npm: $(npm --version)"
    else
        echo "✗ npm: 未安装"
        all_ok=false
    fi
    
    if command -v wasm-opt &> /dev/null; then
        echo "✓ wasm-opt: $(wasm-opt --version)"
    else
        echo "ℹ wasm-opt: 未安装 (可选)"
    fi
    
    echo ""
    
    if $all_ok; then
        echo "════════════════════════════════════════════════════════"
        echo "  ✓ 所有必需工具已安装完成!"
        echo "════════════════════════════════════════════════════════"
        echo ""
        echo "下一步:"
        echo "  1. cd rust-core && wasm-pack build --target web --out-dir ../frontend/src/wasm --release"
        echo "  2. cd frontend && npm install"
        echo "  3. npm run dev"
        return 0
    else
        echo "════════════════════════════════════════════════════════"
        echo "  ✗ 部分工具安装失败"
        echo "════════════════════════════════════════════════════════"
        return 1
    fi
}

# ═══════════════════════════════════════════════════════════
# 主程序
# ═══════════════════════════════════════════════════════════

main() {
    install_rust
    install_wasm_target
    install_wasm_pack
    install_nodejs
    install_wasm_opt
    verify_installation
}

main "$@"
