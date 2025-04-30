import { readFileSync } from "node:fs";
import { join } from "node:path";
import { deepEqual } from "node:assert";
import { describe, it } from "node:test";
import { type AudioData, encodeSync, type Options } from "../src/index.js";

const testSpec: { opts: Options; filename: string; }[] = [
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
  const buffer: ArrayBufferLike = readFile(filename).buffer;

  const uint32: Uint32Array = new Uint32Array(buffer, 4);
  const float32: Float32Array = new Float32Array(buffer, 16);

  const numberOfChannels: number | undefined = uint32[0];
  const length: number = uint32[1]!;
  const sampleRate: number = uint32[2]!;
  const channelData: Float32Array[] = (new Array(numberOfChannels) as void[]).fill().map((_, ch) => {
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
  const audioData: AudioData = readAudioData("amen.dat");

  testSpec.forEach(({ opts, filename }) => {
    it(filename, () => {
      const expected: Uint8Array<ArrayBuffer> = new Uint8Array(readFile(filename));
      const actual: Uint8Array<ArrayBuffer> = new Uint8Array(encodeSync(audioData, opts));

      deepEqual(actual, expected);
    });
  });
});
