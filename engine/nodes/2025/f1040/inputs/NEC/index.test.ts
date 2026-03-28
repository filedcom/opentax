import { assertEquals } from "@std/assert";
import { nec } from "./index.ts";

// ---- Unit: compute routing ----

Deno.test("nec.compute: box1_nec with schedule_c routing emits schedule_c line1", () => {
  const result = nec.compute({
    payer_name: "Acme Corp",
    payer_tin: "12-3456789",
    box1_nec: 5000,
    for_routing: "schedule_c",
  });

  const scheduleCOutput = result.outputs.find((o) => o.nodeType === "schedule_c");
  assertEquals(scheduleCOutput !== undefined, true);
  const input = scheduleCOutput!.input as Record<string, unknown>;
  assertEquals(input.line1_gross_receipts, 5000);
});

Deno.test("nec.compute: box1_nec with schedule_f routing emits schedule_f line8", () => {
  const result = nec.compute({
    payer_name: "Farm Buyer",
    payer_tin: "98-7654321",
    box1_nec: 8000,
    for_routing: "schedule_f",
  });

  const scheduleFOutput = result.outputs.find((o) => o.nodeType === "schedule_f");
  assertEquals(scheduleFOutput !== undefined, true);
  const input = scheduleFOutput!.input as Record<string, unknown>;
  assertEquals(input.line8_other_income, 8000);
});

Deno.test("nec.compute: box1_nec with form_8919 routing emits form8919 wages", () => {
  const result = nec.compute({
    payer_name: "Employer LLC",
    payer_tin: "55-1234567",
    box1_nec: 30000,
    for_routing: "form_8919",
  });

  const form8919Output = result.outputs.find((o) => o.nodeType === "form8919");
  assertEquals(form8919Output !== undefined, true);
  const input = form8919Output!.input as Record<string, unknown>;
  assertEquals(input.wages, 30000);
});

Deno.test("nec.compute: box1_nec with schedule_1_line_8z routing emits schedule1 line8z_other", () => {
  const result = nec.compute({
    payer_name: "Other Payer",
    payer_tin: "77-7654321",
    box1_nec: 1200,
    for_routing: "schedule_1_line_8z",
  });

  const schedule1Output = result.outputs.find((o) => o.nodeType === "schedule1");
  assertEquals(schedule1Output !== undefined, true);
  const input = schedule1Output!.input as Record<string, unknown>;
  assertEquals(input.line8z_other, 1200);
});

Deno.test("nec.compute: box3_golden_parachute emits schedule1 and schedule2 excise", () => {
  const result = nec.compute({
    payer_name: "BigCo",
    payer_tin: "11-2233445",
    box3_golden_parachute: 100000,
  });

  const schedule1Output = result.outputs.find((o) => o.nodeType === "schedule1");
  assertEquals(schedule1Output !== undefined, true);
  const s1Input = schedule1Output!.input as Record<string, unknown>;
  assertEquals(s1Input.line8z_golden_parachute, 100000);

  const schedule2Output = result.outputs.find((o) => o.nodeType === "schedule2");
  assertEquals(schedule2Output !== undefined, true);
  const s2Input = schedule2Output!.input as Record<string, unknown>;
  assertEquals(s2Input.line17k_golden_parachute_excise, 20000);
});

Deno.test("nec.compute: box4_federal_withheld routes to f1040 line25b", () => {
  const result = nec.compute({
    payer_name: "Payer Inc",
    payer_tin: "33-4455667",
    box4_federal_withheld: 750,
  });

  const f1040Output = result.outputs.find((o) => o.nodeType === "f1040");
  assertEquals(f1040Output !== undefined, true);
  const input = f1040Output!.input as Record<string, unknown>;
  assertEquals(input.line25b_withheld_1099, 750);
});

Deno.test("nec.compute: box1_nec = 0 (default) produces no routing output", () => {
  const result = nec.compute({
    payer_name: "No Income Payer",
    payer_tin: "00-0000000",
  });

  const scheduleCOutput = result.outputs.find((o) => o.nodeType === "schedule_c");
  assertEquals(scheduleCOutput, undefined);
});

Deno.test("nec.compute: box2_direct_sales is informational only — no output emitted", () => {
  const result = nec.compute({
    payer_name: "Direct Sales Co",
    payer_tin: "22-3344556",
    box2_direct_sales: true,
  });

  // No output should be produced from box2_direct_sales alone
  const relevant = result.outputs.filter(
    (o) => o.nodeType !== "f1040" && o.nodeType !== "schedule1" && o.nodeType !== "schedule2",
  );
  // The direct_sales flag produces no dedicated routing output
  assertEquals(relevant.length, 0);
});

// ---- Unit: inputSchema validation ----

Deno.test("nec.inputSchema: missing payer_name fails validation", () => {
  const parsed = nec.inputSchema.safeParse({ payer_tin: "12-3456789" });
  assertEquals(parsed.success, false);
});

Deno.test("nec.inputSchema: missing payer_tin fails validation", () => {
  const parsed = nec.inputSchema.safeParse({ payer_name: "Acme" });
  assertEquals(parsed.success, false);
});

Deno.test("nec.inputSchema: negative box1_nec fails validation", () => {
  const parsed = nec.inputSchema.safeParse({
    payer_name: "Acme",
    payer_tin: "12-3456789",
    box1_nec: -100,
  });
  assertEquals(parsed.success, false);
});

Deno.test("nec.inputSchema: for_routing is optional and omittable", () => {
  const parsed = nec.inputSchema.safeParse({
    payer_name: "Acme",
    payer_tin: "12-3456789",
  });
  assertEquals(parsed.success, true);
});

Deno.test("nec.compute: omitting for_routing defaults to schedule_c routing", () => {
  const result = nec.compute({
    payer_name: "Acme",
    payer_tin: "12-3456789",
    box1_nec: 3000,
  });

  const scheduleCOutput = result.outputs.find((o) => o.nodeType === "schedule_c");
  assertEquals(scheduleCOutput !== undefined, true);
  const input = scheduleCOutput!.input as Record<string, unknown>;
  assertEquals(input.line1_gross_receipts, 3000);
});
