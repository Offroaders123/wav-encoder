import { deepEqual } from "node:assert";
import { describe, it } from "node:test";
import { type AudioData, type BitDepth, encodeSync } from "../src/index.js";

const testSpec = [
  {
    opts: { bitDepth: 8 satisfies BitDepth as BitDepth },
    TypedArray: Uint8Array,
    data: [ -1, -0.75, -0.5, 0, 0.5, 0.75, 1 ],
    expected: new Uint8Array([ 0, 32, 64, 128, 191, 223, 255 ]),
  },
  {
    opts: { bitDepth: 8 satisfies BitDepth as BitDepth, symmetric: true },
    TypedArray: Uint8Array,
    data: [ -1, -0.75, -0.5, 0, 0.5, 0.75, 1 ],
    expected: new Uint8Array([ 0, 32, 64, 128, 192, 224, 255 ]),
  },
  {
    opts: { bitDepth: 16 satisfies BitDepth as BitDepth },
    TypedArray: Int16Array,
    data: [ -1, -0.75, -0.5, 0, 0.5, 0.75, 1 ],
    expected: new Int16Array([ -32768, -24576 , -16384, 0, 16384, 24575, 32767 ]),
  },
  {
    opts: { bitDepth: 16 satisfies BitDepth as BitDepth, symmetric: true },
    TypedArray: Int16Array,
    data: [ -1, -0.75, -0.5, 0, 0.5, 0.75, 1 ],
    expected: new Int16Array([ -32768, -24576, -16384, 0, 16384, 24576, 32767 ]),
  },
  {
    opts: { bitDepth: 32 satisfies BitDepth as BitDepth },
    TypedArray: Int32Array,
    data: [ -1, -0.75, -0.5, 0, 0.5, 0.75, 1 ],
    expected: new Int32Array([ -2147483648, -1610612736, -1073741824, 0, 1073741824, 1610612735, 2147483647 ]),
  },
  {
    opts: { bitDepth: 32 satisfies BitDepth as BitDepth, symmetric: true },
    TypedArray: Int32Array,
    data: [ -1, -0.75, -0.5, 0, 0.5, 0.75, 1 ],
    expected: new Int32Array([ -2147483648, -1610612736, -1073741824, 0, 1073741824, 1610612736, 2147483647 ]),
  },
  {
    opts: { bitDepth: 32 satisfies BitDepth as BitDepth, float: true },
    TypedArray: Float32Array,
    data: [ -1, -0.5, 0, 0.5, 1 ],
    expected: new Float32Array([ -1, -0.5, 0, 0.5, 1 ]),
  },
];

describe("encoding", () => {
  for (const { opts, TypedArray, data, expected } of testSpec) {
    it(JSON.stringify(opts), () => {
      const audioData: AudioData = {
        channelData: [ new Float32Array(data) ], sampleRate: 8000,
      };
      const encoded: ArrayBuffer = encodeSync(audioData, opts);
      const actual = new TypedArray(encoded, 44);

      deepEqual(actual, expected);
    });
  }
});
