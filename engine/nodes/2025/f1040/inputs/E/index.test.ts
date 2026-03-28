import { assertEquals } from "@std/assert";
import { scheduleE } from "./index.ts";

// ---- Unit: rental/royalty income routing ----

Deno.test("scheduleE.compute: rental income minus expenses routes to schedule1 line17", () => {
  const result = scheduleE.compute({
    schedule_es: [{
      property_address: "123 Main St",
      property_type: "rental_real_estate",
      rental_income: 12000,
      line_9_insurance: 1200,
      line_14_repairs: 800,
    }],
  });

  const s1Output = result.outputs.find((o) => o.nodeType === "schedule1");
  assertEquals(s1Output !== undefined, true);
  const input = s1Output!.input as Record<string, unknown>;
  // net = 12000 - 1200 - 800 = 10000
  assertEquals(input.line17_schedule_e, 10000);
});

Deno.test("scheduleE.compute: royalty income routes to schedule1 line17", () => {
  const result = scheduleE.compute({
    schedule_es: [{
      property_address: "Book Royalties",
      property_type: "royalty",
      royalty_income: 5000,
      line_19_other: 500,
    }],
  });

  const s1Output = result.outputs.find((o) => o.nodeType === "schedule1");
  assertEquals(s1Output !== undefined, true);
  const input = s1Output!.input as Record<string, unknown>;
  assertEquals(input.line17_schedule_e, 4500);
});

Deno.test("scheduleE.compute: net income can be negative (rental loss)", () => {
  const result = scheduleE.compute({
    schedule_es: [{
      property_address: "456 Oak Ave",
      rental_income: 5000,
      line_18_depreciation: 8000,
    }],
  });

  const s1Output = result.outputs.find((o) => o.nodeType === "schedule1");
  assertEquals(s1Output !== undefined, true);
  const input = s1Output!.input as Record<string, unknown>;
  assertEquals(input.line17_schedule_e, -3000);
});

// ---- Unit: personal use day proration ----

Deno.test("scheduleE.compute: personal use days above threshold prorates expenses", () => {
  const result = scheduleE.compute({
    schedule_es: [{
      property_address: "Vacation Home",
      rental_income: 10000,
      rental_days: 100,
      personal_use_days: 30, // > max(14, 100 * 0.10 = 10) → prorate
      line_9_insurance: 2000,
    }],
  });

  // deductible = 2000 * (100 / (100 + 30)) ≈ 1538.46
  const s1Output = result.outputs.find((o) => o.nodeType === "schedule1");
  assertEquals(s1Output !== undefined, true);
  const input = s1Output!.input as Record<string, unknown>;
  const netIncome = input.line17_schedule_e as number;
  // 10000 - 1538.46... = 8461.53...
  assertEquals(netIncome > 8461 && netIncome < 8462, true);
});

Deno.test("scheduleE.compute: personal use days below threshold allows full deduction", () => {
  const result = scheduleE.compute({
    schedule_es: [{
      property_address: "Rental Property",
      rental_income: 10000,
      rental_days: 200,
      personal_use_days: 10, // <= max(14, 200 * 0.10 = 20) → no proration (10 <= 20)
      line_9_insurance: 2000,
    }],
  });

  const s1Output = result.outputs.find((o) => o.nodeType === "schedule1");
  assertEquals(s1Output !== undefined, true);
  const input = s1Output!.input as Record<string, unknown>;
  assertEquals(input.line17_schedule_e, 8000);
});

// ---- Unit: K-1 routing ----

Deno.test("scheduleE.compute: k1_ordinary_income routes to schedule1 line17", () => {
  const result = scheduleE.compute({
    schedule_es: [{
      property_address: "Acme Partners LLC",
      property_type: "partnership",
      k1_ordinary_income: 15000,
    }],
  });

  const s1Output = result.outputs.find((o) => o.nodeType === "schedule1");
  assertEquals(s1Output !== undefined, true);
  const input = s1Output!.input as Record<string, unknown>;
  assertEquals(input.line17_schedule_e, 15000);
});

Deno.test("scheduleE.compute: k1_ordinary_income can be negative (K-1 loss)", () => {
  const result = scheduleE.compute({
    schedule_es: [{
      property_address: "S-Corp Inc",
      property_type: "s_corp",
      k1_ordinary_income: -4000,
    }],
  });

  const s1Output = result.outputs.find((o) => o.nodeType === "schedule1");
  assertEquals(s1Output !== undefined, true);
  const input = s1Output!.input as Record<string, unknown>;
  assertEquals(input.line17_schedule_e, -4000);
});

Deno.test("scheduleE.compute: k1_cap_gain_lt routes to schedule_d line12_k1_lt", () => {
  const result = scheduleE.compute({
    schedule_es: [{
      property_address: "Fund LLC",
      property_type: "partnership",
      k1_cap_gain_lt: 3000,
    }],
  });

  const sdOutput = result.outputs.find((o) => o.nodeType === "schedule_d");
  assertEquals(sdOutput !== undefined, true);
  const input = sdOutput!.input as Record<string, unknown>;
  assertEquals(input.line12_k1_lt, 3000);
});

Deno.test("scheduleE.compute: k1_qualified_dividends routes to f1040 line3a", () => {
  const result = scheduleE.compute({
    schedule_es: [{
      property_address: "Trust Fund",
      property_type: "estate_trust",
      k1_qualified_dividends: 1200,
    }],
  });

  const f1040Output = result.outputs.find((o) => o.nodeType === "f1040");
  assertEquals(f1040Output !== undefined, true);
  const input = f1040Output!.input as Record<string, unknown>;
  assertEquals(input.line3a_qualified_dividends, 1200);
});

Deno.test("scheduleE.compute: k1_interest_income routes to schedule_b_interest", () => {
  const result = scheduleE.compute({
    schedule_es: [{
      property_address: "Investment LP",
      property_type: "partnership",
      k1_interest_income: 500,
    }],
  });

  const sbOutput = result.outputs.find((o) =>
    o.nodeType === "schedule_b_interest"
  );
  assertEquals(sbOutput !== undefined, true);
  const input = sbOutput!.input as Record<string, unknown>;
  assertEquals(input.payer_name, "Investment LP");
  assertEquals(input.taxable_interest_net, 500);
});

Deno.test("scheduleE.compute: zero k1_cap_gain_lt does not emit schedule_d output", () => {
  const result = scheduleE.compute({
    schedule_es: [{
      property_address: "Small LLC",
      property_type: "partnership",
      k1_cap_gain_lt: 0,
    }],
  });

  const sdOutput = result.outputs.find((o) => o.nodeType === "schedule_d");
  assertEquals(sdOutput, undefined);
});

Deno.test("scheduleE.compute: rental with no income and no expenses emits zero net", () => {
  const result = scheduleE.compute({
    schedule_es: [{
      property_address: "Empty Property",
      property_type: "rental_real_estate",
    }],
  });

  const s1Output = result.outputs.find((o) => o.nodeType === "schedule1");
  assertEquals(s1Output !== undefined, true);
  const input = s1Output!.input as Record<string, unknown>;
  assertEquals(input.line17_schedule_e, 0);
});
