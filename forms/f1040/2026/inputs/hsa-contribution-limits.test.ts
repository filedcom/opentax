import { assertEquals, assertThrows } from "@std/assert";
import { calculateHsaContributionLimits2026 as calculate } from "./hsa-contribution-limits.ts";
import { hsaLimits2026 } from "./hsa-contribution-limits.fixture.ts";
import { CoverageType as C } from "../../nodes/intermediate/forms/adjustments/health/form8889/contribution-limit.ts";
import { FilingStatus } from "../../nodes/types.ts";
Deno.test("2026 HSA limits reuse the owner worksheet and leave deduction and tax unresolved", () => {
  const s = hsaLimits2026(), r = calculate(s);
  assertEquals(r.owners[0].limits.line8, 4400);
  assertEquals(r.owners[0].funding?.employer_contributions_for_2026, 1250);
  assertEquals(r.owners[0].testing_obligation, undefined);
  assertEquals("deduction" in r, false);
});
Deno.test("2026 HSA shared family limit is allocated once with independent catch-up amounts", () => {
  const s = hsaLimits2026(true);
  s.household_eligibility.owners[0].owner_dob = "1965-05-01";
  s.household_eligibility.owners[1].owner_dob = "1966-06-01";
  const r = calculate(s);
  assertEquals(r.shared_family_limit, 8750);
  assertEquals(
    r.owners.map(
      (o) => [o.limits.line3, o.limits.line6, o.limits.line7, o.limits.line8],
    ),
    [[8750, 4375, 1000, 5375], [8750, 4375, 1000, 5375]],
  );
  s.limit_review.allocation!.taxpayer_share = { numerator: 3, denominator: 2 };
  assertThrows(() => calculate(s), Error, "cannot exceed the family pool");
});
Deno.test("2026 HSA spouse Medicare preserves sole family months and only the owner's eligible catch-up", () => {
  const s = hsaLimits2026(true);
  s.household_eligibility.owners[0].owner_dob = "1960-01-01";
  s.household_eligibility.owners[1].owner_dob = "1960-01-01";
  for (const m of s.household_eligibility.owners[0].months.slice(6)) {
    m.medicare.enrolled = true;
  }
  Object.assign(s.limit_review.allocation!, {
    taxpayer_share: { numerator: 2000, denominator: 4375 },
  });
  const r = calculate(s);
  assertEquals(r.shared_family_limit, 4375);
  assertEquals(
    r.owners.map((o) => [o.limits.line6, o.limits.line7, o.limits.line8]),
    [[2000, 500, 2500], [6750, 1000, 7750]],
  );
});
Deno.test("2026 HSA mixed self and family months keep separate self-only capacity", () => {
  const s = hsaLimits2026(true);
  for (const owner of s.household_eligibility.owners) {
    const p = owner.plans[0];
    const self = structuredClone(p);
    self.coverage = C.SelfOnly;
    if (self.kind !== "ordinary_health_plan") throw Error();
    self.annual_deductible = 1700;
    self.annual_out_of_pocket_maximum = 8500;
    self.source_document_reference = "self-plan";
    self.policy_identifier = "self-plan";
    self.effective_through = "2026-06-30";
    p.effective_from = "2026-07-01";
    owner.plans.push(self);
    for (const m of owner.months.slice(0, 6)) m.plan_references = ["self-plan"];
  }
  Object.assign(s.limit_review.allocation!, {
    taxpayer_share: { numerator: 2000, denominator: 4375 },
  });
  const r = calculate(s);
  assertEquals(r.owners.map((o) => o.limits.line3), [6575, 6575]);
  assertEquals(r.owners.map((o) => o.limits.line6), [4200, 4575]);
});
Deno.test("2026 HSA one-account household retains family capacity without allocating absent spouse catch-up", () => {
  const s = hsaLimits2026(true);
  s.claim.accounts.pop();
  delete s.limit_review.allocation;
  s.household_eligibility.owners[1].owner_dob = "1960-01-01";
  const r = calculate(s);
  assertEquals(r.owners.length, 1);
  assertEquals(r.owners[0].limits.line8, 8750);
});
Deno.test("2026 HSA last-month limit retains the actual monthly baseline and future testing dates", () => {
  const s = hsaLimits2026();
  s.household_eligibility.owners[0].plans[0].effective_from = "2026-12-01";
  for (const m of s.household_eligibility.owners[0].months.slice(0, 11)) {
    m.plan_references = [];
  }
  s.limit_review.basis = "last_month";
  s.limit_review.last_month_testing_obligation_acknowledged = true;
  const r = calculate(s).owners[0];
  assertEquals(r.limits.line8, 4400);
  assertEquals(r.monthly_baseline_limits.line8, 367);
  assertEquals(r.testing_obligation?.starts_on, "2026-12-01");
  assertEquals(r.testing_obligation?.ends_on, "2027-12-31");
  assertEquals(
    r.actual_eligible_hdhp_coverage_by_month.slice(0, 11),
    Array(11).fill(null),
  );
  delete s.limit_review.last_month_testing_obligation_acknowledged;
  assertThrows(() => calculate(s), Error, "testing acknowledgement");
});
Deno.test("2026 HSA paired last-month allocation preserves the actual family-share baseline", () => {
  const s = hsaLimits2026(true);
  for (const o of s.household_eligibility.owners) {
    o.plans[0].effective_from = "2026-07-01";
    for (const m of o.months.slice(0, 6)) m.plan_references = [];
  }
  s.limit_review.basis = "last_month";
  s.limit_review.last_month_testing_obligation_acknowledged = true;
  Object.assign(s.limit_review.allocation!, {
    taxpayer_share: { numerator: 4000, denominator: 8750 },
  });
  s.limit_review.monthly_baseline_allocation = {
    ...s.limit_review.allocation!,
    record_reference: "monthly-allocation",
    taxpayer_share: { numerator: 2000, denominator: 4375 },
  };
  const r = calculate(s);
  assertEquals(
    r.owners.map((o) => [o.limits.line8, o.monthly_baseline_limits.line8]),
    [[4000, 2000], [4750, 2375]],
  );
  assertEquals(r.owners.every((o) => o.testing_obligation !== undefined), true);
  Object.assign(s.limit_review.monthly_baseline_allocation, {
    taxpayer_share: { numerator: 4000, denominator: 4375 },
  });
  assertThrows(() => calculate(s), Error, "allocation proportion");
});
Deno.test("2026 HSA MFS allocation includes supporting spouse limits but never spouse return funding", () => {
  const s = hsaLimits2026(true);
  s.filing_status = FilingStatus.MFS;
  s.claim.accounts.pop();
  s.limit_review.separate_return_spouse_accounts = {
    record_reference: "spouse-inventory",
    complete_spouse_hsa_account_inventory_verified: true,
    accounts: [{
      trustee_tin: "987654321",
      account_number: "spouse-hsa",
      source_document_reference: "spouse-account-statement",
    }],
  };
  const r = calculate(s);
  assertEquals(r.owners.map((o) => o.included_on_this_return), [true, false]);
  assertEquals(r.owners[1].funding, undefined);
});
Deno.test("2026 HSA rejects unsupported marriage changes and December-ineligible full-year claims", () => {
  const s = hsaLimits2026(true);
  s.household_eligibility.months[0].married_to_identified_spouse_on_first_day =
    false;
  assertThrows(() => calculate(s), Error, "marital-status changes");
  s.household_eligibility.months[0].married_to_identified_spouse_on_first_day =
    true;
  s.limit_review.basis = "last_month";
  s.limit_review.last_month_testing_obligation_acknowledged = true;
  s.household_eligibility.owners[0].months[11].medicare.enrolled = true;
  assertThrows(() => calculate(s), Error, "December eligibility");
});

Deno.test("2026 HSA all-year self-to-family change keeps the monthly baseline below the December maximum", () => {
  const s = hsaLimits2026(), owner = s.household_eligibility.owners[0];
  const first = owner.plans[0], family = structuredClone(first);
  if (family.kind !== "ordinary_health_plan") throw Error();
  first.effective_through = "2026-06-30";
  Object.assign(family, {
    source_document_reference: "family-plan",
    policy_identifier: "family-plan",
    effective_from: "2026-07-01",
    coverage: C.Family,
    annual_deductible: 3400,
    annual_out_of_pocket_maximum: 17000,
  });
  owner.plans.push(family);
  for (const m of owner.months.slice(6)) m.plan_references = ["family-plan"];
  assertEquals(calculate(s).owners[0].limits.line8, 6575);
  s.limit_review.basis = "last_month";
  s.limit_review.last_month_testing_obligation_acknowledged = true;
  const r = calculate(s).owners[0];
  assertEquals(r.limits.line8, 8750);
  assertEquals(r.monthly_baseline_limits.line8, 6575);
  assertEquals(r.testing_obligation?.monthly_filed_limit, 6575);
});

Deno.test("2026 HSA two self-only owners keep independent limits without family allocation", () => {
  const s = hsaLimits2026(true);
  delete s.limit_review.allocation;
  for (const o of s.household_eligibility.owners) {
    const p = o.plans[0];
    if (p.kind !== "ordinary_health_plan") throw Error();
    Object.assign(p, {
      coverage: C.SelfOnly,
      annual_deductible: 1700,
      annual_out_of_pocket_maximum: 8500,
    });
  }
  assertEquals(calculate(s).owners.map((o) => o.limits.line8), [4400, 4400]);
  for (const m of s.household_eligibility.owners[1].months.slice(6)) {
    m.medicare.enrolled = true;
  }
  assertEquals(calculate(s).owners.map((o) => o.limits.line8), [4400, 2200]);
});

Deno.test("2026 HSA December calculation cannot lower the actual monthly contribution limit", () => {
  const s = hsaLimits2026(), owner = s.household_eligibility.owners[0];
  const first = owner.plans[0], last = structuredClone(first);
  if (first.kind !== "ordinary_health_plan") throw Error();
  Object.assign(first, {
    coverage: C.Family,
    annual_deductible: 3400,
    annual_out_of_pocket_maximum: 17000,
    effective_through: "2026-11-30",
  });
  Object.assign(last, {
    source_document_reference: "december-self",
    policy_identifier: "december-self",
    effective_from: "2026-12-01",
  });
  owner.plans.push(last);
  owner.months[11].plan_references = ["december-self"];
  assertEquals(calculate(s).owners[0].limits.line8, 8388);
  s.limit_review.basis = "last_month";
  s.limit_review.last_month_testing_obligation_acknowledged = true;
  assertThrows(() => calculate(s), Error, "below the monthly limit");
});

Deno.test("2026 HSA unchanged full-year family coverage cannot create a testing obligation by shifting the baseline allocation", () => {
  const s = hsaLimits2026(true);
  s.limit_review.basis = "last_month";
  s.limit_review.last_month_testing_obligation_acknowledged = true;
  s.limit_review.monthly_baseline_allocation = {
    ...s.limit_review.allocation!,
    record_reference: "monthly-same-allocation",
  };
  assertEquals(calculate(s).owners.map((o) => o.testing_obligation), [
    undefined,
    undefined,
  ]);
  Object.assign(s.limit_review.monthly_baseline_allocation, {
    taxpayer_share: { numerator: 0, denominator: 8750 },
  });
  assertThrows(() => calculate(s), Error, "allocation proportion");
});
