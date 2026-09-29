import { assert, assertEquals, assertThrows } from "@std/assert";
import { FilingStatus } from "../../../types.ts";
import {
  calculatePub974SingleBusinessIterative,
  calculateWorksheetW,
  calculateWorksheetX,
  type WorksheetWSource,
  type WorksheetXSource,
} from "./pub974_worksheets.ts";
import { attributableSpecifiedPtc } from "./pub974_attribution.ts";

const policyMonths = [
  {
    form1095a_policy_number: "A",
    month: 1,
    specified_premium: 7_000,
    attributable_aptc: 3_500,
  },
  {
    form1095a_policy_number: "A",
    month: 2,
    specified_premium: 5_000,
    attributable_aptc: 2_500,
  },
];

const wSource: WorksheetWSource = {
  specified_policy_months: policyMonths,
  nonspecified_premium_deduction: 1_000,
  one_establishing_business_verified: true,
  business: {
    kind: "self_employed",
    establishing_business_earned_income: 30_000,
    all_profitable_business_earned_income: 50_000,
    schedule1_line15_se_tax_deduction: 5_000,
    establishing_business_schedule1_line16_retirement_deduction: 2_000,
    form2555_attributable_exclusion: 0,
  },
};

const xSource: WorksheetXSource = {
  special_adjustment_cases_reviewed_absent: true,
  form1040_line9_total_income: 50_000,
  form1040_line2a_tax_exempt_interest: 0,
  form1040_nontaxable_social_security: 0,
  form2555_lines45_and_50: 0,
  schedule1_adjustments_except_line17: 5_000,
  required_filing_dependents_modified_agi: 0,
  household_size: 1,
  fpl_region: "contiguous",
  filing_status: FilingStatus.Single,
};

Deno.test("Pub 974 Worksheet W links specified premium and APTC to policy months", () => {
  const w = calculateWorksheetW(wSource);
  assertEquals(w.line1_specified_premiums, 12_000);
  assertEquals(w.line2_attributable_aptc, 6_000);
  assertEquals(w.line3_premiums_net_of_aptc, 6_000);
  assertEquals(w.line13_business_earnings_limit, 25_000);
  assertEquals(w.line15_remaining_earnings_limit, 24_000);
  assertEquals(w.line16_initial_specified_deduction, 6_000);
  assertEquals(w.line17_initial_total_deduction, 7_000);
  assertEquals(w.line19_remaining_limit_for_worksheet_x, 18_000);
});

Deno.test("Pub 974 Worksheet X computes the provisional 200%-300% tier", () => {
  const x = calculateWorksheetX(xSource, calculateWorksheetW(wSource));
  assertEquals(x.line8_taxpayer_modified_agi, 38_000);
  assertEquals(x.line14_household_income, 38_000);
  assertEquals(x.line17b_federal_poverty_line, 15_060);
  assertEquals(x.line25_repayment_limit, 975);
  assertEquals(x.line30_max_specified_deduction, 6_975);
  assertEquals(x.line31_max_total_deduction, 7_975);
});

Deno.test("Pub 974 Worksheet X uses paid APTC at 400% FPL or higher", () => {
  const x = calculateWorksheetX(
    { ...xSource, form1040_line9_total_income: 100_000 },
    calculateWorksheetW(wSource),
  );
  assertEquals(x.line25_repayment_limit, 6_000);
  assertEquals(x.line30_max_specified_deduction, 12_000);
  assertEquals(x.line31_max_total_deduction, 13_000);
});

Deno.test("Pub 974 Worksheet W S corporation path uses Medicare wages", () => {
  const w = calculateWorksheetW({
    ...wSource,
    business: {
      kind: "s_corporation",
      establishing_s_corporation_medicare_wages: 8_000,
      form2555_attributable_exclusion: 1_000,
    },
  });
  assertEquals(w.line13_business_earnings_limit, 7_000);
  assertEquals(w.line15_remaining_earnings_limit, 6_000);
  assertEquals(w.line16_initial_specified_deduction, 6_000);
  assertEquals(w.line19_remaining_limit_for_worksheet_x, 0);
});

Deno.test("Pub 974 W/X reject duplicate policy months and unsupported APTC facts", () => {
  assertThrows(
    () =>
      calculateWorksheetW({
        ...wSource,
        specified_policy_months: [policyMonths[0], policyMonths[0]],
      }),
    Error,
    "repeats a Form 1095-A policy month",
  );
  assertThrows(
    () =>
      calculateWorksheetW({
        ...wSource,
        specified_policy_months: [{
          ...policyMonths[0],
          attributable_aptc: 8_000,
        }],
      }),
    Error,
    "APTC exceeds specified premiums",
  );
  const noAptc = calculateWorksheetW({
    ...wSource,
    specified_policy_months: policyMonths.map((row) => ({
      ...row,
      attributable_aptc: 0,
    })),
  });
  assertEquals(noAptc.line19_remaining_limit_for_worksheet_x, null);
  assertThrows(
    () => calculateWorksheetX(xSource, noAptc),
    Error,
    "only when specified-premium APTC was paid",
  );
});

Deno.test("Pub 974 Steps 1-6 converge on reconciled full-year policy rows", () => {
  const result = calculatePub974SingleBusinessIterative({
    worksheet_w: {
      ...wSource,
      nonspecified_premium_deduction: 0,
      business: {
        kind: "self_employed",
        establishing_business_earned_income: 50_000,
        all_profitable_business_earned_income: 50_000,
        schedule1_line15_se_tax_deduction: 5_000,
        establishing_business_schedule1_line16_retirement_deduction: 2_000,
        form2555_attributable_exclusion: 0,
      },
      specified_policy_months: Array.from({ length: 12 }, (_, index) => ({
        form1095a_policy_number: "FULL-YEAR-2025",
        month: index + 1,
        specified_premium: 1_000,
        attributable_aptc: 500,
      })),
    },
    worksheet_x: xSource,
    form1095a_policy_months: Array.from({ length: 12 }, (_, index) => ({
      form1095a_policy_number: "FULL-YEAR-2025",
      month: index + 1,
      premium: 1_000,
      aptc: 500,
    })),
    no_other_se_income_sources_verified: true,
    form8962_source: {
      monthly_premiums: Array(12).fill(1_000),
      monthly_slcsps: Array(12).fill(1_200),
      monthly_aptcs: Array(12).fill(500),
    },
  });
  const ptc = result.form8962_fields.total_premium_tax_credit as number;
  assert(result.iterations >= 1 && result.iterations <= 100);
  assertEquals(result.worksheet_w.line1_specified_premiums, 12_000);
  assertEquals(result.worksheet_w.line2_attributable_aptc, 6_000);
  assert(result.schedule1_line17_deduction >= 0);
  assert(result.schedule1_line17_deduction + ptc <= 12_000);
});

Deno.test("Pub 974 single-business route rejects non-reconciled policy months", () => {
  assertThrows(
    () =>
      calculatePub974SingleBusinessIterative({
        worksheet_w: {
          ...wSource,
          nonspecified_premium_deduction: 0,
          business: {
            kind: "self_employed",
            establishing_business_earned_income: 50_000,
            all_profitable_business_earned_income: 50_000,
            schedule1_line15_se_tax_deduction: 5_000,
            establishing_business_schedule1_line16_retirement_deduction: 2_000,
            form2555_attributable_exclusion: 0,
          },
        },
        worksheet_x: xSource,
        form1095a_policy_months: Array.from({ length: 12 }, (_, index) => ({
          form1095a_policy_number: "SIX-MONTH-2025",
          month: index + 1,
          premium: 1_000,
          aptc: 500,
        })),
        no_other_se_income_sources_verified: true,
        form8962_source: {
          monthly_premiums: Array(12).fill(1_000),
          monthly_slcsps: Array(12).fill(1_200),
          monthly_aptcs: Array(12).fill(500),
        },
      }),
    Error,
    "must reconcile to Form 1095-A coverage",
  );
});

Deno.test("Pub 974 partial-year iteration rejects a persistent dollar oscillation", () => {
  assertThrows(
    () =>
      calculatePub974SingleBusinessIterative({
        worksheet_w: {
          ...wSource,
          nonspecified_premium_deduction: 0,
          business: {
            kind: "self_employed",
            establishing_business_earned_income: 50_000,
            all_profitable_business_earned_income: 50_000,
            schedule1_line15_se_tax_deduction: 5_000,
            establishing_business_schedule1_line16_retirement_deduction: 2_000,
            form2555_attributable_exclusion: 0,
          },
          specified_policy_months: Array.from({ length: 6 }, (_, index) => ({
            form1095a_policy_number: "SIX-MONTH-2025",
            month: index + 1,
            specified_premium: 1_000,
            attributable_aptc: 500,
          })),
        },
        worksheet_x: xSource,
        form1095a_policy_months: Array.from({ length: 6 }, (_, index) => ({
          form1095a_policy_number: "SIX-MONTH-2025",
          month: index + 1,
          premium: 1_000,
          aptc: 500,
        })),
        no_other_se_income_sources_verified: true,
        form8962_source: {
          monthly_premiums: [...Array(6).fill(1_000), ...Array(6).fill(0)],
          monthly_slcsps: [...Array(6).fill(1_200), ...Array(6).fill(0)],
          monthly_aptcs: [...Array(6).fill(500), ...Array(6).fill(0)],
        },
      }),
    Error,
    "did not converge within 100 steps",
  );
});

Deno.test("Pub 974 partial-year route rejects uncovered and duplicate source months", () => {
  const base = {
    worksheet_w: {
      ...wSource,
      nonspecified_premium_deduction: 0,
      business: {
        kind: "self_employed" as const,
        establishing_business_earned_income: 50_000,
        all_profitable_business_earned_income: 50_000,
        schedule1_line15_se_tax_deduction: 5_000,
        establishing_business_schedule1_line16_retirement_deduction: 2_000,
        form2555_attributable_exclusion: 0,
      },
      specified_policy_months: Array.from({ length: 6 }, (_, index) => ({
        form1095a_policy_number: "SIX-MONTH-2025",
        month: index + 1,
        specified_premium: 1_000,
        attributable_aptc: 500,
      })),
    },
    worksheet_x: xSource,
    form1095a_policy_months: Array.from({ length: 6 }, (_, index) => ({
      form1095a_policy_number: "SIX-MONTH-2025",
      month: index + 1,
      premium: 1_000,
      aptc: 500,
    })),
    no_other_se_income_sources_verified: true as const,
    form8962_source: {
      monthly_premiums: [...Array(6).fill(1_000), ...Array(6).fill(0)],
      monthly_slcsps: [...Array(6).fill(1_200), ...Array(6).fill(0)],
      monthly_aptcs: [...Array(6).fill(500), ...Array(6).fill(0)],
    },
  };
  assertThrows(
    () =>
      calculatePub974SingleBusinessIterative({
        ...base,
        form1095a_policy_months: [
          ...base.form1095a_policy_months.slice(0, 5),
          base.form1095a_policy_months[4],
        ],
      }),
    Error,
    "unique coverage months",
  );
  assertThrows(
    () =>
      calculatePub974SingleBusinessIterative({
        ...base,
        form8962_source: {
          ...base.form8962_source,
          monthly_premiums: [
            ...base.form8962_source.monthly_premiums.slice(0, 6),
            1_000,
            ...Array(5).fill(0),
          ],
        },
      }),
    Error,
    "must reconcile to Form 1095-A coverage",
  );
});

Deno.test("Pub 974 mixed coverage rejects a persistent dollar oscillation", () => {
  assertThrows(
    () =>
      calculatePub974SingleBusinessIterative({
        worksheet_w: {
          ...wSource,
          nonspecified_premium_deduction: 0,
          business: {
            kind: "self_employed",
            establishing_business_earned_income: 50_000,
            all_profitable_business_earned_income: 50_000,
            schedule1_line15_se_tax_deduction: 5_000,
            establishing_business_schedule1_line16_retirement_deduction: 2_000,
            form2555_attributable_exclusion: 0,
          },
          specified_policy_months: Array.from({ length: 6 }, (_, index) => ({
            form1095a_policy_number: "MIXED-2025",
            month: index + 1,
            specified_premium: 1_000,
            attributable_aptc: 500,
          })),
        },
        worksheet_x: xSource,
        form1095a_policy_months: Array.from({ length: 12 }, (_, index) => ({
          form1095a_policy_number: "MIXED-2025",
          month: index + 1,
          premium: 1_000,
          aptc: 500,
        })),
        no_other_se_income_sources_verified: true,
        form8962_source: {
          monthly_premiums: Array(12).fill(1_000),
          monthly_slcsps: [...Array(6).fill(1_200), ...Array(6).fill(1_400)],
          monthly_aptcs: Array(12).fill(500),
        },
      }),
    Error,
    "did not converge within 100 steps",
  );
});

Deno.test("Pub 974 attribution uses monthly column (e) when amounts vary", () => {
  const rows = Array.from({ length: 12 }, (_, index) => ({
    month_code: String(index + 1),
    allowed_credit: index < 6 ? 100 : 200,
  }));
  assertEquals(
    attributableSpecifiedPtc(
      rows,
      new Set([1, 2, 3, 4, 5, 6]),
      new Set(Array.from({ length: 12 }, (_, i) => i + 1)),
    ),
    600,
  );
});
