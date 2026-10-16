import { FilingStatus } from "../../nodes/types.ts";
import { sumSourceMoney } from "../../nodes/intermediate/forms/taxes/retirement/form4972/source-rounding.ts";
import {
  calculateRetirementSources2026,
  type RetirementSource2026,
} from "./retirement-source.ts";

/** Reuse the reviewed payment classification, never a second entered wage total. */
export function retirementCreditWages2026(
  source: RetirementSource2026,
  status: FilingStatus,
  owner: {
    taxpayer_ssn: string;
    spouse_ssn?: string;
    taxpayer_dob: string;
    spouse_dob?: string;
  },
) {
  const result = calculateRetirementSources2026(source);
  const s = result.source_input;
  if (
    s.filing_status !== status ||
    s.taxpayer_ssn !== owner.taxpayer_ssn.replaceAll("-", "") ||
    s.taxpayer_dob !== owner.taxpayer_dob ||
    (status === FilingStatus.MFJ &&
      (s.spouse_ssn !== owner.spouse_ssn?.replaceAll("-", "") ||
        s.spouse_dob !== owner.spouse_dob))
  ) {
    throw new Error(
      "Credit retirement inventory must match the return owners and birth dates",
    );
  }
  return {
    source_input: s,
    wages: result.cents.line1h_disability_wages,
    filed_wages: result.lines.line1h_disability_wages,
    owners: (["taxpayer", "spouse"] as const).map((owner) => {
      const payments = result.rows.filter((r) => r.copy.recipient === owner)
        .flatMap((r) => r.disability_wage_payments);
      return {
        owner,
        wages: sumSourceMoney(payments.map((p) => p.taxable)),
        wages_by_month: Array.from({ length: 12 }, (_, i) =>
          sumSourceMoney(
            payments.filter((p) => Number(p.payment_date.slice(5, 7)) === i + 1)
              .map((p) => p.taxable),
          )),
      };
    }),
  };
}
