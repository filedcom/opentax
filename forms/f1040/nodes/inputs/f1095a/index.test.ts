import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { form8962 as form8962Mef } from "../../../2025/mef/forms/f8962.ts";
import { form8962Pdf } from "../../../2025/pdf/forms/f8962.ts";
import { form8962 } from "../../intermediate/forms/form8962/index.ts";
import { FilingStatus } from "../../types.ts";
import { f1095a } from "./index.ts";

function minimalItem(overrides: Record<string, unknown> = {}) {
  return {
    issuer_name: "Test Marketplace",
    ...overrides,
  };
}

function noAptcDeterminations(premiums: number[], slcsps: number[]) {
  return premiums.flatMap((premium, index) =>
    premium > 0
      ? [{
        month: index + 1,
        basis: "no_aptc",
        corrected_slcsp: slcsps[index],
        determination_source: "marketplace_tool",
      }]
      : []
  );
}

function compute(
  items: ReturnType<typeof minimalItem>[],
  alternative_marriage_month?: number,
) {
  return f1095a.compute({ taxYear: 2025, formType: "f1040" }, {
    f1095as: items,
    ...(alternative_marriage_month !== undefined
      ? { alternative_marriage_month }
      : {}),
  });
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ── 1. Input schema validation ────────────────────────────────────────────────

Deno.test("empty array throws", () => {
  assertThrows(
    () => f1095a.compute({ taxYear: 2025, formType: "f1040" }, { f1095as: [] }),
    Error,
  );
});

Deno.test("missing issuer_name throws", () => {
  assertThrows(
    () =>
      f1095a.compute({ taxYear: 2025, formType: "f1040" }, {
        f1095as: [
          { annual_premium: 100 } as unknown as ReturnType<typeof minimalItem>,
        ],
      }),
    Error,
  );
});

Deno.test("negative annual_premium throws", () => {
  assertThrows(
    () => compute([minimalItem({ annual_premium: -1 })]),
    Error,
  );
});

Deno.test("negative annual_slcsp throws", () => {
  assertThrows(
    () => compute([minimalItem({ annual_slcsp: -50 })]),
    Error,
  );
});

Deno.test("negative annual_aptc throws", () => {
  assertThrows(
    () => compute([minimalItem({ annual_aptc: -100 })]),
    Error,
  );
});

// ── 2. Per-box routing ────────────────────────────────────────────────────────

Deno.test("annual_premium routes to form8962", () => {
  const result = compute([minimalItem({ annual_premium: 1200 })]);
  const out = findOutput(result, "form8962");
  assertEquals(out?.fields.annual_premium, 1200);
});

Deno.test("annual_slcsp routes to form8962", () => {
  const result = compute([minimalItem({ annual_slcsp: 1500 })]);
  const out = findOutput(result, "form8962");
  assertEquals(out?.fields.annual_slcsp, 1500);
});

Deno.test("annual_aptc routes to form8962", () => {
  const result = compute([minimalItem({ annual_aptc: 800 })]);
  const out = findOutput(result, "form8962");
  assertEquals(out?.fields.annual_aptc, 800);
});

Deno.test("zero annual values does not route to form8962", () => {
  const result = compute([minimalItem()]);
  const out = findOutput(result, "form8962");
  assertEquals(out, undefined);
});

Deno.test("monthly premiums route to form8962", () => {
  const result = compute([
    minimalItem({
      monthly_premiums: [
        100,
        100,
        100,
        100,
        100,
        100,
        100,
        100,
        100,
        100,
        100,
        100,
      ],
    }),
  ]);
  const out = findOutput(result, "form8962");
  assertEquals(Array.isArray(out?.fields.monthly_premiums), true);
  assertEquals((out?.fields.monthly_premiums as number[])[0], 100);
});

Deno.test("monthly slcsp routes to form8962", () => {
  const result = compute([
    minimalItem({
      monthly_slcsps: [
        120,
        120,
        120,
        120,
        120,
        120,
        120,
        120,
        120,
        120,
        120,
        120,
      ],
    }),
  ]);
  const out = findOutput(result, "form8962");
  assertEquals(Array.isArray(out?.fields.monthly_slcsps), true);
  assertEquals((out?.fields.monthly_slcsps as number[])[0], 120);
});

Deno.test("monthly aptc routes to form8962", () => {
  const result = compute([
    minimalItem({
      monthly_aptcs: [60, 60, 60, 60, 60, 60, 60, 60, 60, 60, 60, 60],
    }),
  ]);
  const out = findOutput(result, "form8962");
  assertEquals(Array.isArray(out?.fields.monthly_aptcs), true);
  assertEquals((out?.fields.monthly_aptcs as number[])[5], 60);
});

Deno.test("identified spouse policy carries corrected 1095-A rows to marriage worksheet", () => {
  const monthlyPremiums = Array(12).fill(500);
  const monthlySlcsps = Array(12).fill(600);
  const correctedSlcsps = [650, ...Array(11).fill(600)];
  const monthlyAptcs = Array(12).fill(450);
  const result = compute([
    minimalItem({
      policy_number: "ATS-POLICY-1",
      alternative_marriage_owner: "spouse",
      coverage_state: "CA",
      monthly_premiums: monthlyPremiums,
      monthly_slcsps: monthlySlcsps,
      monthly_aptcs: monthlyAptcs,
      slcsp_review_periods: [{
        start_month: 1,
        end_month: 1,
        reason: "coverage_family_change",
        reported_to_marketplace: false,
      }],
      slcsp_corrections: [{
        month: 1,
        basis: "coverage_family_change",
        corrected_slcsp: 650,
        determination_source: "marketplace_tool",
      }],
    }),
  ], 6);
  assertEquals(
    findOutput(result, "form8962")?.fields.alternative_marriage_policies,
    [{
      policy_number: "ATS-POLICY-1",
      owner: "spouse",
      coverage_state: "CA",
      monthly_premiums: monthlyPremiums,
      monthly_slcsps: correctedSlcsps,
      monthly_aptcs: monthlyAptcs,
    }],
  );
});

Deno.test("marriage policy source requires unique identity and monthly columns", () => {
  assertThrows(
    () =>
      compute([minimalItem({
        alternative_marriage_owner: "primary",
        monthly_premiums: Array(12).fill(500),
        monthly_slcsps: Array(12).fill(600),
        monthly_aptcs: Array(12).fill(450),
      })], 6),
    Error,
    "unique policy numbers",
  );
  assertThrows(
    () =>
      compute([minimalItem({
        policy_number: "ATS-POLICY-1",
        alternative_marriage_owner: "primary",
        monthly_premiums: Array(12).fill(500),
        monthly_slcsps: Array(12).fill(600),
      })], 6),
    Error,
    "complete monthly columns",
  );
});

Deno.test("same-state spouses add separate SLCSP through wedding month, then dedupe", () => {
  const policy = (owner: "primary" | "spouse", number: string) =>
    minimalItem({
      policy_number: number,
      alternative_marriage_owner: owner,
      coverage_state: "NY",
      monthly_premiums: Array(12).fill(500),
      monthly_slcsps: Array(12).fill(600),
      monthly_aptcs: Array(12).fill(500),
    });
  const source = compute([
    policy("primary", "PRIMARY-1095A"),
    policy("spouse", "SPOUSE-1095A"),
  ], 6);
  const sourceFields = findOutput(source, "form8962")?.fields;
  assertEquals(sourceFields?.monthly_slcsps, [
    ...Array(6).fill(1_200),
    ...Array(6).fill(600),
  ]);
  assertEquals(sourceFields?.annual_slcsp, 10_800);
  assertEquals(sourceFields?.alternative_marriage_source_month, 6);
  assertEquals(sourceFields?.annual_line11_eligible, undefined);
  const calculated = form8962.compute({ taxYear: 2025, formType: "f1040" }, {
    ...sourceFields,
    fpl_region: "contiguous",
    filing_status: FilingStatus.MFJ,
    dependent_income_complete: true,
    household_size: 2,
    taxpayer_modified_agi: 80_000,
    alternative_marriage: {
      both_unmarried_january_1: true,
      married_december_31: true,
      alternative_family_sizes_verified: true,
      marriage_month: 6,
      primary: { family_size: 1, policy_numbers: ["PRIMARY-1095A"] },
      spouse: { family_size: 1, policy_numbers: ["SPOUSE-1095A"] },
    },
  });
  const form = calculated.outputs.find((item) => item.nodeType === "form8962")
    ?.fields;
  const rows = form?.monthly_ptc_rows as Array<{ slcsp: number }>;
  assertEquals(rows[0].slcsp, 1_200);
  assertEquals(rows[6].slcsp, 600);
  assertEquals(form?.alternative_marriage_primary, {
    family_size: 1,
    monthly_contribution: 153,
    start_month: 1,
    end_month: 6,
  });
  assertEquals(form?.alternative_marriage_spouse, {
    family_size: 1,
    monthly_contribution: 153,
    start_month: 1,
    end_month: 6,
  });
  assertThrows(
    () => form8962Mef.build(form!),
    Error,
    "needs Form 1095-A and finalized Form 1040 facts",
  );
  assertThrows(
    () => form8962Pdf.projectFields?.(form!, {}),
    Error,
    "verified general return source",
  );
});

Deno.test("marriage source month is required and cannot contradict Part V", () => {
  const policy = minimalItem({
    policy_number: "PRIMARY-1095A",
    alternative_marriage_owner: "primary",
    coverage_state: "NY",
    monthly_premiums: Array(12).fill(500),
    monthly_slcsps: Array(12).fill(600),
    monthly_aptcs: Array(12).fill(500),
  });
  assertThrows(() => compute([policy]), Error, "must be supplied together");
  assertThrows(
    () =>
      compute([
        minimalItem({
          coverage_state: "NY",
          monthly_premiums: Array(12).fill(500),
          monthly_slcsps: Array(12).fill(600),
          monthly_aptcs: Array(12).fill(500),
        }),
        policy,
      ], 6),
    Error,
    "spouse owner",
  );
});

Deno.test("issuer_name alone does not produce form8962 output", () => {
  const result = compute([minimalItem()]);
  const out = findOutput(result, "form8962");
  assertEquals(out, undefined);
});

// ── 3. Aggregation across multiple policies ────────────────────────────────────

Deno.test("annual_premium sums across multiple policies", () => {
  const result = compute([
    minimalItem({ annual_premium: 600 }),
    minimalItem({ issuer_name: "Second Plan", annual_premium: 400 }),
  ]);
  const out = findOutput(result, "form8962");
  assertEquals(out?.fields.annual_premium, 1000);
});

Deno.test("annual_slcsp sums across multiple policies", () => {
  const result = compute([
    minimalItem({ annual_slcsp: 700 }),
    minimalItem({ issuer_name: "Plan B", annual_slcsp: 300 }),
  ]);
  const out = findOutput(result, "form8962");
  assertEquals(out?.fields.annual_slcsp, 1000);
});

Deno.test("annual_aptc sums across multiple policies", () => {
  const result = compute([
    minimalItem({ annual_aptc: 500 }),
    minimalItem({ issuer_name: "Plan B", annual_aptc: 250 }),
  ]);
  const out = findOutput(result, "form8962");
  assertEquals(out?.fields.annual_aptc, 750);
});

// ── 7. Informational fields ───────────────────────────────────────────────────

Deno.test("policy_number does not produce tax output", () => {
  const withoutPolicyNumber = compute([minimalItem()]);
  const withPolicyNumber = compute([minimalItem({ policy_number: "POL123" })]);
  assertEquals(
    withoutPolicyNumber.outputs.length,
    withPolicyNumber.outputs.length,
  );
});

Deno.test("policy-numbered monthly premiums and APTC retain Pub 974 source identity", () => {
  const result = compute([minimalItem({
    policy_number: "SEHI-2025",
    monthly_premiums: [800, ...Array(11).fill(0)],
    monthly_slcsps: [900, ...Array(11).fill(0)],
    monthly_aptcs: [300, ...Array(11).fill(0)],
  })]);
  assertEquals(
    findOutput(result, "form8962")?.fields.pub974_form1095a_policy_months,
    [{
      form1095a_policy_number: "SEHI-2025",
      month: 1,
      premium: 800,
      aptc: 300,
    }],
  );
});

// ── 8. Edge cases ─────────────────────────────────────────────────────────────

Deno.test("all-zero monthly arrays does not route to form8962", () => {
  const result = compute([
    minimalItem({
      monthly_premiums: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      monthly_slcsps: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      monthly_aptcs: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    }),
  ]);
  const out = findOutput(result, "form8962");
  assertEquals(out, undefined);
});

Deno.test("no APTC paid routes annual premium and slcsp to form8962", () => {
  const result = compute([
    minimalItem({ annual_premium: 1200, annual_slcsp: 1500, annual_aptc: 0 }),
  ]);
  const out = findOutput(result, "form8962");
  assertEquals(out?.fields.annual_premium, 1200);
  assertEquals(out?.fields.annual_slcsp, 1500);
});

Deno.test("an explicit zero monthly APTC column stays with covered months", () => {
  const result = compute([minimalItem({
    monthly_premiums: Array(12).fill(500),
    monthly_slcsps: Array(12).fill(600),
    monthly_aptcs: Array(12).fill(0),
    slcsp_corrections: noAptcDeterminations(
      Array(12).fill(500),
      Array(12).fill(600),
    ),
  })]);
  const out = findOutput(result, "form8962");
  assertEquals(out?.fields.monthly_aptcs, Array(12).fill(0));
  assertEquals(out?.fields.annual_line11_eligible, true);
});

Deno.test("changed monthly premiums require Form 8962 monthly rows", () => {
  const result = compute([minimalItem({
    monthly_premiums: [500, ...Array(11).fill(600)],
    monthly_slcsps: Array(12).fill(700),
    monthly_aptcs: Array(12).fill(100),
  })]);
  assertEquals(
    findOutput(result, "form8962")?.fields.annual_line11_eligible,
    undefined,
  );
});

Deno.test("annual 1095-A total cannot disagree with its monthly column", () => {
  assertThrows(
    () =>
      compute([minimalItem({
        monthly_premiums: Array(12).fill(500),
        annual_premium: 5_000,
      })]),
    Error,
    "annual_premium must equal its twelve monthly amounts",
  );
});

Deno.test("same issuer and policy month cannot be counted twice", () => {
  assertThrows(
    () =>
      compute([
        minimalItem({
          policy_number: "POLICY-123",
          monthly_premiums: Array(12).fill(500),
          monthly_aptcs: Array(12).fill(100),
        }),
        minimalItem({
          policy_number: " POLICY-123 ",
          monthly_premiums: Array(12).fill(550),
          monthly_aptcs: Array(12).fill(100),
        }),
      ]),
    Error,
    "repeats coverage for the same issuer, policy, and month",
  );
});

Deno.test("same policy can have separate statements for disjoint months", () => {
  const firstMonths = [...Array(6).fill(500), ...Array(6).fill(0)];
  const secondMonths = [...Array(6).fill(0), ...Array(6).fill(600)];
  const result = compute([
    minimalItem({
      policy_number: "POLICY-123",
      coverage_state: "TX",
      monthly_premiums: firstMonths,
      monthly_slcsps: [...Array(6).fill(700), ...Array(6).fill(0)],
      monthly_aptcs: [...Array(6).fill(100), ...Array(6).fill(0)],
    }),
    minimalItem({
      policy_number: "POLICY-123",
      coverage_state: "TX",
      monthly_premiums: secondMonths,
      monthly_slcsps: [...Array(6).fill(0), ...Array(6).fill(800)],
      monthly_aptcs: [...Array(6).fill(0), ...Array(6).fill(120)],
    }),
  ]);
  const fields = findOutput(result, "form8962")?.fields;
  assertEquals(fields?.monthly_premiums, [
    ...firstMonths.slice(0, 6),
    ...secondMonths.slice(6),
  ]);
  assertEquals(fields?.monthly_slcsps, [
    ...Array(6).fill(700),
    ...Array(6).fill(800),
  ]);
});

Deno.test("repeated policy with annual-only statements cannot establish disjoint months", () => {
  assertThrows(
    () =>
      compute([
        minimalItem({ policy_number: "POLICY-123", annual_premium: 6_000 }),
        minimalItem({ policy_number: "POLICY-123", annual_premium: 6_500 }),
      ]),
    Error,
    "needs monthly coverage for every statement",
  );
});

Deno.test("different policy identities can aggregate annual premiums", () => {
  const result = compute([
    minimalItem({ policy_number: "POLICY-123", annual_premium: 6_000 }),
    minimalItem({ policy_number: "POLICY-456", annual_premium: 6_500 }),
  ]);
  assertEquals(findOutput(result, "form8962")?.fields.annual_premium, 12_500);
});

Deno.test("different issuers may use the same policy number", () => {
  const result = compute([
    minimalItem({ policy_number: "POLICY-123", annual_premium: 6_000 }),
    minimalItem({
      issuer_name: "Second Marketplace",
      policy_number: "POLICY-123",
      annual_premium: 6_500,
    }),
  ]);
  assertEquals(findOutput(result, "form8962")?.fields.annual_premium, 12_500);
});

Deno.test("multiple policies aggregate monthly arrays", () => {
  const result = compute([
    minimalItem({
      coverage_state: "TX",
      monthly_premiums: [100, 100, 100, 100, 100, 100, 0, 0, 0, 0, 0, 0],
      monthly_slcsps: [120, 120, 120, 120, 120, 120, 0, 0, 0, 0, 0, 0],
      monthly_aptcs: Array(12).fill(0),
      slcsp_corrections: noAptcDeterminations(
        [100, 100, 100, 100, 100, 100, 0, 0, 0, 0, 0, 0],
        [120, 120, 120, 120, 120, 120, 0, 0, 0, 0, 0, 0],
      ),
    }),
    minimalItem({
      issuer_name: "Second Marketplace",
      coverage_state: "TX",
      monthly_premiums: [0, 0, 0, 0, 0, 0, 200, 200, 200, 200, 200, 200],
      monthly_slcsps: [0, 0, 0, 0, 0, 0, 220, 220, 220, 220, 220, 220],
      monthly_aptcs: Array(12).fill(0),
      slcsp_corrections: noAptcDeterminations(
        [0, 0, 0, 0, 0, 0, 200, 200, 200, 200, 200, 200],
        [0, 0, 0, 0, 0, 0, 220, 220, 220, 220, 220, 220],
      ),
    }),
  ]);
  const out = findOutput(result, "form8962");
  const premiums = out?.fields.monthly_premiums as number[];
  assertEquals(premiums[0], 100);
  assertEquals(premiums[6], 200);
});

Deno.test("same-state policies use one SLCSP while premiums and APTC add", () => {
  const result = compute([
    minimalItem({
      coverage_state: "TX",
      monthly_premiums: Array(12).fill(300),
      monthly_slcsps: Array(12).fill(600),
      monthly_aptcs: Array(12).fill(100),
    }),
    minimalItem({
      coverage_state: "TX",
      monthly_premiums: Array(12).fill(200),
      monthly_slcsps: Array(12).fill(600),
      monthly_aptcs: Array(12).fill(50),
    }),
  ]);
  const fields = findOutput(result, "form8962")?.fields;
  assertEquals(fields?.monthly_premiums, Array(12).fill(500));
  assertEquals(fields?.monthly_slcsps, Array(12).fill(600));
  assertEquals(fields?.monthly_aptcs, Array(12).fill(150));
  assertEquals(fields?.annual_line11_eligible, true);
});

Deno.test("overlapping same-state 1095-A line 33 SLCSP is selected once, not summed", () => {
  const result = compute([
    minimalItem({
      policy_number: "POLICY-1",
      coverage_state: "TX",
      monthly_premiums: Array(12).fill(300),
      monthly_slcsps: Array(12).fill(600),
      monthly_aptcs: Array(12).fill(100),
      annual_premium: 3_600,
      annual_slcsp: 7_200,
      annual_aptc: 1_200,
    }),
    minimalItem({
      policy_number: "POLICY-2",
      coverage_state: "TX",
      monthly_premiums: Array(12).fill(200),
      monthly_slcsps: Array(12).fill(600),
      monthly_aptcs: Array(12).fill(50),
      annual_premium: 2_400,
      annual_slcsp: 7_200,
      annual_aptc: 600,
    }),
  ]);
  const fields = findOutput(result, "form8962")?.fields;
  assertEquals(fields?.monthly_premiums, Array(12).fill(500));
  assertEquals(fields?.monthly_slcsps, Array(12).fill(600));
  assertEquals(fields?.monthly_aptcs, Array(12).fill(150));
  assertEquals(fields?.annual_premium, 6_000);
  assertEquals(fields?.annual_slcsp, 7_200);
  assertEquals(fields?.annual_aptc, 1_800);
});

Deno.test("different-state policies add their SLCSP amounts", () => {
  const result = compute([
    minimalItem({
      coverage_state: "TX",
      monthly_premiums: Array(12).fill(300),
      monthly_slcsps: Array(12).fill(600),
      monthly_aptcs: Array(12).fill(0),
      slcsp_corrections: noAptcDeterminations(
        Array(12).fill(300),
        Array(12).fill(600),
      ),
    }),
    minimalItem({
      coverage_state: "CA",
      monthly_premiums: Array(12).fill(200),
      monthly_slcsps: Array(12).fill(700),
      monthly_aptcs: Array(12).fill(0),
      slcsp_corrections: noAptcDeterminations(
        Array(12).fill(200),
        Array(12).fill(700),
      ),
    }),
  ]);
  assertEquals(
    findOutput(result, "form8962")?.fields.monthly_slcsps,
    Array(12).fill(1_300),
  );
  assertEquals(
    findOutput(result, "form8962")?.fields.annual_line11_eligible,
    true,
  );
});

Deno.test("multiple covered policies reject missing state or conflicting same-state SLCSP", () => {
  const first = minimalItem({
    coverage_state: "TX",
    monthly_premiums: Array(12).fill(300),
    monthly_slcsps: Array(12).fill(600),
    monthly_aptcs: Array(12).fill(0),
    slcsp_corrections: noAptcDeterminations(
      Array(12).fill(300),
      Array(12).fill(600),
    ),
  });
  assertThrows(
    () =>
      compute([
        first,
        minimalItem({
          monthly_premiums: Array(12).fill(200),
          monthly_slcsps: Array(12).fill(600),
          monthly_aptcs: Array(12).fill(0),
          slcsp_corrections: noAptcDeterminations(
            Array(12).fill(200),
            Array(12).fill(600),
          ),
        }),
      ]),
    Error,
    "monthly SLCSP and coverage_state",
  );
  assertThrows(
    () =>
      compute([
        first,
        minimalItem({
          coverage_state: "TX",
          monthly_premiums: Array(12).fill(200),
          monthly_slcsps: Array(12).fill(700),
          monthly_aptcs: Array(12).fill(0),
          slcsp_corrections: noAptcDeterminations(
            Array(12).fill(200),
            Array(12).fill(700),
          ),
        }),
      ]),
    Error,
    "same-state policies disagree on monthly SLCSP",
  );
});

Deno.test("monthly policy cannot silently omit an annual-only policy", () => {
  assertThrows(
    () =>
      compute([
        minimalItem({
          monthly_premiums: Array(12).fill(500),
          monthly_slcsps: Array(12).fill(600),
          monthly_aptcs: Array(12).fill(0),
          slcsp_corrections: noAptcDeterminations(
            Array(12).fill(500),
            Array(12).fill(600),
          ),
          annual_premium: 6_000,
          annual_slcsp: 7_200,
        }),
        minimalItem({
          issuer_name: "Second Marketplace",
          annual_premium: 1_200,
          annual_slcsp: 1_400,
        }),
      ]),
    Error,
    "need monthly columns for every policy",
  );
});

// ── 9. Smoke test ─────────────────────────────────────────────────────────────

Deno.test("smoke test — full 1095-A with all major fields", () => {
  const result = compute([
    minimalItem({
      policy_number: "MP-2025-001",
      annual_premium: 14400,
      annual_slcsp: 18000,
      annual_aptc: 9600,
      monthly_premiums: [
        1200,
        1200,
        1200,
        1200,
        1200,
        1200,
        1200,
        1200,
        1200,
        1200,
        1200,
        1200,
      ],
      monthly_slcsps: [
        1500,
        1500,
        1500,
        1500,
        1500,
        1500,
        1500,
        1500,
        1500,
        1500,
        1500,
        1500,
      ],
      monthly_aptcs: [
        800,
        800,
        800,
        800,
        800,
        800,
        800,
        800,
        800,
        800,
        800,
        800,
      ],
    }),
  ]);
  const out = findOutput(result, "form8962");
  assertEquals(out?.fields.annual_premium, 14400);
  assertEquals(out?.fields.annual_slcsp, 18000);
  assertEquals(out?.fields.annual_aptc, 9600);
  assertEquals(Array.isArray(out?.fields.monthly_premiums), true);
  assertEquals(Array.isArray(out?.fields.monthly_slcsps), true);
  assertEquals(Array.isArray(out?.fields.monthly_aptcs), true);
  assertEquals((out?.fields.monthly_premiums as number[]).length, 12);
});

Deno.test("shared MFS exception allocates half premium and APTC but uses family SLCSP", () => {
  const result = compute([minimalItem({
    policy_number: "POLICY-2025-123456",
    monthly_premiums: Array(12).fill(1_200),
    monthly_slcsps: Array(12).fill(1_500),
    monthly_aptcs: Array(12).fill(800),
    shared_policy_periods: [{
      basis: "mfs_exception",
      other_taxpayer_ssn: "222-33-4444",
      start_month: 1,
      end_month: 12,
      monthly_family_slcsps: Array(12).fill(700),
    }],
  })]);
  const fields = findOutput(result, "form8962")?.fields;
  assertEquals(fields?.monthly_premiums, Array(12).fill(600));
  assertEquals(fields?.monthly_slcsps, Array(12).fill(700));
  assertEquals(fields?.monthly_aptcs, Array(12).fill(400));
  assertEquals(fields?.annual_line11_eligible, undefined);
  assertEquals(fields?.shared_policy_allocations, [{
    basis: "mfs_exception",
    policy_number: "ICY-2025-123456",
    other_taxpayer_ssn: "222334444",
    start_month: 1,
    end_month: 12,
    premium_pct: 0.5,
    aptc_pct: 0.5,
  }]);
});

Deno.test("shared MFS no-exception allocates only half APTC", () => {
  const result = compute([minimalItem({
    policy_number: "MFS-POLICY-1",
    monthly_premiums: Array(12).fill(1_200),
    monthly_slcsps: Array(12).fill(1_500),
    monthly_aptcs: Array(12).fill(800),
    shared_policy_periods: [{
      basis: "mfs_no_exception",
      other_taxpayer_ssn: "222-33-4444",
      start_month: 1,
      end_month: 12,
    }],
  })]);
  const fields = findOutput(result, "form8962")?.fields;
  assertEquals(fields?.monthly_premiums, Array(12).fill(0));
  assertEquals(fields?.monthly_slcsps, Array(12).fill(0));
  assertEquals(fields?.monthly_aptcs, Array(12).fill(400));
  assertEquals(fields?.shared_policy_allocations, [{
    basis: "mfs_no_exception",
    policy_number: "MFS-POLICY-1",
    other_taxpayer_ssn: "222334444",
    start_month: 1,
    end_month: 12,
    aptc_pct: 0.5,
  }]);
});

Deno.test("shared MFS source rejects coverage outside allocation and missing family SLCSP", () => {
  const base = {
    policy_number: "MFS-POLICY-1",
    monthly_premiums: Array(12).fill(1_200),
    monthly_aptcs: Array(12).fill(800),
  };
  assertThrows(
    () =>
      compute([minimalItem({
        ...base,
        shared_policy_periods: [{
          basis: "mfs_no_exception",
          other_taxpayer_ssn: "222-33-4444",
          start_month: 1,
          end_month: 6,
        }],
      })]),
    Error,
    "coverage outside its allocation months",
  );
  assertThrows(
    () =>
      compute([minimalItem({
        ...base,
        shared_policy_periods: [{
          basis: "mfs_exception",
          other_taxpayer_ssn: "222-33-4444",
          start_month: 1,
          end_month: 12,
          monthly_family_slcsps: Array(12).fill(0),
        }],
      })]),
    Error,
    "coverage-family SLCSP",
  );
});

Deno.test("divorced taxpayers use the same agreed share for all three policy amounts", () => {
  const result = compute([minimalItem({
    policy_number: "DIV-POLICY-1",
    monthly_premiums: [1_200, ...Array(11).fill(0)],
    monthly_slcsps: [1_500, ...Array(11).fill(0)],
    monthly_aptcs: [800, ...Array(11).fill(0)],
    shared_policy_periods: [{
      basis: "divorce_agreed",
      divorced_or_legally_separated_in_tax_year: true,
      shared_during_marriage: true,
      other_taxpayer_ssn: "222-33-4444",
      start_month: 1,
      end_month: 1,
      allocation_pct: 0.67,
    }],
  })]);
  const fields = findOutput(result, "form8962")?.fields;
  assertEquals((fields?.monthly_premiums as number[])[0], 804);
  assertEquals((fields?.monthly_slcsps as number[])[0], 1_005);
  assertEquals((fields?.monthly_aptcs as number[])[0], 536);
  assertEquals(fields?.shared_policy_allocations, [{
    basis: "divorce_agreed",
    policy_number: "DIV-POLICY-1",
    other_taxpayer_ssn: "222334444",
    start_month: 1,
    end_month: 1,
    premium_pct: 0.67,
    slcsp_pct: 0.67,
    aptc_pct: 0.67,
  }]);
});

Deno.test("divorce without agreement uses the statutory 50 percent share", () => {
  const result = compute([minimalItem({
    policy_number: "DIVORCE-POLICY-2",
    monthly_premiums: [1_201, ...Array(11).fill(0)],
    monthly_slcsps: [1_500, ...Array(11).fill(0)],
    monthly_aptcs: [801, ...Array(11).fill(0)],
    shared_policy_periods: [{
      basis: "divorce_no_agreement",
      divorced_or_legally_separated_in_tax_year: true,
      shared_during_marriage: true,
      other_taxpayer_ssn: "222-33-4444",
      start_month: 1,
      end_month: 1,
    }],
  })]);
  const fields = findOutput(result, "form8962")?.fields;
  assertEquals((fields?.monthly_premiums as number[])[0], 601);
  assertEquals((fields?.monthly_slcsps as number[])[0], 750);
  assertEquals((fields?.monthly_aptcs as number[])[0], 401);
  assertEquals(
    (fields?.shared_policy_allocations as { slcsp_pct: number }[])[0]
      .slcsp_pct,
    0.5,
  );
});

Deno.test("other shared family agreement preserves a zero-percent Part IV row", () => {
  const result = compute([minimalItem({
    policy_number: "OTHER-POLICY-1",
    monthly_premiums: [1_200, ...Array(11).fill(0)],
    monthly_slcsps: [1_500, ...Array(11).fill(0)],
    monthly_aptcs: [800, ...Array(11).fill(0)],
    shared_policy_periods: [{
      basis: "other_agreed",
      situations_1_to_3_reviewed_and_inapplicable: true,
      other_taxpayer_ssn: "222-33-4444",
      start_month: 1,
      end_month: 1,
      allocation_pct: 0,
    }],
  })]);
  const fields = findOutput(result, "form8962")?.fields;
  assertEquals(fields?.monthly_premiums, Array(12).fill(0));
  assertEquals(fields?.monthly_slcsps, Array(12).fill(0));
  assertEquals(fields?.monthly_aptcs, Array(12).fill(0));
  assertEquals(
    (fields?.shared_policy_allocations as { premium_pct: number }[])[0]
      .premium_pct,
    0,
  );
});

Deno.test("agreed allocation rejects percentages beyond two decimal places", () => {
  assertThrows(
    () =>
      compute([minimalItem({
        policy_number: "OTHER-POLICY-1",
        monthly_premiums: Array(12).fill(1_200),
        monthly_slcsps: Array(12).fill(1_500),
        monthly_aptcs: Array(12).fill(800),
        shared_policy_periods: [{
          basis: "other_agreed",
          situations_1_to_3_reviewed_and_inapplicable: true,
          other_taxpayer_ssn: "222-33-4444",
          start_month: 1,
          end_month: 12,
          allocation_pct: 0.671,
        }],
      })]),
    Error,
    "two decimal places",
  );
});

Deno.test("Situation 3 uses exact family SLCSP ratio for dollars and rounded Part IV percent", () => {
  const result = compute([minimalItem({
    policy_number: "NO-APTC-POLICY",
    monthly_premiums: [15_000, ...Array(11).fill(0)],
    monthly_aptcs: Array(12).fill(0),
    slcsp_corrections: [{
      month: 1,
      basis: "no_aptc",
      corrected_slcsp: 12_000,
      determination_source: "marketplace_tool",
    }],
    shared_policy_periods: [{
      basis: "no_aptc",
      other_taxpayer_ssn: "222-33-4444",
      start_month: 1,
      end_month: 1,
      monthly_family_slcsps: [12_000, ...Array(11).fill(0)],
      monthly_other_family_slcsps: [6_000, ...Array(11).fill(0)],
    }],
  })]);
  const fields = findOutput(result, "form8962")?.fields;
  assertEquals((fields?.monthly_premiums as number[])[0], 10_000);
  assertEquals((fields?.monthly_slcsps as number[])[0], 12_000);
  assertEquals(fields?.shared_policy_allocations, [{
    basis: "no_aptc",
    policy_number: "NO-APTC-POLICY",
    other_taxpayer_ssn: "222334444",
    start_month: 1,
    end_month: 1,
    premium_pct: 0.67,
  }]);
});

Deno.test("Situation 4 without agreement uses enrollee ratio for dollars", () => {
  const result = compute([minimalItem({
    policy_number: "OTHER-POLICY-2",
    monthly_premiums: [15_000, ...Array(11).fill(0)],
    monthly_slcsps: [12_000, ...Array(11).fill(0)],
    monthly_aptcs: [6_000, ...Array(11).fill(0)],
    shared_policy_periods: [{
      basis: "other_no_agreement",
      situations_1_to_3_reviewed_and_inapplicable: true,
      other_taxpayer_ssn: "222-33-4444",
      start_month: 1,
      end_month: 1,
      allocated_enrollees_in_tax_family: 1,
      total_enrollees: 3,
    }],
  })]);
  const fields = findOutput(result, "form8962")?.fields;
  assertEquals((fields?.monthly_premiums as number[])[0], 5_000);
  assertEquals((fields?.monthly_slcsps as number[])[0], 4_000);
  assertEquals((fields?.monthly_aptcs as number[])[0], 2_000);
  assertEquals(fields?.shared_policy_allocations, [{
    basis: "other_no_agreement",
    policy_number: "OTHER-POLICY-2",
    other_taxpayer_ssn: "222334444",
    start_month: 1,
    end_month: 1,
    premium_pct: 0.33,
    slcsp_pct: 0.33,
    aptc_pct: 0.33,
  }]);
});

Deno.test("one policy can have separate Part IV percentages across two periods", () => {
  const first = {
    basis: "other_agreed",
    situations_1_to_3_reviewed_and_inapplicable: true,
    other_taxpayer_ssn: "222-33-4444",
    start_month: 1,
    end_month: 6,
    allocation_pct: 0.2,
  };
  const second = {
    ...first,
    start_month: 7,
    end_month: 12,
    allocation_pct: 0.8,
  };
  const source = minimalItem({
    policy_number: "SPLIT-POLICY",
    monthly_premiums: Array(12).fill(1_200),
    monthly_slcsps: Array(12).fill(1_500),
    monthly_aptcs: Array(12).fill(800),
    shared_policy_periods: [first, second],
  });
  const result = compute([source]);
  const fields = findOutput(result, "form8962")?.fields;
  assertEquals(fields?.monthly_premiums, [
    ...Array(6).fill(240),
    ...Array(6).fill(960),
  ]);
  assertEquals(fields?.monthly_slcsps, [
    ...Array(6).fill(300),
    ...Array(6).fill(1_200),
  ]);
  assertEquals(fields?.monthly_aptcs, [
    ...Array(6).fill(160),
    ...Array(6).fill(640),
  ]);
  assertEquals(
    (fields?.shared_policy_allocations as { premium_pct: number }[]).map(
      (row) => row.premium_pct,
    ),
    [0.2, 0.8],
  );
  assertThrows(
    () =>
      compute([minimalItem({
        ...source,
        shared_policy_periods: [first, { ...second, start_month: 6 }],
      })]),
    Error,
    "periods overlap",
  );
  assertThrows(
    () =>
      compute([minimalItem({
        ...source,
        shared_policy_periods: [{ ...first, end_month: 5 }, second],
      })]),
    Error,
    "coverage outside its allocation months",
  );
});

Deno.test("shared months and family-only months on one policy use separate SLCSPs", () => {
  const result = compute([minimalItem({
    policy_number: "MIXED-POLICY",
    monthly_premiums: Array(12).fill(1_200),
    monthly_slcsps: Array(12).fill(1_500),
    monthly_aptcs: Array(12).fill(800),
    shared_policy_periods: [{
      basis: "mfs_exception",
      other_taxpayer_ssn: "222-33-4444",
      start_month: 1,
      end_month: 6,
      monthly_family_slcsps: [
        ...Array(6).fill(700),
        ...Array(6).fill(0),
      ],
    }, {
      basis: "family_only",
      only_tax_family_covered: true,
      start_month: 7,
      end_month: 12,
      monthly_family_slcsps: [
        ...Array(6).fill(0),
        ...Array(6).fill(900),
      ],
    }],
  })]);
  const fields = findOutput(result, "form8962")?.fields;
  assertEquals(fields?.monthly_premiums, [
    ...Array(6).fill(600),
    ...Array(6).fill(1_200),
  ]);
  assertEquals(fields?.monthly_slcsps, [
    ...Array(6).fill(700),
    ...Array(6).fill(900),
  ]);
  assertEquals(fields?.monthly_aptcs, [
    ...Array(6).fill(400),
    ...Array(6).fill(800),
  ]);
  assertEquals(
    (fields?.shared_policy_allocations as unknown[]).length,
    1,
  );
});

Deno.test("family-only periods cannot replace a required shared allocation", () => {
  assertThrows(
    () =>
      compute([minimalItem({
        policy_number: "MIXED-POLICY",
        monthly_premiums: Array(12).fill(1_200),
        monthly_aptcs: Array(12).fill(800),
        shared_policy_periods: [{
          basis: "family_only",
          only_tax_family_covered: true,
          start_month: 1,
          end_month: 12,
          monthly_family_slcsps: Array(12).fill(900),
        }],
      })]),
    Error,
    "at least one allocation period",
  );
});

Deno.test("five Part IV periods remain separate source allocations", () => {
  const result = compute([minimalItem({
    policy_number: "FIVE-PERIODS",
    monthly_premiums: [...Array(5).fill(1_200), ...Array(7).fill(0)],
    monthly_slcsps: [...Array(5).fill(1_500), ...Array(7).fill(0)],
    monthly_aptcs: [...Array(5).fill(800), ...Array(7).fill(0)],
    shared_policy_periods: Array.from({ length: 5 }, (_, index) => ({
      basis: "other_agreed",
      situations_1_to_3_reviewed_and_inapplicable: true,
      other_taxpayer_ssn: "222-33-4444",
      start_month: index + 1,
      end_month: index + 1,
      allocation_pct: (index + 1) / 10,
    })),
  })]);
  const rows = findOutput(result, "form8962")?.fields
    .shared_policy_allocations as { premium_pct: number }[];
  assertEquals(rows.length, 5);
  assertEquals(rows.map((row) => row.premium_pct), [0.1, 0.2, 0.3, 0.4, 0.5]);
});

Deno.test("coverage-family change replaces reported SLCSP for affected months", () => {
  // IRS Form 8962 instructions, line 10, Example 3: MEC eligibility starts
  // in August, but Form 1095-A column B still reflects the old family.
  const result = compute([minimalItem({
    monthly_premiums: Array(12).fill(800),
    monthly_slcsps: Array(12).fill(850),
    monthly_aptcs: Array(12).fill(700),
    annual_slcsp: 10_200,
    slcsp_review_periods: [{
      start_month: 8,
      end_month: 12,
      reason: "coverage_family_change",
      reported_to_marketplace: false,
    }],
    slcsp_corrections: Array.from({ length: 5 }, (_, index) => ({
      month: index + 8,
      basis: "coverage_family_change",
      corrected_slcsp: 400,
      determination_source: "marketplace_tool",
    })),
  })]);
  const fields = findOutput(result, "form8962")?.fields;
  assertEquals(fields?.monthly_slcsps, [
    ...Array(7).fill(850),
    ...Array(5).fill(400),
  ]);
  assertEquals(fields?.annual_line11_eligible, undefined);
  assertEquals(fields?.annual_slcsp, 7_950);
  const calculated = form8962.compute({ taxYear: 2025, formType: "f1040" }, {
    ...fields,
    filing_status: FilingStatus.Single,
    fpl_region: "contiguous",
    household_size: 1,
    taxpayer_modified_agi: 30_000,
    dependent_income_complete: true,
  });
  const form = calculated.outputs.find((item) => item.nodeType === "form8962")
    ?.fields;
  const rows = form?.monthly_ptc_rows as Array<{ slcsp: number }>;
  assertEquals(rows[6].slcsp, 850);
  assertEquals(rows[7].slcsp, 400);
  assertThrows(
    () => form8962Mef.build(form!),
    Error,
    "needs Form 1095-A and finalized Form 1040 facts",
  );
  assertEquals(
    form8962Pdf.projectFields?.(form!, {})?.pdf_month_8_slcsp,
    "400",
  );
});

Deno.test("reported SLCSP does not substitute for Marketplace determination in no-APTC months", () => {
  const source = {
    monthly_premiums: [600, ...Array(11).fill(0)],
    monthly_slcsps: [750, ...Array(11).fill(0)],
    monthly_aptcs: Array(12).fill(0),
  };
  assertThrows(
    () => compute([minimalItem(source)]),
    Error,
    "need Marketplace SLCSP determinations",
  );
  const result = compute([minimalItem({
    ...source,
    slcsp_corrections: [{
      month: 1,
      basis: "no_aptc",
      corrected_slcsp: 750,
      determination_source: "marketplace_contact",
    }],
  })]);
  assertEquals(findOutput(result, "form8962")?.fields.monthly_slcsps, [
    750,
    ...Array(11).fill(0),
  ]);
});

Deno.test("unreported coverage-family period requires every covered month's determination", () => {
  const source = {
    monthly_premiums: Array(12).fill(800),
    monthly_slcsps: Array(12).fill(850),
    monthly_aptcs: Array(12).fill(700),
    slcsp_review_periods: [{
      start_month: 8,
      end_month: 9,
      reason: "coverage_family_change",
      reported_to_marketplace: false,
    }],
  };
  assertThrows(
    () =>
      compute([minimalItem({
        ...source,
        slcsp_corrections: [{
          month: 8,
          basis: "coverage_family_change",
          corrected_slcsp: 400,
          determination_source: "marketplace_tool",
        }],
      })]),
    Error,
    "need Marketplace SLCSP determinations",
  );
  assertThrows(
    () =>
      compute([minimalItem({
        ...source,
        slcsp_review_periods: undefined,
        slcsp_corrections: [{
          month: 8,
          basis: "coverage_family_change",
          corrected_slcsp: 400,
          determination_source: "marketplace_tool",
        }],
      })]),
    Error,
    "needs an unreported review period",
  );
  const reported = compute([minimalItem({
    ...source,
    slcsp_review_periods: [{
      ...source.slcsp_review_periods[0],
      reported_to_marketplace: true,
    }],
  })]);
  assertEquals(
    (findOutput(reported, "form8962")?.fields.monthly_slcsps as number[])[7],
    850,
  );
});

Deno.test("unreported move with no APTC requires the move basis and a determined SLCSP", () => {
  const source = {
    monthly_premiums: [600, ...Array(11).fill(0)],
    monthly_slcsps: [750, ...Array(11).fill(0)],
    monthly_aptcs: Array(12).fill(0),
    slcsp_review_periods: [{
      start_month: 1,
      end_month: 1,
      reason: "move",
      reported_to_marketplace: false,
    }],
  };
  assertThrows(
    () =>
      compute([minimalItem({
        ...source,
        slcsp_corrections: [{
          month: 1,
          basis: "no_aptc",
          corrected_slcsp: 800,
          determination_source: "marketplace_tool",
        }],
      })]),
    Error,
    "basis must match the unreported change",
  );
  const result = compute([minimalItem({
    ...source,
    slcsp_corrections: [{
      month: 1,
      basis: "move",
      corrected_slcsp: 800,
      determination_source: "marketplace_tool",
    }],
  })]);
  assertEquals(
    (findOutput(result, "form8962")?.fields.monthly_slcsps as number[])[0],
    800,
  );
});

Deno.test("missing column B can be supplied for every covered no-APTC month", () => {
  const result = compute([minimalItem({
    monthly_premiums: [600, 600, ...Array(10).fill(0)],
    monthly_aptcs: Array(12).fill(0),
    slcsp_corrections: [1, 2].map((month) => ({
      month,
      basis: "no_aptc",
      corrected_slcsp: 750,
      determination_source: "marketplace_tool",
    })),
  })]);
  assertEquals(findOutput(result, "form8962")?.fields.monthly_slcsps, [
    750,
    750,
    ...Array(10).fill(0),
  ]);
});

Deno.test("missing column B cannot leave a covered month uncorrected", () => {
  assertThrows(
    () =>
      compute([minimalItem({
        monthly_premiums: [600, 600, ...Array(10).fill(0)],
        monthly_aptcs: Array(12).fill(0),
        slcsp_corrections: [{
          month: 1,
          basis: "no_aptc",
          corrected_slcsp: 750,
          determination_source: "marketplace_tool",
        }],
      })]),
    Error,
    "need Marketplace SLCSP determinations",
  );
});

Deno.test("SLCSP corrections reject duplicate months and no-APTC contradictions", () => {
  const source = {
    monthly_premiums: Array(12).fill(600),
    monthly_slcsps: Array(12).fill(700),
    monthly_aptcs: Array(12).fill(300),
  };
  assertThrows(
    () =>
      compute([minimalItem({
        ...source,
        slcsp_corrections: [{
          month: 8,
          basis: "marketplace_error",
          corrected_slcsp: 650,
        }],
      })]),
    Error,
    "determination_source",
  );
  assertThrows(
    () =>
      compute([minimalItem({
        ...source,
        slcsp_review_periods: [{
          start_month: 8,
          end_month: 8,
          reason: "move",
          reported_to_marketplace: false,
        }],
        slcsp_corrections: [
          {
            month: 8,
            basis: "move",
            corrected_slcsp: 650,
            determination_source: "marketplace_tool",
          },
          {
            month: 8,
            basis: "move",
            corrected_slcsp: 650,
            determination_source: "marketplace_tool",
          },
        ],
      })]),
    Error,
    "repeat a month",
  );
  assertThrows(
    () =>
      compute([minimalItem({
        ...source,
        slcsp_corrections: [{
          month: 8,
          basis: "no_aptc",
          corrected_slcsp: 650,
          determination_source: "marketplace_tool",
        }],
      })]),
    Error,
    "conflicts with paid APTC",
  );
});
