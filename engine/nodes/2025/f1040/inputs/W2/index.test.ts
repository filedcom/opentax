import { assertEquals } from "@std/assert";
import { execute } from "../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../core/runtime/planner.ts";
import { registry } from "../../../registry.ts";
import { Box12Code, w2 } from "./index.ts";

// ---- Unit: inputSchema ----

Deno.test("w2.inputSchema: accepts { w2s: [{ box1_wages, box2_fed_withheld }] }", () => {
  const parsed = w2.inputSchema.safeParse({
    w2s: [{ box1_wages: 85000, box2_fed_withheld: 12000 }],
  });
  assertEquals(parsed.success, true);
});

Deno.test("w2.inputSchema: rejects empty w2s array", () => {
  const parsed = w2.inputSchema.safeParse({ w2s: [] });
  assertEquals(parsed.success, false);
});

Deno.test("w2.inputSchema: rejects missing w2s field", () => {
  const parsed = w2.inputSchema.safeParse({});
  assertEquals(parsed.success, false);
});

Deno.test("w2.inputSchema: rejects negative box1_wages", () => {
  const parsed = w2.inputSchema.safeParse({
    w2s: [{ box1_wages: -1000, box2_fed_withheld: 0 }],
  });
  assertEquals(parsed.success, false);
});

// ---- Unit: compute — single W-2 ----

Deno.test("w2.compute: single W-2 — box1_wages + box2_fed_withheld route to f1040 line1a and line25a", () => {
  const result = w2.compute({
    w2s: [{ box1_wages: 85000, box2_fed_withheld: 12000 }],
  });

  const f1040Output = result.outputs.find((o) => o.nodeType === "f1040");
  assertEquals(f1040Output !== undefined, true);
  const input = f1040Output!.input as Record<string, unknown>;
  assertEquals(input.line1a_wages, 85000);
  assertEquals(input.line25a_w2_withheld, 12000);
});

Deno.test("w2.compute: single W-2 — statutory employee routes box1 to schedule_c, NOT f1040 line1a", () => {
  const result = w2.compute({
    w2s: [{
      box1_wages: 50000,
      box2_fed_withheld: 5000,
      box13_statutory_employee: true,
    }],
  });

  const f1040Output = result.outputs.find((o) => o.nodeType === "f1040");
  const scheduleCOutput = result.outputs.find((o) =>
    o.nodeType === "schedule_c"
  );

  assertEquals(scheduleCOutput !== undefined, true);
  const scInput = scheduleCOutput!.input as Record<string, unknown>;
  assertEquals(scInput.statutory_wages, 50000);
  assertEquals(scInput.withholding, 5000);

  // Withholding still goes to f1040 line25a; regular wages do not
  assertEquals(f1040Output !== undefined, true);
  const f1040Input = f1040Output!.input as Record<string, unknown>;
  assertEquals(f1040Input.line1a_wages, undefined);
  assertEquals(f1040Input.line25a_w2_withheld, 5000);
});

Deno.test("w2.compute: single W-2 — medicare wages/withheld route to form8959", () => {
  const result = w2.compute({
    w2s: [{
      box1_wages: 100000,
      box2_fed_withheld: 0,
      box5_medicare_wages: 100000,
      box6_medicare_withheld: 1450,
    }],
  });

  const form8959Output = result.outputs.find((o) => o.nodeType === "form8959");
  assertEquals(form8959Output !== undefined, true);
  const input = form8959Output!.input as Record<string, unknown>;
  assertEquals(input.medicare_wages, 100000);
  assertEquals(input.medicare_withheld, 1450);
});

Deno.test("w2.compute: single W-2 — box8_allocated_tips > 0 routes to form4137", () => {
  const result = w2.compute({
    w2s: [{
      box1_wages: 40000,
      box2_fed_withheld: 4000,
      box8_allocated_tips: 1200,
    }],
  });

  const form4137Output = result.outputs.find((o) => o.nodeType === "form4137");
  assertEquals(form4137Output !== undefined, true);
  const input = form4137Output!.input as Record<string, unknown>;
  assertEquals(input.allocated_tips, 1200);
});

Deno.test("w2.compute: single W-2 — box10_dep_care > 0 routes to form2441", () => {
  const result = w2.compute({
    w2s: [{ box1_wages: 70000, box2_fed_withheld: 7000, box10_dep_care: 3000 }],
  });

  const form2441Output = result.outputs.find((o) => o.nodeType === "form2441");
  assertEquals(form2441Output !== undefined, true);
  const input = form2441Output!.input as Record<string, unknown>;
  assertEquals(input.dep_care_benefits, 3000);
});

Deno.test("w2.compute: single W-2 — box12 code W routes employer HSA to form8889", () => {
  const result = w2.compute({
    w2s: [{
      box1_wages: 60000,
      box2_fed_withheld: 6000,
      box12_entries: [{ code: Box12Code.W, amount: 2000 }],
    }],
  });

  const form8889Output = result.outputs.find((o) => o.nodeType === "form8889");
  assertEquals(form8889Output !== undefined, true);
  const input = form8889Output!.input as Record<string, unknown>;
  assertEquals(input.employer_hsa_contributions, 2000);
});

Deno.test("w2.compute: single W-2 — box12 code H routes to schedule1 line24f", () => {
  const result = w2.compute({
    w2s: [{
      box1_wages: 60000,
      box2_fed_withheld: 6000,
      box12_entries: [{ code: Box12Code.H, amount: 500 }],
    }],
  });

  const schedule1Output = result.outputs.find((o) =>
    o.nodeType === "schedule1"
  );
  assertEquals(schedule1Output !== undefined, true);
  const input = schedule1Output!.input as Record<string, unknown>;
  assertEquals(input.line24f_501c18d, 500);
});

Deno.test("w2.compute: single W-2 — box12 code Q (combat pay) routes to f1040 line1i", () => {
  const result = w2.compute({
    w2s: [{
      box1_wages: 30000,
      box2_fed_withheld: 0,
      box12_entries: [{ code: Box12Code.Q, amount: 8000 }],
    }],
  });

  const f1040Output = result.outputs.find((o) => o.nodeType === "f1040");
  assertEquals(f1040Output !== undefined, true);
  const input = f1040Output!.input as Record<string, unknown>;
  assertEquals(input.line1i_combat_pay, 8000);
});

// ---- Unit: compute — multiple W-2s (internal aggregation) ----

Deno.test("w2.compute: two W-2s — wages summed internally, f1040 receives single scalar line1a_wages", () => {
  const result = w2.compute({
    w2s: [
      { box1_wages: 85000, box2_fed_withheld: 12000 },
      { box1_wages: 45000, box2_fed_withheld: 6800 },
    ],
  });

  const f1040Output = result.outputs.find((o) => o.nodeType === "f1040");
  assertEquals(f1040Output !== undefined, true);
  const input = f1040Output!.input as Record<string, unknown>;

  // Node aggregates internally — deposits SCALAR total, not array
  assertEquals(input.line1a_wages, 130000);
  assertEquals(Array.isArray(input.line1a_wages), false);

  // Withholding summed too
  assertEquals(input.line25a_w2_withheld, 18800);
  assertEquals(Array.isArray(input.line25a_w2_withheld), false);
});

Deno.test("w2.compute: three W-2s — all wages and withholding summed to scalars", () => {
  const result = w2.compute({
    w2s: [
      { box1_wages: 50000, box2_fed_withheld: 5000 },
      { box1_wages: 30000, box2_fed_withheld: 3000 },
      { box1_wages: 20000, box2_fed_withheld: 2000 },
    ],
  });

  const f1040Output = result.outputs.find((o) => o.nodeType === "f1040");
  assertEquals(f1040Output !== undefined, true);
  const input = f1040Output!.input as Record<string, unknown>;

  assertEquals(input.line1a_wages, 100000);
  assertEquals(input.line25a_w2_withheld, 10000);
});

Deno.test("w2.compute: mixed statutory and regular W-2s — regular wages sum to f1040, statutory wages sum to schedule_c", () => {
  const result = w2.compute({
    w2s: [
      { box1_wages: 85000, box2_fed_withheld: 12000 },
      {
        box1_wages: 50000,
        box2_fed_withheld: 5000,
        box13_statutory_employee: true,
      },
    ],
  });

  const f1040Output = result.outputs.find((o) => o.nodeType === "f1040");
  const scheduleCOutput = result.outputs.find((o) =>
    o.nodeType === "schedule_c"
  );

  assertEquals(f1040Output !== undefined, true);
  const f1040Input = f1040Output!.input as Record<string, unknown>;
  // Only regular W-2 wages go to line1a
  assertEquals(f1040Input.line1a_wages, 85000);
  // Withholding from BOTH W-2s goes to line25a
  assertEquals(f1040Input.line25a_w2_withheld, 17000);

  assertEquals(scheduleCOutput !== undefined, true);
  const scInput = scheduleCOutput!.input as Record<string, unknown>;
  assertEquals(scInput.statutory_wages, 50000);
});

// ---- Integration: start → w2 → f1040 ----

Deno.test("integration: start → w2 → f1040 — single W-2 deposits scalar line1a and line25a", () => {
  const inputs = { w2s: [{ box1_wages: 85000, box2_fed_withheld: 12000 }] };
  const plan = buildExecutionPlan(registry);
  const result = execute(plan, registry, inputs);

  const pendingF1040 = result.pending["f1040"] as Record<string, unknown>;
  assertEquals(pendingF1040.line1a_wages, 85000);
  assertEquals(pendingF1040.line25a_w2_withheld, 12000);
  assertEquals(Array.isArray(pendingF1040.line1a_wages), false);
});

Deno.test("integration: start → w2 → f1040 — two W-2s, w2 node aggregates internally, f1040 receives scalar totals", () => {
  // New model: start dispatches { w2s: [all] } as one output.
  // W2 node aggregates both W-2s and deposits scalar totals to f1040.
  // f1040 pending dict should have scalar numbers, NOT arrays.
  const inputs = {
    w2s: [
      { box1_wages: 85000, box2_fed_withheld: 12000 },
      { box1_wages: 30000, box2_fed_withheld: 5000 },
    ],
  };
  const plan = buildExecutionPlan(registry);
  const result = execute(plan, registry, inputs);

  const pendingF1040 = result.pending["f1040"] as Record<string, unknown>;
  assertEquals(pendingF1040.line1a_wages, 115000);
  assertEquals(pendingF1040.line25a_w2_withheld, 17000);
  assertEquals(Array.isArray(pendingF1040.line1a_wages), false);
  assertEquals(Array.isArray(pendingF1040.line25a_w2_withheld), false);
});
