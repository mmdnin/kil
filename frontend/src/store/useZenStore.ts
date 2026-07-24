import { create } from 'zustand';
import type { RowData, GalleryTemplate } from '../types';

// WASM module placeholder - will be loaded dynamically
let wasmModule: any = null;

const loadWasm = async () => {
  if (!wasmModule) {
    wasmModule = await import('../wasm/zen_core.js');
  }
  return wasmModule;
};

interface ZenState {
  // Database state
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Data state
  rows: RowData[];
  columns: string[];
  currentTemplate: string;
  templates: Record<string, GalleryTemplate>;
  
  // UI state
  viewMode: 'table' | 'gallery';
  previewOpen: boolean;
  previewItem: RowData | null;
  selectedRowId: number | null;
  
  // Actions
  initialize: () => Promise<void>;
  loadZlFile: (bytes: Uint8Array) => Promise<void>;
  saveZlFile: () => Promise<Uint8Array>;
  addRow: (data: Partial<RowData>) => void;
  updateRow: (rowId: number, data: Partial<RowData>) => void;
  deleteRow: (rowId: number) => void;
  renameColumn: (oldName: string, newName: string) => Promise<void>;
  addColumn: (name: string, type: string) => Promise<void>;
  setViewMode: (mode: 'table' | 'gallery') => void;
  setTemplate: (templateId: string) => void;
  openPreview: (item: RowData) => void;
  closePreview: () => void;
}

export const useZenStore = create<ZenState>((set, get) => ({
  isInitialized: false,
  isLoading: false,
  error: null,
  rows: [],
  columns: ['_row_id', 'col_1', 'col_2', 'col_3', 'col_4', 'col_5'],
  currentTemplate: 'notes',
  templates: {},
  viewMode: 'table',
  previewOpen: false,
  previewItem: null,
  selectedRowId: null,

  initialize: async () => {
    set({ isLoading: true, error: null });
    try {
      // Import WASM module dynamically
      const wasm = await loadWasm();
      await wasm.init_db();
      
      // Load default templates
      const defaultTemplates = await import('../templates');
      set({ 
        templates: defaultTemplates.TEMPLATES,
        isInitialized: true,
        isLoading: false 
      });
    } catch (err) {
      set({ 
        error: err instanceof Error ? err.message : 'Failed to initialize',
        isLoading: false 
      });
    }
  },

  loadZlFile: async (bytes: Uint8Array) => {
    set({ isLoading: true, error: null });
    try {
      const wasm = await loadWasm();
      await wasm.load_zl(bytes);
      
      // Reload data after loading file
      const result = await wasm.query('SELECT * FROM data ORDER BY _row_id', '[]');
      const data = JSON.parse(result);
      
      set({ 
        rows: data,
        isLoading: false,
        isInitialized: true
      });
    } catch (err) {
      set({ 
        error: err instanceof Error ? err.message : 'Failed to load file',
        isLoading: false 
      });
    }
  },

  saveZlFile: async () => {
    const wasm = await loadWasm();
    return wasm.save_zl();
  },

  addRow: (data: Partial<RowData>) => {
    set(state => ({
      rows: [...state.rows, { ...data, _row_id: Date.now() } as RowData]
    }));
  },

  updateRow: (rowId: number, data: Partial<RowData>) => {
    set(state => ({
      rows: state.rows.map(row => 
        row._row_id === rowId ? { ...row, ...data } : row
      )
    }));
  },

  deleteRow: (rowId: number) => {
    set(state => ({
      rows: state.rows.filter(row => row._row_id !== rowId)
    }));
  },

  renameColumn: async (oldName: string, newName: string) => {
    const wasm = await loadWasm();
    await wasm.rename_column('data', oldName, newName);
    set(state => ({
      columns: state.columns.map(col => col === oldName ? newName : col)
    }));
  },

  addColumn: async (name: string, type: string) => {
    const wasm = await loadWasm();
    await wasm.add_column('data', name, type);
    set(state => ({
      columns: [...state.columns, name]
    }));
  },

  setViewMode: (mode) => set({ viewMode: mode }),

  setTemplate: (templateId) => set({ currentTemplate: templateId }),

  openPreview: (item) => set({ previewOpen: true, previewItem: item }),

  closePreview: () => set({ previewOpen: false, previewItem: null }),
}));
