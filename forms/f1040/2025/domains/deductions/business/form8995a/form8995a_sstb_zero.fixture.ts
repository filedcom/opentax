import { sstbInvestmentFixture } from "./form8995a_sstb_investments.fixture.ts";

export const sstbZeroCases = [
  { name: "single-rounded-qbi", base: "single-payroll", kind: "near" },
  { name: "single-upper", base: "single-payroll", kind: "upper" },
  { name: "mfs-upper", base: "mfs-payroll", kind: "upper" },
  { name: "mfs-upper-nonhalf", base: "mfs-payroll", kind: "upper" },
  { name: "hoh-upper", base: "hoh-owner-only", kind: "upper" },
  { name: "qss-upper", base: "qss-payroll", kind: "upper" },
  {
    name: "joint-primary-upper",
    base: "primary-partial-payroll",
    kind: "upper",
  },
  { name: "joint-spouse-upper", base: "spouse-capped-payroll", kind: "upper" },
  { name: "single-near-upper", base: "single-payroll", kind: "near" },
  {
    name: "joint-spouse-near-upper",
    base: "spouse-partial-owner-only",
    kind: "near",
  },
  { name: "single-zero-income-cap", base: "single-income-cap", kind: "cap" },
  {
    name: "joint-spouse-zero-income-cap",
    base: "spouse-capped-payroll",
    kind: "cap",
  },
] as const;
export function sstbZeroFixture(c: typeof sstbZeroCases[number]) {
  const input = sstbInvestmentFixture(c.base);
  const status = input.general.filing_status;
  const joint = status === "mfj";
  const business = input.schedule_c[0];
  // Keep the exact-half case above; this adjacent source isolates its deferred tax issue.
  if (c.name === "mfs-upper-nonhalf") input.f1099int[0].box1++;
  if (c.name === "single-rounded-qbi") {
    business.line_1_gross_receipts = 51000;
    business.line_26_wages = 50000;
    business.qbi_w2_wages = 50000;
    const payroll = business.qbi_sstb_filing_review.employee_w2_records[0];
    payroll.box1_wages = 50000;
    payroll.box5_wages = 50000;
  }
  if (c.kind === "cap") {
    delete input.w2;
    business.line_1_gross_receipts = 1000 + business.line_26_wages;
    for (const row of input.f1099div) {
      row.box1a = joint ? 220000 : 110000;
      row.box1b = row.box1a;
    }
  } else {
    const upper = joint ? 494600 : 247300;
    const standard = joint || status === "qss"
      ? 31500
      : status === "hoh"
      ? 23625
      : 15750;
    const halfSe = c.name === "single-rounded-qbi"
      ? 14
      : c.base.includes("partial")
      ? 2009
      : 381;
    const wageTotal = upper - (c.kind === "near" ? 1 : 0) + standard -
      (c.name === "single-rounded-qbi" ? 1000 : 28431) +
      halfSe - (c.name === "mfs-upper-nonhalf" ? 6501 : 6500);
    // Preserve the proprietor's wage base on joint returns and adjust the other job.
    const owner = business.qbi_sstb_filing_review.owner_ssn;
    const target = joint
      ? input.w2.find((w: { employee_ssn: string }) =>
        w.employee_ssn.replaceAll("-", "") !== owner
      )
      : input.w2[0];
    const otherWages = input.w2.reduce(
      (sum: number, w: { box1_wages: number }) =>
        sum + (w === target ? 0 : w.box1_wages),
      0,
    );
    const wages = wageTotal - otherWages;
    target.box1_wages = wages;
    target.box3_ss_wages = Math.min(wages, 176100);
    target.box4_ss_withheld = target.box3_ss_wages * 0.062;
    target.box5_medicare_wages = wages;
    target.box6_medicare_withheld = wages * 0.0145;
  }
  return input;
}
