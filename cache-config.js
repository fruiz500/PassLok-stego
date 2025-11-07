// cache-config.js (no exports; classic worker-compatible)

// Compute a portable base relative to sw.js location
self.CACHE_BASE = new URL('.', self.location).pathname; // e.g., '/stego/'

// Bump this when you change the list
self.CACHE_NAME = 'stego-cache-v3';

// List to precache (resolve relative to CACHE_BASE)
self.FILES_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './lib/main.js',
    './lib/plstego.js',
    './lib/prng.js',
    './lib/bodyscript.js',
    './lib/jssteg.js',
    './lib/jsstegencoder.js',
    './lib/jsstegdecoder.js',
    './lib-extra/lz-string.js',
    './lib-extra/dictionary_en.js',
    './lib=extra/license.js',
    './lib-extra/purify.js',
    './favicon.ico',
    './passlok-icon128.png'
];
