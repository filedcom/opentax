import { assertEquals, assertThrows } from "@std/assert";
import { qbiAggregation } from "./index.ts";

function minimalGroup(overrides: Record<string, unknown> = {}) {
  return {
    group_name: "Group A",
    business_names: ["Business 1", "Business 2"],
    combined_for_limitation: true,
    ...overrides,
  };
}

function compute(groups: ReturnType<typeof minimalGroup>[]) {
  return qbiAggregation.compute({ taxYear: 2025 }, { aggregation_groups: groups });
}

// ── 1. Input schema validation ────────────────────────────────────────────────

Deno.test("empty aggregation_groups throws", () => {
  assertThrows(
    () => qbiAggregation.compute({ taxYear: 2025 }, { aggregation_groups: [] }),
    Error,
  );
});

Deno.test("missing group_name throws", () => {
  assertThrows(
    () =>
      compute([
        { group_name: "", business_names: ["Biz A"], combined_for_limitation: true } as ReturnType<typeof minimalGroup>,
      ]),
    Error,
  );
});

Deno.test("empty business_names array throws", () => {
  assertThrows(
    () =>
      compute([
        { group_name: "Group A", business_names: [], combined_for_limitation: true } as ReturnType<typeof minimalGroup>,
      ]),
    Error,
  );
});

Deno.test("empty business name string throws", () => {
  assertThrows(
    () =>
      compute([
        { group_name: "Group A", business_names: [""], combined_for_limitation: true } as ReturnType<typeof minimalGroup>,
      ]),
    Error,
  );
});

// ── 2. Valid group configurations ─────────────────────────────────────────────

Deno.test("single group with combined_for_limitation true produces no outputs", () => {
  const result = compute([minimalGroup()]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("single group with combined_for_limitation false produces no outputs", () => {
  const result = compute([minimalGroup({ combined_for_limitation: false })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("multiple aggregation groups produce no outputs", () => {
  const result = compute([
    minimalGroup({ group_name: "Group A", business_names: ["Biz 1", "Biz 2"] }),
    minimalGroup({ group_name: "Group B", business_names: ["Biz 3"] }),
  ]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("single-business group is valid", () => {
  const result = compute([
    minimalGroup({ business_names: ["Only Business"] }),
  ]);
  assertEquals(result.outputs.length, 0);
});

// ── 3. Edge cases ─────────────────────────────────────────────────────────────

Deno.test("many businesses in a group accepted", () => {
  const result = compute([
    minimalGroup({
      group_name: "Large Group",
      business_names: ["A", "B", "C", "D", "E"],
    }),
  ]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("node type is qbi_aggregation", () => {
  assertEquals(qbiAggregation.nodeType, "qbi_aggregation");
});
