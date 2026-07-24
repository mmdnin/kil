# ═══════════════════════════════════════════════════════════════
# ZenLib Windows 环境安装脚本 (PowerShell)
# ═══════════════════════════════════════════════════════════════
# 用法：powershell -ExecutionPolicy Bypass -File install-tools.ps1
# ═══════════════════════════════════════════════════════════════

$ErrorActionPreference = "Stop"
$ZenLibRoot = $PSScriptRoot

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ZenLib Windows 环境安装脚本 v1.0" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 1. 检查并安装 Rust (rustup)
function Install-Rust {
    Write-Host "`n[1/4] 检查 Rust 环境..." -ForegroundColor Yellow
    
    if (Get-Command rustc -ErrorAction SilentlyContinue) {
        $rustVersion = rustc --version
        Write-Host "  ✅ Rust 已安装: $rustVersion" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️ 未检测到 Rust，开始安装..." -ForegroundColor Yellow
        
        # 下载 rustup-init.exe
        $InstallerUrl = "https://static.rust-lang.org/rustup/dist/x86_64-pc-windows-msvc/rustup-init.exe"
        $InstallerPath = "$env:TEMP\rustup-init.exe"
        
        Write-Host "  📥 下载 rustup-init.exe..."
        Invoke-WebRequest -Uri $InstallerUrl -OutFile $InstallerPath -UseBasicParsing
        
        Write-Host "  🔧 执行安装 (默认配置: msvc toolchain)..."
        # 静默安装：-y (确认), --default-toolchain stable, --component rust-src, --target wasm32-unknown-unknown
        Start-Process -FilePath $InstallerPath -ArgumentList "-y", "--default-toolchain", "stable", "--component", "rust-src", "--target", "wasm32-unknown-unknown", "--no-modify-path" -Wait
        
        Remove-Item $InstallerPath -Force
        
        # 刷新当前会话的环境变量
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
        
        Write-Host "  ✅ Rust 安装完成!" -ForegroundColor Green
    }
    
    # 确保 wasm32 目标已添加
    if (-not (rustup target list --installed | Select-String "wasm32-unknown-unknown")) {
        Write-Host "  📦 添加 wasm32-unknown-unknown 目标..."
        rustup target add wasm32-unknown-unknown
    }
}

# 2. 检查并安装 Node.js (v20+)
function Install-NodeJS {
    Write-Host "`n[2/4] 检查 Node.js 环境..." -ForegroundColor Yellow
    
    if (Get-Command node -ErrorAction SilentlyContinue) {
        $nodeVersion = node --version
        $majorVersion = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
        
        if ($majorVersion -ge 20) {
            Write-Host "  ✅ Node.js 已安装: $nodeVersion" -ForegroundColor Green
            return
        } else {
            Write-Host "  ⚠️ Node.js 版本过低 ($nodeVersion)，需要 v20+" -ForegroundColor Red
        }
    }
    
    Write-Host "  📥 下载 Node.js v20 LTS..."
    $NodeUrl = "https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi"
    $NodeMsi = "$env:TEMP\node-v20.msi"
    
    Invoke-WebRequest -Uri $NodeUrl -OutFile $NodeMsi -UseBasicParsing
    
    Write-Host "  🔧 执行安装..."
    Start-Process msiexec.exe -ArgumentList "/i", $NodeMsi, "/quiet", "/norestart" -Wait
    
    Remove-Item $NodeMsi -Force
    
    # 刷新环境变量
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
    
    Write-Host "  ✅ Node.js 安装完成!" -ForegroundColor Green
}

# 3. 检查并安装 wasm-pack
function Install-WasmPack {
    Write-Host "`n[3/4] 检查 wasm-pack..." -ForegroundColor Yellow
    
    if (Get-Command wasm-pack -ErrorAction SilentlyContinue) {
        $wpVersion = wasm-pack --version
        Write-Host "  ✅ wasm-pack 已安装: $wpVersion" -ForegroundColor Green
        return
    }
    
    Write-Host "  📥 下载 wasm-pack..."
    $WpUrl = "https://rustwasm.github.io/wasm-pack/installer/init.sh"
    # Windows 使用预编译二进制
    $WpZipUrl = "https://github.com/nickel-org/wasm-pack/releases/download/v0.12.1/wasm-pack-v0.12.1-x86_64-pc-windows-msvc.zip"
    $WpZip = "$env:TEMP\wasm-pack.zip"
    $WpDir = "$env:USERPROFILE\.cargo\bin"
    
    if (-not (Test-Path $WpDir)) {
        New-Item -ItemType Directory -Force -Path $WpDir | Out-Null
    }
    
    Invoke-WebRequest -Uri $WpZipUrl -OutFile $WpZip -UseBasicParsing
    
    Write-Host "  📦 解压到 $WpDir..."
    Expand-Archive -Path $WpZip -DestinationPath $WpDir -Force
    
    Remove-Item $WpZip -Force
    
    Write-Host "  ✅ wasm-pack 安装完成!" -ForegroundColor Green
}

# 4. 检查并安装 binaryen (wasm-opt)
function Install-Binaryen {
    Write-Host "`n[4/4] 检查 binaryen (wasm-opt)..." -ForegroundColor Yellow
    
    if (Get-Command wasm-opt -ErrorAction SilentlyContinue) {
        $boVersion = wasm-opt --version
        Write-Host "  ✅ binaryen 已安装: $boVersion" -ForegroundColor Green
        return
    }
    
    Write-Host "  📥 下载 binaryen..."
    # 使用较新版本的 binaryen
    $BinUrl = "https://github.com/WebAssembly/binaryen/releases/download/version_117/binaryen-version_117-x86_64-windows.tar.gz"
    $BinTar = "$env:TEMP\binaryen.tar.gz"
    $BinDir = "$env:USERPROFILE\AppData\Local\binaryen"
    
    Invoke-WebRequest -Uri $BinUrl -OutFile $BinTar -UseBasicParsing
    
    if (-not (Test-Path $BinDir)) {
        New-Item -ItemType Directory -Force -Path $BinDir | Out-Null
    }
    
    Write-Host "  📦 解压..."
    # PowerShell 7+ 支持 tar，如果是 PS5 可能需要 7zip
    if ($PSVersionTable.PSVersion.Major -ge 7) {
        tar -xzf $BinTar -C $BinDir
    } else {
        Write-Host "  ⚠️ PowerShell 版本较低，请手动解压或使用 7zip" -ForegroundColor Yellow
        Write-Host "  下载地址: $BinUrl"
        return
    }
    
    # 移动 bin 目录内容
    $BinContent = Get-ChildItem -Path "$BinDir\binaryen-version_117\bin"
    foreach ($item in $BinContent) {
        Move-Item -Path $item.FullName -Destination "$env:USERPROFILE\.cargo\bin\" -Force
    }
    
    Remove-Item $BinTar -Force
    Remove-Item "$BinDir\binaryen-version_117" -Recurse -Force
    
    Write-Host "  ✅ binaryen 安装完成!" -ForegroundColor Green
}

# ================= 主流程 =================
try {
    Install-Rust
    Install-NodeJS
    Install-WasmPack
    Install-Binaryen
    
    Write-Host "`n========================================" -ForegroundColor Green
    Write-Host "  🎉 所有工具安装完成!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "`n下一步操作:" -ForegroundColor Cyan
    Write-Host "  1. 关闭并重新打开 PowerShell (刷新环境变量)" -ForegroundColor White
    Write-Host "  2. 运行: .\build.ps1 --dev   (开发模式)" -ForegroundColor White
    Write-Host "  3. 运行: .\build.ps1 --release   (生产构建)" -ForegroundColor White
    
} catch {
    Write-Host "`n❌ 安装失败: $_" -ForegroundColor Red
    exit 1
}
