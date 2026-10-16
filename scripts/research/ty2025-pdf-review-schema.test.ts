import { test } from "bun:test";
import * as fs from "node:fs/promises";
import * as sys from "../support/sys.ts";
import { assertEquals, assertThrows } from "@std/assert";
import { join } from "node:path";
import {
  assertReviewSchemaDigest,
  assertReviewSchemaTreeDigest,
  REVIEW_RETURN1040_XSD_SHA256,
  schemaTreeDigest,
} from "./ty2025-pdf-review-schema.ts";

test("review schema rejects a replaced XSD even when its manifest digest is updated", () => {
  const substitutedSchemaDigest = "0".repeat(64);
  const editableManifestDigest = substitutedSchemaDigest;
  assertEquals(substitutedSchemaDigest, editableManifestDigest);
  assertThrows(
    () => assertReviewSchemaDigest(substitutedSchemaDigest),
    Error,
    "differs from the reviewed local v5.4 schema",
  );
  assertReviewSchemaDigest(REVIEW_RETURN1040_XSD_SHA256);
});

test("review schema tree detects a changed imported XSD", async () => {
  const root = await sys.makeTempDir();
  try {
    await fs.mkdir(join(root, "Common"));
    await fs.writeFile(
      join(root, "Common", "efileTypes.xsd"),
      "original",
    );
    const before = await schemaTreeDigest(root);
    await fs.writeFile(join(root, "Common", "efileTypes.xsd"), "changed");
    const after = await schemaTreeDigest(root);
    assertEquals(before === after, false);
    assertThrows(
      () => assertReviewSchemaTreeDigest(after),
      Error,
      "differs from the reviewed local v5.4 archive",
    );
  } finally {
    await sys.remove(root, { recursive: true });
  }
});
