import {
  type F6252Item,
  itemSchema,
} from "../../../../../nodes/intermediate/forms/income/investments/form6252/index.ts";
import { inputSchema as generalSchema } from "../../../../../nodes/inputs/general/filing/general/index.ts";
import { itemSchema as interestSchema } from "../../../../../nodes/inputs/income/investments/f1099int/index.ts";
import { w2ItemSchema } from "../../../../../nodes/inputs/income/wages/w2/index.ts";
import { FilingStatus } from "../../../../../nodes/types.ts";

// Synthetic reviewed facts, not authenticated closing or accepted-return records.
const land = itemSchema.parse({
  property_description: "Investment land",
  date_acquired: "2020-01-01",
  date_sold: "2025-03-01",
  sold_to_related_party: false,
  selling_price_determinable: true,
  selling_price: 100000,
  cost_basis: 40000,
  payments_received: 20000,
  is_capital_asset: true,
});
const shortTerm = { ...land, date_acquired: "2025-01-01" };
const belowBasis = { ...land, mortgage_assumed: 30000, selling_expenses: 5000 };
const aboveBasis = {
  ...land,
  mortgage_assumed: 60000,
  payments_received: 10000,
};
const laterYear = itemSchema.parse({
  ...aboveBasis,
  date_sold: "2024-03-01",
  payments_received: 30000,
  payments_received_prior_years: 30000,
  prior_year_form6252_source: {
    filed_form_reference: "Reviewed 2024 investment-land Form 6252",
    property_description: land.property_description,
    date_acquired: land.date_acquired,
    date_sold: "2024-03-01",
    line16_gross_profit: 60000,
    line18_contract_price: 60000,
    line19_gross_profit_ratio: 1,
    line20_year_of_sale_payment: 20000,
    line22_total_payments: 30000,
    line23_prior_payments: 0,
    line26_gain: 30000,
  },
});
const businessLand = itemSchema.parse({
  ...land,
  property_description: "Business land",
  selling_price: 80000,
  is_capital_asset: false,
});

function inputs(sales: F6252Item[], interest: number[]) {
  return {
    general: generalSchema.parse({
      filing_status: FilingStatus.Single,
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Taxpayer",
      taxpayer_ssn: "123-45-6789",
      taxpayer_dob: "1985-06-15",
      address_line1: "1 Main St",
      address_city: "Austin",
      address_state: "TX",
      address_zip: "78701",
      digital_assets: false,
    }),
    w2: [w2ItemSchema.parse({
      employee_ssn: "123456789",
      source_document_reference: "2025-primary-employer-issued-W2",
      box1_wages: 150000,
      box2_fed_withheld: 25000,
      box3_ss_wages: 150000,
      box4_ss_withheld: 9300,
      box5_medicare_wages: 150000,
      box6_medicare_withheld: 2175,
      employer_ein: "123456789",
      employer_name: "Test Employer",
      employer_address_line1: "10 Payroll Way",
      employer_address_city: "Austin",
      employer_address_state: "TX",
      employer_address_zip: "78701",
    })],
    form6252: sales,
    f1099int: interest.map((amount, index) =>
      interestSchema.parse({
        payer_name: `Land Buyer ${index + 1}`,
        payer_tin: String(120000001 + index),
        recipient_tin: "123456789",
        source_document_reference: `2025-buyer-${index + 1}-interest-copy`,
        account_number: `LAND-${index + 1}`,
        seller_financed: true,
        buyer_used_as_personal_residence: false,
        box1: amount,
      })
    ),
    schedule_b_part_iii: {
      foreign_accounts_question: false,
      foreign_trust_question: false,
    },
  };
}

// Amounts use the printed five-decimal gross-profit ratio and 2025 single
// ordinary/preferential rates. No 28% gain, unrecaptured gain, AMT or NIIT.
export const paymentPackets = [
  {
    id: "current-short-term",
    inputs: inputs([shortTerm], [2000]),
    gains: [12000],
    shortTerm: 12000,
    longTerm: 0,
    business: 0,
    interest: 2000,
    tax: 28427,
  },
  {
    id: "current-mortgage-below-basis",
    inputs: inputs([belowBasis], [3500]),
    gains: [15714],
    shortTerm: 0,
    longTerm: 15714,
    business: 0,
    interest: 3500,
    tax: 28264,
  },
  {
    id: "current-mortgage-above-basis",
    inputs: inputs([aboveBasis], [3000]),
    gains: [30000],
    shortTerm: 0,
    longTerm: 30000,
    business: 0,
    interest: 3000,
    tax: 30287,
  },
  {
    id: "later-year-final-payment",
    inputs: inputs([laterYear], [3000]),
    gains: [30000],
    shortTerm: 0,
    longTerm: 30000,
    business: 0,
    interest: 3000,
    tax: 30287,
  },
  {
    id: "later-year-interest-only",
    inputs: inputs([{ ...laterYear, payments_received: 0 }], [2000]),
    gains: [0],
    shortTerm: 0,
    longTerm: 0,
    business: 0,
    interest: 2000,
    tax: 25547,
  },
  {
    id: "mixed-capital-business-sales",
    inputs: inputs([shortTerm, belowBasis, businessLand], [2000, 3500, 2000]),
    gains: [12000, 15714, 10000],
    shortTerm: 12000,
    longTerm: 15714,
    business: 10000,
    interest: 7500,
    tax: 33604,
  },
];
