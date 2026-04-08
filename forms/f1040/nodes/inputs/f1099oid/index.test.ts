import { assertEquals } from "@std/assert";
import { f1099oid } from "./index.ts";

function compute(items: Parameters<typeof f1099oid.compute>[1]["f1099oids"]) {
  return f1099oid.compute({ taxYear: 2025 }, { f1099oids: items });
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ---------------------------------------------------------------------------
// 1. Basic OID routing to schedule_b
// ---------------------------------------------------------------------------

Deno.test("f1099oid: basic OID routes to schedule_b", () => {
  const result = compute([{
    payer_name: "Test Corp",
    box1_oid: 500,
  }]);
  const sb = findOutput(result, "schedule_b");
  assertEquals(sb?.fields?.taxable_interest_net, 500);
  assertEquals(sb?.fields?.payer_name, "Test Corp");
});

Deno.test("f1099oid: acquisition premium reduces OID in schedule_b", () => {
  const result = compute([{
    payer_name: "Test Corp",
    box1_oid: 1000,
    box6_acquisition_premium: 200,
  }]);
  const sb = findOutput(result, "schedule_b");
  assertEquals(sb?.fields?.taxable_interest_net, 800);
});

Deno.test("f1099oid: nominee_oid reduces OID in schedule_b", () => {
  const result = compute([{
    payer_name: "Test Corp",
    box1_oid: 1000,
    nominee_oid: 150,
  }]);
  const sb = findOutput(result, "schedule_b");
  assertEquals(sb?.fields?.taxable_interest_net, 850);
});

Deno.test("f1099oid: box2 other interest added to taxable_interest_net", () => {
  const result = compute([{
    payer_name: "Test Corp",
    box1_oid: 300,
    box2_other_interest: 100,
  }]);
  const sb = findOutput(result, "schedule_b");
  assertEquals(sb?.fields?.taxable_interest_net, 400);
});

// ---------------------------------------------------------------------------
// 2. Federal withholding routes to f1040
// ---------------------------------------------------------------------------

Deno.test("f1099oid: box4 federal withheld routes to f1040 line25b", () => {
  const result = compute([{
    payer_name: "Test Corp",
    box1_oid: 500,
    box4_federal_withheld: 75,
  }]);
  const f1040 = findOutput(result, "f1040");
  assertEquals(f1040?.fields?.line25b_withheld_1099, 75);
});

Deno.test("f1099oid: multiple items withholding summed to f1040", () => {
  const result = compute([
    { payer_name: "Corp A", box1_oid: 200, box4_federal_withheld: 30 },
    { payer_name: "Corp B", box1_oid: 300, box4_federal_withheld: 45 },
  ]);
  const f1040 = findOutput(result, "f1040");
  assertEquals(f1040?.fields?.line25b_withheld_1099, 75);
});

Deno.test("f1099oid: no withholding — no f1040 output", () => {
  const result = compute([{ payer_name: "Corp", box1_oid: 500 }]);
  const f1040 = findOutput(result, "f1040");
  assertEquals(f1040, undefined);
});

// ---------------------------------------------------------------------------
// 3. Tax-exempt OID (private activity bonds) routes to form6251
// ---------------------------------------------------------------------------

Deno.test("f1099oid: box11 tax_exempt_oid routes to form6251", () => {
  const result = compute([{
    payer_name: "Municipal Corp",
    box11_tax_exempt_oid: 250,
  }]);
  const f6251 = findOutput(result, "form6251");
  assertEquals(f6251?.fields?.line2g_pab_interest, 250);
});

Deno.test("f1099oid: no box11 — no form6251 output", () => {
  const result = compute([{ payer_name: "Corp", box1_oid: 500 }]);
  const f6251 = findOutput(result, "form6251");
  assertEquals(f6251, undefined);
});

// ---------------------------------------------------------------------------
// 4. Multiple payers produce multiple schedule_b outputs
// ---------------------------------------------------------------------------

Deno.test("f1099oid: multiple payers produce multiple schedule_b outputs", () => {
  const result = compute([
    { payer_name: "Corp A", box1_oid: 100 },
    { payer_name: "Corp B", box1_oid: 200 },
  ]);
  const sbOutputs = result.outputs.filter((o) => o.nodeType === "schedule_b");
  assertEquals(sbOutputs.length, 2);
});

// ---------------------------------------------------------------------------
// 5. Zero OID — schedule_b still emitted with 0
// ---------------------------------------------------------------------------

Deno.test("f1099oid: zero OID — no schedule_b emitted", () => {
  const result = compute([{ payer_name: "Corp", box1_oid: 0 }]);
  const sb = findOutput(result, "schedule_b");
  assertEquals(sb, undefined);
});

// ---------------------------------------------------------------------------
// 6. Acquisition premium cannot push OID below 0
// ---------------------------------------------------------------------------

Deno.test("f1099oid: acquisition premium exceeding OID — no schedule_b emitted", () => {
  const result = compute([{
    payer_name: "Corp",
    box1_oid: 100,
    box6_acquisition_premium: 500,
  }]);
  const sb = findOutput(result, "schedule_b");
  assertEquals(sb, undefined);
});
