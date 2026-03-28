import { assertEquals } from "@std/assert";
import { execute } from "../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../core/runtime/planner.ts";
import { registry } from "../../../registry.ts";
import { w2 } from "./index.ts";

// ---- Unit: compute routing ----

Deno.test("w2.compute: box1_wages + box2_fed_withheld route to f1040 line1a and line25a", () => {
  const result = w2.compute({
    box1_wages: 85000,
    box2_fed_withheld: 12000,
  });

  const f1040Output = result.outputs.find((o) => o.nodeType === "f1040");
  assertEquals(f1040Output !== undefined, true);
  const input = f1040Output!.input as Record<string, unknown>;
  assertEquals(input.line1a_wages, 85000);
  assertEquals(input.line25a_w2_withheld, 12000);
});

Deno.test("w2.compute: statutory employee routes box1 to schedule_c NOT f1040 line1a", () => {
  const result = w2.compute({
    box1_wages: 50000,
    box2_fed_withheld: 5000,
    box13_statutory_employee: true,
  });

  const f1040Output = result.outputs.find((o) => o.nodeType === "f1040");
  const scheduleCOutput = result.outputs.find(
    (o) => o.nodeType === "schedule_c",
  );

  assertEquals(scheduleCOutput !== undefined, true);
  const scInput = scheduleCOutput!.input as Record<string, unknown>;
  assertEquals(scInput.statutory_wages, 50000);
  assertEquals(scInput.withholding, 5000);

  // Withholding still goes to f1040 line25a
  assertEquals(f1040Output !== undefined, true);
  const f1040Input = f1040Output!.input as Record<string, unknown>;
  assertEquals(f1040Input.line1a_wages, undefined);
  assertEquals(f1040Input.line25a_w2_withheld, 5000);
});

Deno.test("w2.compute: medicare wages/withheld route to form8959", () => {
  const result = w2.compute({
    box1_wages: 100000,
    box2_fed_withheld: 0,
    box5_medicare_wages: 100000,
    box6_medicare_withheld: 1450,
  });

  const form8959Output = result.outputs.find((o) => o.nodeType === "form8959");
  assertEquals(form8959Output !== undefined, true);
  const input = form8959Output!.input as Record<string, unknown>;
  assertEquals(input.medicare_wages, 100000);
  assertEquals(input.medicare_withheld, 1450);
});

Deno.test("w2.compute: box8_allocated_tips > 0 routes to form4137", () => {
  const result = w2.compute({
    box1_wages: 40000,
    box2_fed_withheld: 4000,
    box8_allocated_tips: 1200,
  });

  const form4137Output = result.outputs.find((o) => o.nodeType === "form4137");
  assertEquals(form4137Output !== undefined, true);
  const input = form4137Output!.input as Record<string, unknown>;
  assertEquals(input.allocated_tips, 1200);
});

Deno.test("w2.compute: box10_dep_care > 0 routes to form2441", () => {
  const result = w2.compute({
    box1_wages: 70000,
    box2_fed_withheld: 7000,
    box10_dep_care: 3000,
  });

  const form2441Output = result.outputs.find((o) => o.nodeType === "form2441");
  assertEquals(form2441Output !== undefined, true);
  const input = form2441Output!.input as Record<string, unknown>;
  assertEquals(input.dep_care_benefits, 3000);
});

Deno.test("w2.compute: box12 code W routes employer HSA to form8889", () => {
  const result = w2.compute({
    box1_wages: 60000,
    box2_fed_withheld: 6000,
    box12_entries: [{ code: "W", amount: 2000 }],
  });

  const form8889Output = result.outputs.find((o) => o.nodeType === "form8889");
  assertEquals(form8889Output !== undefined, true);
  const input = form8889Output!.input as Record<string, unknown>;
  assertEquals(input.employer_hsa_contributions, 2000);
});

Deno.test("w2.compute: box12 code H routes to schedule1 line24f", () => {
  const result = w2.compute({
    box1_wages: 60000,
    box2_fed_withheld: 6000,
    box12_entries: [{ code: "H", amount: 500 }],
  });

  const schedule1Output = result.outputs.find(
    (o) => o.nodeType === "schedule1",
  );
  assertEquals(schedule1Output !== undefined, true);
  const input = schedule1Output!.input as Record<string, unknown>;
  assertEquals(input.line24f_501c18d, 500);
});

Deno.test("w2.compute: box12 code Q (combat pay) routes to f1040 line1i", () => {
  const result = w2.compute({
    box1_wages: 30000,
    box2_fed_withheld: 0,
    box12_entries: [{ code: "Q", amount: 8000 }],
  });

  const f1040Output = result.outputs.find((o) => o.nodeType === "f1040");
  assertEquals(f1040Output !== undefined, true);
  const input = f1040Output!.input as Record<string, unknown>;
  assertEquals(input.line1i_combat_pay, 8000);
});

// ---- Unit: inputSchema validation ----

Deno.test("w2.inputSchema: missing box1_wages fails validation", () => {
  const parsed = w2.inputSchema.safeParse({});
  assertEquals(parsed.success, false);
});

Deno.test("w2.inputSchema: negative wages fails validation", () => {
  const parsed = w2.inputSchema.safeParse({ box1_wages: -1000 });
  assertEquals(parsed.success, false);
});

// ---- Integration: start → w2 → f1040 ----

Deno.test("integration: start → w2 → f1040 pending has line1a and line25a", () => {
  const inputs = { w2s: [{ box1_wages: 85000, box2_fed_withheld: 12000 }] };
  const plan = buildExecutionPlan(registry, inputs);
  const result = execute(plan, registry, inputs);

  const pendingF1040 = result.pending["f1040"] as Record<string, unknown>;
  assertEquals(pendingF1040.line1a_wages, 85000);
  assertEquals(pendingF1040.line25a_w2_withheld, 12000);
});

Deno.test("integration: multiple W2s accumulate line1a as array in f1040 pending", () => {
  const inputs = {
    w2s: [
      { box1_wages: 85000, box2_fed_withheld: 12000 },
      { box1_wages: 30000, box2_fed_withheld: 5000 },
    ],
  };
  const plan = buildExecutionPlan(registry, inputs);
  const result = execute(plan, registry, inputs);

  const pendingF1040 = result.pending["f1040"] as Record<string, unknown>;
  // Multiple W-2s: executor's mergePending promotes scalar to array
  assertEquals(Array.isArray(pendingF1040.line1a_wages), true);
  const wages = pendingF1040.line1a_wages as number[];
  assertEquals(wages.includes(85000), true);
  assertEquals(wages.includes(30000), true);
});
