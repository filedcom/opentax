import { assertEquals } from "@std/assert";
import { g99 } from "./index.ts";

// ---- Unit: compute routing ----

Deno.test("g99.compute: unemployment net > 0 routes to schedule1 line7", () => {
  const result = g99.compute({
    g99s: [{
      box_1_unemployment: 8000,
    }],
  });

  const schedule1Output = result.outputs.find((o) =>
    o.nodeType === "schedule1"
  );
  assertEquals(schedule1Output !== undefined, true);
  const input = schedule1Output!.input as Record<string, unknown>;
  assertEquals(input.line7_unemployment, 8000);
});

Deno.test("g99.compute: unemployment net accounts for repaid amount", () => {
  const result = g99.compute({
    g99s: [{
      box_1_unemployment: 8000,
      box_1_repaid: 2000,
    }],
  });

  const schedule1Output = result.outputs.find((o) =>
    o.nodeType === "schedule1"
  );
  assertEquals(schedule1Output !== undefined, true);
  const input = schedule1Output!.input as Record<string, unknown>;
  assertEquals(input.line7_unemployment, 6000);
});

Deno.test("g99.compute: repaid equals unemployment produces no schedule1 unemployment output", () => {
  const result = g99.compute({
    g99s: [{
      box_1_unemployment: 5000,
      box_1_repaid: 5000,
    }],
  });

  const schedule1Output = result.outputs.find(
    (o) =>
      o.nodeType === "schedule1" &&
      (o.input as Record<string, unknown>).line7_unemployment !== undefined,
  );
  assertEquals(schedule1Output, undefined);
});

Deno.test("g99.compute: state refund taxable when prior year itemized", () => {
  const result = g99.compute({
    g99s: [{
      box_2_state_refund: 300,
      box_2_prior_year_itemized: true,
    }],
  });

  const schedule1Output = result.outputs.find((o) =>
    o.nodeType === "schedule1"
  );
  assertEquals(schedule1Output !== undefined, true);
  const input = schedule1Output!.input as Record<string, unknown>;
  assertEquals(input.line1_state_refund, 300);
});

Deno.test("g99.compute: state refund not taxable when not itemized in prior year", () => {
  const result = g99.compute({
    g99s: [{
      box_2_state_refund: 300,
      box_2_prior_year_itemized: false,
    }],
  });

  const schedule1Output = result.outputs.find(
    (o) =>
      o.nodeType === "schedule1" &&
      (o.input as Record<string, unknown>).line1_state_refund !== undefined,
  );
  assertEquals(schedule1Output, undefined);
});

Deno.test("g99.compute: state refund not taxable when prior_year_itemized is omitted", () => {
  const result = g99.compute({
    g99s: [{
      box_2_state_refund: 300,
    }],
  });

  const schedule1Output = result.outputs.find(
    (o) =>
      o.nodeType === "schedule1" &&
      (o.input as Record<string, unknown>).line1_state_refund !== undefined,
  );
  assertEquals(schedule1Output, undefined);
});

Deno.test("g99.compute: box_4_federal_withheld routes to f1040 line25b", () => {
  const result = g99.compute({
    g99s: [{
      box_4_federal_withheld: 400,
    }],
  });

  const f1040Output = result.outputs.find((o) => o.nodeType === "f1040");
  assertEquals(f1040Output !== undefined, true);
  const input = f1040Output!.input as Record<string, unknown>;
  assertEquals(input.line25b_withheld_1099, 400);
});

Deno.test("g99.compute: box_5_rtaa routes to schedule1 line8z_rtaa", () => {
  const result = g99.compute({
    g99s: [{
      box_5_rtaa: 1500,
    }],
  });

  const schedule1Output = result.outputs.find((o) =>
    o.nodeType === "schedule1"
  );
  assertEquals(schedule1Output !== undefined, true);
  const input = schedule1Output!.input as Record<string, unknown>;
  assertEquals(input.line8z_rtaa, 1500);
});

Deno.test("g99.compute: box_6_taxable_grants routes to schedule1 line8z_taxable_grants", () => {
  const result = g99.compute({
    g99s: [{
      box_6_taxable_grants: 2000,
    }],
  });

  const schedule1Output = result.outputs.find((o) =>
    o.nodeType === "schedule1"
  );
  assertEquals(schedule1Output !== undefined, true);
  const input = schedule1Output!.input as Record<string, unknown>;
  assertEquals(input.line8z_taxable_grants, 2000);
});

Deno.test("g99.compute: box_7_agriculture routes to schedule_f line4a_gov_payments", () => {
  const result = g99.compute({
    g99s: [{
      box_7_agriculture: 3500,
    }],
  });

  const scheduleFOutput = result.outputs.find((o) =>
    o.nodeType === "schedule_f"
  );
  assertEquals(scheduleFOutput !== undefined, true);
  const input = scheduleFOutput!.input as Record<string, unknown>;
  assertEquals(input.line4a_gov_payments, 3500);
});

Deno.test("g99.compute: box_9_market_gain routes to schedule_f line5_ccc_gain", () => {
  const result = g99.compute({
    g99s: [{
      box_9_market_gain: 600,
    }],
  });

  const scheduleFOutput = result.outputs.find((o) =>
    o.nodeType === "schedule_f"
  );
  assertEquals(scheduleFOutput !== undefined, true);
  const input = scheduleFOutput!.input as Record<string, unknown>;
  assertEquals(input.line5_ccc_gain, 600);
});

Deno.test("g99.compute: empty input produces no outputs", () => {
  const result = g99.compute({ g99s: [{}] });
  assertEquals(result.outputs.length, 0);
});

// ---- Unit: inputSchema validation ----

Deno.test("g99.inputSchema: valid empty object passes validation", () => {
  const parsed = g99.inputSchema.safeParse({ g99s: [{}] });
  assertEquals(parsed.success, true);
});

Deno.test("g99.inputSchema: negative box_1_unemployment fails validation", () => {
  const parsed = g99.inputSchema.safeParse({
    g99s: [{ box_1_unemployment: -100 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("g99.inputSchema: negative box_4_federal_withheld fails validation", () => {
  const parsed = g99.inputSchema.safeParse({
    g99s: [{ box_4_federal_withheld: -50 }],
  });
  assertEquals(parsed.success, false);
});
