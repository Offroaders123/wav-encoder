declare namespace WavEncoder {
  interface AudioData {
    numberOfChannels: number;
    length: number;
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
    bitDepth: number;
  }
}

declare const WavEncoder: {
  encode: {
    (audioData: WavEncoder.AudioData, opts?: WavEncoder.Options): Promise<ArrayBuffer>;
    sync: (audioData: WavEncoder.AudioData, opts?: WavEncoder.Options) => ArrayBuffer;
  };
};

export = WavEncoder;
