import base from "./form8962-interstate-base.fixture.json" with {
  type: "json",
};
import { inputSchema as generalSchema } from "../../../../../nodes/inputs/general/filing/general/index.ts";
import { inputSchema as policySchema } from "../../../../../nodes/inputs/credits/health/f1095a/index.ts";

const two = [...Array<string>(6).fill("AK"), ...Array<string>(6).fill("TX")];
const hawaii = [...Array<string>(6).fill("HI"), ...Array<string>(6).fill("TX")];
export const interstateCases = [
  { id: "two-reported", months: two, wages: 75300, corrected: false, gap: 0 },
  {
    id: "three-reported",
    months: [
      "AK",
      "AK",
      "AK",
      "AK",
      "HI",
      "HI",
      "HI",
      "HI",
      "TX",
      "TX",
      "TX",
      "TX",
    ],
    wages: 75300,
    corrected: false,
    gap: 0,
  },
  {
    id: "four-reported",
    months: [
      "AK",
      "AK",
      "AK",
      "HI",
      "HI",
      "HI",
      "CA",
      "CA",
      "CA",
      "TX",
      "TX",
      "TX",
    ],
    wages: 75300,
    corrected: false,
    gap: 0,
  },
  {
    id: "five-reported",
    months: [
      "AK",
      "AK",
      "HI",
      "HI",
      "CA",
      "CA",
      "NV",
      "NV",
      "TX",
      "TX",
      "TX",
      "TX",
    ],
    wages: 75300,
    corrected: false,
    gap: 0,
  },
  {
    id: "twelve-reported",
    months: [
      "AK",
      "HI",
      "CA",
      "NV",
      "AZ",
      "UT",
      "CO",
      "NM",
      "OK",
      "AR",
      "LA",
      "TX",
    ],
    wages: 75300,
    corrected: false,
    gap: 0,
  },
  {
    id: "hawaii-reported",
    months: hawaii,
    wages: 75300,
    corrected: false,
    gap: 0,
  },
  {
    id: "two-unreported-corrected",
    months: two,
    wages: 75300,
    corrected: true,
    gap: 0,
  },
  {
    id: "two-uncovered-june",
    months: two,
    wages: 75300,
    corrected: false,
    gap: 6,
  },
  { id: "alaska-cap", months: two, wages: 36000, corrected: false, gap: 0 },
  { id: "hawaii-cap", months: hawaii, wages: 36000, corrected: false, gap: 0 },
];

/** Synthetic move, policy and payroll facts; no external record authentication. */
export function interstateInputs(c: typeof interstateCases[number]) {
  const states = [...new Set(c.months)];
  const general = generalSchema.parse({
    ...base.general,
    taxpayer_can_be_claimed_as_dependent: false,
    ptc_residence_states_2025: states,
    ptc_residence_months_2025: c.months,
  });
  const w2 = base.w2.map((row) => ({
    ...row,
    box1_wages: c.wages,
    box3_ss_wages: c.wages,
    box4_ss_withheld: Math.round(c.wages * .062 * 100) / 100,
    box5_medicare_wages: c.wages,
    box6_medicare_withheld: Math.round(c.wages * .0145 * 100) / 100,
    box2_fed_withheld: c.wages === 36000 ? 3000 : 8000,
  }));
  const f1095a = policySchema.parse({
    f1095as: states.map((state, position) => {
      const start = c.months.indexOf(state) + 1,
        end = c.months.lastIndexOf(state) + 1;
      const covered = c.months.map((s, i) => s === state && i + 1 !== c.gap);
      const premium = c.wages === 36000 ? 900 : 500;
      const advance = c.wages === 36000 ? 800 : 200;
      const count = covered.filter(Boolean).length;
      return {
        issuer_name: "Synthetic Marketplace",
        policy_number: `MOVE-${state}-2025`,
        coverage_state: state,
        covered_individual_ssns: ["111223333"],
        monthly_premiums: covered.map((on) => on ? premium : 0),
        monthly_slcsps: covered.map((on) => on ? 600 : 0),
        monthly_aptcs: covered.map((on) => on ? advance : 0),
        annual_premium: count * premium,
        annual_slcsp: count * 600,
        annual_aptc: count * advance,
        ...(position > 0
          ? {
            slcsp_review_periods: [{
              start_month: start,
              end_month: end,
              reason: "move",
              reported_to_marketplace: !c.corrected,
            }],
          }
          : {}),
        ...(c.corrected && position > 0
          ? {
            slcsp_corrections: covered.flatMap((on, i) =>
              on
                ? [{
                  month: i + 1,
                  basis: "move",
                  corrected_slcsp: 650,
                  determination_source: "marketplace_tool",
                  determination_reference: `SYNTHETIC-MOVE-${state}-${i + 1}`,
                  determination_record_sha256: "a".repeat(64),
                  determined_on: "2026-02-01",
                }]
                : []
            ),
          }
          : {}),
      };
    }),
  }).f1095as;
  return { general, w2, f1095a };
}
