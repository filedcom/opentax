import type { HsaContributionLimits2026 } from "./hsa-contribution-limits.ts";
import { hsaFunding2026 } from "./hsa-funding.fixture.ts";
import { hsaEligibility2026 } from "./hsa-eligibility.fixture.ts";
import { FilingStatus } from "../../nodes/types.ts";
import { CoverageType as C } from "../../nodes/intermediate/forms/adjustments/health/form8889/contribution-limit.ts";
export function hsaLimits2026(joint = false): HsaContributionLimits2026 {
  const funding = hsaFunding2026(), owner = hsaEligibility2026();
  const owners = [owner];
  if (joint) {
    funding.filing_status = FilingStatus.MFJ;
    funding.spouse_ssn = "400001038";
    const spouse = hsaEligibility2026();
    spouse.owner_tin = funding.spouse_ssn;
    spouse.record_reference = "spouse-eligibility";
    spouse.plans[0].covered_owner_tin = spouse.owner_tin;
    owners.push(spouse);
    for (const o of owners) {
      const p = o.plans[0];
      if (p.kind !== "ordinary_health_plan") throw Error();
      p.coverage = C.Family;
      p.annual_deductible = 3400;
      p.annual_out_of_pocket_maximum = 17000;
    }
    const a = structuredClone(funding.claim.accounts[0]);
    a.record_reference = "spouse-account";
    a.owner_tin = spouse.owner_tin;
    a.account_number = "spouse-hsa";
    Object.assign(a.form5498sa, {
      owner_tin: spouse.owner_tin,
      account_number: a.account_number,
      source_document_reference: "spouse-5498sa",
      box2_calendar_year_contributions: 0,
      box3_following_year_contributions_for_2026: 0,
    });
    a.receipts = [];
    funding.claim.accounts.push(a);
  }
  return {
    ...funding,
    household_eligibility: {
      tax_year: 2026,
      record_reference: "household-eligibility",
      taxpayer_tin: funding.taxpayer_ssn,
      spouse_tin: funding.spouse_ssn,
      same_identified_spouse_for_all_married_months_verified: true,
      married_at_year_end: joint,
      year_end_marriage_record_reference: "marital-status-review",
      owners,
      months: Array.from(
        { length: 12 },
        (_, i) => ({
          month: i + 1,
          married_to_identified_spouse_on_first_day: joint,
          marriage_record_reference: "marital-status-review",
        }),
      ),
    },
    limit_review: {
      record_reference: "contribution-limit-review",
      no_archer_msa_contributions_for_either_owner_verified: true,
      same_marital_status_throughout_year_verified: true,
      basis: "monthly",
      ...(joint
        ? {
          allocation: {
            record_reference: "agreed-allocation",
            agreed_by_both_spouses_verified: true,
            taxpayer_share: { numerator: 1, denominator: 2 },
          },
        }
        : {}),
    },
  };
}
