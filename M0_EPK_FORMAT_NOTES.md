# M0 侦察报告：EPK 格式分析

## 来源
- EaglercraftX 1.8.8 源码 (Eaglercraft-Archive/Eaglercraftx-1.8.8-src)
- 关键文件：
  - `EPKCompiler.java` - EPK 写入器
  - `EPKDecompiler.java` - EPK 读取器
  - `WorldConverterEPK.java` - 世界导入/导出逻辑

## EPK 容器结构 (v2.0)

### 文件头 (Header)
```
字节 0-7:   "EAGPKG$$" (魔数)
字节 8-14:  "6ver2.0" (版本号，ASCII)
字节 15:    文件名长度 N (1 byte)
字节 16-(16+N-1): 文件名 (如 "world.epk")
字节 (16+N)-(16+N+1): 注释长度 M (2 bytes, big-endian)
字节 ...:   注释内容 (UTF-8 ASCII)
字节 ...:   时间戳 (8 bytes, long, big-endian)
字节 ...:   文件总数 (4 bytes, int, big-endian) - 初始为 0xFF, 最后回填
字节 ...:   压缩类型 (1 byte):
            - '0' = 无压缩
            - 'G' = GZIP
            - 'Z' = ZLIB/Deflate
```

### 数据区 (Data Section)
每个条目格式：
```
HEAD 标记 (4 bytes): "HEAD"
键名长度 L (1 byte)
键名 (L bytes, ASCII): 如 "file-type", "world-name", 或文件路径
值长度 (4 bytes, int, big-endian)
值数据 (变长)
结束符 (1 byte): '>'
```

特殊元数据条目：
- `file-type`: 类型标识，如 "epk/world188" (表示 1.8.8 世界)
- `world-name`: 世界名称
- `world-owner`: 世界所有者 (可选)

文件条目格式 (`FILE` 类型)：
```
FILE 标记 (4 bytes): "FILE"
文件名长度 L (1 byte)
文件名 (L bytes, ASCII): 如 "level.dat", "region/r.0.0.mca"
总长度 (4 bytes): 数据长度 + 5 (包含 CRC)
CRC32 (4 bytes): 数据的 CRC32 校验和
数据内容 (变长): 原始字节
结束符 (2 bytes): ':>'
```

### 文件尾 (Footer)
```
END$ 标记 (4 bytes): "END$"
结束码 (8 bytes): ":::YEE:>"
```

## 内部文件格式

EPK 内部包含标准的 Minecraft 1.8 Anvil 世界文件：
- `level.dat` - 世界元数据 (NBT 格式，GZIP 压缩)
- `level.dat_old` - 备份
- `region/r.x.z.mca` - 区块文件 (Anvil 格式)
- `players/*.dat` - 玩家数据
- `data/*.dat` - 额外数据 (村庄、地图等)
- `spigot.yml`, `bukkit.yml` 等 (如果是 Spigot/Paper 服务器)

**关键点**: EPK 只是容器格式，内部区块是标准 1.8 Anvil 格式，与 prismarine-chunk 完全兼容。

## 实体 NBT 兼容性

从 `WorldConverterEPK.java` 可见：
- EPK 直接打包原始的 `level.dat` 和区块文件
- 实体数据存储在区块 NBT 中，格式为标准 Minecraft 1.8 NBT
- 使用 `CompressedStreamTools.readCompressed/writeCompressed` 处理 NBT

**结论**: prismarine-nbt 可以读写实体 NBT，完全兼容。

## Node.js 实现可行性

### 可纯 JS 实现的部分：
1. **EPK 头部/尾部** - 简单字节操作
2. **条目序列化** - ASCII 字符串 + 长度前缀
3. **CRC32** - 可用纯 JS 实现或使用现有库
4. **GZIP/Deflate** - Node.js 内置 `zlib` 模块

### 依赖需求：
- `zlib` (Node.js 内置) - GZIP/Deflate 压缩
- `crc32` 计算 - 可手写或找轻量库
- `prismarine-nbt` (已安装) - NBT 读写
- `prismarine-chunk` (已安装) - 区块序列化

### 无需额外依赖的理由：
- CRC32 可手写 (约 30 行代码)
- GZIP 用 Node.js 内置 `zlib.gzipSync`
- 字节操作用 Node.js Buffer API

## EPK Writer 实现方案

```javascript
// 伪代码结构
class EPKWriter {
  constructor(name, owner, type = "epk/world188") {
    this.entries = [];
    this.name = name;
    this.owner = owner;
    this.type = type;
  }
  
  addFile(path, data) {
    this.entries.push({ type: 'FILE', name: path, data });
  }
  
  complete() {
    // 1. 构建 header
    // 2. 序列化所有条目
    // 3. 计算 CRC32
    // 4. 应用 GZIP (可选)
    // 5. 写 footer
    // 6. 回填文件总数
    return Buffer;
  }
}
```

## 验证步骤

1. 创建简单 EPK (含 level.dat + 1 个区块)
2. 导入 Eaglercraft 客户端
3. 确认世界可加载、建筑存在

## 风险与备选

### 风险：
- EPK 校验和错误导致无法导入
- 压缩格式不兼容
- NBT 序列化差异

### 备选方案 (M3 提及)：
如果 EPK 写入受阻，采用：
- 浏览器宿主 LAN 世界
- bot 通过 WebRTC 接入建造
- 使用 Eaglercraft 内置导出菜单生成 EPK

## 许可证注意

Eaglercraft 源码有专有许可证，不能直接复制代码。但 EPK 格式是公开的结构规范，可以独立实现。

---

**结论**: EPK writer 完全可行，纯 Node.js 可实现，无需 Java/编译。
