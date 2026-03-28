import { assertEquals } from "@std/assert";
import { r1099 } from "./index.ts";

// ---- Unit: IRA routing ----

Deno.test("r1099.compute: IRA distribution routes to f1040 lines 4a/4b", () => {
  const result = r1099.compute({
    payer_name: "Fidelity",
    payer_ein: "04-1234567",
    box1_gross_distribution: 10000,
    box2a_taxable_amount: 10000,
    box7_distribution_code: "7",
    box7_ira_sep_simple: true,
  });

  const f1040Output = result.outputs.find((o) => o.nodeType === "f1040");
  assertEquals(f1040Output !== undefined, true);
  const input = f1040Output!.input as Record<string, unknown>;
  assertEquals(input.line4a_ira_gross, 10000);
  assertEquals(input.line4b_ira_taxable, 10000);
});

Deno.test("r1099.compute: IRA routing uses gross as taxable when box2a absent", () => {
  const result = r1099.compute({
    payer_name: "Vanguard",
    payer_ein: "23-4567890",
    box1_gross_distribution: 5000,
    box7_distribution_code: "7",
    box7_ira_sep_simple: true,
  });

  const f1040Output = result.outputs.find((o) => o.nodeType === "f1040");
  const input = f1040Output!.input as Record<string, unknown>;
  assertEquals(input.line4a_ira_gross, 5000);
  assertEquals(input.line4b_ira_taxable, 5000);
});

// ---- Unit: pension routing ----

Deno.test("r1099.compute: pension distribution routes to f1040 lines 5a/5b", () => {
  const result = r1099.compute({
    payer_name: "IBM Pension",
    payer_ein: "13-1234567",
    box1_gross_distribution: 24000,
    box2a_taxable_amount: 20000,
    box7_distribution_code: "7",
    box7_ira_sep_simple: false,
  });

  const f1040Output = result.outputs.find((o) => o.nodeType === "f1040");
  assertEquals(f1040Output !== undefined, true);
  const input = f1040Output!.input as Record<string, unknown>;
  assertEquals(input.line5a_pension_gross, 24000);
  assertEquals(input.line5b_pension_taxable, 20000);
});

Deno.test("r1099.compute: pension routing uses gross as taxable when box2a absent", () => {
  const result = r1099.compute({
    payer_name: "GM Pension",
    payer_ein: "38-9876543",
    box1_gross_distribution: 18000,
    box7_distribution_code: "7",
    box7_ira_sep_simple: false,
  });

  const f1040Output = result.outputs.find((o) => o.nodeType === "f1040");
  const input = f1040Output!.input as Record<string, unknown>;
  assertEquals(input.line5a_pension_gross, 18000);
  assertEquals(input.line5b_pension_taxable, 18000);
});

Deno.test("r1099.compute: omitted box7_ira_sep_simple defaults to pension routing", () => {
  const result = r1099.compute({
    payer_name: "State Pension",
    payer_ein: "99-1234567",
    box1_gross_distribution: 30000,
    box7_distribution_code: "7",
  });

  const f1040Output = result.outputs.find((o) => o.nodeType === "f1040");
  const input = f1040Output!.input as Record<string, unknown>;
  assertEquals(input.line5a_pension_gross, 30000);
  assertEquals(input.line5b_pension_taxable, 30000);
});

// ---- Unit: federal withholding routing ----

Deno.test("r1099.compute: box4_federal_withheld > 0 routes to f1040 line25b", () => {
  const result = r1099.compute({
    payer_name: "Fidelity",
    payer_ein: "04-1234567",
    box1_gross_distribution: 10000,
    box4_federal_withheld: 2000,
    box7_distribution_code: "7",
    box7_ira_sep_simple: true,
  });

  const withholding = result.outputs.find(
    (o) => o.nodeType === "f1040" && (o.input as Record<string, unknown>).line25b_withheld_1099 !== undefined,
  );
  assertEquals(withholding !== undefined, true);
  const input = withholding!.input as Record<string, unknown>;
  assertEquals(input.line25b_withheld_1099, 2000);
});

Deno.test("r1099.compute: no box4 does not emit line25b", () => {
  const result = r1099.compute({
    payer_name: "Schwab",
    payer_ein: "94-1234567",
    box1_gross_distribution: 8000,
    box7_distribution_code: "7",
    box7_ira_sep_simple: false,
  });

  const withholding = result.outputs.find(
    (o) => o.nodeType === "f1040" && (o.input as Record<string, unknown>).line25b_withheld_1099 !== undefined,
  );
  assertEquals(withholding, undefined);
});

// ---- Unit: early distribution penalty (code 1) ----

Deno.test("r1099.compute: distribution code 1 routes to form5329", () => {
  const result = r1099.compute({
    payer_name: "Fidelity",
    payer_ein: "04-1234567",
    box1_gross_distribution: 15000,
    box2a_taxable_amount: 15000,
    box7_distribution_code: "1",
    box7_ira_sep_simple: true,
  });

  const form5329Output = result.outputs.find((o) => o.nodeType === "form5329");
  assertEquals(form5329Output !== undefined, true);
  const input = form5329Output!.input as Record<string, unknown>;
  assertEquals(input.early_distribution, 15000);
  assertEquals(input.distribution_code, "1");
});

Deno.test("r1099.compute: distribution code 1 uses gross when box2a absent for form5329", () => {
  const result = r1099.compute({
    payer_name: "Vanguard",
    payer_ein: "23-4567890",
    box1_gross_distribution: 7000,
    box7_distribution_code: "1",
    box7_ira_sep_simple: true,
  });

  const form5329Output = result.outputs.find((o) => o.nodeType === "form5329");
  const input = form5329Output!.input as Record<string, unknown>;
  assertEquals(input.early_distribution, 7000);
});

Deno.test("r1099.compute: distribution code 2 does not route to form5329", () => {
  const result = r1099.compute({
    payer_name: "Fidelity",
    payer_ein: "04-1234567",
    box1_gross_distribution: 10000,
    box7_distribution_code: "2",
    box7_ira_sep_simple: true,
  });

  const form5329Output = result.outputs.find((o) => o.nodeType === "form5329");
  assertEquals(form5329Output, undefined);
});

Deno.test("r1099.compute: distribution code 7 does not route to form5329", () => {
  const result = r1099.compute({
    payer_name: "Schwab",
    payer_ein: "94-1234567",
    box1_gross_distribution: 20000,
    box7_distribution_code: "7",
    box7_ira_sep_simple: false,
  });

  const form5329Output = result.outputs.find((o) => o.nodeType === "form5329");
  assertEquals(form5329Output, undefined);
});

// ---- Unit: profit-sharing lump sum (code 5) ----

Deno.test("r1099.compute: distribution code 5 routes to form4972", () => {
  const result = r1099.compute({
    payer_name: "Corp Pension",
    payer_ein: "52-1234567",
    box1_gross_distribution: 100000,
    box7_distribution_code: "5",
    box7_ira_sep_simple: false,
  });

  const form4972Output = result.outputs.find((o) => o.nodeType === "form4972");
  assertEquals(form4972Output !== undefined, true);
  const input = form4972Output!.input as Record<string, unknown>;
  assertEquals(input.lump_sum_amount, 100000);
});

Deno.test("r1099.compute: distribution code 7 does not route to form4972", () => {
  const result = r1099.compute({
    payer_name: "Fidelity",
    payer_ein: "04-1234567",
    box1_gross_distribution: 50000,
    box7_distribution_code: "7",
    box7_ira_sep_simple: false,
  });

  const form4972Output = result.outputs.find((o) => o.nodeType === "form4972");
  assertEquals(form4972Output, undefined);
});
