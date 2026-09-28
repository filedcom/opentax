import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { FilingStatus } from "../../../mef/header.ts";
import type { MefBuildContext } from "../form-descriptor.ts";
import {
  CoverageType,
  form8889 as form8889Node,
  inputSchema as form8889InputSchema,
} from "../../../nodes/intermediate/forms/form8889/index.ts";
import { form8889 } from "./f8889.ts";

const context: MefBuildContext = {
  filer: {
    primarySSN: "123-45-6789",
    fullName: "Alex Taxpayer",
    nameLine1: "TAXPAYER ALEX",
    nameControl: "TAXP",
    filingStatus: FilingStatus.Single,
    address: {
      line1: "1 Main St",
      city: "Austin",
      state: "TX",
      zip: "78701",
    },
  },
};

Deno.test("Form 8889 omits an empty pending slot", () => {
  assertEquals(form8889.build({}, context), "");
  assertEquals(form8889.build({ unrelated: 10 }, context), "");
});

Deno.test("Form 8889 rejects raw HSA values without computed form lines", () => {
  assertThrows(
    () => form8889.build({ taxpayer_hsa_contributions: 3_000 }, context),
    Error,
    "requires computed print_line fields",
  );
  assertThrows(
    () =>
      form8889.build(
        {
          qualified_hsa_funding_distributions: {
            transfers: [{ amount: 1000 }],
          },
        },
        context,
      ),
    Error,
    "requires computed print_line fields",
  );
  assertThrows(
    () =>
      form8889.build(
        { hsa_excluded_distributions: { rollover_amount: 500 } },
        context,
      ),
    Error,
    "requires computed print_line fields",
  );
  assertThrows(
    () => form8889.build({ qualified_hsa_funding_distribution: {} }, context),
    Error,
    "requires computed print_line fields",
  );
});

Deno.test("Form 8889 calculated IRA-to-HSA transfer reaches native line 10", () => {
  const result = form8889Node.compute(
    { taxYear: 2025, formType: "f1040" },
    form8889InputSchema.parse({
      eligible_hdhp_coverage_by_month: Array(12).fill(CoverageType.SelfOnly),
      age_55_or_older: false,
      last_month_rule_elected: false,
      qualified_hsa_funding_distributions: {
        no_prior_qualified_funding_distribution: true,
        transfers: [{
          amount: 1000,
          transfer_month: 3,
          ira_type: "traditional",
          direct_trustee_transfer: true,
          source_reference: "IRA trustee transfer confirmation",
        }],
      },
    }),
  );
  const printed = result.outputs.find((entry) => entry.nodeType === "form8889");
  const xml = form8889.build(printed?.fields ?? {}, context);
  assertStringIncludes(
    xml,
    "<HSAQualifiedFundingDistriAmt>1000</HSAQualifiedFundingDistriAmt>",
  );
  assertStringIncludes(
    xml,
    "<HSALimitedContributionAmt>3300</HSALimitedContributionAmt>",
  );
});

Deno.test("Form 8889 sums two permitted IRA-to-HSA transfers on native line 10", () => {
  const result = form8889Node.compute(
    { taxYear: 2025, formType: "f1040" },
    form8889InputSchema.parse({
      eligible_hdhp_coverage_by_month: [
        ...Array(6).fill(CoverageType.SelfOnly),
        ...Array(6).fill(CoverageType.Family),
      ],
      age_55_or_older: false,
      last_month_rule_elected: false,
      married_at_year_end: false,
      qualified_hsa_funding_distributions: {
        no_prior_qualified_funding_distribution: true,
        transfers: [
          {
            amount: 3000,
            transfer_month: 3,
            ira_type: "traditional",
            direct_trustee_transfer: true,
            source_reference: "March trustee transfer",
          },
          {
            amount: 5000,
            transfer_month: 8,
            ira_type: "roth",
            direct_trustee_transfer: true,
            source_reference: "August trustee transfer",
          },
        ],
      },
    }),
  );
  const printed = result.outputs.find((entry) => entry.nodeType === "form8889");
  const xml = form8889.build(printed?.fields ?? {}, context);
  assertStringIncludes(
    xml,
    "<HSAQualifiedFundingDistriAmt>8000</HSAQualifiedFundingDistriAmt>",
  );
});

Deno.test("Form 8889 source rejects one XML form for two spouse HSAs", () => {
  assertThrows(
    () =>
      form8889Node.compute(
        { taxYear: 2025, formType: "f1040" },
        form8889InputSchema.parse({
          eligible_hdhp_coverage_by_month: Array(12).fill(CoverageType.Family),
          age_55_or_older: false,
          last_month_rule_elected: false,
          married_at_year_end: true,
          spouse_has_separate_hsa: true,
          spouse_allocated_family_limit: 4275,
          taxpayer_hsa_contributions: 4000,
        }),
      ),
    Error,
    "both spouses' Forms 8889",
  );
});

Deno.test("Form 8889 requires the beneficiary SSN for every filed form", () => {
  assertThrows(
    () => form8889.build({ print_line14a_distributions: 500 }),
    Error,
    "beneficiary SSN",
  );
});

Deno.test("Form 8889 distribution-only filing has no invented HDHP coverage", () => {
  const xml = form8889.build({
    print_line14a_distributions: 800,
    print_line14c: 800,
    print_line15_qualified: 300,
    print_line16_taxable: 500,
    print_line17b_penalty: 100,
  }, context);
  assertStringIncludes(xml, "<RecipientSSN>123456789</RecipientSSN>");
  assertStringIncludes(
    xml,
    "<TotalHSADistributionAmt>800</TotalHSADistributionAmt>",
  );
  assertStringIncludes(
    xml,
    "<TaxableHSADistributionAmt>500</TaxableHSADistributionAmt>",
  );
  assertStringIncludes(
    xml,
    "<HSADistriAddnlPercentTaxAmt>100</HSADistriAddnlPercentTaxAmt>",
  );
  assertEquals(xml.includes("HDHPSelfOnlyCoverageInd"), false);
  assertEquals(xml.includes("HDHPFamilyCoverageInd"), false);
});

Deno.test("Form 8889 serializes all calculated 2025 lines in XSD order", () => {
  const xml = form8889.build({
    print_line1_coverage: "family",
    print_line2_taxpayer_contributions: 2_000,
    print_line3_limit: 8_550,
    print_line4_archer: 100,
    print_line5: 8_450,
    print_line6: 8_000,
    print_line7_catchup: 1_000,
    print_line8: 9_000,
    print_line9_employer: 3_000,
    print_line10: 200,
    print_line11: 3_200,
    print_line12: 5_800,
    print_line13_deduction: 2_000,
    print_line14a_distributions: 4_000,
    print_line14b_excluded_distributions: 500,
    print_line14c: 3_500,
    print_line15_qualified: 2_500,
    print_line16_taxable: 1_000,
    print_line17a_exception: true,
    print_line17b_penalty: 0,
    print_line18: 300,
    print_line19: 200,
    print_line20: 500,
    print_line21: 50,
  }, context);

  const tags = [
    "PersonNm",
    "RecipientSSN",
    "HDHPFamilyCoverageInd",
    "HSAContributionAmt",
    "HSALimitedAnnualDeductibleAmt",
    "TotalArcherMSAContributionAmt",
    "HSALimitedDeductibleAllwdAmt",
    "HSAFamilyDeductibleAmt",
    "HSAAddnlContributionAmt",
    "HSALimitedGrossContributionAmt",
    "HSAEmployerContributionAmt",
    "HSAQualifiedFundingDistriAmt",
    "TotalHSAContributionAmt",
    "HSALimitedContributionAmt",
    "TotalHSADeductionAmt",
    "TotalHSADistributionAmt",
    "HSADistributionRolloverAmt",
    "HSANetDistributionAmt",
    "UnreimbQualMedAndDentalExpAmt",
    "TaxableHSADistributionAmt",
    "HSADistriAddnlPercentTaxExcInd",
    "HSADistriAddnlPercentTaxAmt",
    "HDHPCoverageFailPartialYrAmt",
    "HDHPCoverageFailFundDistriAmt",
    "HDHPCoverageIncomeAmt",
    "HDHPCoverageAddnlTaxAmt",
  ];
  const positions = tags.map((tag) => xml.indexOf(`<${tag}>`));
  assertEquals(positions.every((position) => position >= 0), true);
  assertEquals(positions, [...positions].sort((a, b) => a - b));
  assertStringIncludes(xml, "<PersonNm>Alex Taxpayer</PersonNm>");
  assertStringIncludes(
    xml,
    "<TotalHSADeductionAmt>2000</TotalHSADeductionAmt>",
  );
  assertStringIncludes(
    xml,
    "<HSADistriAddnlPercentTaxExcInd>X</HSADistriAddnlPercentTaxExcInd>",
  );
  assertStringIncludes(
    xml,
    "<HDHPCoverageAddnlTaxAmt>50</HDHPCoverageAddnlTaxAmt>",
  );
  assertEquals(xml.includes("HDHPSelfOnlyCoverageInd"), false);
});

Deno.test("Form 8889 self-only line 1 and explicit zero deduction", () => {
  const xml = form8889.build({
    print_line1_coverage: "self_only",
    print_line2_taxpayer_contributions: 0,
    print_line9_employer: 1_000,
    print_line13_deduction: 0,
  }, context);
  assertStringIncludes(
    xml,
    "<HDHPSelfOnlyCoverageInd>X</HDHPSelfOnlyCoverageInd>",
  );
  assertStringIncludes(xml, "<HSAContributionAmt>0</HSAContributionAmt>");
  assertStringIncludes(xml, "<TotalHSADeductionAmt>0</TotalHSADeductionAmt>");
});

Deno.test("Form 8889 rejects invalid coverage, exception, and amounts", () => {
  assertThrows(
    () => form8889.build({ print_line1_coverage: "both" }, context),
    Error,
    "line 1",
  );
  assertThrows(
    () => form8889.build({ print_line17a_exception: "yes" }, context),
    Error,
    "line 17a",
  );
  assertThrows(
    () => form8889.build({ print_line16_taxable: -1 }, context),
    Error,
    "nonnegative amount",
  );
  assertThrows(
    () => form8889.build({ print_line16_taxable: Number.NaN }, context),
    Error,
    "nonnegative amount",
  );
});
