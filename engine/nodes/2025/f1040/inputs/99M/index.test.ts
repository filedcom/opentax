import { assertEquals } from "@std/assert";
import { m99 } from "./index.ts";

// ---- Unit: compute routing ----

Deno.test("m99.compute: box1_rents routes to schedule_e rental_income", () => {
  const result = m99.compute({
    m99s: [{
      payer_name: "Landlord LLC",
      box1_rents: 12000,
    }],
  });

  const scheduleEOutput = result.outputs.find((o) =>
    o.nodeType === "schedule_e"
  );
  assertEquals(scheduleEOutput !== undefined, true);
  const input = scheduleEOutput!.input as Record<string, unknown>;
  assertEquals(input.rental_income, 12000);
});

Deno.test("m99.compute: box2_royalties defaults to schedule_e royalty_income", () => {
  const result = m99.compute({
    m99s: [{
      payer_name: "Publisher Co",
      box2_royalties: 5000,
    }],
  });

  const scheduleEOutput = result.outputs.find((o) =>
    o.nodeType === "schedule_e"
  );
  assertEquals(scheduleEOutput !== undefined, true);
  const input = scheduleEOutput!.input as Record<string, unknown>;
  assertEquals(input.royalty_income, 5000);
});

Deno.test("m99.compute: box2_royalties with schedule_c routing routes to schedule_c line1", () => {
  const result = m99.compute({
    m99s: [{
      payer_name: "Publisher Co",
      box2_royalties: 5000,
      box2_royalties_routing: "schedule_c",
    }],
  });

  const scheduleCOutput = result.outputs.find((o) =>
    o.nodeType === "schedule_c"
  );
  assertEquals(scheduleCOutput !== undefined, true);
  const input = scheduleCOutput!.input as Record<string, unknown>;
  assertEquals(input.line1_gross_receipts, 5000);
});

Deno.test("m99.compute: box3_other_income routes to schedule1 line8i_prizes_awards", () => {
  const result = m99.compute({
    m99s: [{
      payer_name: "Raffle Org",
      box3_other_income: 500,
    }],
  });

  const schedule1Output = result.outputs.find((o) =>
    o.nodeType === "schedule1"
  );
  assertEquals(schedule1Output !== undefined, true);
  const input = schedule1Output!.input as Record<string, unknown>;
  assertEquals(input.line8i_prizes_awards, 500);
});

Deno.test("m99.compute: box4_federal_withheld routes to f1040 line25b", () => {
  const result = m99.compute({
    m99s: [{
      payer_name: "Payer Inc",
      box4_federal_withheld: 1000,
    }],
  });

  const f1040Output = result.outputs.find((o) => o.nodeType === "f1040");
  assertEquals(f1040Output !== undefined, true);
  const input = f1040Output!.input as Record<string, unknown>;
  assertEquals(input.line25b_withheld_1099, 1000);
});

Deno.test("m99.compute: box5_fishing_boat routes to schedule_c line1", () => {
  const result = m99.compute({
    m99s: [{
      payer_name: "Fishing Co",
      box5_fishing_boat: 8000,
    }],
  });

  const scheduleCOutput = result.outputs.find((o) =>
    o.nodeType === "schedule_c"
  );
  assertEquals(scheduleCOutput !== undefined, true);
  const input = scheduleCOutput!.input as Record<string, unknown>;
  assertEquals(input.line1_gross_receipts, 8000);
});

Deno.test("m99.compute: box6_medical_payments routes to schedule_c line1", () => {
  const result = m99.compute({
    m99s: [{
      payer_name: "Medical Group",
      box6_medical_payments: 25000,
    }],
  });

  const scheduleCOutput = result.outputs.find((o) =>
    o.nodeType === "schedule_c"
  );
  assertEquals(scheduleCOutput !== undefined, true);
  const input = scheduleCOutput!.input as Record<string, unknown>;
  assertEquals(input.line1_gross_receipts, 25000);
});

Deno.test("m99.compute: box8_substitute_payments routes to schedule1 line8z_substitute_payments", () => {
  const result = m99.compute({
    m99s: [{
      payer_name: "Broker Firm",
      box8_substitute_payments: 300,
    }],
  });

  const schedule1Output = result.outputs.find((o) =>
    o.nodeType === "schedule1"
  );
  assertEquals(schedule1Output !== undefined, true);
  const input = schedule1Output!.input as Record<string, unknown>;
  assertEquals(input.line8z_substitute_payments, 300);
});

Deno.test("m99.compute: box9_crop_insurance routes to schedule_f crop_insurance", () => {
  const result = m99.compute({
    m99s: [{
      payer_name: "Farm Insurance",
      box9_crop_insurance: 7500,
    }],
  });

  const scheduleFOutput = result.outputs.find((o) =>
    o.nodeType === "schedule_f"
  );
  assertEquals(scheduleFOutput !== undefined, true);
  const input = scheduleFOutput!.input as Record<string, unknown>;
  assertEquals(input.crop_insurance, 7500);
});

Deno.test("m99.compute: box10_attorney_proceeds routes to schedule1 line8z_attorney_proceeds", () => {
  const result = m99.compute({
    m99s: [{
      payer_name: "Law Firm",
      box10_attorney_proceeds: 15000,
    }],
  });

  const schedule1Output = result.outputs.find((o) =>
    o.nodeType === "schedule1"
  );
  assertEquals(schedule1Output !== undefined, true);
  const input = schedule1Output!.input as Record<string, unknown>;
  assertEquals(input.line8z_attorney_proceeds, 15000);
});

Deno.test("m99.compute: box11_fish_purchased routes to schedule_c line1", () => {
  const result = m99.compute({
    m99s: [{
      payer_name: "Fish Dealer",
      box11_fish_purchased: 4000,
    }],
  });

  const scheduleCOutput = result.outputs.find((o) =>
    o.nodeType === "schedule_c"
  );
  assertEquals(scheduleCOutput !== undefined, true);
  const input = scheduleCOutput!.input as Record<string, unknown>;
  assertEquals(input.line1_gross_receipts, 4000);
});

Deno.test("m99.compute: box15_nqdc emits schedule1 line8z_nqdc and schedule2 line17h excise", () => {
  const result = m99.compute({
    m99s: [{
      payer_name: "Corp Employer",
      box15_nqdc: 50000,
    }],
  });

  const schedule1Output = result.outputs.find((o) =>
    o.nodeType === "schedule1"
  );
  assertEquals(schedule1Output !== undefined, true);
  const s1Input = schedule1Output!.input as Record<string, unknown>;
  assertEquals(s1Input.line8z_nqdc, 50000);

  const schedule2Output = result.outputs.find((o) =>
    o.nodeType === "schedule2"
  );
  assertEquals(schedule2Output !== undefined, true);
  const s2Input = schedule2Output!.input as Record<string, unknown>;
  assertEquals(s2Input.line17h_nqdc_tax, 10000);
});

Deno.test("m99.compute: only payer_name, no box values produces no outputs", () => {
  const result = m99.compute({
    m99s: [{
      payer_name: "Empty Payer",
    }],
  });

  assertEquals(result.outputs.length, 0);
});

// ---- Unit: inputSchema validation ----

Deno.test("m99.inputSchema: missing payer_name fails validation", () => {
  const parsed = m99.inputSchema.safeParse({ m99s: [{ box1_rents: 1000 }] });
  assertEquals(parsed.success, false);
});

Deno.test("m99.inputSchema: negative box1_rents fails validation", () => {
  const parsed = m99.inputSchema.safeParse({
    m99s: [{
      payer_name: "Landlord",
      box1_rents: -500,
    }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("m99.inputSchema: invalid box2_royalties_routing fails validation", () => {
  const parsed = m99.inputSchema.safeParse({
    m99s: [{
      payer_name: "Publisher",
      box2_royalties_routing: "schedule_k",
    }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("m99.inputSchema: box2_royalties_routing is optional", () => {
  const parsed = m99.inputSchema.safeParse({
    m99s: [{ payer_name: "Publisher" }],
  });
  assertEquals(parsed.success, true);
});

Deno.test("m99.compute: omitting box2_royalties_routing defaults to schedule_e", () => {
  const result = m99.compute({
    m99s: [{
      payer_name: "Publisher",
      box2_royalties: 2000,
    }],
  });

  const scheduleEOutput = result.outputs.find((o) =>
    o.nodeType === "schedule_e"
  );
  assertEquals(scheduleEOutput !== undefined, true);
  const input = scheduleEOutput!.input as Record<string, unknown>;
  assertEquals(input.royalty_income, 2000);
});
