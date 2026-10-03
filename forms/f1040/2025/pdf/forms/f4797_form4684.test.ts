import { assertEquals, assertThrows } from "@std/assert";
import { pdfReviewFixtures } from "../review-fixtures.ts";
import { form4797Pdf } from "./f4797.ts";

const casualty = pdfReviewFixtures.find((fixture) =>
  fixture.id === "single-form4684-business-casualty-loss"
)!.inputs.form4684 as Record<string, unknown>;
const source = { ordinary_gain_form4684: -30_000 };
const pending = {
  form4684: casualty,
  schedule1: { line4_other_gains: -30_000 },
};

Deno.test("Form 4797 PDF prints the sourced Form 4684 loss on lines 14 and 17", () => {
  const fields = form4797Pdf.projectFields!(source, pending);
  assertEquals(fields.pdf_line14, -30_000);
  assertEquals(fields.pdf_line17, -30_000);
  assertEquals(form4797Pdf.pageIndices!(fields), [0]);
});

Deno.test("Form 4797 PDF rejects a casualty loss that differs from its source", () => {
  assertThrows(
    () =>
      form4797Pdf.projectFields!({ ordinary_gain_form4684: -29_000 }, pending),
    Error,
    "differs from Form 4684 and Schedule 1",
  );
});
