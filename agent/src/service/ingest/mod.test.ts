import { assertEquals, assertRejects } from "@std/assert";
import { ingest, isSupportedFormat } from "./mod.ts";
import { PageJpg, PageMd, ParsedDocument } from "./types.ts";

// ---------------------------------------------------------------------------
// isSupportedFormat
// ---------------------------------------------------------------------------

Deno.test("isSupportedFormat - returns true for all supported extensions", () => {
  const supported = [
    "doc.pdf", "doc.docx", "doc.csv", "doc.xlsx", "doc.xls",
    "doc.txt", "doc.md", "doc.png", "doc.jpg", "doc.jpeg",
    "doc.webp", "doc.gif", "doc.bmp", "doc.tiff", "doc.tif",
  ];
  for (const f of supported) {
    assertEquals(isSupportedFormat(f), true, `expected true for ${f}`);
  }
});

Deno.test("isSupportedFormat - returns false for unsupported extensions", () => {
  for (const f of ["doc.zip", "doc.pptx", "doc.exe", "noextension"]) {
    assertEquals(isSupportedFormat(f), false, `expected false for ${f}`);
  }
});

// ---------------------------------------------------------------------------
// ingest dispatch
// ---------------------------------------------------------------------------

Deno.test("ingest - throws for unsupported extension", async () => {
  await assertRejects(
    () => ingest("/tmp/file.zip"),
    Error,
    "Unsupported file format",
  );
});

Deno.test("ingest - .txt produces ParsedDocument with one PageMd", async () => {
  const tmpPath = await Deno.makeTempFile({ suffix: ".txt" });
  try {
    await Deno.writeTextFile(tmpPath, "hello tax");
    const doc = await ingest(tmpPath);
    assertEquals(doc instanceof ParsedDocument, true);
    assertEquals(doc.sourcePath, tmpPath);
    assertEquals(doc.pages.length, 1);
    assertEquals(doc.pages[0] instanceof PageMd, true);
    assertEquals((doc.pages[0] as PageMd).content, "hello tax");
  } finally {
    await Deno.remove(tmpPath);
  }
});

Deno.test("ingest - .md produces ParsedDocument with one PageMd", async () => {
  const tmpPath = await Deno.makeTempFile({ suffix: ".md" });
  try {
    await Deno.writeTextFile(tmpPath, "# Title");
    const doc = await ingest(tmpPath);
    assertEquals(doc.pages[0] instanceof PageMd, true);
    assertEquals((doc.pages[0] as PageMd).type, "md");
  } finally {
    await Deno.remove(tmpPath);
  }
});

Deno.test("ingest - .csv produces ParsedDocument with one PageMd", async () => {
  const tmpPath = await Deno.makeTempFile({ suffix: ".csv" });
  try {
    await Deno.writeTextFile(tmpPath, "A,B\n1,2");
    const doc = await ingest(tmpPath);
    assertEquals(doc.pages[0] instanceof PageMd, true);
  } finally {
    await Deno.remove(tmpPath);
  }
});

Deno.test("ingest - .png produces ParsedDocument with one PageJpg", async () => {
  const { default: sharp } = await import("sharp");
  const pngBuf = await sharp({
    create: { width: 2, height: 2, channels: 3, background: { r: 255, g: 0, b: 0 } },
  }).png().toBuffer();

  const tmpPath = await Deno.makeTempFile({ suffix: ".png" });
  try {
    await Deno.writeFile(tmpPath, new Uint8Array(pngBuf));
    const doc = await ingest(tmpPath);
    assertEquals(doc instanceof ParsedDocument, true);
    assertEquals(doc.pages.length, 1);
    assertEquals(doc.pages[0] instanceof PageJpg, true);
    const page = doc.pages[0] as PageJpg;
    assertEquals(page.type, "jpg");
    assertEquals(page.pageNumber, 0);
    assertEquals(page.jpeg[0], 0xff);
    assertEquals(page.jpeg[1], 0xd8);
  } finally {
    await Deno.remove(tmpPath);
  }
});
