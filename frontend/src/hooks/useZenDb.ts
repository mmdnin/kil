import { useCallback } from 'react';

// WASM module type placeholder
type WasmModule = {
  init_db: () => Promise<void>;
  load_zl: (bytes: Uint8Array) => Promise<void>;
  save_zl: () => Promise<Uint8Array>;
  query: (sql: string, paramsJson: string) => Promise<string>;
  execute: (sql: string, paramsJson: string) => Promise<number>;
  render_markdown: (input: string) => Promise<string>;
  get_epub_meta: (bytes: Uint8Array) => Promise<string>;
  add_attachment: (rowId: number, col: string, filename: string, mime: string, data: Uint8Array) => Promise<number>;
  get_attachment: (id: number) => Promise<Uint8Array>;
  list_tables: () => Promise<string>;
  get_schema: (table: string) => Promise<string>;
  rename_column: (table: string, oldName: string, newName: string) => Promise<void>;
  add_column: (table: string, colName: string, colType: string) => Promise<void>;
};

let wasmModule: WasmModule | null = null;

export async function getWasmModule(): Promise<WasmModule> {
  if (!wasmModule) {
    const mod = await import('../wasm/zen_core.js');
    wasmModule = mod as unknown as WasmModule;
  }
  return wasmModule;
}

export function useZenDb() {
  const query = useCallback(async (sql: string, params: unknown[] = []): Promise<unknown[]> => {
    const wasm = await getWasmModule();
    const paramsJson = JSON.stringify(params);
    const result = await wasm.query(sql, paramsJson);
    return JSON.parse(result);
  }, []);

  const execute = useCallback(async (sql: string, params: unknown[] = []): Promise<number> => {
    const wasm = await getWasmModule();
    const paramsJson = JSON.stringify(params);
    return await wasm.execute(sql, paramsJson);
  }, []);

  const initDb = useCallback(async (): Promise<void> => {
    const wasm = await getWasmModule();
    await wasm.init_db();
  }, []);

  const loadZl = useCallback(async (bytes: Uint8Array): Promise<void> => {
    const wasm = await getWasmModule();
    await wasm.load_zl(bytes);
  }, []);

  const saveZl = useCallback(async (): Promise<Uint8Array> => {
    const wasm = await getWasmModule();
    return wasm.save_zl();
  }, []);

  const renderMarkdown = useCallback(async (input: string): Promise<string> => {
    const wasm = await getWasmModule();
    return wasm.render_markdown(input);
  }, []);

  const getEpubMeta = useCallback(async (bytes: Uint8Array): Promise<Record<string, string>> => {
    const wasm = await getWasmModule();
    const json = await wasm.get_epub_meta(bytes);
    return JSON.parse(json);
  }, []);

  const addAttachment = useCallback(async (rowId: number, col: string, filename: string, mime: string, data: Uint8Array): Promise<number> => {
    const wasm = await getWasmModule();
    return wasm.add_attachment(rowId, col, filename, mime, data);
  }, []);

  const getAttachment = useCallback(async (id: number): Promise<Uint8Array> => {
    const wasm = await getWasmModule();
    return wasm.get_attachment(id);
  }, []);

  const listTables = useCallback(async (): Promise<string[]> => {
    const wasm = await getWasmModule();
    const json = await wasm.list_tables();
    return JSON.parse(json);
  }, []);

  const getSchema = useCallback(async (table: string): Promise<Record<string, unknown>[]> => {
    const wasm = await getWasmModule();
    const json = await wasm.get_schema(table);
    return JSON.parse(json);
  }, []);

  const renameColumn = useCallback(async (table: string, oldName: string, newName: string): Promise<void> => {
    const wasm = await getWasmModule();
    await wasm.rename_column(table, oldName, newName);
  }, []);

  const addColumn = useCallback(async (table: string, colName: string, colType: string): Promise<void> => {
    const wasm = await getWasmModule();
    await wasm.add_column(table, colName, colType);
  }, []);

  return {
    query,
    execute,
    initDb,
    loadZl,
    saveZl,
    renderMarkdown,
    getEpubMeta,
    addAttachment,
    getAttachment,
    listTables,
    getSchema,
    renameColumn,
    addColumn,
  };
}
