import { assertEquals, assertThrows } from "@std/assert";
import { join } from "@std/path";
import {
  assertReviewSchemaDigest,
  assertReviewSchemaTreeDigest,
  REVIEW_RETURN1040_XSD_SHA256,
  schemaTreeDigest,
} from "./ty2025-pdf-review-schema.ts";

Deno.test("review schema rejects a replaced XSD even when its manifest digest is updated", () => {
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

Deno.test("review schema tree detects a changed imported XSD", async () => {
  const root = await Deno.makeTempDir();
  try {
    await Deno.mkdir(join(root, "Common"));
    await Deno.writeTextFile(
      join(root, "Common", "efileTypes.xsd"),
      "original",
    );
    const before = await schemaTreeDigest(root);
    await Deno.writeTextFile(join(root, "Common", "efileTypes.xsd"), "changed");
    const after = await schemaTreeDigest(root);
    assertEquals(before === after, false);
    assertThrows(
      () => assertReviewSchemaTreeDigest(after),
      Error,
      "differs from the reviewed local v5.4 archive",
    );
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});
