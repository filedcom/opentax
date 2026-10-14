import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { FilingStatus as HeaderFilingStatus } from "../../../../../../mef/header.ts";
import { FilingStatus as NodeFilingStatus } from "../../../../../../nodes/types.ts";
import {
  calculateOneSstb8995ALines,
  form8995a as node,
  inputSchema,
} from "../../../../../../nodes/intermediate/forms/deductions/business/form8995a/index.ts";
import { form8995a as parent } from "./f8995a.ts";
import { form8995aScheduleA } from "./f8995a_schedule_a.ts";
import { form8995aPdf } from "../../../../../pdf/forms/deductions/business/f8995a.ts";
import { form8995aScheduleAPdf } from "../../../../../pdf/forms/deductions/business/f8995a_schedule_a.ts";

const claim = {
  filing_status: NodeFilingStatus.Single,
  taxable_income: 222_300,
  net_capital_gain: 0,
  sstb_qbi: 100_000,
  sstb_w2_wages: 40_000,
  sstb_unadjusted_basis: 0,
  sstb_filing_details: {
    business_name: "Smith Accounting LLC",
    ein: "123456789",
    business_qbi: 100_000,
    business_w2_wages: 40_000,
    business_ubia: 0,
    one_non_ptp_sstb_confirmed: true as const,
    no_other_business_or_aggregation_confirmed: true as const,
    no_reit_ptp_or_loss_carryforward_confirmed: true as const,
    qualified_dividends_zero_confirmed: true as const,
    qbi_wages_ubia_source_reference:
      "2025 K-1 section 199A accounting statement",
    taxable_income_before_qbi_confirmed: true as const,
  },
};

const filer = {
  primarySSN: "123456789",
  nameLine1: "SMITH JOHN A",
  nameControl: "SMIT",
  address: { line1: "1 MAIN ST", city: "AUSTIN", state: "TX", zip: "78701" },
  filingStatus: HeaderFilingStatus.Single,
};

const pending = {
  form8995a: claim,
  form8995a_schedule_a: claim,
  f1040: {
    line11_agi: 238_050,
    line12c_deduction_total: 15_750,
    line13_qbi_deduction: 10_000,
    line14_deductions_qbi_total: 25_750,
    line15_taxable_income: 212_300,
  },
};

Deno.test("Schedule A zero wage-limit reduction retains all QBI in parent, native, and PDF", () => {
  const parsed = inputSchema.parse(claim);
  const lines = calculateOneSstb8995ALines(parsed);
  assertEquals(lines.line19, 0);
  assertEquals(lines.line25, 0);
  assertEquals(lines.line26, 10_000);
  assertEquals(lines.line39, 10_000);
  const result = node.compute(
    { taxYear: 2025, formType: "f1040" },
    parsed,
  );
  assertEquals(
    result.outputs.find((output) => output.nodeType === "f1040")?.fields
      .line13_qbi_deduction,
    10_000,
  );
  assertEquals(
    result.outputs.find((output) => output.nodeType === "form8995a_schedule_a")
      ?.fields,
    parsed,
  );

  const context = { filer, pending };
  const nativeParent = parent.build(claim, context);
  assertStringIncludes(
    nativeParent,
    "<QBI20PctLessGrtrAllcblShareAmt>0</QBI20PctLessGrtrAllcblShareAmt>",
  );
  assertStringIncludes(
    nativeParent,
    "<TotalPhaseInReductionAmt>0</TotalPhaseInReductionAmt>",
  );
  assertStringIncludes(
    nativeParent,
    "<QBIAfterPhaseInReductionAmt>10000</QBIAfterPhaseInReductionAmt>",
  );
  assertStringIncludes(
    parent.build(claim, context),
    "<QualifiedBusinessIncomeDedAmt>10000</QualifiedBusinessIncomeDedAmt>",
  );
  assertStringIncludes(
    form8995aScheduleA.build(claim, context),
    "<ApplicablePctW2WagesAmt>20000</ApplicablePctW2WagesAmt>",
  );
  const pdfParent = form8995aPdf.projectFields?.(claim, pending);
  const pdfSchedule = form8995aScheduleAPdf.projectFields?.(claim, pending);
  assertEquals(pdfParent?.line19, 0);
  assertEquals(pdfParent?.line25, 0);
  assertEquals(pdfParent?.line26, 10_000);
  assertEquals(pdfParent?.line39, 10_000);
  assertEquals(pdfSchedule?.line12, 20_000);
});

Deno.test("Schedule A zero reduction rejects changed source and settled return amounts", () => {
  const changedSource = {
    ...claim,
    sstb_filing_details: {
      ...claim.sstb_filing_details,
      business_w2_wages: 39_999,
    },
  };
  const changedReturn = {
    ...pending,
    f1040: { ...pending.f1040, line15_taxable_income: 212_301 },
  };
  const missingCompanion = {
    form8995a: claim,
    f1040: pending.f1040,
  };
  assertThrows(
    () => parent.build(changedSource, { filer, pending }),
    Error,
  );
  assertThrows(
    () => parent.build(claim, { filer, pending: missingCompanion }),
    Error,
  );
  for (const graph of [changedReturn]) {
    assertThrows(() => parent.build(claim, { filer, pending: graph }), Error);
    assertThrows(
      () => form8995aScheduleA.build(claim, { filer, pending: graph }),
      Error,
    );
    assertThrows(() => form8995aPdf.projectFields?.(claim, graph), Error);
    assertThrows(
      () => form8995aScheduleAPdf.projectFields?.(claim, graph),
      Error,
    );
  }
});
