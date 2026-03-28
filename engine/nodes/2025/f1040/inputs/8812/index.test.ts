import { assertEquals } from "@std/assert";
import { f8812 } from "./index.ts";

// ---- Unit: basic CTC ----

Deno.test("f8812.compute: 2 qualifying children below phase-out routes $4000 to schedule3", () => {
  const result = f8812.compute({
    f8812s: [{
      qualifying_children_count: 2,
      agi: 100000,
    }],
  });

  const schedule3Output = result.outputs.find((o) =>
    o.nodeType === "schedule3"
  );
  assertEquals(schedule3Output !== undefined, true);
  const input = schedule3Output!.input as Record<string, unknown>;
  assertEquals(input.line6b_child_tax_credit, 4000);
});

Deno.test("f8812.compute: other_dependents_count adds $500 ODC per dependent", () => {
  const result = f8812.compute({
    f8812s: [{
      qualifying_children_count: 0,
      other_dependents_count: 2,
      agi: 100000,
    }],
  });

  const schedule3Output = result.outputs.find((o) =>
    o.nodeType === "schedule3"
  );
  assertEquals(schedule3Output !== undefined, true);
  const input = schedule3Output!.input as Record<string, unknown>;
  assertEquals(input.line6b_child_tax_credit, 1000);
});

// ---- Unit: phase-out ----

Deno.test("f8812.compute: MFJ phase-out threshold is $400,000", () => {
  const result = f8812.compute({
    f8812s: [{
      qualifying_children_count: 1,
      agi: 401000,
      filing_status: "mfj",
    }],
  });

  const schedule3Output = result.outputs.find((o) =>
    o.nodeType === "schedule3"
  );
  assertEquals(schedule3Output !== undefined, true);
  const input = schedule3Output!.input as Record<string, unknown>;
  // excess = 1000, steps = 1, reduction = 50, CTC = 2000 - 50 = 1950
  assertEquals(input.line6b_child_tax_credit, 1950);
});

Deno.test("f8812.compute: single filer phase-out threshold is $200,000", () => {
  const result = f8812.compute({
    f8812s: [{
      qualifying_children_count: 1,
      agi: 202000,
      filing_status: "single",
    }],
  });

  const schedule3Output = result.outputs.find((o) =>
    o.nodeType === "schedule3"
  );
  assertEquals(schedule3Output !== undefined, true);
  const input = schedule3Output!.input as Record<string, unknown>;
  // excess = 2000, steps = 2, reduction = 100, CTC = 2000 - 100 = 1900
  assertEquals(input.line6b_child_tax_credit, 1900);
});

Deno.test("f8812.compute: CTC fully phased out produces no schedule3 output", () => {
  const result = f8812.compute({
    f8812s: [{
      qualifying_children_count: 1,
      agi: 250000,
      filing_status: "single",
    }],
  });

  const schedule3Output = result.outputs.find((o) =>
    o.nodeType === "schedule3"
  );
  assertEquals(schedule3Output, undefined);
});

// ---- Unit: income_tax_liability limits nonrefundable CTC ----

Deno.test("f8812.compute: nonrefundable CTC limited by income_tax_liability", () => {
  const result = f8812.compute({
    f8812s: [{
      qualifying_children_count: 2,
      agi: 50000,
      income_tax_liability: 1500,
    }],
  });

  const schedule3Output = result.outputs.find((o) =>
    o.nodeType === "schedule3"
  );
  assertEquals(schedule3Output !== undefined, true);
  const input = schedule3Output!.input as Record<string, unknown>;
  // CTC = 4000, but limited to tax liability = 1500
  assertEquals(input.line6b_child_tax_credit, 1500);
});

// ---- Unit: ACTC (refundable) ----

Deno.test("f8812.compute: ACTC routes to f1040 line28 when tax liability < CTC", () => {
  const result = f8812.compute({
    f8812s: [{
      qualifying_children_count: 2,
      agi: 50000,
      earned_income: 30000,
      income_tax_liability: 1000,
    }],
  });

  const f1040Output = result.outputs.find((o) => o.nodeType === "f1040");
  assertEquals(f1040Output !== undefined, true);
  const input = f1040Output!.input as Record<string, unknown>;
  // CTC after phase-out = 4000, nonrefundable = min(4000, 1000) = 1000
  // ctcUnused = 4000 - 1000 = 3000
  // actcEarned = max(0, 30000 * 0.15 - 2500) = max(0, 4500 - 2500) = 2000
  // actcMaxPerChild = 2 * 1700 = 3400
  // actc = min(3000, 2000, 3400) = 2000
  assertEquals(input.line28_actc, 2000);
});

Deno.test("f8812.compute: ACTC capped at $1700 per qualifying child", () => {
  const result = f8812.compute({
    f8812s: [{
      qualifying_children_count: 1,
      agi: 50000,
      earned_income: 50000,
      income_tax_liability: 0,
    }],
  });

  const f1040Output = result.outputs.find((o) => o.nodeType === "f1040");
  assertEquals(f1040Output !== undefined, true);
  const input = f1040Output!.input as Record<string, unknown>;
  // CTC = 2000, nonrefundable = 0
  // ctcUnused = 2000
  // actcEarned = max(0, 50000 * 0.15 - 2500) = 5000
  // actcMaxPerChild = 1 * 1700 = 1700
  // actc = min(2000, 5000, 1700) = 1700
  assertEquals(input.line28_actc, 1700);
});

Deno.test("f8812.compute: no children produces no outputs", () => {
  const result = f8812.compute({
    f8812s: [{
      qualifying_children_count: 0,
      other_dependents_count: 0,
      agi: 50000,
    }],
  });

  assertEquals(result.outputs.length, 0);
});
