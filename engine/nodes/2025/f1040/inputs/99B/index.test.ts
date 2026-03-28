import { assertEquals } from "@std/assert";
import { b99 } from "./index.ts";

// ---- Unit: form8949 routing ----

Deno.test("b99.compute: always routes to form8949", () => {
  const result = b99.compute({
    part: "A",
    description: "100 sh AAPL",
    date_acquired: "01/15/2025",
    date_sold: "06/30/2025",
    proceeds: 18000,
    cost_basis: 15000,
  });

  const f8949Output = result.outputs.find((o) => o.nodeType === "form8949");
  assertEquals(f8949Output !== undefined, true);
});

Deno.test("b99.compute: form8949 input contains all required fields", () => {
  const result = b99.compute({
    part: "B",
    description: "50 sh MSFT",
    date_acquired: "03/10/2024",
    date_sold: "08/15/2025",
    proceeds: 20000,
    cost_basis: 17500,
    adjustment_codes: "W",
    adjustment_amount: -500,
  });

  const f8949Output = result.outputs.find((o) => o.nodeType === "form8949");
  const input = f8949Output!.input as Record<string, unknown>;
  assertEquals(input.part, "B");
  assertEquals(input.description, "50 sh MSFT");
  assertEquals(input.date_acquired, "03/10/2024");
  assertEquals(input.date_sold, "08/15/2025");
  assertEquals(input.proceeds, 20000);
  assertEquals(input.cost_basis, 17500);
  assertEquals(input.adjustment_codes, "W");
  assertEquals(input.adjustment_amount, -500);
});

// ---- Unit: gain/loss calculation ----

Deno.test("b99.compute: gain_loss = proceeds - cost_basis when no adjustment", () => {
  const result = b99.compute({
    part: "D",
    description: "200 sh GOOG",
    date_acquired: "02/01/2024",
    date_sold: "11/30/2025",
    proceeds: 30000,
    cost_basis: 25000,
  });

  const f8949Output = result.outputs.find((o) => o.nodeType === "form8949");
  const input = f8949Output!.input as Record<string, unknown>;
  assertEquals(input.gain_loss, 5000);
});

Deno.test("b99.compute: gain_loss includes adjustment_amount", () => {
  const result = b99.compute({
    part: "A",
    description: "100 sh TSLA",
    date_acquired: "05/01/2025",
    date_sold: "09/15/2025",
    proceeds: 10000,
    cost_basis: 8000,
    adjustment_amount: -1000,
  });

  const f8949Output = result.outputs.find((o) => o.nodeType === "form8949");
  const input = f8949Output!.input as Record<string, unknown>;
  // gain_loss = 10000 - 8000 + (-1000) = 1000
  assertEquals(input.gain_loss, 1000);
});

Deno.test("b99.compute: gain_loss can be negative (loss)", () => {
  const result = b99.compute({
    part: "E",
    description: "50 sh NFLX",
    date_acquired: "01/10/2023",
    date_sold: "03/20/2025",
    proceeds: 5000,
    cost_basis: 8000,
  });

  const f8949Output = result.outputs.find((o) => o.nodeType === "form8949");
  const input = f8949Output!.input as Record<string, unknown>;
  assertEquals(input.gain_loss, -3000);
});

// ---- Unit: is_long_term flag ----

Deno.test("b99.compute: part A is short-term (is_long_term = false)", () => {
  const result = b99.compute({
    part: "A",
    description: "Short-term sale",
    date_acquired: "06/01/2025",
    date_sold: "10/01/2025",
    proceeds: 1000,
    cost_basis: 900,
  });

  const f8949Output = result.outputs.find((o) => o.nodeType === "form8949");
  const input = f8949Output!.input as Record<string, unknown>;
  assertEquals(input.is_long_term, false);
});

Deno.test("b99.compute: part B is short-term (is_long_term = false)", () => {
  const result = b99.compute({
    part: "B",
    description: "Short-term sale",
    date_acquired: "06/01/2025",
    date_sold: "10/01/2025",
    proceeds: 1000,
    cost_basis: 900,
  });

  const f8949Output = result.outputs.find((o) => o.nodeType === "form8949");
  const input = f8949Output!.input as Record<string, unknown>;
  assertEquals(input.is_long_term, false);
});

Deno.test("b99.compute: part C is short-term (is_long_term = false)", () => {
  const result = b99.compute({
    part: "C",
    description: "Short-term sale",
    date_acquired: "06/01/2025",
    date_sold: "10/01/2025",
    proceeds: 1000,
    cost_basis: 900,
  });

  const f8949Output = result.outputs.find((o) => o.nodeType === "form8949");
  const input = f8949Output!.input as Record<string, unknown>;
  assertEquals(input.is_long_term, false);
});

Deno.test("b99.compute: part D is long-term (is_long_term = true)", () => {
  const result = b99.compute({
    part: "D",
    description: "Long-term sale",
    date_acquired: "01/01/2024",
    date_sold: "06/01/2025",
    proceeds: 5000,
    cost_basis: 4000,
  });

  const f8949Output = result.outputs.find((o) => o.nodeType === "form8949");
  const input = f8949Output!.input as Record<string, unknown>;
  assertEquals(input.is_long_term, true);
});

Deno.test("b99.compute: part E is long-term (is_long_term = true)", () => {
  const result = b99.compute({
    part: "E",
    description: "Long-term sale",
    date_acquired: "01/01/2024",
    date_sold: "06/01/2025",
    proceeds: 5000,
    cost_basis: 4000,
  });

  const f8949Output = result.outputs.find((o) => o.nodeType === "form8949");
  const input = f8949Output!.input as Record<string, unknown>;
  assertEquals(input.is_long_term, true);
});

Deno.test("b99.compute: part F is long-term (is_long_term = true)", () => {
  const result = b99.compute({
    part: "F",
    description: "Long-term sale",
    date_acquired: "01/01/2024",
    date_sold: "06/01/2025",
    proceeds: 5000,
    cost_basis: 4000,
  });

  const f8949Output = result.outputs.find((o) => o.nodeType === "form8949");
  const input = f8949Output!.input as Record<string, unknown>;
  assertEquals(input.is_long_term, true);
});

// ---- Unit: backup withholding routing ----

Deno.test("b99.compute: federal_withheld > 0 routes to f1040 line25b", () => {
  const result = b99.compute({
    part: "A",
    description: "100 sh XYZ",
    date_acquired: "07/01/2025",
    date_sold: "09/30/2025",
    proceeds: 2000,
    cost_basis: 1800,
    federal_withheld: 480,
  });

  const f1040Output = result.outputs.find((o) => o.nodeType === "f1040");
  assertEquals(f1040Output !== undefined, true);
  const input = f1040Output!.input as Record<string, unknown>;
  assertEquals(input.line25b_withheld_1099, 480);
});

Deno.test("b99.compute: no federal_withheld emits no f1040 output", () => {
  const result = b99.compute({
    part: "D",
    description: "100 sh ABC",
    date_acquired: "01/01/2024",
    date_sold: "06/01/2025",
    proceeds: 3000,
    cost_basis: 2500,
  });

  const f1040Output = result.outputs.find((o) => o.nodeType === "f1040");
  assertEquals(f1040Output, undefined);
});

Deno.test("b99.compute: federal_withheld = 0 does not emit f1040 output", () => {
  const result = b99.compute({
    part: "B",
    description: "Sale",
    date_acquired: "04/01/2025",
    date_sold: "08/01/2025",
    proceeds: 1500,
    cost_basis: 1200,
    federal_withheld: 0,
  });

  const f1040Output = result.outputs.find((o) => o.nodeType === "f1040");
  assertEquals(f1040Output, undefined);
});
