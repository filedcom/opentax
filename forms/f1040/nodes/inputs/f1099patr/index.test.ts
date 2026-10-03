import { assertEquals, assertThrows } from "@std/assert";
import { f1099patr } from "./index.ts";

function compute(items: Record<string, unknown>[]) {
  return f1099patr.compute(
    { taxYear: 2025, formType: "f1040" },
    { f1099patrs: items },
  );
}

function field(
  result: ReturnType<typeof compute>,
  nodeType: string,
  name: string,
) {
  return result.outputs.find((item) => item.nodeType === nodeType)
    ?.fields[name];
}

function farm(farmId: string, taxable: number) {
  return {
    kind: "farm",
    farm_id: farmId,
    verified_taxable_amount: taxable,
  };
}

function issued(reference: string) {
  return {
    payer_name: "Farm Cooperative",
    payer_tin: "123456789",
    recipient_tin: "111223333",
    source_document_reference: reference,
  };
}

function personal(amount: number) {
  return {
    kind: "personal_basis_adjustment",
    purchase_reference: "2025 household fuel invoice 42",
    verified_basis_reduction: amount,
  };
}

Deno.test("1099-PATR requires explicit treatment for a positive distribution", () => {
  assertThrows(() => compute([{ box1_patronage_dividends: 300 }]));
  assertThrows(() =>
    compute([{
      box1_patronage_dividends: 300,
      trade_or_business: false,
    }])
  );
  assertThrows(() =>
    compute([{
      box1_patronage_dividends: 300,
      trade_or_business: true,
    }])
  );
});

Deno.test("1099-PATR farm source carries gross and verified taxable amounts to Schedule F", () => {
  const result = compute([{
    ...issued("issued-patr-1"),
    box1_patronage_dividends: 500,
    box2_nonpatronage_distributions: 100,
    box3_per_unit_retain: 50,
    box5_redeemed_nonqualified: 250,
    distribution_treatment: farm("FARM-1", 700),
  }]);
  assertEquals(field(result, "schedule_f", "farm_sources"), [{
    farm_id: "FARM-1",
    kind: "1099patr_cooperative",
    amount: 900,
    taxable_amount: 700,
    payer_name: "Farm Cooperative",
    payer_tin: "123456789",
    recipient_tin: "111223333",
    source_document_reference: "issued-patr-1",
  }]);
  assertEquals(
    result.outputs.some((item) => item.nodeType === "schedule1"),
    false,
  );
});

Deno.test("1099-PATR positive farm distribution needs issued payer and recipient", () => {
  const source = {
    ...issued("issued-patr-farm"),
    box1_patronage_dividends: 300,
    distribution_treatment: farm("FARM-1", 300),
  };
  for (
    const field of [
      "payer_name",
      "payer_tin",
      "recipient_tin",
      "source_document_reference",
    ]
  ) {
    const changed = { ...source } as Record<string, unknown>;
    delete changed[field];
    assertThrows(
      () => compute([changed]),
      Error,
      "1099-PATR farm distribution needs payer, recipient, and issued-copy identity",
    );
  }
});

Deno.test("1099-PATR preserves separate farm identities and taxable shares", () => {
  const result = compute([{
    ...issued("issued-patr-A"),
    box1_patronage_dividends: 300,
    distribution_treatment: farm("FARM-A", 200),
  }, {
    ...issued("issued-patr-B"),
    box3_per_unit_retain: 100,
    distribution_treatment: farm("FARM-B", 100),
  }]);
  assertEquals(field(result, "schedule_f", "farm_sources"), [{
    farm_id: "FARM-A",
    kind: "1099patr_cooperative",
    amount: 300,
    taxable_amount: 200,
    payer_name: "Farm Cooperative",
    payer_tin: "123456789",
    recipient_tin: "111223333",
    source_document_reference: "issued-patr-A",
  }, {
    farm_id: "FARM-B",
    kind: "1099patr_cooperative",
    amount: 100,
    taxable_amount: 100,
    payer_name: "Farm Cooperative",
    payer_tin: "123456789",
    recipient_tin: "111223333",
    source_document_reference: "issued-patr-B",
  }]);
});

Deno.test("1099-PATR rejects farm taxable share above gross or contradictory nonbusiness flag", () => {
  assertThrows(() =>
    compute([{
      box1_patronage_dividends: 300,
      distribution_treatment: farm("FARM-1", 301),
    }])
  );
  assertThrows(() =>
    compute([{
      box1_patronage_dividends: 300,
      trade_or_business: false,
      distribution_treatment: farm("FARM-1", 300),
    }])
  );
  assertThrows(() =>
    compute([{
      box1_patronage_dividends: 300,
      distribution_treatment: { kind: "farm", verified_taxable_amount: 300 },
    }])
  );
});

Deno.test("1099-PATR records a personal basis reduction and emits no taxable income", () => {
  const result = compute([{
    box1_patronage_dividends: 300,
    distribution_treatment: personal(300),
  }]);
  assertEquals(result.outputs, []);
});

Deno.test("1099-PATR personal treatment rejects unreferenced or unmatched basis and nonpatronage boxes", () => {
  assertThrows(() =>
    compute([{
      box1_patronage_dividends: 300,
      distribution_treatment: { ...personal(300), purchase_reference: "" },
    }])
  );
  assertThrows(() =>
    compute([{
      box1_patronage_dividends: 300,
      distribution_treatment: personal(200),
    }])
  );
  assertThrows(() =>
    compute([{
      box2_nonpatronage_distributions: 300,
      distribution_treatment: personal(300),
    }])
  );
  assertThrows(() =>
    compute([{
      box1_patronage_dividends: 300,
      trade_or_business: true,
      distribution_treatment: personal(300),
    }])
  );
});

Deno.test("1099-PATR withholding aggregates independently of distribution treatment", () => {
  const result = compute([{
    ...issued("issued-patr-withheld"),
    box1_patronage_dividends: 300,
    box4_federal_withheld: 40,
    distribution_treatment: farm("FARM-1", 300),
  }, {
    box1_patronage_dividends: 200,
    box4_federal_withheld: 10,
    distribution_treatment: personal(200),
  }]);
  assertEquals(field(result, "f1040", "line25b_withheld_1099"), 50);
});

Deno.test("1099-PATR rejects repeated identified payer accounts before income or withholding sums", () => {
  const issued = {
    payer_name: "Farm Cooperative",
    payer_tin: "12-3456789",
    recipient_tin: "111223333",
    account_number: "P-1",
    source_document_reference: "issued-patr-duplicate",
    box1_patronage_dividends: 300,
    box4_federal_withheld: 20,
    distribution_treatment: farm("FARM-1", 300),
  };
  assertThrows(
    () =>
      compute([issued, {
        ...issued,
        box1_patronage_dividends: 350,
        distribution_treatment: farm("FARM-1", 350),
      }]),
    Error,
    "1099-PATR repeats the same payer, recipient, and account",
  );
  const distinct = compute([issued, {
    ...issued,
    account_number: "P-2",
    source_document_reference: "issued-patr-second",
  }]);
  assertEquals(field(distinct, "f1040", "line25b_withheld_1099"), 40);
});

Deno.test("1099-PATR rejects ambiguous positive cooperative copies", () => {
  const issued = {
    payer_name: "Farm Cooperative",
    payer_tin: "12-3456789",
    recipient_tin: "111223333",
    box4_federal_withheld: 20,
  };
  for (
    const changed of [
      { ...issued, box4_federal_withheld: 30 },
      { ...issued, payer_tin: undefined, box4_federal_withheld: 30 },
      { ...issued, box4_federal_withheld: 30, account_number: "P-2" },
      {
        ...issued,
        box4_federal_withheld: 30,
        source_document_reference: "issued-copy-2",
      },
    ]
  ) {
    assertThrows(
      () => compute([issued, changed]),
      Error,
      "need distinct accounts or issued source references",
    );
  }
  const distinct = compute([
    { ...issued, source_document_reference: "issued-copy-1" },
    {
      ...issued,
      box4_federal_withheld: 30,
      source_document_reference: "issued-copy-2",
    },
  ]);
  assertEquals(field(distinct, "f1040", "line25b_withheld_1099"), 50);
});

Deno.test("1099-PATR cannot reuse one issued-copy reference across cooperatives", () => {
  const first = {
    ...issued("one-patr-copy"),
    box4_federal_withheld: 20,
  };
  assertThrows(
    () =>
      compute([first, {
        ...first,
        payer_name: "Second Cooperative",
        payer_tin: "987654321",
        account_number: "SECOND-ACCOUNT",
      }]),
    Error,
    "1099-PATR repeats the same issued-copy source reference",
  );
});

Deno.test("1099-PATR retains specified-cooperative QBI source only for business facts", () => {
  const business = {
    box7_qualified_payments: 100,
    box13_specified_cooperative: true,
    trade_or_business: true,
  };
  assertEquals(field(compute([business]), "f1099patr", "f1099patrs"), [
    business,
  ]);
  assertEquals(
    field(
      compute([{
        ...business,
        trade_or_business: false,
      }]),
      "f1099patr",
      "f1099patrs",
    ),
    undefined,
  );
});

Deno.test("1099-PATR empty informational item does not produce tax output", () => {
  assertEquals(
    compute([{
      box6_section199ag_deduction: 0,
      box8_section199aa_qualified_items: 100,
    }]).outputs,
    [],
  );
  assertThrows(() => compute([{ box4_federal_withheld: -1 }]));
});
