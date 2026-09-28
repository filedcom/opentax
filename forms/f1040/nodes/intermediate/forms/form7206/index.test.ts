import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { TS } from "../../../types.ts";
import { FilingStatus } from "../../../../mef/header.ts";
import { schedule_se } from "../schedule_se/index.ts";
import { scheduleC as scheduleCNode } from "../../../inputs/schedule_c/index.ts";
import {
  PlanType,
  sep_retirement,
} from "../../../inputs/sep_retirement/index.ts";
import {
  calculateSingleScheduleCForm7206,
  form7206,
  inputSchema,
  type SingleScheduleCPlan,
  singleScheduleCPlanSchema,
} from "./index.ts";
import { form7206 as form7206Mef } from "../../../../2025/mef/forms/f7206.ts";
import { form7206Pdf } from "../../../../2025/pdf/forms/f7206.ts";
import { schedule1 as schedule1Mef } from "../../../../2025/mef/forms/schedule1.ts";
import { inputNodes } from "../../../../2025/inputs.ts";

const source: SingleScheduleCPlan = {
  business_reference: "SCHEDULE-C-A",
  plan_identifier: "HEALTH-2025-A",
  recipient: TS.T,
  taxpayer_identity: { name: "Alex Example", ssn: "123456789" },
  premium_months: Array.from({ length: 12 }, (_, index) => ({
    month: index + 1,
    paid_premium: 1_000,
    policy_source_reference: "2025 taxpayer-only policy statement",
    payment_source_reference: `2025 premium receipt month ${index + 1}`,
    covered_person: "taxpayer" as const,
    eligible_for_subsidized_employer_plan: false,
    employer_plan_review_reference: "2025 employer enrollment review",
    marketplace_policy: false,
    long_term_care_policy: false,
    public_safety_officer_excluded_amount: 0,
  })),
  schedule_c_line31_net_profit: 50_000,
  schedule1_line15_se_tax_deduction: 3_000,
  schedule1_line16_retirement_deduction: 2_000,
  plan_established_under_business: true,
  sole_positive_business_verified: true,
  no_form2555: true,
  no_schedule_se_optional_method: true,
  no_other_earned_income: true,
};

const scheduleC = {
  schedule_cs: [{
    business_reference: "SCHEDULE-C-A",
    proprietor_recipient: TS.T,
    line_a_principal_business: "Consulting",
    line_b_business_code: "541600",
    line_f_accounting_method: "cash" as const,
    line_g_material_participation: true,
    line_1_gross_receipts: 50_000,
  }],
};

Deno.test("2025 Form 7206 identified-plan source is a registered filing input", () => {
  assertEquals(
    inputNodes.some((entry) => entry.node.nodeType === "form7206"),
    true,
  );
});

Deno.test("2025 Form 7206 receives calculated Schedule C, SE, and retirement facts", () => {
  const c = scheduleCNode.compute(
    { taxYear: 2025, formType: "f1040" },
    scheduleC,
  );
  assertEquals(
    c.outputs.find((row) => row.nodeType === "form7206")?.fields
      .schedule_c_source,
    {
      unadjusted_source: true,
      businesses: [{
        business_reference: "SCHEDULE-C-A",
        proprietor_recipient: TS.T,
        line31_net_profit: 50_000,
      }],
    },
  );
  const se = schedule_se.compute(
    { taxYear: 2025, formType: "f1040" },
    { net_profit_schedule_c: 50_000 },
  );
  assertEquals(
    se.outputs.find((row) => row.nodeType === "form7206")?.fields
      .schedule_se_source,
    {
      net_profit_schedule_c: 50_000,
      net_profit_schedule_f: 0,
      farm_optional_method_elected: false,
      line13_deduction: scheduleSEOutput,
    },
  );
  const retirement = sep_retirement.compute(
    { taxYear: 2025, formType: "f1040" },
    { sep_retirements: [{ plan_type: PlanType.SEP, sep_contribution: 1_000 }] },
  );
  assertEquals(
    retirement.outputs.find((row) => row.nodeType === "form7206")?.fields
      .schedule1_line16_source,
    1_000,
  );
});

Deno.test("2025 Form 7206 computes the single Schedule C plan's lines 1-14", () => {
  assertEquals(calculateSingleScheduleCForm7206(source), {
    line1: 12_000,
    line2: 0,
    line3: 12_000,
    line4: 50_000,
    line5: 50_000,
    line6: 1,
    line7: 3_000,
    line8: 47_000,
    line9: 2_000,
    line10: 45_000,
    line12: 0,
    line13: 45_000,
    line14: 12_000,
  });
});

Deno.test("2025 Form 7206 derives eligible premiums month by month", () => {
  const months = source.premium_months.map((month, index) =>
    index === 0
      ? { ...month, eligible_for_subsidized_employer_plan: true }
      : index === 1
      ? {
        ...month,
        public_safety_officer_excluded_amount: 200,
        public_safety_officer_exclusion_source_reference:
          "2025 public safety retirement distribution record",
      }
      : month
  );
  const lines = calculateSingleScheduleCForm7206({
    ...source,
    premium_months: months,
  });
  assertEquals(lines.line1, 10_800);
  assertEquals(lines.line3, 10_800);
  assertEquals(lines.line14, 10_800);
});

Deno.test("2025 Form 7206 premium evidence rejects gaps and unsupported months", () => {
  assertEquals(
    singleScheduleCPlanSchema.safeParse({
      ...source,
      premium_months: source.premium_months.slice(0, 11),
    }).success,
    false,
  );
  assertEquals(
    singleScheduleCPlanSchema.safeParse({
      ...source,
      premium_months: [
        source.premium_months[1],
        source.premium_months[0],
        ...source.premium_months.slice(2),
      ],
    }).success,
    false,
  );
  assertEquals(
    singleScheduleCPlanSchema.safeParse({
      ...source,
      eligible_health_premiums: 12_000,
    }).success,
    false,
  );
  assertThrows(
    () =>
      calculateSingleScheduleCForm7206({
        ...source,
        premium_months: source.premium_months.map((month, index) =>
          index === 0 ? { ...month, marketplace_policy: true } : month
        ),
      }),
    Error,
    "excludes Marketplace and long-term-care premiums",
  );
  assertThrows(
    () =>
      calculateSingleScheduleCForm7206({
        ...source,
        premium_months: source.premium_months.map((month, index) =>
          index === 0
            ? { ...month, public_safety_officer_excluded_amount: 1_001 }
            : month
        ),
      }),
    Error,
    "exclusion exceeds",
  );
  assertThrows(
    () =>
      calculateSingleScheduleCForm7206({
        ...source,
        premium_months: source.premium_months.map((month, index) =>
          index === 0
            ? { ...month, public_safety_officer_excluded_amount: 200 }
            : month
        ),
      }),
    Error,
    "needs a source reference",
  );
  assertThrows(
    () =>
      calculateSingleScheduleCForm7206({
        ...source,
        premium_months: source.premium_months.map((month, index) =>
          index < 4
            ? {
              ...month,
              public_safety_officer_excluded_amount: 800,
              public_safety_officer_exclusion_source_reference:
                "2025 public safety retirement distribution record",
            }
            : month
        ),
      }),
    Error,
    "annual $3,000 limit",
  );
});

Deno.test("2025 Form 7206 helper caps the deduction at earned income", () => {
  const lines = calculateSingleScheduleCForm7206({
    ...source,
    premium_months: source.premium_months.map((month) => ({
      ...month,
      paid_premium: 4_000,
    })),
  });
  assertEquals(lines.line14, 45_000);
});

Deno.test("2025 Form 7206 does not trust asserted premium eligibility or spouse ownership", () => {
  assertThrows(
    () =>
      form7206.compute(
        { taxYear: 2025, formType: "f1040" },
        {
          single_schedule_c_plan: {
            ...source,
            schedule1_line15_se_tax_deduction: 0,
            schedule1_line16_retirement_deduction: 0,
          },
          marketplace_ptc_premium_overlap: false,
        },
      ),
    Error,
    "needs one taxpayer-owned Schedule C",
  );
  assertEquals(
    singleScheduleCPlanSchema.safeParse({
      ...source,
      recipient: TS.S,
    }).success,
    false,
  );
});

Deno.test("2025 Form 7206 rejects unsupported or unsourced plans", () => {
  assertThrows(
    () =>
      inputSchema.parse({
        se_net_profit: 50_000,
        health_insurance_premiums: 12_000,
      }),
    Error,
  );
  assertThrows(
    () =>
      calculateSingleScheduleCForm7206({
        ...source,
        premium_months: source.premium_months.map((month, index) =>
          index === 0 ? { ...month, long_term_care_policy: true } : month
        ),
      }),
    Error,
    "excludes Marketplace and long-term-care premiums",
  );
  assertThrows(
    () =>
      calculateSingleScheduleCForm7206({
        ...source,
        schedule1_line15_se_tax_deduction: 51_000,
      }),
    Error,
    "exceed the establishing business income",
  );
  assertThrows(
    () =>
      form7206.compute({ taxYear: 2025, formType: "f1040" }, {
        single_schedule_c_plan: source,
        marketplace_ptc_premium_overlap: true,
      }),
    Error,
    "requires Publication 974",
  );
});

const scheduleSEOutput = schedule_se.compute(
  { taxYear: 2025, formType: "f1040" },
  { net_profit_schedule_c: 50_000 },
).outputs.find((row) => row.nodeType === "schedule1")?.fields
  .line15_se_deduction;
if (typeof scheduleSEOutput !== "number") {
  throw new Error("Form 7206 fixture needs computed Schedule SE line 13");
}
const filingSource = {
  ...source,
  schedule1_line15_se_tax_deduction: scheduleSEOutput,
  schedule1_line16_retirement_deduction: 0,
};
const filingLines = calculateSingleScheduleCForm7206(filingSource);
const filingFields = {
  single_schedule_c_plan: filingSource,
  recipient_name: "Alex Example",
  recipient_ssn: "123456789",
  ...filingLines,
};
const filingPending = {
  schedule_c: scheduleC,
  schedule_se: { net_profit_schedule_c: 50_000 },
  schedule1: {
    line3_schedule_c: 50_000,
    line15_se_deduction: scheduleSEOutput,
    line16_sep_simple: 0,
    line17_se_health_insurance: 12_000,
    line26_total_adjustments: scheduleSEOutput + 12_000,
  },
  f1040: { line10_adjustments: scheduleSEOutput + 12_000 },
};

Deno.test("2025 Form 7206 accepts a source-reconciled one-plan return", () => {
  const result = form7206.compute({ taxYear: 2025, formType: "f1040" }, {
    single_schedule_c_plan: filingSource,
    schedule_c_source: {
      unadjusted_source: true,
      businesses: [{
        business_reference: "SCHEDULE-C-A",
        proprietor_recipient: TS.T,
        line31_net_profit: 50_000,
      }],
    },
    schedule_se_source: {
      net_profit_schedule_c: 50_000,
      net_profit_schedule_f: 0,
      farm_optional_method_elected: false,
      line13_deduction: scheduleSEOutput,
    },
    marketplace_ptc_premium_overlap: false,
  });
  assertEquals(
    result.outputs.find((row) => row.nodeType === "schedule1")?.fields
      .line17_se_health_insurance,
    12_000,
  );
  assertEquals(
    result.outputs.find((row) => row.nodeType === "form7206")?.fields
      .line14,
    12_000,
  );
  const xml = form7206Mef.build(filingFields, {
    filer: {
      primarySSN: "123456789",
      nameLine1: "Alex Example",
      nameControl: "EXAM",
      address: {
        line1: "1 Main St",
        city: "Albany",
        state: "NY",
        zip: "12207",
      },
      filingStatus: FilingStatus.Single,
    },
    pending: filingPending,
  });
  assertStringIncludes(xml, "<IRS7206>");
  assertStringIncludes(
    xml,
    "<SelfEmpldHealthInsDedAmt>12000</SelfEmpldHealthInsDedAmt>",
  );
  assertStringIncludes(
    schedule1Mef.build(filingPending.schedule1),
    "<SelfEmpldHealthInsDedAmt>12000</SelfEmpldHealthInsDedAmt>",
  );
  assertEquals(
    form7206Pdf.projectFields?.(filingFields, filingPending)?.line6_pct,
    "100%",
  );
});

Deno.test("2025 Form 7206 rejects mismatched owner, retirement, and PTC facts", () => {
  assertThrows(
    () =>
      form7206.compute({ taxYear: 2025, formType: "f1040" }, {
        single_schedule_c_plan: filingSource,
        schedule_c_source: {
          unadjusted_source: true,
          businesses: [{
            business_reference: "SCHEDULE-C-A",
            proprietor_recipient: TS.S,
            line31_net_profit: 50_000,
          }],
        },
        schedule_se_source: {
          net_profit_schedule_c: 50_000,
          net_profit_schedule_f: 0,
          farm_optional_method_elected: false,
          line13_deduction: scheduleSEOutput,
        },
        marketplace_ptc_premium_overlap: false,
      }),
    Error,
    "taxpayer-owned Schedule C",
  );
  assertThrows(
    () =>
      form7206.compute({ taxYear: 2025, formType: "f1040" }, {
        single_schedule_c_plan: filingSource,
        schedule_c_source: {
          unadjusted_source: true,
          businesses: [{
            business_reference: "SCHEDULE-C-A",
            proprietor_recipient: TS.T,
            line31_net_profit: 50_000,
          }],
        },
        schedule_se_source: {
          net_profit_schedule_c: 50_000,
          net_profit_schedule_f: 0,
          farm_optional_method_elected: false,
          line13_deduction: scheduleSEOutput,
        },
        schedule1_line16_source: 1_000,
        marketplace_ptc_premium_overlap: false,
      }),
    Error,
    "zero retirement deduction",
  );
  assertThrows(
    () =>
      form7206Mef.build(filingFields, {
        filer: {
          primarySSN: "123456789",
          nameLine1: "Alex Example",
          nameControl: "EXAM",
          address: {
            line1: "1 Main St",
            city: "Albany",
            state: "NY",
            zip: "12207",
          },
          filingStatus: FilingStatus.Single,
        },
        pending: {
          ...filingPending,
          form8962: { annual_premium: 10_000 },
        },
      }),
    Error,
    "Marketplace",
  );
  assertThrows(
    () =>
      form7206Mef.build(filingFields, {
        filer: {
          primarySSN: "123456789",
          nameLine1: "Alex Example",
          nameControl: "EXAM",
          address: {
            line1: "1 Main St",
            city: "Albany",
            state: "NY",
            zip: "12207",
          },
          filingStatus: FilingStatus.Single,
        },
        pending: {
          ...filingPending,
          schedule_se: { net_profit_schedule_c: 100_000 },
        },
      }),
    Error,
    "does not reconcile",
  );
  assertThrows(
    () =>
      form7206Pdf.projectFields?.(filingFields, {
        ...filingPending,
        f1040: { line10_adjustments: 1 },
      }),
    Error,
    "does not reconcile",
  );
  assertThrows(
    () =>
      form7206Pdf.projectFields?.(
        { ...filingFields, line11: 10 },
        filingPending,
      ),
    Error,
    "unreviewed fields",
  );
});
