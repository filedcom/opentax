import { test } from "bun:test";
import { assertEquals, assertThrows } from "@std/assert";
import education from "../../../../pdf/reviews/general/composed-returns/review-8863-scholarship-source.json" with {
  type: "json",
};
import { f1040_2025 } from "../../../../index.ts";
import { buildPending } from "../../../../mef/execution/pending.ts";

type Student = Record<string, unknown>;

function supplied() {
  return structuredClone(education.inputs) as Record<string, unknown>;
}

function withoutReturnFacts() {
  const inputs = supplied();
  inputs.f8863 = (inputs.f8863 as Student[]).map((
    { filer_magi: _magi, filing_status: _status, ...student },
  ) => student);
  delete inputs.f8863_credit_limit_worksheet;
  return inputs;
}

function credits(inputs: Record<string, unknown>) {
  const result = f1040_2025.executeReturn(inputs);
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  return {
    pending,
    nonrefundable: pending.schedule3?.line3_education_credit,
    refundable: pending.f1040?.line29_refundable_aoc,
  };
}

test("Form 8863 MAGI, filing status and credit limit are derived from the return", () => {
  const derived = credits(withoutReturnFacts());
  const expected = credits(supplied());
  assertEquals(derived.nonrefundable, expected.nonrefundable);
  assertEquals(derived.refundable, expected.refundable);
  const student = (derived.pending.f8863 as { f8863s: Student[] }).f8863s[0];
  assertEquals(student.filer_magi, 81_000);
  assertEquals(student.filing_status, "single");
});

test("Form 8863 accepts preparer values equal to the return's own", () => {
  const inputs = supplied();
  delete inputs.f8863_credit_limit_worksheet;
  assertEquals(credits(inputs).nonrefundable, credits(supplied()).nonrefundable);
});

test("Form 8863 rejects preparer MAGI, filing status or tax that differ from the return", () => {
  const magi = supplied();
  (magi.f8863 as Student[])[0].filer_magi = 82_000;
  assertThrows(
    () => f1040_2025.executeReturn(magi),
    Error,
    "filed MAGI and credit limit must equal",
  );
  const derivedLimit = structuredClone(magi);
  delete derivedLimit.f8863_credit_limit_worksheet;
  assertThrows(
    () => f1040_2025.executeReturn(derivedLimit),
    Error,
    "filed MAGI and credit limit must equal",
  );
  const status = withoutReturnFacts();
  (status.f8863 as Student[])[0].filing_status = "hoh";
  assertThrows(
    () => f1040_2025.executeReturn(status),
    Error,
    "filing status must equal",
  );
  const tax = supplied();
  (tax.f8863_credit_limit_worksheet as {
    credit_limit_worksheet: Record<string, number>;
  }).credit_limit_worksheet.form1040_line18_tax = 9_000;
  assertThrows(
    () => f1040_2025.executeReturn(tax),
    Error,
    "filed MAGI and credit limit must equal",
  );
});
