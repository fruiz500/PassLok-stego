'use strict';

const randomSeed = function generateRandomString() {
  let seed = '';
  const alphabet = 'abcdefghijklmnopqrstuvwxyz';
  for (let i = 0; i < Math.ceil(Math.random() * 50); i++) {
    seed += alphabet[~~(Math.random() * alphabet.length)];
  }
  return seed;
}

globalThis.test = function checkIfIsaacJSandIsaacWASMproduceIdenticalOutput() {

  isaacWasm.init(); 

  console.time('test()');
  const seed = randomSeed();
  console.debug('seed', seed);
  const runs = 10;
  let jsArr;
  let wasmArr;

  isaac.seed(seed); isaacWasm.seed(seed);

  for (let i = 0; i < 10; i++) {
    console.log(isaac.rand(), isaacWasm.rand());
    console.assert(isaac.rand() === isaacWasm.rand(), 'TEST FAILED');
  }

  isaac.prng(runs); isaacWasm.prng(runs);

  for (let i = 0; i < 10; i++) {
    console.assert(isaac.rand() === isaacWasm.rand(), 'TEST FAILED');
  }

  isaac.prng(runs); isaacWasm.prng(runs);

  for (let i = 0; i < 10; i++) {
    console.assert(isaac.random() === isaacWasm.random(), 'TEST FAILED');
  }

  console.time('1000 random floats - JS');
  jsArr = new Array(1_000).fill(0).map(entry => isaac.rand());
  console.timeEnd('1000 random floats - JS');

  console.time('1000 random floats - WASM');
  wasmArr = isaacWasm.rand(1_000);
  console.timeEnd('1000 random floats - WASM');

  for (let i in jsArr) {
    console.assert(jsArr[i] === wasmArr[i], 'TEST FAILED');
  }

  console.time('1000 random ints - JS');
  jsArr = new Array(1_000).fill(0).map(entry => isaac.random());
  console.timeEnd('1000 random ints - JS');

  console.time('1000 random ints - WASM');
  wasmArr = isaacWasm.random(1_000);
  console.timeEnd('1000 random ints - WASM');

  for (let i in jsArr) {
    console.assert(jsArr[i] === wasmArr[i], 'TEST FAILED');
  }

  console.timeEnd('test()');
  return 'Testing completed.';
}


