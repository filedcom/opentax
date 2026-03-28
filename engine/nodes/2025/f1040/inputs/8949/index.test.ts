import { assertEquals } from "@std/assert";
import { f8949 } from "./index.ts";

// ---- Unit: gain/loss computation and schedule_d routing ----

Deno.test("f8949.compute: short-term gain routes to schedule_d with is_long_term=false", () => {
  const result = f8949.compute({
    part: "A",
    description: "100 sh ACME Corp",
    date_acquired: "2025-01-15",
    date_sold: "2025-06-20",
    proceeds: 5000,
    cost_basis: 3000,
  });

  const sdOutput = result.outputs.find((o) => o.nodeType === "schedule_d");
  assertEquals(sdOutput !== undefined, true);
  const input = sdOutput!.input as Record<string, unknown>;
  const tx = input.transaction as Record<string, unknown>;
  assertEquals(tx.gain_loss, 2000);
  assertEquals(tx.is_long_term, false);
  assertEquals(tx.part, "A");
});

Deno.test("f8949.compute: long-term gain routes to schedule_d with is_long_term=true", () => {
  const result = f8949.compute({
    part: "D",
    description: "50 sh Widget Inc",
    date_acquired: "2023-03-01",
    date_sold: "2025-04-15",
    proceeds: 8000,
    cost_basis: 5000,
  });

  const sdOutput = result.outputs.find((o) => o.nodeType === "schedule_d");
  assertEquals(sdOutput !== undefined, true);
  const input = sdOutput!.input as Record<string, unknown>;
  const tx = input.transaction as Record<string, unknown>;
  assertEquals(tx.gain_loss, 3000);
  assertEquals(tx.is_long_term, true);
  assertEquals(tx.part, "D");
});

Deno.test("f8949.compute: gain_loss accounts for adjustment_amount", () => {
  const result = f8949.compute({
    part: "B",
    description: "Bond Sale",
    date_acquired: "2025-02-01",
    date_sold: "2025-09-30",
    proceeds: 4000,
    cost_basis: 4500,
    adjustment_codes: "W",
    adjustment_amount: 200,
  });

  const sdOutput = result.outputs.find((o) => o.nodeType === "schedule_d");
  assertEquals(sdOutput !== undefined, true);
  const input = sdOutput!.input as Record<string, unknown>;
  const tx = input.transaction as Record<string, unknown>;
  // gain_loss = 4000 - 4500 + 200 = -300
  assertEquals(tx.gain_loss, -300);
});

Deno.test("f8949.compute: negative adjustment_amount reduces gain", () => {
  const result = f8949.compute({
    part: "E",
    description: "Mutual Fund",
    date_acquired: "2020-06-01",
    date_sold: "2025-07-01",
    proceeds: 10000,
    cost_basis: 7000,
    adjustment_amount: -500,
  });

  const sdOutput = result.outputs.find((o) => o.nodeType === "schedule_d");
  assertEquals(sdOutput !== undefined, true);
  const input = sdOutput!.input as Record<string, unknown>;
  const tx = input.transaction as Record<string, unknown>;
  // gain_loss = 10000 - 7000 + (-500) = 2500
  assertEquals(tx.gain_loss, 2500);
  assertEquals(tx.is_long_term, true);
});

Deno.test("f8949.compute: all transaction fields are forwarded to schedule_d", () => {
  const result = f8949.compute({
    part: "C",
    description: "Crypto Asset",
    date_acquired: "Various",
    date_sold: "2025-11-01",
    proceeds: 2000,
    cost_basis: 1500,
    adjustment_codes: "B",
    adjustment_amount: 50,
  });

  const sdOutput = result.outputs.find((o) => o.nodeType === "schedule_d");
  assertEquals(sdOutput !== undefined, true);
  const input = sdOutput!.input as Record<string, unknown>;
  const tx = input.transaction as Record<string, unknown>;
  assertEquals(tx.description, "Crypto Asset");
  assertEquals(tx.date_acquired, "Various");
  assertEquals(tx.date_sold, "2025-11-01");
  assertEquals(tx.proceeds, 2000);
  assertEquals(tx.cost_basis, 1500);
  assertEquals(tx.adjustment_codes, "B");
  assertEquals(tx.adjustment_amount, 50);
  assertEquals(tx.is_long_term, false); // part C = short-term
});

// ---- Unit: part classification ----

Deno.test("f8949.compute: parts A, B, C are short-term", () => {
  for (const part of ["A", "B", "C"] as const) {
    const result = f8949.compute({
      part,
      description: "Asset",
      date_acquired: "2025-01-01",
      date_sold: "2025-12-01",
      proceeds: 1000,
      cost_basis: 800,
    });

    const sdOutput = result.outputs.find((o) => o.nodeType === "schedule_d");
    assertEquals(sdOutput !== undefined, true);
    const tx = (sdOutput!.input as Record<string, unknown>)
      .transaction as Record<string, unknown>;
    assertEquals(tx.is_long_term, false, `part ${part} should be short-term`);
  }
});

Deno.test("f8949.compute: parts D, E, F are long-term", () => {
  for (const part of ["D", "E", "F"] as const) {
    const result = f8949.compute({
      part,
      description: "Asset",
      date_acquired: "2023-01-01",
      date_sold: "2025-12-01",
      proceeds: 1000,
      cost_basis: 800,
    });

    const sdOutput = result.outputs.find((o) => o.nodeType === "schedule_d");
    assertEquals(sdOutput !== undefined, true);
    const tx = (sdOutput!.input as Record<string, unknown>)
      .transaction as Record<string, unknown>;
    assertEquals(tx.is_long_term, true, `part ${part} should be long-term`);
  }
});

// ---- Unit: federal_withheld routing ----

Deno.test("f8949.compute: federal_withheld > 0 routes to f1040 line25b", () => {
  const result = f8949.compute({
    part: "A",
    description: "Stock Sale",
    date_acquired: "2025-01-01",
    date_sold: "2025-10-01",
    proceeds: 5000,
    cost_basis: 4000,
    federal_withheld: 300,
  });

  const f1040Output = result.outputs.find((o) => o.nodeType === "f1040");
  assertEquals(f1040Output !== undefined, true);
  const input = f1040Output!.input as Record<string, unknown>;
  assertEquals(input.line25b_withheld_1099, 300);
});

Deno.test("f8949.compute: federal_withheld = 0 does not emit f1040 output", () => {
  const result = f8949.compute({
    part: "D",
    description: "Bond",
    date_acquired: "2020-01-01",
    date_sold: "2025-08-01",
    proceeds: 6000,
    cost_basis: 5000,
    federal_withheld: 0,
  });

  const f1040Output = result.outputs.find((o) => o.nodeType === "f1040");
  assertEquals(f1040Output, undefined);
});

Deno.test("f8949.compute: missing federal_withheld does not emit f1040 output", () => {
  const result = f8949.compute({
    part: "F",
    description: "Rental Property",
    date_acquired: "2015-05-01",
    date_sold: "2025-09-01",
    proceeds: 200000,
    cost_basis: 150000,
  });

  const f1040Output = result.outputs.find((o) => o.nodeType === "f1040");
  assertEquals(f1040Output, undefined);
});

Deno.test("f8949.compute: always emits exactly one schedule_d output", () => {
  const result = f8949.compute({
    part: "A",
    description: "Simple Stock",
    date_acquired: "2025-03-01",
    date_sold: "2025-11-15",
    proceeds: 1000,
    cost_basis: 1000,
  });

  const sdOutputs = result.outputs.filter((o) => o.nodeType === "schedule_d");
  assertEquals(sdOutputs.length, 1);
  const tx = (sdOutputs[0].input as Record<string, unknown>)
    .transaction as Record<string, unknown>;
  assertEquals(tx.gain_loss, 0);
});
