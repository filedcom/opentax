import { expect, test } from "bun:test";
import { unzipSync, zipSync } from "fflate";
import { unzipEntries, zipEntries } from "./zip.ts";
import { zipDirectoryEntryCount } from "./submission-archive.ts";

const files = {
  "manifest/manifest.xml": new TextEncoder().encode("<m/>".repeat(50)),
  "xml/submission.xml": new TextEncoder().encode("<Return/>"),
  "attachment/Statement é.pdf": new Uint8Array([37, 80, 68, 70, 45]),
  "attachment/empty.pdf": new Uint8Array(),
};

test("ZIP entries round-trip through fflate in both directions, stored or deflated", () => {
  for (const deflate of [true, false]) {
    const bytes = zipEntries(files, deflate);
    expect(unzipSync(bytes)).toEqual(files);
    expect(unzipEntries(bytes)).toEqual(files);
    expect(zipDirectoryEntryCount(bytes, unzipEntries(bytes))).toBe(4);
    expect(zipEntries(files, deflate)).toEqual(bytes);
  }
  expect(unzipEntries(zipSync(files, { level: 6 }))).toEqual(files);
  expect(Object.keys(unzipEntries(zipEntries(files, true)))).toEqual(
    Object.keys(files),
  );
});
