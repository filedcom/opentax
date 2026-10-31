import {
  type ClergyItem,
  MinisterialCredential,
} from "../../../../../nodes/inputs/income/wages/clergy/index.ts";

/**
 * Synthetic clergy returns for one tax year. Amounts follow the Pub 517
 * pattern: the church leaves the designated housing allowance out of W-2
 * box 1 and reports no social security or Medicare wages for the minister.
 */
export const MINISTER_SSN = "400011234";
export const SPOUSE_SSN = "400015678";
export const CHURCH_W2_REFERENCE = "W-2 Example Community Church";

export function clergyGeneral(
  taxYear: number,
  joint = false,
): Record<string, unknown> {
  return {
    filing_status: joint ? "mfj" : "single",
    taxpayer_first_name: "Alex",
    taxpayer_last_name: "Example",
    taxpayer_ssn: MINISTER_SSN,
    taxpayer_dob: "1980-03-01",
    taxpayer_prior_year_agi: 0,
    taxpayer_signature_pin: "12345",
    taxpayer_signature_date: `${taxYear + 1}-02-01`,
    address_line1: "1 Church Street",
    address_city: "Austin",
    address_state: "TX",
    address_zip: "78701",
    digital_assets: false,
    qbi_no_prior_loss_or_suspended_loss_confirmed: true,
    qbi_not_patron_of_specified_cooperative_confirmed: true,
    ...(joint
      ? {
        spouse_first_name: "Sam",
        spouse_last_name: "Example",
        spouse_ssn: SPOUSE_SSN,
        spouse_dob: "1982-04-02",
        spouse_prior_year_agi: 0,
        spouse_signature_pin: "54321",
        spouse_signature_date: `${taxYear + 1}-02-01`,
      }
      : {}),
  };
}

export function churchW2(
  employeeSsn = MINISTER_SSN,
  wages = 50_000,
): Record<string, unknown> {
  return {
    employee_ssn: employeeSsn,
    employer_ein: "123456789",
    employer_name: "Example Community Church",
    employer_address_line1: "2 Church Street",
    employer_address_city: "Austin",
    employer_address_state: "TX",
    employer_address_zip: "78701",
    source_document_reference: CHURCH_W2_REFERENCE,
    box1_wages: wages,
    box2_fed_withheld: 3_000,
  };
}

export function clergyItem(
  taxYear: number,
  overrides: Partial<ClergyItem> = {},
): ClergyItem {
  return {
    tax_year: taxYear,
    minister: {
      owner: "taxpayer",
      name: "Alex Example",
      ssn: MINISTER_SSN,
      credential: MinisterialCredential.ORDAINED,
      ordained_commissioned_or_licensed_confirmed: true,
      ministerial_services_confirmed: true,
      credential_reference: "Presbytery ordination certificate",
    },
    employer: {
      employer_name: "Example Community Church",
      employer_ein: "12-3456789",
      w2_reference: CHURCH_W2_REFERENCE,
    },
    ministerial_wages: 50_000,
    // Designated 24,000; spent 20,000; fair rental value 22,000: the excess
    // over the smallest limit is 24,000 - 20,000 = 4,000 (Pub 517).
    housing_allowance: {
      included_in_w2_box1: false,
      designation: {
        amount: 24_000,
        designated_on: `${taxYear - 1}-12-10`,
        effective_from: `${taxYear}-01-01`,
        designation_reference: "Session minutes designating the allowance",
      },
      paid: {
        amount: 24_000,
        payment_records_reference: "Church payroll register",
        paid_after_designation_confirmed: true,
      },
      actual_housing_expenses: {
        amount: 20_000,
        expense_records_reference: "Mortgage, utility and furnishing receipts",
      },
      fair_rental_value: {
        amount: 22_000,
        furnished_plus_utilities_confirmed: true,
        fair_rental_value_reference: "Realtor rental value letter",
      },
      not_more_than_reasonable_pay_confirmed: true,
    },
    form4361: { approved: false },
    ...overrides,
  };
}

export const form4361Approved = {
  approved: true as const,
  approved_on: "2012-05-01",
  approval_reference: "IRS approved Form 4361 letter",
};

/** A small consulting Schedule C owned by `recipient`. */
export function consultingScheduleC(
  gross: number,
  recipient: "T" | "S" = "T",
): Record<string, unknown> {
  return {
    business_reference: "speaking-and-consulting",
    proprietor_recipient: recipient,
    line_a_principal_business: "Consulting",
    line_b_business_code: "541600",
    line_c_business_name: "Example Consulting",
    line_d_ein: "22-3456789",
    line_f_accounting_method: "cash",
    line_g_material_participation: true,
    line_i_made_1099_payments: false,
    qbi_no_other_adjustments_confirmed: true,
    line_1_gross_receipts: gross,
  };
}
