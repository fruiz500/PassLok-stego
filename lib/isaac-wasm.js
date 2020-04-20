'use strict';

import WasmLoader from './wasmLoader.js';
import str2ints from './string2integers.js';

export default class IsaacWasm {

  _wasmLoader = new WasmLoader();
  _wasm;

  _seed;
  _memory;
  _results;

  _ints;
  _floats;

  _seedPointer = 0;
  _memoryPointer;
  _resultsPointer;

  _outputPointer;

  async init() {
    this._wasm = await this._wasmLoader.loadWasm('../bin/isaac.wasm');
    const { buffer } = this._wasm.memory;
    const { byteLength } = buffer;

    this._seed = new Int32Array(buffer, this._seedPointer, 256);

    this._memoryPointer = this._seed.BYTES_PER_ELEMENT * this._seed.length;
    this._memory = new Int32Array(buffer, this._memoryPointer, 256);

    this._resultsPointer = this._memoryPointer + (this._memory.BYTES_PER_ELEMENT * this._memory.length);
    this._results = new Int32Array(buffer, this._resultsPointer, 256);

    this._outputPointer = this._resultsPointer + (this._results.BYTES_PER_ELEMENT * this._results.length);

    const remainingBytes = byteLength - this._outputPointer;

    this._ints = new Int32Array(buffer, this._outputPointer, remainingBytes / Int32Array.BYTES_PER_ELEMENT);
    this._floats = new Float64Array(buffer, this._outputPointer, remainingBytes / Float64Array.BYTES_PER_ELEMENT);
  }

  internals() {
    return {
      wasm: this._wasm,
      seed: this._seed,
      memory: this._memory,
      results: this._results,
      ints: this._ints,
      floats: this._floats,
      seedPointer: this._seedPointer,
      memoryPointer: this._memoryPointer,
      resultsPointer: this._resultsPointer,
      outputPointer: this._outputPointer,
    };
  }

  seed(s) {
    if (typeof s == 'string') {
      s = str2ints(s);
    }
    if (typeof s == 'number') {
      s = [s];
    }
    for (let i = 0; i < s.length; i++) {
      this._seed[i] = s[i];
    }
    this._wasm.functions.seed(this._resultsPointer, this._memoryPointer, this._seedPointer);
  }

  prng(runs) {
    this._wasm.functions.shuffle(this._resultsPointer, this._memoryPointer, runs);
  }

  rand(count) {
    if (!count) {
      return this._wasm.functions.randomInt(this._resultsPointer, this._memoryPointer);
    } else {
      this._wasm.functions.randomInts(this._resultsPointer, this._memoryPointer, this._outputPointer, count);
      return this._ints.slice(0, count);
    }
  }

  random(count) {
    if (!count) {
      return this._wasm.functions.randomFloat(this._resultsPointer, this._memoryPointer);
    } else {
      this._wasm.functions.randomFloats(this._resultsPointer, this._memoryPointer, this._outputPointer, count);
      return this._floats.slice(0, count);
    }
  }
}