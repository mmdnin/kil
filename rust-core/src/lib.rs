use wasm_bindgen::prelude::*;

pub mod db;
pub mod storage;
pub mod render;

use db::{init_db as db_init, query as db_query, execute as db_execute, get_schema as db_get_schema, list_tables as db_list_tables, rename_column as db_rename_column, add_column as db_add_column};
use storage::{load_zl as storage_load, save_zl as storage_save, add_attachment as storage_add_attachment, get_attachment as storage_get_attachment};
use render::render_markdown as render_md;

#[wasm_bindgen]
pub fn init_db() -> Result<(), JsValue> {
    db_init()
}

#[wasm_bindgen]
pub fn load_zl(bytes: &[u8]) -> Result<(), JsValue> {
    storage_load(bytes)
}

#[wasm_bindgen]
pub fn save_zl() -> Result<Vec<u8>, JsValue> {
    storage_save()
}

#[wasm_bindgen]
pub fn query(sql: &str, params_json: &str) -> Result<String, JsValue> {
    db_query(sql, params_json)
}

#[wasm_bindgen]
pub fn execute(sql: &str, params_json: &str) -> Result<u32, JsValue> {
    db_execute(sql, params_json)
}

#[wasm_bindgen]
pub fn render_markdown(input: &str) -> String {
    render_md(input)
}

#[wasm_bindgen]
pub fn get_epub_meta(bytes: &[u8]) -> Result<String, JsValue> {
    use epub::book::Book;
    use std::io::Cursor;
    
    let cursor = Cursor::new(bytes);
    match Book::new(cursor) {
        Ok(book) => {
            let metadata = book.metadata();
            let mut meta_obj = serde_json::Map::new();
            meta_obj.insert("title".to_string(), serde_json::Value::String(metadata.title.unwrap_or_default()));
            meta_obj.insert("author".to_string(), serde_json::Value::String(metadata.author.unwrap_or_default()));
            meta_obj.insert("language".to_string(), serde_json::Value::String(metadata.lang.unwrap_or_default()));
            Ok(serde_json::to_string(&meta_obj).unwrap_or_else(|_| "{}".to_string()))
        }
        Err(_) => Err(JsValue::from_str("Failed to parse EPUB"))
    }
}

#[wasm_bindgen]
pub fn add_attachment(row_id: u32, col: &str, filename: &str, mime: &str, data: &[u8]) -> Result<u32, JsValue> {
    storage_add_attachment(row_id, col, filename, mime, data)
}

#[wasm_bindgen]
pub fn get_attachment(id: u32) -> Result<Vec<u8>, JsValue> {
    storage_get_attachment(id)
}

#[wasm_bindgen]
pub fn list_tables() -> Result<String, JsValue> {
    db_list_tables()
}

#[wasm_bindgen]
pub fn get_schema(table: &str) -> Result<String, JsValue> {
    db_get_schema(table)
}

#[wasm_bindgen]
pub fn rename_column(table: &str, old_name: &str, new_name: &str) -> Result<(), JsValue> {
    db_rename_column(table, old_name, new_name)
}

#[wasm_bindgen]
pub fn add_column(table: &str, col_name: &str, col_type: &str) -> Result<(), JsValue> {
    db_add_column(table, col_name, col_type)
}
