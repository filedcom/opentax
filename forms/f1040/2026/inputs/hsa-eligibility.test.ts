import { assertEquals, assertThrows } from "@std/assert";
import {
  calculateHsaEligibility2026 as calculate,
  type HsaEligibility2026,
} from "./hsa-eligibility.ts";
import { hsaDpc2026, hsaEligibility2026 } from "./hsa-eligibility.fixture.ts";
import {
  calculateHsaContributionLimit as limit,
  CoverageType as C,
} from "../../nodes/intermediate/forms/adjustments/health/form8889/contribution-limit.ts";
import { hsa2026 } from "../../nodes/config/2026-hsa.ts";
function selfLimit(source: HsaEligibility2026) {
  const r = calculate(source);
  return limit(
    {
      eligible_hdhp_coverage_by_month: r.eligible_hdhp_coverage_by_month,
      age_55_or_older: r.age_55_or_older,
      last_month_rule_elected: false,
      married_at_year_end: false,
    },
    hsa2026.selfOnlyLimit,
    hsa2026.familyLimit,
    hsa2026.catchupLimit,
  );
}
Deno.test("2026 HSA owner monthly evidence feeds shared limits without borrowing 2025 amounts", () => {
  const s = hsaEligibility2026();
  assertEquals(selfLimit(s), {
    line1: C.SelfOnly,
    line3: 4400,
    line5: 4400,
    line6: 4400,
    line7: 0,
    line8: 4400,
  });
  const p = s.plans[0];
  if (p.kind !== "ordinary_health_plan") throw Error();
  p.coverage = C.Family;
  p.annual_deductible = 3400;
  p.annual_out_of_pocket_maximum = 17000;
  assertEquals(selfLimit(s).line3, 8750);
  const r = calculate(s);
  assertEquals(
    limit(
      {
        eligible_hdhp_coverage_by_month: r.eligible_hdhp_coverage_by_month,
        age_55_or_older: false,
        last_month_rule_elected: false,
        married_at_year_end: false,
      },
      4300,
      8550,
      1000,
    ).line3,
    8550,
  );
});
Deno.test("2026 HSA tests deductible, out-of-pocket and embedded-family boundaries from plan terms", () => {
  for (
    const [coverage, deductible, outOfPocket, embedded, expected] of [
      [C.SelfOnly, 1699.99, 8500, null, 0],
      [C.SelfOnly, 1700, 8500.01, null, 0],
      [C.Family, 3400, 17000, null, 8750],
      [C.Family, 3399.99, 17000, null, 0],
      [C.Family, 3400, 17000.01, null, 0],
      [C.Family, 5000, 17000, 3399.99, 0],
      [C.Family, 5000, 17000, 3400, 8750],
    ] as const
  ) {
    const s = hsaEligibility2026(), p = s.plans[0];
    if (p.kind !== "ordinary_health_plan") throw Error();
    Object.assign(p, {
      coverage,
      annual_deductible: deductible,
      annual_out_of_pocket_maximum: outOfPocket,
      embedded_individual_deductible: embedded,
    });
    assertEquals(selfLimit(s).line8, expected);
  }
});
Deno.test("2026 individual bronze and catastrophic coverage uses Notice 2026-5 including off-exchange safe harbor", () => {
  for (
    const kind of ["individual_bronze", "individual_catastrophic"] as const
  ) {
    for (
      const exchange_status of [
        "purchased_on_exchange",
        "off_exchange_available_on_exchange",
        "off_exchange_no_reason_to_believe_unavailable",
      ] as const
    ) {
      const s = hsaEligibility2026();
      s.plans = [{
        source_document_reference: "health-plan-contract",
        policy_identifier: "health-policy",
        covered_owner_tin: s.owner_tin,
        effective_from: "2026-01-01",
        effective_through: "2026-12-31",
        coverage: C.SelfOnly,
        contract_and_enrollment_terms_reviewed: true,
        kind,
        individual_market_plan_verified: true,
        exchange_status,
        exchange_or_safe_harbor_evidence_reference: "exchange-review",
        not_employer_group_or_shop_plan_verified: true,
      }];
      assertEquals(selfLimit(s).line3, 4400);
      assertThrows(() =>
        calculate(
          {
            ...s,
            plans: [{
              ...s.plans[0],
              not_employer_group_or_shop_plan_verified: false,
            }],
          } as unknown as HsaEligibility2026,
        )
      );
    }
  }
});
Deno.test("2026 HSA Medicare, dependent status and disqualifying coverage defeat otherwise qualifying plans", () => {
  const s = hsaEligibility2026();
  for (const m of s.months.slice(6)) m.medicare.enrolled = true;
  assertEquals(selfLimit(s).line3, 2200);
  s.can_be_claimed_as_dependent = true;
  assertEquals(selfLimit(s).line3, 0);
  s.can_be_claimed_as_dependent = false;
  s.months[0].other_coverage.disposition = "disqualifying";
  assertEquals(selfLimit(s).line3, 1833);
  assertEquals(calculate(s).months[0].disqualification_reasons, [
    "other_coverage",
  ]);
  s.months[0].other_coverage.disposition = "permitted_only";
  assertThrows(() => calculate(s), Error, "statutory classification");
  s.months[0].other_coverage.permitted_coverage_statutory_basis_reference =
    "dental-only-policy";
  assertEquals(selfLimit(s).line3, 2200);
});
Deno.test("2026 HSA catch-up uses actual birth date with January 1 attainment", () => {
  const s = hsaEligibility2026();
  s.owner_dob = "1972-01-01";
  assertEquals(selfLimit(s).line3, 5400);
  s.owner_dob = "1972-01-02";
  assertEquals(selfLimit(s).line3, 4400);
});
Deno.test("2026 telehealth safe harbor does not excuse nonpermitted first-dollar benefits", () => {
  const s = hsaEligibility2026(), p = s.plans[0];
  if (p.kind !== "ordinary_health_plan") throw Error();
  p.telehealth_or_remote_care_before_deductible = true;
  assertEquals(selfLimit(s).line3, 4400);
  p.nonpermitted_benefits_before_minimum_deductible = true;
  assertEquals(selfLimit(s).line3, 0);
  p.nonpermitted_benefits_before_minimum_deductible = false;
  p.plan_year_begins = "2024-12-01";
  assertEquals(selfLimit(s).line3, 0);
});
function withDpc() {
  const s = hsaEligibility2026();
  s.direct_primary_care_arrangements.push(hsaDpc2026());
  for (const m of s.months) m.direct_primary_care_references = ["dpc-contract"];
  return s;
}
Deno.test("2026 DPC fees use exact annualized and aggregate 150/300 monthly thresholds", () => {
  for (
    const [months, fee, multiple, expected] of [
      [12, 1800, false, 4400],
      [12, 1800.01, false, 0],
      [3, 450, false, 4400],
      [7, 1050.01, false, 0],
      [12, 3600, true, 4400],
      [12, 3600.01, true, 0],
    ] as const
  ) {
    const s = withDpc(), p = s.direct_primary_care_arrangements[0];
    p.billing_period_months = months;
    p.fixed_periodic_fee = fee;
    p.covers_more_than_one_individual = multiple;
    assertEquals(selfLimit(s).line3, expected);
  }
  const s = withDpc();
  s.direct_primary_care_arrangements[0].fixed_periodic_fee = 900;
  const second = {
    ...hsaDpc2026(),
    source_document_reference: "second-dpc",
    arrangement_identifier: "second-membership",
    fixed_periodic_fee: 900.01,
  };
  s.direct_primary_care_arrangements.push(second);
  for (const m of s.months) {
    m.direct_primary_care_references.push(second.source_document_reference);
  }
  assertEquals(selfLimit(s).line3, 0);
  second.covers_more_than_one_individual = true;
  assertEquals(selfLimit(s).line3, 4400);
});
Deno.test("2026 DPC contract qualifications depend on offered services and compensation rather than usage", () => {
  for (
    const key of [
      "statutory_primary_care_practitioners_only",
      "solely_primary_care_without_prohibited_services",
      "fixed_fee_is_sole_compensation_for_care_within_arrangement",
    ] as const
  ) {
    const s = withDpc();
    s.direct_primary_care_arrangements[0][key] = false;
    assertEquals(selfLimit(s).line3, 0);
  }
});
Deno.test("2026 HSA first-day dates and complete active-plan inventory prevent omitted disqualifying coverage", () => {
  const s = hsaEligibility2026();
  s.plans[0].effective_from = "2026-01-02";
  assertThrows(() => calculate(s), Error, "every active plan");
  s.months[0].plan_references = [];
  assertEquals(selfLimit(s).line3, 4033);
  const d = withDpc();
  d.months[0].direct_primary_care_references = [];
  assertThrows(() => calculate(d), Error, "every active plan");
  const bad = hsaEligibility2026();
  bad.months[0].plan_references = ["unlisted-plan"];
  assertThrows(() => calculate(bad), Error, "every active plan");
});
Deno.test("2026 HSA rejects stale years, owner substitutions, duplicate months and inconsistent source terms", () => {
  for (
    const mutate of [
      (s: HsaEligibility2026) => {
        s.months[11].month = 1;
      },
      (s: HsaEligibility2026) => {
        s.plans[0].covered_owner_tin = "999887777";
      },
      (s: HsaEligibility2026) => {
        s.plans[0].effective_through = "2025-12-31";
      },
      (s: HsaEligibility2026) => {
        s.months[0].plan_references.push("health-plan-contract");
      },
      (s: HsaEligibility2026) => {
        s.plans.push(structuredClone(s.plans[0]));
      },
    ]
  ) {
    const s = hsaEligibility2026();
    mutate(s);
    assertThrows(() => calculate(s));
  }
  assertThrows(() =>
    calculate(
      {
        ...hsaEligibility2026(),
        tax_year: 2025,
      } as unknown as HsaEligibility2026,
    )
  );
  const s = hsaEligibility2026(), p = s.plans[0];
  if (p.kind !== "ordinary_health_plan") throw Error();
  p.annual_deductible = 9000;
  assertThrows(() => calculate(s), Error, "out-of-pocket maximum");
});
Deno.test("2026 HSA shared worksheet preserves partial-year last-month choice and family catch-up separation", () => {
  const s = hsaEligibility2026();
  s.plans[0].effective_from = "2026-12-01";
  for (const m of s.months.slice(0, 11)) m.plan_references = [];
  const r = calculate(s),
    facts = {
      eligible_hdhp_coverage_by_month: r.eligible_hdhp_coverage_by_month,
      age_55_or_older: false,
      last_month_rule_elected: false,
      married_at_year_end: false,
    };
  assertEquals(limit(facts, 4400, 8750, 1000).line3, 367);
  assertEquals(
    limit({ ...facts, last_month_rule_elected: true }, 4400, 8750, 1000).line3,
    4400,
  );
  assertEquals(
    limit(
      {
        eligible_hdhp_coverage_by_month: Array(12).fill(C.Family),
        age_55_or_older: true,
        last_month_rule_elected: false,
        married_at_year_end: true,
        spouse_has_separate_hsa: true,
        allocated_family_limit: 4000,
      },
      4400,
      8750,
      1000,
    ),
    {
      line1: C.Family,
      line3: 8750,
      line5: 8750,
      line6: 4000,
      line7: 1000,
      line8: 5000,
    },
  );
});

Deno.test("2026 HSA retains short coverage periods without inventing a first-day eligible month", () => {
  const s = hsaEligibility2026();
  s.plans[0].effective_from = "2026-01-02";
  s.plans[0].effective_through = "2026-01-30";
  for (const m of s.months) m.plan_references = [];
  assertEquals(selfLimit(s).line3, 0);
});

Deno.test("2026 HSA concurrent coverage preserves family status and rejects a second nonqualifying plan", () => {
  const s = hsaEligibility2026(), second = structuredClone(s.plans[0]);
  if (second.kind !== "ordinary_health_plan") throw Error();
  Object.assign(second, {
    source_document_reference: "family-contract",
    policy_identifier: "family-policy",
    coverage: C.Family,
    annual_deductible: 3400,
    annual_out_of_pocket_maximum: 17000,
  });
  s.plans.push(second);
  for (const m of s.months) {
    m.plan_references.push(second.source_document_reference);
  }
  assertEquals(selfLimit(s).line3, 8750);
  second.annual_deductible = 100;
  assertEquals(selfLimit(s).line3, 0);
  second.annual_deductible = 3400;
  second.policy_identifier = s.plans[0].policy_identifier;
  assertThrows(() => calculate(s), Error, "repeats a policy period");
  second.effective_through = "2027-01-01";
  assertThrows(() => calculate(s), Error, "periods overlap");
});
Deno.test("2026 HSA direct-care price changes apply to their sourced months without overlapping memberships", () => {
  const s = withDpc(), first = s.direct_primary_care_arrangements[0];
  first.effective_through = "2026-06-30";
  const second = {
    ...first,
    source_document_reference: "dpc-renewal",
    effective_from: "2026-07-01",
    effective_through: "2026-12-31",
    fixed_periodic_fee: 1800.01,
  };
  s.direct_primary_care_arrangements.push(second);
  for (const m of s.months.slice(6)) {
    m.direct_primary_care_references = [second.source_document_reference];
  }
  assertEquals(selfLimit(s).line3, 2200);
  first.effective_through = "2026-07-01";
  s.months[6].direct_primary_care_references.push(
    first.source_document_reference,
  );
  assertThrows(() => calculate(s), Error, "periods overlap");
});
