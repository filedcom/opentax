import { assertEquals, assertThrows } from "@std/assert";
import { f1099oid } from "./index.ts";

function compute(items: Parameters<typeof f1099oid.compute>[1]["f1099oids"]) {
  return f1099oid.compute({ taxYear: 2025, formType: "f1040" }, {
    f1099oids: items,
  });
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

function interestDetail(result: ReturnType<typeof compute>) {
  return findOutput(result, "schedule_b")?.fields.interest_detail as {
    payer_name: string;
    gross: number;
    net: number;
    nominee: number;
    accrued: number;
    oid_adjustment: number;
    bond_premium: number;
  } | undefined;
}

Deno.test("f1099oid: affirmed investment-property OID reaches Form 4952 once", () => {
  const item = {
    payer_name: "Bond Fund",
    box1_oid: 500,
    box2_other_interest: 50,
    box6_acquisition_premium: 100,
    box6_applies_to: "taxable_oid" as const,
    investment_property_for_form4952: true,
  };
  assertEquals(
    findOutput(
      compute([{ ...item, investment_property_for_form4952: false }]),
      "form4952",
    ),
    undefined,
  );
  const result = compute([item]);
  assertEquals(
    findOutput(result, "form4952")?.fields.source_1099_interest,
    450,
  );
});

// ---------------------------------------------------------------------------
// 1. Basic OID routing to schedule_b
// ---------------------------------------------------------------------------

Deno.test("f1099oid: basic OID routes to schedule_b", () => {
  const result = compute([{
    payer_name: "Test Corp",
    box1_oid: 500,
  }]);
  assertEquals(interestDetail(result)?.net, 500);
  assertEquals(interestDetail(result)?.payer_name, "Test Corp");
});

Deno.test("f1099oid: acquisition premium reduces OID in schedule_b", () => {
  const result = compute([{
    payer_name: "Test Corp",
    box1_oid: 1000,
    box6_acquisition_premium: 200,
    box6_applies_to: "taxable_oid",
  }]);
  assertEquals(interestDetail(result)?.gross, 1_000);
  assertEquals(interestDetail(result)?.oid_adjustment, 200);
  assertEquals(interestDetail(result)?.net, 800);
});

Deno.test("f1099oid: nominee_oid reduces OID in schedule_b", () => {
  const result = compute([{
    payer_name: "Test Corp",
    box1_oid: 1000,
    nominee_oid: 150,
  }]);
  assertEquals(interestDetail(result)?.nominee, 150);
  assertEquals(interestDetail(result)?.net, 850);
});

Deno.test("f1099oid: box2 other interest added to taxable_interest_net", () => {
  const result = compute([{
    payer_name: "Test Corp",
    box1_oid: 300,
    box2_other_interest: 100,
  }]);
  assertEquals(interestDetail(result)?.net, 400);
});

Deno.test("f1099oid: box10 reduces box2 stated interest, not Treasury box8", () => {
  const result = compute([{
    payer_name: "Treasury broker",
    box8_oid_treasury: 700,
    box2_other_interest: 100,
    box10_bond_premium: 40,
    box10_applies_to: "taxable_stated_interest",
  }]);
  assertEquals(interestDetail(result)?.gross, 800);
  assertEquals(interestDetail(result)?.bond_premium, 40);
  assertEquals(interestDetail(result)?.net, 760);
});

Deno.test("f1099oid: box5 market discount enters current interest only when elected", () => {
  assertThrows(() =>
    compute([{
      payer_name: "Broker",
      box5_market_discount: 80,
    }])
  );
  const deferred = compute([{
    payer_name: "Broker",
    box5_market_discount: 80,
    box5_included_in_income_currently: false,
  }]);
  assertEquals(findOutput(deferred, "schedule_b"), undefined);
  const elected = compute([{
    payer_name: "Broker",
    box5_market_discount: 80,
    box5_included_in_income_currently: true,
  }]);
  assertEquals(interestDetail(elected)?.gross, 80);
  assertEquals(interestDetail(elected)?.net, 80);
});

Deno.test("f1099oid: taxable box10 classification and amount are required", () => {
  assertThrows(() =>
    compute([{
      payer_name: "Broker",
      box2_other_interest: 100,
      box10_bond_premium: 40,
    }])
  );
  assertThrows(() =>
    compute([{
      payer_name: "Broker",
      box8_oid_treasury: 700,
      box10_bond_premium: 40,
      box10_applies_to: "taxable_stated_interest",
    }])
  );
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

Deno.test("f1099oid: box11 tax-exempt OID reaches line 2a; only explicit PAB reaches AMT", () => {
  const result = compute([{
    payer_name: "Municipal Corp",
    box11_tax_exempt_oid: 250,
    box11_pab_oid: 100,
  }]);
  const f6251 = findOutput(result, "form6251");
  assertEquals(f6251?.fields?.line2g_pab_interest, 100);
  assertEquals(findOutput(result, "f1040")?.fields.line2a_tax_exempt, 250);
  assertEquals(
    findOutput(result, "agi_aggregator")?.fields.tax_exempt_interest,
    250,
  );
});

Deno.test("f1099oid: tax-exempt acquisition and bond premium reduce line 2a only", () => {
  const result = compute([{
    payer_name: "Municipal broker",
    box11_tax_exempt_oid: 500,
    box11_pab_oid: 100,
    box6_acquisition_premium: 50,
    box6_applies_to: "tax_exempt_oid",
    box10_bond_premium: 25,
    box10_applies_to: "tax_exempt_oid",
  }]);
  assertEquals(findOutput(result, "f1040")?.fields.line2a_tax_exempt, 425);
  assertEquals(findOutput(result, "form6251")?.fields.line2g_pab_interest, 100);
  assertEquals(findOutput(result, "schedule_b"), undefined);
});

Deno.test("f1099oid: box11 needs an explicit PAB share, including zero", () => {
  assertThrows(() =>
    compute([{
      payer_name: "Municipal broker",
      box11_tax_exempt_oid: 500,
    }])
  );
  assertEquals(
    findOutput(
      compute([{
        payer_name: "Municipal broker",
        box11_tax_exempt_oid: 500,
        box11_pab_oid: 0,
      }]),
      "form6251",
    ),
    undefined,
  );
});

Deno.test("f1099oid: box3 early withdrawal penalty reaches Schedule 1", () => {
  const result = compute([{
    payer_name: "Bank",
    box1_oid: 100,
    box3_early_withdrawal_penalty: 25,
  }]);
  assertEquals(
    findOutput(result, "schedule1")?.fields.line18_early_withdrawal,
    25,
  );
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

Deno.test("f1099oid: acquisition premium exceeding OID is rejected", () => {
  assertThrows(() =>
    compute([{
      payer_name: "Corp",
      box1_oid: 100,
      box6_acquisition_premium: 500,
      box6_applies_to: "taxable_oid",
    }])
  );
});
