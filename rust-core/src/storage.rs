use wasm_bindgen::prelude::*;
use rusqlite::Connection;
use serde::{Serialize, Deserialize};
use std::collections::HashMap;
use std::cell::RefCell;

thread_local! {
    static ATTACHMENTS: RefCell<HashMap<u32, AttachmentData>> = RefCell::new(HashMap::new());
}

#[derive(Clone, Serialize, Deserialize)]
struct AttachmentData {
    row_id: u32,
    col_name: String,
    filename: String,
    mime_type: String,
    data: Vec<u8>,
    size: u32,
}

// FALLBACK: Using simple in-memory storage for attachments instead of SQLite BLOBs
// due to WASM serialization complexity with rusqlite's blob handling

const ZENLIB_MAGIC: &[u8] = b"ZENLIB01";
const ZENLIB_VERSION: u8 = 0x01;

#[wasm_bindgen]
pub fn load_zl(bytes: &[u8]) -> Result<(), JsValue> {
    // Validate magic header
    if bytes.len() < 14 {
        return Err(JsValue::from_str("Invalid .zl file: too short"));
    }
    
    if &bytes[0..8] != ZENLIB_MAGIC {
        return Err(JsValue::from_str("Invalid .zl file: bad magic"));
    }
    
    let version = bytes[8];
    if version != ZENLIB_VERSION {
        return Err(JsValue::from_str(&format!("Unsupported .zl version: {}", version)));
    }
    
    // Read flags and payload length (little-endian u32)
    let _flags = bytes[9];
    let payload_len = u32::from_le_bytes([bytes[10], bytes[11], bytes[12], bytes[13]]) as usize;
    
    if bytes.len() < 14 + payload_len {
        return Err(JsValue::from_str("Invalid .zl file: truncated payload"));
    }
    
    let payload = &bytes[14..14 + payload_len];
    
    // Decompress with zstd
    let decompressed = zstd::decode_all(payload).map_err(|e| JsValue::from_str(&format!("Decompression failed: {}", e)))?;
    
    // Deserialize MessagePack
    let db_data: HashMap<String, Vec<u8>> = rmp_serde::from_slice(&decompressed)
        .map_err(|e| JsValue::from_str(&format!("Deserialization failed: {}", e)))?;
    
    // Load database
    if let Some(db_bytes) = db_data.get("db") {
        use crate::db::get_conn;
        let conn = get_conn()?;
        
        // FALLBACK: Simple approach - deserialize by executing SQL statements
        // In production, would use sqlite3_deserialize
        let sql_statements: Vec<String> = serde_json::from_slice(db_bytes)
            .unwrap_or_default();
        
        for stmt in sql_statements {
            let _ = conn.execute_batch(&stmt);
        }
    }
    
    // Load attachments
    if let Some(att_bytes) = db_data.get("attachments") {
        let atts: Vec<AttachmentData> = rmp_serde::from_slice(att_bytes).unwrap_or_default();
        let mut store = ATTACHMENTS.with(|a| a.borrow_mut());
        for (i, att) in atts.into_iter().enumerate() {
            store.insert(i as u32, att);
        }
    }
    
    Ok(())
}

#[wasm_bindgen]
pub fn save_zl() -> Result<Vec<u8>, JsValue> {
    use crate::db::get_conn;
    let conn = get_conn()?;
    
    // Export database as SQL statements (FALLBACK approach)
    let mut sql_statements = Vec::new();
    
    // Get all table names
    let mut stmt = conn.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").map_err(|e| JsValue::from_str(&e.to_string()))?;
    let tables: Vec<String> = stmt.query_map([], |row| row.get(0))
        .map_err(|e| JsValue::from_str(&e.to_string()))?
        .filter_map(|r| r.ok())
        .collect();
    
    for table in tables {
        // Get CREATE TABLE statement
        let mut stmt = conn.prepare(&format!("SELECT sql FROM sqlite_master WHERE type='table' AND name=?",))
            .map_err(|e| JsValue::from_str(&e.to_string()))?;
        let create_sql: String = stmt.query_row([&table], |row| row.get(0))
            .unwrap_or_default();
        sql_statements.push(create_sql);
        
        // Get all rows
        let mut stmt = conn.prepare(&format!("SELECT * FROM {}", table))
            .map_err(|e| JsValue::from_str(&e.to_string()))?;
        let column_names: Vec<String> = stmt.column_names().iter().map(|s| s.to_string()).collect();
        
        let rows = stmt.query_map([], |row| {
            let mut values = Vec::new();
            for i in 0..column_names.len() {
                let val: String = row.get::<_, String>(i).unwrap_or_else(|_| "NULL".to_string());
                values.push(val);
            }
            Ok(values)
        })
        .map_err(|e| JsValue::from_str(&e.to_string()))?;
        
        for row_result in rows {
            if let Ok(values) = row_result {
                let vals_str = values.iter().map(|v| format!("'{}'", v.replace("'", "''"))).collect::<Vec<_>>().join(", ");
                sql_statements.push(format!("INSERT INTO {} ({}) VALUES ({})", table, column_names.join(", "), vals_str));
            }
        }
    }
    
    let db_bytes = serde_json::to_vec(&sql_statements).unwrap_or_default();
    
    // Get attachments
    let atts: Vec<AttachmentData> = ATTACHMENTS.with(|a| a.borrow().values().cloned().collect());
    let att_bytes = rmp_serde::to_vec(&atts).unwrap_or_default();
    
    // Create payload
    let mut payload_data = HashMap::new();
    payload_data.insert("db".to_string(), db_bytes);
    payload_data.insert("attachments".to_string(), att_bytes);
    
    let payload = rmp_serde::to_vec(&payload_data).unwrap_or_default();
    
    // Compress with zstd
    let compressed = zstd::encode_all(&payload[..], 3).map_err(|e| JsValue::from_str(&format!("Compression failed: {}", e)))?;
    
    // Build final file
    let mut result = Vec::new();
    result.extend_from_slice(ZENLIB_MAGIC);
    result.push(ZENLIB_VERSION);
    result.push(0x00); // flags
    result.extend_from_slice(&(compressed.len() as u32).to_le_bytes());
    result.extend_from_slice(&compressed);
    
    Ok(result)
}

#[wasm_bindgen]
pub fn add_attachment(row_id: u32, col: &str, filename: &str, mime: &str, data: &[u8]) -> Result<u32, JsValue> {
    let att = AttachmentData {
        row_id,
        col_name: col.to_string(),
        filename: filename.to_string(),
        mime_type: mime.to_string(),
        data: data.to_vec(),
        size: data.len() as u32,
    };
    
    ATTACHMENTS.with(|a| {
        let mut store = a.borrow_mut();
        let id = store.len() as u32;
        store.insert(id, att);
        id
    })
}

#[wasm_bindgen]
pub fn get_attachment(id: u32) -> Result<Vec<u8>, JsValue> {
    ATTACHMENTS.with(|a| {
        let store = a.borrow();
        store.get(&id)
            .map(|att| att.data.clone())
            .ok_or_else(|| JsValue::from_str("Attachment not found"))
    })
}
