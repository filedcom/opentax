import { bonusFilerFixture } from "../../../credits/business/form3800/form8911_bonus_fixture.ts";
import { FilingStatus } from "../../../../../nodes/types.ts";
import { inputSchema as w2Schema } from "../../../../../nodes/inputs/income/wages/w2/index.ts";
import {
  section179Cases,
  section179InventoryInput,
} from "./section179-inventory.fixture.ts";
import {
  section179HealthCases,
  section179HealthInput,
} from "./section179-health.fixture.ts";

export const section179JointWageCases = [
  {
    id: "joint-spouse-wages",
    split: false,
    sharedEmployer: false,
    large: false,
    health: false,
    activeIncome: 62000,
    limit: 10000,
    credit: 480,
    tax: 3567,
    refund: 3433,
    qbi: 1859,
    taxable: 25934,
    regularTax: 2634,
  },
  {
    id: "joint-distinct-employers",
    split: true,
    sharedEmployer: false,
    large: true,
    health: false,
    activeIncome: 80000,
    limit: 80000,
    credit: 4800,
    tax: 1413,
    refund: 5587,
    qbi: 1859,
    taxable: 25934,
    regularTax: 2634,
  },
  {
    id: "joint-shared-employer",
    split: true,
    sharedEmployer: true,
    large: true,
    health: false,
    activeIncome: 80000,
    limit: 80000,
    credit: 4800,
    tax: 1413,
    refund: 5587,
    qbi: 1859,
    taxable: 25934,
    regularTax: 2634,
  },
  {
    id: "joint-spouse-wages-primary-health",
    split: false,
    sharedEmployer: false,
    large: false,
    health: true,
    activeIncome: 56000,
    limit: 10000,
    credit: 480,
    tax: 3046,
    refund: 3954,
    qbi: 659,
    taxable: 21134,
    regularTax: 2113,
  },
] as const;

export function section179JointWageInput(
  scenario: typeof section179JointWageCases[number],
) {
  const source = section179InventoryInput(section179Cases[0]);
  const health = section179HealthInput(section179HealthCases[0]);
  const wage = w2Schema.parse({ w2s: bonusFilerFixture.inputs.w2 }).w2s[0];
  const wages = scenario.split
    ? [
      {
        ...wage,
        employee_ssn: "111223333",
        source_document_reference: `${scenario.id}-primary-issued-W2`,
        box1_wages: 20000,
        box2_fed_withheld: 2800,
        box3_ss_wages: 20000,
        box4_ss_withheld: 1240,
        box5_medicare_wages: 20000,
        box6_medicare_withheld: 290,
      },
      {
        ...wage,
        employee_ssn: "222334444",
        source_document_reference: `${scenario.id}-spouse-issued-W2`,
        employer_ein: scenario.sharedEmployer
          ? wage.employer_ein
          : "98-7654321",
        employer_name: scenario.sharedEmployer
          ? wage.employer_name
          : "Spouse Employer",
        box1_wages: 30000,
        box2_fed_withheld: 4200,
        box3_ss_wages: 30000,
        box4_ss_withheld: 1860,
        box5_medicare_wages: 30000,
        box6_medicare_withheld: 435,
      },
    ]
    : [{
      ...wage,
      employee_ssn: "222334444",
      source_document_reference: `${scenario.id}-spouse-issued-W2`,
    }];
  return {
    ...source,
    general: {
      ...source.general,
      filing_status: FilingStatus.MFJ,
      spouse_first_name: "Sam",
      spouse_last_name: "Example",
      spouse_ssn: "222334444",
      spouse_dob: "1987-03-10",
    },
    w2: wages,
    schedule_c: source.schedule_c.map((c) => ({
      ...c,
      line_1_gross_receipts: scenario.large ? 69104 : c.line_1_gross_receipts,
      line_13_depreciation: scenario.large ? 59104 : c.line_13_depreciation,
    })),
    f8911: {
      properties: source.f8911!.properties.map((p) => ({
        ...p,
        cost: scenario.large ? 100000 : p.cost,
        business_source: {
          ...p.business_source,
          section179_deduction: scenario.large ? 20000 : 2000,
        },
      })),
    },
    form4562: {
      current_year_inventory: {
        ...source.form4562.current_year_inventory,
        assets: source.form4562.current_year_inventory.assets.map((a) => ({
          ...a,
          cost: scenario.large ? 100000 : a.cost,
          section179_deduction: scenario.large ? 20000 : 2000,
          credit_basis_reduction: scenario.credit,
        })),
        section179_election: {
          ...source.form4562.current_year_inventory.section179_election,
          filing_status: FilingStatus.MFJ,
          taxpayer_active_business_income: scenario.activeIncome,
          active_business_income_review_reference:
            "Joint issued W2 owners plus primary Schedule C before section179/half-SE, after health",
        },
      },
    },
    ...(scenario.health ? { form7206: health.form7206 } : {}),
  };
}
