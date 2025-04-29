declare namespace WavEncoder {
  interface AudioData {
    numberOfChannels?: number;
    length?: number;
    sampleRate: number;
    channelData: Float32Array[];
  }

  interface Options {
    bitDepth?: number;
    floatingPoint?: boolean;
    float?: boolean;
    symmetric?: boolean;
  }

  interface Format {
    formatId: number;
    floatingPoint: boolean;
    numberOfChannels: number;
    sampleRate: number;
    bitDepth: BitDepth;
  }

  type BitDepth = 8 | 16 | 24 | 32;

  type WriterMethod = "pcm8" | "pcm8s" | "pcm16" | "pcm16s" | "pcm24" | "pcm24s" | "pcm32" | "pcm32s" | "pcm32f";
}

declare const WavEncoder: {
  encode: {
    (audioData: WavEncoder.AudioData, opts?: WavEncoder.Options): Promise<ArrayBuffer>;
    sync: (audioData: WavEncoder.AudioData, opts?: WavEncoder.Options) => ArrayBuffer;
  };
};

export = WavEncoder;
