import { aggregationInvestmentFixture } from "./form8995a_aggregation_investments.fixture.ts";
import {
  aggregationPhaseInCases,
  aggregationPhaseInFixture,
} from "./form8995a_aggregation_phasein.fixture.ts";
export const jointAggregationInvestmentCases = [
  {
    name: "direct-primary-spouse-portfolio",
    rpe: false,
    primaryBusiness: true,
    mixed: false,
    shortGain: 1000,
  },
  {
    name: "direct-spouse-mixed-portfolio",
    rpe: false,
    primaryBusiness: false,
    mixed: true,
    shortGain: -1000,
  },
  {
    name: "rpe-primary-spouse-portfolio",
    rpe: true,
    primaryBusiness: true,
    mixed: false,
    shortGain: -1000,
  },
  {
    name: "rpe-spouse-mixed-portfolio",
    rpe: true,
    primaryBusiness: false,
    mixed: true,
    shortGain: 1000,
  },
] as const;
export async function jointAggregationInvestmentFixture(
  c: typeof jointAggregationInvestmentCases[number],
) {
  let input = await aggregationInvestmentFixture(
    c.rpe
      ? (c.primaryBusiness
        ? "joint-primary-rpe-phase"
        : "joint-spouse-rpe-full")
      : "joint-spouse-direct-four",
  );
  if (!c.rpe && c.primaryBusiness) {
    const primary = aggregationPhaseInFixture(
      aggregationPhaseInCases.find((x) =>
        x.joint && x.owner === "T" && x.count === 4
      )!,
    ).input;
    input = {
      ...primary,
      f1099int: input.f1099int,
      f1099div: input.f1099div,
      schedule_b_part_iii: input.schedule_b_part_iii,
    };
  }
  const owners = [input.general.taxpayer_ssn, input.general.spouse_ssn].map((
    s: string,
  ) => s.replaceAll("-", ""));
  for (const key of ["f1099int", "f1099div"] as const) {
    for (const [i, row] of input[key].entries()) {
      row.recipient_tin = owners[c.mixed ? i : 1];
      row.source_document_reference = `Synthetic ${c.name} ${key} ${i}`;
    }
  }
  input.f1099b = [
    {
      recipient_ssn: owners[c.mixed ? 0 : 1],
      payer_tin: "456789012",
      account_number: `${c.name}-LT`,
      source_document_reference: `Synthetic ${c.name} long broker copy`,
      transaction_id: `${c.name}-LT`,
      part: "D",
      description: "Example long-term shares",
      date_acquired: "2023-01-04",
      date_sold: "2025-10-02",
      proceeds: 6000,
      cost_basis: 2000,
    },
    {
      recipient_ssn: owners[1],
      payer_tin: "456789013",
      account_number: `${c.name}-ST`,
      source_document_reference: `Synthetic ${c.name} short broker copy`,
      transaction_id: `${c.name}-ST`,
      part: "A",
      description: "Example short-term shares",
      date_acquired: "2025-03-04",
      date_sold: "2025-10-02",
      proceeds: 2000 + c.shortGain,
      cost_basis: 2000,
    },
  ];
  return input;
}
