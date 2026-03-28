import { assertEquals } from "@std/assert";
import sharp from "sharp";
import { imageToJpeg } from "./image.ts";

async function makePngFile(path: string): Promise<void> {
  // 2x2 red PNG via sharp
  const buf = await sharp({
    create: { width: 2, height: 2, channels: 3, background: { r: 255, g: 0, b: 0 } },
  }).png().toBuffer();
  await Deno.writeFile(path, new Uint8Array(buf));
}

Deno.test("imageToJpeg - converts PNG to JPEG", async () => {
  const tmpPath = await Deno.makeTempFile({ suffix: ".png" });
  try {
    await makePngFile(tmpPath);
    const result = await imageToJpeg(tmpPath);
    // JPEG magic bytes: FF D8
    assertEquals(result[0], 0xff);
    assertEquals(result[1], 0xd8);
    assertEquals(result.length > 0, true);
  } finally {
    await Deno.remove(tmpPath);
  }
});

Deno.test("imageToJpeg - JPEG input stays JPEG", async () => {
  const tmpPath = await Deno.makeTempFile({ suffix: ".jpg" });
  try {
    const buf = await sharp({
      create: { width: 2, height: 2, channels: 3, background: { r: 0, g: 255, b: 0 } },
    }).jpeg().toBuffer();
    await Deno.writeFile(tmpPath, new Uint8Array(buf));

    const result = await imageToJpeg(tmpPath);
    assertEquals(result[0], 0xff);
    assertEquals(result[1], 0xd8);
  } finally {
    await Deno.remove(tmpPath);
  }
});
