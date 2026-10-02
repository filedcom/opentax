import { assertEquals, assertThrows } from "@std/assert";
import {
  assertReviewSchemaDigest,
  REVIEW_RETURN1040_XSD_SHA256,
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
