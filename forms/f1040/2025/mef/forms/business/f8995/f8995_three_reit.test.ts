import {
  assert,
  assertEquals,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { buildExecutionPlan } from "../../../../../../../core/runtime/planner.ts";
import { execute } from "../../../../../../../core/runtime/executor.ts";
import { form8995Pdf } from "../../../../pdf/forms/business/f8995/f8995.ts";
import { pdfReviewFixtures } from "../../../../pdf/review-fixtures.ts";
import { registry } from "../../../../registry.ts";
import { buildMefXml } from "../../../builder.ts";
import { form8995 } from "./f8995.ts";
import { inputSchema as form8995InputSchema } from "../../../../../nodes/intermediate/forms/form8995/index.ts";

function reit(
  name: string,
  amount: number,
  exDividendDate: string,
  held: number,
  excluded: number,
) {
  return {
    recipient_tin: "111223333",
    payerName: `${name} REIT`,
    source_document_reference: `2025 issued ${name} REIT 1099-DIV`,
    isNominee: false,
    box11: false,
    box1a: amount,
    box5: amount,
    holdingPeriodDays: held + excluded,
    section199a_holding_review: {
      ex_dividend_date: exDividendDate,
      qualified_held_days_in_91_day_window: held,
      diminished_risk_days_excluded: excluded,
      no_related_payment_obligation_confirmed: true,
      review_reference: `${name} REIT 2025 holding review`,
      reviewed_on: "2026-03-01",
    },
  };
}

const dividends = [
  reit("North", 350, "2025-06-01", 50, 10),
  reit("South", 450, "2025-07-01", 55, 10),
  reit("West", 500, "2025-08-01", 60, 10),
];

function filedReturn() {
  const fixture = pdfReviewFixtures.find((item) =>
    item.id === "single-schedule-c"
  );
  if (!fixture) throw new Error("missing Schedule C review fixture");
  const result = execute(buildExecutionPlan(registry), registry, {
    ...fixture.inputs,
    f1099div: dividends,
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  return result.pending;
}

Deno.test("three separately reviewed REIT issuers reconcile Form 8995, Form 1040, native MeF and PDF", () => {
  const pending = filedReturn();
  const fields = pending.form8995;
  assert(fields);
  assertEquals(
    form8995InputSchema.parse(fields).reit_dividend_sources?.length,
    3,
  );
  assertEquals(pending.f1040?.line3b_ordinary_dividends, 1_300);
  assertEquals(fields.line6, 1_300);
  assertEquals(fields.line8, 1_300);
  assertEquals(fields.line9, 260);
  assertEquals(fields.line15, pending.f1040?.line13_qbi_deduction);
  const fixture = pdfReviewFixtures.find((item) =>
    item.id === "single-schedule-c"
  );
  if (!fixture) throw new Error("missing Schedule C review fixture");
  const xml = buildMefXml(pending, fixture.filer);
  assertStringIncludes(xml, "<IRS8995 documentId=");
  assertStringIncludes(
    xml,
    "<QlfyREITDivPTPIncomeLossAmt>1300</QlfyREITDivPTPIncomeLossAmt>",
  );
  const pdf = form8995Pdf.projectFields!(fields, pending);
  assertEquals(pdf.line6, 1_300);
  assertEquals(pdf.line9, 260);
  assertEquals(pdf.line15, pending.f1040?.line13_qbi_deduction);
});

Deno.test("three-issuer Form 8995 route rejects changed copies, identity, holding, totals and prepared lines", () => {
  const pending = filedReturn();
  const fields = pending.form8995;
  assert(fields);
  const changed = (items: typeof dividends) => ({
    ...pending,
    f1099div: { f1099divs: items },
  });
  for (
    const items of [
      [dividends[0], dividends[1], { ...dividends[2], box5: 499 }],
      [dividends[0], dividends[1], {
        ...dividends[2],
        source_document_reference: dividends[0].source_document_reference,
      }],
      [dividends[0], dividends[1], {
        ...dividends[2],
        payerName: "North REIT",
      }],
      [dividends[0], dividends[1], {
        ...dividends[2],
        section199a_holding_review: {
          ...dividends[2].section199a_holding_review,
          review_reference: dividends[1].section199a_holding_review
            .review_reference,
        },
      }],
      [dividends[0], dividends[1], {
        ...dividends[2],
        section199a_holding_review: {
          ...dividends[2].section199a_holding_review,
          qualified_held_days_in_91_day_window: 45,
        },
      }],
      [...dividends, reit("East", 100, "2025-09-01", 50, 10)],
    ]
  ) {
    assertThrows(() => form8995.build(fields, { pending: changed(items) }));
    assertThrows(() => form8995Pdf.projectFields!(fields, changed(items)));
  }
  const wrongReturn = {
    ...pending,
    f1040: { ...pending.f1040, line3b_ordinary_dividends: 1_299 },
  };
  assertThrows(() => form8995.build(fields, { pending: wrongReturn }));
  assertThrows(() => form8995Pdf.projectFields!(fields, wrongReturn));
  const wrongSource = {
    ...fields,
    reit_dividend_sources: [
      ...form8995InputSchema.parse(fields).reit_dividend_sources!.slice(0, 2),
      {
        ...form8995InputSchema.parse(fields).reit_dividend_sources![2],
        box5: 499,
      },
    ],
  };
  assertThrows(() => form8995.build(wrongSource, { pending }));
  assertThrows(() => form8995Pdf.projectFields!(wrongSource, pending));
  assertThrows(() =>
    form8995.build(
      Object.assign({}, fields, { line9: 259 }) as Parameters<
        typeof form8995.build
      >[0],
      { pending },
    )
  );
  assertThrows(() =>
    form8995Pdf.projectFields!({ ...fields, line9: 259 }, pending)
  );
});
