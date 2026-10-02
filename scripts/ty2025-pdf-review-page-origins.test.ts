import { assertThrows } from "@std/assert";
import {
  assertReviewedPageOrigin,
  assertReviewPageOrigins,
} from "./ty2025-pdf-review-page-origins.ts";

Deno.test("review rejects a missing expected form hidden by an edited checklist", () => {
  const actual = [
    { pageNumber: 1, formKey: "f1040", formCopy: 1 },
    { pageNumber: 2, formKey: "f1040", formCopy: 1 },
  ];
  assertThrows(
    () =>
      assertReviewPageOrigins(
        "case-one",
        actual,
        ["f1040", "schedule3"],
        actual,
      ),
    Error,
    "expected schedule3 PDF copy is missing",
  );
  assertThrows(
    () => assertReviewedPageOrigin("case-one", "schedule3", 1, actual[1]),
    Error,
    "reviewed form/copy differs from PDF origin",
  );
});

Deno.test("review rejects a replaced page-origin manifest even with matching page count", () => {
  const actual = [{ pageNumber: 1, formKey: "schedule3", formCopy: 1 }];
  const recorded = [{ pageNumber: 1, formKey: "f1040", formCopy: 1 }];
  assertThrows(
    () => assertReviewPageOrigins("case-two", actual, ["schedule3"], recorded),
    Error,
    "recorded PDF page origins differ from replay",
  );
});
