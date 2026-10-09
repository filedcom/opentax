import { assertEquals, assertRejects } from "@std/assert";
import { loadPdfTemplate } from "./template-cache.ts";

const url = "data:application/pdf;base64,YWJj";
const digest =
  "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
const fileName = url.replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_") + ".pdf";

Deno.test("pinned template validates downloaded bytes before caching and reuses the exact copy", async () => {
  const cache = await Deno.makeTempDir();
  try {
    assertEquals(
      await loadPdfTemplate(url, cache, digest),
      new TextEncoder().encode("abc"),
    );
    assertEquals(await Deno.readTextFile(`${cache}/${fileName}`), "abc");
    assertEquals(
      await loadPdfTemplate(url, cache, digest),
      new TextEncoder().encode("abc"),
    );
    await Deno.writeTextFile(`${cache}/${fileName}`, "changed");
    await assertRejects(
      () => loadPdfTemplate(url, cache, digest),
      Error,
      "template digest mismatch",
    );
    assertEquals(await Deno.readTextFile(`${cache}/${fileName}`), "changed");
  } finally {
    await Deno.remove(cache, { recursive: true });
  }
});

Deno.test("pinned template rejects changed download without caching it", async () => {
  const cache = await Deno.makeTempDir();
  try {
    await assertRejects(
      () => loadPdfTemplate(url, cache, "0".repeat(64)),
      Error,
      "template digest mismatch",
    );
    await assertRejects(
      () => Deno.stat(`${cache}/${fileName}`),
      Deno.errors.NotFound,
    );
    await assertRejects(
      () => loadPdfTemplate(url, cache, "bad"),
      Error,
      "Invalid IRS PDF template SHA-256",
    );
  } finally {
    await Deno.remove(cache, { recursive: true });
  }
});

Deno.test("unpinned templates retain existing cache behavior", async () => {
  const cache = await Deno.makeTempDir();
  try {
    await Deno.writeTextFile(`${cache}/${fileName}`, "existing");
    assertEquals(
      await loadPdfTemplate(url, cache),
      new TextEncoder().encode("existing"),
    );
  } finally {
    await Deno.remove(cache, { recursive: true });
  }
});
