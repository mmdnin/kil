# ═══════════════════════════════════════════════════════════════
# ZenLib Windows 构建脚本 (PowerShell)
# ═══════════════════════════════════════════════════════════════
# 用法:
#   .\build.ps1 --dev          开发模式
#   .\build.ps1 --release      生产构建
#   .\build.ps1 --wasm         仅编译 WASM
#   .\build.ps1 --frontend     仅构建前端
#   .\build.ps1 --clean        清理构建产物
# ═══════════════════════════════════════════════════════════════

param(
    [switch]$dev,
    [switch]$release,
    [switch]$wasm,
    [switch]$frontend,
    [switch]$clean,
    [switch]$help
)

$ErrorActionPreference = "Stop"
$ZenLibRoot = $PSScriptRoot
$RustCore = Join-Path $ZenLibRoot "rust-core"
$Frontend = Join-Path $ZenLibRoot "frontend"
$ReleaseDir = Join-Path $ZenLibRoot "release"

function Show-Help {
    Write-Host @"
ZenLib Windows 构建脚本

用法: .\build.ps1 [选项]

选项:
  --dev       开发模式：编译调试版 WASM + 启动 Vite 开发服务器
  --release   生产构建：编译优化版 WASM + 构建前端到 release/ 目录
  --wasm      仅编译 WASM (不构建前端)
  --frontend  仅构建前端 (假设 WASM 已存在)
  --clean     清理所有构建产物
  --help      显示此帮助信息

示例:
  .\build.ps1 --dev          # 启动开发环境
  .\build.ps1 --release      # 生产构建
  .\build.ps1 --clean        # 清理
"@ -ForegroundColor Cyan
}

function Test-RustEnv {
    if (-not (Get-Command rustc -ErrorAction SilentlyContinue)) {
        Write-Host "❌ 未检测到 Rust，请先运行 .\install-tools.ps1" -ForegroundColor Red
        return $false
    }
    if (-not (Get-Command wasm-pack -ErrorAction SilentlyContinue)) {
        Write-Host "❌ 未检测到 wasm-pack，请先运行 .\install-tools.ps1" -ForegroundColor Red
        return $false
    }
    return $true
}

function Test-NodeEnv {
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        Write-Host "❌ 未检测到 Node.js，请先运行 .\install-tools.ps1" -ForegroundColor Red
        return $false
    }
    $nodeVersion = node --version
    $majorVersion = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
    if ($majorVersion -lt 20) {
        Write-Host "❌ Node.js 版本过低 ($nodeVersion)，需要 v20+" -ForegroundColor Red
        return $false
    }
    return $true
}

function Build-Wasm {
    param(
        [string]$Profile = "dev"
    )
    
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "  编译 Rust WASM ($Profile)" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    
    if (-not (Test-RustEnv)) { exit 1 }
    
    Push-Location $RustCore
    
    try {
        if ($Profile -eq "release") {
            # Release 构建：尝试 SIMD 优化，失败则降级
            Write-Host "  📦 编译标准版 WASM..." -ForegroundColor Yellow
            
            $wasmPackArgs = @("build", "--target", "web", "--out-dir", "..\frontend\src\wasm", "--release")
            
            if (Get-Command wasm-opt -ErrorAction SilentlyContinue) {
                Write-Host "  ✅ 检测到 wasm-opt，将自动优化" -ForegroundColor Green
            } else {
                Write-Host "  ⚠️ 未检测到 wasm-opt，跳过额外优化 (非致命)" -ForegroundColor Yellow
            }
            
            & wasm-pack @wasmPackArgs
            
            if ($LASTEXITCODE -ne 0) {
                Write-Host "  ⚠️ Release 编译失败，优雅降级..." -ForegroundColor Yellow
                Write-Host "  提示：请检查 Rust 工具链是否完整" -ForegroundColor Yellow
                Pop-Location
                exit 0  # 不报错中断
            }
            
            # 尝试 SIMD 版本 (可选)
            Write-Host "  📦 尝试编译 SIMD 优化版 WASM..." -ForegroundColor Yellow
            $env:RUSTFLAGS = "-C target-feature=+simd128"
            
            $simdOutDir = "..\frontend\src\wasm_simd"
            $wasmPackSimdArgs = @("build", "--target", "web", "--out-dir", $simdOutDir, "--release")
            
            & wasm-pack @wasmPackSimdArgs
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  ✅ SIMD 版本编译成功" -ForegroundColor Green
            } else {
                Write-Host "  ⚠️ SIMD 版本编译失败 (可能 CPU 不支持)，仅使用标准版" -ForegroundColor Yellow
                if (Test-Path (Join-Path $Frontend "src\wasm_simd")) {
                    Remove-Item (Join-Path $Frontend "src\wasm_simd") -Recurse -Force
                }
            }
            
            $env:RUSTFLAGS = ""
            
        } else {
            # Dev 构建
            $wasmPackArgs = @("build", "--target", "web", "--out-dir", "..\frontend\src\wasm", "--dev")
            & wasm-pack @wasmPackArgs
            
            if ($LASTEXITCODE -ne 0) {
                Write-Host "❌ WASM 编译失败" -ForegroundColor Red
                Pop-Location
                exit 1
            }
        }
        
        Write-Host "  ✅ WASM 编译完成!" -ForegroundColor Green
        
    } finally {
        Pop-Location
    }
}

function Build-Frontend {
    param(
        [string]$Mode = "build"
    )
    
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "  构建前端 ($Mode)" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    
    if (-not (Test-NodeEnv)) { exit 1 }
    
    Push-Location $Frontend
    
    try {
        # 安装依赖
        if (-not (Test-Path "node_modules")) {
            Write-Host "  📦 安装 npm 依赖..." -ForegroundColor Yellow
            npm install
        }
        
        if ($Mode -eq "dev") {
            Write-Host "  🚀 启动 Vite 开发服务器..." -ForegroundColor Green
            Write-Host "  访问地址：http://localhost:5173" -ForegroundColor Cyan
            npm run dev
        } elseif ($Mode -eq "build") {
            Write-Host "  📦 构建生产版本..." -ForegroundColor Yellow
            npm run build
            Write-Host "  ✅ 前端构建完成! 输出目录：../release/" -ForegroundColor Green
        } elseif ($Mode -eq "preview") {
            Write-Host "  🔍 预览生产构建..." -ForegroundColor Yellow
            npm run preview
        }
        
    } finally {
        Pop-Location
    }
}

function Clean-Build {
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "  清理构建产物" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    
    $paths = @(
        (Join-Path $Frontend "src\wasm"),
        (Join-Path $Frontend "src\wasm_simd"),
        (Join-Path $Frontend "node_modules"),
        (Join-Path $Frontend "dist"),
        $ReleaseDir,
        (Join-Path $RustCore "target"),
        (Join-Path $RustCore "pkg")
    )
    
    foreach ($path in $paths) {
        if (Test-Path $path) {
            Write-Host "  🗑️ 删除：$path" -ForegroundColor Yellow
            Remove-Item $path -Recurse -Force
        }
    }
    
    Write-Host "  ✅ 清理完成!" -ForegroundColor Green
}

# ================= 主流程 =================
if ($help) {
    Show-Help
    exit 0
}

if ($clean) {
    Clean-Build
    exit 0
}

if (-not $dev -and -not $release -and -not $wasm -and -not $frontend) {
    Write-Host "⚠️ 请指定一个选项 (--dev / --release / --wasm / --frontend)" -ForegroundColor Yellow
    Show-Help
    exit 1
}

if ($wasm) {
    Build-Wasm -Profile "dev"
    exit 0
}

if ($frontend) {
    Build-Frontend -Mode "build"
    exit 0
}

if ($dev) {
    # 开发模式：先编译 WASM，再启动前端
    Build-Wasm -Profile "dev"
    Build-Frontend -Mode "dev"
    exit 0
}

if ($release) {
    # 生产构建：编译 Release WASM + 构建前端
    Build-Wasm -Profile "release"
    Build-Frontend -Mode "build"
    
    Write-Host "`n========================================" -ForegroundColor Green
    Write-Host "  🎉 生产构建完成!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "`n测试本地服务器:" -ForegroundColor Cyan
    Write-Host "  cd release" -ForegroundColor White
    Write-Host "  python -m http.server 8000" -ForegroundColor White
    Write-Host "  然后访问 http://localhost:8000" -ForegroundColor Cyan
    exit 0
}
