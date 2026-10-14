import {
  currentYearInput,
  currentYearMultiInput,
} from "./current-year.fixture.ts";
import { bonusElectionReviewSchema } from "../../../../../nodes/intermediate/forms/deductions/business/form4562/elections.ts";

export const electionCases = [
  {
    id: "opt-out-half-year",
    source: "single",
    out: [5],
    reduced: false,
    deductions: [1880],
    bonuses: [0],
    credit: 600,
    tax: 5576,
  },
  {
    id: "reduced-mid-quarter",
    source: "late",
    out: [],
    reduced: true,
    deductions: [4042],
    bonuses: [3760],
    credit: 600,
    tax: 5576,
  },
  {
    id: "opt-out-two-businesses",
    source: "mixed-bonus",
    out: [5],
    reduced: false,
    deductions: [2350, 940],
    bonuses: [0, 0],
    credit: 1800,
    tax: 9799,
  },
  {
    id: "reduced-two-businesses",
    source: "mixed-bonus",
    out: [],
    reduced: true,
    deductions: [5170, 8084],
    bonuses: [3760, 7520],
    credit: 1800,
    tax: 9799,
  },
  {
    id: "six-class-combined",
    source: "six-classes",
    out: [3, 7, 15, 20],
    reduced: true,
    deductions: [15125],
    bonuses: [7760],
    credit: 600,
    tax: 5576,
  },
] as const;

export function bonusElectionInput(scenario: typeof electionCases[number]) {
  const source = scenario.source === "single"
    ? currentYearInput()
    : scenario.source === "late"
    ? currentYearInput(true)
    : currentYearMultiInput(scenario.source);
  const inventory = source.form4562.current_year_inventory;
  const review = bonusElectionReviewSchema.parse({
    proprietor_ssn: inventory.assets[0].proprietor_ssn,
    elected_out_recovery_periods: scenario.out,
    reduced_bonus_40_percent: scenario.reduced,
    taxpayer_authorized_confirmed: true,
    timely_original_return_confirmed: true,
    filing_timeliness_review_reference:
      "reviewed-original-2025-return-extension",
    election_review_reference: `${scenario.id}-taxpayer-election-review`,
    reviewed_by: "Synthetic reviewer",
    reviewed_on: "2026-10-09",
  });
  return {
    ...source,
    form4562: {
      current_year_inventory: {
        ...inventory,
        bonus_election: review,
        assets: inventory.assets.map((a) => ({
          ...a,
          acquired_date: "2025-02-01",
          bonus_elected_out: review.elected_out_recovery_periods.includes(
            a.macrs_recovery_period_years,
          ),
          reduced_bonus_election: review.reduced_bonus_40_percent &&
            !review.elected_out_recovery_periods.includes(
              a.macrs_recovery_period_years,
            ),
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
