'use strict';

export default class WasmLoader {
  async fetchWasm(filename) {
    const response = await fetch(filename);
    const file = await response.arrayBuffer();
    return file;
  }
  async loadWasm(filename) {
    const file = await this.fetchWasm(filename);
    const wasm = await WebAssembly.instantiate(file);
    const { memory, ...functions } = wasm.instance.exports;
    return { memory, functions };
  }
}