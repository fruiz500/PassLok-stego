/* ----------------------------------------------------------------------
 * Copyright (c) 2012 Yves-Marie K. Rinquin
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 * ----------------------------------------------------------------------
 *
 * ISAAC is a cryptographically secure pseudo-random number generator
 * (or CSPRNG for short) designed by Robert J. Jenkins Jr. in 1996 and
 * based on RC4. It is designed for speed and security.
 *
 * ISAAC's informations & analysis:
 *   http://burtleburtle.net/bob/rand/isaac.html
 * ISAAC's implementation details:
 *   http://burtleburtle.net/bob/rand/isaacafa.html
 *
 * ISAAC succesfully passed TestU01
 *
 * ----------------------------------------------------------------------
 * */

'use strict';

import str2ints from './string2integers.js';

export default class IsaacJs {

  _m = Array(256); // internal memory
  _acc = 0;        // accumulator
  _brs = 0;        // last result
  _cnt = 0;        // counter
  _r = Array(256); // result array
  _gnt = 0;        // generation counter

  add(x, y) {
    const lsb = (x & 0xffff) + (y & 0xffff);
    const msb = (x >>> 16) + (y >>> 16) + (lsb >>> 16);
    let returnVal = (msb << 16) | (lsb & 0xffff);
    return returnVal;
  }

  reset() {
    this._acc = this._brs = this._cnt = 0;
    for (let i = 0; i < 256; i++) {
      this._m[i] = this._r[i] = 0;
    }
    this._gnt = 0;
  }

  seed(s) {

    if (typeof s == 'string') {
      s = str2ints(s);
    }
    if (typeof s == 'number') {
      s = [s];
    }

    const GOLDEN_RATIO = 0x9e3779b9;
    let a = GOLDEN_RATIO;
    let b = GOLDEN_RATIO;
    let c = GOLDEN_RATIO;
    let d = GOLDEN_RATIO;
    let e = GOLDEN_RATIO;
    let f = GOLDEN_RATIO;
    let g = GOLDEN_RATIO;
    let h = GOLDEN_RATIO;

    this.reset();

    for (let i = 0; i < s.length; i++) {
      this._r[i & 0xff] += s[i];
    }

    const mixSeeds = () => {
      a ^= b << 11; d = this.add(d, a); b = this.add(b, c);
      b ^= c >>> 2; e = this.add(e, b); c = this.add(c, d);
      c ^= d << 8; f = this.add(f, c); d = this.add(d, e);
      d ^= e >>> 16; g = this.add(g, d); e = this.add(e, f);
      e ^= f << 10; h = this.add(h, e); f = this.add(f, g);
      f ^= g >>> 4; a = this.add(a, f); g = this.add(g, h);
      g ^= h << 8; b = this.add(b, g); h = this.add(h, a);
      h ^= a >>> 9; c = this.add(c, h); a = this.add(a, b);
    }

    for (let i = 0; i < 4; i++) {
      mixSeeds();
    }

    for (let i = 0; i < 256; i += 8) {
      if (s) {
        a = this.add(a, this._r[i + 0]); b = this.add(b, this._r[i + 1]);
        c = this.add(c, this._r[i + 2]); d = this.add(d, this._r[i + 3]);
        e = this.add(e, this._r[i + 4]); f = this.add(f, this._r[i + 5]);
        g = this.add(g, this._r[i + 6]); h = this.add(h, this._r[i + 7]);
      }

      mixSeeds();

      this._m[i + 0] = a; this._m[i + 1] = b; this._m[i + 2] = c; this._m[i + 3] = d;
      this._m[i + 4] = e; this._m[i + 5] = f; this._m[i + 6] = g; this._m[i + 7] = h;
    }

    if (s) {
      for (let i = 0; i < 256; i += 8) {
        a = this.add(a, this._m[i + 0]); b = this.add(b, this._m[i + 1]);
        c = this.add(c, this._m[i + 2]); d = this.add(d, this._m[i + 3]);
        e = this.add(e, this._m[i + 4]); f = this.add(f, this._m[i + 5]);
        g = this.add(g, this._m[i + 6]); h = this.add(h, this._m[i + 7]);

        mixSeeds();

        this._m[i + 0] = a; this._m[i + 1] = b; this._m[i + 2] = c; this._m[i + 3] = d;
        this._m[i + 4] = e; this._m[i + 5] = f; this._m[i + 6] = g; this._m[i + 7] = h;
      }
    }

    this.prng();
    this._gnt = 256;
  }

  prng(n) {
    let x, y;

    let runs = (n && typeof (n) === 'number') ? Math.abs(Math.floor(n)) : 1;

    while (runs--) {
      this._cnt = this.add(this._cnt, 1);
      this._brs = this.add(this._brs, this._cnt);

      for (let i = 0; i < 256; i++) {
        switch (i & 3) {
          case 0: this._acc ^= this._acc << 13; break;
          case 1: this._acc ^= this._acc >>> 6; break;
          case 2: this._acc ^= this._acc << 2; break;
          case 3: this._acc ^= this._acc >>> 16; break;
        }
        this._acc = this.add(this._m[(i + 128) & 0xff], this._acc);
        x = this._m[i];
        this._m[i] = this.add(this._m[(x >>> 2) & 0xff], this.add(this._acc, this._brs));
        y = this._m[i];
        this._r[i] = this.add(this._m[(y >>> 10) & 0xff], x);
        this._brs = this._r[i];
      }
    }
  }

  rand() {
    if (!this._gnt--) {
      this.prng(); this._gnt = 255;
    }
    return this._r[this._gnt];
  }

  internals() {
    return { a: this._acc, b: this._brs, c: this._cnt, m: this._m, r: this._r };
  }

  random() {
    return 0.5 + this.rand() * 2.3283064365386963e-10;
  }
}