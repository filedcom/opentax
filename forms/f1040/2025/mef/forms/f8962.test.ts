import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { FilingStatus } from "../../../mef/header.ts";
import { DependentRelationship } from "../../../nodes/inputs/general/index.ts";
import { FilingStatus as SourceFilingStatus } from "../../../nodes/types.ts";
import { f1095a } from "../../../nodes/inputs/f1095a/index.ts";
import { form8962Pdf } from "../../pdf/forms/f8962.ts";
import { form8962 } from "./f8962.ts";

const monthlyPremiums = Array<number>(12).fill(500);
const monthlySlcsps = Array<number>(12).fill(600);
const monthlyAptcs = Array<number>(12).fill(200);
const monthCodes = [
  "JANUARY",
  "FEBRUARY",
  "MARCH",
  "APRIL",
  "MAY",
  "JUNE",
  "JULY",
  "AUGUST",
  "SEPTEMBER",
  "OCTOBER",
  "NOVEMBER",
  "DECEMBER",
];
const rows = monthCodes.map((month_code) => ({
  month_code,
  premium: 500,
  slcsp: 600,
  contribution: 533,
  max_assistance: 67,
  allowed_credit: 67,
  aptc: 200,
}));
const monthlyRepayment = {
  household_size: 1,
  taxpayer_modified_agi: 75_300,
  dependents_modified_agi: 0,
  household_income: 75_300,
  federal_poverty_line: 15_060,
  fpl_region: "contiguous" as const,
  federal_poverty_pct: 401,
  applicable_figure: 0.085,
  annual_applicable_contribution: 6_401,
  monthly_applicable_contribution: 533,
  monthly_ptc_rows: rows,
  total_premium_tax_credit: 804,
  total_advance_ptc: 2_400,
  excess_advance_payment: 1_596,
  excess_advance_premium: 1_596,
};
const filer = {
  primarySSN: "123456789",
  nameLine1: "TAXPAYER TEST",
  nameControl: "TAXP",
  address: {
    line1: "1 Test Way",
    city: "Austin",
    state: "TX",
    zip: "78701",
  },
  filingStatus: FilingStatus.Single,
};
const matchedContext = {
  filer,
  pending: {
    f1095a: {
      f1095as: [{
        issuer_name: "Marketplace",
        policy_number: "POLICY-1",
        coverage_state: "TX",
        covered_individual_ssns: ["123456789"],
        monthly_premiums: monthlyPremiums,
        monthly_slcsps: monthlySlcsps,
        monthly_aptcs: monthlyAptcs,
      }],
    },
    schedule2: { line1a_excess_advance_premium: 1_596 },
    f1040: { line11_agi: 75_300, line17_additional_taxes: 1_596 },
  },
};

Deno.test("Form 8962 does not file solely because AGI and family context exist", () => {
  assertEquals(
    form8962.build({
      household_size: 1,
      household_income: 75_300,
      fpl_region: "contiguous",
    }),
    "",
  );
});

Deno.test("Form 8962 rejects positive totals without 1095-A policy source", () => {
  assertThrows(
    () => form8962.build({ total_advance_ptc: 1_000 }),
    Error,
    "needs annual or monthly 1095-A source amounts",
  );
  assertThrows(
    () => form8962.build(monthlyRepayment),
    Error,
    "needs Form 1095-A and finalized Form 1040 facts",
  );
});

Deno.test("Form 8962 rejects empty or all-zero monthly rows and incomplete calculations", () => {
  assertThrows(
    () => form8962.build({ ...monthlyRepayment, monthly_ptc_rows: [] }),
    Error,
    "needs at least one month row",
  );
  assertThrows(
    () =>
      form8962.build({
        ...monthlyRepayment,
        monthly_ptc_rows: [{
          month_code: "JANUARY",
          premium: 0,
          slcsp: 0,
          aptc: 0,
        }],
      }),
    Error,
    "needs a reportable monthly policy row",
  );
  assertThrows(
    () => form8962.build({ annual_premium: 7_000 }),
    Error,
    "requires the completed 2025 calculation",
  );
  assertThrows(
    () => form8962.build({ ...monthlyRepayment, household_income: 1 }),
    Error,
    "household income must reconcile",
  );
});

Deno.test("Form 8962 emits sourced policy months and reconciled repayment", () => {
  const xml = form8962.build(monthlyRepayment, matchedContext);
  assertStringIncludes(xml, "<IRS8962>");
  assertStringIncludes(xml, "<MonthlyPremiumAmt>500</MonthlyPremiumAmt>");
  assertStringIncludes(
    xml,
    "<MonthlyPremiumTaxCreditAllwAmt>67</MonthlyPremiumTaxCreditAllwAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalPremiumTaxCreditAmt>804</TotalPremiumTaxCreditAmt>",
  );
  assertStringIncludes(xml, "<TotalAdvancedPTCAmt>2400</TotalAdvancedPTCAmt>");
  assertStringIncludes(
    xml,
    "<PremiumTaxCreditTaxLiabAmt>1596</PremiumTaxCreditTaxLiabAmt>",
  );
  assertEquals((xml.match(/<MonthlyPTCCalculationGrp>/g) ?? []).length, 12);
  assertEquals(xml.includes("<AnnualPTCCalculationGrp>"), false);
});

Deno.test("Form 8962 monthly one-person policy binds its covered person to the filer", () => {
  const policy = matchedContext.pending.f1095a.f1095as[0];
  for (
    const covered_individual_ssns of [
      undefined,
      ["987654321"],
      ["123456789", "987654321"],
    ]
  ) {
    assertThrows(
      () =>
        form8962.build(monthlyRepayment, {
          ...matchedContext,
          pending: {
            ...matchedContext.pending,
            f1095a: {
              f1095as: [{ ...policy, covered_individual_ssns }],
            },
          },
        }),
      Error,
      "one-person policy needs the filer as its sole covered individual",
    );
  }
});

const noAptcSlcsps = Array.from(
  { length: 12 },
  (_, month) => month < 6 ? 700 : 800,
);
const noAptcRows = monthCodes.map((month_code, index) => ({
  month_code,
  premium: 800,
  slcsp: noAptcSlcsps[index],
  contribution: 533,
  max_assistance: noAptcSlcsps[index] - 533,
  allowed_credit: noAptcSlcsps[index] - 533,
  aptc: 0,
}));
const noAptcFields = {
  ...monthlyRepayment,
  monthly_ptc_rows: noAptcRows,
  total_premium_tax_credit: 2_604,
  total_advance_ptc: 0,
  net_premium_tax_credit: 2_604,
  excess_advance_payment: undefined,
  excess_advance_premium: undefined,
};
const noAptcCorrections = noAptcSlcsps.map((corrected_slcsp, index) => ({
  month: index + 1,
  basis: "no_aptc" as const,
  corrected_slcsp,
  determination_source: "marketplace_tool" as const,
}));
const noAptcEvidence = noAptcSlcsps.map((marketplace_slcsp, index) => ({
  month: index + 1,
  marketplace_slcsp,
  marketplace_method: "marketplace_tool" as const,
  marketplace_reference: `MARKETPLACE-${index + 1}`,
  marketplace_determined_on: "2026-02-01",
  marketplace_record_sha256: "a".repeat(64),
  premium_paid: 800,
  premium_paid_in_full_on: "2026-04-01",
  premium_payment_reference: `PAYMENT-${index + 1}`,
  premium_payment_record_sha256: "b".repeat(64),
}));
const noAptcContext = {
  ...matchedContext,
  pending: {
    ...matchedContext.pending,
    general: {
      filing_status: SourceFilingStatus.Single,
      taxpayer_ssn: "123456789",
      taxpayer_can_be_claimed_as_dependent: false,
    },
    f1095a: {
      f1095as: [{
        issuer_name: "Marketplace",
        policy_number: "NO-APTC-POLICY",
        coverage_state: "TX",
        covered_individual_ssns: ["123456789"],
        monthly_premiums: Array<number>(12).fill(800),
        monthly_slcsps: Array<number>(12).fill(0),
        monthly_aptcs: Array<number>(12).fill(0),
        annual_premium: 9_600,
        annual_slcsp: 0,
        annual_aptc: 0,
        slcsp_corrections: noAptcCorrections,
        no_aptc_monthly_evidence: noAptcEvidence,
      }],
    },
    schedule2: {},
    schedule3: { line9_premium_tax_credit: 2_604 },
    f1040: { line11_agi: 75_300, line31_additional_payments: 2_604 },
  },
};

Deno.test("Form 8962 no-APTC monthly PTC uses reviewed SLCSP and timely paid premiums", () => {
  const xml = form8962.build({ ...noAptcFields, annual_slcsp: 9_000 }, noAptcContext);
  assertStringIncludes(
    xml,
    "<TotalPremiumTaxCreditAmt>2604</TotalPremiumTaxCreditAmt>",
  );
  assertStringIncludes(xml, "<TotalAdvancedPTCAmt>0</TotalAdvancedPTCAmt>");
  assertStringIncludes(
    xml,
    "<ReconciledPremiumTaxCreditAmt>2604</ReconciledPremiumTaxCreditAmt>",
  );
  assertEquals((xml.match(/<MonthlyPTCCalculationGrp>/g) ?? []).length, 12);
  assertEquals(xml.includes("<AnnualPTCCalculationGrp>"), false);
  const pdf = form8962Pdf.projectFields?.(noAptcFields, noAptcContext.pending);
  assertEquals(pdf?.pdf_month_1_slcsp, "700");
  assertEquals(pdf?.pdf_month_7_slcsp, "800");
  assertEquals(
    form8962Pdf.instances?.(pdf ?? {}, filer, noAptcContext.pending)?.length,
    1,
  );
  assertThrows(
    () => form8962.build({ ...noAptcFields, annual_slcsp: 9_001 }, noAptcContext),
    Error,
    "Form 1095-A totals or contribution do not reconcile",
  );
});

Deno.test("Form 8962 no-APTC at 200% FPL uses Table 2 for monthly credit and PDF", () => {
  const credit = 8_400;
  const fields = {
    ...noAptcFields,
    taxpayer_modified_agi: 30_120,
    household_income: 30_120,
    federal_poverty_pct: 200,
    applicable_figure: 0.02,
    annual_applicable_contribution: 602,
    monthly_applicable_contribution: 50,
    monthly_ptc_rows: noAptcRows.map((row) => ({
      ...row,
      contribution: 50,
      max_assistance: row.slcsp - 50,
      allowed_credit: row.slcsp - 50,
    })),
    total_premium_tax_credit: credit,
    net_premium_tax_credit: credit,
  };
  const pending = {
    ...noAptcContext.pending,
    schedule3: { line9_premium_tax_credit: credit },
    f1040: { line11_agi: 30_120, line31_additional_payments: credit },
  };
  const xml = form8962.build(fields, { filer, pending });
  assertStringIncludes(
    xml,
    "<FederalPovertyLevelPct>200</FederalPovertyLevelPct>",
  );
  assertStringIncludes(xml, "<ApplicableFigureRt>0.0200</ApplicableFigureRt>");
  assertStringIncludes(
    xml,
    "<ReconciledPremiumTaxCreditAmt>8400</ReconciledPremiumTaxCreditAmt>",
  );
  assertEquals((xml.match(/<MonthlyPTCCalculationGrp>/g) ?? []).length, 12);
  const pdf = form8962Pdf.projectFields?.(fields, pending) ?? {};
  assertEquals(pdf.pdf_applicable_figure, "0.0200");
  assertEquals(pdf.pdf_month_1_contribution, "50");
  assertEquals(pdf.pdf_month_7_allowed_credit, "750");
  assertEquals(form8962Pdf.instances?.(pdf, filer, pending)?.length, 1);

  assertThrows(
    () =>
      form8962.build({ ...fields, applicable_figure: 0.085 }, {
        filer,
        pending,
      }),
    Error,
    "household income and poverty table differ",
  );
  assertThrows(
    () =>
      form8962.build(fields, {
        filer,
        pending: {
          ...pending,
          f1095a: {
            f1095as: [{
              ...pending.f1095a.f1095as[0],
              no_aptc_monthly_evidence: noAptcEvidence.slice(1),
            }],
          },
        },
      }),
    Error,
    "one Marketplace determination and payment record for every covered month",
  );
});

Deno.test("Form 8962 no-APTC at 200% FPL uses annual line 11 when SLCSP is unchanged", () => {
  const credit = 7_798;
  const policy = {
    ...noAptcContext.pending.f1095a.f1095as[0],
    slcsp_corrections: noAptcCorrections.map((item) => ({
      ...item,
      corrected_slcsp: 700,
    })),
    no_aptc_monthly_evidence: noAptcEvidence.map((item) => ({
      ...item,
      marketplace_slcsp: 700,
    })),
  };
  const pending = {
    ...noAptcContext.pending,
    f1095a: { f1095as: [policy] },
    schedule3: { line9_premium_tax_credit: credit },
    f1040: { line11_agi: 30_120, line31_additional_payments: credit },
  };
  const fields = {
    ...noAptcFields,
    taxpayer_modified_agi: 30_120,
    household_income: 30_120,
    federal_poverty_pct: 200,
    applicable_figure: 0.02,
    annual_applicable_contribution: 602,
    monthly_applicable_contribution: 50,
    monthly_ptc_rows: undefined,
    annual_premium: 9_600,
    annual_slcsp: 8_400,
    annual_max_ptc: credit,
    annual_ptc_allowed: credit,
    annual_aptc: 0,
    total_premium_tax_credit: credit,
    net_premium_tax_credit: credit,
  };
  const source = f1095a.compute(
    { taxYear: 2025, formType: "f1040" },
    pending.f1095a,
  );
  const routed = source.outputs.find((item) => item.nodeType === "form8962");
  assertEquals(routed?.fields.annual_line11_eligible, true);
  const xml = form8962.build(fields, { filer, pending });
  assertStringIncludes(xml, "<AnnualPTCCalculationGrp>");
  assertStringIncludes(
    xml,
    "<ReconciledPremiumTaxCreditAmt>7798</ReconciledPremiumTaxCreditAmt>",
  );
  const pdf = form8962Pdf.projectFields?.(fields, pending) ?? {};
  assertEquals(pdf.pdf_line10_yes, true);
  assertEquals(pdf.pdf_applicable_figure, "0.0200");
  assertEquals(pdf.pdf_annual_contribution, "602");
  assertEquals(form8962Pdf.instances?.(pdf, filer, pending)?.length, 1);

  assertThrows(
    () =>
      form8962.build({
        ...fields,
        taxpayer_modified_agi: 15_059,
        household_income: 15_059,
        federal_poverty_pct: 99,
        applicable_figure: 0,
        annual_applicable_contribution: 0,
        monthly_applicable_contribution: 0,
      }, {
        filer,
        pending: {
          ...pending,
          f1040: { line11_agi: 15_059, line31_additional_payments: credit },
        },
      }),
    Error,
    "below-400%-FPL filing needs one filer and one identified policy",
  );
});

Deno.test("Form 8962 no-APTC full-year unchanged policy uses sourced annual line 11", () => {
  const policy = {
    ...noAptcContext.pending.f1095a.f1095as[0],
    slcsp_corrections: noAptcCorrections.map((item) => ({
      ...item,
      corrected_slcsp: 700,
    })),
    no_aptc_monthly_evidence: noAptcEvidence.map((item) => ({
      ...item,
      marketplace_slcsp: 700,
    })),
  };
  const pending = {
    ...noAptcContext.pending,
    f1095a: { f1095as: [policy] },
    schedule3: { line9_premium_tax_credit: 1_999 },
    f1040: { line11_agi: 75_300, line31_additional_payments: 1_999 },
  };
  const fields = {
    ...noAptcFields,
    monthly_ptc_rows: undefined,
    annual_premium: 9_600,
    annual_slcsp: 8_400,
    annual_max_ptc: 1_999,
    annual_ptc_allowed: 1_999,
    annual_aptc: 0,
    total_premium_tax_credit: 1_999,
    net_premium_tax_credit: 1_999,
  };
  const source = f1095a.compute(
    { taxYear: 2025, formType: "f1040" },
    pending.f1095a,
  );
  const routed = source.outputs.find((item) => item.nodeType === "form8962");
  assertEquals(routed?.fields.annual_line11_eligible, true);
  assertEquals(routed?.fields.annual_slcsp, 8_400);

  const xml = form8962.build(fields, { filer, pending });
  assertStringIncludes(xml, "<AnnualPTCCalculationGrp>");
  assertStringIncludes(
    xml,
    "<AnnualPremiumSLCSPAmt>8400</AnnualPremiumSLCSPAmt>",
  );
  assertStringIncludes(
    xml,
    "<ReconciledPremiumTaxCreditAmt>1999</ReconciledPremiumTaxCreditAmt>",
  );
  assertEquals(xml.includes("<MonthlyPTCCalculationGrp>"), false);
  const projected = form8962Pdf.projectFields?.(fields, pending) ?? {};
  assertEquals(projected.pdf_line10_yes, true);
  assertEquals(projected.pdf_annual_slcsp, "8400");
  assertEquals(form8962Pdf.instances?.(projected, filer, pending)?.length, 1);

  const changed = (changedPolicy: typeof policy) => ({
    filer,
    pending: { ...pending, f1095a: { f1095as: [changedPolicy] } },
  });
  assertThrows(
    () =>
      form8962.build(
        fields,
        changed({
          ...policy,
          slcsp_corrections: policy.slcsp_corrections.map((item, index) =>
            index === 6 ? { ...item, corrected_slcsp: 701 } : item
          ),
        }),
      ),
    Error,
    "annual month 7 lacks matching SLCSP",
  );
  assertThrows(
    () =>
      form8962.build(
        fields,
        changed({
          ...policy,
          no_aptc_monthly_evidence: policy.no_aptc_monthly_evidence.map((
            item,
            index,
          ) =>
            index === 0
              ? { ...item, premium_paid_in_full_on: "2026-04-16" }
              : item
          ),
        }),
      ),
    Error,
    "annual month 1 lacks matching SLCSP",
  );
  assertThrows(
    () =>
      form8962Pdf.instances?.(
        projected,
        filer,
        changed({
          ...policy,
          no_aptc_monthly_evidence: policy.no_aptc_monthly_evidence.map(
            (item, index) =>
              index === 0
                ? { ...item, premium_paid_in_full_on: "2026-04-16" }
                : item,
          ),
        }).pending,
      ),
    Error,
    "annual month 1 lacks matching SLCSP",
  );
  assertThrows(
    () =>
      form8962.build(
        fields,
        changed({
          ...policy,
          no_aptc_monthly_evidence: policy.no_aptc_monthly_evidence.slice(1),
        }),
      ),
    Error,
    "twelve Marketplace determinations",
  );
  assertThrows(
    () =>
      form8962.build({ ...fields, annual_slcsp: 8_401 }, { filer, pending }),
    Error,
    "annual positive credit differs",
  );
});

Deno.test("Form 8962 no-APTC partial-year claim omits an uncovered month after reconciling each covered month", () => {
  const uncovered = 3; // April, zero-based.
  const partialRows = noAptcRows.map((row, index) =>
    index === uncovered
      ? {
        ...row,
        premium: 0,
        slcsp: 0,
        max_assistance: 0,
        allowed_credit: 0,
      }
      : row
  );
  const partialFields = {
    ...noAptcFields,
    monthly_ptc_rows: partialRows,
    total_premium_tax_credit: 2_437,
    net_premium_tax_credit: 2_437,
  };
  const sourcePolicy = noAptcContext.pending.f1095a.f1095as[0];
  const partialPolicy = {
    ...sourcePolicy,
    monthly_premiums: sourcePolicy.monthly_premiums.map((premium, index) =>
      index === uncovered ? 0 : premium
    ),
    annual_premium: 8_800,
    slcsp_corrections: noAptcCorrections.filter((item) =>
      item.month !== uncovered + 1
    ),
    no_aptc_monthly_evidence: noAptcEvidence.filter((item) =>
      item.month !== uncovered + 1
    ),
  };
  const partialPending = {
    ...noAptcContext.pending,
    f1095a: { f1095as: [partialPolicy] },
    schedule3: { line9_premium_tax_credit: 2_437 },
    f1040: { line11_agi: 75_300, line31_additional_payments: 2_437 },
  };
  const xml = form8962.build(partialFields, {
    filer,
    pending: partialPending,
  });
  assertEquals((xml.match(/<MonthlyPTCCalculationGrp>/g) ?? []).length, 11);
  assertEquals(xml.includes("<MonthCd>APRIL</MonthCd>"), false);
  assertStringIncludes(
    xml,
    "<ReconciledPremiumTaxCreditAmt>2437</ReconciledPremiumTaxCreditAmt>",
  );
  const pdf = form8962Pdf.projectFields?.(partialFields, partialPending) ?? {};
  assertEquals(pdf.pdf_month_4_premium, undefined);
  assertEquals(pdf.pdf_month_4_contribution, undefined);
  assertEquals(form8962Pdf.instances?.(pdf, filer, partialPending)?.length, 1);

  assertThrows(
    () =>
      form8962.build(partialFields, {
        filer,
        pending: {
          ...partialPending,
          f1095a: {
            f1095as: [{
              ...partialPolicy,
              no_aptc_monthly_evidence: [
                ...partialPolicy.no_aptc_monthly_evidence.slice(0, 3),
                noAptcEvidence[uncovered],
                ...partialPolicy.no_aptc_monthly_evidence.slice(3),
              ],
            }],
          },
        },
      }),
    Error,
    "one Marketplace determination and payment record for every covered month",
  );
  assertThrows(
    () =>
      form8962.build(partialFields, {
        filer,
        pending: {
          ...partialPending,
          f1095a: {
            f1095as: [{
              ...partialPolicy,
              monthly_slcsps: sourcePolicy.monthly_slcsps.map((slcsp, index) =>
                index === uncovered ? 700 : slcsp
              ),
              annual_slcsp: 700,
            }],
          },
        },
      }),
    Error,
    "nonshared Marketplace policy",
  );
});

Deno.test("Form 8962 no-APTC PTC rejects absent, mismatched, or late source evidence", () => {
  const policy = noAptcContext.pending.f1095a.f1095as[0];
  const withPolicy = (changed: Partial<typeof policy>) => ({
    ...noAptcContext,
    pending: {
      ...noAptcContext.pending,
      f1095a: { f1095as: [{ ...policy, ...changed }] },
    },
  });
  assertThrows(
    () =>
      form8962.build(
        noAptcFields,
        withPolicy({
          ...policy,
          no_aptc_monthly_evidence: undefined,
        }),
      ),
    Error,
    "one fully paid, nonshared",
  );
  assertThrows(
    () =>
      form8962Pdf.instances?.(
        form8962Pdf.projectFields?.(noAptcFields, noAptcContext.pending) ?? {},
        filer,
        withPolicy({ ...policy, no_aptc_monthly_evidence: undefined }).pending,
      ),
    Error,
    "one fully paid, nonshared",
  );
  assertThrows(
    () =>
      form8962.build(
        noAptcFields,
        withPolicy({
          ...policy,
          no_aptc_monthly_evidence: [
            { ...noAptcEvidence[0], marketplace_slcsp: 701 },
            ...noAptcEvidence.slice(1),
          ],
        }),
      ),
    Error,
    "month 1 lacks matching Marketplace SLCSP",
  );
  assertThrows(
    () =>
      form8962.build(
        noAptcFields,
        withPolicy({
          ...policy,
          no_aptc_monthly_evidence: [
            { ...noAptcEvidence[0], premium_paid_in_full_on: "2026-04-16" },
            ...noAptcEvidence.slice(1),
          ],
        }),
      ),
    Error,
    "month 1 lacks matching Marketplace SLCSP",
  );
  assertThrows(
    () =>
      form8962.build(
        noAptcFields,
        withPolicy({
          ...policy,
          no_aptc_monthly_evidence: [
            { ...noAptcEvidence[0], premium_paid: 799 },
            ...noAptcEvidence.slice(1),
          ],
        }),
      ),
    Error,
    "month 1 lacks matching Marketplace SLCSP",
  );
  assertThrows(
    () =>
      form8962.build(
        { ...noAptcFields, total_premium_tax_credit: 2_603 },
        noAptcContext,
      ),
    Error,
    "positive credit differs",
  );
});

Deno.test("Form 8962 annual line 11 reconciles one unchanged full-year policy", () => {
  const annualPolicy = {
    ...matchedContext.pending.f1095a.f1095as[0],
    annual_premium: 6_000,
    annual_slcsp: 7_200,
    annual_aptc: 2_400,
  };
  const annualFields = {
    ...monthlyRepayment,
    monthly_ptc_rows: undefined,
    annual_premium: 6_000,
    annual_slcsp: 7_200,
    annual_max_ptc: 799,
    annual_ptc_allowed: 799,
    annual_aptc: 2_400,
    total_premium_tax_credit: 799,
    excess_advance_payment: 1_601,
    excess_advance_premium: 1_601,
  };
  const context = {
    ...matchedContext,
    pending: {
      ...matchedContext.pending,
      f1095a: { f1095as: [annualPolicy] },
      schedule2: { line1a_excess_advance_premium: 1_601 },
      f1040: { line11_agi: 75_300, line17_additional_taxes: 1_601 },
    },
  };
  const xml = form8962.build(annualFields, context);
  assertStringIncludes(xml, "<AnnualPTCCalculationGrp>");
  assertStringIncludes(xml, "<AnnualPremiumAmt>6000</AnnualPremiumAmt>");
  assertStringIncludes(
    xml,
    "<AnnualPremiumTaxCreditAllwAmt>799</AnnualPremiumTaxCreditAllwAmt>",
  );
  assertStringIncludes(
    xml,
    "<PremiumTaxCreditTaxLiabAmt>1601</PremiumTaxCreditTaxLiabAmt>",
  );
  assertEquals(xml.includes("<MonthlyPTCCalculationGrp>"), false);
  assertThrows(
    () =>
      form8962.build(annualFields, {
        ...context,
        pending: {
          ...context.pending,
          f1095a: {
            f1095as: [{
              ...annualPolicy,
              covered_individual_ssns: ["987654321"],
            }],
          },
        },
      }),
    Error,
    "one-person policy needs the filer as its sole covered individual",
  );

  const creditXml = form8962.build({
    ...annualFields,
    annual_aptc: 600,
    total_advance_ptc: 600,
    net_premium_tax_credit: 199,
    excess_advance_payment: undefined,
    excess_advance_premium: undefined,
  }, {
    ...context,
    pending: {
      ...context.pending,
      f1095a: {
        f1095as: [{
          ...annualPolicy,
          monthly_aptcs: Array<number>(12).fill(50),
          annual_aptc: 600,
        }],
      },
      schedule2: {},
      schedule3: { line9_premium_tax_credit: 199 },
      f1040: { line11_agi: 75_300, line31_additional_payments: 199 },
    },
  });
  assertStringIncludes(
    creditXml,
    "<ReconciledPremiumTaxCreditAmt>199</ReconciledPremiumTaxCreditAmt>",
  );
  assertEquals(creditXml.includes("<PremiumTaxCreditTaxLiabAmt>"), false);

  assertThrows(
    () =>
      form8962.build(annualFields, {
        ...context,
        pending: {
          ...context.pending,
          f1095a: {
            f1095as: [{
              ...annualPolicy,
              monthly_premiums: monthlyPremiums.map((value, month) =>
                month === 6 ? value + 1 : value
              ),
            }],
          },
        },
      }),
    Error,
    "unchanged monthly premiums and SLCSP",
  );
  assertThrows(
    () =>
      form8962.build({
        ...annualFields,
        annual_ptc_allowed: 800,
      }, context),
    Error,
    "annual line 11 and lines 24 through 29 differ",
  );
  assertThrows(
    () =>
      form8962.build(annualFields, {
        ...context,
        pending: {
          ...context.pending,
          schedule2: { line1a_excess_advance_premium: 1_600 },
        },
      }),
    Error,
    "annual net credit or repayment differs",
  );
});

Deno.test("Form 8962 annual line 11 selects one same-state SLCSP across two full-year family policies", () => {
  const dependent = {
    first_name: "Casey",
    last_name: "Test",
    ssn: "987654321",
    dob: "2010-06-15",
    relationship: DependentRelationship.Daughter,
    months_in_home: 12,
    ptc_tax_return: {
      filing: "required" as const,
      filed_form1040: {
        source_document_id: "casey-2025-1040",
        taxpayer_ssn: "987654321",
        tax_year: 2025 as const,
        filing_status: "single" as const,
        blind: false,
        line1z_wages: 0 as const,
        line2a_tax_exempt_interest: 500,
        line2b_taxable_interest: 12_800,
        line3b_dividends: 0 as const,
        line4b_ira: 0 as const,
        line5b_pensions: 0 as const,
        line6b_social_security: 0 as const,
        line7a_capital_gain: 0 as const,
        line8_additional_income: 0 as const,
        line10_adjustments: 0 as const,
        line11b_agi: 12_800,
      },
      interest_forms1099: [{
        source_document_id: "casey-2025-1099-int",
        recipient_ssn: "987654321",
        box1_taxable_interest: 12_800,
        box8_tax_exempt_interest: 500,
      }],
    },
  };
  const policy = (number: string, ssn: string) => ({
    issuer_name: "Marketplace",
    policy_number: number,
    coverage_state: "TX",
    covered_individual_ssns: [ssn],
    monthly_premiums: Array<number>(12).fill(500),
    monthly_slcsps: Array<number>(12).fill(1_000),
    monthly_aptcs: Array<number>(12).fill(100),
    annual_premium: 6_000,
    annual_slcsp: 12_000,
    annual_aptc: 1_200,
  });
  const policies = [
    policy("TAXPAYER-PLAN", "123456789"),
    policy("DEPENDENT-PLAN", "987654321"),
  ];
  const fields = {
    household_size: 2,
    taxpayer_modified_agi: 90_000,
    dependents_modified_agi: 13_300,
    household_income: 103_300,
    federal_poverty_line: 20_440,
    fpl_region: "contiguous" as const,
    federal_poverty_pct: 401,
    applicable_figure: 0.085,
    annual_applicable_contribution: 8_781,
    monthly_applicable_contribution: 732,
    annual_premium: 12_000,
    annual_slcsp: 12_000,
    annual_max_ptc: 3_219,
    annual_ptc_allowed: 3_219,
    annual_aptc: 2_400,
    total_premium_tax_credit: 3_219,
    total_advance_ptc: 2_400,
    net_premium_tax_credit: 819,
  };
  const context = {
    filer,
    pending: {
      general: {
        filing_status: SourceFilingStatus.Single,
        taxpayer_ssn: "123456789",
        dependents: [dependent],
      },
      f1095a: { f1095as: policies },
      schedule3: { line9_premium_tax_credit: 819 },
      f1040: { line11_agi: 90_000, line31_additional_payments: 819 },
    },
  };
  const xml = form8962.build(fields, context);
  assertStringIncludes(xml, "<AnnualPremiumAmt>12000</AnnualPremiumAmt>");
  assertStringIncludes(
    xml,
    "<AnnualPremiumSLCSPAmt>12000</AnnualPremiumSLCSPAmt>",
  );
  assertStringIncludes(
    xml,
    "<ReconciledPremiumTaxCreditAmt>819</ReconciledPremiumTaxCreditAmt>",
  );
  assertEquals(xml.includes("<MonthlyPTCCalculationGrp>"), false);
  const projected = form8962Pdf.projectFields?.(fields, context.pending) ?? {};
  assertEquals(
    form8962Pdf.instances?.(projected, filer, context.pending)?.length,
    1,
  );
  assertThrows(
    () =>
      form8962.build(fields, {
        ...context,
        pending: {
          ...context.pending,
          general: {
            ...context.pending.general,
            dependents: [{
              ...dependent,
              ptc_tax_return: {
                ...dependent.ptc_tax_return,
                filed_form1040: {
                  ...dependent.ptc_tax_return.filed_form1040,
                  taxpayer_ssn: "111223333",
                },
              },
            }],
          },
        },
      }),
    Error,
    "filed return and interest forms naming the covered person",
  );

  assertThrows(
    () =>
      form8962.build(fields, {
        ...context,
        pending: {
          ...context.pending,
          f1095a: {
            f1095as: [policies[0], {
              ...policies[1],
              covered_individual_ssns: ["123456789"],
            }],
          },
        },
      }),
    Error,
    "distinct taxpayer/dependent covered people",
  );
  assertThrows(
    () =>
      form8962.build(fields, {
        ...context,
        pending: {
          ...context.pending,
          f1095a: {
            f1095as: [policies[0], {
              ...policies[1],
              covered_individual_ssns: undefined,
            }],
          },
        },
      }),
    Error,
    "distinct taxpayer/dependent covered people",
  );
  assertThrows(
    () =>
      form8962.build(fields, {
        ...context,
        pending: {
          ...context.pending,
          f1095a: {
            f1095as: [policies[0], {
              ...policies[1],
              annual_slcsp: 12_120,
              monthly_slcsps: Array<number>(12).fill(1_010),
            }],
          },
        },
      }),
    Error,
    "one same-state SLCSP",
  );
  assertThrows(
    () => form8962.build({ ...fields, annual_premium: 6_000 }, context),
    Error,
    "annual line 11 and lines 24 through 29 differ",
  );
  assertThrows(
    () =>
      form8962Pdf.instances?.(
        { ...projected, annual_premium: 6_000 },
        filer,
        context.pending,
      ),
    Error,
    "annual line 11 and lines 24 through 29 differ",
  );
});

Deno.test("Form 8962 annual line 11 reconciles a required-filing dependent's Worksheet 1-2 MAGI", () => {
  const dependent = {
    first_name: "Casey",
    last_name: "Test",
    ssn: "987654321",
    dob: "2010-06-15",
    relationship: DependentRelationship.Daughter,
    months_in_home: 12,
    ptc_tax_return: {
      filing: "required" as const,
      filed_form1040: {
        source_document_id: "casey-2025-1040",
        taxpayer_ssn: "987654321",
        tax_year: 2025 as const,
        filing_status: "single" as const,
        blind: false,
        line1z_wages: 0 as const,
        line2a_tax_exempt_interest: 500,
        line2b_taxable_interest: 12_800,
        line3b_dividends: 0 as const,
        line4b_ira: 0 as const,
        line5b_pensions: 0 as const,
        line6b_social_security: 0 as const,
        line7a_capital_gain: 0 as const,
        line8_additional_income: 0 as const,
        line10_adjustments: 0 as const,
        line11b_agi: 12_800,
      },
      interest_forms1099: [{
        source_document_id: "casey-2025-1099-int",
        recipient_ssn: "987654321",
        box1_taxable_interest: 12_800,
        box8_tax_exempt_interest: 500,
      }],
    },
  };
  const policy = {
    ...matchedContext.pending.f1095a.f1095as[0],
    annual_premium: 6_000,
    annual_slcsp: 7_200,
    annual_aptc: 2_400,
  };
  const fields = {
    ...monthlyRepayment,
    household_size: 2,
    dependents_modified_agi: 13_300,
    household_income: 88_600,
    federal_poverty_line: 20_440,
    annual_applicable_contribution: 7_531,
    monthly_applicable_contribution: 628,
    monthly_ptc_rows: undefined,
    annual_premium: 6_000,
    annual_slcsp: 7_200,
    annual_max_ptc: 0,
    annual_ptc_allowed: 0,
    annual_aptc: 2_400,
    total_premium_tax_credit: 0,
    excess_advance_payment: 2_400,
    excess_advance_premium: 2_400,
  };
  const context = {
    ...matchedContext,
    pending: {
      ...matchedContext.pending,
      general: {
        filing_status: SourceFilingStatus.Single,
        dependents: [dependent],
      },
      f1095a: { f1095as: [policy] },
      schedule2: { line1a_excess_advance_premium: 2_400 },
      f1040: { line11_agi: 75_300, line17_additional_taxes: 2_400 },
    },
  };
  const xml = form8962.build(fields, context);
  assertStringIncludes(
    xml,
    "<TotalDependentsModifiedAGIAmt>13300</TotalDependentsModifiedAGIAmt>",
  );
  assertStringIncludes(xml, "<HouseholdIncomeAmt>88600</HouseholdIncomeAmt>");
  assertStringIncludes(
    form8962.build(fields, {
      ...context,
      pending: {
        ...context.pending,
        f1095a: {
          f1095as: [{
            ...policy,
            covered_individual_ssns: ["987654321"],
          }],
        },
      },
    }),
    "<HouseholdIncomeAmt>88600</HouseholdIncomeAmt>",
  );
  for (
    const covered_individual_ssns of [
      undefined,
      ["123456789", "123456789"],
      ["123456789", "111223333"],
    ]
  ) {
    assertThrows(
      () =>
        form8962.build(fields, {
          ...context,
          pending: {
            ...context.pending,
            f1095a: {
              f1095as: [{ ...policy, covered_individual_ssns }],
            },
          },
        }),
      Error,
      "distinct covered people from the verified tax family",
    );
  }
  assertThrows(
    () =>
      form8962.build({ ...fields, dependents_modified_agi: 13_299 }, context),
    Error,
    "household income must reconcile to taxpayer and dependent modified AGI",
  );
  assertThrows(
    () =>
      form8962.build(fields, {
        ...context,
        pending: {
          ...context.pending,
          general: {
            filing_status: SourceFilingStatus.Single,
            dependents: [{
              ...dependent,
              ptc_tax_return: { filing: "not_required" as const },
            }],
          },
        },
      }),
    Error,
    "source-backed not-required filing-threshold workpaper",
  );
});

Deno.test("Form 8962 monthly one-policy dependent MAGI reconciles source through MeF and PDF", () => {
  const dependent = {
    first_name: "Casey",
    last_name: "Test",
    ssn: "987654321",
    dob: "2010-06-15",
    relationship: DependentRelationship.Daughter,
    months_in_home: 12,
    ptc_tax_return: {
      filing: "required" as const,
      filed_form1040: {
        source_document_id: "casey-2025-1040",
        taxpayer_ssn: "987654321",
        tax_year: 2025 as const,
        filing_status: "single" as const,
        blind: false,
        line1z_wages: 0 as const,
        line2a_tax_exempt_interest: 500,
        line2b_taxable_interest: 12_800,
        line3b_dividends: 0 as const,
        line4b_ira: 0 as const,
        line5b_pensions: 0 as const,
        line6b_social_security: 0 as const,
        line7a_capital_gain: 0 as const,
        line8_additional_income: 0 as const,
        line10_adjustments: 0 as const,
        line11b_agi: 12_800,
      },
      interest_forms1099: [{
        source_document_id: "casey-2025-1099-int",
        recipient_ssn: "987654321",
        box1_taxable_interest: 12_800,
        box8_tax_exempt_interest: 500,
      }],
    },
  };
  const monthlyRows = monthCodes.map((month_code, index) => ({
    month_code,
    premium: index < 6 ? 500 : 550,
    slcsp: index < 6 ? 600 : 650,
    contribution: 628,
    max_assistance: index < 6 ? 0 : 22,
    allowed_credit: index < 6 ? 0 : 22,
    aptc: 200,
  }));
  const fields = {
    ...monthlyRepayment,
    household_size: 2,
    dependents_modified_agi: 13_300,
    household_income: 88_600,
    federal_poverty_line: 20_440,
    annual_applicable_contribution: 7_531,
    monthly_applicable_contribution: 628,
    monthly_ptc_rows: monthlyRows,
    total_premium_tax_credit: 132,
    excess_advance_payment: 2_268,
    excess_advance_premium: 2_268,
  };
  const context = {
    ...matchedContext,
    pending: {
      ...matchedContext.pending,
      general: {
        filing_status: SourceFilingStatus.Single,
        dependents: [dependent],
      },
      f1095a: {
        f1095as: [{
          ...matchedContext.pending.f1095a.f1095as[0],
          monthly_premiums: monthlyRows.map((row) => row.premium),
          monthly_slcsps: monthlyRows.map((row) => row.slcsp),
        }],
      },
      schedule2: { line1a_excess_advance_premium: 2_268 },
      f1040: { line11_agi: 75_300, line17_additional_taxes: 2_268 },
    },
  };
  const xml = form8962.build(fields, context);
  assertStringIncludes(
    xml,
    "<TotalDependentsModifiedAGIAmt>13300</TotalDependentsModifiedAGIAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalPremiumTaxCreditAmt>132</TotalPremiumTaxCreditAmt>",
  );
  const projected = form8962Pdf.projectFields?.(fields, context.pending) ?? {};
  assertEquals(
    form8962Pdf.instances?.(projected, filer, context.pending)?.length,
    1,
  );
  assertThrows(
    () =>
      form8962Pdf.instances?.(projected, filer, {
        ...context.pending,
        f1095a: {
          f1095as: [{
            ...context.pending.f1095a.f1095as[0],
            covered_individual_ssns: ["987654321", "111223333"],
          }],
        },
      }),
    Error,
    "distinct covered people from the verified tax family",
  );
  assertThrows(
    () =>
      form8962.build({ ...fields, dependents_modified_agi: 13_299 }, context),
    Error,
    "household income must reconcile to taxpayer and dependent modified AGI",
  );
  assertThrows(
    () =>
      form8962Pdf.instances?.(
        {
          ...projected,
          monthly_ptc_rows: monthlyRows.map((row, index) =>
            index === 6 ? { ...row, allowed_credit: 23 } : row
          ),
        },
        filer,
        context.pending,
      ),
    Error,
    "differs from its Form 1095-A policy or calculated PTC",
  );
});

Deno.test("Form 8962 reconciles a same-state midyear policy switch without doubling SLCSP", () => {
  const policies = [
    { policy_number: "POLICY-1", start: 0, end: 6 },
    { policy_number: "POLICY-2", start: 6, end: 12 },
  ].map(({ policy_number, start, end }) => ({
    issuer_name: "Marketplace",
    policy_number,
    coverage_state: "TX",
    covered_individual_ssns: ["123456789"],
    monthly_premiums: monthlyPremiums.map((amount, month) =>
      month >= start && month < end ? amount : 0
    ),
    monthly_slcsps: monthlySlcsps.map((amount, month) =>
      month >= start && month < end ? amount : 0
    ),
    monthly_aptcs: monthlyAptcs.map((amount, month) =>
      month >= start && month < end ? amount : 0
    ),
    annual_premium: 3_000,
    annual_slcsp: 3_600,
    annual_aptc: 1_200,
  }));
  const context = {
    ...matchedContext,
    pending: {
      ...matchedContext.pending,
      f1095a: { f1095as: policies },
    },
  };
  const xml = form8962.build(monthlyRepayment, context);
  assertEquals((xml.match(/<MonthlyPTCCalculationGrp>/g) ?? []).length, 12);
  assertStringIncludes(xml, "<TotalAdvancedPTCAmt>2400</TotalAdvancedPTCAmt>");
  assertThrows(
    () =>
      form8962.build(monthlyRepayment, {
        ...context,
        pending: {
          ...context.pending,
          f1095a: {
            f1095as: [
              policies[0],
              {
                ...policies[1],
                monthly_premiums: policies[1].monthly_premiums.map((
                  value,
                  month,
                ) => month === 0 ? 500 : value),
              },
            ],
          },
        },
      }),
    Error,
    "annual_premium differs from its monthly column",
  );
  assertThrows(
    () =>
      form8962.build(monthlyRepayment, {
        ...context,
        pending: {
          ...context.pending,
          f1095a: {
            f1095as: [
              policies[0],
              {
                ...policies[1],
                monthly_premiums: policies[1].monthly_premiums.map((
                  value,
                  month,
                ) => month === 0 ? 500 : value),
                monthly_slcsps: policies[1].monthly_slcsps.map((value, month) =>
                  month === 0 ? 600 : value
                ),
                monthly_aptcs: policies[1].monthly_aptcs.map((value, month) =>
                  month === 0 ? 200 : value
                ),
                annual_premium: 3_500,
                annual_slcsp: 4_200,
                annual_aptc: 1_400,
              },
            ],
          },
        },
      }),
    Error,
    "month 1 needs exactly one active Marketplace policy",
  );
  assertThrows(
    () =>
      form8962.build(monthlyRepayment, {
        ...context,
        pending: {
          ...context.pending,
          f1095a: {
            f1095as: [policies[0], {
              ...policies[1],
              policy_number: "POLICY-1",
            }],
          },
        },
      }),
    Error,
    "supports identified family policies, same-state one-person policies, or a verified interstate move",
  );
  const returnToFirstPolicy = form8962.build(monthlyRepayment, {
    ...context,
    pending: {
      ...context.pending,
      f1095a: {
        f1095as: [
          {
            ...policies[0],
            monthly_premiums: policies[0].monthly_premiums.map((
              value,
              month,
            ) => month === 11 ? 500 : value),
            monthly_slcsps: policies[0].monthly_slcsps.map((value, month) =>
              month === 11 ? 600 : value
            ),
            monthly_aptcs: policies[0].monthly_aptcs.map((value, month) =>
              month === 11 ? 200 : value
            ),
            annual_premium: 3_500,
            annual_slcsp: 4_200,
            annual_aptc: 1_400,
          },
          {
            ...policies[1],
            monthly_premiums: policies[1].monthly_premiums.map((
              value,
              month,
            ) => month === 11 ? 0 : value),
            monthly_slcsps: policies[1].monthly_slcsps.map((value, month) =>
              month === 11 ? 0 : value
            ),
            monthly_aptcs: policies[1].monthly_aptcs.map((value, month) =>
              month === 11 ? 0 : value
            ),
            annual_premium: 2_500,
            annual_slcsp: 3_000,
            annual_aptc: 1_000,
          },
        ],
      },
    },
  });
  assertStringIncludes(
    returnToFirstPolicy,
    "<TotalAdvancedPTCAmt>2400</TotalAdvancedPTCAmt>",
  );
});

Deno.test("Form 8962 keeps overlapping same-state policies out of the one-person filing route", () => {
  const policies = [
    { policy_number: "POLICY-1", premium: 300, aptc: 100 },
    { policy_number: "POLICY-2", premium: 200, aptc: 100 },
  ].map(({ policy_number, premium, aptc }) => ({
    issuer_name: "Marketplace",
    policy_number,
    coverage_state: "TX",
    covered_individual_ssns: ["123456789"],
    monthly_premiums: Array(12).fill(premium),
    monthly_slcsps: Array(12).fill(600),
    monthly_aptcs: Array(12).fill(aptc),
  }));
  assertThrows(
    () =>
      form8962.build(monthlyRepayment, {
        ...matchedContext,
        pending: {
          ...matchedContext.pending,
          f1095a: { f1095as: policies },
        },
      }),
    Error,
    "needs exactly one active Marketplace policy",
  );
});

Deno.test("Form 8962 files sourced partial-year and separated one-policy months", () => {
  const partialPolicy = {
    ...matchedContext.pending.f1095a.f1095as[0],
    monthly_premiums: monthlyPremiums.map((value, month) =>
      month >= 6 ? value : 0
    ),
    monthly_slcsps: monthlySlcsps.map((value, month) => month >= 6 ? value : 0),
    monthly_aptcs: monthlyAptcs.map((value, month) => month >= 6 ? value : 0),
    annual_premium: 3_000,
    annual_slcsp: 3_600,
    annual_aptc: 1_200,
  };
  const partialFields = {
    ...monthlyRepayment,
    monthly_ptc_rows: rows.map((row, month) =>
      month >= 6 ? row : {
        ...row,
        premium: 0,
        slcsp: 0,
        max_assistance: 0,
        allowed_credit: 0,
        aptc: 0,
      }
    ),
    total_premium_tax_credit: 402,
    total_advance_ptc: 1_200,
    excess_advance_payment: 798,
    excess_advance_premium: 798,
  };
  const partialContext = {
    ...matchedContext,
    pending: {
      ...matchedContext.pending,
      f1095a: { f1095as: [partialPolicy] },
      schedule2: { line1a_excess_advance_premium: 798 },
      f1040: { line11_agi: 75_300, line17_additional_taxes: 798 },
    },
  };
  const xml = form8962.build(partialFields, partialContext);
  assertEquals((xml.match(/<MonthlyPTCCalculationGrp>/g) ?? []).length, 6);
  assertStringIncludes(xml, "<TotalAdvancedPTCAmt>1200</TotalAdvancedPTCAmt>");
  const uncoveredRow = {
    ...rows[9],
    premium: 0,
    slcsp: 0,
    max_assistance: 0,
    allowed_credit: 0,
    aptc: 0,
  };
  const gapFields = {
    ...partialFields,
    monthly_ptc_rows: partialFields.monthly_ptc_rows.map((row, month) =>
      month === 9 ? uncoveredRow : row
    ),
    total_premium_tax_credit: 335,
    total_advance_ptc: 1_000,
    excess_advance_payment: 665,
    excess_advance_premium: 665,
  };
  const gapPolicy = {
    ...partialPolicy,
    monthly_premiums: partialPolicy.monthly_premiums.map((value, month) =>
      month === 9 ? 0 : value
    ),
    monthly_slcsps: partialPolicy.monthly_slcsps.map((value, month) =>
      month === 9 ? 0 : value
    ),
    monthly_aptcs: partialPolicy.monthly_aptcs.map((value, month) =>
      month === 9 ? 0 : value
    ),
    annual_premium: 2_500,
    annual_slcsp: 3_000,
    annual_aptc: 1_000,
  };
  const gapContext = {
    ...partialContext,
    pending: {
      ...partialContext.pending,
      f1095a: { f1095as: [gapPolicy] },
      schedule2: { line1a_excess_advance_premium: 665 },
      f1040: { line11_agi: 75_300, line17_additional_taxes: 665 },
    },
  };
  const gapXml = form8962.build(gapFields, gapContext);
  assertEquals((gapXml.match(/<MonthlyPTCCalculationGrp>/g) ?? []).length, 5);
  assertEquals(gapXml.includes("<MonthCd>OCTOBER</MonthCd>"), false);
  for (
    const sourceChange of [
      {
        monthly_aptcs: gapPolicy.monthly_aptcs.map((value, month) =>
          month === 9 ? 200 : value
        ),
        annual_aptc: 1_200,
      },
      {
        monthly_slcsps: gapPolicy.monthly_slcsps.map((value, month) =>
          month === 9 ? 600 : value
        ),
        annual_slcsp: 3_600,
      },
    ]
  ) {
    assertThrows(
      () =>
        form8962.build(gapFields, {
          ...gapContext,
          pending: {
            ...gapContext.pending,
            f1095a: { f1095as: [{ ...gapPolicy, ...sourceChange }] },
          },
        }),
      Error,
    );
  }
});

Deno.test("Form 8962 emits net PTC only when Schedule 3 and Form 1040 agree", () => {
  const creditFields = {
    ...monthlyRepayment,
    monthly_ptc_rows: rows.map((row) => ({ ...row, aptc: 50 })),
    total_advance_ptc: 600,
    net_premium_tax_credit: 204,
    excess_advance_payment: undefined,
    excess_advance_premium: undefined,
  };
  const creditContext = {
    ...matchedContext,
    pending: {
      ...matchedContext.pending,
      f1095a: {
        f1095as: [{
          ...matchedContext.pending.f1095a.f1095as[0],
          monthly_aptcs: Array<number>(12).fill(50),
        }],
      },
      schedule2: {},
      schedule3: { line9_premium_tax_credit: 204 },
      f1040: { line11_agi: 75_300, line31_additional_payments: 204 },
    },
  };
  const xml = form8962.build(creditFields, creditContext);
  assertStringIncludes(
    xml,
    "<ReconciledPremiumTaxCreditAmt>204</ReconciledPremiumTaxCreditAmt>",
  );
  assertEquals(xml.includes("<PremiumTaxCreditTaxLiabAmt>"), false);
  assertThrows(
    () =>
      form8962.build(creditFields, {
        ...creditContext,
        pending: {
          ...creditContext.pending,
          schedule3: { line9_premium_tax_credit: 200 },
        },
      }),
    Error,
    "differs from finalized Schedule 2/3 and Form 1040",
  );
});

Deno.test("Form 8962 rejects a monthly amount differing from Form 1095-A", () => {
  assertThrows(
    () =>
      form8962.build({
        ...monthlyRepayment,
        monthly_ptc_rows: rows.map((row, index) =>
          index === 0 ? { ...row, premium: 600 } : row
        ),
      }, matchedContext),
    Error,
    "month 1 differs from its Form 1095-A policy",
  );
  assertThrows(
    () =>
      form8962.build({
        ...monthlyRepayment,
        monthly_ptc_rows: rows.map((row, index) =>
          index === 0 ? { ...row, allowed_credit: 68 } : row
        ),
      }, matchedContext),
    Error,
    "month 1 differs from its Form 1095-A policy",
  );
});

Deno.test("Form 8962 rejects calculated totals or finalized Schedule 2/1040 mismatches", () => {
  assertThrows(
    () =>
      form8962.build({
        ...monthlyRepayment,
        total_premium_tax_credit: 805,
      }, matchedContext),
    Error,
    "lines 24 through 29 differ",
  );
  assertThrows(
    () =>
      form8962.build(monthlyRepayment, {
        ...matchedContext,
        pending: {
          ...matchedContext.pending,
          schedule2: { line1a_excess_advance_premium: 1_500 },
        },
      }),
    Error,
    "differs from finalized Schedule 2/3 and Form 1040",
  );
  assertThrows(
    () =>
      form8962.build(monthlyRepayment, {
        ...matchedContext,
        pending: {
          ...matchedContext.pending,
          f1040: { line11_agi: 75_300, line17_additional_taxes: 1_500 },
        },
      }),
    Error,
    "differs from finalized Schedule 2/3 and Form 1040",
  );
});

Deno.test("Form 8962 rejects altered AGI or missing final return facts", () => {
  assertThrows(
    () =>
      form8962.build(monthlyRepayment, {
        ...matchedContext,
        pending: {
          ...matchedContext.pending,
          f1040: { line11_agi: 75_301, line17_additional_taxes: 1_596 },
        },
      }),
    Error,
    "household income and above-400%-FPL contribution must reconcile",
  );
  assertThrows(
    () =>
      form8962.build(monthlyRepayment, {
        ...matchedContext,
        pending: { ...matchedContext.pending, f1040: {} },
      }),
    Error,
    "needs Form 1095-A and finalized Form 1040 facts",
  );
});

Deno.test("Form 8962 rejects dependent MAGI without verified dependent returns", () => {
  assertThrows(
    () =>
      form8962.build({
        ...monthlyRepayment,
        household_size: 2,
        dependents_modified_agi: 2_000,
        household_income: 77_300,
      }, matchedContext),
    Error,
    "dependent MAGI needs the verified general return source",
  );
});

Deno.test("Form 8962 rejects annual and special positive routes without bounded source reconciliation", () => {
  assertThrows(
    () =>
      form8962.build({
        ...monthlyRepayment,
        monthly_ptc_rows: undefined,
        annual_premium: 6_000,
        annual_slcsp: 7_200,
        annual_aptc: 2_400,
      }, matchedContext),
    Error,
    "annual line 11 needs identified full-year unchanged Marketplace policies",
  );
  assertThrows(
    () =>
      form8962.build({ ...monthlyRepayment, qsehra_ind: true }, matchedContext),
    Error,
    "supports identified family policies, same-state one-person policies, or a verified interstate move",
  );
  assertThrows(
    () =>
      form8962.build({
        ...monthlyRepayment,
        shared_policy_allocations: [{
          basis: "other_agreed",
          policy_number: "POLICY-1",
          other_taxpayer_ssn: "222334444",
          start_month: 1,
          end_month: 12,
          premium_pct: 0.5,
        }],
      }, matchedContext),
    Error,
    "shared filing needs reviewed nonoverlapping periods",
  );
  assertThrows(
    () =>
      form8962.build({
        ...monthlyRepayment,
        alternative_marriage_primary: {
          family_size: 1,
          monthly_contribution: 153,
          start_month: 1,
          end_month: 6,
        },
      }, matchedContext),
    Error,
    "supports identified family policies, same-state one-person policies, or a verified interstate move",
  );
  assertThrows(
    () =>
      form8962.build({
        ...monthlyRepayment,
        shared_policy_allocations: Array.from({ length: 100 }, (_, index) => ({
          basis: "other_agreed" as const,
          policy_number: `POLICY-${index}`,
          other_taxpayer_ssn: "222334444",
          start_month: 1,
          end_month: 1,
          premium_pct: 0.5,
        })),
      }, matchedContext),
    Error,
    "at most 99 MeF allocations",
  );
});
