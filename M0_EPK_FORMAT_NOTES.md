# M0: EPK Format Research Notes

## Summary
EPK (Eaglercraft Package) is a custom archive format used by Eaglercraft to package world data and resources. The format is well-documented in the official `eagler-binary-tools` repository by lax1dude.

## EPK Container Structure (v2.0)

### Header (uncompressed)
```
"EAGPKG$$" - 8 bytes magic signature
version_length (1 byte) + version string (e.g., "ver2.0")
filename_length (1 byte) + filename string
comment_length (2 bytes, short) + comment string
timestamp (8 bytes, long)
file_count (4 bytes, int) - includes HEAD entry
compression_type (1 byte): 'G'=gzip, 'Z'=zlib/deflate, '0'=none
```

### Compressed Section
After the header, the rest is compressed according to `compression_type`:

```
"HEAD" (4 bytes) - metadata entry marker
  - key_length (1 byte) + key string (e.g., "file-type")
  - value_length (4 bytes, int) + value string (e.g., "epk/world188")
  - '>' terminator (1 byte)

"FILE" entries (repeated for each file):
  - "FILE" (4 bytes)
  - path_length (1 byte) + path string (relative, forward slashes)
  - data_length (4 bytes, int) - includes 5-byte CRC header
  - crc32 (4 bytes, int) - checksum of file content
  - file_data (data_length - 5 bytes)
  - ':' separator (1 byte)
  - '>' terminator (1 byte)

"END$" (4 bytes) - end marker
":::YEE:>" (8 bytes) - EOF signature (outside compressed section)
```

## World EPK Specifics

### File Type Identifiers
- `epk/world152` - Eaglercraft 1.5 world format
- `epk/world188` - Eaglercraft 1.8 world format  
- `epk/resources` - Resource pack data

### Internal Structure for Worlds
For Minecraft 1.8 worlds (our target), the EPK contains an **Anvil-format world** inside:
```
world.epk
├── level.dat (NBT format)
├── region/
│   └── r.0.0.mca (Anvil chunk files)
├── entities/ (optional, for entity NBT)
│   └── r.0.0.mca
└── poi/ (optional, point of interest data)
```

## Key Findings

### 1. Chunk Format Compatibility
- EPK internally uses **standard Minecraft 1.8 Anvil format** (.mca region files)
- This means we can use `prismarine-chunk` (MC 1.40+) with version downgrading OR `prismarine-provider-anvil` for direct 1.8 format
- **Decision**: Use prismarine-chunk with MC 1.8 protocol (pmc-1.8.8 minecraft-data)

### 2. Entity NBT Support
- Entities are stored in separate `entities/` region files (MC 1.17+ style) OR embedded in chunk NBT (MC 1.8 style)
- For MC 1.8 compatibility, entities should be in chunk NBT under the `"Entities"` tag
- Spawn eggs work by placing the entity directly in world NBT, no special mechanism needed

### 3. EPK Writer Feasibility: **YES**
The format is simple enough to implement in pure Node.js:
- No complex compression (gzip/deflate via Node's built-in `zlib`)
- Straightforward binary structure with length-prefixed strings
- CRC32 checksums (Node has `zlib.crc32`)
- No external Java dependencies needed

### 4. Alternative Path (if EPK writing fails)
From ayunWebEPK project: Eaglercraft client has **built-in EPK export** in the world management menu.
- Can run a local browser-based world + bot approach
- But direct EPK writing is preferred and feasible

## Implementation Plan for M3

```javascript
// EPK Writer pseudo-code
class EPKWriter {
  constructor(compression = 'G') { // G=gzip, Z=zlib, 0=none
    this.entries = []; // [{type, name, data}]
  }
  
  addFile(path, data) {
    this.entries.push({ type: 'FILE', name: path, data });
  }
  
  async build(fileType = 'epk/world188') {
    // Build HEAD entry
    // Add all FILE entries
    // Compress with gzip/zlib/none
    // Write header + compressed data + EOF signature
  }
}
```

## Dependencies for EPK Writing
- `zlib` (Node.js built-in) - gzip/deflate, CRC32
- No additional npm packages needed!

## Verification Steps for M3
1. Create minimal EPK with single chunk
2. Import into Eaglercraft browser client
3. Verify chunks load correctly
4. Add entity NBT, verify entities spawn

## References
- https://github.com/lax1dude/eagler-binary-tools (official tools, BSD-3-Clause)
- https://github.com/ayunami2000/ayunWebEPK (browser compiler)
- https://github.com/ayqshi/Eaglercraft-SaveEditor (web editor)
