"use strict";

export interface AudioData {
  numberOfChannels?: number;
  length?: number;
  sampleRate: number;
  channelData: Float32Array[];
}

export interface Options {
  bitDepth?: number;
  floatingPoint?: boolean;
  float?: boolean;
  symmetric?: boolean;
}

export interface Format {
  formatId: number;
  floatingPoint: boolean;
  numberOfChannels: number;
  sampleRate: number;
  bitDepth: BitDepth;
}

export type BitDepth = 8 | 16 | 24 | 32;

export type WriterMethod = "pcm8" | "pcm8s" | "pcm16" | "pcm16s" | "pcm24" | "pcm24s" | "pcm32" | "pcm32s" | "pcm32f";

/**
 * @param {import("./index.d.ts").AudioData} _audioData
 * @param {import("./index.d.ts").Options} [opts]
 * @returns {ArrayBuffer}
 */
function encodeSync(_audioData, opts) {
  opts = opts || {};

  /** @type {Required<import("./index.d.ts").AudioData> | null} */
  var audioData = toAudioData(_audioData);

  if (audioData === null) {
    throw new TypeError("Invalid AudioData");
  }

  var floatingPoint = !!(opts.floatingPoint || opts.float);
  var bitDepth = floatingPoint ? 32 : /** @type {import("./index.d.ts").BitDepth} */ ((/** @type {typeof NaN} */ (opts.bitDepth)|0) || 16);
  var bytes = bitDepth >> 3;
  var length = audioData.length * audioData.numberOfChannels * bytes;
  var dataView = new DataView(new Uint8Array(44 + length).buffer);
  /** @type {ReturnType<typeof createWriter>} */
  var writer = createWriter(dataView);

  /** @type {import("./index.d.ts").Format} */
  var format = {
    formatId: floatingPoint ? 0x0003 : 0x0001,
    floatingPoint: floatingPoint,
    numberOfChannels: audioData.numberOfChannels,
    sampleRate: audioData.sampleRate,
    bitDepth: bitDepth
  };

  writeHeader(writer, format, dataView.buffer.byteLength - 8);

  var err = writeData(writer, format, length, audioData, opts);

  if (err instanceof Error) {
    throw err;
  }

  return dataView.buffer;
}

/**
 * @param {import("./index.d.ts").AudioData} audioData
 * @param {import("./index.d.ts").Options} [opts]
 * @returns {Promise<ArrayBuffer>}
 */
function encode(audioData, opts) {
  return new Promise(function(resolve) {
    resolve(encodeSync(audioData, opts));
  });
}

/**
 * @param {import("./index.d.ts").AudioData} data
 * @returns {Required<import("./index.d.ts").AudioData> | null}
 */
function toAudioData(data) {
  var audioData = {};

  if (typeof data.sampleRate !== "number") {
    return null;
  }
  if (!Array.isArray(data.channelData)) {
    return null;
  }
  if (!(data.channelData[0] instanceof Float32Array)) {
    return null;
  }

  audioData.numberOfChannels = data.channelData.length;
  audioData.length = data.channelData[0].length|0;
  audioData.sampleRate = data.sampleRate|0;
  audioData.channelData = data.channelData;

  return audioData;
}

/**
 * @param {ReturnType<typeof createWriter>} writer
 * @param {import("./index.d.ts").Format} format
 * @param {number} length
 * @returns {void}
 */
function writeHeader(writer, format, length) {
  var bytes = format.bitDepth >> 3;

  writer.string("RIFF");
  writer.uint32(length);
  writer.string("WAVE");

  writer.string("fmt ");
  writer.uint32(16);
  writer.uint16(format.floatingPoint ? 0x0003 : 0x0001);
  writer.uint16(format.numberOfChannels);
  writer.uint32(format.sampleRate);
  writer.uint32(format.sampleRate * format.numberOfChannels * bytes);
  writer.uint16(format.numberOfChannels * bytes);
  writer.uint16(format.bitDepth);
}

/**
 * @param {ReturnType<typeof createWriter>} writer
 * @param {import("./index.d.ts").Format} format
 * @param {number} length
 * @param {Required<import("./index.d.ts").AudioData>} audioData
 * @param {import("./index.d.ts").Options} opts
 * @returns {TypeError | undefined}
 */
function writeData(writer, format, length, audioData, opts) {
  var bitDepth = format.bitDepth;
  /** @type {"" | "f" | "s"} */
  var encoderOption = format.floatingPoint ? "f" : opts.symmetric ? "s" : "";
  /** @type {import("./index.d.ts").WriterMethod} */
  var methodName = /** @type {import("./index.d.ts").WriterMethod} */ (`pcm${bitDepth}${encoderOption}`);

  if (!writer[methodName]) {
    return new TypeError("Not supported bit depth: " + bitDepth);
  }

  /** @type {(value: number) => void} */
  var write = writer[methodName].bind(writer);
  var numberOfChannels = format.numberOfChannels;
  var channelData = audioData.channelData;

  writer.string("data");
  writer.uint32(length);

  for (var i = 0, imax = audioData.length; i < imax; i++) {
    for (var ch = 0; ch < numberOfChannels; ch++) {
      write(/** @type {number} */ (/** @type {Float32Array} */ (channelData[ch])[i]));
    }
  }
}

/**
 * @param {DataView<ArrayBuffer>} dataView
 */
function createWriter(dataView) {
  var pos = 0;

  return {
    int16: function(/** @type {number} */ value) {
      dataView.setInt16(pos, value, true);
      pos += 2;
    },
    uint16: function(/** @type {number} */ value) {
      dataView.setUint16(pos, value, true);
      pos += 2;
    },
    uint32: function(/** @type {number} */ value) {
      dataView.setUint32(pos, value, true);
      pos += 4;
    },
    string: function(/** @type {string} */ value) {
      for (var i = 0, imax = value.length; i < imax; i++) {
        dataView.setUint8(pos++, value.charCodeAt(i));
      }
    },
    pcm8: function(/** @type {number} */ value) {
      value = Math.max(-1, Math.min(value, +1));
      value = (value * 0.5 + 0.5) * 255;
      value = Math.round(value)|0;
      dataView.setUint8(pos, value);
      pos += 1;
    },
    pcm8s: function(/** @type {number} */ value) {
      value = Math.round(value * 128) + 128;
      value = Math.max(0, Math.min(value, 255));
      dataView.setUint8(pos, value);
      pos += 1;
    },
    pcm16: function(/** @type {number} */ value) {
      value = Math.max(-1, Math.min(value, +1));
      value = value < 0 ? value * 32768 : value * 32767;
      value = Math.round(value)|0;
      dataView.setInt16(pos, value, true);
      pos += 2;
    },
    pcm16s: function(/** @type {number} */ value) {
      value = Math.round(value * 32768);
      value = Math.max(-32768, Math.min(value, 32767));
      dataView.setInt16(pos, value, true);
      pos += 2;
    },
    pcm24: function(/** @type {number} */ value) {
      value = Math.max(-1, Math.min(value, +1));
      value = value < 0 ? 0x1000000 + value * 8388608 : value * 8388607;
      value = Math.round(value)|0;

      var x0 = (value >>  0) & 0xFF;
      var x1 = (value >>  8) & 0xFF;
      var x2 = (value >> 16) & 0xFF;

      dataView.setUint8(pos + 0, x0);
      dataView.setUint8(pos + 1, x1);
      dataView.setUint8(pos + 2, x2);
      pos += 3;
    },
    pcm24s: function(/** @type {number} */ value) {
      value = Math.round(value * 8388608);
      value = Math.max(-8388608, Math.min(value, 8388607));

      var x0 = (value >>  0) & 0xFF;
      var x1 = (value >>  8) & 0xFF;
      var x2 = (value >> 16) & 0xFF;

      dataView.setUint8(pos + 0, x0);
      dataView.setUint8(pos + 1, x1);
      dataView.setUint8(pos + 2, x2);
      pos += 3;
    },
    pcm32: function(/** @type {number} */ value) {
      value = Math.max(-1, Math.min(value, +1));
      value = value < 0 ? value * 2147483648 : value * 2147483647;
      value = Math.round(value)|0;
      dataView.setInt32(pos, value, true);
      pos += 4;
    },
    pcm32s: function(/** @type {number} */ value) {
      value = Math.round(value * 2147483648);
      value = Math.max(-2147483648, Math.min(value, +2147483647));
      dataView.setInt32(pos, value, true);
      pos += 4;
    },
    pcm32f: function(/** @type {number} */ value) {
      dataView.setFloat32(pos, value, true);
      pos += 4;
    }
  };
}

encode.sync = encodeSync;
module.exports.encode = encode;
module.exports.encode.sync = encodeSync;
