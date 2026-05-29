declare module 'upng-js' {
  type PngImage = { width: number; height: number };

  const UPNG: {
    decode(buffer: ArrayBuffer): PngImage;
    toRGBA8(img: PngImage): ArrayBuffer[];
    encode(
      bufs: ArrayBuffer[],
      w: number,
      h: number,
      ps?: number,
      dels?: number[],
    ): ArrayBuffer;
  };

  export default UPNG;
}
