/**
 * XSD Validation Tests — validates generated MeF XML against the IRS
 * 2025v5.4 Return1040.xsd schema using xmllint as a subprocess.
 *
 * Purpose: catch namespace errors, element ordering violations, and type
 * mismatches before IRS submission. All scenarios must produce XML that
 * xmllint accepts with exit code 0.
 */

import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { execute } from "../../../../core/runtime/executor.ts";
import { registry } from "../registry.ts";
import { buildMefBundle, buildMefXml } from "./builder.ts";
import type { MefFormsPending } from "./types.ts";
import { FilingStatus } from "../../nodes/types.ts";
import { EnergyType } from "../../nodes/inputs/f8835/index.ts";
import { BondType } from "../../nodes/inputs/f8912/index.ts";
import { SS_WAGE_BASE_2025 } from "../../nodes/config/2025.ts";
import { extractFilerIdentity } from "../../mef/filer.ts";
import {
  SCENARIO_1040_01_FACTS,
  SCENARIO_1040_02_FACTS,
  SCENARIO_1040_13_FACTS,
} from "../../e2e/ats/ty2025_cases.ts";

// ── Constants ────────────────────────────────────────────────────────────────

const XSD_PATH = new URL(
  "../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;

// Skip XSD tests when the IRS schema files are not present locally.
let xsdAvailable = false;
try {
  Deno.statSync(XSD_PATH);
  xsdAvailable = true;
} catch {
  // .research/docs not checked in; skip on machines without the IRS schema bundle
}

// ── Shared helpers ───────────────────────────────────────────────────────────

const plan = buildExecutionPlan(registry);
const nonApplicableBelowFpl = {
  basis: "not_applicable",
  exception_routes_reviewed: true,
  no_one_can_claim_taxpayer: true,
  all_covered_individuals_lawfully_present: true,
  no_shared_policy: true,
  no_self_employed_health_insurance_deduction: true,
  no_alternative_marriage_calculation: true,
} as const;

Deno.test({
  name: "XSD: Form 8912 allowed credit links to Schedule 3 line 6k",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const xml = buildMefXml({
    f1040: {
      line16_income_tax: 1_000,
      line20_nonrefundable_credits: 100,
      form8912_source_lines: { line1: 100, line2: 0, line3: 0, line4: 100 },
    },
    schedule3: { line6k_tax_credit_bonds: 100, line8_total: 100 },
    form6251: { line11_amt: 0 },
    f8912: {
      f8912s: [{
        reported_bonds: [{
          bond_type: BondType.QECB,
          issue_date: "2017-12-31",
          issuer_name: "Town Energy Authority",
          issuer_ein: "123456789",
          unique_identifier_code: "O",
          unique_identifier: "BOND1097",
          monthly_credit_amounts: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 100],
          credit_amount: 100,
          purchase_accrued_interest: 0,
          sale_accrued_interest: 0,
          taxable_interest_reported_elsewhere: 100,
          issuer_elected_direct_payment: false,
          is_pass_through_creb_credit: false,
        }],
        unreported_bonds: [],
        carryforwards: [],
      }],
      allowed_credit: 100,
      unused_credit: 0,
    },
  }, extractFilerIdentity(singleGeneral()));
  assertStringIncludes(xml, "<IRS8912 ");
  assertStringIncludes(xml, 'referenceDocumentName="IRS8912"');
  await validateXsd(xml, "Form 8912 Schedule 3 line 6k");
});

Deno.test({
  name: "XSD: Form 8859 allowed carryforward links to Schedule 3 line 6h",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const xml = buildMefXml({
    f1040: { line16_income_tax: 1_000, line20_nonrefundable_credits: 830 },
    schedule3: {
      line6h_dc_homebuyer_credit: 830,
      line7_total: 830,
      line8_total: 830,
    },
    f8859: {
      f8859s: [{ carryforward_amount: 1_200 }],
      line1_carryforward: 1_200,
      line2_limit: 830,
      line3_allowed_credit: 830,
      line4_carryforward: 370,
    },
  }, extractFilerIdentity(singleGeneral()));
  assertStringIncludes(xml, "<IRS8859 ");
  assertStringIncludes(xml, 'referenceDocumentName="IRS8859"');
  await validateXsd(xml, "Form 8859 Schedule 3 line 6h");
});

Deno.test({
  name: "XSD: Form 8834 passive credit links to Schedule 3 line 6i",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const xml = buildMefXml({
    f1040: { line16_income_tax: 1_000, line20_nonrefundable_credits: 450 },
    schedule3: {
      line6i_qualified_electric_vehicle_credit: 450,
      line7_total: 450,
      line8_total: 450,
    },
    f8834: {
      f8834s: [{
        source_form: "8582-CR",
        source_activity_id: "rental-a",
        allowed_passive_activity_credit: 600,
      }],
      line1_source_credit: 600,
      line2_regular_tax: 1_000,
      line3a_foreign_tax_credit: 100,
      line3b_other_credits: 150,
      line3c_total_credits: 250,
      line4_net_regular_tax: 750,
      line5_tentative_minimum_tax: 300,
      line6_adjusted_regular_tax: 450,
      line7_allowed_credit: 450,
    },
  }, extractFilerIdentity(singleGeneral()));
  assertStringIncludes(xml, "<IRS8834 ");
  assertStringIncludes(xml, 'referenceDocumentName="IRS8834"');
  await validateXsd(xml, "Form 8834 Schedule 3 line 6i");
});

Deno.test({
  name: "XSD: Form 4136 fuel credit links to refundable Schedule 3 line 12",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const xml = buildMefXml({
    f1040: { line31_additional_payments: 43 },
    schedule3: {
      line12_fuel_tax_credit: 42.6,
      line15_total: 42.6,
    },
    f4136: {
      business: {
        qualifying_business_activity: true,
        claimant_is_ultimate_purchaser: true,
        activity_count: 1,
        business_name: "Example Farm",
        principal_activity_code: "111000",
        equipment_make: "Example",
        equipment_model: "Tractor",
        equipment_type: "farm tractor",
        purchase_records_confirmed: true,
        no_duplicate_excise_claim: true,
      },
      claims: [
        {
          line: "1a",
          unit: "gallons",
          qualified_quantity: 100,
          actual_fuel_cost: 300,
          not_highway_vehicle: true,
        },
        {
          line: "3b",
          unit: "gallons",
          qualified_quantity: 100,
          actual_fuel_cost: 400,
          undyed_fuel_confirmed: true,
        },
      ],
    },
  }, extractFilerIdentity(singleGeneral()));
  assertStringIncludes(xml, "<IRS4136 ");
  assertStringIncludes(xml, 'referenceDocumentName="IRS4136"');
  await validateXsd(xml, "Form 4136 Schedule 3 line 12");
});

Deno.test({
  name: "XSD: Form 4136 all non-bus line 11 fuel groups validate",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const lines = [
    "11a",
    "11b",
    "11c",
    "11d",
    "11e",
    "11f",
    "11g",
    "11h",
  ] as const;
  const xml = buildMefXml({
    f1040: { line31_additional_payments: 164 },
    schedule3: {
      line12_fuel_tax_credit: 164.4,
      line15_total: 164.4,
    },
    f4136: {
      business: {
        qualifying_business_activity: true,
        claimant_is_ultimate_purchaser: true,
        activity_count: 1,
        business_name: "Example Fuel Business",
        principal_activity_code: "447100",
        equipment_make: "Example",
        equipment_model: "Equipment",
        equipment_type: "business equipment",
        purchase_records_confirmed: true,
        no_duplicate_excise_claim: true,
      },
      claims: lines.map((line) => ({
        line,
        type_of_use: "02",
        unit: line === "11a" || line === "11c"
          ? "GGE" as const
          : line === "11g"
          ? "DGE" as const
          : "gallons" as const,
        qualified_quantity: 100,
        actual_fuel_cost: 300,
        not_highway_vehicle: true,
      })),
    },
  }, extractFilerIdentity(singleGeneral()));
  assertStringIncludes(xml, "<NontxLiquefiedNaturalGasGrp>");
  await validateXsd(xml, "Form 4136 line 11 alternative fuels");
});

Deno.test({
  name: "XSD: Form 4136 line 11 reduced-rate bus group validates",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const xml = buildMefXml({
    f1040: { line31_additional_payments: 11 },
    schedule3: {
      line12_fuel_tax_credit: 10.9,
      line15_total: 10.9,
    },
    f4136: {
      business: {
        qualifying_business_activity: true,
        claimant_is_ultimate_purchaser: true,
        activity_count: 1,
        business_name: "Example Bus Business",
        principal_activity_code: "485110",
        equipment_make: "Example",
        equipment_model: "Bus",
        equipment_type: "intercity bus",
        purchase_records_confirmed: true,
        no_duplicate_excise_claim: true,
      },
      claims: [{
        line: "11a",
        type_of_use: "05",
        unit: "GGE",
        qualified_quantity: 100,
        actual_fuel_cost: 300,
      }],
    },
  }, extractFilerIdentity(singleGeneral()));
  assertStringIncludes(xml, "<BusNontxLiquifiedPetroleumGas>");
  await validateXsd(xml, "Form 4136 line 11 bus use");
});

Deno.test({
  name:
    "XSD: linked specified Form 8835 credit reaches Form 3800 and Schedule 3",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const facility = {
    energy_type: EnergyType.Wind,
    subject_to_passive_activity_limit: false,
    kwh_produced: 1_000_000,
    kwh_sold: 1_000_000,
    facility_description: "Onshore wind turbine",
    facility_us_address: {
      line1: "100 Wind Farm Rd",
      city: "Austin",
      state: "TX",
      zip: "78701",
    },
    facility_latitude: 30.267153,
    facility_longitude: -97.743061,
    facility_owned_by_filer: true,
    ac_nameplate_kw: 900,
    facility_placed_in_service_date: "2023-01-01",
    facility_construction_start_date: "2022-12-01",
    production_period_start_date: "2025-01-01",
    production_period_end_date: "2025-12-31",
    increased_credit_reason: "none" as const,
    domestic_content_bonus: false,
    energy_community_bonus: false,
    is_fiscal_year: false,
  };
  const xml = buildMefXml({
    f1040: { line16_income_tax: 40_000 },
    schedule3: { line6a_total: 6_000, line7_total: 6_000 },
    form6251: { line11_amt: 0, net_tmt: 20_000 },
    f3800: {
      f8835_credit_entries: [{
        form3800_line: "4e",
        credit_amount: 6_000,
        transfer_out_amount: 0,
        subject_to_passive_activity_limit: false,
      }],
      tax_context: {
        filingStatus: FilingStatus.Single,
        regularTax: 40_000,
        alternativeMinimumTax: 0,
        foreignTaxCredit: 0,
        priorAllowableCredits: 0,
        tentativeMinimumTax: 20_000,
        standardCredit: 0,
        specifiedCredit: 6_000,
      },
      allowed_credit: 6_000,
    },
    f8835: { f8835s: [facility] },
  }, extractFilerIdentity(singleGeneral()));
  assertStringIncludes(xml, "<IRS3800 ");
  assertStringIncludes(xml, "<IRS8835 ");
  assertStringIncludes(
    xml,
    "<CurrentYearCreditAllowedAmt>6000</CurrentYearCreditAllowedAmt>",
  );
  await validateXsd(xml, "linked Form 8835 and Form 3800");
});

Deno.test({
  name: "XSD: 2025 Schedule 2 line 1a Form 8962 repayment precedes line 2 AMT",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const xml = buildMefXml({
    schedule2: {
      line1a_excess_advance_premium: 1_200,
      line2_amt: 5_000,
    },
  }, extractFilerIdentity(singleGeneral()));
  assertStringIncludes(
    xml,
    "<PremiumTaxCreditTaxLiabAmt>1200</PremiumTaxCreditTaxLiabAmt>",
  );
  assertStringIncludes(
    xml,
    "<AlternativeMinimumTaxAmt>5000</AlternativeMinimumTaxAmt>",
  );
  await validateXsd(xml, "2025 Schedule 2 PTC repayment and AMT");
});

Deno.test({
  name:
    "XSD: 1095-A excess advance credit reaches Form 8962, Schedule 2 line 1a, and Form 1040",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    w2: [w2Item(75_300, 10_000)],
    f1095a: [{
      issuer_name: "Marketplace Plan",
      annual_premium: 7_200,
      annual_slcsp: 7_200,
      annual_aptc: 1_800,
      monthly_premiums: Array(12).fill(600),
      monthly_slcsps: Array(12).fill(600),
      monthly_aptcs: Array(12).fill(150),
    }],
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule2?.line1a_excess_advance_premium, 1_001);
  assertEquals(result.pending.f1040?.line17_additional_taxes, 1_001);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(
    xml,
    "<PremiumTaxCreditTaxLiabAmt>1001</PremiumTaxCreditTaxLiabAmt>",
  );
  assertStringIncludes(xml, "<IRS8962 ");
  await validateXsd(xml, "1095-A Form 8962 repayment");
});

Deno.test("annual-only 1095-A totals cannot claim Form 8962 line 11", () => {
  const result = runReturn({
    general: singleGeneral(),
    w2: [w2Item(30_120, 3_000)],
    f1095a: [{
      issuer_name: "Marketplace Plan",
      annual_premium: 6_000,
      annual_slcsp: 6_000,
      annual_aptc: 1_000,
    }],
  });
  assertEquals(result.pending.form8962?.total_premium_tax_credit, undefined);
  assertEquals(
    result.diagnostics.some((diagnostic) =>
      diagnostic.nodeType === "form8962" &&
      diagnostic.message.includes("annual line 11 needs verified full-year")
    ),
    true,
  );
});

Deno.test({
  name:
    "XSD: monthly 1095-A without APTC reaches Form 8962 monthly rows and Schedule 3",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    w2: [w2Item(30_120, 3_000)],
    f1095a: [{
      issuer_name: "Marketplace Plan",
      monthly_premiums: Array(12).fill(500),
      monthly_slcsps: [...Array(11).fill(600), 601],
      monthly_aptcs: Array(12).fill(0),
    }],
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form8962?.total_premium_tax_credit, 6_000);
  assertEquals(result.pending.schedule3?.line9_premium_tax_credit, 6_000);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertEquals(xml.match(/<MonthlyPTCCalculationGrp>/g)?.length, 12);
  assertStringIncludes(
    xml,
    "<TotalPremiumTaxCreditAmt>6000</TotalPremiumTaxCreditAmt>",
  );
  await validateXsd(xml, "monthly 1095-A without APTC");
});

Deno.test({
  name:
    "XSD: below-100%-FPL Marketplace exception reaches Form 8962 and Schedule 3",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = {
    ...singleGeneral(),
    ptc_below_100_fpl_status: {
      basis: "marketplace_estimate",
      no_one_can_claim_taxpayer: true,
      marketplace_coverage: true,
      marketplace_estimated_at_least_100_fpl: true,
      marketplace_information_provided_in_good_faith: true,
      otherwise_applicable_taxpayer: true,
    },
  };
  const result = runReturn({
    general,
    w2: [w2Item(10_000, 0)],
    f1095a: [{
      issuer_name: "Marketplace Plan",
      monthly_premiums: Array(12).fill(250),
      monthly_slcsps: Array(12).fill(350),
      monthly_aptcs: Array(12).fill(100),
    }],
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form8962?.federal_poverty_pct, 66);
  assertEquals(result.pending.form8962?.total_premium_tax_credit, 3_000);
  assertEquals(result.pending.schedule3?.line9_premium_tax_credit, 1_800);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(
    xml,
    "<FederalPovertyLevelPct>66</FederalPovertyLevelPct>",
  );
  assertStringIncludes(
    xml,
    "<ReconciledPremiumTaxCreditAmt>1800</ReconciledPremiumTaxCreditAmt>",
  );
  await validateXsd(xml, "below-100%-FPL Marketplace exception");
});

Deno.test({
  name:
    "XSD: below-100%-FPL non-applicable taxpayer files APTC-only annual group",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = {
    ...singleGeneral(),
    ptc_below_100_fpl_status: nonApplicableBelowFpl,
  };
  const result = runReturn({
    general,
    w2: [w2Item(10_000, 0)],
    f1095a: [{
      issuer_name: "Marketplace Plan",
      monthly_premiums: Array(12).fill(250),
      monthly_slcsps: Array(12).fill(350),
      monthly_aptcs: Array(12).fill(200),
    }],
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form8962?.total_premium_tax_credit, 0);
  assertEquals(result.pending.schedule2?.line1a_excess_advance_premium, 375);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(
    xml,
    "<AnnualAdvancedPTCAmt>2400</AnnualAdvancedPTCAmt>",
  );
  assertEquals(xml.includes("<AnnualPremiumAmt>"), false);
  assertEquals(xml.includes("<ApplicableFigureRt>"), false);
  await validateXsd(xml, "below-100%-FPL APTC-only annual repayment");
});

Deno.test({
  name:
    "XSD: below-100%-FPL non-applicable taxpayer files APTC-only monthly rows",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = {
    ...singleGeneral(),
    ptc_below_100_fpl_status: nonApplicableBelowFpl,
  };
  const result = runReturn({
    general,
    w2: [w2Item(10_000, 0)],
    f1095a: [{
      issuer_name: "Marketplace Plan",
      monthly_premiums: Array(12).fill(250),
      monthly_slcsps: [...Array(11).fill(350), 400],
      monthly_aptcs: Array(12).fill(200),
    }],
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule2?.line1a_excess_advance_premium, 375);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertEquals(xml.match(/<MonthlyPTCCalculationGrp>/g)?.length, 12);
  assertStringIncludes(
    xml,
    "<MonthlyAdvancedPTCAmt>200</MonthlyAdvancedPTCAmt>",
  );
  assertEquals(xml.includes("<MonthlyPremiumAmt>"), false);
  assertEquals(xml.includes("<MonthlyPremiumSLCSPAmt>"), false);
  await validateXsd(xml, "below-100%-FPL APTC-only monthly repayment");
});

Deno.test({
  name: "XSD: MFS without exception files family-only APTC repayment",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = {
    ...singleGeneral(),
    filing_status: FilingStatus.MFS,
    spouse_first_name: "Other",
    spouse_last_name: "Taxpayer",
    spouse_ssn: "222-33-4444",
    mfs_spouse_itemizing: false,
    ptc_mfs_status: {
      basis: "no_exception",
      exception_reviewed: true,
      no_one_can_claim_taxpayer: true,
      policy_scope: "family_only",
      all_covered_individuals_lawfully_present: true,
      no_self_employed_health_insurance_deduction: true,
    },
  };
  const result = runReturn({
    general,
    w2: [w2Item(30_000, 0)],
    f1095a: [{
      issuer_name: "Marketplace Plan",
      monthly_premiums: Array(12).fill(250),
      monthly_slcsps: Array(12).fill(350),
      monthly_aptcs: Array(12).fill(200),
    }],
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form8962?.total_premium_tax_credit, 0);
  assertEquals(result.pending.schedule2?.line1a_excess_advance_premium, 750);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(
    xml,
    "<AnnualAdvancedPTCAmt>2400</AnnualAdvancedPTCAmt>",
  );
  assertEquals(xml.includes("<MarriedFilingSeparatelyExcInd>"), false);
  await validateXsd(xml, "MFS APTC-only repayment without exception");
});

Deno.test({
  name: "XSD: MFS abuse exception marks Form 8962 line A and claims PTC",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = {
    ...singleGeneral(),
    filing_status: FilingStatus.MFS,
    spouse_first_name: "Other",
    spouse_last_name: "Taxpayer",
    spouse_ssn: "222-33-4444",
    mfs_spouse_itemizing: false,
    ptc_mfs_status: {
      basis: "domestic_abuse",
      living_apart_at_filing: true,
      unable_to_file_joint_due_to_exception: true,
      prior_consecutive_exception_years: 0,
      no_one_can_claim_taxpayer: true,
      policy_scope: "family_only",
    },
  };
  const result = runReturn({
    general,
    w2: [w2Item(30_000, 0)],
    f1095a: [{
      issuer_name: "Marketplace Plan",
      monthly_premiums: Array(12).fill(500),
      monthly_slcsps: Array(12).fill(600),
      monthly_aptcs: Array(12).fill(100),
    }],
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form8962?.mfs_exception_ind, true);
  assertEquals(result.pending.schedule3?.line9_premium_tax_credit, 4_800);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(
    xml,
    "<MarriedFilingSeparatelyExcInd>X</MarriedFilingSeparatelyExcInd>",
  );
  await validateXsd(xml, "MFS Form 8962 abuse exception");
});

Deno.test({
  name:
    "XSD: shared MFS policy without exception allocates only APTC in Part IV",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = {
    ...singleGeneral(),
    filing_status: FilingStatus.MFS,
    spouse_first_name: "Other",
    spouse_last_name: "Taxpayer",
    spouse_ssn: "222-33-4444",
    mfs_spouse_itemizing: false,
    ptc_mfs_status: {
      basis: "no_exception",
      exception_reviewed: true,
      no_one_can_claim_taxpayer: true,
      policy_scope: "shared_with_spouse",
      all_covered_individuals_lawfully_present: true,
      no_self_employed_health_insurance_deduction: true,
    },
  };
  const result = runReturn({
    general,
    w2: [w2Item(30_000, 0)],
    f1095a: [{
      issuer_name: "Marketplace Plan",
      policy_number: "MFS-POLICY-1",
      monthly_premiums: Array(12).fill(1_200),
      monthly_slcsps: Array(12).fill(1_500),
      monthly_aptcs: Array(12).fill(800),
      shared_policy_periods: [{
        basis: "mfs_no_exception",
        other_taxpayer_ssn: "222-33-4444",
        start_month: 1,
        end_month: 12,
      }],
    }],
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form8962?.total_advance_ptc, 4_800);
  assertEquals(result.pending.schedule2?.line1a_excess_advance_premium, 750);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(
    xml,
    "<SharePolicyMarriedAltCalcInd>true</SharePolicyMarriedAltCalcInd>",
  );
  assertStringIncludes(
    xml,
    "<MonthlyAdvancedPTCPct>0.50</MonthlyAdvancedPTCPct>",
  );
  assertEquals(xml.includes("<MonthlyPremiumPct>"), false);
  assertEquals(xml.includes("<MonthlyPremiumSLCSPPct>"), false);
  await validateXsd(xml, "shared MFS APTC-only allocation");
});

Deno.test({
  name:
    "XSD: shared MFS exception allocates premium and APTC but not family SLCSP",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = {
    ...singleGeneral(),
    filing_status: FilingStatus.MFS,
    spouse_first_name: "Other",
    spouse_last_name: "Taxpayer",
    spouse_ssn: "222-33-4444",
    mfs_spouse_itemizing: false,
    ptc_mfs_status: {
      basis: "domestic_abuse",
      living_apart_at_filing: true,
      unable_to_file_joint_due_to_exception: true,
      prior_consecutive_exception_years: 0,
      no_one_can_claim_taxpayer: true,
      policy_scope: "shared_with_spouse",
    },
  };
  const result = runReturn({
    general,
    w2: [w2Item(30_000, 0)],
    f1095a: [{
      issuer_name: "Marketplace Plan",
      policy_number: "MFS-POLICY-1",
      monthly_premiums: Array(12).fill(1_200),
      monthly_slcsps: Array(12).fill(1_500),
      monthly_aptcs: Array(12).fill(800),
      shared_policy_periods: [{
        basis: "mfs_exception",
        other_taxpayer_ssn: "222-33-4444",
        start_month: 1,
        end_month: 12,
        monthly_family_slcsps: Array(12).fill(700),
      }],
    }],
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form8962?.total_premium_tax_credit, 7_200);
  assertEquals(result.pending.schedule3?.line9_premium_tax_credit, 2_400);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(xml, "<MonthlyPremiumPct>0.50</MonthlyPremiumPct>");
  assertStringIncludes(
    xml,
    "<MonthlyAdvancedPTCPct>0.50</MonthlyAdvancedPTCPct>",
  );
  assertStringIncludes(
    xml,
    "<MonthlyPremiumSLCSPAmt>700</MonthlyPremiumSLCSPAmt>",
  );
  assertEquals(xml.includes("<MonthlyPremiumSLCSPPct>"), false);
  await validateXsd(xml, "shared MFS exception allocation");
});

Deno.test({
  name:
    "XSD: divorced taxpayers' agreed allocation fills all Part IV percentages",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    w2: [w2Item(30_000, 3_000)],
    f1095a: [{
      issuer_name: "Marketplace Plan",
      policy_number: "DIV-POLICY-1",
      monthly_premiums: [1_200, ...Array(11).fill(0)],
      monthly_slcsps: [1_500, ...Array(11).fill(0)],
      monthly_aptcs: [800, ...Array(11).fill(0)],
      shared_policy_periods: [{
        basis: "divorce_agreed",
        divorced_or_legally_separated_in_tax_year: true,
        shared_during_marriage: true,
        other_taxpayer_ssn: "222-33-4444",
        start_month: 1,
        end_month: 1,
        allocation_pct: 0.67,
      }],
    }],
  });
  assertEquals(result.diagnostics, []);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(xml, "<MonthlyPremiumPct>0.67</MonthlyPremiumPct>");
  assertStringIncludes(
    xml,
    "<MonthlyPremiumSLCSPPct>0.67</MonthlyPremiumSLCSPPct>",
  );
  assertStringIncludes(
    xml,
    "<MonthlyAdvancedPTCPct>0.67</MonthlyAdvancedPTCPct>",
  );
  assertStringIncludes(xml, "<MonthlyPremiumAmt>804</MonthlyPremiumAmt>");
  assertStringIncludes(
    xml,
    "<MonthlyPremiumSLCSPAmt>1005</MonthlyPremiumSLCSPAmt>",
  );
  assertStringIncludes(
    xml,
    "<MonthlyAdvancedPTCAmt>536</MonthlyAdvancedPTCAmt>",
  );
  await validateXsd(xml, "divorce agreed policy allocation");
});

Deno.test({
  name: "XSD: no-APTC shared policy allocates only premium in Part IV",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    w2: [w2Item(30_000, 3_000)],
    f1095a: [{
      issuer_name: "Marketplace Plan",
      policy_number: "NO-APTC-POLICY",
      monthly_premiums: [15_000, ...Array(11).fill(0)],
      monthly_aptcs: Array(12).fill(0),
      shared_policy_periods: [{
        basis: "no_aptc",
        other_taxpayer_ssn: "222-33-4444",
        start_month: 1,
        end_month: 1,
        monthly_family_slcsps: [12_000, ...Array(11).fill(0)],
        monthly_other_family_slcsps: [6_000, ...Array(11).fill(0)],
      }],
    }],
  });
  assertEquals(result.diagnostics, []);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(xml, "<MonthlyPremiumPct>0.67</MonthlyPremiumPct>");
  assertEquals(xml.includes("<MonthlyPremiumSLCSPPct>"), false);
  assertEquals(xml.includes("<MonthlyAdvancedPTCPct>"), false);
  assertStringIncludes(xml, "<MonthlyPremiumAmt>10000</MonthlyPremiumAmt>");
  assertStringIncludes(
    xml,
    "<MonthlyPremiumSLCSPAmt>12000</MonthlyPremiumSLCSPAmt>",
  );
  await validateXsd(xml, "no-APTC shared policy allocation");
});

Deno.test({
  name: "XSD: one Marketplace policy emits two nonoverlapping Part IV periods",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const period = {
    basis: "other_agreed",
    situations_1_to_3_reviewed_and_inapplicable: true,
    other_taxpayer_ssn: "222-33-4444",
  };
  const result = runReturn({
    general,
    w2: [w2Item(30_000, 3_000)],
    f1095a: [{
      issuer_name: "Marketplace Plan",
      policy_number: "SPLIT-POLICY",
      monthly_premiums: Array(12).fill(1_200),
      monthly_slcsps: Array(12).fill(1_500),
      monthly_aptcs: Array(12).fill(800),
      shared_policy_periods: [
        { ...period, start_month: 1, end_month: 6, allocation_pct: 0.2 },
        { ...period, start_month: 7, end_month: 12, allocation_pct: 0.8 },
      ],
    }],
  });
  assertEquals(result.diagnostics, []);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertEquals((xml.match(/<SharedPolicyAllocationGrp>/g) ?? []).length, 2);
  assertStringIncludes(xml, "<MonthlyPremiumPct>0.20</MonthlyPremiumPct>");
  assertStringIncludes(xml, "<MonthlyPremiumPct>0.80</MonthlyPremiumPct>");
  assertStringIncludes(xml, "<StartMonthNumberCd>07</StartMonthNumberCd>");
  await validateXsd(xml, "two shared-policy periods");
});

Deno.test({
  name: "XSD: one policy has shared months followed by family-only months",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    w2: [w2Item(30_000, 3_000)],
    f1095a: [{
      issuer_name: "Marketplace Plan",
      policy_number: "MIXED-POLICY",
      monthly_premiums: Array(12).fill(1_200),
      monthly_slcsps: Array(12).fill(1_500),
      monthly_aptcs: Array(12).fill(800),
      shared_policy_periods: [{
        basis: "divorce_agreed",
        divorced_or_legally_separated_in_tax_year: true,
        shared_during_marriage: true,
        other_taxpayer_ssn: "222-33-4444",
        start_month: 1,
        end_month: 6,
        allocation_pct: 0.5,
      }, {
        basis: "family_only",
        only_tax_family_covered: true,
        start_month: 7,
        end_month: 12,
        monthly_family_slcsps: [
          ...Array(6).fill(0),
          ...Array(6).fill(900),
        ],
      }],
    }],
  });
  assertEquals(result.diagnostics, []);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertEquals((xml.match(/<SharedPolicyAllocationGrp>/g) ?? []).length, 1);
  assertStringIncludes(xml, "<MonthlyPremiumPct>0.50</MonthlyPremiumPct>");
  assertStringIncludes(
    xml,
    "<MonthlyPremiumSLCSPAmt>750</MonthlyPremiumSLCSPAmt>",
  );
  assertStringIncludes(
    xml,
    "<MonthlyPremiumSLCSPAmt>900</MonthlyPremiumSLCSPAmt>",
  );
  await validateXsd(xml, "shared then family-only policy months");
});

Deno.test({
  name: "XSD: five Part IV allocations use repeated MeF groups and line 34 No",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    w2: [w2Item(30_000, 3_000)],
    f1095a: [{
      issuer_name: "Marketplace Plan",
      policy_number: "FIVE-PERIODS",
      monthly_premiums: [...Array(5).fill(1_200), ...Array(7).fill(0)],
      monthly_slcsps: [...Array(5).fill(1_500), ...Array(7).fill(0)],
      monthly_aptcs: [...Array(5).fill(800), ...Array(7).fill(0)],
      shared_policy_periods: Array.from({ length: 5 }, (_, index) => ({
        basis: "other_agreed",
        situations_1_to_3_reviewed_and_inapplicable: true,
        other_taxpayer_ssn: "222-33-4444",
        start_month: index + 1,
        end_month: index + 1,
        allocation_pct: (index + 1) / 10,
      })),
    }],
  });
  assertEquals(result.diagnostics, []);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertEquals((xml.match(/<SharedPolicyAllocationGrp>/g) ?? []).length, 5);
  assertStringIncludes(
    xml,
    "<SharedPolicyAllocationInfoInd>false</SharedPolicyAllocationInfoInd>",
  );
  assertStringIncludes(xml, "<StartMonthNumberCd>05</StartMonthNumberCd>");
  await validateXsd(xml, "five Part IV allocation groups");
});

Deno.test({
  name: "XSD: two same-state Marketplace policies use one SLCSP benchmark",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    w2: [w2Item(30_120, 3_000)],
    f1095a: [
      {
        issuer_name: "First Marketplace Plan",
        coverage_state: "TX",
        monthly_premiums: Array(12).fill(500),
        monthly_slcsps: Array(12).fill(600),
        monthly_aptcs: Array(12).fill(0),
      },
      {
        issuer_name: "Second Marketplace Plan",
        coverage_state: "TX",
        monthly_premiums: [...Array(11).fill(300), 301],
        monthly_slcsps: Array(12).fill(600),
        monthly_aptcs: Array(12).fill(0),
      },
    ],
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form8962?.total_premium_tax_credit, 6_600);
  assertEquals(result.pending.schedule3?.line9_premium_tax_credit, 6_600);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertEquals(xml.match(/<MonthlyPTCCalculationGrp>/g)?.length, 12);
  assertStringIncludes(
    xml,
    "<TotalPremiumTaxCreditAmt>6600</TotalPremiumTaxCreditAmt>",
  );
  await validateXsd(xml, "two same-state policies with one SLCSP");
});

Deno.test({
  name: "XSD: two unchanged full-year policies use annual Form 8962 line 11",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    w2: [w2Item(30_120, 3_000)],
    f1095a: [
      {
        issuer_name: "First Marketplace Plan",
        coverage_state: "TX",
        monthly_premiums: Array(12).fill(500),
        monthly_slcsps: Array(12).fill(600),
        monthly_aptcs: Array(12).fill(0),
      },
      {
        issuer_name: "Second Marketplace Plan",
        coverage_state: "TX",
        monthly_premiums: Array(12).fill(300),
        monthly_slcsps: Array(12).fill(600),
        monthly_aptcs: Array(12).fill(0),
      },
    ],
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form8962?.total_premium_tax_credit, 6_598);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(xml, "<AnnualPTCCalculationGrp>");
  assertEquals(xml.includes("<MonthlyPTCCalculationGrp>"), false);
  await validateXsd(xml, "two unchanged full-year policies on line 11");
});

Deno.test({
  name:
    "XSD: 1099-INT tax-exempt interest enters Form 8962 modified AGI but not 1040 AGI",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    w2: [w2Item(30_120, 3_000)],
    f1099int: [{ payer_name: "Municipal Bond", box8: 5_000 }],
    f1095a: [{
      issuer_name: "Marketplace Plan",
      annual_premium: 6_000,
      annual_slcsp: 6_000,
      annual_aptc: 0,
      monthly_premiums: Array(12).fill(500),
      monthly_slcsps: Array(12).fill(500),
      monthly_aptcs: Array(12).fill(0),
    }],
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040?.line11_agi, 30_120);
  assertEquals(result.pending.form8962?.household_income, 35_120);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(xml, "<ModifiedAGIAmt>35120</ModifiedAGIAmt>");
  assertStringIncludes(xml, "<HouseholdIncomeAmt>35120</HouseholdIncomeAmt>");
  await validateXsd(xml, "1099-INT tax-exempt interest and Form 8962 MAGI");
});

Deno.test({
  name:
    "XSD: required-filing dependent MAGI enters Form 8962 line 2b and line 3",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = {
    ...singleGeneral(),
    dependents: [{
      first_name: "Child",
      last_name: "Taxpayer",
      ssn: "222-33-4444",
      dob: "2010-01-01",
      relationship: "daughter",
      months_in_home: 12,
      ptc_tax_return: {
        filing: "required",
        agi: 12_000,
        tax_exempt_interest: 500,
      },
    }],
  };
  const result = runReturn({
    general,
    w2: [w2Item(30_120, 3_000)],
    f1095a: [{
      issuer_name: "Marketplace Plan",
      monthly_premiums: Array(12).fill(500),
      monthly_slcsps: Array(12).fill(600),
      monthly_aptcs: Array(12).fill(0),
    }],
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form8962?.taxpayer_modified_agi, 30_120);
  assertEquals(result.pending.form8962?.dependents_modified_agi, 12_500);
  assertEquals(result.pending.form8962?.household_income, 42_620);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(xml, "<ModifiedAGIAmt>30120</ModifiedAGIAmt>");
  assertStringIncludes(
    xml,
    "<TotalDependentsModifiedAGIAmt>12500</TotalDependentsModifiedAGIAmt>",
  );
  assertStringIncludes(xml, "<HouseholdIncomeAmt>42620</HouseholdIncomeAmt>");
  await validateXsd(xml, "Form 8962 dependent modified AGI");
});

Deno.test({
  name: "XSD: Form 4137 employer tips and calculated taxes",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const xml = buildMefXml({
    form4137: {
      forms: [{
        recipient: "taxpayer",
        employers: [{
          name: "CAFE",
          ein: "123456789",
          tips_received: 5_000,
          tips_reported: 2_000,
        }],
        ss_wages_from_w2: 30_000,
      }],
    },
  }, extractFilerIdentity(singleGeneral()));
  assertStringIncludes(xml, "<UnreportedTipIncomePerEmployer>");
  await validateXsd(xml, "Form 4137 employer tips");
});

Deno.test({
  name:
    "XSD: Schedule F and Form 4835 elections link distinct CCC and crop statements",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const xml = buildMefXml({
    f4835: {
      f4835s: [{
        activity_name: "Rented south field",
        livestock_crop_income: 0,
        ccc_loans_reported_election: 1_000,
        ccc_loan_details: [{ description: "RENTAL WHEAT LOAN", amount: 1_000 }],
      }],
    },
    schedule_f: {
      schedule_fs: [{
        line_a_principal_crop_activity: "GRAIN FARMING",
        line_b_agricultural_activity_code: "111100",
        line_e_material_participation: true,
        accounting_method: "cash",
        line1_sales_livestock_resale: 0,
        line5a_ccc_loans_election: 2_000,
        line5a_ccc_loan_details: [{
          description: "OWNER CORN LOAN",
          amount: 2_000,
        }],
        line6a_crop_insurance: 5_000,
        line6b_crop_insurance_taxable: 0,
        line6c_defer_crop_insurance: true,
        line6c_crop_insurance_deferral_details: {
          cash_method: true,
          normal_practice_next_year_percent: 80,
          damaged_crops: [{
            crop: "CORN",
            damage_date: "2025-08-01",
            cause: "HAIL",
          }],
          payments: [{
            crop: "CORN",
            received_date: "2025-10-01",
            amount: 5_000,
            carrier: "FARM INSURER",
          }],
        },
      }],
    },
  }, extractFilerIdentity(singleGeneral()));
  assertStringIncludes(
    xml,
    '<CCCLoanReportedElectionAmt referenceDocumentId="CCCLoanDetailCashMethodStmt',
  );
  assertStringIncludes(
    xml,
    '<ElectionDeferCropInsProcInd referenceDocumentId="PostponementCropInsDsstrStmt',
  );
  assertStringIncludes(xml, "<LoanDesc>RENTAL WHEAT LOAN</LoanDesc>");
  assertStringIncludes(xml, "<LoanDesc>OWNER CORN LOAN</LoanDesc>");
  await validateXsd(xml, "Schedule F and Form 4835 farm elections");
});

Deno.test({
  name:
    "XSD: two cash-method Schedule F farms preserve detailed income and expenses",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const xml = buildMefXml({
    schedule_f: {
      schedule_fs: [
        {
          line_a_principal_crop_activity: "GRAIN FARMING",
          line_b_agricultural_activity_code: "111100",
          line_e_material_participation: true,
          accounting_method: "cash",
          line1_sales_livestock_resale: 50_000,
          line1b_cost_livestock_resale: 30_000,
          line2_sales_products_raised: 8_000,
          line5b_ccc_loans_forfeited: 4_000,
          line5c_ccc_loans_forfeited_taxable: 2_000,
          line16_feed: 3_000,
          line32_other_expenses: [{ description: "SOFTWARE", amount: 500 }],
          line36_at_risk: "a",
        },
        {
          line_a_principal_crop_activity: "BEEF CATTLE",
          line_b_agricultural_activity_code: "112111",
          line_e_material_participation: true,
          accounting_method: "cash",
          line1_sales_livestock_resale: 0,
          line2_sales_products_raised: 1_000,
        },
      ],
    },
  }, extractFilerIdentity(singleGeneral()));
  assertStringIncludes(
    xml,
    '<IRS1040ScheduleF documentId="IRS1040ScheduleF1">',
  );
  assertStringIncludes(
    xml,
    '<IRS1040ScheduleF documentId="IRS1040ScheduleF2">',
  );
  await validateXsd(xml, "two Schedule F cash-method farms");
});

Deno.test({
  name: "XSD: accrual Schedule F Part III and CCC election statement",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const xml = buildMefXml({
    schedule_f: {
      schedule_fs: [{
        line_a_principal_crop_activity: "GRAIN FARMING",
        line_b_agricultural_activity_code: "111100",
        line_e_material_participation: true,
        accounting_method: "accrual",
        part_iii: {
          line37_sales_products: 20_000,
          line38a_cooperative_distributions: 1_000,
          line38b_cooperative_distributions_taxable: 1_000,
          line40a_ccc_loans_election: 2_000,
          line40a_ccc_loan_details: [{
            description: "WHEAT LOAN",
            amount: 2_000,
          }],
          line45_beginning_inventory: 3_000,
          line46_products_purchased: 2_000,
          line48_ending_inventory: 6_000,
          inventory_method: "farm_price",
        },
        line16_feed: 1_000,
      }],
    },
  }, extractFilerIdentity(singleGeneral()));
  assertStringIncludes(
    xml,
    'referenceDocumentName="CCCLoanDetailAccrualMethodStatement"',
  );
  assertStringIncludes(xml, "<GrossIncomeAmt>24000</GrossIncomeAmt>");
  await validateXsd(xml, "accrual Schedule F and CCC election");
});

const businessCasualty = {
  business_fmv_before: 80_000,
  business_fmv_after: 50_000,
  business_basis: 50_000,
  business_insurance: 0,
  business_is_section_1231: true,
  business_property_description: "Workshop equipment",
  business_property_location: "Austin, TX",
  business_acquired_date: "2020-04-01",
  business_casualty_date: "2025-06-15",
  business_casualty_description: "Storm damaged workshop equipment",
};

Deno.test({
  name: "XSD: Form 6252 installment sale reaches Schedule D through the graph",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    w2: [w2Item(50_000, 8_000)],
    form6252: [{
      property_description: "Vacant land",
      date_acquired: "2020-01-01",
      date_sold: "2025-03-01",
      sold_to_related_party: false,
      selling_price_determinable: true,
      selling_price: 100_000,
      mortgage_assumed: 60_000,
      cost_basis: 40_000,
      payments_received: 10_000,
    }],
  });
  assertEquals(result.diagnostics, []);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(xml, "<IRS6252 documentId=");
  assertStringIncludes(
    xml,
    "<InstallmentSaleIncomeAmt>30000</InstallmentSaleIncomeAmt>",
  );
  assertStringIncludes(
    xml,
    "<LTGainOrLossFromFormsAmt>30000</LTGainOrLossFromFormsAmt>",
  );
  await validateXsd(xml, "Form 6252 and linked Schedule D installment gain");
});

Deno.test({
  name: "XSD: Form 6252 business installment gain reaches Form 4797 line 4",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    w2: [w2Item(50_000, 8_000)],
    form6252: [{
      property_description: "Business land",
      date_acquired: "2020-01-01",
      date_sold: "2025-03-01",
      sold_to_related_party: false,
      selling_price_determinable: true,
      selling_price: 100_000,
      cost_basis: 40_000,
      payments_received: 20_000,
      is_capital_asset: false,
    }],
  });
  assertEquals(result.diagnostics, []);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(
    xml,
    "<GainInstallmentSalesFrm6252Amt>12000</GainInstallmentSalesFrm6252Amt>",
  );
  assertStringIncludes(
    xml,
    "<TotalPropertyGainLossAmt>12000</TotalPropertyGainLossAmt>",
  );
  await validateXsd(
    xml,
    "Form 6252 and Form 4797 section 1231 installment gain",
  );
});

Deno.test({
  name: "XSD: three installment sales retain separate Form 6252 documents",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const common = {
    date_acquired: "2020-01-01",
    date_sold: "2025-03-01",
    sold_to_related_party: false,
    selling_price_determinable: true,
  };
  const result = runReturn({
    general,
    w2: [w2Item(50_000, 8_000)],
    form6252: [
      {
        ...common,
        property_description: "Land A",
        selling_price: 100_000,
        cost_basis: 40_000,
        payments_received: 10_000,
      },
      {
        ...common,
        property_description: "Land B",
        selling_price: 50_000,
        cost_basis: 25_000,
        payments_received: 10_000,
      },
      {
        ...common,
        property_description: "Business land",
        selling_price: 80_000,
        cost_basis: 40_000,
        payments_received: 20_000,
        is_capital_asset: false,
      },
    ],
  });
  assertEquals(result.diagnostics, []);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertEquals((xml.match(/<IRS6252 documentId=/g) ?? []).length, 3);
  // Schedule D line 11 also includes the $10,000 net section 1231 gain.
  assertStringIncludes(
    xml,
    "<LTGainOrLossFromFormsAmt>21000</LTGainOrLossFromFormsAmt>",
  );
  assertStringIncludes(
    xml,
    "<GainInstallmentSalesFrm6252Amt>10000</GainInstallmentSalesFrm6252Amt>",
  );
  await validateXsd(xml, "three Form 6252 installment sales and destinations");
});

Deno.test({
  name:
    "XSD: Form 6252 business gain and K-1 section 1231 gain combine on Form 4797",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    w2: [w2Item(50_000, 8_000)],
    k1_partnership: [{
      partnership_name: "Example Partnership",
      box10_net_1231: 20_000,
    }],
    form6252: [{
      property_description: "Business land",
      date_acquired: "2020-01-01",
      date_sold: "2025-03-01",
      sold_to_related_party: false,
      selling_price_determinable: true,
      selling_price: 80_000,
      cost_basis: 40_000,
      payments_received: 20_000,
      is_capital_asset: false,
    }],
  });
  assertEquals(result.diagnostics, []);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(
    xml,
    "<GainInstallmentSalesFrm6252Amt>10000</GainInstallmentSalesFrm6252Amt>",
  );
  assertStringIncludes(
    xml,
    "<TotalPropertyGainLossAmt>30000</TotalPropertyGainLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<LTGainOrLossFromFormsAmt>30000</LTGainOrLossFromFormsAmt>",
  );
  await validateXsd(xml, "Form 6252 and K-1 combined section 1231 gain");
});

Deno.test({
  name:
    "XSD: partnership and S-corp section 1231 gains retain Form 4797 line 2 rows",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    w2: [w2Item(50_000, 8_000)],
    k1_partnership: [{
      partnership_name: "Partner One",
      box10_net_1231: 10_000,
    }],
    k1_s_corp: [{ corporation_name: "Corp Two", box9_net_1231: 3_000 }],
  });
  assertEquals(result.diagnostics, []);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertEquals((xml.match(/<PropertySaleOrExchange>/g) ?? []).length, 2);
  assertStringIncludes(
    xml,
    "<DateAcquiredInheritedCd>FROM SCHEDULE K-1 F1120S</DateAcquiredInheritedCd>",
  );
  assertStringIncludes(
    xml,
    "<TotalPropertyGainLossAmt>13000</TotalPropertyGainLossAmt>",
  );
  await validateXsd(xml, "Form 4797 K-1 partnership and S-corp source rows");
});

Deno.test({
  name: "XSD: Form 4684 long-term business casualty links Form 4797 line 14",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    w2: [w2Item(50_000, 8_000)],
    form4684: businessCasualty,
  });
  assertEquals(result.diagnostics, []);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(
    xml,
    "<NetBusinessPropertyLossAmt>30000</NetBusinessPropertyLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<LongTermPropNetGainOrLossAmt>-30000</LongTermPropNetGainOrLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<NetGainLossForm4684Amt>-30000</NetGainLossForm4684Amt>",
  );
  assertStringIncludes(
    xml,
    "<AdjustedGrossIncomeAmt>20000</AdjustedGrossIncomeAmt>",
  );
  await validateXsd(xml, "Form 4684 and linked Form 4797 business casualty");
});

Deno.test({
  name: "XSD: Form 4797 section 1231 gain and prior-loss recapture validate",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const xml = buildMefXml({
    form4797: { section_1231_gain: 20_000, nonrecaptured_1231_loss: 5_000 },
  }, extractFilerIdentity(singleGeneral()));
  assertStringIncludes(
    xml,
    "<TotalPropertyGainLossAmt>20000</TotalPropertyGainLossAmt>",
  );
  assertStringIncludes(xml, "<TotalGainLossAmt>15000</TotalGainLossAmt>");
  assertStringIncludes(xml, "<OtherGainLossAmt>5000</OtherGainLossAmt>");
  await validateXsd(xml, "Form 4797 section 1231 prior-loss recapture");
});

Deno.test({
  name: "XSD: Form 4797 section 1231 ordinary loss validates",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const xml = buildMefXml(
    { form4797: { section_1231_gain: -4_000 } },
    extractFilerIdentity(singleGeneral()),
  );
  assertStringIncludes(xml, "<OrdinaryLossAmt>4000</OrdinaryLossAmt>");
  assertStringIncludes(xml, "<OtherGainLossAmt>-4000</OtherGainLossAmt>");
  await validateXsd(xml, "Form 4797 section 1231 ordinary loss");
});

Deno.test({
  name: "XSD: Form 4684 business loss enters Form 4797 line 14",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const xml = buildMefXml({
    form4684: { ...businessCasualty, business_fmv_after: 60_000 },
    form4797: { ordinary_gain_form4684: -20_000 },
  }, extractFilerIdentity(singleGeneral()));
  assertStringIncludes(
    xml,
    "<NetGainLossForm4684Amt>-20000</NetGainLossForm4684Amt>",
  );
  assertStringIncludes(xml, "<OtherGainLossAmt>-20000</OtherGainLossAmt>");
  await validateXsd(xml, "Form 4797 line 14 from Form 4684");

  const combined = buildMefXml({
    form4684: {
      ...businessCasualty,
      business_fmv_before: 52_000,
      business_fmv_after: 50_000,
    },
    form4797: {
      section_1231_gain: -4_000,
      ordinary_gain_form4684: -2_000,
    },
  }, extractFilerIdentity(singleGeneral()));
  assertStringIncludes(
    combined,
    "<TotalOrdinaryGainLossAmt>-6000</TotalOrdinaryGainLossAmt>",
  );
  await validateXsd(
    combined,
    "Form 4797 combined Part I loss and Form 4684 line 14",
  );
});

Deno.test({
  name:
    "XSD: K-1 section 1231 gain reconciles Form 4797 with Schedule D and AGI",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    w2: [w2Item(50_000, 8_000)],
    k1_partnership: [{
      partnership_name: "Example Partnership",
      box10_net_1231: 20_000,
    }],
  });
  assertEquals(result.diagnostics, []);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(
    xml,
    "<TotalPropertyGainLossAmt>20000</TotalPropertyGainLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<AdjustedGrossIncomeAmt>70000</AdjustedGrossIncomeAmt>",
  );
  await validateXsd(xml, "K-1 section 1231 Form 4797 execution path");
});

Deno.test({
  name: "XSD: K-1 section 1231 loss reaches Form 4797 and Schedule 1",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    w2: [w2Item(50_000, 8_000)],
    k1_partnership: [{
      partnership_name: "Example Partnership",
      box10_net_1231: -4_000,
    }],
  });
  assertEquals(result.diagnostics, []);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(
    xml,
    "<TotalPropertyGainLossAmt>-4000</TotalPropertyGainLossAmt>",
  );
  assertStringIncludes(xml, "<OtherGainLossAmt>-4000</OtherGainLossAmt>");
  assertStringIncludes(
    xml,
    "<AdjustedGrossIncomeAmt>46000</AdjustedGrossIncomeAmt>",
  );
  await validateXsd(xml, "K-1 section 1231 loss execution path");
});

Deno.test({
  name:
    "XSD: Schedule 1 combines Schedule E and allowed passive loss on line 5",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const xml = buildMefXml({
    schedule1: {
      line4_other_gains: 1_000,
      line5_schedule_e: [12_000, -5_000],
      line6_schedule_f: 2_000,
    },
  }, extractFilerIdentity(singleGeneral()));
  assertStringIncludes(
    xml,
    "<RentalRealEstateIncomeLossAmt>7000</RentalRealEstateIncomeLossAmt>",
  );
  await validateXsd(xml, "Schedule 1 line 5");
});

Deno.test({
  name: "XSD: Form 4835 with Schedule E farm reconciliation validates",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const xml = buildMefXml({
    schedule_e: { farm_rental_net: 11300, farm_rental_gross: 12100 },
    f4835: {
      f4835s: [{
        activity_name: "Farm",
        livestock_crop_income: 10000,
        cooperative_distributions_gross: 1000,
        cooperative_distributions_taxable: 600,
        crop_insurance_disaster_received: 2000,
        crop_insurance_disaster_taxable: 1500,
        expense_feed: 1000,
        expense_other_details: [{ description: "Tolls", amount: 100 }],
        expense_capitalized_263a: 300,
      }],
    },
  }, extractFilerIdentity(singleGeneral()));
  assertStringIncludes(xml, "<IRS1040ScheduleE documentId=");
  assertStringIncludes(xml, "<IRS4835 documentId=");
  await validateXsd(xml, "Form 4835 and Schedule E");
});

Deno.test({
  name: "XSD: Form 4835 input reaches Schedule E and MeF through execution",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    f4835: [{
      activity_name: "Farm",
      livestock_crop_income: 8000,
      expense_feed: 1000,
    }],
  });
  assertEquals(result.diagnostics, []);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(
    xml,
    "<NetFarmRentalIncomeOrLossAmt>7000</NetFarmRentalIncomeOrLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<FarmingAndFishingIncomeAmt>8000</FarmingAndFishingIncomeAmt>",
  );
  await validateXsd(xml, "Form 4835 execution path");
});

Deno.test({
  name: "XSD: Form 4835 CCC loan election and detail statement validate",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    f4835: [{
      activity_name: "Farm",
      livestock_crop_income: 1000,
      ccc_loans_reported_election: 4000,
      ccc_loan_details: [
        { description: "Corn loan", amount: 2500 },
        { description: "Wheat loan", amount: 1500 },
      ],
    }],
  });
  assertEquals(result.diagnostics, []);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  const statementId = xml.match(
    /<CCCLoanDetailCashMethodStmt documentId="([^"]+)">/,
  )?.[1];
  assertEquals(typeof statementId, "string");
  assertStringIncludes(
    xml,
    `<CCCLoanReportedElectionAmt referenceDocumentId="${statementId}" referenceDocumentName="CCCLoanDetailCashMethodStatement">4000</CCCLoanReportedElectionAmt>`,
  );
  assertStringIncludes(
    xml,
    "<LoanDesc>Corn loan</LoanDesc><LoanAmt>2500</LoanAmt>",
  );
  assertStringIncludes(
    xml,
    "<LoanDesc>Wheat loan</LoanDesc><LoanAmt>1500</LoanAmt>",
  );
  await validateXsd(xml, "Form 4835 CCC loan election");
});

Deno.test({
  name: "XSD: Form 4835 crop insurance deferral statement validates",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    f4835: [{
      activity_name: "Farm",
      defer_crop_insurance: true,
      crop_insurance_disaster_received: 5000,
      crop_insurance_disaster_taxable: 1000,
      crop_insurance_deferred_prior_year: 700,
      crop_insurance_deferral_details: {
        cash_method: true,
        normal_practice_next_year_percent: 80,
        damaged_crops: [{
          crop: "Corn",
          damage_date: "2025-08-15",
          cause: "Hail",
        }],
        payments: [{
          crop: "Corn",
          received_date: "2025-10-01",
          amount: 4000,
          carrier: "Farm Mutual",
        }],
      },
    }],
  });
  assertEquals(result.diagnostics, []);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  const statementId = xml.match(
    /<PostponementCropInsDsstrStmt documentId="([^"]+)"/,
  )?.[1];
  assertEquals(typeof statementId, "string");
  assertStringIncludes(
    xml,
    `<ElectionDeferCropInsProcInd referenceDocumentId="${statementId}" referenceDocumentName="PostponementOfCropInsuranceAndDisasterPaymentsStatement">X</ElectionDeferCropInsProcInd>`,
  );
  assertStringIncludes(
    xml,
    "<CropInsProcAndDsstrPymtTxblAmt>1000</CropInsProcAndDsstrPymtTxblAmt>",
  );
  assertStringIncludes(
    xml,
    "<NetFarmRentalIncomeOrLossAmt>1700</NetFarmRentalIncomeOrLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<InsuranceCarrierName><BusinessNameLine1Txt>Farm Mutual</BusinessNameLine1Txt></InsuranceCarrierName>",
  );
  await validateXsd(xml, "Form 4835 crop insurance deferral");
});

Deno.test({
  name: "XSD: Form 4835 farm loss is allowed only against passive farm income",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    f4835: [
      { activity_name: "Profitable farm", livestock_crop_income: 3000 },
      {
        activity_name: "Loss farm",
        livestock_crop_income: 0,
        expense_feed: 2000,
        some_investment_not_at_risk: false,
      },
    ],
  });
  assertEquals(result.diagnostics, []);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(
    xml,
    '<NetFarmRentalIncomeOrLossAmt passiveActivityLossLiteralCd="PAL">-2000</NetFarmRentalIncomeOrLossAmt>',
  );
  assertStringIncludes(
    xml,
    "<FarmRentalDeductibleLossAmt>2000</FarmRentalDeductibleLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<NetFarmRentalIncomeOrLossAmt>1000</NetFarmRentalIncomeOrLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<OtherActivityIncomeAmt>3000</OtherActivityIncomeAmt>",
  );
  await validateXsd(xml, "Form 4835 passive loss offset");
});

Deno.test({
  name: "XSD: Form 4835 passive farm loss is suspended without passive income",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    f4835: [{
      activity_name: "Loss farm",
      livestock_crop_income: 0,
      expense_feed: 2000,
      some_investment_not_at_risk: false,
    }],
  });
  assertEquals(result.diagnostics, []);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(
    xml,
    "<FarmRentalDeductibleLossAmt>0</FarmRentalDeductibleLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<NetFarmRentalIncomeOrLossAmt>0</NetFarmRentalIncomeOrLossAmt>",
  );
  assertStringIncludes(xml, "<TotalLossAmt>2000</TotalLossAmt>");
  await validateXsd(xml, "Form 4835 suspended passive loss");
});

Deno.test({
  name: "XSD: active Form 4835 farm rental loss uses the special allowance",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    f4835: [{
      activity_name: "Active farm",
      livestock_crop_income: 0,
      expense_feed: 2000,
      some_investment_not_at_risk: false,
      actively_participated: true,
    }],
  });
  assertEquals(result.diagnostics, []);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(
    xml,
    "<FarmRentalDeductibleLossAmt>2000</FarmRentalDeductibleLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<NetFarmRentalIncomeOrLossAmt>-2000</NetFarmRentalIncomeOrLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<AllowedRentalRealtyLossAmt>2000</AllowedRentalRealtyLossAmt>",
  );
  await validateXsd(xml, "Form 4835 active rental loss");
});

Deno.test({
  name: "XSD: Schedule E passive income releases Form 4835 farm loss",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    schedule_e: [{
      tsj: "T",
      property_description: "Rental land",
      property_type: 5,
      activity_type: "B",
      fair_rental_days: 365,
      personal_use_days: 0,
      rent_income: 3000,
      form_1099_payments_made: false,
      street_address: "12 Main Street",
      city: "Austin",
      state: "TX",
      zip: "78701",
    }],
    f4835: [{
      activity_name: "Loss farm",
      livestock_crop_income: 0,
      expense_feed: 2000,
      some_investment_not_at_risk: false,
    }],
  });
  assertEquals(result.diagnostics, []);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(
    xml,
    "<FarmRentalDeductibleLossAmt>2000</FarmRentalDeductibleLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<NetFarmRentalIncomeOrLossAmt>-2000</NetFarmRentalIncomeOrLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalSuppIncomeOrLossAmt>1000</TotalSuppIncomeOrLossAmt>",
  );
  await validateXsd(xml, "Schedule E income and Form 4835 loss");
});

Deno.test({
  name: "XSD: Form 4835 at-risk limit precedes its passive-loss allocation",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    f4835: [
      { activity_name: "Profit farm", livestock_crop_income: 1000 },
      {
        activity_name: "Risk-limited farm",
        livestock_crop_income: 0,
        expense_feed: 2000,
        some_investment_not_at_risk: true,
        at_risk_simplified: {
          opening_adjusted_basis: 1000,
          current_year_increases: 200,
          line9_decreases_and_exclusions: 600,
        },
      },
    ],
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.carryforwards.f4835_at_risk_suspended_2, 1400);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(
    xml,
    "<SomeInvestmentIsNotAtRiskInd>X</SomeInvestmentIsNotAtRiskInd>",
  );
  assertStringIncludes(
    xml,
    "<FarmRentalDeductibleLossAmt>600</FarmRentalDeductibleLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<ActivityDescriptionTxt>Risk-limited farm</ActivityDescriptionTxt>",
  );
  assertStringIncludes(
    xml,
    "<SimplifiedComputationRiskAmt>600</SimplifiedComputationRiskAmt>",
  );
  assertStringIncludes(xml, "<DeductibleLossAmt>-600</DeductibleLossAmt>");
  assertStringIncludes(
    xml,
    "<NetFarmRentalIncomeOrLossAmt>400</NetFarmRentalIncomeOrLossAmt>",
  );
  await validateXsd(xml, "Form 4835 at-risk and passive loss");
});

Deno.test({
  name: "XSD: zero amount at risk suspends the farm loss before Form 8582",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    f4835: [{
      activity_name: "No-risk farm",
      livestock_crop_income: 0,
      expense_feed: 2000,
      some_investment_not_at_risk: true,
      at_risk_simplified: {
        opening_adjusted_basis: 500,
        current_year_increases: 0,
        line9_decreases_and_exclusions: 500,
      },
    }],
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.carryforwards.f4835_at_risk_suspended_1, 2000);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(xml, "<DeductibleLossAmt>0</DeductibleLossAmt>");
  assertStringIncludes(
    xml,
    "<FarmRentalDeductibleLossAmt>0</FarmRentalDeductibleLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<NetFarmRentalIncomeOrLossAmt>0</NetFarmRentalIncomeOrLossAmt>",
  );
  assertEquals(xml.includes("<IRS8582"), false);
  await validateXsd(xml, "Form 4835 fully at-risk-suspended loss");
});

Deno.test({
  name: "XSD: separate farms retain separate Form 6198 computations",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    f4835: [
      {
        activity_name: "North farm",
        livestock_crop_income: 0,
        expense_feed: 1000,
        some_investment_not_at_risk: true,
        at_risk_simplified: {
          opening_adjusted_basis: 300,
          current_year_increases: 0,
          line9_decreases_and_exclusions: 0,
        },
      },
      {
        activity_name: "South farm",
        livestock_crop_income: 0,
        expense_feed: 2000,
        some_investment_not_at_risk: true,
        at_risk_simplified: {
          opening_adjusted_basis: 900,
          current_year_increases: 0,
          line9_decreases_and_exclusions: 0,
        },
      },
    ],
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.carryforwards.f4835_at_risk_suspended_1, 700);
  assertEquals(result.carryforwards.f4835_at_risk_suspended_2, 1100);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertEquals(xml.match(/<IRS6198 /g)?.length, 2);
  assertStringIncludes(
    xml,
    "<ActivityDescriptionTxt>North farm</ActivityDescriptionTxt>",
  );
  assertStringIncludes(
    xml,
    "<ActivityDescriptionTxt>South farm</ActivityDescriptionTxt>",
  );
  assertStringIncludes(xml, "<DeductibleLossAmt>-300</DeductibleLossAmt>");
  assertStringIncludes(xml, "<DeductibleLossAmt>-900</DeductibleLossAmt>");
  await validateXsd(xml, "separate Form 4835 at-risk farm computations");
});

Deno.test({
  name: "XSD: prior farm passive loss offsets farm profits through Form 8582",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    f4835: [
      {
        activity_name: "Prior-loss farm",
        livestock_crop_income: 1000,
        prior_unallowed_passive_operating: 1500,
      },
      { activity_name: "Current-profit farm", livestock_crop_income: 500 },
    ],
  });
  assertEquals(result.diagnostics, []);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(
    xml,
    "<PriorYearUnallowedOtherLossAmt>1500</PriorYearUnallowedOtherLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<FarmRentalDeductibleLossAmt>500</FarmRentalDeductibleLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<NetFarmRentalIncomeOrLossAmt>0</NetFarmRentalIncomeOrLossAmt>",
  );
  await validateXsd(xml, "prior farm passive loss and farm profits");
});

Deno.test({
  name: "XSD: unreleased prior farm passive loss remains a carryforward",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    f4835: [{
      activity_name: "Prior-loss farm",
      livestock_crop_income: 1000,
      prior_unallowed_passive_operating: 1500,
    }],
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.carryforwards.suspended_pal_8582, 500);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(
    xml,
    "<PriorYearUnallowedOtherLossAmt>1500</PriorYearUnallowedOtherLossAmt>",
  );
  assertStringIncludes(xml, "<TotalLossAmt>500</TotalLossAmt>");
  await validateXsd(xml, "partially released prior farm passive loss");
});

Deno.test({
  name:
    "XSD: prior farm passive loss and current at-risk loss retain their limits",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    f4835: [
      { activity_name: "Profit farm", livestock_crop_income: 1100 },
      {
        activity_name: "Limited farm",
        expense_feed: 2000,
        some_investment_not_at_risk: true,
        at_risk_simplified: {
          opening_adjusted_basis: 600,
          current_year_increases: 0,
          line9_decreases_and_exclusions: 0,
        },
        prior_unallowed_passive_operating: 500,
      },
    ],
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.carryforwards.f4835_at_risk_suspended_2, 1400);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(xml, "<DeductibleLossAmt>-600</DeductibleLossAmt>");
  assertStringIncludes(
    xml,
    "<PriorYearUnallowedOtherLossAmt>500</PriorYearUnallowedOtherLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<FarmRentalDeductibleLossAmt>1100</FarmRentalDeductibleLossAmt>",
  );
  await validateXsd(xml, "prior PAL and current at-risk farm loss");
});

Deno.test({
  name: "XSD: active farm prior loss uses Form 8582 special allowance",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    f4835: [{
      activity_name: "Active farm",
      livestock_crop_income: 1000,
      actively_participated: true,
      prior_unallowed_passive_operating: 1500,
      prior_passive_losses_active_when_incurred: true,
    }],
  });
  assertEquals(result.diagnostics, []);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(
    xml,
    "<PYUnallowedRentalLossAmt>1500</PYUnallowedRentalLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<FarmRentalDeductibleLossAmt>500</FarmRentalDeductibleLossAmt>",
  );
  await validateXsd(xml, "active farm prior PAL special allowance");
});

Deno.test({
  name: "XSD: Schedule E rental and royalty properties survive execution",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    schedule_e: [
      {
        tsj: "T",
        property_description: "Rental house",
        property_type: 1,
        activity_type: "A",
        fair_rental_days: 365,
        personal_use_days: 0,
        rent_income: 12000,
        expense_mortgage_interest: 2000,
        expense_taxes: 1000,
        form_1099_payments_made: false,
        street_address: "12 Main Street",
        city: "Austin",
        state: "TX",
        zip: "78701",
      },
      {
        tsj: "T",
        property_description: "Mineral royalties",
        property_type: 6,
        activity_type: "B",
        fair_rental_days: 0,
        personal_use_days: 0,
        rent_income: 0,
        royalties_income: 4000,
        form_1099_payments_made: false,
      },
    ],
  });
  assertEquals(result.diagnostics, []);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(
    xml,
    "<TotAllPaymentsAllRentalPropAmt>12000</TotAllPaymentsAllRentalPropAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotAllPaymentsAllRyltyPropAmt>4000</TotAllPaymentsAllRyltyPropAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalIncomeOrLossAmt>13000</TotalIncomeOrLossAmt>",
  );
  await validateXsd(xml, "Schedule E rental and royalty properties");
});

Deno.test({
  name: "XSD: Schedule E nonpassive rental loss validates",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    schedule_e: [{
      tsj: "T",
      property_description: "Rental property",
      property_type: 1,
      activity_type: "C",
      fair_rental_days: 365,
      personal_use_days: 0,
      rent_income: 1000,
      expense_taxes: 2000,
      form_1099_payments_made: false,
      street_address: "12 Main Street",
      city: "Austin",
      state: "TX",
      zip: "78701",
    }],
  });
  assertEquals(result.diagnostics, []);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(
    xml,
    "<DedRentalRealEstateLossAmt>1000</DedRentalRealEstateLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<RecnclForREProfessionalsAmt>-1000</RecnclForREProfessionalsAmt>",
  );
  assertStringIncludes(
    xml,
    "<AdjustedGrossIncomeAmt>-1000</AdjustedGrossIncomeAmt>",
  );
  assertStringIncludes(xml, "<TaxableIncomeAmt>0</TaxableIncomeAmt>");
  await validateXsd(xml, "Schedule E nonpassive rental loss");
});

Deno.test({
  name:
    "XSD: fully allowed active rental loss links Schedule E, Form 8582 and Schedule 1",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    schedule_e: [{
      tsj: "T",
      property_description: "Rental house",
      property_type: 1,
      activity_type: "A",
      fair_rental_days: 365,
      personal_use_days: 0,
      rent_income: 1_000,
      expense_taxes: 2_000,
      form_1099_payments_made: false,
      street_address: "12 Main Street",
      city: "Austin",
      state: "TX",
      zip: "78701",
    }],
  });
  assertEquals(result.diagnostics, []);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(
    xml,
    "<DedRentalRealEstateLossAmt>1000</DedRentalRealEstateLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<AllowedRentalRealtyLossAmt>1000</AllowedRentalRealtyLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<RentalRealEstateIncomeLossAmt>-1000</RentalRealEstateIncomeLossAmt>",
  );
  await validateXsd(xml, "active rental Form 8582 and Schedule E");
});

Deno.test({
  name:
    "XSD: two fully allowed rental losses retain separate Form 8582 worksheet rows",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const base = {
    tsj: "T",
    property_type: 1,
    activity_type: "A",
    fair_rental_days: 365,
    personal_use_days: 0,
    rent_income: 1_000,
    form_1099_payments_made: false,
    city: "Austin",
    state: "TX",
    zip: "78701",
  };
  const result = runReturn({
    general,
    schedule_e: [
      {
        ...base,
        property_description: "First house",
        street_address: "1 Main St",
        expense_taxes: 2_000,
      },
      {
        ...base,
        property_description: "Second house",
        street_address: "2 Main St",
        expense_taxes: 3_000,
      },
    ],
  });
  assertEquals(result.diagnostics, []);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(xml, "<RentalRealtyLossAmt>3000</RentalRealtyLossAmt>");
  assertStringIncludes(
    xml,
    "<RentalRealEstateIncomeLossAmt>-3000</RentalRealEstateIncomeLossAmt>",
  );
  assertEquals(xml.match(/<WrkshtRentalActGrp>/g)?.length, 2);
  await validateXsd(xml, "two active rentals Form 8582");
});

Deno.test({
  name:
    "XSD: phased-out rental loss reports only the allowed amount on Schedule E",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    w2: [w2Item(140_000, 20_000)],
    schedule_e: [{
      tsj: "T",
      property_description: "Rental house",
      property_type: 1,
      activity_type: "A",
      fair_rental_days: 365,
      personal_use_days: 0,
      rent_income: 10_000,
      expense_taxes: 18_000,
      form_1099_payments_made: false,
      street_address: "12 Main Street",
      city: "Austin",
      state: "TX",
      zip: "78701",
    }],
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.carryforwards.suspended_pal_8582, 3_000);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(
    xml,
    "<DedRentalRealEstateLossAmt>5000</DedRentalRealEstateLossAmt>",
  );
  assertStringIncludes(xml, "<LossesAmt>5000</LossesAmt>");
  assertStringIncludes(
    xml,
    "<AllowedRentalRealtyLossAmt>5000</AllowedRentalRealtyLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalUnallowedLossAmt>3000</TotalUnallowedLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<RentalRealEstateIncomeLossAmt>-5000</RentalRealEstateIncomeLossAmt>",
  );
  await validateXsd(xml, "phased-out active rental Form 8582");
});

Deno.test({
  name: "XSD: rental loss with no special allowance is suspended in full",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    w2: [w2Item(150_000, 20_000)],
    schedule_e: [{
      tsj: "T",
      property_description: "Rental house",
      property_type: 1,
      activity_type: "A",
      fair_rental_days: 365,
      personal_use_days: 0,
      rent_income: 10_000,
      expense_taxes: 18_000,
      form_1099_payments_made: false,
      street_address: "12 Main Street",
      city: "Austin",
      state: "TX",
      zip: "78701",
    }],
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.carryforwards.suspended_pal_8582, 8_000);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertEquals(xml.includes("<DedRentalRealEstateLossAmt>"), false);
  assertStringIncludes(xml, "<TotalIncomeOrLossAmt>0</TotalIncomeOrLossAmt>");
  assertStringIncludes(
    xml,
    "<TotalUnallowedLossAmt>8000</TotalUnallowedLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<AdjustedGrossIncomeAmt>150000</AdjustedGrossIncomeAmt>",
  );
  await validateXsd(xml, "fully suspended active rental Form 8582");
});

Deno.test({
  name:
    "XSD: two rental losses split the special allowance and suspended carryforward",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const base = {
    tsj: "T",
    property_type: 1,
    activity_type: "A",
    fair_rental_days: 365,
    personal_use_days: 0,
    rent_income: 10_000,
    form_1099_payments_made: false,
    city: "Austin",
    state: "TX",
    zip: "78701",
  };
  const result = runReturn({
    general,
    w2: [w2Item(80_000, 10_000)],
    schedule_e: [
      {
        ...base,
        property_description: "First house",
        street_address: "1 Main St",
        expense_taxes: 20_000,
      },
      {
        ...base,
        property_description: "Second house",
        street_address: "2 Main St",
        expense_taxes: 30_000,
      },
    ],
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.carryforwards.suspended_pal_8582, 5_000);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(
    xml,
    "<DedRentalRealEstateLossAmt>8333</DedRentalRealEstateLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<DedRentalRealEstateLossAmt>16667</DedRentalRealEstateLossAmt>",
  );
  assertStringIncludes(xml, "<LossesAmt>25000</LossesAmt>");
  assertStringIncludes(
    xml,
    "<TotalUnallowedLossAmt>5000</TotalUnallowedLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<RentalRealEstateIncomeLossAmt>-25000</RentalRealEstateIncomeLossAmt>",
  );
  await validateXsd(xml, "two partially allowed active rentals Form 8582");
});

Deno.test({
  name:
    "XSD: prior active rental operating loss reaches Form 8582 and Schedule E",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    w2: [w2Item(50_000, 8_000)],
    schedule_e: [{
      tsj: "T",
      property_description: "Rental house",
      property_type: 1,
      activity_type: "A",
      fair_rental_days: 365,
      personal_use_days: 0,
      rent_income: 10_000,
      expense_taxes: 18_000,
      prior_unallowed_passive_operating: 3_000,
      prior_passive_losses_active_when_incurred: true,
      form_1099_payments_made: false,
      street_address: "12 Main Street",
      city: "Austin",
      state: "TX",
      zip: "78701",
    }],
  });
  assertEquals(result.diagnostics, []);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(
    xml,
    "<PYUnallowedRentalLossAmt>3000</PYUnallowedRentalLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<DedRentalRealEstateLossAmt>11000</DedRentalRealEstateLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<RentalRealEstateIncomeLossAmt>-11000</RentalRealEstateIncomeLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<AdjustedGrossIncomeAmt>39000</AdjustedGrossIncomeAmt>",
  );
  await validateXsd(xml, "prior active rental operating loss");
});

Deno.test({
  name: "XSD: prior-only active rental loss is phased out and carried forward",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    w2: [w2Item(140_000, 20_000)],
    schedule_e: [{
      tsj: "T",
      property_description: "Rental house",
      property_type: 1,
      activity_type: "A",
      fair_rental_days: 365,
      personal_use_days: 0,
      rent_income: 10_000,
      expense_taxes: 10_000,
      prior_unallowed_passive_operating: 8_000,
      prior_passive_losses_active_when_incurred: true,
      form_1099_payments_made: false,
      street_address: "12 Main Street",
      city: "Austin",
      state: "TX",
      zip: "78701",
    }],
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.carryforwards.suspended_pal_8582, 3_000);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(
    xml,
    "<PYUnallowedRentalLossAmt>8000</PYUnallowedRentalLossAmt>",
  );
  assertEquals(xml.includes("<RentalRealtyLossAmt>"), false);
  assertStringIncludes(
    xml,
    "<DedRentalRealEstateLossAmt>5000</DedRentalRealEstateLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalUnallowedLossAmt>3000</TotalUnallowedLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<AdjustedGrossIncomeAmt>135000</AdjustedGrossIncomeAmt>",
  );
  await validateXsd(xml, "prior-only active rental carryover");
});

Deno.test({
  name:
    "XSD: current rental profit offsets prior loss before the special allowance",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    w2: [w2Item(135_000, 20_000)],
    schedule_e: [{
      tsj: "T",
      property_description: "Rental house",
      property_type: 1,
      activity_type: "A",
      fair_rental_days: 365,
      personal_use_days: 0,
      rent_income: 10_000,
      expense_taxes: 5_000,
      prior_unallowed_passive_operating: 20_000,
      prior_passive_losses_active_when_incurred: true,
      form_1099_payments_made: false,
      street_address: "12 Main Street",
      city: "Austin",
      state: "TX",
      zip: "78701",
    }],
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.carryforwards.suspended_pal_8582, 10_000);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(
    xml,
    "<RentalRealtyIncomeAmt>5000</RentalRealtyIncomeAmt>",
  );
  assertStringIncludes(
    xml,
    "<AllowedRentalRealtyLossAmt>5000</AllowedRentalRealtyLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalLossesAllowedAmt>10000</TotalLossesAllowedAmt>",
  );
  assertStringIncludes(
    xml,
    "<DedRentalRealEstateLossAmt>10000</DedRentalRealEstateLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalUnallowedLossAmt>10000</TotalUnallowedLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<AdjustedGrossIncomeAmt>130000</AdjustedGrossIncomeAmt>",
  );
  await validateXsd(xml, "rental profit and prior suspended loss");
});

Deno.test({
  name:
    "XSD: profitable rental releases another rental's loss before phase-out",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const base = {
    tsj: "T",
    property_type: 1,
    activity_type: "A",
    fair_rental_days: 365,
    personal_use_days: 0,
    form_1099_payments_made: false,
    city: "Austin",
    state: "TX",
    zip: "78701",
  };
  const result = runReturn({
    general,
    w2: [w2Item(130_000, 20_000)],
    schedule_e: [
      {
        ...base,
        property_description: "Profit house",
        street_address: "1 Main Street",
        rent_income: 10_000,
      },
      {
        ...base,
        property_description: "Loss house",
        street_address: "2 Main Street",
        rent_income: 0,
        expense_taxes: 20_000,
      },
    ],
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.carryforwards.suspended_pal_8582, 5_000);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(
    xml,
    "<RentalRealtyIncomeAmt>10000</RentalRealtyIncomeAmt>",
  );
  assertStringIncludes(xml, "<RentalRealtyLossAmt>20000</RentalRealtyLossAmt>");
  assertStringIncludes(
    xml,
    "<AllowedRentalRealtyLossAmt>5000</AllowedRentalRealtyLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalLossesAllowedAmt>15000</TotalLossesAllowedAmt>",
  );
  assertStringIncludes(
    xml,
    "<DedRentalRealEstateLossAmt>15000</DedRentalRealEstateLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalUnallowedLossAmt>5000</TotalUnallowedLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<AdjustedGrossIncomeAmt>125000</AdjustedGrossIncomeAmt>",
  );
  await validateXsd(xml, "two active rentals with profit and loss");
});

Deno.test({
  name: "XSD: rental overall gain releases prior loss without Part II",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    w2: [w2Item(135_000, 20_000)],
    schedule_e: [{
      tsj: "T",
      property_description: "Rental house",
      property_type: 1,
      activity_type: "A",
      fair_rental_days: 365,
      personal_use_days: 0,
      rent_income: 10_000,
      prior_unallowed_passive_operating: 8_000,
      prior_passive_losses_active_when_incurred: true,
      form_1099_payments_made: false,
      street_address: "12 Main Street",
      city: "Austin",
      state: "TX",
      zip: "78701",
    }],
  });
  assertEquals(result.diagnostics, []);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(xml, "<NetRentalRealtyAmt>2000</NetRentalRealtyAmt>");
  assertEquals(xml.includes("<RentalRealtyLossLimitAmt>"), false);
  assertStringIncludes(
    xml,
    "<DedRentalRealEstateLossAmt>8000</DedRentalRealEstateLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<AdjustedGrossIncomeAmt>137000</AdjustedGrossIncomeAmt>",
  );
  await validateXsd(xml, "rental overall gain with prior loss");
});

Deno.test({
  name: "XSD: other passive rental loss is suspended without special allowance",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    w2: [w2Item(50_000, 8_000)],
    schedule_e: [{
      tsj: "T",
      property_description: "Passive rental",
      property_type: 1,
      activity_type: "B",
      fair_rental_days: 365,
      personal_use_days: 0,
      rent_income: 10_000,
      expense_taxes: 20_000,
      form_1099_payments_made: false,
      street_address: "12 Main Street",
      city: "Austin",
      state: "TX",
      zip: "78701",
    }],
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.carryforwards.suspended_pal_8582, 10_000);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(
    xml,
    "<OtherActivityLossAmt>10000</OtherActivityLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalUnallowedLossAmt>10000</TotalUnallowedLossAmt>",
  );
  assertEquals(xml.includes("<AllowedRentalRealtyLossAmt>"), false);
  assertEquals(xml.includes("<DedRentalRealEstateLossAmt>"), false);
  assertStringIncludes(
    xml,
    "<AdjustedGrossIncomeAmt>50000</AdjustedGrossIncomeAmt>",
  );
  await validateXsd(xml, "other passive rental suspended loss");
});

Deno.test({
  name:
    "XSD: mixed active and other passive rentals allocate only active special allowance",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const base = {
    tsj: "T",
    property_type: 1,
    fair_rental_days: 365,
    personal_use_days: 0,
    form_1099_payments_made: false,
    city: "Austin",
    state: "TX",
    zip: "78701",
    rent_income: 10_000,
    expense_taxes: 20_000,
  };
  const result = runReturn({
    general,
    w2: [w2Item(50_000, 8_000)],
    schedule_e: [
      {
        ...base,
        property_description: "Active rental",
        activity_type: "A",
        street_address: "1 Main Street",
      },
      {
        ...base,
        property_description: "Other rental",
        activity_type: "B",
        street_address: "2 Main Street",
      },
    ],
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.carryforwards.suspended_pal_8582, 10_000);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(xml, "<RentalRealtyLossAmt>10000</RentalRealtyLossAmt>");
  assertStringIncludes(
    xml,
    "<OtherActivityLossAmt>10000</OtherActivityLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<AllowedRentalRealtyLossAmt>10000</AllowedRentalRealtyLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalUnallowedLossAmt>10000</TotalUnallowedLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<DedRentalRealEstateLossAmt>10000</DedRentalRealEstateLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<AdjustedGrossIncomeAmt>40000</AdjustedGrossIncomeAmt>",
  );
  await validateXsd(xml, "mixed active and other passive rental losses");
});

Deno.test({
  name:
    "XSD: mixed passive income and phased allowance share remaining suspended losses",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const base = {
    tsj: "T",
    property_type: 1,
    fair_rental_days: 365,
    personal_use_days: 0,
    form_1099_payments_made: false,
    city: "Austin",
    state: "TX",
    zip: "78701",
  };
  const result = runReturn({
    general,
    w2: [w2Item(110_000, 20_000)],
    schedule_e: [
      {
        ...base,
        property_description: "Active loss",
        activity_type: "A",
        street_address: "1 Main Street",
        rent_income: 10_000,
        expense_taxes: 40_000,
      },
      {
        ...base,
        property_description: "Other loss",
        activity_type: "B",
        street_address: "2 Main Street",
        rent_income: 10_000,
        expense_taxes: 30_000,
      },
      {
        ...base,
        property_description: "Other profit",
        activity_type: "B",
        street_address: "3 Main Street",
        rent_income: 10_000,
      },
    ],
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.carryforwards.suspended_pal_8582, 25_000);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(
    xml,
    "<OtherActivityIncomeAmt>10000</OtherActivityIncomeAmt>",
  );
  assertStringIncludes(
    xml,
    "<AllowedRentalRealtyLossAmt>15000</AllowedRentalRealtyLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalLossesAllowedAmt>25000</TotalLossesAllowedAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalUnallowedLossAmt>25000</TotalUnallowedLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<AdjustedGrossIncomeAmt>95000</AdjustedGrossIncomeAmt>",
  );
  await validateXsd(xml, "mixed passive income and phased allowance");
});

Deno.test({
  name: "XSD: other passive profit releases current and prior rental losses",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const base = {
    tsj: "T",
    property_type: 1,
    activity_type: "B",
    fair_rental_days: 365,
    personal_use_days: 0,
    form_1099_payments_made: false,
    city: "Austin",
    state: "TX",
    zip: "78701",
  };
  const result = runReturn({
    general,
    w2: [w2Item(50_000, 8_000)],
    schedule_e: [
      {
        ...base,
        property_description: "Profit rental",
        street_address: "1 Main Street",
        rent_income: 6_000,
      },
      {
        ...base,
        property_description: "Loss rental",
        street_address: "2 Main Street",
        rent_income: 10_000,
        expense_taxes: 20_000,
        prior_unallowed_passive_operating: 2_000,
      },
    ],
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.carryforwards.suspended_pal_8582, 6_000);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(
    xml,
    "<OtherActivityIncomeAmt>6000</OtherActivityIncomeAmt>",
  );
  assertStringIncludes(
    xml,
    "<PriorYearUnallowedOtherLossAmt>2000</PriorYearUnallowedOtherLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalLossesAllowedAmt>6000</TotalLossesAllowedAmt>",
  );
  assertStringIncludes(
    xml,
    "<DedRentalRealEstateLossAmt>6000</DedRentalRealEstateLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalUnallowedLossAmt>6000</TotalUnallowedLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<AdjustedGrossIncomeAmt>50000</AdjustedGrossIncomeAmt>",
  );
  await validateXsd(xml, "other passive profit and prior operating loss");
});

Deno.test({
  name:
    "XSD: other passive overall gain releases prior loss without allocation",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    w2: [w2Item(50_000, 8_000)],
    schedule_e: [{
      tsj: "T",
      property_description: "Passive rental",
      property_type: 1,
      activity_type: "B",
      fair_rental_days: 365,
      personal_use_days: 0,
      rent_income: 10_000,
      prior_unallowed_passive_operating: 8_000,
      form_1099_payments_made: false,
      street_address: "12 Main Street",
      city: "Austin",
      state: "TX",
      zip: "78701",
    }],
  });
  assertEquals(result.diagnostics, []);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(xml, "<NetOtherActivityAmt>2000</NetOtherActivityAmt>");
  assertStringIncludes(
    xml,
    "<DedRentalRealEstateLossAmt>8000</DedRentalRealEstateLossAmt>",
  );
  assertEquals(xml.includes("<ParentWrkshtLossGrp>"), false);
  assertStringIncludes(
    xml,
    "<AdjustedGrossIncomeAmt>52000</AdjustedGrossIncomeAmt>",
  );
  await validateXsd(xml, "other passive overall gain and prior loss");
});

Deno.test({
  name:
    "XSD: prior rental loss without past active participation stays in Part V",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    w2: [w2Item(50_000, 8_000)],
    schedule_e: [{
      tsj: "T",
      property_description: "Rental house",
      property_type: 1,
      activity_type: "A",
      fair_rental_days: 365,
      personal_use_days: 0,
      rent_income: 10_000,
      expense_taxes: 10_000,
      prior_unallowed_passive_operating: 8_000,
      prior_passive_losses_active_when_incurred: false,
      form_1099_payments_made: false,
      street_address: "12 Main Street",
      city: "Austin",
      state: "TX",
      zip: "78701",
    }],
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.carryforwards.suspended_pal_8582, 8_000);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(
    xml,
    "<PriorYearUnallowedOtherLossAmt>8000</PriorYearUnallowedOtherLossAmt>",
  );
  assertEquals(xml.includes("<PYUnallowedRentalLossAmt>"), false);
  assertEquals(xml.includes("<AllowedRentalRealtyLossAmt>"), false);
  assertStringIncludes(
    xml,
    "<TotalUnallowedLossAmt>8000</TotalUnallowedLossAmt>",
  );
  await validateXsd(xml, "prior nonactive rental loss Part V");
});

Deno.test({
  name: "XSD: return-level PDF BinaryAttachment validates",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const pdf = await PDFDocument.create();
  pdf.addPage([612, 792]);
  const bundle = await buildMefBundle({}, {
    filer: extractFilerIdentity(singleGeneral()),
    attachments: [{
      fileName: "AdditionalQMIDStatement.pdf",
      description: "Additional QMID Statement",
      bytes: await pdf.save(),
    }],
  });
  assertStringIncludes(bundle.xml, 'binaryAttachmentCnt="1"');
  await validateXsd(bundle.xml, "PDF BinaryAttachment");
});

Deno.test({
  name: "XSD: Form 5695 door and window overflow includes its QMID PDF",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const filer = extractFilerIdentity(general);
  const result = runReturn({
    general,
    f5695: {
      part_ii_section_a: {
        main_home_in_us: true,
        original_user: true,
        five_year_use: true,
        home_address: {
          line1: "123 Main Street",
          city: "Austin",
          state: "TX",
          zip: "78701",
        },
        related_to_new_home: false,
        exterior_doors: [
          { cost: 1_000, qmid: "A1B2" },
          { cost: 900, qmid: "C3D4" },
          { cost: 800, qmid: "E5F6" },
          { cost: 700, qmid: "G7H8" },
        ],
        windows: [
          { cost: 500, qmid: "J9K0" },
          { cost: 400, qmid: "L1M2" },
          { cost: 300, qmid: "N3P4" },
          { cost: 200, qmid: "R5S6" },
          { cost: 100, qmid: "T7U8" },
        ],
      },
      part_ii_tax_limit: 1_000,
    },
  });
  const bundle = await buildMefBundle(result.pending as MefFormsPending, {
    filer,
    attachments: [],
  });
  assertEquals(bundle.attachments.length, 1);
  assertStringIncludes(
    bundle.xml,
    "<OtherQlfyExtrDoorsCostAmt>700</OtherQlfyExtrDoorsCostAmt>",
  );
  assertStringIncludes(
    bundle.xml,
    "<OthQlfyExtrWndwSkyltCostAmt>100</OthQlfyExtrWndwSkyltCostAmt>",
  );
  await validateXsd(bundle.xml, "Form 5695 QMID overflow bundle");
});

Deno.test({
  name: "XSD: Form 5695 Section B overflow includes its QMID PDF",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const filer = extractFilerIdentity(general);
  const result = runReturn({
    general,
    f5695: {
      part_ii_section_b: {
        home_in_us: true,
        originally_placed_in_service: true,
        home_addresses: [{
          line1: "123 Main Street",
          city: "Austin",
          state: "TX",
          zip: "78701",
        }],
        central_air_conditioner: { cost: 700, qmid: "A1B2" },
        other_central_air_conditioners: [{ cost: 2_000, qmid: "C3D4" }],
        water_heaters: [
          { cost: 1_000, qmid: "E5F6" },
          { cost: 900, qmid: "G7H8" },
          { cost: 1_200, qmid: "J9K0" },
        ],
        furnace_or_boiler: { cost: 800, qmid: "L1M2" },
        other_furnaces_or_boilers: [{ cost: 1_500, qmid: "N3P4" }],
        heat_pump: { cost: 1_000, qmid: "R5S6" },
        other_heat_pumps: [{ cost: 1_200, qmid: "T7U8" }],
        heat_pump_water_heater: { cost: 900, qmid: "V9W0" },
        other_heat_pump_water_heaters: [{ cost: 1_100, qmid: "X1Y2" }],
        biomass_stove_or_boiler: { cost: 700, qmid: "Z3A4" },
        other_biomass_stoves_or_boilers: [{ cost: 1_300, qmid: "B5C6" }],
      },
      part_ii_tax_limit: 5_000,
    },
  });
  const bundle = await buildMefBundle(result.pending as MefFormsPending, {
    filer,
    attachments: [],
  });
  assertEquals(bundle.attachments.length, 1);
  assertStringIncludes(bundle.xml, 'binaryAttachmentCnt="1"');
  await validateXsd(bundle.xml, "Form 5695 Section B QMID overflow bundle");
});

Deno.test({
  name:
    "XSD: Form 5695 joint Section B overflow links PDF and allocation statement",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    f5695: {
      part_ii_joint_occupancy: true,
      part_ii_section_b: {
        home_in_us: true,
        originally_placed_in_service: true,
        home_addresses: [{
          line1: "1 Test Way",
          city: "Austin",
          state: "TX",
          zip: "78701",
        }],
        central_air_conditioner: {
          cost: 1_000,
          qmid: "A1B2",
          joint_total_paid: 2_000,
        },
        other_central_air_conditioners: [
          { cost: 1_000, qmid: "C3D4", joint_total_paid: 2_000 },
          { cost: 1_000, qmid: "E5F6", joint_total_paid: 2_000 },
        ],
      },
      part_ii_tax_limit: 10_000,
    },
  });
  const bundle = await buildMefBundle(result.pending as MefFormsPending, {
    filer: extractFilerIdentity(general),
    attachments: [],
  });
  assertEquals(bundle.attachments.length, 1);
  assertStringIncludes(bundle.xml, 'binaryAttachmentCnt="1"');
  assertStringIncludes(
    bundle.xml,
    "<CentralAirCondCostStdPctCrAmt>600</CentralAirCondCostStdPctCrAmt>",
  );
  assertStringIncludes(
    bundle.xml,
    'referenceDocumentName="JointOccupancyStatement"',
  );
  await validateXsd(bundle.xml, "Form 5695 joint Section B overflow bundle");
});

Deno.test({
  name: "XSD: Form 5695 joint-occupancy supporting document validates",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const xml = buildMefXml({
    form5695: {
      fuel_cell_cost: 12_000,
      fuel_cell_kw_capacity: 5,
      fuel_cell_home_in_us: true,
      fuel_cell_home_address: {
        line1: "17 Lexington Drive",
        city: "Cincinnati",
        state: "OH",
        zip: "45223",
      },
      fuel_cell_joint_occupancy: true,
      fuel_cell_total_joint_occupants_paid: 20_000,
      part_i_tax_limit: 10_000,
    },
    joint_occupancy_statement: {
      statements: [{
        fuel_cell_properties: [{
          kw_capacity: 5,
          paid: 12_000,
          total_joint_occupants_paid: 20_000,
        }],
      }],
    },
  }, extractFilerIdentity(singleGeneral()));
  assertStringIncludes(xml, 'documentCnt="3"');
  assertStringIncludes(xml, "<FuelCellPropCostAmt>10002</FuelCellPropCostAmt>");
  assertStringIncludes(
    xml,
    'referenceDocumentId="JointOccupancyStatement2" referenceDocumentName="JointOccupancyStatement"',
  );
  assertStringIncludes(
    xml,
    '<JointOccupancyStatement documentId="JointOccupancyStatement2">',
  );
  await validateXsd(xml, "Form 5695 joint occupancy statement");
});

Deno.test({
  name:
    "XSD: joint fuel cell routes from f5695 input through linked MeF documents",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    f5695: {
      fuel_cell_cost: 12_000,
      fuel_cell_kw_capacity: 5,
      fuel_cell_home_in_us: true,
      fuel_cell_home_address: {
        line1: "1 Test Way",
        city: "Austin",
        state: "TX",
        zip: "78701",
      },
      fuel_cell_joint_occupancy: true,
      fuel_cell_total_joint_occupants_paid: 20_000,
      part_i_tax_limit: 10_000,
    },
  });
  assertEquals(result.diagnostics, []);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(xml, "<FuelCellPropCostAmt>10002</FuelCellPropCostAmt>");
  assertStringIncludes(
    xml,
    "<ResidentialCleanEnergyCrAmt>3001</ResidentialCleanEnergyCrAmt>",
  );
  const statementId = /<JointOccupancyStatement documentId="([^"]+)"/.exec(xml)
    ?.[1];
  assertEquals(typeof statementId, "string");
  assertStringIncludes(xml, `referenceDocumentId="${statementId}"`);
  await validateXsd(xml, "Form 5695 joint fuel cell input to MeF");
});

Deno.test({
  name: "XSD: Part II joint occupancy routes shared property and annual limits",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const home = {
    line1: "1 Test Way",
    city: "Austin",
    state: "TX",
    zip: "78701",
  };
  const result = runReturn({
    general,
    f5695: {
      part_ii_joint_occupancy: true,
      part_ii_section_a: {
        main_home_in_us: true,
        original_user: true,
        five_year_use: true,
        home_address: home,
        related_to_new_home: false,
        insulation_cost: 2_000,
        insulation_joint_total_paid: 4_000,
        exterior_doors: [
          { cost: 1_000, qmid: "A1B2", joint_total_paid: 2_000 },
          { cost: 1_000, qmid: "C3D4", joint_total_paid: 2_000 },
        ],
        windows: [{ cost: 2_000, qmid: "E5F6", joint_total_paid: 4_000 }],
      },
      part_ii_section_b: {
        home_in_us: true,
        originally_placed_in_service: true,
        home_addresses: [home],
        central_air_conditioner: {
          cost: 2_000,
          qmid: "G7H8",
          joint_total_paid: 4_000,
        },
        heat_pump: {
          cost: 5_000,
          qmid: "I9J0",
          joint_total_paid: 10_000,
        },
      },
      part_ii_tax_limit: 10_000,
    },
  });
  assertEquals(result.diagnostics, []);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(
    xml,
    "<EnergyEffcntImprvAllwblCostAmt>600</EnergyEffcntImprvAllwblCostAmt>",
  );
  assertStringIncludes(
    xml,
    "<HtPumpWtrHeaterBmssStdPctCrAmt>1000</HtPumpWtrHeaterBmssStdPctCrAmt>",
  );
  assertStringIncludes(
    xml,
    "<EgyEffcntHmImprvCrAmt>1600</EgyEffcntHmImprvCrAmt>",
  );
  const statementId = /<JointOccupancyStatement documentId="([^"]+)"/.exec(xml)
    ?.[1];
  assertEquals(typeof statementId, "string");
  assertStringIncludes(xml, `referenceDocumentId="${statementId}"`);
  await validateXsd(xml, "Form 5695 Part II joint occupancy");
});

Deno.test({
  name: "XSD: one joint statement supports both Form 5695 credit parts",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const home = {
    line1: "1 Test Way",
    city: "Austin",
    state: "TX",
    zip: "78701",
  };
  const result = runReturn({
    general,
    f5695: {
      fuel_cell_cost: 12_000,
      fuel_cell_kw_capacity: 5,
      fuel_cell_home_in_us: true,
      fuel_cell_home_address: home,
      fuel_cell_joint_occupancy: true,
      fuel_cell_total_joint_occupants_paid: 20_000,
      part_i_tax_limit: 10_000,
      part_ii_joint_occupancy: true,
      part_ii_section_b: {
        home_in_us: true,
        originally_placed_in_service: true,
        home_addresses: [home],
        central_air_conditioner: {
          cost: 2_000,
          qmid: "A1B2",
          joint_total_paid: 4_000,
        },
      },
      part_ii_tax_limit: 10_000,
    },
  });
  assertEquals(result.diagnostics, []);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  const statementId = /<JointOccupancyStatement documentId="([^"]+)"/.exec(xml)
    ?.[1];
  assertEquals(typeof statementId, "string");
  assertEquals(
    (xml.match(/<JointOccupancyStatement documentId=/g) ?? []).length,
    1,
  );
  assertEquals(
    (xml.match(new RegExp(`referenceDocumentId="${statementId}"`, "g")) ?? [])
      .length,
    2,
  );
  await validateXsd(xml, "Form 5695 both joint-occupancy parts");
});

Deno.test({
  name: "XSD: Form 5695 Part I clean-energy claim validates",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const xml = buildMefXml({
    form5695: {
      part_i_home_address: {
        line1: "17 Lexington Drive",
        city: "Cincinnati",
        state: "OH",
        zip: "45223",
      },
      solar_electric_cost: 10_000,
      battery_storage_cost: 2_000,
      battery_storage_kwh_capacity: 3,
      prior_year_carryforward: 100,
      part_i_tax_limit: 2_000,
    },
  }, extractFilerIdentity(singleGeneral()));
  assertStringIncludes(xml, "<ResidentialCleanEnergyCrGrp>");
  await validateXsd(xml, "Form 5695 Part I");
});

Deno.test({
  name: "XSD: Form 5695 fuel-cell half-kW claim validates",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const xml = buildMefXml({
    form5695: {
      fuel_cell_cost: 3_000,
      fuel_cell_kw_capacity: 0.5,
      fuel_cell_home_in_us: true,
      fuel_cell_home_address: {
        line1: "17 Lexington Drive",
        city: "Cincinnati",
        state: "OH",
        zip: "45223",
      },
      fuel_cell_joint_occupancy: false,
      part_i_tax_limit: 1_000,
    },
  }, extractFilerIdentity(singleGeneral()));
  assertStringIncludes(xml, "<FuelCellPropKWCapNum>0.5</FuelCellPropKWCapNum>");
  await validateXsd(xml, "Form 5695 fuel-cell");
});

Deno.test({
  name: "XSD: Form 5695 itemized Part II Section A validates",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const xml = buildMefXml({
    form5695: {
      part_ii_section_a: {
        main_home_in_us: true,
        original_user: true,
        five_year_use: true,
        home_address: {
          line1: "1 Test Way",
          city: "Austin",
          state: "TX",
          zip: "78701",
        },
        related_to_new_home: false,
        insulation_cost: 400,
        exterior_doors: [
          { cost: 10, qmid: "C3D4" },
          { cost: 5_000, qmid: "A1B2" },
        ],
        windows: [{ cost: 600, qmid: "E5F6" }],
      },
      part_ii_tax_limit: 1_000,
    },
  }, extractFilerIdentity(singleGeneral()));
  assertStringIncludes(
    xml,
    "<TotalExtrDoorsCreditAmt>253</TotalExtrDoorsCreditAmt>",
  );
  await validateXsd(xml, "Form 5695 Part II Section A");
});

Deno.test({
  name: "XSD: Form 5695 itemized Section A survives input to MeF execution",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    f5695: {
      part_ii_section_a: {
        main_home_in_us: true,
        original_user: true,
        five_year_use: true,
        home_address: {
          line1: "1 Test Way",
          city: "Austin",
          state: "TX",
          zip: "78701",
        },
        related_to_new_home: false,
        exterior_doors: [
          { cost: 10, qmid: "C3D4" },
          { cost: 5_000, qmid: "A1B2" },
        ],
      },
      part_ii_tax_limit: 1_000,
    },
  });
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(
    xml,
    "<TotalExtrDoorsCreditAmt>253</TotalExtrDoorsCreditAmt>",
  );
  await validateXsd(xml, "Form 5695 Section A executor path");
});

Deno.test({
  name: "XSD: Form 5695 itemized Section B validates",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const xml = buildMefXml({
    form5695: {
      part_ii_section_b: {
        home_in_us: true,
        originally_placed_in_service: true,
        home_addresses: [{
          line1: "1 Test Way",
          city: "Austin",
          state: "TX",
          zip: "78701",
        }],
        central_air_conditioner: { cost: 2_000, qmid: "A1B2" },
        water_heaters: [{ cost: 1_000, qmid: "C3D4" }],
        furnace_or_boiler: { cost: 2_000, qmid: "E5F6" },
        heat_pump: { cost: 2_000, qmid: "G7H8" },
        heat_pump_water_heater: { cost: 2_000, qmid: "J9K0" },
        biomass_stove_or_boiler: { cost: 2_000, qmid: "L1M2" },
      },
      part_ii_tax_limit: 3_500,
    },
  }, extractFilerIdentity(singleGeneral()));
  assertStringIncludes(
    xml,
    "<EgyEffcntHmImprvCrAmt>3000</EgyEffcntHmImprvCrAmt>",
  );
  await validateXsd(xml, "Form 5695 Part II Section B");
});

Deno.test({
  name: "XSD: Form 5695 combined Sections A and B survive execution",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const home = {
    line1: "1 Test Way",
    city: "Austin",
    state: "TX",
    zip: "78701",
  };
  const result = runReturn({
    general,
    f5695: {
      part_ii_section_a: {
        main_home_in_us: true,
        original_user: true,
        five_year_use: true,
        home_address: home,
        related_to_new_home: false,
        exterior_doors: [{ cost: 500, qmid: "A1B2" }],
      },
      part_ii_section_b: {
        home_in_us: true,
        originally_placed_in_service: true,
        home_addresses: [home],
        central_air_conditioner: { cost: 2_000, qmid: "C3D4" },
      },
      part_ii_tax_limit: 1_000,
    },
  });
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(
    xml,
    "<TotalExtrDoorsCreditAmt>150</TotalExtrDoorsCreditAmt>",
  );
  assertStringIncludes(
    xml,
    "<CentralAirCondCostStdPctCrAmt>600</CentralAirCondCostStdPctCrAmt>",
  );
  assertStringIncludes(
    xml,
    "<EgyEffcntHmImprvCrAmt>750</EgyEffcntHmImprvCrAmt>",
  );
  await validateXsd(xml, "Form 5695 combined Sections A and B");
});

Deno.test({
  name: "XSD: Form 5695 panelboard and audit survive execution",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const home = {
    line1: "1 Test Way",
    city: "Austin",
    state: "TX",
    zip: "78701",
  };
  const general = singleGeneral();
  const result = runReturn({
    general,
    f5695: {
      part_ii_section_b: {
        home_in_us: true,
        originally_placed_in_service: true,
        home_addresses: [home],
        central_air_conditioner: { cost: 1_000, qmid: "A1B2" },
        panelboard: {
          cost: 2_000,
          qmids: ["C3D4"],
          enabled_property_type_codes: ["B"],
          meets_200_amp_and_nec: true,
          enabled_property_qualified: true,
          enabling_installed_year: 2025,
          enabled_installed_year: 2025,
        },
      },
      part_ii_energy_audit: {
        cost: 600,
        main_home_in_us: true,
        written_report: true,
        certified_auditor: true,
      },
      part_ii_tax_limit: 2_000,
    },
  });
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(
    xml,
    "<EgyEffcntHmImprvCrAmt>1050</EgyEffcntHmImprvCrAmt>",
  );
  await validateXsd(xml, "Form 5695 panelboard and audit");
});

Deno.test({
  name:
    "XSD: Form 5695 audit-only claim validates without Section B property answers",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const xml = buildMefXml({
    form5695: {
      part_ii_energy_audit: {
        cost: 600,
        main_home_in_us: true,
        written_report: true,
        certified_auditor: true,
      },
      part_ii_tax_limit: 200,
    },
  }, extractFilerIdentity(singleGeneral()));
  assertStringIncludes(
    xml,
    "<MainHomeEgyAuditStdPctCrAmt>150</MainHomeEgyAuditStdPctCrAmt>",
  );
  assertEquals(xml.includes("QlfyEnergyPropCostsUSHomeInd"), false);
  await validateXsd(xml, "Form 5695 audit only");
});

function runReturn(inputs: Record<string, unknown>) {
  return execute(plan, registry, inputs, { taxYear: 2025, formType: "f1040" });
}

function singleGeneral() {
  return {
    filing_status: FilingStatus.Single,
    taxpayer_first_name: "Test",
    taxpayer_last_name: "Taxpayer",
    taxpayer_ssn: "111-22-3333",
    taxpayer_dob: "1985-06-15",
    address_line1: "1 Test Way",
    address_city: "Austin",
    address_state: "TX",
    address_zip: "78701",
  };
}

Deno.test({
  name: "XSD: ATS Scenario 1 Schedule H source slice validates",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const source = SCENARIO_1040_01_FACTS.scheduleH;
  const xml = buildMefXml(
    {
      schedule_h: {
        employer_ein: source.employerEin,
        cash_wages_over_2025_limit: source.cashWagesOver2025Limit,
        cash_wages_over_quarter_limit: source.cashWagesOverQuarterLimit,
        ss_wages: source.socialSecurityWages,
        medicare_wages: source.medicareWages,
        federal_income_tax_withheld: source.federalWithholding,
      },
    },
    extractFilerIdentity({
      ...singleGeneral(),
      taxpayer_first_name: SCENARIO_1040_01_FACTS.taxpayer.firstName,
      taxpayer_last_name: SCENARIO_1040_01_FACTS.taxpayer.lastName,
      taxpayer_ssn: SCENARIO_1040_01_FACTS.taxpayer.ssn,
    }),
  );
  assertStringIncludes(
    xml,
    "<HouseholdEmployerNm>Tara Black</HouseholdEmployerNm>",
  );
  assertStringIncludes(xml, "<EmployerEIN>000000029</EmployerEIN>");
  assertStringIncludes(
    xml,
    "<TotSocSecMedcrAndFedIncmTaxAmt>474</TotSocSecMedcrAndFedIncmTaxAmt>",
  );
  await validateXsd(xml, "Scenario 1 Schedule H");
});

Deno.test({
  name: "XSD: Schedule H single-state FUTA Section A validates",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const xml = buildMefXml({
    schedule_h: {
      employer_ein: "123456789",
      cash_wages_over_2025_limit: true,
      cash_wages_over_quarter_limit: true,
      ss_wages: 10_000,
      medicare_wages: 10_000,
      federal_unemployment: {
        paid_only_one_state: true,
        all_contributions_paid_on_time: true,
        all_futa_wages_state_taxable: true,
        state: "TX",
        contributions_paid: 100,
        taxable_wages: 7_000,
      },
    },
  }, extractFilerIdentity(singleGeneral()));
  assertStringIncludes(xml, "<FUTATaxAmt>42</FUTATaxAmt>");
  assertStringIncludes(
    xml,
    "<CombinedFUTATaxPlusNetTaxesAmt>1572</CombinedFUTATaxPlusNetTaxesAmt>",
  );
  await validateXsd(xml, "Schedule H Section A");
});

Deno.test({
  name: "XSD: Schedule H withholding-only branch validates",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const xml = buildMefXml({
    schedule_h: {
      employer_ein: "123456789",
      cash_wages_over_2025_limit: false,
      cash_wages_over_quarter_limit: false,
      federal_income_tax_withheld: 100,
    },
  }, extractFilerIdentity(singleGeneral()));
  assertStringIncludes(
    xml,
    "<HsldEmplFedIncmTaxWithheldInd>true</HsldEmplFedIncmTaxWithheldInd>",
  );
  assertStringIncludes(
    xml,
    "<CombinedFUTATaxPlusNetTaxesAmt>100</CombinedFUTATaxPlusNetTaxesAmt>",
  );
  await validateXsd(xml, "Schedule H withholding-only");
});

Deno.test({
  name: "XSD: Schedule H Section B with a credit reduction state validates",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const xml = buildMefXml({
    schedule_h: {
      employer_ein: "123456789",
      cash_wages_over_2025_limit: false,
      cash_wages_over_quarter_limit: true,
      federal_unemployment: {
        paid_only_one_state: false,
        all_contributions_paid_on_time: true,
        all_futa_wages_state_taxable: true,
        taxable_futa_wages: 7_000,
        state_rows: [{
          state: "CA",
          taxable_state_wages: 7_000,
          experience_rate: 0.05,
          rate_period_from: "2025-01-01",
          rate_period_to: "2025-12-31",
          contributions_paid_by_due_date: 350,
        }],
        credit_reduction_wages: [{ state: "CA", taxable_futa_wages: 7_000 }],
      },
    },
  }, extractFilerIdentity(singleGeneral()));
  assertStringIncludes(xml, "<UnemplFundMultiStateGroup>");
  await validateXsd(xml, "Schedule H Section B");
});

Deno.test({
  name: "XSD: Schedule H Section A with a zero experience rate validates",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const xml = buildMefXml({
    schedule_h: {
      employer_ein: "123456789",
      cash_wages_over_2025_limit: false,
      cash_wages_over_quarter_limit: true,
      federal_unemployment: {
        paid_only_one_state: true,
        all_contributions_paid_on_time: true,
        all_futa_wages_state_taxable: true,
        state: "OH",
        zero_experience_rate: true,
        taxable_wages: 7_000,
      },
    },
  }, extractFilerIdentity(singleGeneral()));
  assertStringIncludes(
    xml,
    "<UnemploymentFundZeroRateCd>0% RATE</UnemploymentFundZeroRateCd>",
  );
  await validateXsd(xml, "Schedule H Section A zero rate");
});

Deno.test({
  name: "XSD: Schedule H Additional Medicare Tax lines validate",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const xml = buildMefXml({
    schedule_h: {
      employer_ein: "123456789",
      cash_wages_over_2025_limit: true,
      cash_wages_over_quarter_limit: false,
      ss_wages: 176_100,
      medicare_wages: 220_000,
      additional_medicare_wages: 20_000,
    },
  }, extractFilerIdentity(singleGeneral()));
  assertStringIncludes(
    xml,
    "<AddnlMedicareTaxWithholdingAmt>180</AddnlMedicareTaxWithholdingAmt>",
  );
  await validateXsd(xml, "Schedule H Additional Medicare Tax");
});

/** Build a W-2 item, capping SS wages at the 2025 wage base. */
function w2Item(wages: number, withheld: number) {
  const ssWages = Math.min(wages, SS_WAGE_BASE_2025);
  return {
    box1_wages: wages,
    box2_fed_withheld: withheld,
    box3_ss_wages: ssWages,
    box4_ss_withheld: ssWages * 0.062,
    box5_medicare_wages: wages,
    box6_medicare_withheld: wages * 0.0145,
    employer_ein: "12-3456789",
    employer_name: "ACME Corp",
    employer_address_line1: "2 Payroll Road",
    employer_address_city: "Austin",
    employer_address_state: "TX",
    employer_address_zip: "78702",
    box12_entries: [],
  };
}

/**
 * Validates XML against the IRS Return1040.xsd via xmllint subprocess.
 * Writes to a temp file, runs xmllint --noout --schema, then cleans up.
 * Asserts exit code 0 — any schema violation surfaces as a test failure.
 */
async function validateXsd(xml: string, label: string): Promise<void> {
  const tmpPath = await Deno.makeTempFile({ suffix: ".xml" });
  await Deno.writeTextFile(tmpPath, xml);

  const cmd = new Deno.Command("xmllint", {
    args: ["--noout", "--schema", XSD_PATH, tmpPath],
    stdout: "piped",
    stderr: "piped",
  });
  const output = await cmd.output();

  const stderr = new TextDecoder().decode(output.stderr);
  await Deno.remove(tmpPath);

  assertEquals(
    output.code,
    0,
    `${label} XSD validation failed:\n${stderr}`,
  );
}

// ── Scenario 1: Single W-2 $75K ─────────────────────────────────────────────

Deno.test(
  {
    name: "XSD: ATS Scenario 2 Form 8283 Section A donation validates",
    sanitizeOps: false,
    sanitizeResources: false,
    ignore: !xsdAvailable,
  },
  async () => {
    const donation = SCENARIO_1040_02_FACTS.form8283;
    const xml = buildMefXml({
      f8283: {
        section_a_items: [{
          donee_organization_name: donation.donee,
          property_description: donation.propertyDescription,
          date_contributed: donation.donationDate,
          cost_or_adjusted_basis: donation.costBasis,
          fmv: donation.fairMarketValue,
        }],
      },
    }, extractFilerIdentity(singleGeneral()));
    assertStringIncludes(xml, "<FairMarketValueAmt>700</FairMarketValueAmt>");
    await validateXsd(xml, "ATS Scenario 2 Form 8283");
  },
);

Deno.test(
  {
    name:
      "XSD: ATS Scenario 13 Form 8911, its Schedule A, and Schedule 3 line 6j validate",
    sanitizeOps: false,
    sanitizeResources: false,
    ignore: !xsdAvailable,
  },
  async () => {
    const facts = SCENARIO_1040_13_FACTS;
    const xml = buildMefXml({
      schedule3: {
        line6j_alt_fuel_vehicle_refueling:
          facts.form8911.printedAllowedPersonalCredit,
      },
      f8911: {
        cost: facts.form8911ScheduleA.qualifiedCost,
        business_use_pct: facts.form8911ScheduleA.businessUsePercentage,
        property_description: facts.form8911ScheduleA.propertyDescription,
        property_us_address: facts.taxpayer.address,
        construction_began: facts.form8911ScheduleA.constructionBegan,
        placed_in_service: facts.form8911ScheduleA.placedInService,
        eligible_census_tract: facts.form8911ScheduleA.eligibleCensusTract,
        census_tract_geoid: facts.form8911ScheduleA.censusTractGeoid,
        main_home_property: facts.form8911ScheduleA.mainHomeProperty,
        regular_tax_before_credits:
          facts.form8911.printedRegularTaxBeforeCredits,
        tentative_minimum_tax: facts.form8911.printedTentativeMinimumTax,
      },
    }, extractFilerIdentity(singleGeneral()));
    assertStringIncludes(
      xml,
      "<TotalPersonalUsePartOfCrAmt>162</TotalPersonalUsePartOfCrAmt>",
    );
    assertStringIncludes(xml, "<IRS8911ScheduleA documentId=");
    await validateXsd(xml, "ATS Scenario 13 Form 8911");
  },
);

Deno.test(
  {
    name: "XSD: Single W-2 $75K validates against Return1040.xsd",
    sanitizeOps: false,
    sanitizeResources: false,
    ignore: !xsdAvailable,
  },
  async () => {
    const result = runReturn({
      general: singleGeneral(),
      w2: [w2Item(75_000, 11_000)],
    });
    const xml = buildMefXml(
      result.pending as MefFormsPending,
      extractFilerIdentity(singleGeneral()),
    );
    await validateXsd(xml, "Single W-2 $75K");
  },
);

// ── Scenario 2: Self-employed Schedule C $80K ───────────────────────────────

Deno.test({
  name:
    "XSD: separate Schedule C at-risk losses produce separate Form 6198 documents",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const base = {
    line_a_principal_business: "Consulting",
    line_b_business_code: "541600",
    line_f_accounting_method: "cash",
    line_g_material_participation: true,
    line_32_at_risk: "b",
  };
  const result = runReturn({
    general,
    w2: [w2Item(50_000, 8_000)],
    schedule_c: [
      {
        ...base,
        line_c_business_name: "North business",
        line_1_gross_receipts: 1000,
        line_8_advertising: 3000,
        at_risk_simplified: {
          opening_adjusted_basis: 500,
          current_year_increases: 0,
          line9_decreases_and_exclusions: 0,
        },
      },
      {
        ...base,
        line_c_business_name: "South business",
        line_1_gross_receipts: 1000,
        line_8_advertising: 4000,
        at_risk_simplified: {
          opening_adjusted_basis: 900,
          current_year_increases: 0,
          line9_decreases_and_exclusions: 0,
        },
      },
    ],
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.carryforwards.schedule_c_at_risk_suspended_1, 1500);
  assertEquals(result.carryforwards.schedule_c_at_risk_suspended_2, 2100);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertEquals(xml.match(/<IRS6198 /g)?.length, 2);
  assertStringIncludes(
    xml,
    "<ActivityDescriptionTxt>North business</ActivityDescriptionTxt>",
  );
  assertStringIncludes(
    xml,
    "<ActivityDescriptionTxt>South business</ActivityDescriptionTxt>",
  );
  assertStringIncludes(xml, "<DeductibleLossAmt>-500</DeductibleLossAmt>");
  assertStringIncludes(xml, "<DeductibleLossAmt>-900</DeductibleLossAmt>");
  await validateXsd(xml, "separate Schedule C at-risk businesses");
});

Deno.test(
  {
    name: "XSD: Self-employed Schedule C $80K validates against Return1040.xsd",
    sanitizeOps: false,
    sanitizeResources: false,
    ignore: !xsdAvailable,
  },
  async () => {
    const result = runReturn({
      general: singleGeneral(),
      schedule_c: [
        {
          line_a_principal_business: "Consulting",
          line_b_business_code: "541600",
          line_c_business_name: "Test LLC",
          line_e_business_address: {
            line1: "1 Business Way",
            city: "Austin",
            state: "TX",
            zip: "78701",
          },
          line_f_accounting_method: "cash",
          line_g_material_participation: true,
          line_1_gross_receipts: 80_000,
        },
      ],
    });
    const xml = buildMefXml(
      result.pending as MefFormsPending,
      extractFilerIdentity(singleGeneral()),
    );
    assertStringIncludes(xml, "<IRS1040ScheduleC documentId=");
    assertStringIncludes(
      xml,
      "<TotalGrossReceiptsAmt>80000</TotalGrossReceiptsAmt>",
    );
    await validateXsd(xml, "Self-employed Schedule C $80K");
  },
);

// ── Scenario 3: Itemized deductions Schedule A ($200K income, $33K deductions)

Deno.test(
  {
    name: "XSD: Schedule C inventory and itemized other expense validate",
    sanitizeOps: false,
    sanitizeResources: false,
    ignore: !xsdAvailable,
  },
  async () => {
    const result = runReturn({
      general: singleGeneral(),
      schedule_c: [{
        line_a_principal_business: "Retail",
        line_b_business_code: "449110",
        line_f_accounting_method: "cash",
        line_g_material_participation: true,
        line_1_gross_receipts: 60_000,
        line_33_inventory_method: "cost",
        line_35_cogs_beginning_inventory: 7_650,
        line_36_purchases: 8_550,
        line_37_cost_of_labor: 11_900,
        line_38_materials_supplies_cogs: 16_300,
        line_41_cogs_ending_inventory: 21_450,
        line_44b_business_miles: 665,
        line_44c_commuting_miles: 710,
        line_44d_other_miles: 15_151,
        line_45_personal_use: true,
        part_v_other_expenses: [{ description: "Postage", amount: 100 }],
      }],
    });
    const xml = buildMefXml(
      result.pending as MefFormsPending,
      extractFilerIdentity(singleGeneral()),
    );
    assertStringIncludes(xml, "<CostOfGoodsSoldAmt>22950</CostOfGoodsSoldAmt>");
    assertStringIncludes(
      xml,
      "<OtherExpenseDetail><Desc>Postage</Desc><Amt>100</Amt></OtherExpenseDetail>",
    );
    await validateXsd(xml, "Schedule C inventory and other expense");
  },
);

Deno.test(
  {
    name:
      "XSD: Itemized deductions Schedule A validates against Return1040.xsd",
    sanitizeOps: false,
    sanitizeResources: false,
    ignore: !xsdAvailable,
  },
  async () => {
    const result = runReturn({
      general: singleGeneral(),
      w2: [w2Item(200_000, 40_000)],
      schedule_a: {
        line_5a_state_income_tax: 10_000,
        line_8a_mortgage_interest_1098: 18_000,
        line_11_cash_contributions: 5_000,
      },
    });
    const xml = buildMefXml(
      result.pending as MefFormsPending,
      extractFilerIdentity(singleGeneral()),
    );
    await validateXsd(xml, "Itemized deductions Schedule A");
  },
);

// ── returnVersion check ──────────────────────────────────────────────────────

Deno.test("XSD: returnVersion matches 2025v5.4", () => {
  const result = runReturn({
    general: singleGeneral(),
    w2: [w2Item(50_000, 8_000)],
  });
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(singleGeneral()),
  );
  assertStringIncludes(xml, 'returnVersion="2025v5.4"');
});
