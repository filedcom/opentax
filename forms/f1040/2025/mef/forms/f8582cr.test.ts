import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { PassiveCreditCategory } from "../../../nodes/intermediate/forms/form8582cr/index.ts";
import { form8582cr } from "./f8582cr.ts";

const otherCredit = {
  activity_reference: "Clinical activity",
  source_form: "Form 8820",
  source_document_reference: "2025 clinical credit statement",
  category: PassiveCreditCategory.Other,
  current_year_credit: 1_500,
  prior_unallowed_credits: [{
    originating_tax_year: 2024,
    credit_amount: 500,
    source_document_reference: "2024 clinical credit carryover statement",
  }],
  publicly_traded_partnership: false,
};

const rentalCredit = {
  activity_reference: "Rental house",
  source_form: "Form 8835",
  source_document_reference: "2025 rental credit statement",
  category: PassiveCreditCategory.ActiveRental,
  current_year_credit: 3_000,
  prior_unallowed_credits: [],
  publicly_traded_partnership: false,
};

Deno.test("Form 8582-CR: absent or empty credits emit no document", () => {
  assertEquals(form8582cr.build({}), "");
  assertEquals(
    form8582cr.build({
      credit_sources: [],
      regular_tax_all_income: 10_000,
      regular_tax_without_passive: 8_000,
    }),
    "",
  );
});

Deno.test("Form 8582-CR: Part I preserves current and prior other credits", () => {
  const xml = form8582cr.build({
    credit_sources: [otherCredit],
    regular_tax_all_income: 10_000,
    regular_tax_without_passive: 9_000,
  });
  assertStringIncludes(
    xml,
    "<AllPassiveCreditGrp><OtherCurrentYearAmt>1500</OtherCurrentYearAmt><OtherPriorUnallowedAmt>500</OtherPriorUnallowedAmt><TotalOtherCreditsAmt>2000</TotalOtherCreditsAmt></AllPassiveCreditGrp>",
  );
  assertStringIncludes(xml, "<TotalCreditAmt>2000</TotalCreditAmt>");
  assertStringIncludes(
    xml,
    "<NetPassiveIncomeTaxAmt>1000</NetPassiveIncomeTaxAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalCreditMinusTaxAmt>1000</TotalCreditMinusTaxAmt>",
  );
  assertStringIncludes(xml, "<AllowedCreditsAmt>1000</AllowedCreditsAmt>");
  assertEquals(xml.includes("<SpecialAllowActiveGrp>"), false);
});

Deno.test("Form 8582-CR: active rental Part II serializes the tax limitation", () => {
  const xml = form8582cr.build({
    credit_sources: [rentalCredit],
    regular_tax_all_income: 10_000,
    regular_tax_without_passive: 10_000,
    filing_status: "single",
    modified_agi: 120_000,
    form8582_line9_special_allowance_used: 5_000,
    part_ii_tax_on_income_less_line14: 9_000,
  });
  assertStringIncludes(
    xml,
    "<CurrentYearCreditAmt>3000</CurrentYearCreditAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalArcherMSADistributionAmt>150000</TotalArcherMSADistributionAmt>",
  );
  assertStringIncludes(xml, "<ModifiedAGIAmt>120000</ModifiedAGIAmt>");
  assertStringIncludes(xml, "<NetAGIAmt>30000</NetAGIAmt>");
  assertStringIncludes(xml, "<PercentNetAGIAmt>15000</PercentNetAGIAmt>");
  assertStringIncludes(
    xml,
    "<AllowedRentalRealtyLossAmt>5000</AllowedRentalRealtyLossAmt>",
  );
  assertStringIncludes(xml, "<TaxableAmt>10000</TaxableAmt>");
  assertStringIncludes(xml, "<AttributableTaxAmt>1000</AttributableTaxAmt>");
  assertStringIncludes(xml, "<SmallestTaxAmt>1000</SmallestTaxAmt>");
  assertStringIncludes(xml, "<AllowedCreditsAmt>1000</AllowedCreditsAmt>");
});

Deno.test("Form 8582-CR: MFS lived-with rental credit appears in other credits", () => {
  const xml = form8582cr.build({
    credit_sources: [rentalCredit],
    regular_tax_all_income: 10_000,
    regular_tax_without_passive: 9_000,
    filing_status: "mfs",
    mfs_lived_apart_all_year: false,
  });
  assertStringIncludes(xml, "<AllPassiveCreditGrp>");
  assertStringIncludes(xml, "<OtherCurrentYearAmt>3000</OtherCurrentYearAmt>");
  assertEquals(xml.includes("<RentalCreditGrp>"), false);
  assertEquals(xml.includes("<SpecialAllowActiveGrp>"), false);
});

Deno.test("Form 8582-CR: Part III and IV serialize separate tax limits", () => {
  const xml = form8582cr.build({
    credit_sources: [{
      ...otherCredit,
      category: PassiveCreditCategory.RehabilitationOrPre1990Housing,
      source_document_reference: "2025 rehabilitation credit statement",
    }, {
      ...otherCredit,
      category: PassiveCreditCategory.LowIncomeHousing,
      source_document_reference: "2025 low-income housing credit statement",
    }],
    regular_tax_all_income: 10_000,
    regular_tax_without_passive: 10_000,
    modified_agi: 180_000,
    form8582_line9_special_allowance_used: 0,
    part_iii_tax_on_income_less_line26: 8_500,
    part_iv_tax_on_income_less_remaining_allowance: 7_000,
    filing_status: "single",
  });
  assertStringIncludes(xml, "<RehabilitationCreditGrp>");
  assertStringIncludes(xml, "<LowIncomeCreditGrp>");
  assertStringIncludes(xml, "<SpecialAllowRehabGrp>");
  assertStringIncludes(xml, "<SmallestRehabTaxAmt>1500</SmallestRehabTaxAmt>");
  assertStringIncludes(xml, "<SpecialAllowLowIncomeGrp>");
  assertStringIncludes(xml, "<TaxAmt>1500</TaxAmt>");
  assertStringIncludes(xml, "<AllowedCreditsAmt>3000</AllowedCreditsAmt>");
});

Deno.test("Form 8582-CR: missing worksheet tax stops XML generation", () => {
  assertThrows(
    () =>
      form8582cr.build({
        credit_sources: [{
          ...otherCredit,
          category: PassiveCreditCategory.LowIncomeHousing,
        }],
        regular_tax_all_income: 10_000,
        regular_tax_without_passive: 10_000,
        modified_agi: 180_000,
        form8582_line9_special_allowance_used: 0,
        filing_status: "single",
      }),
    Error,
    "line 35 needs tax",
  );
});
