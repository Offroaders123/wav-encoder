export interface AudioData {
  numberOfChannels?: number;
  length?: number;
  sampleRate: number;
  channelData: Float32Array[];
}

export interface Options {
  bitDepth?: BitDepth;
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

export type WriterMethod = keyof Writer extends infer T ? T extends `pcm${BitDepth}${string}` ? T : never : never;

export function encodeSync(_audioData: AudioData, opts?: Options): ArrayBuffer {
  opts = opts || {};

  const audioData: Required<AudioData> | null = toAudioData(_audioData);

  if (audioData === null) {
    throw new TypeError("Invalid AudioData");
  }

  const floatingPoint: boolean = !!(opts.floatingPoint || opts.float);
  const bitDepth: BitDepth = floatingPoint ? 32 : ((opts.bitDepth as typeof NaN|0) || 16) as BitDepth;
  const bytes: number = bitDepth >> 3;
  const length: number = audioData.length * audioData.numberOfChannels * bytes;
  const dataView: DataView<ArrayBuffer> = new DataView(new Uint8Array(44 + length).buffer);
  const writer: Writer = new Writer(dataView);

  const format: Format = {
    formatId: floatingPoint ? 0x0003 : 0x0001,
    floatingPoint: floatingPoint,
    numberOfChannels: audioData.numberOfChannels,
    sampleRate: audioData.sampleRate,
    bitDepth: bitDepth
  };

  writeHeader(writer, format, dataView.buffer.byteLength - 8);

  const err: TypeError | undefined = writeData(writer, format, length, audioData, opts);

  if (err instanceof Error) {
    throw err;
  }

  return dataView.buffer;
}

function toAudioData(data: AudioData): Required<AudioData> | null {
  const audioData: Required<AudioData> = {} as Required<AudioData>;

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

function writeHeader(writer: Writer, format: Format, length: number): void {
  const bytes: number = format.bitDepth >> 3;

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

function writeData(writer: Writer, format: Format, length: number, audioData: Required<AudioData>, opts: Options): TypeError | undefined {
  const bitDepth: BitDepth = format.bitDepth;
  const encoderOption: "" | "f" | "s" = format.floatingPoint ? "f" : opts.symmetric ? "s" : "";
  const methodName: WriterMethod = `pcm${bitDepth}${encoderOption}` as WriterMethod;

  if (!writer[methodName]) {
    return new TypeError("Not supported bit depth: " + bitDepth);
  }

  const write: (value: number) => void = writer[methodName].bind(writer);
  const numberOfChannels: number = format.numberOfChannels;
  const channelData: Float32Array[] = audioData.channelData;

  writer.string("data");
  writer.uint32(length);

  for (let i: number = 0, imax = audioData.length; i < imax; i++) {
    for (let ch: number = 0; ch < numberOfChannels; ch++) {
      write(channelData[ch]![i]!);
    }
  }
}

class Writer {
  readonly #dataView: DataView<ArrayBuffer>;
  #pos: number = 0;

  constructor(dataView: DataView<ArrayBuffer>) {
    this.#dataView = dataView;
  }

  int16(value: number): void {
    this.#dataView.setInt16(this.#pos, value, true);
    this.#pos += 2;
  }

  uint16(value: number): void {
    this.#dataView.setUint16(this.#pos, value, true);
    this.#pos += 2;
  }

  uint32(value: number): void {
    this.#dataView.setUint32(this.#pos, value, true);
    this.#pos += 4;
  }

  string(value: string): void {
    for (let i: number = 0, imax = value.length; i < imax; i++) {
      this.#dataView.setUint8(this.#pos++, value.charCodeAt(i));
    }
  }

  pcm8(value: number): void {
    value = Math.max(-1, Math.min(value, +1));
    value = (value * 0.5 + 0.5) * 255;
    value = Math.round(value)|0;
    this.#dataView.setUint8(this.#pos, value);
    this.#pos += 1;
  }

  pcm8s(value: number): void {
    value = Math.round(value * 128) + 128;
    value = Math.max(0, Math.min(value, 255));
    this.#dataView.setUint8(this.#pos, value);
    this.#pos += 1;
  }

  pcm16(value: number): void {
    value = Math.max(-1, Math.min(value, +1));
    value = value < 0 ? value * 32768 : value * 32767;
    value = Math.round(value)|0;
    this.#dataView.setInt16(this.#pos, value, true);
    this.#pos += 2;
  }

  pcm16s(value: number): void {
    value = Math.round(value * 32768);
    value = Math.max(-32768, Math.min(value, 32767));
    this.#dataView.setInt16(this.#pos, value, true);
    this.#pos += 2;
  }

  pcm24(value: number): void {
    value = Math.max(-1, Math.min(value, +1));
    value = value < 0 ? 0x1000000 + value * 8388608 : value * 8388607;
    value = Math.round(value)|0;

    const x0: number = (value >>  0) & 0xFF;
    const x1: number = (value >>  8) & 0xFF;
    const x2: number = (value >> 16) & 0xFF;

    this.#dataView.setUint8(this.#pos + 0, x0);
    this.#dataView.setUint8(this.#pos + 1, x1);
    this.#dataView.setUint8(this.#pos + 2, x2);
    this.#pos += 3;
  }

  pcm24s(value: number): void {
    value = Math.round(value * 8388608);
    value = Math.max(-8388608, Math.min(value, 8388607));

    const x0: number = (value >>  0) & 0xFF;
    const x1: number = (value >>  8) & 0xFF;
    const x2: number = (value >> 16) & 0xFF;

    this.#dataView.setUint8(this.#pos + 0, x0);
    this.#dataView.setUint8(this.#pos + 1, x1);
    this.#dataView.setUint8(this.#pos + 2, x2);
    this.#pos += 3;
  }

  pcm32(value: number): void {
    value = Math.max(-1, Math.min(value, +1));
    value = value < 0 ? value * 2147483648 : value * 2147483647;
    value = Math.round(value)|0;
    this.#dataView.setInt32(this.#pos, value, true);
    this.#pos += 4;
  }

  pcm32s(value: number): void {
    value = Math.round(value * 2147483648);
    value = Math.max(-2147483648, Math.min(value, +2147483647));
    this.#dataView.setInt32(this.#pos, value, true);
    this.#pos += 4;
  }

  pcm32f(value: number): void {
    this.#dataView.setFloat32(this.#pos, value, true);
    this.#pos += 4;
  }
}
