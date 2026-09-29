import { assertEquals, assertStringIncludes } from "@std/assert";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { execute } from "../../../../core/runtime/executor.ts";
import { extractFilerIdentity } from "../../mef/filer.ts";
import { FilingStatus } from "../../nodes/types.ts";
import { inputNodes } from "../inputs.ts";
import { registry } from "../registry.ts";
import { buildMefXml } from "./builder.ts";
import { buildPending } from "./pending.ts";
import type { MefFormsPending } from "./types.ts";

const general = {
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

Deno.test("Schedule B Part III taxpayer input reaches the filed return", () => {
  assertEquals(
    inputNodes.some((entry) => entry.node.nodeType === "schedule_b_part_iii"),
    true,
  );
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    {
      general,
      schedule_b_part_iii: {
        foreign_accounts_question: true,
        fincen_form114_required: true,
        foreign_countries: [{ irs_code: "CA", name: "Canada" }],
        foreign_trust_question: false,
      },
    },
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule_b?.foreign_country_codes, ["CA"]);
  const xml = buildMefXml(
    buildPending(result.pending),
    extractFilerIdentity(general),
  );
  assertStringIncludes(xml, "<IRS1040ScheduleB ");
  assertStringIncludes(xml, "<FinCENForm114Ind>true</FinCENForm114Ind>");
  assertStringIncludes(xml, "<ForeignCountryCd>CA</ForeignCountryCd>");
});

Deno.test("Form 8814 child facts force Schedule B foreign answers and literals", () => {
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    {
      general,
      f8814: [{
        child_name: "Alex Rivera",
        child_name_control: "RIVE",
        child_ssn: "987654321",
        child_age_eligible: true,
        child_required_to_file: true,
        child_income_only_permitted_types: true,
        child_no_joint_return: true,
        child_no_estimated_payments: true,
        child_no_withholding: true,
        parent_eligible_to_elect: true,
        interest_income: 3000,
        child_had_foreign_account: true,
        child_foreign_trust_part_iii_event: true,
      }],
      schedule_b_part_iii: {
        foreign_accounts_question: false,
        fincen_form114_required: false,
        foreign_trust_question: false,
      },
    },
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule_b?.foreign_accounts_question, true);
  assertEquals(result.pending.schedule_b?.foreign_trust_question, true);
  const xml = buildMefXml(
    buildPending(result.pending),
    extractFilerIdentity(general),
  );
  assertStringIncludes(xml, "<Form8814LiteralCd>FORM8814</Form8814LiteralCd>");
  assertStringIncludes(
    xml,
    "<TrustFormLiteralCd>FORM8814</TrustFormLiteralCd>",
  );
});

Deno.test("1099-INT adjustments reach gross Schedule B rows and MeF deductions", () => {
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    {
      general,
      f1099int: [{
        payer_name: "Bond Bank",
        box1: 2_000,
        nominee_interest: 100,
        accrued_interest_paid: 50,
        non_taxable_oid_adjustment: 75,
        box11: 125,
        elect_bond_premium_amortization: true,
      }],
      schedule_b_part_iii: {
        foreign_accounts_question: false,
        foreign_trust_question: false,
      },
    },
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule_b?.print_line2_total, 1_650);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(xml, "<InterestAmt>2000</InterestAmt>");
  assertStringIncludes(
    xml,
    '<NomineeInterestAmt nomineeInterestLiteralCd="NOMINEE DISTRIBUTION">100</NomineeInterestAmt>',
  );
  assertStringIncludes(
    xml,
    '<AccruedInterestAmt accruedInterestLiteralCd="ACCRUED INTEREST">50</AccruedInterestAmt>',
  );
  assertStringIncludes(
    xml,
    '<OriginalIssueDiscountAdjAmt originalIssueDiscountAdjLitCd="OID ADJUSTMENT">75</OriginalIssueDiscountAdjAmt>',
  );
  assertStringIncludes(
    xml,
    '<AmortizableBondPremAdjAmt amortizableBondPremiumAdjLitCd="ABP ADJUSTMENT">125</AmortizableBondPremAdjAmt>',
  );
  assertStringIncludes(
    xml,
    "<TaxableInterestSubtotalAmt>1650</TaxableInterestSubtotalAmt>",
  );
});

Deno.test("seller-financed buyer identity reaches Schedule B MeF", () => {
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    {
      general,
      f1099int: [{
        payer_name: "Buyer mortgage",
        seller_financed: true,
        buyer_used_as_personal_residence: true,
        seller_financed_buyer: {
          address_type: "us",
          name: "Jane Buyer",
          ssn: "123456789",
          address_line1: "456 Oak Ave",
          city: "Austin",
          state: "TX",
          zip: "78701",
        },
        box1: 900,
      }],
      schedule_b_part_iii: {
        foreign_accounts_question: false,
        foreign_trust_question: false,
      },
    },
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule_b?.print_line2_total, 900);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(xml, "<SellerFinancedNm>Jane Buyer</SellerFinancedNm>");
  assertStringIncludes(xml, "<SellerFinancedSSN>123456789</SellerFinancedSSN>");
  assertStringIncludes(
    xml,
    "<TotalSellerFinancedMortgIntAmt>900</TotalSellerFinancedMortgIntAmt>",
  );
});

Deno.test("foreign seller-financed buyer reaches Schedule B MeF", () => {
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    {
      general,
      f1099int: [{
        payer_name: "Buyer mortgage",
        seller_financed: true,
        buyer_used_as_personal_residence: true,
        seller_financed_buyer: {
          address_type: "foreign",
          name: "Jane Buyer",
          ssn: "123456789",
          address_line1: "10 Queen St",
          city: "Toronto",
          province_or_state: "Ontario",
          country_code: "CA",
          foreign_postal_code: "M5H2N2",
        },
        box1: 900,
      }],
      schedule_b_part_iii: {
        foreign_accounts_question: false,
        foreign_trust_question: false,
      },
    },
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(xml, "<SellerFinancedAddressForeign>");
  assertStringIncludes(xml, "<CountryCd>CA</CountryCd>");
  assertStringIncludes(xml, "<ForeignPostalCd>M5H2N2</ForeignPostalCd>");
});

Deno.test("nonresidence seller financing below $1,500 does not force Schedule B", () => {
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    {
      general,
      f1099int: [{
        payer_name: "Buyer mortgage",
        seller_financed: true,
        buyer_used_as_personal_residence: false,
        box1: 900,
      }],
    },
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040?.line2b_taxable_interest, 900);
  assertEquals(result.pending.schedule_b?.seller_financed_rows, undefined);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertEquals(xml.includes("<IRS1040ScheduleB"), false);
});

Deno.test("nonresidence seller financing above $1,500 files an ordinary interest row", () => {
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    {
      general,
      f1099int: [{
        payer_name: "Buyer mortgage",
        seller_financed: true,
        buyer_used_as_personal_residence: false,
        box1: 1_600,
      }],
      schedule_b_part_iii: {
        foreign_accounts_question: false,
        foreign_trust_question: false,
      },
    },
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(xml, "<IRS1040ScheduleB");
  assertStringIncludes(
    xml,
    "<BusinessNameLine1Txt>Buyer mortgage</BusinessNameLine1Txt>",
  );
  assertEquals(xml.includes("<SellerFinancedNm>"), false);
});

Deno.test("1099-OID premiums and nominee amount reach Schedule B adjustments", () => {
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    {
      general,
      f1099oid: [{
        payer_name: "Bond Broker",
        box1_oid: 1_000,
        box2_other_interest: 500,
        box6_acquisition_premium: 100,
        box6_applies_to: "taxable_oid",
        box10_bond_premium: 50,
        box10_applies_to: "taxable_stated_interest",
        nominee_oid: 100,
      }],
      schedule_b_part_iii: {
        foreign_accounts_question: false,
        foreign_trust_question: false,
      },
    },
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule_b?.print_line2_total, 1_250);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(xml, "<InterestAmt>1500</InterestAmt>");
  assertStringIncludes(
    xml,
    '<NomineeInterestAmt nomineeInterestLiteralCd="NOMINEE DISTRIBUTION">100</NomineeInterestAmt>',
  );
  assertStringIncludes(
    xml,
    '<OriginalIssueDiscountAdjAmt originalIssueDiscountAdjLitCd="OID ADJUSTMENT">100</OriginalIssueDiscountAdjAmt>',
  );
  assertStringIncludes(
    xml,
    '<AmortizableBondPremAdjAmt amortizableBondPremiumAdjLitCd="ABP ADJUSTMENT">50</AmortizableBondPremAdjAmt>',
  );
  assertStringIncludes(
    xml,
    "<TaxableInterestSubtotalAmt>1250</TaxableInterestSubtotalAmt>",
  );
});

Deno.test("1099-DIV nominee allocation reaches Schedule B and taxpayer-only return lines", () => {
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    {
      general,
      f1099div: [{
        payerName: "Fund",
        isNominee: true,
        box11: false,
        box1a: 1_000,
        box1b: 500,
        nominee_distribution: { box1a: 400, box1b: 200 },
      }],
      schedule_b_part_iii: {
        foreign_accounts_question: false,
        foreign_trust_question: false,
      },
    },
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule_b?.print_line6_total, 600);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(xml, "<DividendAmt>1000</DividendAmt>");
  assertStringIncludes(
    xml,
    '<NomineeDividendAmt nomineeDividendLiteralCd="NOMINEE DISTRIBUTION">400</NomineeDividendAmt>',
  );
  assertStringIncludes(
    xml,
    "<TotalOrdinaryDividendsAmt>600</TotalOrdinaryDividendsAmt>",
  );
});
