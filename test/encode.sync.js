const fs = require("fs");
const path = require("path");
const assert = require("assert");
const { describe, it } = require("node:test");
const encoder = require("..");

const testSpec = [
  { opts: { bitDepth:  8 }, filename: "amen_pcm8.wav" },
  { opts: { bitDepth: 16 }, filename: "amen_pcm16.wav" },
  { opts: { bitDepth: 24 }, filename: "amen_pcm24.wav" },
  { opts: { bitDepth: 32 }, filename: "amen_pcm32.wav" },
  { opts: { float:  true }, filename: "amen_pcm32f.wav" }
];

/**
 * @param {string} filename
 * @returns {Buffer}
 */
function readFile(filename) {
  return fs.readFileSync(path.join(__dirname, "fixtures", filename));
}

/**
 * @param {string} filename
 * @returns {import("..").AudioData}
 */
function readAudioData(filename) {
  const buffer = readFile(filename).buffer;

  const uint32 = new Uint32Array(buffer, 4);
  const float32 = new Float32Array(buffer, 16);

  const numberOfChannels = uint32[0];
  /** @type {number} */
  const length = /** @type {number} */ (uint32[1]);
  /** @type {number} */
  const sampleRate = /** @type {number} */ (uint32[2]);
  const channelData = /** @type {void[]} */ (new Array(numberOfChannels)).fill().map((_, ch) => {
    return float32.subarray(ch * length, (ch + 1) * length);
  });

  return {
    numberOfChannels: numberOfChannels,
    length: length,
    sampleRate: sampleRate,
    channelData: channelData
  };
}

describe("encode.sync(audioData, opts)", () => {
  const audioData = readAudioData("amen.dat");

  testSpec.forEach(({ opts, filename }) => {
    it(filename, () => {
      const expected = new Uint8Array(readFile(filename));
      const actual = new Uint8Array(encoder.encode.sync(audioData, opts));

      assert.deepEqual(actual, expected);
    });
  });
});
