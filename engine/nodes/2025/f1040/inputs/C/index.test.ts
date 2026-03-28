import { assertEquals } from "@std/assert";
import { scheduleC } from "./index.ts";

const BASE_INPUT = {
  line_a_principal_business: "Software consulting",
  line_b_business_code: "541510",
  line_f_accounting_method: "cash" as const,
  line_g_material_participation: true,
  line_1_gross_receipts: 100_000,
};

// ---- Unit: basic net profit calculation ----

Deno.test("scheduleC.compute: simple profit routes to schedule1 line3", () => {
  const result = scheduleC.compute({
    ...BASE_INPUT,
    line_8_advertising: 2_000,
    line_17_professional_services: 3_000,
  });

  const s1 = result.outputs.find((o) => o.nodeType === "schedule1");
  assertEquals(s1 !== undefined, true);
  const input = s1!.input as Record<string, number>;
  assertEquals(input.line3_schedule_c, 95_000);
});

Deno.test("scheduleC.compute: returns and allowances reduce gross receipts", () => {
  const result = scheduleC.compute({
    ...BASE_INPUT,
    line_2_returns_allowances: 5_000,
  });

  const s1 = result.outputs.find((o) => o.nodeType === "schedule1");
  const input = s1!.input as Record<string, number>;
  assertEquals(input.line3_schedule_c, 95_000);
});

// ---- Unit: COGS computation ----

Deno.test("scheduleC.compute: COGS reduces gross profit correctly", () => {
  const result = scheduleC.compute({
    ...BASE_INPUT,
    line_35_cogs_beginning_inventory: 10_000,
    line_36_purchases: 20_000,
    line_37_cost_of_labor: 5_000,
    line_38_materials_supplies_cogs: 3_000,
    line_39_other_cogs: 2_000,
  });

  const s1 = result.outputs.find((o) => o.nodeType === "schedule1");
  const input = s1!.input as Record<string, number>;
  // COGS = 40000, grossProfit = 60000, no expenses → netProfit = 60000
  assertEquals(input.line3_schedule_c, 60_000);
});

// ---- Unit: meals 50% limitation ----

Deno.test("scheduleC.compute: meals expense applies 50% limitation", () => {
  const result = scheduleC.compute({
    ...BASE_INPUT,
    line_24b_meals: 4_000,
  });

  const s1 = result.outputs.find((o) => o.nodeType === "schedule1");
  const input = s1!.input as Record<string, number>;
  // meals deductible = 2000; net = 100000 - 2000 = 98000
  assertEquals(input.line3_schedule_c, 98_000);
});

// ---- Unit: SE tax routing ----

Deno.test("scheduleC.compute: profit >= $400 triggers schedule_se and form8995", () => {
  const result = scheduleC.compute({ ...BASE_INPUT });

  const se = result.outputs.find((o) => o.nodeType === "schedule_se");
  const qbi = result.outputs.find((o) => o.nodeType === "form8995");
  assertEquals(se !== undefined, true);
  assertEquals(qbi !== undefined, true);

  const seInput = se!.input as Record<string, number>;
  const qbiInput = qbi!.input as Record<string, number>;
  assertEquals(seInput.net_profit_schedule_c, 100_000);
  assertEquals(qbiInput.qbi_from_schedule_c, 100_000);
});

Deno.test("scheduleC.compute: profit < $400 does NOT trigger schedule_se or form8995", () => {
  const result = scheduleC.compute({
    ...BASE_INPUT,
    line_1_gross_receipts: 300,
    line_8_advertising: 0,
  });

  const se = result.outputs.find((o) => o.nodeType === "schedule_se");
  const qbi = result.outputs.find((o) => o.nodeType === "form8995");
  assertEquals(se, undefined);
  assertEquals(qbi, undefined);
});

// ---- Unit: statutory employee exemption ----

Deno.test("scheduleC.compute: statutory_employee suppresses SE and QBI routing", () => {
  const result = scheduleC.compute({
    ...BASE_INPUT,
    statutory_employee: true,
  });

  const se = result.outputs.find((o) => o.nodeType === "schedule_se");
  const qbi = result.outputs.find((o) => o.nodeType === "form8995");
  assertEquals(se, undefined);
  assertEquals(qbi, undefined);

  // But net profit still flows to schedule1
  const s1 = result.outputs.find((o) => o.nodeType === "schedule1");
  assertEquals(s1 !== undefined, true);
});

// ---- Unit: exempt notary exemption ----

Deno.test("scheduleC.compute: exempt_notary suppresses SE and QBI routing", () => {
  const result = scheduleC.compute({
    ...BASE_INPUT,
    exempt_notary: true,
  });

  const se = result.outputs.find((o) => o.nodeType === "schedule_se");
  assertEquals(se, undefined);
});

// ---- Unit: professional gambler loss cap ----

Deno.test("scheduleC.compute: professional_gambler caps net profit at zero (no loss)", () => {
  const result = scheduleC.compute({
    ...BASE_INPUT,
    line_1_gross_receipts: 5_000,
    line_8_advertising: 20_000,
    professional_gambler: true,
  });

  const s1 = result.outputs.find((o) => o.nodeType === "schedule1");
  const input = s1!.input as Record<string, number>;
  // gross - expenses = -15000, but capped at 0 for gamblers
  assertEquals(input.line3_schedule_c, 0);
});

Deno.test("scheduleC.compute: non-gambler can report negative net profit (loss)", () => {
  const result = scheduleC.compute({
    ...BASE_INPUT,
    line_1_gross_receipts: 5_000,
    line_8_advertising: 20_000,
  });

  const s1 = result.outputs.find((o) => o.nodeType === "schedule1");
  const input = s1!.input as Record<string, number>;
  assertEquals(input.line3_schedule_c, -15_000);
});

// ---- Unit: other income can be negative (recapture) ----

Deno.test("scheduleC.compute: negative other income reduces gross income", () => {
  const result = scheduleC.compute({
    ...BASE_INPUT,
    line_6_other_income: -2_000,
  });

  const s1 = result.outputs.find((o) => o.nodeType === "schedule1");
  const input = s1!.input as Record<string, number>;
  assertEquals(input.line3_schedule_c, 98_000);
});

// ---- Unit: inputSchema validation ----

Deno.test("scheduleC.inputSchema: missing required fields fails validation", () => {
  const parsed = scheduleC.inputSchema.safeParse({});
  assertEquals(parsed.success, false);
});

Deno.test("scheduleC.inputSchema: negative gross receipts fails validation", () => {
  const parsed = scheduleC.inputSchema.safeParse({
    ...BASE_INPUT,
    line_1_gross_receipts: -1,
  });
  assertEquals(parsed.success, false);
});

Deno.test("scheduleC.inputSchema: invalid accounting method fails validation", () => {
  const parsed = scheduleC.inputSchema.safeParse({
    ...BASE_INPUT,
    line_f_accounting_method: "hybrid",
  });
  assertEquals(parsed.success, false);
});

Deno.test("scheduleC.inputSchema: valid minimal input passes", () => {
  const parsed = scheduleC.inputSchema.safeParse(BASE_INPUT);
  assertEquals(parsed.success, true);
});
