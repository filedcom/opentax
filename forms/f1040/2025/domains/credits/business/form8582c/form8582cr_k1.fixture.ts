import { FilingStatus } from "../../../../../nodes/types.ts";
import { ordinaryTax2025 } from "../../../../../nodes/intermediate/worksheets/taxes/calculation/tax_table_2025.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import type { PdfReviewFixture } from "../../../../pdf/review-fixtures.ts";

const passiveIncome = 20_000;
const taxable = 104_250;
const taxAll = ordinaryTax2025(taxable, FilingStatus.Single);
const taxWithout = ordinaryTax2025(
  taxable - passiveIncome,
  FilingStatus.Single,
);
const incomeReference = "2025 rental income ledger";
const investmentReference = "2025 community QEI notice";
const worksheet = {
  tax_year: 2025 as const,
  tax_method: "ordinary" as const,
  activity_id: "rental-1",
  passive_income_source_document_reference: incomeReference,
  net_passive_income: passiveIncome,
  taxable_income_including_passive: taxable,
  taxable_income_without_passive: taxable - passiveIncome,
  tax_including_passive: taxAll,
  tax_without_passive: taxWithout,
};
const source = {
  activity_reference: "community-investment-1",
  source_form: "Form 8874",
  source_origin: { kind: "self" as const },
  source_document_reference: investmentReference,
  category: "other" as const,
  reporting_route: "form3800_line3" as const,
  form3800_credit_line: "1i" as const,
  current_year_credit: 500,
  prior_unallowed_credits: [],
  publicly_traded_partnership: false,
};
const general = {
  digital_assets: false,
  filing_status: FilingStatus.Single,
  taxpayer_first_name: "Alex",
  taxpayer_last_name: "Owner",
  taxpayer_ssn: "111-22-3333",
  taxpayer_dob: "1985-06-15",
  address_line1: "1 Main St",
  address_city: "Austin",
  address_state: "TX",
  address_zip: "78701",
};
const wage = {
  employee_ssn: "111-22-3333",
  box1_wages: 100_000,
  box2_fed_withheld: 16_000,
  employer_ein: "12-3456789",
  employer_name: "Austin Services Inc",
  employer_address_line1: "100 Commerce St",
  employer_address_city: "Austin",
  employer_address_state: "TX",
  employer_address_zip: "78701",
};

export function form8582crPartnershipSourceInputs() {
  return {
    general,
    w2: [wage],
    schedule_e: [{
      tsj: "T",
      activity_id: "rental-1",
      passive_income_source_document_reference: incomeReference,
      property_description: "Rental property",
      street_address: "10 Rental Rd",
      city: "Austin",
      state: "TX",
      zip: "78701",
      property_type: 1,
      activity_type: "B",
      fair_rental_days: 365,
      personal_use_days: 0,
      rent_income: passiveIncome,
      form_1099_payments_made: false,
    }],
    k1_partnership: [{
      partnership_name: "Community partnership",
      partnership_ein: "123456789",
      source_document_reference: "2025 partnership K-1 code AD",
      recipient_tin: "111223333",
      box15_code_ad_new_markets_credit: 500,
      new_markets_credit_subject_to_passive_activity_limit: true,
    }],
    form8582cr: {
      credit_sources: [{
        ...source,
        activity_reference: "2025 partnership K-1 code AD",
        source_document_reference: "2025 partnership K-1 code AD",
        source_origin: {
          kind: "partnership" as const,
          entity_reference: "Community partnership",
          ein: "123456789",
        },
      }],
      regular_tax_all_income: taxAll,
      regular_tax_without_passive: taxWithout,
      line6_ordinary_worksheet: worksheet,
    },
  };
}

export function form8582crMixedK1SourceInputs(
  additionalPartnershipCredits: number[] = [],
  additionalSCorpCredits: number[] = [],
) {
  const partnershipReference = "2025 partnership K-1 code AD mixed";
  const sCorpReference = "2025 S corporation K-1 code AD mixed";
  const partnerships = [
    {
      partnership_name: "Community partnership",
      partnership_ein: "123456789",
      source_document_reference: partnershipReference,
      recipient_tin: "111223333",
      box15_code_ad_new_markets_credit: 5_000,
      new_markets_credit_subject_to_passive_activity_limit: true,
    },
    ...additionalPartnershipCredits.map((credit, index) => ({
      partnership_name: `Community partnership ${index + 2}`,
      partnership_ein: String(345678901 - index),
      source_document_reference: `2025 partnership K-1 code AD ${index + 2}`,
      recipient_tin: "111223333",
      box15_code_ad_new_markets_credit: credit,
      new_markets_credit_subject_to_passive_activity_limit: true,
    })),
  ];
  const corporations = [
    {
      corporation_name: "Community S corporation",
      corporation_ein: "234567891",
      source_document_reference: sCorpReference,
      recipient_tin: "111223333",
      box13_code_ad_new_markets_credit: 2_500,
      new_markets_credit_subject_to_passive_activity_limit: true,
    },
    ...additionalSCorpCredits.map((credit, index) => ({
      corporation_name: `Community S corporation ${index + 2}`,
      corporation_ein: String(456789012 - index),
      source_document_reference: `2025 S corporation K-1 code AD ${index + 2}`,
      recipient_tin: "111223333",
      box13_code_ad_new_markets_credit: credit,
      new_markets_credit_subject_to_passive_activity_limit: true,
    })),
  ];
  return {
    general,
    w2: [wage],
    schedule_e: [{
      tsj: "T",
      activity_id: "rental-1",
      passive_income_source_document_reference: incomeReference,
      property_description: "Rental property",
      street_address: "10 Rental Rd",
      city: "Austin",
      state: "TX",
      zip: "78701",
      property_type: 1,
      activity_type: "B",
      fair_rental_days: 365,
      personal_use_days: 0,
      rent_income: passiveIncome,
      form_1099_payments_made: false,
    }],
    k1_partnership: partnerships,
    k1_s_corp: corporations,
    form8582cr: {
      credit_sources: [
        ...partnerships.map((k1) => ({
          ...source,
          activity_reference: k1.source_document_reference,
          source_document_reference: k1.source_document_reference,
          current_year_credit: k1.box15_code_ad_new_markets_credit,
          source_origin: {
            kind: "partnership" as const,
            entity_reference: k1.partnership_name,
            ein: k1.partnership_ein,
          },
        })),
        ...corporations.map((k1) => ({
          ...source,
          activity_reference: k1.source_document_reference,
          source_document_reference: k1.source_document_reference,
          current_year_credit: k1.box13_code_ad_new_markets_credit,
          source_origin: {
            kind: "s_corporation" as const,
            entity_reference: k1.corporation_name,
            ein: k1.corporation_ein,
          },
        })),
      ],
      regular_tax_all_income: taxAll,
      regular_tax_without_passive: taxWithout,
      line6_ordinary_worksheet: worksheet,
    },
  };
}

export function form8582crReviewFixtures(): PdfReviewFixture[] {
  return [
    {
      id: "single-passive-partnership-new-markets",
      inputs: form8582crPartnershipSourceInputs(),
    },
    {
      id: "single-mixed-passive-new-markets",
      inputs: form8582crMixedK1SourceInputs(),
    },
  ].map((row) => ({
    ...row,
    filer: extractFilerIdentity(general)!,
    expectedPdfForms: [
      "f1040",
      "schedule1",
      "schedule3",
      "schedule_e",
      "f3800",
      "form8582cr",
      "form6251",
    ],
    reviewFocus: [
      "Owned rental income20000 and wages100000 join finalized AGI120000 and taxable104250",
      "Issued K1 identities, owner, passive classification and credit amounts match source-specific Worksheet9 and Form3800 PartV",
      "Ordinary tax with and without rental derives passive limit4412; allowed credit joins Schedule3 and Form1040",
      "Single partnership500 and mixed7500 credit preserve separate current-year unallowed balances; no prior accepted-return or external issuer authenticity claim",
    ],
  }));
}
