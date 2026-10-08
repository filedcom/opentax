import { assertEquals, assertThrows } from "@std/assert";
import {
  assertReviewSourceFileContents,
  reviewSourceFileContents,
} from "./ty2025-pdf-review-source.ts";
import type { PdfReviewFixture } from "../../forms/f1040/2025/pdf/review-fixtures.ts";
import type { FilerIdentity } from "../../forms/f1040/mef/header.ts";

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

Deno.test("source replay binds exact optional reviewed attachment bytes", () => {
  const filer = { primarySSN: "111223333" } as FilerIdentity;
  const fixture = {
    id: "adoption-case",
    inputs: { general: { filing_status: "single" } },
    filer,
    expectedPdfForms: ["f1040", "form8839"],
    reviewFocus: ["adoption credit"],
    attachments: [{
      fileName: "decree.pdf",
      description: "Synthetic decree",
      bytes: new Uint8Array([37, 80, 68, 70]),
    }],
  } satisfies PdfReviewFixture;
  const expected = reviewSourceFileContents(fixture, filer, {});
  assertEquals(JSON.parse(expected).attachments[0].bytesBase64, "JVBERg==");
  const changed = reviewSourceFileContents(
    {
      ...fixture,
      attachments: [{
        ...fixture.attachments[0],
        bytes: new Uint8Array([37, 80, 68, 71]),
      }],
    },
    filer,
    {},
  );
  assertThrows(
    () =>
      assertReviewSourceFileContents(
        fixture.id,
        new TextEncoder().encode(changed),
        expected,
      ),
    Error,
    "source JSON differs",
  );
});

Deno.test("source replay binds retained custodian document identity and exact bytes", () => {
  const filer = { primarySSN: "111223333" } as FilerIdentity;
  const fixture: PdfReviewFixture = {
    id: "retained-substitute-case",
    inputs: { general: { filing_status: "single" } },
    filer,
    expectedPdfForms: ["f1040", "f4852"],
    reviewFocus: ["source copies"],
    retainedSourceDocuments: [{ document_reference: "custodian-record", bytes: new Uint8Array([1, 2, 3]) }],
  };
  const expected = reviewSourceFileContents(fixture, filer, {});
  for (const changed of [
    { document_reference: "wrong-custodian", bytes: new Uint8Array([1, 2, 3]) },
    { document_reference: "custodian-record", bytes: new Uint8Array([1, 2, 4]) },
  ]) {
    assertThrows(() => assertReviewSourceFileContents(
      fixture.id,
      new TextEncoder().encode(reviewSourceFileContents({ ...fixture, retainedSourceDocuments: [changed] }, filer, {})),
      expected,
    ), Error, "source JSON differs");
  }
});
