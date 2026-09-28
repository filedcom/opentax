import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { FilingStatus as HeaderFilingStatus } from "../../../mef/header.ts";
import { FilingStatus as NodeFilingStatus } from "../../../nodes/types.ts";
import { form8995a as parent } from "./f8995a.ts";
import { form8995aScheduleA } from "./f8995a_schedule_a.ts";
import {
  form8995a as node,
  inputSchema,
} from "../../../nodes/intermediate/forms/form8995a/index.ts";

const input = {
  filing_status: NodeFilingStatus.Single,
  taxable_income: 222_300,
  net_capital_gain: 0,
  sstb_qbi: 100_000,
  sstb_w2_wages: 10_000,
  sstb_unadjusted_basis: 0,
  sstb_filing_details: {
    business_name: "Smith Accounting LLC",
    ein: "123456789",
    business_qbi: 100_000,
    business_w2_wages: 10_000,
    business_ubia: 0,
    one_non_ptp_sstb_confirmed: true as const,
    no_other_business_or_aggregation_confirmed: true as const,
    no_reit_ptp_or_loss_carryforward_confirmed: true as const,
    qualified_dividends_zero_confirmed: true as const,
    qbi_wages_ubia_source_reference: "2025 K-1 statement 199A accounting activity",
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

const context = {
  filer,
  pending: {
    form8995a: input,
    form8995a_schedule_a: input,
    f1040: { line13_qbi_deduction: 6_250 },
  },
};

Deno.test("Form 8995-A Schedule A: source, parent, and 1040 reconcile at 50% SSTB phase-in", () => {
  const result = node.compute(
    { taxYear: 2025, formType: "f1040" },
    inputSchema.parse(input),
  );
  assertEquals(result.outputs.find((output) => output.nodeType === "f1040")?.fields.line13_qbi_deduction, 6_250);
  assertEquals(result.outputs.find((output) => output.nodeType === "form8995a_schedule_a")?.fields, inputSchema.parse(input));
  const scheduleXml = form8995aScheduleA.build(input, context);
  assertStringIncludes(scheduleXml, "<PhaseInPct>0.50000</PhaseInPct><ApplicablePct>0.50000</ApplicablePct>");
  assertStringIncludes(scheduleXml, "<QualifedBusinessIncomeAmt>100000</QualifedBusinessIncomeAmt>");
  assertStringIncludes(scheduleXml, "<ApplicablePctQBIAmt>50000</ApplicablePctQBIAmt>");
  const parentXml = parent.build(input, context);
  assertStringIncludes(parentXml, "<SpecifiedServiceInd>X</SpecifiedServiceInd>");
  assertStringIncludes(parentXml, "<QualifiedBusinessIncomeAmt>50000</QualifiedBusinessIncomeAmt>");
  assertStringIncludes(parentXml, "<TotalPhaseInReductionAmt>3750</TotalPhaseInReductionAmt>");
  assertStringIncludes(parentXml, "<QualifiedBusinessIncomeDedAmt>6250</QualifiedBusinessIncomeDedAmt>");
});

Deno.test("Form 8995-A Schedule A: missing or altered companion and 1040 mismatch reject", () => {
  assertThrows(() => parent.build(input, {
    ...context, pending: { ...context.pending, form8995a_schedule_a: undefined },
  }), Error, "companion is missing");
  assertThrows(() => form8995aScheduleA.build({ ...input, sstb_qbi: 99_999 }, context), Error, "matching parent");
  assertThrows(() => form8995aScheduleA.build(input, {
    ...context, pending: { ...context.pending, f1040: { line13_qbi_deduction: 6_249 } },
  }), Error, "Form 1040 line 13");
});

Deno.test("Form 8995-A Schedule A: thresholds, extra business, unsourced amounts reject", () => {
  assertThrows(() => parent.build({ ...input, taxable_income: 247_300 }, context), Error, "phase-in range");
  assertThrows(() => parent.build({ ...input, sstb_qbi: 99_999 }, context), Error, "only business");
  assertThrows(() => parent.build({ ...input, qbi: 100 }, context), Error, "only business");
  assertThrows(() => parent.build({ ...input, sstb_filing_details: undefined }, context), Error, "identified single-filer SSTB");
  assertThrows(() => parent.build({
    ...input,
    sstb_w2_wages: 100_000,
    sstb_filing_details: { ...input.sstb_filing_details, business_w2_wages: 100_000 },
  }, context), Error, "requires a phased-in wage-limit reduction");
});

Deno.test("Form 8995-A Schedule A: absent pending emits no document", () => {
  assertEquals(form8995aScheduleA.build([]), "");
});
