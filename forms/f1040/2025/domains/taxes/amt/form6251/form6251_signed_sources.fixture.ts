import { itemSchema as trustSchema } from "../../../../../nodes/inputs/income/rental-passthrough/k1_trust/index.ts";
import { itemSchema as businessSchema } from "../../../../../nodes/inputs/income/business/schedule_c/model.ts";
import { inputSchema as generalSchema } from "../../../../../nodes/inputs/general/filing/general/index.ts";
import { w2ItemSchema } from "../../../../../nodes/inputs/income/wages/w2/index.ts";
import { FilingStatus, TS } from "../../../../../nodes/types.ts";

function trust(id: number, adjustment: number, spouse = false, qualified = 0) {
  return trustSchema.parse({
    estate_trust_name: `Reviewed Trust ${id}`,
    entity_type: "trust",
    estate_trust_ein: String(120000000 + id),
    source_document_reference: `issued-2025-trust-${id}-K1`,
    source_tax_year: 2025,
    beneficiary_ssn: spouse ? "444556666" : "123456789",
    box12_code_a_amt_adjustment: adjustment,
    box12_codes_b_through_f_absent: true,
    box12_codes_g_through_i_absent: true,
    ...(qualified > 0
      ? {
        box2a_ordinary_dividends: qualified,
        box2b_qualified_dividends: qualified,
      }
      : {}),
  });
}
function mine(
  id: string,
  values: readonly (readonly [number, number])[],
  owner = TS.T,
) {
  const regular = values.reduce((sum, [amount]) => sum + amount, 0);
  return businessSchema.parse({
    line_a_principal_business: "Natural resource extraction",
    line_b_business_code: "212000",
    line_c_business_name: id,
    business_reference: id,
    proprietor_recipient: owner,
    line_f_accounting_method: "cash",
    line_g_material_participation: true,
    line_i_made_1099_payments: false,
    line_1_gross_receipts: regular,
    line_12_depletion: regular,
    qbi_no_other_adjustments_confirmed: true,
    amt_depletion_worksheet: {
      source_reference: `${id}-2025-property-income-and-basis-review`,
      all_property_income_and_basis_limits_applied_verified: true,
      no_at_risk_or_basis_limitation_verified: true,
      properties: values.map(([regular, amt], i) => ({
        property_reference: `${id}-property-${i + 1}`,
        regular_allowed_depletion: regular,
        amt_allowed_depletion: amt,
      })),
    },
  });
}
function inputs(
  trusts: ReturnType<typeof trust>[],
  businesses: ReturnType<typeof mine>[] = [],
  joint = false,
) {
  return {
    general: generalSchema.parse({
      filing_status: joint ? FilingStatus.MFJ : FilingStatus.Single,
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Taxpayer",
      taxpayer_ssn: "123-45-6789",
      taxpayer_dob: "1985-06-15",
      ...(joint
        ? {
          spouse_first_name: "Sam",
          spouse_last_name: "Taxpayer",
          spouse_ssn: "444-55-6666",
          spouse_dob: "1982-05-20",
        }
        : {}),
      address_line1: "1 Main St",
      address_city: "Austin",
      address_state: "TX",
      address_zip: "78701",
      digital_assets: false,
      qbi_no_prior_loss_or_suspended_loss_confirmed: true,
      qbi_not_patron_of_specified_cooperative_confirmed: true,
    }),
    w2: [w2ItemSchema.parse({
      employee_ssn: "123456789",
      source_document_reference: "2025-primary-employer-issued-W2",
      box1_wages: 200000,
      box2_fed_withheld: 35000,
      box3_ss_wages: 176100,
      box4_ss_withheld: 10918.2,
      box5_medicare_wages: 200000,
      box6_medicare_withheld: 2900,
      employer_ein: "123456789",
      employer_name: "Test Employer",
      employer_address_line1: "10 Payroll Way",
      employer_address_city: "Austin",
      employer_address_state: "TX",
      employer_address_zip: "78701",
    })],
    k1_trust: trusts,
    schedule_c: businesses,
    schedule_b_part_iii: {
      foreign_accounts_question: false,
      fincen_form114_required: false,
      foreign_trust_question: false,
    },
  };
}
const mixedMine = mine("Mixed Property Mine", [[180000, 20000], [
  20000,
  30000,
]]);
const negativeMine = mine("Negative Adjustment Mine", [[40000, 70000]]);
export const signedSourceCases = [
  {
    id: "trust-two-signed",
    inputs: inputs([trust(1, 200000), trust(2, -10000)]),
    trust: 190000,
    depletion: 0,
    regularTax: 37067,
    amt: 42683,
    totalTax: 79750,
  },
  {
    id: "trust-five-signed",
    inputs: inputs([
      trust(1, 120000),
      trust(2, 100000),
      trust(3, -10000),
      trust(4, -20000),
      trust(5, 50000),
    ]),
    trust: 240000,
    depletion: 0,
    regularTax: 37067,
    amt: 56683,
    totalTax: 93750,
  },
  {
    id: "trust-spouse",
    inputs: inputs([trust(1, 200000, true), trust(2, -10000, true)], [], true),
    trust: 190000,
    depletion: 0,
    regularTax: 26898,
    amt: 39160,
    totalTax: 66058,
  },
  {
    id: "trust-both-owners",
    inputs: inputs(
      [
        trust(1, 150000),
        trust(2, -10000),
        trust(3, 120000, true),
        trust(4, -20000, true),
      ],
      [],
      true,
    ),
    trust: 240000,
    depletion: 0,
    regularTax: 26898,
    amt: 53160,
    totalTax: 80058,
  },
  {
    id: "depletion-mixed-properties",
    inputs: inputs([], [mixedMine]),
    trust: 0,
    depletion: 150000,
    regularTax: 37067,
    amt: 31483,
    totalTax: 68550,
  },
  {
    id: "depletion-both-owners",
    inputs: inputs([], [
      mine("Primary Mine", [[200000, 20000]]),
      mine("Spouse Mine", [[40000, 70000]], TS.S),
    ], true),
    trust: 0,
    depletion: 150000,
    regularTax: 26898,
    amt: 28482,
    totalTax: 55380,
  },
  {
    id: "negative-trust-with-depletion",
    inputs: inputs([trust(1, -20000)], [mixedMine]),
    trust: -20000,
    depletion: 150000,
    regularTax: 37067,
    amt: 25883,
    totalTax: 62950,
  },
  {
    id: "negative-depletion-with-trust",
    inputs: inputs([trust(1, 200000)], [negativeMine]),
    trust: 200000,
    depletion: -30000,
    regularTax: 37067,
    amt: 37083,
    totalTax: 74150,
  },
  {
    id: "trust-qualified-dividends",
    inputs: inputs([trust(1, 200000, false, 10000), trust(2, -10000)]),
    trust: 190000,
    depletion: 0,
    regularTax: 38567,
    amt: 42683,
    totalTax: 81630,
  },
  {
    id: "negative-trust-no-form",
    inputs: inputs([trust(1, -20000), trust(2, -10000)]),
    trust: -30000,
    depletion: 0,
    regularTax: 37067,
    amt: 0,
    totalTax: 37067,
  },
  {
    id: "negative-depletion-no-form",
    inputs: inputs([], [negativeMine]),
    trust: 0,
    depletion: -30000,
    regularTax: 37067,
    amt: 0,
    totalTax: 37067,
  },
];
