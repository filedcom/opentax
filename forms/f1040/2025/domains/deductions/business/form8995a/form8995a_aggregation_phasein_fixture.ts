import { ownedAggregationElectionFixture } from "../../../../pdf/reviews/general/composed-returns/review-8995a-aggregation-election.fixture.ts";
import {
  jointAggregationCases,
  jointAggregationFixture,
} from "./form8995a_joint_aggregation_fixture.ts";
type Row = Record<string, any>;

export const aggregationPhaseInCases = [
  ...jointAggregationCases.map((c) => ({
    ...c,
    name: `joint-${c.name}`,
    joint: true,
    wages: c.count === 3 ? 239714 : 200250,
    withholding: c.count === 3 ? 3833.28 : 2905.88,
    preQbi: 445000,
    ratio: 0.504,
    reduction: c.count === 3 ? 12528 : 15246,
    qbi: c.count === 3 ? 34829 : 40004,
    tax: c.count === 3 ? 93711 : 93103,
    payments: c.count === 3 ? 60357 : 60002,
    shares: c.count === 3 ? [1353, 1015, 846] : [1364, 1023, 852, 511],
  })),
  {
    name: "single-three",
    joint: false,
    owner: "T",
    count: 3,
    wages: 180000,
    withholding: 2610,
    preQbi: 223446,
    ratio: 0.52292,
    reduction: 3249,
    qbi: 8590,
    half: 804,
    tax: 47743,
    payments: 60000,
    shares: [339, 254, 211],
  },
  {
    name: "single-four",
    joint: false,
    owner: "T",
    count: 4,
    wages: 180000,
    withholding: 2610,
    preQbi: 233312,
    ratio: 0.72024,
    reduction: 5446,
    qbi: 8366,
    half: 938,
    tax: 51323,
    payments: 60000,
    shares: [341, 256, 213, 128],
  },
] as const;

export function aggregationPhaseInFixture(
  c: typeof aggregationPhaseInCases[number],
) {
  const base = ownedAggregationElectionFixture(c.count as 3 | 4);
  const joint = c.joint
    ? jointAggregationFixture(
      jointAggregationCases.find((j) =>
        j.count === c.count && j.owner === c.owner
      )!,
    )
    : undefined;
  const input: Row = structuredClone(joint?.input ?? base.inputs);
  const filer = structuredClone(joint?.filer ?? base.filer);
  input.w2[0] = {
    ...input.w2[0],
    source_document_reference: `Synthetic phase-in ${c.name} W2`,
    box1_wages: c.wages,
    box5_medicare_wages: c.wages,
    box6_medicare_withheld: c.withholding,
    box2_fed_withheld: 60000,
  };
  const source = input.qbi_aggregation.aggregation_filing_details;
  for (let i = 0; i < c.count; i++) {
    const b = input.schedule_c[i];
    if (!c.joint) {
      for (
        const key of [
          "line_1_gross_receipts",
          "line_26_wages",
          "qbi_w2_wages",
          "qbi_unadjusted_basis",
        ]
      ) b[key] /= 4;
    }
    const m = source.members[i];
    m.source_schedule_c = structuredClone(b);
    m.qbi_adjustments.deductible_se_tax = c.shares[i];
    m.qbi_adjustments.allocation_method_description =
      "Filed owner half-SE allocated by gross income, rounded in source order; final member receives the whole-dollar remainder";
    m.qbi_adjustments.allocation_worksheet_reference =
      `synthetic-phasein-${c.name}-gross-income`;
    m.qbi = b.line_1_gross_receipts - b.line_26_wages - c.shares[i];
    m.w2_wages = b.qbi_w2_wages;
    m.ubia = b.qbi_unadjusted_basis;
  }
  return { input, filer };
}
