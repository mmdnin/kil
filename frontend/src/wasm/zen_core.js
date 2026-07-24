// WASM placeholder - will be replaced by wasm-pack build output
// This file allows TypeScript to compile when WASM is not yet built

export async function init(): Promise<any> {
  throw new Error('WASM module not built. Run `wasm-pack build --target web` first.');
}

export default init;
