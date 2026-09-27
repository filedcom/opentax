import { assertStringIncludes, assertThrows } from "@std/assert";
import {
  calculateForm8396,
  CertifiedInterestDocumentKind,
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
  current_year_claim: true,
  interest_evidence: {
    kind: CertifiedInterestDocumentKind.Form1098,
    document_reference: "2025 Form 1098 loan A",
    reported_interest_paid: 15_000,
    taxpayer_interest_paid: 15_000,
    original_mortgage_amount: 200_000,
    certified_indebtedness_amount: 200_000,
  },
  interest_reporting_line: "8a",
  mcc_rate: 0.25,
  home_is_main_residence: true,
  home_in_issuer_jurisdiction: true,
  interest_paid_to_related_person: false,
  certificate_is_reissued: false,
  nonspouse_coowner: false,
  prior_2024_form8396: {
    document_reference: "Filed 2024 Form 8396",
    line14_2023_carryforward: 0,
    line16_2022_carryforward: 0,
    line17_2024_carryforward: 300,
  },
});
const lines = calculateForm8396(source, 1_100);
const fields = {
  ...source,
  ...lines,
  credit_limit_worksheet_line1: 1_500,
  credit_limit_worksheet_line2: 400,
};
const matchedPending = {
  schedule3: { line6g_mortgage_interest_credit: 1_100 },
  f1098: {
    f1098s: [{
      source_document_reference: "2025 Form 1098 loan A",
      box1_mortgage_interest: 15_000,
    }],
  },
};

Deno.test("Form 8396 XML carries source, allowed credit, and vintage carryforward", () => {
  const xml = form8396.build(fields, {
    pending: matchedPending,
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

Deno.test("Form 8396 XML rejects a missing or mismatched Form 1098", () => {
  assertThrows(
    () =>
      form8396.build(fields, {
        pending: { schedule3: matchedPending.schedule3 },
      }),
    Error,
    "referenced Form 1098 input",
  );
  assertThrows(
    () =>
      form8396.build(fields, {
        pending: {
          ...matchedPending,
          f1098: {
            f1098s: [{
              source_document_reference: "2025 Form 1098 loan A",
              box1_mortgage_interest: 14_000,
            }],
          },
        },
      }),
    Error,
    "differs from Form 1098 box 1",
  );
  assertThrows(
    () =>
      form8396.build(fields, {
        pending: {
          ...matchedPending,
          f1098: {
            f1098s: [
              matchedPending.f1098.f1098s[0],
              matchedPending.f1098.f1098s[0],
            ],
          },
        },
      }),
    Error,
    "one matching Form 1098 reference",
  );
});

Deno.test("Form 8396 accepts a named lender statement without an entered Form 1098", () => {
  const statementSource = form8396SourceSchema.parse({
    ...source,
    interest_evidence: {
      ...source.interest_evidence,
      kind: CertifiedInterestDocumentKind.LenderStatement,
      document_reference: "2025 lender annual statement",
    },
  });
  const xml = form8396.build({
    ...statementSource,
    ...lines,
    credit_limit_worksheet_line1: 1_500,
    credit_limit_worksheet_line2: 400,
  }, { pending: { schedule3: matchedPending.schedule3 } });
  assertStringIncludes(
    xml,
    "<MortgageInterestCreditAmt>1100</MortgageInterestCreditAmt>",
  );
});
