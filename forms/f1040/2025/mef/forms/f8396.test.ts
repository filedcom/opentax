import { assertStringIncludes, assertThrows } from "@std/assert";
import {
  calculateForm8396,
  form8396SourceSchema,
  QualifiedHomeState,
} from "../../../nodes/intermediate/forms/form8396/calculation.ts";
import { form8396 } from "./f8396.ts";

const source = form8396SourceSchema.parse({
  qualified_home_address_if_different: {
    line1: "123 Main St",
    city: "Austin",
    state: QualifiedHomeState.TX,
    zip: "78701",
  },
  certificate_issuer_name: "Austin Housing Finance Corporation",
  certificate_number: "MCC-2022-104",
  certificate_issue_date: "2022-03-15",
  mortgage_interest_paid: 15_000,
  interest_reporting_line: "8a",
  mcc_rate: 0.25,
  home_is_main_residence: true,
  home_in_issuer_jurisdiction: true,
  interest_paid_to_related_person: false,
  certificate_is_reissued: false,
  nonspouse_coowner: false,
  carryforward_vintages: [{
    originating_tax_year: 2024,
    amount: 300,
    prior_form8396_reference: "2024 Form 8396 line 17",
  }],
});
const lines = calculateForm8396(source, 1_100);
const fields = {
  ...source,
  ...lines,
  credit_limit_worksheet_line1: 1_500,
  credit_limit_worksheet_line2: 400,
};

Deno.test("Form 8396 XML carries source, allowed credit, and vintage carryforward", () => {
  const xml = form8396.build(fields, {
    pending: { schedule3: { line6g_mortgage_interest_credit: 1_100 } },
  });
  assertStringIncludes(
    xml,
    "<QlfyMortgageCertUSAddress><AddressLine1Txt>123 Main St</AddressLine1Txt><CityNm>Austin</CityNm><StateAbbreviationCd>TX</StateAbbreviationCd><ZIPCd>78701</ZIPCd></QlfyMortgageCertUSAddress>",
  );
  assertStringIncludes(
    xml,
    "<MortgSbsdyCertIssuerAgencyNm>Austin Housing Finance Corporation</MortgSbsdyCertIssuerAgencyNm>",
  );
  assertStringIncludes(
    xml,
    "<MortgageInterestReductionAmt>2000</MortgageInterestReductionAmt>",
  );
  assertStringIncludes(
    xml,
    "<MortgIntPYCarryforwardCrAmt>300</MortgIntPYCarryforwardCrAmt>",
  );
  assertStringIncludes(
    xml,
    "<TaxLiabLmtFromCrLmtWrkshtAmt>1100</TaxLiabLmtFromCrLmtWrkshtAmt>",
  );
  assertStringIncludes(
    xml,
    "<MortgageInterestCreditAmt>1100</MortgageInterestCreditAmt>",
  );
  assertStringIncludes(
    xml,
    "<MortgIntNextYearsPYCfwdCrAmt>900</MortgIntNextYearsPYCfwdCrAmt>",
  );
});

Deno.test("Form 8396 XML rejects line 9 and Schedule 3 mismatches", () => {
  assertThrows(
    () => form8396.build({ ...fields, line9: 1_200 }),
    Error,
    "line9 differs from its source calculation",
  );
  assertThrows(
    () =>
      form8396.build(fields, {
        pending: { schedule3: { line6g_mortgage_interest_credit: 1_000 } },
      }),
    Error,
    "differs from Schedule 3 line 6g",
  );
});
