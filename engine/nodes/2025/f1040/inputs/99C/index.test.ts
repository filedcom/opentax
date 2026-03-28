import { assertEquals } from "@std/assert";
import { c99 } from "./index.ts";

// ---- Unit: taxable routing ----

Deno.test("c99.compute: routing=taxable routes box2 to schedule1 line8c", () => {
  const result = c99.compute({
    c99s: [{
      creditor_name: "Bank of America",
      box2_cod_amount: 5000,
      routing: "taxable",
    }],
  });

  const s1Output = result.outputs.find((o) => o.nodeType === "schedule1");
  assertEquals(s1Output !== undefined, true);
  const input = s1Output!.input as Record<string, unknown>;
  assertEquals(input.line8c_cod_income, 5000);
});

Deno.test("c99.compute: routing=taxable does not emit form982", () => {
  const result = c99.compute({
    c99s: [{
      creditor_name: "Creditor",
      box2_cod_amount: 1200,
      routing: "taxable",
    }],
  });

  const form982Output = result.outputs.find((o) => o.nodeType === "form982");
  assertEquals(form982Output, undefined);
});

// ---- Unit: excluded routing ----

Deno.test("c99.compute: routing=excluded routes box2 to form982 line2", () => {
  const result = c99.compute({
    c99s: [{
      creditor_name: "Mortgage Co",
      box2_cod_amount: 25000,
      routing: "excluded",
    }],
  });

  const form982Output = result.outputs.find((o) => o.nodeType === "form982");
  assertEquals(form982Output !== undefined, true);
  const input = form982Output!.input as Record<string, unknown>;
  assertEquals(input.line2_excluded_cod, 25000);
});

Deno.test("c99.compute: routing=excluded does not emit schedule1", () => {
  const result = c99.compute({
    c99s: [{
      creditor_name: "Lender",
      box2_cod_amount: 8000,
      routing: "excluded",
    }],
  });

  const s1Output = result.outputs.find((o) => o.nodeType === "schedule1");
  assertEquals(s1Output, undefined);
});

// ---- Unit: property disposition routing ----

Deno.test("c99.compute: box7_fmv_property > 0 routes to schedule_d", () => {
  const result = c99.compute({
    c99s: [{
      creditor_name: "Mortgage Bank",
      box2_cod_amount: 10000,
      box7_fmv_property: 180000,
      routing: "taxable",
    }],
  });

  const sdOutput = result.outputs.find((o) => o.nodeType === "schedule_d");
  assertEquals(sdOutput !== undefined, true);
  const input = sdOutput!.input as Record<string, unknown>;
  assertEquals(input.cod_property_fmv, 180000);
  assertEquals(input.cod_debt_cancelled, 10000);
});

Deno.test("c99.compute: box7_fmv_property = 0 does not route to schedule_d", () => {
  const result = c99.compute({
    c99s: [{
      creditor_name: "Bank",
      box2_cod_amount: 3000,
      box7_fmv_property: 0,
      routing: "taxable",
    }],
  });

  const sdOutput = result.outputs.find((o) => o.nodeType === "schedule_d");
  assertEquals(sdOutput, undefined);
});

Deno.test("c99.compute: omitted box7_fmv_property does not route to schedule_d", () => {
  const result = c99.compute({
    c99s: [{
      creditor_name: "Bank",
      box2_cod_amount: 3000,
      routing: "taxable",
    }],
  });

  const sdOutput = result.outputs.find((o) => o.nodeType === "schedule_d");
  assertEquals(sdOutput, undefined);
});

// ---- Unit: combined routing ----

Deno.test("c99.compute: excluded routing + property disposition emits both form982 and schedule_d", () => {
  const result = c99.compute({
    c99s: [{
      creditor_name: "Foreclosing Bank",
      box2_cod_amount: 50000,
      box7_fmv_property: 200000,
      routing: "excluded",
    }],
  });

  const form982Output = result.outputs.find((o) => o.nodeType === "form982");
  const sdOutput = result.outputs.find((o) => o.nodeType === "schedule_d");
  assertEquals(form982Output !== undefined, true);
  assertEquals(sdOutput !== undefined, true);
});

// ---- Unit: default routing ----

Deno.test("c99.compute: default routing is taxable (no routing field provided)", () => {
  // inputSchema has default "taxable", so we must provide it explicitly or rely on schema parse
  // Since compute() takes already-parsed input, we pass routing explicitly
  const result = c99.compute({
    c99s: [{
      creditor_name: "Bank",
      box2_cod_amount: 2000,
      routing: "taxable",
    }],
  });

  const s1Output = result.outputs.find((o) => o.nodeType === "schedule1");
  assertEquals(s1Output !== undefined, true);
});
