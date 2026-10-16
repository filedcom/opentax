import { ownedAggregationElectionFixture } from "../../../../pdf/reviews/general/composed-returns/review-8995a-aggregation-election.fixture.ts";
import { pdfReviewFixtures } from "../../../../pdf/review-fixtures.ts";
type Row = Record<string, any>;
export const jointAggregationCases = [
  {
    name: "primary-three",
    owner: "T",
    count: 3,
    half: 3214,
    tax: 152843,
    qbi: 22500,
  },
  {
    name: "spouse-three",
    owner: "S",
    count: 3,
    half: 3214,
    tax: 152843,
    qbi: 22500,
  },
  {
    name: "primary-four",
    owner: "T",
    count: 4,
    half: 3750,
    tax: 167183,
    qbi: 25000,
  },
  {
    name: "spouse-four",
    owner: "S",
    count: 4,
    half: 3750,
    tax: 167183,
    qbi: 25000,
  },
] as const;
export function jointAggregationFixture(
  c: typeof jointAggregationCases[number],
) {
  const base = ownedAggregationElectionFixture(c.count);
  const joint = pdfReviewFixtures.find((f) =>
    f.id === "joint-primary-form8995a-accounting-sstb-phasein"
  )!;
  const input: Row = structuredClone(base.inputs);
  input.general = {
    ...input.general,
    ...joint.inputs.general as Row,
    qbi_no_prior_loss_or_suspended_loss_confirmed: true,
    qbi_not_patron_of_specified_cooperative_confirmed: true,
  };
  const filer = structuredClone(joint.filer);
  const ownerSsn = c.owner === "T" ? filer.primarySSN : filer.spouse!.ssn;
  input.w2[0] = {
    ...input.w2[0],
    employee_ssn: ownerSsn,
    source_document_reference: `Synthetic ${c.name} issued external W2`,
    box1_wages: 400000,
    box5_medicare_wages: 400000,
    box6_medicare_withheld: 7600,
    box2_fed_withheld: 120000,
  };
  const source = input.qbi_aggregation.aggregation_filing_details;
  source.common_owner_ssn = ownerSsn.replaceAll("-", "");
  const shares = c.count === 3 ? [1353, 1015, 846] : [1364, 1023, 852, 511];
  for (let i = 0; i < c.count; i++) {
    const business = input.schedule_c[i];
    business.proprietor_recipient = c.owner;
    const member = source.members[i];
    member.source_schedule_c = structuredClone(business);
    member.qbi_adjustments.deductible_se_tax = shares[i];
    member.qbi_adjustments.allocation_method_description =
      "Owner filed half-SE allocated by each store gross business income; whole-dollar shares reconcile to owner total";
    member.qbi_adjustments.allocation_worksheet_reference =
      `synthetic-${c.name}-gross-income-allocation`;
    member.qbi = business.line_1_gross_receipts - business.line_26_wages -
      shares[i];
  }
  return { input, filer };
}
