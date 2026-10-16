import { assert, assertEquals, assertThrows } from "@std/assert";
import { calculateHsaContributionLimits2026 as calculate } from "./hsa-contribution-limits.ts";
import { hsaLimits2026 } from "./hsa-contribution-limits.fixture.ts";
import { CoverageType as C } from "../../nodes/intermediate/forms/adjustments/health/form8889/contribution-limit.ts";
import {
  compareHsaAmounts,
  hsaExactAmount,
  roundHsaAmount,
} from "../../nodes/intermediate/forms/adjustments/health/form8889/exact-amount.ts";
function familyMonths(count: number) {
  const s = hsaLimits2026(true);
  for (const o of s.household_eligibility.owners) {
    o.plans[0].effective_from = `2026-${
      String(13 - count).padStart(2, "0")
    }-01`;
    for (const m of o.months.slice(0, 12 - count)) m.plan_references = [];
  }
  return s;
}
Deno.test("2026 HSA one-month equal split preserves both exact shares despite rounded owner forms", () => {
  const r = calculate(familyMonths(1));
  assertEquals(r.exact_shared_family_limit, {
    numerator: 4375,
    denominator: 6,
  });
  assertEquals(r.owners.map((o) => o.exact_limits.line6), [
    { numerator: 4375, denominator: 12 },
    { numerator: 4375, denominator: 12 },
  ]);
  assertEquals(r.shared_family_limit, 729);
  assertEquals(r.owners.map((o) => o.limits.line6), [365, 365]);
  // Two independently filed owner lines can round up; that does not authorize
  // $730 of source contributions against the exact $729 1/6 family capacity.
  assertEquals(
    compareHsaAmounts(hsaExactAmount(730, 1), r.exact_shared_family_limit),
    1,
  );
});
Deno.test("2026 HSA mixed partial-year worksheet no longer rejects capacity inflated by intermediate rounding", () => {
  const s = familyMonths(4);
  s.limit_review.allocation!.taxpayer_share = { numerator: 1, denominator: 1 };
  for (const o of s.household_eligibility.owners) {
    const self = structuredClone(o.plans[0]);
    if (self.kind !== "ordinary_health_plan") throw Error();
    Object.assign(self, {
      source_document_reference: "self-plan",
      policy_identifier: "self-plan",
      coverage: C.SelfOnly,
      annual_deductible: 1700,
      annual_out_of_pocket_maximum: 8500,
      effective_from: "2026-01-01",
      effective_through: "2026-04-30",
    });
    o.plans.push(self);
    for (const m of o.months.slice(0, 4)) m.plan_references = ["self-plan"];
  }
  const r = calculate(s);
  assertEquals(r.owners[0].exact_limits.line6, {
    numerator: 13150,
    denominator: 3,
  });
  assertEquals(r.owners[0].exact_limits.line6, r.owners[0].exact_limits.line5);
  assertEquals(r.owners.map((o) => o.limits.line6), [4383, 1467]);
});
Deno.test("2026 HSA combines source fractions before half-dollar form-line rounding", () => {
  const s = familyMonths(1);
  s.limit_review.allocation!.taxpayer_share = { numerator: 1, denominator: 1 };
  for (const o of s.household_eligibility.owners) {
    const self = structuredClone(o.plans[0]);
    if (self.kind !== "ordinary_health_plan") throw Error();
    Object.assign(self, {
      source_document_reference: "self-plan",
      policy_identifier: "self-plan",
      coverage: C.SelfOnly,
      annual_deductible: 1700,
      annual_out_of_pocket_maximum: 8500,
      effective_from: "2026-01-01",
      effective_through: "2026-02-28",
    });
    o.plans.push(self);
    for (const m of o.months.slice(0, 2)) m.plan_references = ["self-plan"];
  }
  const r = calculate(s);
  assertEquals(r.owners[0].exact_limits.line6, {
    numerator: 2925,
    denominator: 2,
  });
  assertEquals(r.owners[0].limits.line6, 1463);
  assertEquals(r.owners[1].limits.line6, 733);
});
Deno.test("2026 HSA retains equal exact last-month baselines without assigning a rounding remainder to one spouse", () => {
  const s = familyMonths(1);
  s.limit_review.basis = "last_month";
  s.limit_review.last_month_testing_obligation_acknowledged = true;
  s.limit_review.monthly_baseline_allocation = {
    ...s.limit_review.allocation!,
    record_reference: "monthly-share",
    taxpayer_share: { numerator: 2, denominator: 4 },
  };
  const r = calculate(s);
  assertEquals(r.owners.map((o) => o.testing_obligation?.exact_monthly_limit), [
    { numerator: 4375, denominator: 12 },
    { numerator: 4375, denominator: 12 },
  ]);
  assertEquals(r.owners.map((o) => o.testing_obligation?.exact_current_limit), [
    { numerator: 4375, denominator: 1 },
    { numerator: 4375, denominator: 1 },
  ]);
});
Deno.test("2026 HSA sub-dollar last-month exposure is detected before printed-dollar rounding", () => {
  const s = familyMonths(1);
  s.limit_review.allocation!.taxpayer_share = {
    numerator: 1,
    denominator: 10_000_000,
  };
  s.limit_review.basis = "last_month";
  s.limit_review.last_month_testing_obligation_acknowledged = true;
  s.limit_review.monthly_baseline_allocation = {
    ...s.limit_review.allocation!,
    record_reference: "monthly-share",
  };
  const r = calculate(s).owners[0];
  assertEquals(r.limits.line8, 0);
  assertEquals(r.monthly_baseline_limits.line8, 0);
  assert(r.testing_obligation !== undefined);
  assertEquals(
    compareHsaAmounts(
      r.exact_limits.line8,
      r.exact_monthly_baseline_limits.line8,
    ),
    1,
  );
});
Deno.test("2026 HSA exact family allocation conserves all twelve monthly pools for unequal and boundary ratios", () => {
  for (let months = 1; months <= 12; months++) {
    for (
      const [numerator, denominator] of [
        [0, 1],
        [1, 1],
        [1, 2],
        [1, 3],
        [2, 7],
        [874999, 875000],
        [4999999, 9999999],
      ]
    ) {
      const s = familyMonths(months);
      s.limit_review.allocation!.taxpayer_share = { numerator, denominator };
      const r = calculate(s),
        a = r.owners[0].exact_limits.line6,
        b = r.owners[1].exact_limits.line6;
      const sumNumerator = BigInt(a.numerator) * BigInt(b.denominator) +
        BigInt(b.numerator) * BigInt(a.denominator);
      const sumDenominator = BigInt(a.denominator) * BigInt(b.denominator);
      assertEquals(sumNumerator * 12n, 8750n * BigInt(months) * sumDenominator);
      for (const o of r.owners) {
        assertEquals(
          compareHsaAmounts(o.exact_limits.line6, o.exact_limits.line5) <= 0,
          true,
        );
        assertEquals(o.limits.line8, o.limits.line6 + o.limits.line7);
      }
    }
  }
});
Deno.test("HSA exact rounding uses integer ties and rejects unsafe source components", () => {
  assertEquals(roundHsaAmount(hsaExactAmount(2925, 2)), 1463);
  assertEquals(
    roundHsaAmount(hsaExactAmount(14624999999999, 10000000000)),
    1462,
  );
  assertEquals(hsaExactAmount(0, 10000000), { numerator: 0, denominator: 1 });
  assertThrows(() => hsaExactAmount(Number.MAX_SAFE_INTEGER + 1, 1));
  assertThrows(() => hsaExactAmount(1, 0));
  const s = familyMonths(1);
  s.limit_review.allocation!.taxpayer_share.denominator = 10_000_001;
  assertThrows(() => calculate(s));
});
