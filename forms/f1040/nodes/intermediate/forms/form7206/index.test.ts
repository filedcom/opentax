import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { form7206 } from "./index.ts";
import { form8962 } from "../form8962/index.ts";
import { FilingStatus } from "../../../types.ts";
import { form7206 as form7206Mef } from "../../../../2025/mef/forms/f7206.ts";
import { form7206Pdf } from "../../../../2025/pdf/forms/f7206.ts";
import { form8962 as form8962Mef } from "../../../../2025/mef/forms/f8962.ts";
import { form8962Pdf } from "../../../../2025/pdf/forms/f8962.ts";

function compute(input: Record<string, unknown>) {
  return form7206.compute({ taxYear: 2025, formType: "f1040" }, {
    marketplace_ptc_premium_overlap: false,
    ...input,
  });
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ─── Smoke Tests ─────────────────────────────────────────────────────────────

Deno.test("smoke — empty input returns no outputs", () => {
  const result = compute({});
  assertEquals(result.outputs.length, 0);
});

Deno.test("no premiums → no deduction", () => {
  const result = compute({ se_net_profit: 50_000 });
  assertEquals(result.outputs.length, 0);
});

// ─── Basic Health Insurance Deduction ────────────────────────────────────────

Deno.test("health premiums within SE profit → full deduction", () => {
  const result = compute({
    se_net_profit: 50_000,
    health_insurance_premiums: 10_000,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.fields.line17_se_health_insurance, 10_000);
});

Deno.test("health premiums exceed SE profit → capped at SE profit", () => {
  // $30k premiums but only $20k SE profit
  const result = compute({
    se_net_profit: 20_000,
    health_insurance_premiums: 30_000,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.fields.line17_se_health_insurance, 20_000);
});

Deno.test("zero SE profit → no deduction even with premiums", () => {
  const result = compute({
    se_net_profit: 0,
    health_insurance_premiums: 10_000,
  });
  assertEquals(findOutput(result, "schedule1"), undefined);
});

// ─── LTC Premium Age-Based Limits ────────────────────────────────────────────

Deno.test("LTC premiums — age 35 (≤40): $480 limit", () => {
  // $2,000 LTC premiums, age 35 → capped at $480
  const result = compute({
    se_net_profit: 50_000,
    ltc_premiums: 2_000,
    taxpayer_age: 35,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.fields.line17_se_health_insurance, 480);
});

Deno.test("LTC premiums — age 45 (41-50): $900 limit", () => {
  const result = compute({
    se_net_profit: 50_000,
    ltc_premiums: 2_000,
    taxpayer_age: 45,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.fields.line17_se_health_insurance, 900);
});

Deno.test("LTC premiums — age 55 (51-60): $1,800 limit", () => {
  const result = compute({
    se_net_profit: 50_000,
    ltc_premiums: 5_000,
    taxpayer_age: 55,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.fields.line17_se_health_insurance, 1_800);
});

Deno.test("LTC premiums — age 65 (61-70): $4,810 limit (TY2025)", () => {
  const result = compute({
    se_net_profit: 50_000,
    ltc_premiums: 10_000,
    taxpayer_age: 65,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.fields.line17_se_health_insurance, 4_810);
});

Deno.test("LTC premiums — age 71 (>70): $6,020 limit (TY2025)", () => {
  const result = compute({
    se_net_profit: 50_000,
    ltc_premiums: 10_000,
    taxpayer_age: 71,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.fields.line17_se_health_insurance, 6_020);
});

Deno.test("LTC premiums — below age limit → full amount allowed", () => {
  // $400 LTC, age 45 → limit is $900 → full $400 allowed
  const result = compute({
    se_net_profit: 50_000,
    ltc_premiums: 400,
    taxpayer_age: 45,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.fields.line17_se_health_insurance, 400);
});

// ─── LTC for Spouse ───────────────────────────────────────────────────────────

Deno.test("LTC for spouse uses spouse age limit", () => {
  // Spouse age 55: limit $1,800; $3,000 premiums → capped at $1,800
  const result = compute({
    se_net_profit: 50_000,
    ltc_premiums_spouse: 3_000,
    spouse_age: 55,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.fields.line17_se_health_insurance, 1_800);
});

Deno.test("health + LTC taxpayer + LTC spouse combined", () => {
  // Health: $5,000
  // LTC taxpayer age 45: min($2,000, $900) = $900
  // LTC spouse age 55: min($3,000, $1,800) = $1,800
  // Total: $7,700 (within SE profit $50,000)
  const result = compute({
    se_net_profit: 50_000,
    health_insurance_premiums: 5_000,
    ltc_premiums: 2_000,
    taxpayer_age: 45,
    ltc_premiums_spouse: 3_000,
    spouse_age: 55,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.fields.line17_se_health_insurance, 7_700);
});

// ─── Marketplace overlap ──────────────────────────────────────────────────────

Deno.test("Marketplace overlap is required and cannot use a raw PTC subtraction", () => {
  assertThrows(
    () =>
      compute({
        se_net_profit: 50_000,
        health_insurance_premiums: 10_000,
        marketplace_ptc_premium_overlap: undefined,
      }),
    Error,
    "require Marketplace PTC overlap review",
  );
  assertThrows(
    () =>
      compute({
        se_net_profit: 50_000,
        health_insurance_premiums: 10_000,
        marketplace_ptc_premium_overlap: true,
      }),
    Error,
    "requires Publication 974 deduction calculation",
  );
  assertThrows(
    () =>
      compute({
        se_net_profit: 50_000,
        health_insurance_premiums: 10_000,
        premium_tax_credit: 3_000,
      }),
    Error,
    "premium_tax_credit",
  );
});

Deno.test("Pub 974 full and partial-year overlap reconcile filed Form 8962", () => {
  const premiums = Array(12).fill(1_000);
  const slcsps = Array(12).fill(1_200);
  const aptcs = Array(12).fill(500);
  const source = {
    marketplace_ptc_premium_overlap: true,
    pub974_single_business: {
      form1095a_coverage_months: Array.from(
        { length: 12 },
        (_, index) => index + 1,
      ),
      all_marketplace_enrollment_premiums_are_specified: true,
      no_other_se_income_sources_verified: true,
      worksheet_w: {
        specified_policy_months: Array.from({ length: 12 }, (_, index) => ({
          form1095a_policy_number: "FULL-YEAR-2025",
          month: index + 1,
          specified_premium: 1_000,
          attributable_aptc: 500,
        })),
        nonspecified_premium_deduction: 0,
        one_establishing_business_verified: true,
        business: {
          kind: "self_employed",
          establishing_business_earned_income: 50_000,
          all_profitable_business_earned_income: 50_000,
          schedule1_line15_se_tax_deduction: 0,
          establishing_business_schedule1_line16_retirement_deduction: 0,
          form2555_attributable_exclusion: 0,
        },
      },
      worksheet_x: {
        special_adjustment_cases_reviewed_absent: true,
        form1040_line9_total_income: 50_000,
        form1040_line2a_tax_exempt_interest: 0,
        form1040_nontaxable_social_security: 0,
        form2555_lines45_and_50: 0,
        schedule1_adjustments_except_line17: 0,
        required_filing_dependents_modified_agi: 0,
        household_size: 1,
        fpl_region: "contiguous",
        filing_status: FilingStatus.Single,
      },
      form8962_source: {
        monthly_premiums: premiums,
        monthly_slcsps: slcsps,
        monthly_aptcs: aptcs,
      },
    },
  };
  const result = compute(source);
  const finalizedSource = {
    ...source,
    ...result.finalizations?.find((row) => row.nodeType === "form7206")?.fields,
  };
  assertEquals(finalizedSource.pub974_form7206_omit, true);
  assertEquals(form7206Mef.build(finalizedSource), "");
  assertEquals(form7206Pdf.includeWhen?.(finalizedSource), false);
  assertEquals(form7206Pdf.includeWhen?.(source), true);
  const deduction = findOutput(result, "schedule1")?.fields
    .line17_se_health_insurance as number;
  const reconciliation = findOutput(result, "form8962")?.fields
    .pub974_reconciliation as Record<string, unknown>;
  const actualPolicyMonths = Array.from({ length: 12 }, (_, index) => ({
    form1095a_policy_number: "FULL-YEAR-2025",
    month: index + 1,
    premium: 1_000,
    aptc: 500,
  }));
  assertEquals(
    findOutput(result, "agi_aggregator")?.fields.line17_se_health_insurance,
    deduction,
  );
  const audit = {
    schedule1_line3_schedule_c: 50_000,
    form1040_line9_total_income: 50_000,
    form1040_line2a_tax_exempt_interest: 0,
    form1040_nontaxable_social_security: 0,
    form2555_lines45_and_50: 0,
    schedule1_adjustments_except_line17: 0,
    schedule1_line15_se_tax_deduction: 0,
    schedule1_line16_retirement_deduction: 0,
    schedule1_line17_se_health_insurance: deduction,
    unsupported_adjustments_present: false,
  };
  const filedInput = {
    monthly_premiums: premiums,
    monthly_slcsps: slcsps,
    monthly_aptcs: aptcs,
    pub974_form1095a_policy_months: actualPolicyMonths,
    pub974_income_audit: audit,
    household_size: 1,
    fpl_region: "contiguous" as const,
    filing_status: FilingStatus.Single,
    taxpayer_modified_agi: reconciliation.taxpayer_modified_agi as number,
    dependents_modified_agi: 0,
    dependent_income_complete: true,
    pub974_reconciliation: reconciliation as NonNullable<
      Parameters<typeof form8962.compute>[1]["pub974_reconciliation"]
    >,
  };
  const filed = form8962.compute(
    { taxYear: 2025, formType: "f1040" },
    filedInput,
  );
  assertEquals(
    filed.outputs.find((row) => row.nodeType === "form8962")?.fields
      .total_premium_tax_credit,
    reconciliation.total_premium_tax_credit,
  );
  const filedFields = filed.outputs.find((row) => row.nodeType === "form8962")
    ?.fields ?? {};
  assertStringIncludes(
    form8962Mef.build(filedFields),
    `<TotalPremiumTaxCreditAmt>${reconciliation.total_premium_tax_credit}</TotalPremiumTaxCreditAmt>`,
  );
  assertEquals(
    form8962Pdf.projectFields?.(filedFields, {})?.total_premium_tax_credit,
    reconciliation.total_premium_tax_credit,
  );
  assertThrows(
    () =>
      form8962.compute({ taxYear: 2025, formType: "f1040" }, {
        ...filedInput,
        monthly_aptcs: [...aptcs.slice(0, 11), 400],
      }),
    Error,
    "does not reconcile to Publication 974 source",
  );
  assertThrows(
    () =>
      form8962.compute({ taxYear: 2025, formType: "f1040" }, {
        ...filedInput,
        pub974_form1095a_policy_months: actualPolicyMonths.map((row) => ({
          ...row,
          form1095a_policy_number: "OTHER-POLICY",
        })),
      }),
    Error,
    "does not reconcile to Publication 974 source",
  );
  assertThrows(
    () =>
      form8962.compute({ taxYear: 2025, formType: "f1040" }, {
        ...filedInput,
        pub974_form1095a_policy_months: [
          ...actualPolicyMonths,
          actualPolicyMonths[0],
        ],
      }),
    Error,
    "does not reconcile to Publication 974 source",
  );
  assertThrows(
    () =>
      form8962.compute({ taxYear: 2025, formType: "f1040" }, {
        ...filedInput,
        pub974_income_audit: {
          ...audit,
          form1040_line9_total_income: 51_000,
          schedule1_adjustments_except_line17: 1_000,
        },
      }),
    Error,
    "does not reconcile to Publication 974 source",
  );
  assertThrows(
    () =>
      form8962.compute({ taxYear: 2025, formType: "f1040" }, {
        ...filedInput,
        pub974_income_audit: {
          ...audit,
          schedule1_line16_retirement_deduction: 100,
        },
      }),
    Error,
    "does not reconcile to Publication 974 source",
  );
  assertThrows(
    () =>
      form8962.compute({ taxYear: 2025, formType: "f1040" }, {
        ...filedInput,
        pub974_income_audit: {
          ...audit,
          schedule1_line3_schedule_c: 0,
        },
      }),
    Error,
    "does not reconcile to Publication 974 source",
  );

  const partialPremiums = [...Array(6).fill(1_000), ...Array(6).fill(0)];
  const partialSlcsps = [...Array(6).fill(1_200), ...Array(6).fill(0)];
  const partialAptcs = [...Array(6).fill(500), ...Array(6).fill(0)];
  const partialResult = compute({
    ...source,
    pub974_single_business: {
      ...source.pub974_single_business,
      form1095a_coverage_months: [1, 2, 3, 4, 5, 6],
      worksheet_w: {
        ...source.pub974_single_business.worksheet_w,
        specified_policy_months: source.pub974_single_business.worksheet_w
          .specified_policy_months.slice(0, 6),
      },
      form8962_source: {
        monthly_premiums: partialPremiums,
        monthly_slcsps: partialSlcsps,
        monthly_aptcs: partialAptcs,
      },
    },
  });
  const partialDeduction = findOutput(partialResult, "schedule1")?.fields
    .line17_se_health_insurance as number;
  const partialReconciliation = findOutput(partialResult, "form8962")?.fields
    .pub974_reconciliation as typeof reconciliation;
  assertEquals(partialReconciliation.form1095a_coverage_months, [
    1,
    2,
    3,
    4,
    5,
    6,
  ]);
  const partialFiled = form8962.compute(
    { taxYear: 2025, formType: "f1040" },
    {
      ...filedInput,
      monthly_premiums: partialPremiums,
      monthly_slcsps: partialSlcsps,
      monthly_aptcs: partialAptcs,
      pub974_form1095a_policy_months: actualPolicyMonths.slice(0, 6),
      pub974_income_audit: {
        ...audit,
        schedule1_line17_se_health_insurance: partialDeduction,
      },
      taxpayer_modified_agi: partialReconciliation
        .taxpayer_modified_agi as number,
      pub974_reconciliation: partialReconciliation as NonNullable<
        Parameters<typeof form8962.compute>[1]["pub974_reconciliation"]
      >,
    },
  );
  assertEquals(
    partialFiled.outputs.find((row) => row.nodeType === "form8962")?.fields
      .total_premium_tax_credit,
    partialReconciliation.total_premium_tax_credit,
  );
  const partialFields =
    partialFiled.outputs.find((row) => row.nodeType === "form8962")?.fields ??
      {};
  assertStringIncludes(form8962Mef.build(partialFields), "<IRS8962>");
  assertEquals(
    form8962Pdf.projectFields?.(partialFields, {})?.total_premium_tax_credit,
    partialReconciliation.total_premium_tax_credit,
  );
  assertThrows(
    () =>
      compute({
        ...source,
        marketplace_ptc_premium_overlap: false,
        pub974_single_business: {
          ...source.pub974_single_business,
          form1095a_coverage_months: [1, 2, 3, 4, 5, 6],
          worksheet_w: {
            ...source.pub974_single_business.worksheet_w,
            specified_policy_months: source.pub974_single_business.worksheet_w
              .specified_policy_months.slice(0, 6),
          },
          form8962_source: {
            monthly_premiums: partialPremiums,
            monthly_slcsps: partialSlcsps,
            monthly_aptcs: partialAptcs,
          },
        },
      }),
    Error,
    "positive Marketplace overlap",
  );
});

// ─── Output Routing ───────────────────────────────────────────────────────────

Deno.test("output routes to schedule1 and agi_aggregator line17_se_health_insurance", () => {
  const result = compute({
    se_net_profit: 50_000,
    health_insurance_premiums: 8_000,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.nodeType, "schedule1");
  assertEquals(s1?.fields.line17_se_health_insurance, 8_000);
  const agi = findOutput(result, "agi_aggregator");
  assertEquals(agi?.fields.line17_se_health_insurance, 8_000);
});
