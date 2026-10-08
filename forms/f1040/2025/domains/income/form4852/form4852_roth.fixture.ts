import { createHash } from "node:crypto";
import { FormType, itemSchema } from "../../../../nodes/inputs/f4852/index.ts";
import {
  rothActivityDocuments,
  rothActivityReviewSchema,
} from "../../../../nodes/intermediate/forms/form8606/roth-activity.ts";
import { FilingStatus } from "../../../../mef/header.ts";
import {
  form4852BaseInputs,
  form4852Filer,
  officialForm4852EvidenceTemplate,
  retainedForm4852Sources,
  substitute,
} from "./form4852_filing.fixture.ts";

export const rothCases = [
  {
    id: "J-first-year-earnings",
    code: "J",
    birth: "1985-06-15",
    years: [2025],
    amounts: [5000],
    gross: 7000,
    taxable: 2000,
    early: 200,
    tax: 19747,
  },
  {
    id: "J-prior-two-account-cents",
    code: "J",
    birth: "1985-06-15",
    years: [2020, 2025],
    amounts: [3000.25, 2000.25],
    gross: 7000.5,
    taxable: 2000,
    early: 200,
    tax: 19747,
  },
  {
    id: "J-basis-only",
    code: "J",
    birth: "1985-06-15",
    years: [2020],
    amounts: [5000],
    gross: 3000,
    taxable: 0,
    early: 0,
    tax: 19067,
  },
  {
    id: "T-first-year-not-qualified",
    code: "T",
    birth: "1964-01-01",
    years: [2025],
    amounts: [5000],
    gross: 7000,
    taxable: 2000,
    early: 0,
    tax: 19547,
  },
  {
    id: "T-2021-not-five-years",
    code: "T",
    birth: "1964-01-01",
    years: [2021],
    amounts: [5000],
    gross: 7000,
    taxable: 2000,
    early: 0,
    tax: 19547,
  },
  {
    id: "T-2020-qualified",
    code: "T",
    birth: "1964-01-01",
    years: [2020],
    amounts: [5000],
    gross: 7000,
    taxable: 0,
    early: 0,
    tax: 19067,
    qualified: true,
  },
  {
    id: "spouse-T-not-qualified",
    code: "T",
    birth: "1964-01-01",
    years: [2021],
    amounts: [5000],
    gross: 7000,
    taxable: 2000,
    early: 0,
    tax: 10986,
    spouse: true,
  },
  {
    id: "J-before-age-exception",
    code: "J",
    birth: "1966-04-02",
    years: [2020],
    amounts: [5000],
    gross: 7000,
    taxable: 2000,
    early: 200,
    tax: 19747,
  },
  {
    id: "T-at-age-exception",
    code: "T",
    birth: "1966-04-01",
    years: [2021],
    amounts: [5000],
    gross: 7000,
    taxable: 2000,
    early: 0,
    tax: 19547,
  },
] as const;

export async function rothReturnSource(
  row: typeof rothCases[number],
  n: number,
) {
  const owner = "spouse" in row && row.spouse ? "S" : "T";
  const ownerSsn = owner === "S" ? "444556666" : "111223333";
  const account = "ACCOUNT-ROTH-CURRENT";
  const payer = "123456790";
  const prefix = `roth-${n}`;
  const contributions = row.years.map((year, index) => {
    const custodian = index === row.years.length - 1 ? payer : "223456790";
    const accountNumber = index === row.years.length - 1
      ? account
      : "ACCOUNT-ROTH-OTHER";
    return {
      form5498: {
        source_document_reference: `${prefix}-issued5498-${year}-${index}`,
        tax_year: year,
        owner_ssn: ownerSsn,
        custodian_ein: custodian,
        account_number: accountNumber,
        roth_ira_confirmed: true as const,
        box10_roth_contributions: row.amounts[index],
        box2_rollover_contributions: 0 as const,
        box3_roth_conversion_amount: 0 as const,
      },
      receipts: [{
        source_document_reference:
          `${prefix}-contribution-receipt-${year}-${index}`,
        owner_ssn: ownerSsn,
        custodian_ein: custodian,
        account_number: accountNumber,
        designated_tax_year: year,
        received_on: `${year}-02-01`,
        amount: row.amounts[index],
      }],
    };
  });
  const review = rothActivityReviewSchema.parse({
    owner_identity: {
      source_document_reference: `${prefix}-owner-birth-record`,
      owner_ssn: ownerSsn,
      date_of_birth: row.birth,
    },
    inventory: {
      source_document_reference: `${prefix}-complete-owned-account-review`,
      owner_ssn: ownerSsn,
      accounts: contributions.map((item) => ({
        custodian_ein: item.form5498.custodian_ein,
        account_number: item.form5498.account_number,
      })),
      all_owned_roth_iras_and_activity_included: true,
      all_owned_accounts_are_ordinary_roth_not_sep_or_simple: true,
      no_contributions_before_listed_inventory: true,
      no_prior_distributions_or_returned_contributions: true,
      no_conversions_or_qualified_plan_rollovers: true,
      no_inherited_accounts_or_transferred_basis: true,
      all_regular_contributions_eligible_no_excess_confirmed: true,
      no_other_current_roth_distribution: true,
      no_homebuyer_disaster_repayment_qcd_hsa_or_rollover: true,
    },
    contributions,
    payment: {
      source_document_reference: `${prefix}-actual-custodian-payment`,
      owner_ssn: ownerSsn,
      custodian_ein: payer,
      account_number: account,
      distribution_reference: `${prefix}-payment-1`,
      distributed_on: "2025-10-01",
      gross_distribution: row.gross,
      distribution_code: row.code,
    },
    form1099r_source_document_reference: `4852-completed-${n}`,
  });
  const qualified = "qualified" in row && row.qualified;
  const entered = substitute(FormType.R_1099, n, {
    recipient_ssn: ownerSsn,
    subject_ts: owner,
    account_number: account,
    distribution_reference: review.payment.distribution_reference,
    gross_distribution: row.gross,
    taxable_amount_not_determined: true,
    distribution_code: row.code,
    is_ira: false,
    federal_withheld: 1000,
    retirement_source: {
      payer_name: "Reviewed Retirement Custodian",
      payer_ein: payer,
      account_number: account,
      recipient_ssn: ownerSsn,
      ts: owner,
      box1_gross_distribution: row.gross,
      box2b_not_determined: true,
      box4_federal_withheld: 1000,
      box7_distribution_code: row.code,
      box7_ira_simple_indicator: false,
      box13_date_of_payment: "2025-10-01",
      exclude_8606_roth: !qualified,
      roth_activity_review: review,
    },
  });
  const item = itemSchema.parse({
    ...entered,
    distribution_source: {
      ...entered.distribution_source,
      taxable_amount: undefined,
      taxable_amount_not_determined: true,
      paid_on: "2025-10-01",
    },
  });
  const filer = owner === "S"
    ? {
      ...form4852Filer,
      filingStatus: FilingStatus.MarriedFilingJointly,
      nameLine1: "ALEX AND SAM EXAMPLE",
      spouse: {
        firstName: "Sam",
        lastName: "Example",
        ssn: ownerSsn,
        nameControl: "EXAM",
      },
    }
    : form4852Filer;
  const base = form4852BaseInputs(owner === "S");
  const inputs = {
    ...base,
    general: {
      ...base.general,
      ...(owner === "S"
        ? { spouse_dob: row.birth }
        : { taxpayer_dob: row.birth }),
    },
    w2: [{
      employer_name: "Other Payroll Employer",
      employer_ein: "22-3456789",
      employer_address_line1: "3 Source Way",
      employer_address_city: "Sacramento",
      employer_address_state: "CA",
      employer_address_zip: "95814",
      employee_ssn: "111223333",
      source_document_reference: `${prefix}-issued-ordinary-W2`,
      box1_wages: 125000,
      box2_fed_withheld: 20000,
      box3_ss_wages: 125000,
      box4_ss_withheld: 7750,
      box5_medicare_wages: 125000,
      box6_medicare_withheld: 1812.5,
    }],
  };
  const retained = await retainedForm4852Sources(
    [item],
    filer,
    await officialForm4852EvidenceTemplate("f4852"),
  );
  for (const facts of rothActivityDocuments(review)) {
    const bytes = new TextEncoder().encode(JSON.stringify(facts));
    retained.documents.push({
      document_reference: facts.source_document_reference,
      bytes,
    });
    retained.reviewed_source.records[0].treatment_documents.push({
      document_reference: facts.source_document_reference,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    });
  }
  return {
    inputs: {
      ...inputs,
      f4852: [item],
      f4852_reviewed_source: { reviewed_source: retained.reviewed_source },
    },
    filer,
    item,
    review,
    retained,
  };
}
