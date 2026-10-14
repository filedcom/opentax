import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { FilingStatus as HeaderFilingStatus } from "../../../../../../mef/header.ts";
import { FilingStatus as NodeFilingStatus } from "../../../../../../nodes/types.ts";
import { form8995a as parent } from "./f8995a.ts";
import { form8995aScheduleA } from "./f8995a_schedule_a.ts";
import {
  form8995a as node,
  inputSchema,
} from "../../../../../../nodes/intermediate/forms/deductions/business/form8995a/index.ts";

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
  assertThrows(() => parent.build({ ...input, sstb_filing_details: undefined }, context), Error, "identified single, head-of-household, surviving-spouse, separate, or joint-filer SSTB");
  assertThrows(() => parent.build({
    ...input,
    sstb_w2_wages: 100_000,
    sstb_filing_details: { ...input.sstb_filing_details, business_w2_wages: 99_999 },
  }, context), Error, "only business");
});

Deno.test("Form 8995-A Schedule A: absent pending emits no document", () => {
  assertEquals(form8995aScheduleA.build([]), "");
});

Deno.test("Form 8995-A Schedule A: joint filer uses the 2025 joint phase-in and matches return header", () => {
  const joint = {
    ...input,
    filing_status: NodeFilingStatus.MFJ,
    taxable_income: 444_600,
  };
  const jointContext = {
    filer: { ...filer, filingStatus: HeaderFilingStatus.MarriedFilingJointly },
    pending: {
      form8995a: joint,
      form8995a_schedule_a: joint,
      f1040: { line13_qbi_deduction: 6_250 },
    },
  };
  const result = node.compute(
    { taxYear: 2025, formType: "f1040" },
    inputSchema.parse(joint),
  );
  assertEquals(
    result.outputs.find((output) => output.nodeType === "f1040")?.fields.line13_qbi_deduction,
    6_250,
  );
  const scheduleXml = form8995aScheduleA.build(joint, jointContext);
  assertStringIncludes(scheduleXml, "<FilingStatusThresholdCd>394600</FilingStatusThresholdCd>");
  assertStringIncludes(scheduleXml, "<FilingStatusPhaseInRangeCd>100000</FilingStatusPhaseInRangeCd>");
  const parentXml = parent.build(joint, jointContext);
  assertStringIncludes(parentXml, "<FilingStatusThresholdCd>394600</FilingStatusThresholdCd>");
  assertStringIncludes(parentXml, "<QualifiedBusinessIncomeDedAmt>6250</QualifiedBusinessIncomeDedAmt>");
  assertThrows(
    () => parent.build(joint, { ...jointContext, filer }),
    Error,
    "filing status differs",
  );
  assertThrows(
    () => form8995aScheduleA.build(joint, { ...jointContext, filer }),
    Error,
    "filing status differs",
  );
  assertThrows(
    () => parent.build({ ...joint, taxable_income: 494_600 }, jointContext),
    Error,
    "phase-in range",
  );
});

Deno.test("Form 8995-A Schedule A: head of household uses the other-return phase-in", () => {
  const household = { ...input, filing_status: NodeFilingStatus.HOH };
  const householdContext = {
    filer: { ...filer, filingStatus: HeaderFilingStatus.HeadOfHousehold },
    pending: {
      form8995a: household,
      form8995a_schedule_a: household,
      f1040: { line13_qbi_deduction: 6_250 },
    },
  };
  const result = node.compute(
    { taxYear: 2025, formType: "f1040" },
    inputSchema.parse(household),
  );
  assertEquals(
    result.outputs.find((output) => output.nodeType === "f1040")?.fields.line13_qbi_deduction,
    6_250,
  );
  const scheduleXml = form8995aScheduleA.build(household, householdContext);
  assertStringIncludes(scheduleXml, "<FilingStatusThresholdCd>197300</FilingStatusThresholdCd>");
  assertStringIncludes(scheduleXml, "<FilingStatusPhaseInRangeCd>50000</FilingStatusPhaseInRangeCd>");
  assertStringIncludes(parent.build(household, householdContext), "<QualifiedBusinessIncomeDedAmt>6250</QualifiedBusinessIncomeDedAmt>");
  assertThrows(
    () => form8995aScheduleA.build(household, { ...householdContext, filer }),
    Error,
    "filing status differs",
  );
  assertThrows(
    () => parent.build(household, { ...householdContext, filer }),
    Error,
    "filing status differs",
  );
  assertThrows(
    () => parent.build({ ...household, taxable_income: 247_300 }, householdContext),
    Error,
    "phase-in range",
  );
});

Deno.test("Form 8995-A Schedule A: qualifying surviving spouse uses the nonjoint phase-in", () => {
  const survivor = { ...input, filing_status: NodeFilingStatus.QSS };
  const survivorContext = {
    filer: { ...filer, filingStatus: HeaderFilingStatus.QualifyingSurvivingSpouse },
    pending: {
      form8995a: survivor,
      form8995a_schedule_a: survivor,
      f1040: { line13_qbi_deduction: 6_250 },
    },
  };
  const result = node.compute(
    { taxYear: 2025, formType: "f1040" },
    inputSchema.parse(survivor),
  );
  assertEquals(
    result.outputs.find((output) => output.nodeType === "f1040")?.fields
      .line13_qbi_deduction,
    6_250,
  );
  const scheduleXml = form8995aScheduleA.build(survivor, survivorContext);
  assertStringIncludes(scheduleXml, "<FilingStatusThresholdCd>197300</FilingStatusThresholdCd>");
  assertStringIncludes(scheduleXml, "<FilingStatusPhaseInRangeCd>50000</FilingStatusPhaseInRangeCd>");
  assertStringIncludes(
    parent.build(survivor, survivorContext),
    "<QualifiedBusinessIncomeDedAmt>6250</QualifiedBusinessIncomeDedAmt>",
  );
  assertThrows(
    () => parent.build(survivor, { ...survivorContext, filer }),
    Error,
    "filing status differs",
  );
  assertThrows(
    () => form8995aScheduleA.build(survivor, { ...survivorContext, filer }),
    Error,
    "filing status differs",
  );
  assertThrows(
    () => parent.build({ ...survivor, taxable_income: 247_300 }, survivorContext),
    Error,
    "phase-in range",
  );
});

Deno.test("Form 8995-A Schedule A: MFS taxpayer-owned SSTB uses the nonjoint phase-in", () => {
  const separate = {
    ...input,
    filing_status: NodeFilingStatus.MFS,
    sstb_filing_details: {
      ...input.sstb_filing_details,
      mfs_owner_ssn: filer.primarySSN,
      mfs_allocation_source_reference: "2025 separate-return SSTB allocation workpaper",
      mfs_no_spouse_share_confirmed: true as const,
    },
  };
  const separateContext = {
    filer: { ...filer, filingStatus: HeaderFilingStatus.MarriedFilingSeparately },
    pending: {
      form8995a: separate,
      form8995a_schedule_a: separate,
      f1040: { line13_qbi_deduction: 6_250 },
    },
  };
  const result = node.compute(
    { taxYear: 2025, formType: "f1040" },
    inputSchema.parse(separate),
  );
  assertEquals(
    result.outputs.find((output) => output.nodeType === "f1040")?.fields.line13_qbi_deduction,
    6_250,
  );
  const scheduleXml = form8995aScheduleA.build(separate, separateContext);
  assertStringIncludes(scheduleXml, "<FilingStatusThresholdCd>197300</FilingStatusThresholdCd>");
  assertStringIncludes(scheduleXml, "<FilingStatusPhaseInRangeCd>50000</FilingStatusPhaseInRangeCd>");
  assertStringIncludes(parent.build(separate, separateContext), "<QualifiedBusinessIncomeDedAmt>6250</QualifiedBusinessIncomeDedAmt>");
  assertThrows(
    () => parent.build(separate, { ...separateContext, filer }),
    Error,
    "filing status differs",
  );
  assertThrows(
    () => form8995aScheduleA.build(separate, { ...separateContext, filer }),
    Error,
    "filing status differs",
  );
  const wrongOwner = {
    ...separate,
    sstb_filing_details: {
      ...separate.sstb_filing_details,
      mfs_owner_ssn: "987654321",
    },
  };
  assertThrows(
    () => parent.build(wrongOwner, {
      ...separateContext,
      pending: { ...separateContext.pending, form8995a: wrongOwner, form8995a_schedule_a: wrongOwner },
    }),
    Error,
    "owner differs",
  );
  assertThrows(
    () => form8995aScheduleA.build(wrongOwner, {
      ...separateContext,
      pending: { ...separateContext.pending, form8995a: wrongOwner, form8995a_schedule_a: wrongOwner },
    }),
    Error,
    "owner differs",
  );
  assertThrows(
    () => node.compute(
      { taxYear: 2025, formType: "f1040" },
      inputSchema.parse({
        ...separate,
        sstb_filing_details: {
          ...separate.sstb_filing_details,
          mfs_allocation_source_reference: undefined,
        },
      }),
    ),
    Error,
    "allocation source",
  );
});
