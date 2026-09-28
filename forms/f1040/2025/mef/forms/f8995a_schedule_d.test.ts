import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { FilingStatus as HeaderFilingStatus } from "../../../mef/header.ts";
import { FilingStatus as NodeFilingStatus } from "../../../nodes/types.ts";
import { form8995a } from "./f8995a.ts";
import { form8995aScheduleD } from "./f8995a_schedule_d.ts";

const patron = {
  filing_status: NodeFilingStatus.Single,
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
    one_non_sstb_business_confirmed: true as const,
    no_aggregation_confirmed: true as const,
    no_reit_ptp_or_loss_carryforward_confirmed: true as const,
    qualified_dividends_zero_confirmed: true as const,
    qbi_wages_ubia_sources_confirmed: true as const,
    taxable_income_before_qbi_confirmed: true as const,
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
    one_cooperative_confirmed: true as const,
    allocation_worksheet_reference: "farm-qbi-allocation-2025",
    allocation_worksheet_reviewed_by: "Tax Reviewer",
    allocation_worksheet_review_date: "2026-01-30",
  },
};

const filer = {
  primarySSN: "123456789",
  nameLine1: "SMITH JOHN A",
  nameControl: "SMIT",
  address: { line1: "1 MAIN ST", city: "AUSTIN", state: "TX", zip: "78701" },
  filingStatus: HeaderFilingStatus.Single,
};

const context = {
  filer,
  pending: {
    f1040: { line13_qbi_deduction: 15_500 },
    form8995a: patron,
    form8995a_schedule_d: patron,
    f1099patr: { f1099patrs: [patron.patron_filing_details.source_1099patr] },
  },
};

Deno.test("Form 8995-A patron parent and distinct Schedule D both use the same nonzero reduction", () => {
  const parent = form8995a.build(patron, context);
  const scheduleD = form8995aScheduleD.build(patron, context);
  assertStringIncludes(parent, "<PatronInd>X</PatronInd>");
  assertStringIncludes(parent, "<PatronReductionAmt>4500</PatronReductionAmt>");
  assertStringIncludes(parent, "<QBIComponentAmt>15500</QBIComponentAmt>");
  assertStringIncludes(parent, "<QualifiedBusinessIncomeDedAmt>15500</QualifiedBusinessIncomeDedAmt>");
  assertStringIncludes(scheduleD, "<IRS8995AScheduleD><PatronAgricHortCoopGrp>");
  assertStringIncludes(scheduleD, "<QBIAllcblQlfyCoopPymtAmt>50000</QBIAllcblQlfyCoopPymtAmt>");
  assertStringIncludes(scheduleD, "<QBIAllcblQlfyCoopPymtPctAmt>4500</QBIAllcblQlfyCoopPymtPctAmt>");
  assertStringIncludes(scheduleD, "<W2WageAllcblQlfyCoopPymtPctAmt>5000</W2WageAllcblQlfyCoopPymtPctAmt>");
  assertStringIncludes(scheduleD, "<PatronReductionAmt>4500</PatronReductionAmt>");
});

Deno.test("Schedule D trigger rejects a missing companion before Form 8995-A XML", () => {
  assertThrows(() => form8995a.build(patron, {
    filer,
    pending: {
      f1040: { line13_qbi_deduction: 15_500 },
      form8995a: patron,
      f1099patr: context.pending.f1099patr,
    },
  }), Error, "companion is missing");
});

Deno.test("Schedule D rejects a missing parent and altered line 14 source", () => {
  assertThrows(() => form8995aScheduleD.build(patron, {
    filer,
    pending: {
      f1040: { line13_qbi_deduction: 15_500 },
      form8995a_schedule_d: patron,
    },
  }), Error, "matching parent");
  const altered = {
    ...patron,
    patron_filing_details: {
      ...patron.patron_filing_details,
      qbi_allocable_to_qualified_payments: 60_000,
    },
  };
  assertThrows(() => form8995aScheduleD.build(altered, context), Error, "matching parent");
  assertThrows(() => form8995a.build(patron, {
    filer,
    pending: { ...context.pending, form8995a_schedule_d: altered },
  }), Error, "differs from its parent");
});

Deno.test("Schedule D rejects Form 1040 line 13 mismatch and untriggered companion", () => {
  assertThrows(() => form8995aScheduleD.build(patron, {
    filer,
    pending: { ...context.pending, f1040: { line13_qbi_deduction: 15_501 } },
  }), Error, "Form 1040 line 13");
  assertThrows(() => form8995aScheduleD.build({
    ...patron,
    patron_of_specified_cooperative: false,
  }, {
    filer,
    pending: {
      ...context.pending,
      form8995a: { ...patron, patron_of_specified_cooperative: false },
    },
  }), Error, "cooperative source requires affirmative patron status");
  assertEquals(form8995aScheduleD.build([]), "");
});

Deno.test("Schedule D requires reviewed QBI and wage allocation worksheet reference", () => {
  assertThrows(() => form8995aScheduleD.build({
    ...patron,
    patron_filing_details: {
      ...patron.patron_filing_details,
      allocation_worksheet_reference: "",
    },
  }, context), Error);
});
