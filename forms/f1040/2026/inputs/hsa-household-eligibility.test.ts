import { assertEquals, assertThrows } from "@std/assert";
import {
  calculateHsaHouseholdEligibility2026 as calculate,
  type HsaHouseholdEligibility2026,
  reconcileHsaContributionEvidence2026,
} from "./hsa-household-eligibility.ts";
import { hsaEligibility2026 } from "./hsa-eligibility.fixture.ts";
import { hsaFunding2026 } from "./hsa-funding.fixture.ts";
import { CoverageType as C } from "../../nodes/intermediate/forms/adjustments/health/form8889/contribution-limit.ts";
import { FilingStatus } from "../../nodes/types.ts";
function household(): HsaHouseholdEligibility2026 {
  const primary = hsaEligibility2026(), spouse = hsaEligibility2026();
  spouse.owner_tin = "400001038";
  spouse.record_reference = "spouse-eligibility";
  spouse.plans[0].covered_owner_tin = spouse.owner_tin;
  const plan = spouse.plans[0];
  if (plan.kind !== "ordinary_health_plan") throw Error();
  plan.coverage = C.Family;
  plan.annual_deductible = 3400;
  plan.annual_out_of_pocket_maximum = 17000;
  return {
    tax_year: 2026,
    record_reference: "household-hsa-review",
    taxpayer_tin: primary.owner_tin,
    spouse_tin: spouse.owner_tin,
    same_identified_spouse_for_all_married_months_verified: true,
    married_at_year_end: true,
    year_end_marriage_record_reference: "marriage-record",
    owners: [primary, spouse],
    months: Array.from(
      { length: 12 },
      (_, i) => ({
        month: i + 1,
        married_to_identified_spouse_on_first_day: true,
        marriage_record_reference: "marriage-record",
      }),
    ),
  };
}
Deno.test("2026 HSA spouse family plan deems both eligible owners family covered", () => {
  const s = household(), r = calculate(s);
  assertEquals(
    r.owners[0].eligibility.eligible_hdhp_coverage_by_month,
    Array(12).fill(C.SelfOnly),
  );
  assertEquals(r.owners.map((o) => o.eligible_hdhp_coverage_by_month), [
    Array(12).fill(C.Family),
    Array(12).fill(C.Family),
  ]);
  assertEquals(r.months.every((m) => m.shared_family_coverage), true);
});
Deno.test("2026 HSA family deeming cannot revive Medicare or other disqualified months", () => {
  const s = household();
  for (const m of s.owners[1].months.slice(6)) m.medicare.enrolled = true;
  const r = calculate(s);
  assertEquals(r.owners[0].eligible_hdhp_coverage_by_month, [
    ...Array(6).fill(C.Family),
    ...Array(6).fill(C.SelfOnly),
  ]);
  assertEquals(r.owners[1].eligible_hdhp_coverage_by_month, [
    ...Array(6).fill(C.Family),
    ...Array(6).fill(null),
  ]);
  for (const m of s.owners[0].months.slice(0, 6)) {
    m.other_coverage.disposition = "disqualifying";
  }
  assertEquals(
    calculate(s).owners[0].eligible_hdhp_coverage_by_month.slice(0, 6),
    Array(6).fill(null),
  );
});
Deno.test("2026 HSA family deeming follows the sourced first-day marriage calendar", () => {
  const s = household();
  for (const m of s.months.slice(0, 6)) {
    m.married_to_identified_spouse_on_first_day = false;
  }
  s.months.reverse();
  s.owners.reverse();
  assertEquals(calculate(s).owners[0].eligible_hdhp_coverage_by_month, [
    ...Array(6).fill(C.SelfOnly),
    ...Array(6).fill(C.Family),
  ]);
});
Deno.test("2026 HSA household rejects missing or duplicate spouse/month inventories", () => {
  for (
    const edit of [
      (s: HsaHouseholdEligibility2026) => {
        s.owners.pop();
      },
      (s: HsaHouseholdEligibility2026) => {
        s.owners[1].owner_tin = s.taxpayer_tin;
      },
      (s: HsaHouseholdEligibility2026) => {
        s.months[1].month = 1;
      },
      (s: HsaHouseholdEligibility2026) => {
        delete s.spouse_tin;
      },
    ]
  ) {
    const s = household();
    edit(s);
    assertThrows(() => calculate(s));
  }
});
Deno.test("2026 HSA evidence binds funding to household owners without granting two family limits", () => {
  const funding = hsaFunding2026(), h = household();
  const r = reconcileHsaContributionEvidence2026({
    ...funding,
    filing_status: FilingStatus.MFJ,
    spouse_ssn: h.spouse_tin,
    household_eligibility: h,
  });
  assertEquals(r.owners.length, 1);
  assertEquals(r.owners[0].personal_contributions_for_2026, 1500);
  assertEquals(
    r.owners[0].eligibility.eligible_hdhp_coverage_by_month,
    Array(12).fill(C.Family),
  );
  assertEquals("deduction" in r, false);
  h.taxpayer_tin = "400001039";
  assertThrows(
    () =>
      reconcileHsaContributionEvidence2026({
        ...funding,
        household_eligibility: h,
      }),
    Error,
    "actual return",
  );
});
Deno.test("2026 HSA separate return keeps spouse eligibility as evidence and excludes spouse funding", () => {
  const funding = hsaFunding2026(), h = household();
  const r = reconcileHsaContributionEvidence2026({
    ...funding,
    filing_status: FilingStatus.MFS,
    spouse_ssn: h.spouse_tin,
    household_eligibility: h,
  });
  assertEquals(r.owners.map((o) => o.owner_tin), [funding.taxpayer_ssn]);
  assertEquals(r.household.owners.length, 2);
});
