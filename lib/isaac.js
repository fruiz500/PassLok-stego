'use strict';

import IsaacJs from './isaac-js.js';
import IsaacWasm from './isaac-wasm.js';

globalThis.isaac = new IsaacJs();

(async () => {
  globalThis.isaacWasm = new IsaacWasm();
  await isaacWasm.init();
})();