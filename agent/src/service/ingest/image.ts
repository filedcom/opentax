import sharp from "sharp";
import { JPEG_QUALITY } from "./types.ts";

/**
 * Converts any image format supported by sharp (PNG, WEBP, TIFF, GIF, BMP, JPEG)
 * to a JPEG Uint8Array.
 */
export async function imageToJpeg(filePath: string): Promise<Uint8Array> {
  const input = await Deno.readFile(filePath);
  const buffer = await sharp(input).jpeg({ quality: JPEG_QUALITY }).toBuffer();
  return new Uint8Array(buffer);
}
