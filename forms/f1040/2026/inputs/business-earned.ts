import { FilingStatus } from "../../nodes/types.ts";
import {
  type BusinessReturnSource2026,
  resolveBusinessQbi2026,
} from "./business-qbi.ts";

/** Credit worksheets distinguish statutory gross wages from ordinary net profit.
 * SE tax continues to net separately within each owner; credit income combines
 * both owners' signed amounts before applying the credit's zero-income rule. */
export function businessCreditEarnings2026(
  source: BusinessReturnSource2026,
  status: FilingStatus,
  owner: { taxpayer_ssn?: string; spouse_ssn?: string },
) {
  const resolved = resolveBusinessQbi2026(source), b = resolved.business;
  if (
    source.filing_status !== status ||
    source.taxpayer_tin !== owner.taxpayer_ssn?.replaceAll("-", "") ||
    source.spouse_tin !==
      (status === FilingStatus.MFJ
        ? owner.spouse_ssn?.replaceAll("-", "")
        : undefined)
  ) throw new Error("Credit business inventory must match the return owners");
  const regular = b.businesses.filter((r) =>
    r.source.kind === "sole_proprietor"
  );
  const statutory = b.businesses.filter((r) =>
    r.source.kind === "statutory_employee"
  );
  const regularNet = regular.reduce((n, r) => n + r.lines.line31, 0);
  const statutoryGross = statutory.reduce((n, r) => n + r.lines.line1, 0);
  const filedSe = b.owners.filter((o) => o.schedule_se);
  const unfiledSe = b.owners.filter((o) => !o.schedule_se);
  const part1a = filedSe.reduce((n, o) => n + o.schedule_se!.line3, 0);
  const part1d = b.schedule1_line15;
  const part2b = unfiledSe.reduce((n, o) => n + o.net_profit_subject_to_se, 0);
  return {
    source_input: resolved.source_input,
    regular_net_profit: regularNet,
    statutory_gross_income: statutoryGross,
    se_deduction: part1d,
    business_earned_income: regularNet + statutoryGross - part1d,
    se_medicare_earnings: filedSe.reduce((n, o) => n + o.schedule_se!.line6, 0),
    has_schedule_se: filedSe.length > 0,
    // Form 2441 applies each spouse's income limit separately. Preserve signed
    // net profits here; a loss must offset that owner's wages before flooring.
    owners: b.owners.map((o) => {
      const gross = statutory.filter((r) => r.source.owner_tin === o.owner_tin)
        .reduce((n, r) => n + r.lines.line1, 0);
      const deduction = o.schedule_se?.line13 ?? 0;
      return {
        owner_tin: o.owner_tin,
        regular_net_profit: o.net_profit_subject_to_se,
        statutory_gross_income: gross,
        se_deduction: deduction,
        business_earned_income: o.net_profit_subject_to_se + gross - deduction,
      };
    }),
    // EIC Worksheet B, Parts 1-3. Optional methods and church wages are outside
    // this retained source contract; no prior-year optional constants are used.
    eic_worksheet_b: {
      line1a: part1a,
      line1b: 0,
      line1c: part1a,
      line1d: part1d,
      line1e: part1a - part1d,
      line2a: 0,
      line2b: part2b,
      line2c: part2b,
      line3: statutoryGross,
    },
  };
}
