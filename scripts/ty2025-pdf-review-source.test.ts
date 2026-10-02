import { assertEquals, assertThrows } from "@std/assert";
import {
  assertReviewSourceFileContents,
  reviewSourceFileContents,
} from "./ty2025-pdf-review-source.ts";
import type { PdfReviewFixture } from "../forms/f1040/2025/pdf/review-fixtures.ts";
import type { FilerIdentity } from "../forms/f1040/mef/header.ts";

Deno.test("source replay rejects extra unsupported fields despite matching manifest hash", () => {
  const filer = { primarySSN: "111223333" } as FilerIdentity;
  const fixture = {
    id: "case-one",
    inputs: { general: { filing_status: "single" } },
    filer,
    expectedPdfForms: ["f1040"],
    reviewFocus: ["line 26"],
  } satisfies PdfReviewFixture;
  const expected = reviewSourceFileContents(fixture, filer, {
    f1040: { line26: 300 },
  });
  assertEquals(Object.hasOwn(JSON.parse(expected), "synthetic"), false);
  const edited = JSON.stringify(
    {
      ...JSON.parse(expected),
      unsupportedReviewClaim: "edited after generation",
    },
    null,
    2,
  ) + "\n";
  assertThrows(
    () =>
      assertReviewSourceFileContents(
        "case-one",
        new TextEncoder().encode(edited),
        expected,
      ),
    Error,
    "source JSON differs from current source replay",
  );
  assertReviewSourceFileContents(
    "case-one",
    new TextEncoder().encode(expected),
    expected,
  );
});
