import { test } from "bun:test";
import * as fs from "node:fs/promises";
import * as sys from "../../../../../scripts/support/sys.ts";
import { assertEquals, assertRejects } from "@std/assert";
import { loadPdfTemplate } from "./template-cache.ts";

const url = "data:application/pdf;base64,YWJj";
const digest =
  "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
const fileName = url.replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_") + ".pdf";

test("pinned template validates downloaded bytes before caching and reuses the exact copy", async () => {
  const cache = await sys.makeTempDir();
  try {
    assertEquals(
      await loadPdfTemplate(url, cache, digest),
      new TextEncoder().encode("abc"),
    );
    assertEquals(await fs.readFile(`${cache}/${fileName}`, "utf8"), "abc");
    assertEquals(
      await loadPdfTemplate(url, cache, digest),
      new TextEncoder().encode("abc"),
    );
    await fs.writeFile(`${cache}/${fileName}`, "changed");
    await assertRejects(
      () => loadPdfTemplate(url, cache, digest),
      Error,
      "template digest mismatch",
    );
    assertEquals(await fs.readFile(`${cache}/${fileName}`, "utf8"), "changed");
  } finally {
    await sys.remove(cache, { recursive: true });
  }
});

test("pinned template rejects changed download without caching it", async () => {
  const cache = await sys.makeTempDir();
  try {
    await assertRejects(
      () => loadPdfTemplate(url, cache, "0".repeat(64)),
      Error,
      "template digest mismatch",
    );
    await assertRejects(
      () => sys.stat(`${cache}/${fileName}`),
      Error,
      "ENOENT",
    );
    await assertRejects(
      () => loadPdfTemplate(url, cache, "bad"),
      Error,
      "Invalid IRS PDF template SHA-256",
    );
  } finally {
    await sys.remove(cache, { recursive: true });
  }
});

test("unpinned templates retain existing cache behavior", async () => {
  const cache = await sys.makeTempDir();
  try {
    await fs.writeFile(`${cache}/${fileName}`, "existing");
    assertEquals(
      await loadPdfTemplate(url, cache),
      new TextEncoder().encode("existing"),
    );
  } finally {
    await sys.remove(cache, { recursive: true });
  }
});
