import { pdfReviewFixtures } from "../../../../pdf/review-fixtures.ts";
export const sstbJointOwnerCases = [
  {
    name: "primary-partial-payroll",
    owner: "T",
    ownerWage: 100000,
    payroll: true,
  },
  {
    name: "spouse-partial-owner-only",
    owner: "S",
    ownerWage: 100000,
    payroll: false,
  },
  {
    name: "primary-capped-owner-only",
    owner: "T",
    ownerWage: 200000,
    payroll: false,
  },
  {
    name: "spouse-capped-payroll",
    owner: "S",
    ownerWage: 200000,
    payroll: true,
  },
] as const;
export function sstbJointOwnerFixture(c: typeof sstbJointOwnerCases[number]) {
  const joint = pdfReviewFixtures.find((f) =>
    f.id === "joint-primary-form8995a-accounting-sstb-phasein"
  )!;
  const business = pdfReviewFixtures.find((f) =>
    f.id ===
      (c.payroll
        ? "single-form8995a-accounting-sstb-phasein"
        : "single-form8995a-accounting-sstb-no-payroll")
  )!;
  const input: Record<string, any> = structuredClone(joint.inputs);
  input.schedule_c = structuredClone(business.inputs.schedule_c);
  const ownerSsn =
    input.general[c.owner === "T" ? "taxpayer_ssn" : "spouse_ssn"];
  input.schedule_c[0].proprietor_recipient = c.owner;
  input.schedule_c[0].qbi_sstb_filing_review.owner_ssn = ownerSsn.replaceAll(
    "-",
    "",
  );
  input.w2 = (["T", "S"] as const).map((recipient, index) => {
    const wages = recipient === c.owner ? c.ownerWage : 420000 - c.ownerWage;
    return {
      ...structuredClone(input.w2[0]),
      employee_ssn:
        input.general[recipient === "T" ? "taxpayer_ssn" : "spouse_ssn"],
      employer_ein: index ? "98-7654321" : "12-3456789",
      employer_name: `Synthetic ${recipient} employer`,
      source_document_reference: `Synthetic ${c.name} ${recipient} issued W2`,
      box1_wages: wages,
      box2_fed_withheld: index ? 10000 : 40000,
      box3_ss_wages: Math.min(wages, 176100),
      box4_ss_withheld: Math.min(wages, 176100) * 0.062,
      box5_medicare_wages: wages,
      box6_medicare_withheld: wages * 0.0145,
    };
  });
  return input;
}
