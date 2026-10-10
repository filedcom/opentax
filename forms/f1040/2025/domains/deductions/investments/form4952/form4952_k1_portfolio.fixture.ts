import { z } from "zod";
import { FilingStatus } from "../../../../../nodes/types.ts";
import { inputSchema as generalSchema } from "../../../../../nodes/inputs/general/filing/general/index.ts";
import { w2ItemSchema as wageSchema } from "../../../../../nodes/inputs/income/wages/w2/index.ts";
import { pdfReviewFixtures } from "../../../../pdf/review-fixtures.ts";
import { withSyntheticForm1098Copy } from "../../../../pdf/reviews/deductions/mortgage/review-1098-copy.fixture.ts";
const base =
  pdfReviewFixtures.find((row) => row.id === "single-w2-refund")!.inputs;
const wage = z.array(wageSchema).parse(base.w2)[0];
const general = generalSchema.parse(base.general);
const amt = {
  prior_year_disallowed_interest: 0,
  interest_on_private_activity_bonds: 0,
  other_gross_income_adjustment: 0,
  qualified_dividends_adjustment: 0,
  net_disposition_gain_adjustment: 0,
  net_capital_gain_adjustment: 0,
  investment_expenses_adjustment: 0,
};
export const k1PortfolioCases = [
  {
    id: "single-limited",
    joint: false,
    bank: 500,
    treasury: 300,
    oid: 200,
    div: 1200,
    qualified: 400,
    paid: 2000,
    allowed: 1800,
    tax: 21707,
  },
  {
    id: "single-full",
    joint: false,
    bank: 500,
    treasury: 300,
    oid: 200,
    div: 1200,
    qualified: 400,
    paid: 700,
    allowed: 700,
    tax: 21971,
  },
  {
    id: "joint-spouse-sources",
    joint: true,
    bank: 500,
    treasury: 300,
    oid: 200,
    div: 1200,
    qualified: 400,
    paid: 2000,
    allowed: 1800,
    tax: 25088,
  },
  {
    id: "single-qualified-exclusion",
    joint: false,
    bank: 500,
    treasury: 300,
    oid: 200,
    div: 1200,
    qualified: 1200,
    paid: 2000,
    allowed: 1000,
    tax: 21827,
  },
  {
    id: "single-multiple-payers",
    joint: false,
    bank: 900,
    treasury: 600,
    oid: 500,
    div: 1500,
    qualified: 500,
    paid: 4000,
    allowed: 3000,
    tax: 21722,
  },
  {
    id: "joint-multiple-payers",
    joint: true,
    bank: 900,
    treasury: 600,
    oid: 500,
    div: 1500,
    qualified: 500,
    paid: 4000,
    allowed: 3000,
    tax: 25103,
  },
];
export async function k1PortfolioInputs(
  entry: typeof k1PortfolioCases[number],
) {
  const other = entry.joint ? "222334444" : "111223333";
  const mortgage = await withSyntheticForm1098Copy(entry.id, {
    lender_name: "Home Lender",
    recipient_tin: "111223333",
    source_document_reference: "mortgage-copy",
    box1_mortgage_interest: 40000,
    box1_current_year_deductible_interest: 40000,
    box1_deduction_workpaper_reference: "mortgage-workpaper",
    for_routing: "A",
  });
  const wages = entry.joint ? 200000 : 160000;
  return {
    ...base,
    general: {
      ...general,
      filing_status: entry.joint ? FilingStatus.MFJ : FilingStatus.Single,
      ...(entry.joint
        ? {
          spouse_first_name: "Morgan",
          spouse_last_name: "Example",
          spouse_ssn: "222-33-4444",
          spouse_dob: "1981-04-10",
        }
        : {}),
    },
    w2: [{
      ...wage,
      box1_wages: wages,
      box2_fed_withheld: 30000,
      box3_ss_wages: Math.min(wages, 176100),
      box4_ss_withheld: Math.min(wages, 176100) * .062,
      box5_medicare_wages: wages,
      box6_medicare_withheld: wages * .0145,
    }],
    f1098: [mortgage],
    k1_partnership: [
      {
        partnership_name: "Portfolio One",
        partnership_ein: "123456789",
        source_document_reference: "k1-one",
        recipient_tin: "111223333",
        box13_code_h_investment_interest: entry.paid / 2,
      },
      {
        partnership_name: "Portfolio Two",
        partnership_ein: "234567890",
        source_document_reference: "k1-two",
        recipient_tin: other,
        box13_code_h_investment_interest: entry.paid / 2,
      },
    ],
    f1099int: [
      {
        payer_name: "Bank",
        recipient_tin: "111223333",
        source_document_reference: "bank",
        box1: entry.bank,
        investment_property_for_form4952: true,
      },
      {
        payer_name: "Treasury",
        recipient_tin: other,
        source_document_reference: "treasury",
        box3: entry.treasury,
        investment_property_for_form4952: true,
      },
    ],
    f1099oid: [{
      payer_name: "OID Bond",
      recipient_tin: other,
      source_document_reference: "oid",
      box1_oid: entry.oid,
      investment_property_for_form4952: true,
    }],
    f1099div: [
      {
        payerName: "Fund One",
        recipient_tin: "111223333",
        source_document_reference: "div-one",
        box1a: entry.div / 2,
        box1b: entry.qualified / 2,
        isNominee: false,
        box11: false,
        investment_property_for_form4952: true,
      },
      {
        payerName: "Fund Two",
        recipient_tin: other,
        source_document_reference: "div-two",
        box1a: entry.div / 2,
        box1b: entry.qualified / 2,
        isNominee: false,
        box11: false,
        investment_property_for_form4952: true,
      },
    ],
    schedule_b_part_iii: {
      foreign_accounts_question: false,
      foreign_trust_question: false,
    },
    form4952: { amt_refigure: amt },
  };
}
