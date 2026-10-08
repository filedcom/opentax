import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { execute } from "../../../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../../../core/runtime/planner.ts";
import { form8995Pdf } from "../../../../pdf/forms/business/f8995/f8995.ts";
import { pdfReviewFixtures } from "../../../../pdf/review-fixtures.ts";
import { registry } from "../../../../registry.ts";
import { buildMefXml } from "../../../builder.ts";
import { form8995 } from "./f8995.ts";

const base = pdfReviewFixtures.find((item) => item.id === "single-w2-refund")!;

const reit = {
  recipient_tin: "111223333",
  payerName: "Example Qualified REIT",
  source_document_reference: "2025 issued Example Qualified REIT 1099-DIV",
  isNominee: false,
  box11: false,
  box1a: 1_000,
  box5: 1_000,
  holdingPeriodDays: 65,
  section199a_holding_review: {
    ex_dividend_date: "2025-06-01",
    qualified_held_days_in_91_day_window: 55,
    diminished_risk_days_excluded: 10,
    no_related_payment_obligation_confirmed: true,
    review_reference: "2025 REIT holding review",
    reviewed_on: "2026-03-01",
  },
};

function filedReturn(reits: typeof reit[] = [reit]) {
  const result = execute(buildExecutionPlan(registry), registry, {
    ...base.inputs,
    general: {
      ...(base.inputs.general as Record<string, unknown>),
      qbi_no_prior_loss_or_suspended_loss_confirmed: true,
      qbi_not_patron_of_specified_cooperative_confirmed: true,
    },
    f1099div: reits,
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  return result.pending;
}

const threeReits = [
  {
    ...reit,
    payerName: "North REIT",
    source_document_reference: "2025 North REIT 1099-DIV",
    box1a: 350,
    box5: 350,
    section199a_holding_review: {
      ...reit.section199a_holding_review,
      review_reference: "North holding review",
    },
  },
  {
    ...reit,
    payerName: "South REIT",
    source_document_reference: "2025 South REIT 1099-DIV",
    box1a: 450,
    box5: 450,
    section199a_holding_review: {
      ...reit.section199a_holding_review,
      review_reference: "South holding review",
    },
  },
  {
    ...reit,
    payerName: "West REIT",
    source_document_reference: "2025 West REIT 1099-DIV",
    box1a: 500,
    box5: 500,
    section199a_holding_review: {
      ...reit.section199a_holding_review,
      review_reference: "West holding review",
    },
  },
];

Deno.test("three separately reviewed REIT issuers without business QBI reach Form 8995 native and PDF", () => {
  const pending = filedReturn(threeReits);
  const fields = pending.form8995;
  assertEquals(pending.f1040.line3b_ordinary_dividends, 1_300);
  assertEquals(fields.line1_qbi, 0);
  assertEquals(fields.line6, 1_300);
  assertEquals(fields.line9, 260);
  assertEquals(fields.line15, pending.f1040.line13_qbi_deduction);
  const native = form8995.build(fields, { pending });
  assertStringIncludes(
    native,
    "<QlfyREITDivPTPIncomeLossAmt>1300</QlfyREITDivPTPIncomeLossAmt>",
  );
  const pdf = form8995Pdf.projectFields!(fields, pending);
  assertEquals(pdf.line6, 1_300);
  assertEquals(pdf.line9, 260);
  assertEquals(pdf.line15, pending.f1040.line13_qbi_deduction);
});

Deno.test("REIT-only three-issuer native and PDF reject payer, holding, source and total tampering", () => {
  const pending = filedReturn(threeReits);
  const fields = pending.form8995;
  const changed = (rows: typeof threeReits) => ({
    ...pending,
    f1099div: { f1099divs: rows },
  });
  for (
    const replay of [
      changed([threeReits[0], threeReits[1], { ...threeReits[2], box5: 499 }]),
      changed([threeReits[0], threeReits[1], {
        ...threeReits[2],
        payerName: "North REIT",
      }]),
      changed([threeReits[0], threeReits[1], {
        ...threeReits[2],
        source_document_reference: threeReits[0].source_document_reference,
      }]),
      changed([threeReits[0], threeReits[1], {
        ...threeReits[2],
        section199a_holding_review: {
          ...threeReits[2].section199a_holding_review,
          qualified_held_days_in_91_day_window: 45,
        },
      }]),
      changed([...threeReits, {
        ...reit,
        payerName: "East REIT",
        source_document_reference: "2025 East REIT 1099-DIV",
      }]),
      {
        ...pending,
        f1040: { ...pending.f1040, line3b_ordinary_dividends: 1_299 },
      },
    ]
  ) {
    assertThrows(() => form8995.build(fields, { pending: replay }), Error);
    assertThrows(() => form8995Pdf.projectFields!(fields, replay), Error);
  }
});

Deno.test("one reviewed REIT dividend without business QBI reaches Form 8995, Form 1040, native and PDF", () => {
  const pending = filedReturn();
  const fields = pending.form8995;
  assertEquals(pending.f1040.line3b_ordinary_dividends, 1_000);
  assertEquals(fields.line1_qbi, 0);
  assertEquals(fields.line6, 1_000);
  assertEquals(fields.line9, 200);
  assertEquals(fields.line15, 200);
  assertEquals(pending.f1040.line13_qbi_deduction, 200);
  const native = form8995.build(fields, { pending });
  assertEquals(native.includes("<QualifiedBusinessIncomeDedGrp>"), false);
  assertStringIncludes(
    native,
    "<QlfyREITDivPTPIncomeLossAmt>1000</QlfyREITDivPTPIncomeLossAmt>",
  );
  assertStringIncludes(
    native,
    "<QualifiedBusinessIncomeDedAmt>200</QualifiedBusinessIncomeDedAmt>",
  );
  const xml = buildMefXml(pending, base.filer);
  assertStringIncludes(xml, "<IRS8995 documentId=");
  const pdf = form8995Pdf.projectFields!(fields, pending);
  assertEquals(pdf.line1_business_name, undefined);
  assertEquals(pdf.line6, 1_000);
  assertEquals(pdf.line15, 200);
});

Deno.test("REIT-only Form 8995 rejects changed issued copy, holding, other QBI and return totals", () => {
  const pending = filedReturn();
  const fields = pending.form8995;
  const changedCopy = (copy: Record<string, unknown>) => ({
    ...pending,
    f1099div: { f1099divs: [{ ...reit, ...copy }] },
  });
  for (
    const changed of [
      changedCopy({ box5: 999 }),
      changedCopy({ source_document_reference: undefined }),
      changedCopy({
        section199a_holding_review: {
          ...reit.section199a_holding_review,
          qualified_held_days_in_91_day_window: 45,
        },
      }),
      {
        ...pending,
        f1040: { ...pending.f1040, line3b_ordinary_dividends: 999 },
      },
      { ...pending, f1040: { ...pending.f1040, line13_qbi_deduction: 199 } },
      { ...pending, schedule_c: { schedule_cs: [] } },
    ]
  ) {
    assertThrows(() => form8995.build(fields, { pending: changed }), Error);
    assertThrows(() => form8995Pdf.projectFields!(fields, changed), Error);
  }
  assertThrows(
    () =>
      form8995.build(
        Object.assign({}, fields, { line6: 999 }) as Parameters<
          typeof form8995.build
        >[0],
        { pending },
      ),
    Error,
  );
  assertThrows(
    () => form8995Pdf.projectFields!({ ...fields, line15: 199 }, pending),
    Error,
  );
});
