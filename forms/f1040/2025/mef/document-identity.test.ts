import { assertEquals, assertThrows } from "@std/assert";
import { documentId, validateDocumentReferences } from "./document-identity.ts";

Deno.test("MeF document IDs stay unique for repeated form copies", () => {
  const fragments = Array.from({ length: 12 }, () => ({
    pendingKey: "w2",
    tag: "IRSW2",
    xml: "<IRSW2/>",
  }));
  validateDocumentReferences(fragments);
  assertEquals(documentId("IRSW2", 1), "IRSW21");
  assertEquals(documentId("IRSW2", 11), "IRSW211");
});

Deno.test("MeF document identity rejects distinct roots whose truncated IDs collide", () => {
  const first = `${"A".repeat(28)}1x`;
  const second = `${"A".repeat(28)}x`;
  assertEquals(documentId(first, 1), documentId(second, 11));
  const fragments = Array.from({ length: 12 }, (_, index) => ({
    pendingKey: "synthetic",
    tag: index === 1 ? first : index === 11 ? second : "IRSW2",
    xml: index === 1
      ? `<${first}/>`
      : index === 11
      ? `<${second}/>`
      : "<IRSW2/>",
  }));
  assertThrows(
    () => validateDocumentReferences(fragments),
    Error,
    "document IDs collide",
  );
});
