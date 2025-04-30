import { readFileSync } from "node:fs";
import { join } from "node:path";
import { deepEqual } from "node:assert";
import { describe, it } from "node:test";
import { type AudioData, encode, encodeSync } from "../src/index.js";

const testSpec = [
  { opts: { bitDepth:  8 }, filename: "amen_pcm8.wav" },
  { opts: { bitDepth: 16 }, filename: "amen_pcm16.wav" },
  { opts: { bitDepth: 24 }, filename: "amen_pcm24.wav" },
  { opts: { bitDepth: 32 }, filename: "amen_pcm32.wav" },
  { opts: { float:  true }, filename: "amen_pcm32f.wav" }
];

function readFile(filename: string): Buffer {
  return readFileSync(join(import.meta.dirname, "fixtures", filename));
}

function readAudioData(filename: string): AudioData {
  const buffer = readFile(filename).buffer;

  const uint32 = new Uint32Array(buffer, 4);
  const float32 = new Float32Array(buffer, 16);

  const numberOfChannels = uint32[0];
  const length: number = uint32[1]!;
  const sampleRate: number = uint32[2]!;
  const channelData = (new Array(numberOfChannels) as void[]).fill().map((_, ch) => {
    return float32.subarray(ch * length, (ch + 1) * length);
  });

  return {
    numberOfChannels: numberOfChannels,
    length: length,
    sampleRate: sampleRate,
    channelData: channelData
  };
}

describe("encode(audioData, opts)", () => {
  const audioData = readAudioData("amen.dat");

  testSpec.forEach(({ opts, filename }) => {
    it(filename, () => {
      const expected = new Uint8Array(encodeSync(audioData, opts));

      return encode(audioData, opts).then((_actual) => {
        const actual = new Uint8Array(_actual);

        deepEqual(actual, expected);
      });
    });
  });
});
