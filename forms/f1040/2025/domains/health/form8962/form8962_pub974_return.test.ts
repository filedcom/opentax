import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { FilingStatus as MeFilingStatus } from "../../../../mef/header.ts";
import { TS } from "../../../../nodes/types.ts";
import { FilingStatus } from "../../../../nodes/types.ts";
import { form7206 } from "../../../../nodes/intermediate/forms/form7206/index.ts";
import {
  form8962,
  inputSchema as form8962InputSchema,
} from "../../../../nodes/intermediate/forms/form8962/index.ts";
import { schedule1 } from "../../../../nodes/outputs/schedule1/index.ts";
import { form8962 as form8962Mef } from "../../../mef/forms/health/f8962/f8962.ts";
import { form8962Pdf } from "../../../pdf/forms/health/f8962.ts";
import { assertForm8962Pub974Return } from "./form8962_pub974_return.ts";

const context = { taxYear: 2025, formType: "f1040" as const };
const premiums = Array<number>(12).fill(1_000);
const aptcs = Array<number>(12).fill(500);
const slcsps = Array<number>(12).fill(1_200);
const policyMonths = Array.from({ length: 12 }, (_, index) => ({
  form1095a_policy_number: "MARKETPLACE-A",
  month: index + 1,
  premium: 1_000,
  aptc: 500,
}));
const pub974Source = {
  worksheet_w: {
    specified_policy_months: policyMonths.map((row) => ({
      form1095a_policy_number: row.form1095a_policy_number,
      month: row.month,
      specified_premium: row.premium,
      attributable_aptc: row.aptc,
    })),
    nonspecified_premium_deduction: 0,
    business: {
      kind: "self_employed" as const,
      establishing_business_reference: "SCHEDULE-C-A",
      establishing_business_earned_income: 50_000,
      all_profitable_business_earned_income: 50_000,
      schedule1_line15_se_tax_deduction: 5_000,
      establishing_business_schedule1_line16_retirement_deduction: 2_000,
      form2555_attributable_exclusion: 0,
    },
    one_establishing_business_verified: true as const,
  },
  worksheet_x: {
    special_adjustment_cases_reviewed_absent: true as const,
    form1040_line9_total_income: 50_000,
    form1040_line2a_tax_exempt_interest: 0,
    form1040_nontaxable_social_security: 0,
    form2555_lines45_and_50: 0,
    schedule1_adjustments_except_line17: 7_000,
    required_filing_dependents_modified_agi: 0,
    household_size: 1,
    fpl_region: "contiguous" as const,
    filing_status: FilingStatus.Single as const,
  },
  form1095a_policy_months: policyMonths,
  no_other_se_income_sources_verified: true as const,
  form8962_source: {
    monthly_premiums: premiums,
    monthly_slcsps: slcsps,
    monthly_aptcs: aptcs,
  },
};
const filer = {
  primarySSN: "123456789",
  nameLine1: "ALEX EXAMPLE",
  nameControl: "EXAM",
  address: {
    line1: "1 Test Way",
    city: "Austin",
    state: "TX",
    zip: "78701",
  },
  filingStatus: MeFilingStatus.Single,
};

function filing(monthlySlcsp = 1_200) {
  const source = {
    ...pub974Source,
    form8962_source: {
      ...pub974Source.form8962_source,
      monthly_slcsps: Array<number>(12).fill(monthlySlcsp),
    },
  };
  const insurance = form7206.compute(context, {
    marketplace_ptc_premium_overlap: true,
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
      line13_deduction: 5_000,
    },
    schedule1_line16_source: 2_000,
    pub974_single_business: source,
  });
  const reconciliation = insurance.outputs.find((row) =>
    row.nodeType === "form8962"
  )?.fields.pub974_reconciliation;
  const deduction =
    (reconciliation as { schedule1_line17_final_deduction: number })
      .schedule1_line17_final_deduction;
  const calculated = form8962.compute(
    context,
    form8962InputSchema.parse({
      ...source.form8962_source,
      pub974_form1095a_policy_months: policyMonths,
      pub974_income_audit: {
        schedule1_line3_schedule_c: 50_000,
        form1040_line9_total_income: 50_000,
        form1040_line2a_tax_exempt_interest: 0,
        form1040_nontaxable_social_security: 0,
        form2555_lines45_and_50: 0,
        schedule1_adjustments_except_line17: 7_000,
        schedule1_line15_se_tax_deduction: 5_000,
        schedule1_line16_retirement_deduction: 2_000,
        schedule1_line17_se_health_insurance: deduction,
        unsupported_adjustments_present: false,
      },
      pub974_reconciliation: reconciliation,
      taxpayer_modified_agi: 43_000 - deduction,
      dependents_modified_agi: 0,
      dependent_income_complete: true,
      household_size: 1,
      fpl_region: "contiguous",
      filing_status: FilingStatus.Single as const,
    }),
  );
  const fields = calculated.outputs.find((row) => row.nodeType === "form8962")!
    .fields;
  const credit = (fields.net_premium_tax_credit ?? 0) as number;
  const repayment = (fields.excess_advance_premium ?? 0) as number;
  const schedule1Fields = schedule1.compute(context, {
    line3_schedule_c: 50_000,
    line15_se_deduction: 5_000,
    line16_sep_simple: 2_000,
    line17_se_health_insurance: deduction,
  }).outputs[0].fields;
  assertEquals(schedule1Fields.line26_total_adjustments, 7_000 + deduction);
  assertEquals(
    calculated.outputs.find((row) => row.nodeType === "schedule3")?.fields
      .line9_premium_tax_credit ?? 0,
    credit,
  );
  assertEquals(
    calculated.outputs.find((row) => row.nodeType === "schedule2")?.fields
      .line1a_excess_advance_premium ?? 0,
    repayment,
  );
  const pending = {
    f1095a: {
      f1095as: [{
        issuer_name: "Marketplace",
        policy_number: "MARKETPLACE-A",
        coverage_state: "TX",
        covered_individual_ssns: [filer.primarySSN],
        monthly_premiums: premiums,
        monthly_slcsps: source.form8962_source.monthly_slcsps,
        monthly_aptcs: aptcs,
      }],
    },
    schedule1: schedule1Fields,
    schedule2: { line1a_excess_advance_premium: repayment },
    schedule3: { line9_premium_tax_credit: credit },
    f1040: {
      line9_total_income: 50_000,
      line2a_tax_exempt: 0,
      line11_agi: 43_000 - deduction,
      line17_additional_taxes: repayment,
      line31_additional_payments: credit,
    },
  };
  return { fields, pending, deduction };
}

Deno.test("Publication 974 deduction and PTC order reaches Form 8962, Schedule 1, Form 1040, native and PDF", () => {
  const { fields, pending, deduction } = filing();
  assertEquals(typeof deduction, "number");
  assertEquals(fields.pub974_reconciliation !== undefined, true);
  assertForm8962Pub974Return(fields, pending);
  assertStringIncludes(
    form8962Mef.build(fields, { filer, pending }),
    "<IRS8962",
  );
  const projected = form8962Pdf.projectFields?.(fields, pending) ?? {};
  assertEquals(projected.pdf_month_1_premium, "1000");
  assertEquals(form8962Pdf.instances?.(projected, filer, pending)?.length, 1);
});

Deno.test("Publication 974 export rejects tampered deduction, AGI and PTC ordering", () => {
  const { fields, pending } = filing();
  for (
    const altered of [
      {
        ...pending,
        schedule1: {
          ...pending.schedule1,
          line17_se_health_insurance:
            (pending.schedule1.line17_se_health_insurance as number) + 1,
        },
      },
      {
        ...pending,
        f1040: { ...pending.f1040, line11_agi: pending.f1040.line11_agi + 1 },
      },
      {
        ...pending,
        schedule3: {
          line9_premium_tax_credit: pending.schedule3.line9_premium_tax_credit +
            1,
        },
      },
    ]
  ) {
    assertThrows(
      () => form8962Mef.build(fields, { filer, pending: altered }),
      Error,
      "Publication 974 deduction/PTC differs",
    );
    assertThrows(
      () => form8962Pdf.projectFields?.(fields, altered),
      Error,
      "Publication 974 deduction/PTC differs",
    );
  }
});

Deno.test("Publication 974 Worksheet X repayment limit reaches Form 8962 line 28", () => {
  const { fields, pending } = filing(600);
  assertEquals((fields.excess_advance_payment as number) > 0, true);
  const source = fields.pub974_reconciliation as Record<string, unknown>;
  assertEquals(
    fields.repayment_limitation,
    source.worksheet_x_repayment_limit,
  );
  assertForm8962Pub974Return(fields, pending);
  assertStringIncludes(
    form8962Mef.build(fields, { filer, pending }),
    `<AdditionalTaxLimitationAmt>${fields.repayment_limitation}</AdditionalTaxLimitationAmt>`,
  );
  const projected = form8962Pdf.projectFields?.(fields, pending) ?? {};
  assertEquals(
    projected.repayment_limitation,
    fields.repayment_limitation,
  );
  assertThrows(
    () =>
      form8962Mef.build({ ...fields, repayment_limitation: 1 }, {
        filer,
        pending,
      }),
    Error,
    "Publication 974 deduction/PTC differs",
  );
  assertThrows(
    () =>
      form8962Pdf.projectFields?.(
        { ...fields, repayment_limitation: 1 },
        pending,
      ),
    Error,
    "Publication 974 deduction/PTC differs",
  );
});
