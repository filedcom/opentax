import { assertEquals, assertThrows } from "@std/assert";
import { f1095a } from "./index.ts";

function minimalItem(overrides: Record<string, unknown> = {}) {
  return {
    issuer_name: "Test Marketplace",
    ...overrides,
  };
}

function compute(items: ReturnType<typeof minimalItem>[]) {
  return f1095a.compute({ taxYear: 2025, formType: "f1040" }, {
    f1095as: items,
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

Deno.test("multiple policies aggregate monthly arrays", () => {
  const result = compute([
    minimalItem({
      coverage_state: "TX",
      monthly_premiums: [100, 100, 100, 100, 100, 100, 0, 0, 0, 0, 0, 0],
      monthly_slcsps: [120, 120, 120, 120, 120, 120, 0, 0, 0, 0, 0, 0],
      monthly_aptcs: Array(12).fill(0),
    }),
    minimalItem({
      issuer_name: "Second Marketplace",
      coverage_state: "TX",
      monthly_premiums: [0, 0, 0, 0, 0, 0, 200, 200, 200, 200, 200, 200],
      monthly_slcsps: [0, 0, 0, 0, 0, 0, 220, 220, 220, 220, 220, 220],
      monthly_aptcs: Array(12).fill(0),
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

Deno.test("different-state policies add their SLCSP amounts", () => {
  const result = compute([
    minimalItem({
      coverage_state: "TX",
      monthly_premiums: Array(12).fill(300),
      monthly_slcsps: Array(12).fill(600),
      monthly_aptcs: Array(12).fill(0),
    }),
    minimalItem({
      coverage_state: "CA",
      monthly_premiums: Array(12).fill(200),
      monthly_slcsps: Array(12).fill(700),
      monthly_aptcs: Array(12).fill(0),
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
  });
  assertThrows(
    () =>
      compute([
        first,
        minimalItem({
          monthly_premiums: Array(12).fill(200),
          monthly_slcsps: Array(12).fill(600),
          monthly_aptcs: Array(12).fill(0),
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
    shared_policy: {
      basis: "mfs_exception",
      other_taxpayer_ssn: "222-33-4444",
      start_month: 1,
      end_month: 12,
      monthly_family_slcsps: Array(12).fill(700),
    },
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
    shared_policy: {
      basis: "mfs_no_exception",
      other_taxpayer_ssn: "222-33-4444",
      start_month: 1,
      end_month: 12,
    },
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
        shared_policy: {
          basis: "mfs_no_exception",
          other_taxpayer_ssn: "222-33-4444",
          start_month: 1,
          end_month: 6,
        },
      })]),
    Error,
    "coverage outside its allocation months",
  );
  assertThrows(
    () =>
      compute([minimalItem({
        ...base,
        shared_policy: {
          basis: "mfs_exception",
          other_taxpayer_ssn: "222-33-4444",
          start_month: 1,
          end_month: 12,
          monthly_family_slcsps: Array(12).fill(0),
        },
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
    shared_policy: {
      basis: "divorce_agreed",
      divorced_or_legally_separated_in_tax_year: true,
      shared_during_marriage: true,
      other_taxpayer_ssn: "222-33-4444",
      start_month: 1,
      end_month: 1,
      allocation_pct: 0.67,
    },
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
    shared_policy: {
      basis: "divorce_no_agreement",
      divorced_or_legally_separated_in_tax_year: true,
      shared_during_marriage: true,
      other_taxpayer_ssn: "222-33-4444",
      start_month: 1,
      end_month: 1,
    },
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
    shared_policy: {
      basis: "other_agreed",
      situations_1_to_3_reviewed_and_inapplicable: true,
      other_taxpayer_ssn: "222-33-4444",
      start_month: 1,
      end_month: 1,
      allocation_pct: 0,
    },
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
        shared_policy: {
          basis: "other_agreed",
          situations_1_to_3_reviewed_and_inapplicable: true,
          other_taxpayer_ssn: "222-33-4444",
          start_month: 1,
          end_month: 12,
          allocation_pct: 0.671,
        },
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
    shared_policy: {
      basis: "no_aptc",
      other_taxpayer_ssn: "222-33-4444",
      start_month: 1,
      end_month: 1,
      monthly_family_slcsps: [12_000, ...Array(11).fill(0)],
      monthly_other_family_slcsps: [6_000, ...Array(11).fill(0)],
    },
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
    shared_policy: {
      basis: "other_no_agreement",
      situations_1_to_3_reviewed_and_inapplicable: true,
      other_taxpayer_ssn: "222-33-4444",
      start_month: 1,
      end_month: 1,
      allocated_enrollees_in_tax_family: 1,
      total_enrollees: 3,
    },
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
