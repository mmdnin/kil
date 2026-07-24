use wasm_bindgen::prelude::*;
use rusqlite::{Connection, params_from_iter};
use serde_json::{json, Value};
use std::cell::RefCell;

thread_local! {
    static DB: RefCell<Option<Connection>> = RefCell::new(None);
}

fn get_conn() -> Result<&'static mut Connection, JsValue> {
    DB.with(|db| {
        let mut db_ref = db.borrow_mut();
        if db_ref.is_none() {
            *db_ref = Some(Connection::open_in_memory().map_err(|e| JsValue::from_str(&e.to_string()))?);
        }
        Ok(db_ref.as_mut().unwrap())
    })
}

#[wasm_bindgen]
pub fn init_db() -> Result<(), JsValue> {
    let conn = get_conn()?;
    
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS _meta (
            key TEXT PRIMARY KEY,
            value TEXT
        );
        
        CREATE TABLE IF NOT EXISTS data (
            _row_id INTEGER PRIMARY KEY AUTOINCREMENT,
            _created_at TEXT DEFAULT (datetime('now')),
            _updated_at TEXT DEFAULT (datetime('now'))
        );
        
        CREATE TABLE IF NOT EXISTS attachments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            row_id INTEGER,
            col_name TEXT,
            filename TEXT,
            mime_type TEXT,
            data BLOB,
            size INTEGER,
            FOREIGN KEY (row_id) REFERENCES data(_row_id)
        );
        
        CREATE TABLE IF NOT EXISTS templates (
            id TEXT PRIMARY KEY,
            name TEXT,
            config TEXT
        );
        "
    ).map_err(|e| JsValue::from_str(&e.to_string()))?;
    
    Ok(())
}

#[wasm_bindgen]
pub fn query(sql: &str, params_json: &str) -> Result<String, JsValue> {
    let conn = get_conn()?;
    let params: Vec<Value> = serde_json::from_str(params_json).unwrap_or_default();
    
    let stmt = conn.prepare(sql).map_err(|e| JsValue::from_str(&e.to_string()))?;
    let column_names: Vec<String> = stmt.column_names().iter().map(|s| s.to_string()).collect();
    
    let rows = stmt.query_map(params_from_iter(params.iter().map(|v| match v {
        Value::Null => rusqlite::types::Value::Null,
        Value::Bool(b) => rusqlite::types::Value::Integer(*b as i64),
        Value::Number(n) => {
            if let Some(i) = n.as_i64() {
                rusqlite::types::Value::Integer(i)
            } else if let Some(f) = n.as_f64() {
                rusqlite::types::Value::Real(f)
            } else {
                rusqlite::types::Value::Integer(0)
            }
        }
        Value::String(s) => rusqlite::types::Value::Text(s.clone()),
        Value::Array(_) | Value::Object(_) => rusqlite::types::Value::Blob(vec![]),
    }))).map_err(|e| JsValue::from_str(&e.to_string()))?;
    
    let mut result = Vec::new();
    for row_result in rows {
        let row = row_result.map_err(|e| JsValue::from_str(&e.to_string()))?;
        let mut obj = serde_json::Map::new();
        for (i, col) in column_names.iter().enumerate() {
            let value: Value = match row.get_ref(i) {
                Ok(rusqlite::types::ValueRef::Null) => Value::Null,
                Ok(rusqlite::types::ValueRef::Integer(i)) => Value::Number((*i).into()),
                Ok(rusqlite::types::ValueRef::Real(f)) => Value::Number(serde_json::Number::from_f64(*f).unwrap_or(0.into())),
                Ok(rusqlite::types::ValueRef::Text(s)) => Value::String(String::from_utf8_lossy(s).to_string()),
                Ok(rusqlite::types::ValueRef::Blob(b)) => {
                    // For blobs, return base64 encoded string or metadata
                    use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};
                    Value::String(BASE64.encode(b))
                }
                Err(_) => Value::Null,
            };
            obj.insert(col.clone(), value);
        }
        result.push(Value::Object(obj));
    }
    
    Ok(serde_json::to_string(&result).unwrap_or("[]".to_string()))
}

#[wasm_bindgen]
pub fn execute(sql: &str, params_json: &str) -> Result<u32, JsValue> {
    let conn = get_conn()?;
    let params: Vec<Value> = serde_json::from_str(params_json).unwrap_or_default();
    
    let affected = conn.execute(
        sql,
        params_from_iter(params.iter().map(|v| match v {
            Value::Null => rusqlite::types::Value::Null,
            Value::Bool(b) => rusqlite::types::Value::Integer(*b as i64),
            Value::Number(n) => {
                if let Some(i) = n.as_i64() {
                    rusqlite::types::Value::Integer(i)
                } else if let Some(f) = n.as_f64() {
                    rusqlite::types::Value::Real(f)
                } else {
                    rusqlite::types::Value::Integer(0)
                }
            }
            Value::String(s) => rusqlite::types::Value::Text(s.clone()),
            Value::Array(_) | Value::Object(_) => rusqlite::types::Value::Blob(vec![]),
        }))
    ).map_err(|e| JsValue::from_str(&e.to_string()))?;
    
    Ok(affected as u32)
}

#[wasm_bindgen]
pub fn list_tables() -> Result<String, JsValue> {
    let conn = get_conn()?;
    let mut stmt = conn.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").map_err(|e| JsValue::from_str(&e.to_string()))?;
    let tables: Vec<String> = stmt.query_map([], |row| row.get(0))
        .map_err(|e| JsValue::from_str(&e.to_string()))?
        .filter_map(|r| r.ok())
        .collect();
    Ok(serde_json::to_string(&tables).unwrap_or("[]".to_string()))
}

#[wasm_bindgen]
pub fn get_schema(table: &str) -> Result<String, JsValue> {
    let conn = get_conn()?;
    let mut stmt = conn.prepare(&format!("PRAGMA table_info({})", table)).map_err(|e| JsValue::from_str(&e.to_string()))?;
    let columns: Vec<Value> = stmt.query_map([], |row| {
        Ok(json!({
            "cid": row.get::<_, i32>(0)?,
            "name": row.get::<_, String>(1)?,
            "type": row.get::<_, String>(2)?,
            "notnull": row.get::<_, i32>(3)?,
            "default_value": row.get::<_, Option<String>>(4)?,
            "pk": row.get::<_, i32>(5)?,
        }))
    })
    .map_err(|e| JsValue::from_str(&e.to_string()))?
    .filter_map(|r| r.ok())
    .collect();
    Ok(serde_json::to_string(&columns).unwrap_or("[]".to_string()))
}

#[wasm_bindgen]
pub fn rename_column(table: &str, old_name: &str, new_name: &str) -> Result<(), JsValue> {
    let conn = get_conn()?;
    let sql = format!("ALTER TABLE {} RENAME COLUMN {} TO {}", table, old_name, new_name);
    conn.execute(&sql, []).map_err(|e| JsValue::from_str(&e.to_string()))?;
    Ok(())
}

#[wasm_bindgen]
pub fn add_column(table: &str, col_name: &str, col_type: &str) -> Result<(), JsValue> {
    let conn = get_conn()?;
    let sql = format!("ALTER TABLE {} ADD COLUMN {} {}", table, col_name, col_type);
    conn.execute(&sql, []).map_err(|e| JsValue::from_str(&e.to_string()))?;
    Ok(())
}
