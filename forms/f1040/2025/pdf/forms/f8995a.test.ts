import { assertEquals, assertThrows } from "@std/assert";
import { form8995aPdf } from "./f8995a.ts";
import { form8995aScheduleDPdf } from "./f8995a_schedule_d.ts";

const patron = {
  filing_status: "single",
  taxable_income: 300_000,
  net_capital_gain: 0,
  qbi: 100_000,
  w2_wages: 40_000,
  unadjusted_basis: 0,
  patron_of_specified_cooperative: true,
  business_filing_details: {
    business_name: "Smith Farm",
    ein: "123456789",
    business_qbi: 100_000,
    business_w2_wages: 40_000,
    business_ubia: 0,
    one_non_sstb_business_confirmed: true,
    no_aggregation_confirmed: true,
    no_reit_ptp_or_loss_carryforward_confirmed: true,
    qualified_dividends_zero_confirmed: true,
    qbi_wages_ubia_sources_confirmed: true,
    taxable_income_before_qbi_confirmed: true,
  },
  patron_filing_details: {
    source_1099patr: {
      payer_name: "Farm Coop",
      payer_tin: "987654321",
      box7_qualified_payments: 60_000,
      box6_section199ag_deduction: 0,
      box13_specified_cooperative: true,
      trade_or_business: true,
    },
    qbi_allocable_to_qualified_payments: 50_000,
    w2_wages_allocable_to_qualified_payments: 10_000,
    one_cooperative_confirmed: true,
    allocation_worksheet_reference: "farm-qbi-allocation-2025",
    allocation_worksheet_reviewed_by: "Tax Reviewer",
    allocation_worksheet_review_date: "2026-01-30",
  },
};

const pending = {
  form8995a: patron,
  form8995a_schedule_d: patron,
  f1099patr: { f1099patrs: [patron.patron_filing_details.source_1099patr] },
  f1040: { line13_qbi_deduction: 15_500 },
};

const mapped = (
  descriptor: typeof form8995aPdf,
  key: string,
): string | undefined =>
  descriptor.fields.find((field) => field.domainKey === key)?.pdfField;

Deno.test("Form 8995-A PDF projects column A, patron reduction, and Form 1040 deduction", () => {
  const projected = form8995aPdf.projectFields?.(patron, pending);
  assertEquals(projected?.business_name, "Smith Farm");
  assertEquals(projected?.business_ein, "123456789");
  assertEquals(projected?.patron, true);
  assertEquals(projected?.line2, 100_000);
  assertEquals(projected?.line3, 20_000);
  assertEquals(projected?.line14, 4_500);
  assertEquals(projected?.line15, 15_500);
  assertEquals(projected?.line16, 15_500);
  assertEquals(projected?.line27, 15_500);
  assertEquals(projected?.line39, 15_500);
  assertEquals(
    mapped(form8995aPdf, "patron"),
    "topmostSubform[0].Page1[0].Table_PartI[0].RowA[0].c1_3[0]",
  );
  assertEquals(
    mapped(form8995aPdf, "line14"),
    "topmostSubform[0].Page1[0].Table_PartII[0].Row14[0].f1_45[0]",
  );
  assertEquals(
    mapped(form8995aPdf, "line39"),
    "topmostSubform[0].Page2[0].f2_48[0]",
  );
});

Deno.test("Schedule D PDF projects sourced column A and reconciles line 6 to parent line 14", () => {
  const projected = form8995aScheduleDPdf.projectFields?.(patron, pending);
  assertEquals(projected, {
    line1a: "Smith Farm",
    line1b: "123456789",
    line2: 50_000,
    line3: 4_500,
    line4: 10_000,
    line5: 5_000,
    line6: 4_500,
  });
  assertEquals(
    mapped(form8995aScheduleDPdf, "line6"),
    "topmostSubform[0].Page1[0].Table_SchD[0].Row6[0].f1_21[0]",
  );
});

Deno.test("Form 8995-A PDFs reject missing source, companion, parent, and 1040 mismatch", () => {
  assertThrows(
    () =>
      form8995aPdf.projectFields?.(patron, {
        ...pending,
        f1099patr: { f1099patrs: [] },
      }),
    Error,
    "source must match",
  );
  assertThrows(
    () =>
      form8995aPdf.projectFields?.(patron, {
        ...pending,
        form8995a_schedule_d: { ...patron, taxable_income: 300_001 },
      }),
    Error,
    "matching Schedule D",
  );
  assertThrows(
    () =>
      form8995aScheduleDPdf.projectFields?.(patron, {
        ...pending,
        form8995a: { ...patron, taxable_income: 300_001 },
      }),
    Error,
    "matching parent",
  );
  assertThrows(
    () =>
      form8995aPdf.projectFields?.(patron, {
        ...pending,
        f1040: { line13_qbi_deduction: 15_501 },
      }),
    Error,
    "Form 1040 line 13",
  );
});

Deno.test("Form 8995-A PDF requires SSTB companion and patron status", () => {
  assertThrows(
    () =>
      form8995aPdf.projectFields?.({
        ...patron,
        sstb_qbi: 100,
      }, {
        ...pending,
        form8995a: { ...patron, sstb_qbi: 100 },
      }),
    Error,
    "matching Schedule A companion source",
  );
  assertThrows(
    () =>
      form8995aScheduleDPdf.projectFields?.({
        ...patron,
        patron_of_specified_cooperative: false,
      }, {
        ...pending,
        form8995a: { ...patron, patron_of_specified_cooperative: false },
      }),
    Error,
    "affirmative patron status",
  );
  assertEquals(form8995aPdf.projectFields?.({}, pending), {});
  assertEquals(form8995aScheduleDPdf.projectFields?.({}, pending), {});
});
