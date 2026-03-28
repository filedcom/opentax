import { assertEquals, assertRejects } from "@std/assert";
import { pdfToImages } from "./pdf.ts";

Deno.test("pdfToImages - rejects on non-existent file", async () => {
  await assertRejects(
    () => pdfToImages("/tmp/does_not_exist_tax_ingest_abc123.pdf"),
    Error,
  );
});

Deno.test("pdfToImages - returns JPEG pages for valid PDF", async () => {
  const fixturePath = new URL("./fixtures/sample.pdf", import.meta.url).pathname;
  try {
    await Deno.stat(fixturePath);
  } catch {
    console.log("  skipped: fixture not found at", fixturePath);
    return;
  }

  const pages = await pdfToImages(fixturePath);
  assertEquals(pages.length > 0, true);
  // Every page must be a valid JPEG (magic bytes FF D8)
  for (const page of pages) {
    assertEquals(page[0], 0xff, "expected JPEG magic byte 0");
    assertEquals(page[1], 0xd8, "expected JPEG magic byte 1");
  }
});
