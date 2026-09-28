import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { FilingStatus } from "../../../mef/header.ts";
import { FilingStatus as SourceFilingStatus } from "../../../nodes/types.ts";
import { form8962Pdf } from "../../pdf/forms/f8962.ts";
import { form8962 } from "./f8962.ts";

const months = [
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

for (
  const { state, region, povertyLine, location } of [
    { state: "AK", region: "alaska", povertyLine: 18_810, location: "A" },
    { state: "HI", region: "hawaii", povertyLine: 17_310, location: "B" },
  ] as const
) {
  const fields = {
    household_size: 1,
    taxpayer_modified_agi: 75_300,
    dependents_modified_agi: 0,
    household_income: 75_300,
    federal_poverty_line: povertyLine,
    fpl_region: region,
    federal_poverty_pct: 401,
    applicable_figure: 0.085,
    annual_applicable_contribution: 6_401,
    monthly_applicable_contribution: 533,
    monthly_ptc_rows: months.map((month_code) => ({
      month_code,
      premium: 500,
      slcsp: 600,
      contribution: 533,
      max_assistance: 67,
      allowed_credit: 67,
      aptc: 200,
    })),
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
      line1: "1 Main St",
      city: state === "AK" ? "Anchorage" : "Honolulu",
      state,
      zip: state === "AK" ? "99501" : "96813",
    },
    filingStatus: FilingStatus.Single,
  };
  const pending = {
    general: {
      filing_status: SourceFilingStatus.Single,
      address_state: state,
      ptc_residence_states_2025: [state],
    },
    f1095a: {
      f1095as: [{
        issuer_name: "Marketplace",
        policy_number: "POLICY-1",
        coverage_state: state,
        covered_individual_ssns: ["123456789"],
        monthly_premiums: Array<number>(12).fill(500),
        monthly_slcsps: Array<number>(12).fill(600),
        monthly_aptcs: Array<number>(12).fill(200),
        annual_premium: 6_000,
        annual_slcsp: 7_200,
        annual_aptc: 2_400,
      }],
    },
    schedule2: { line1a_excess_advance_premium: 1_596 },
    f1040: { line11_agi: 75_300, line17_additional_taxes: 1_596 },
  };
  const context = { filer, pending };

  Deno.test(`Form 8962 ${state} monthly policy uses its 2025 poverty table in MeF and PDF`, () => {
    const xml = form8962.build(fields, context);
    assertStringIncludes(
      xml,
      `<PovertyLevelAmt>${povertyLine}</PovertyLevelAmt>`,
    );
    assertStringIncludes(
      xml,
      `<FederalPovertyTableLocCd>${location}</FederalPovertyTableLocCd>`,
    );
    const projected = form8962Pdf.projectFields?.(fields, pending) ?? {};
    assertEquals(projected[`pdf_fpl_${region}`], true);
    assertEquals(form8962Pdf.instances?.(projected, filer, pending)?.length, 1);
  });

  Deno.test(`Form 8962 ${state} full-year annual line 11 reconciles its poverty table`, () => {
    const annualFields = {
      ...fields,
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
    const annualPending = {
      ...pending,
      schedule2: { line1a_excess_advance_premium: 1_601 },
      f1040: { line11_agi: 75_300, line17_additional_taxes: 1_601 },
    };
    const xml = form8962.build(annualFields, { filer, pending: annualPending });
    assertStringIncludes(xml, "<AnnualPTCCalculationGrp>");
    assertStringIncludes(
      xml,
      `<FederalPovertyTableLocCd>${location}</FederalPovertyTableLocCd>`,
    );
    const projected =
      form8962Pdf.projectFields?.(annualFields, annualPending) ?? {};
    assertEquals(
      form8962Pdf.instances?.(projected, filer, annualPending)?.length,
      1,
    );
  });

  Deno.test(`Form 8962 ${state} rejects mismatched table, amount, residence, and policy state`, () => {
    assertThrows(
      () => form8962.build({ ...fields, fpl_region: "contiguous" }, context),
      Error,
      "poverty table must match",
    );
    assertThrows(
      () =>
        form8962.build({ ...fields, federal_poverty_line: 15_060 }, context),
      Error,
      "household income and above-400%-FPL contribution",
    );
    assertThrows(
      () =>
        form8962.build(fields, {
          filer,
          pending: {
            ...pending,
            general: {
              ...pending.general,
              ptc_residence_states_2025: [state, "TX"],
            },
          },
        }),
      Error,
      "needs twelve residence months",
    );
    assertThrows(
      () =>
        form8962.build({
          ...fields,
          fpl_region: "contiguous",
          federal_poverty_line: 15_060,
        }, {
          filer: { ...filer, address: { ...filer.address, state: "TX" } },
          pending: {
            ...pending,
            general: {
              ...pending.general,
              address_state: "TX",
              ptc_residence_states_2025: [state, "TX"],
            },
            f1095a: {
              f1095as: [{ ...pending.f1095a.f1095as[0], coverage_state: "TX" }],
            },
          },
        }),
      Error,
      "needs twelve residence months",
    );
    assertThrows(
      () =>
        form8962.build(fields, {
          filer,
          pending: {
            ...pending,
            f1095a: {
              f1095as: [{ ...pending.f1095a.f1095as[0], coverage_state: "TX" }],
            },
          },
        }),
      Error,
      "Form 8962 monthly filing supports",
    );
  });
}
