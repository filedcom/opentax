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
  return qbiAggregation.compute({ taxYear: 2025, formType: "f1040" }, { aggregation_groups: groups });
}

// ── 1. Input schema validation ────────────────────────────────────────────────

Deno.test("empty aggregation_groups throws", () => {
  assertThrows(
    () => qbiAggregation.compute({ taxYear: 2025, formType: "f1040" }, { aggregation_groups: [] }),
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

// ── 3. Schema captures aggregation election details correctly ─────────────────

Deno.test("parsed group preserves group_name and business_names", () => {
  const parsed = qbiAggregation.inputSchema.parse({
    aggregation_groups: [minimalGroup({ group_name: "RE Portfolio", business_names: ["Sunrise Apts", "Harbor Lofts"] })],
  });
  assertEquals(parsed.aggregation_groups[0].group_name, "RE Portfolio");
  assertEquals(parsed.aggregation_groups[0].business_names, ["Sunrise Apts", "Harbor Lofts"]);
});

Deno.test("parsed group preserves combined_for_limitation flag", () => {
  const parsedTrue = qbiAggregation.inputSchema.parse({
    aggregation_groups: [minimalGroup({ combined_for_limitation: true })],
  });
  assertEquals(parsedTrue.aggregation_groups[0].combined_for_limitation, true);

  const parsedFalse = qbiAggregation.inputSchema.parse({
    aggregation_groups: [minimalGroup({ combined_for_limitation: false })],
  });
  assertEquals(parsedFalse.aggregation_groups[0].combined_for_limitation, false);
});

Deno.test("multiple groups are all captured in order", () => {
  const parsed = qbiAggregation.inputSchema.parse({
    aggregation_groups: [
      minimalGroup({ group_name: "Group A", business_names: ["Biz 1", "Biz 2"], combined_for_limitation: true }),
      minimalGroup({ group_name: "Group B", business_names: ["Biz 3"], combined_for_limitation: false }),
    ],
  });
  assertEquals(parsed.aggregation_groups.length, 2);
  assertEquals(parsed.aggregation_groups[0].group_name, "Group A");
  assertEquals(parsed.aggregation_groups[0].business_names.length, 2);
  assertEquals(parsed.aggregation_groups[1].group_name, "Group B");
  assertEquals(parsed.aggregation_groups[1].combined_for_limitation, false);
});

Deno.test("five businesses in a group are all captured", () => {
  const businesses = ["Alpha LLC", "Beta Corp", "Gamma Partners", "Delta Inc", "Epsilon Co"];
  const parsed = qbiAggregation.inputSchema.parse({
    aggregation_groups: [minimalGroup({ business_names: businesses })],
  });
  assertEquals(parsed.aggregation_groups[0].business_names, businesses);
});

// ── 4. Edge cases ─────────────────────────────────────────────────────────────

Deno.test("node type is qbi_aggregation", () => {
  assertEquals(qbiAggregation.nodeType, "qbi_aggregation");
});
