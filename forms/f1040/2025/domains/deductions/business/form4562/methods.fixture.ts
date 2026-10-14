import {
  currentYearInput,
  currentYearMultiInput,
} from "./current-year.fixture.ts";
import { bonusElectionInput, electionCases } from "./elections.fixture.ts";
import {
  DepreciationMethod,
  methodElectionReviewSchema,
} from "../../../../../nodes/intermediate/forms/deductions/business/form4562/method-elections.ts";

export const methodCases = [
  {
    id: "150-half-year",
    source: "early",
    deductions: [4606],
    bonuses: [3760],
    methods: [DepreciationMethod.Declining150],
    credit: 600,
    tax: 5576,
  },
  {
    id: "straight-line-opt-out",
    source: "out",
    deductions: [940],
    bonuses: [0],
    methods: [DepreciationMethod.StraightLine],
    credit: 600,
    tax: 5576,
  },
  {
    id: "150-reduced-mid-quarter",
    source: "reduced",
    deductions: [3972],
    bonuses: [3760],
    methods: [DepreciationMethod.Declining150],
    credit: 600,
    tax: 5576,
  },
  {
    id: "straight-line-two-businesses",
    source: "two",
    deductions: [4465, 18800],
    bonuses: [3760, 18800],
    methods: [DepreciationMethod.StraightLine],
    credit: 1800,
    tax: 9799,
  },
  {
    id: "six-class-methods-and-bonus",
    source: "six",
    deductions: [13210],
    bonuses: [7760],
    methods: [
      DepreciationMethod.Declining150,
      DepreciationMethod.Declining150,
      DepreciationMethod.Declining150,
      DepreciationMethod.Declining150,
      DepreciationMethod.StraightLine,
      DepreciationMethod.StraightLine,
    ],
    credit: 600,
    tax: 5576,
  },
] as const;

export function methodElectionInput(scenario: typeof methodCases[number]) {
  const source = scenario.source === "early"
    ? currentYearInput()
    : scenario.source === "two"
    ? currentYearMultiInput("mixed-bonus")
    : bonusElectionInput(
      electionCases[
        scenario.source === "out" ? 0 : scenario.source === "reduced" ? 1 : 4
      ],
    );
  const inventory = source.form4562.current_year_inventory;
  const periods = [
    ...new Set(inventory.assets.map((a) => a.macrs_recovery_period_years)),
  ];
  const review = methodElectionReviewSchema.parse({
    proprietor_ssn: inventory.assets[0].proprietor_ssn,
    classes: periods.map((period, i) => ({
      recovery_period: period,
      method: scenario.methods[i],
    })),
    taxpayer_authorized_confirmed: true,
    timely_original_return_confirmed: true,
    filing_timeliness_review_reference:
      "reviewed-original-2025-return-extension",
    election_review_reference: `${scenario.id}-method-election-review`,
    reviewed_by: "Synthetic reviewer",
    reviewed_on: "2026-10-09",
  });
  return {
    ...source,
    form4562: {
      current_year_inventory: {
        ...inventory,
        method_election: review,
        assets: inventory.assets.map((a) => ({
          ...a,
          no_depreciation_method_election: false,
        })),
      },
    },
    schedule_c: source.schedule_c.map((c, i) => ({
      ...c,
      line_1_gross_receipts: c.line_1_gross_receipts - c.line_13_depreciation +
        scenario.deductions[i],
      line_13_depreciation: scenario.deductions[i],
    })),
  };
}
