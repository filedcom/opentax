import {
  type Form7217Item,
  Form7217PropertyTreatment,
  inputSchema,
} from "../../../../../nodes/inputs/income/business/f7217/index.ts";
import { inputSchema as generalSchema } from "../../../../../nodes/inputs/general/filing/general/index.ts";
import { w2ItemSchema } from "../../../../../nodes/inputs/income/wages/w2/index.ts";
import { FilingStatus } from "../../../../../nodes/types.ts";

function property(
  id: string,
  basis: number,
  fmv: number,
  partnerBasis: number,
  inventory = false,
) {
  return {
    description: id,
    property_treatment: Form7217PropertyTreatment.Section732Property,
    section_732c_class: inventory
      ? "inventory_or_receivable" as const
      : "other_property" as const,
    partnership_basis_before_distribution: basis,
    fair_market_value: fmv,
    partner_basis_after_section_732: partnerBasis,
  };
}

function distribution(
  id: number,
  properties: ReturnType<typeof property>[],
  basis: number,
  cash: number,
  liquidation = false,
): Form7217Item {
  return inputSchema.parse({
    form7217s: [{
      partnership_name: `Reviewed Partnership ${id}`,
      partnership_ein: String(120000000 + id),
      distribution_date: "2025-09-01",
      complete_liquidation: liquidation,
      section_751b_sale_or_exchange: false,
      partner_adjusted_basis_before_distribution: basis,
      cash_received: cash,
      section_732c_allocation_workpaper_reference:
        `2025-${id}-732c-property-ledger`,
      distributed_properties: properties,
    }],
  }).form7217s[0];
}

function unchanged(count: number, id = count) {
  return distribution(
    id,
    Array.from(
      { length: count },
      (_, i) => property(`Asset ${i + 1}`, 100, 200, 100),
    ),
    count * 100 + 1000,
    100,
  );
}

const increase = distribution(
  63,
  Array.from({ length: 21 }, (_, i) => [
    property(`Inventory ${i + 1}`, 100, 200, 100, true),
    property(`Asset X ${i + 1}`, 50, 400, 440),
    property(`Asset Y ${i + 1}`, 100, 100, 110),
  ]).flat(),
  15750,
  2100,
  true,
);

const decrease = distribution(
  64,
  Array.from({ length: 21 }, (_, i) => [
    property(`Inventory ${i + 1}`, 100, 100, 100, true),
    property(`Asset A ${i + 1}`, 300, 200, 150),
    property(`Asset B ${i + 1}`, 200, 200, 150),
  ]).flat(),
  9450,
  1050,
);

const inventoryPriority = distribution(
  65,
  [
    ...Array.from(
      { length: 31 },
      (_, i) => property(`Inventory ${i + 1}`, 100, 50, 50, true),
    ),
    ...Array.from(
      { length: 30 },
      (_, i) => property(`Other asset ${i + 1}`, 100, 100, 0),
    ),
  ],
  1650,
  100,
  true,
);

function gain(id: number, longTerm: boolean, count = 31) {
  const item = distribution(
    id,
    Array.from(
      { length: count },
      (_, i) => property(`Gain asset ${i + 1}`, 100, 200, 0),
    ),
    10000,
    15000,
  );
  return inputSchema.parse({
    form7217s: [{
      ...item,
      us_tax_required_on_gain: true,
      section_731_capital_gain_source: {
        k1_document_reference: `issued-2025-${id}-K1`,
        k1_box19_statement_reference: `issued-2025-${id}-box19-0901`,
        k1_box19_statement_distribution_date: item.distribution_date,
        k1_partner_ssn: "123456789",
        k1_partnership_ein: item.partnership_ein,
        k1_box19_code_a_cash: 14000,
        k1_box19_code_d_deemed_cash: 1000,
        k1_box19_code_c_property_basis: count * 100,
        k1_box19_code_c_property_fmv: count * 200,
        k1_box19_code_b_section737_property: 0,
        k1_box19_code_f_service_cash: 0,
        k1_box19_code_g_service_property: 0,
        outside_basis_workpaper_reference: `2025-${id}-outside-basis`,
        outside_basis_workpaper_as_of_date: item.distribution_date,
        opening_outside_basis: 8000,
        increases_before_distribution: 4000,
        decreases_before_distribution: 2000,
        partnership_interest_acquired_date: longTerm
          ? "2020-01-01"
          : "2025-01-01",
        entire_interest_has_one_holding_period: true,
        not_section707_disguised_sale: true,
      },
    }],
  }).form7217s[0];
}

function inputs(items: Form7217Item[]) {
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
    f7217: inputSchema.parse({ form7217s: items }),
  };
}

export const distributionPackets = [
  {
    id: "two-partnership-properties",
    inputs: inputs([unchanged(30, 80), unchanged(61, 81)]),
    gain: 0,
    tax: 25067,
  },
  {
    id: "thirty-properties",
    inputs: inputs([unchanged(30)]),
    gain: 0,
    tax: 25067,
  },
  {
    id: "thirty-one-properties",
    inputs: inputs([unchanged(31)]),
    gain: 0,
    tax: 25067,
  },
  {
    id: "sixty-one-properties",
    inputs: inputs([unchanged(61)]),
    gain: 0,
    tax: 25067,
  },
  {
    id: "liquidating-increase",
    inputs: inputs([increase]),
    gain: 0,
    tax: 25067,
  },
  {
    id: "nonliquidating-decrease",
    inputs: inputs([decrease]),
    gain: 0,
    tax: 25067,
  },
  {
    id: "inventory-priority",
    inputs: inputs([inventoryPriority]),
    gain: 0,
    tax: 25067,
  },
  {
    id: "long-term-gain",
    inputs: inputs([gain(71, true)]),
    gain: 5000,
    tax: 25817,
  },
  {
    id: "short-term-gain",
    inputs: inputs([gain(72, false)]),
    gain: 5000,
    tax: 26267,
  },
  {
    id: "two-partnership-gains",
    inputs: inputs([gain(73, true), gain(74, false, 61)]),
    gain: 10000,
    tax: 27017,
  },
];
