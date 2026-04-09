
import { assertEquals, assertThrows } from "@std/assert";
import { inputSchema, f1099int } from "./index.ts";
import { fieldsOf } from "../../../../../core/test-utils/output.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { form6251 } from "../../intermediate/forms/form6251/index.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import { schedule3 } from "../../intermediate/aggregation/schedule3/index.ts";
import { schedule_b } from "../../intermediate/aggregation/schedule_b/index.ts";
import { form_1116 } from "../../intermediate/forms/form_1116/index.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type ItemOverrides = Partial<{
  payer_name: string;
  payer_tin: string;
  seller_financed: boolean;
  payer_ssn: string;
  payer_address: string;
  payer_city_state_zip: string;
  box1: number;
  box2: number;
  box3: number;
  box4: number;
  box5: number;
  box6: number;
  box7: string;
  box8: number;
  box9: number;
  box10: number;
  box11: number;
  elect_bond_premium_amortization: boolean;
  box12: number;
  box13: number;
  box14: string;
  box15: string;
  box16: string;
  box17: number;
  nominee_interest: number;
  accrued_interest_paid: number;
  non_taxable_oid_adjustment: number;
}>;

function minimalItem(overrides: ItemOverrides = {}): ItemOverrides {
  return {
    payer_name: "Test Bank",
    box1: 0,
    ...overrides,
  };
}

function compute(items: ItemOverrides[], filingStatus?: string) {
  return f1099int.compute(
    { taxYear: 2025, formType: "f1040" },
    inputSchema.parse({ f1099ints: items, filing_status: filingStatus }),
  );
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ---------------------------------------------------------------------------
// 1. Input Schema Validation
// ---------------------------------------------------------------------------

Deno.test("schema: empty payer_name throws", () => {
  assertThrows(() => compute([minimalItem({ payer_name: "" })]), Error);
});

Deno.test("schema: negative box1 throws", () => {
  assertThrows(() => compute([minimalItem({ box1: -1 })]), Error);
});

Deno.test("schema: negative box3 throws", () => {
  assertThrows(() => compute([minimalItem({ box3: -1 })]), Error);
});

Deno.test("schema: box9 exceeding box8 throws", () => {
  assertThrows(() => compute([minimalItem({ box8: 80, box9: 100 })]), Error);
});

Deno.test("schema: box9 equal to box8 is valid", () => {
  const result = compute([minimalItem({ box8: 100, box9: 100 })]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("schema: box13 exceeding box8 throws", () => {
  assertThrows(() => compute([minimalItem({ box8: 100, box13: 150 })]), Error);
});

Deno.test("schema: seller_financed requires payer_ssn (9 digits)", () => {
  assertThrows(
    () => compute([minimalItem({ seller_financed: true, payer_ssn: "" })]),
    Error,
  );
});

Deno.test("schema: seller_financed with 8-digit SSN throws", () => {
  assertThrows(
    () =>
      compute([
        minimalItem({
          seller_financed: true,
          payer_name: "Seller",
          payer_ssn: "12345678",
          payer_address: "1 Main St",
        }),
      ]),
    Error,
  );
});

Deno.test("schema: seller_financed requires payer_address", () => {
  assertThrows(
    () => compute([minimalItem({ seller_financed: true, payer_address: "" })]),
    Error,
  );
});

Deno.test("schema: seller_financed with all required fields is valid", () => {
  const result = compute([
    minimalItem({
      seller_financed: true,
      payer_name: "John Seller",
      payer_ssn: "123456789",
      payer_address: "456 Oak Ave",
    }),
  ]);
  assertEquals(Array.isArray(result.outputs), true);
});

// ---------------------------------------------------------------------------
// 2. Per-Box Routing
// ---------------------------------------------------------------------------

Deno.test("box1 routes to schedule_b with correct net taxable_interest", () => {
  const result = compute([minimalItem({ box1: 100 })]);
  assertEquals(fieldsOf(result.outputs, schedule_b)?.taxable_interest_net, 100);
});

Deno.test("box1 = 0 routes to schedule_b with taxable_interest_net = 0", () => {
  const result = compute([minimalItem({ box1: 0 })]);
  assertEquals(fieldsOf(result.outputs, schedule_b)?.taxable_interest_net, 0);
});

Deno.test("box2 routes to schedule1 line18_early_withdrawal", () => {
  const result = compute([minimalItem({ box2: 50 })]);
  assertEquals(fieldsOf(result.outputs, schedule1)?.line18_early_withdrawal, 50);
});

Deno.test("box2 = 0 produces no schedule1 output", () => {
  const result = compute([minimalItem({ box2: 0 })]);
  assertEquals(findOutput(result, "schedule1"), undefined);
});

Deno.test("box3 (US savings bond interest) adds to schedule_b taxable_interest_net", () => {
  const result = compute([minimalItem({ box3: 75 })]);
  assertEquals(fieldsOf(result.outputs, schedule_b)?.taxable_interest_net, 75);
});

Deno.test("box3 + box1 both included in schedule_b taxable_interest_net", () => {
  const result = compute([minimalItem({ box1: 100, box3: 75 })]);
  assertEquals(fieldsOf(result.outputs, schedule_b)?.taxable_interest_net, 175);
});

Deno.test("box4 routes to f1040 line25b_withheld_1099", () => {
  const result = compute([minimalItem({ box4: 25 })]);
  assertEquals(fieldsOf(result.outputs, f1040)?.line25b_withheld_1099, 25);
});

Deno.test("box4 = 0 produces no f1040 withholding output", () => {
  const result = compute([minimalItem({ box4: 0 })]);
  assertEquals(fieldsOf(result.outputs, f1040)?.line25b_withheld_1099, undefined);
});

Deno.test("box6 below $300 single routes to schedule3 (simplified FTC method)", () => {
  const result = compute([minimalItem({ box1: 500, box6: 200 })]);
  assertEquals(fieldsOf(result.outputs, schedule3)?.line1_foreign_tax_1099, 200);
});

Deno.test("box6 = 0 produces no foreign tax output", () => {
  const result = compute([minimalItem({ box1: 500, box6: 0 })]);
  assertEquals(findOutput(result, "schedule3"), undefined);
  assertEquals(findOutput(result, "form_1116"), undefined);
});

Deno.test("box8 routes to f1040 line2a_tax_exempt (informational MAGI component)", () => {
  const result = compute([minimalItem({ box8: 300 })]);
  assertEquals(fieldsOf(result.outputs, f1040)?.line2a_tax_exempt, 300);
});

Deno.test("box8 = 0 produces no f1040 line2a output", () => {
  const result = compute([minimalItem({ box8: 0 })]);
  assertEquals(fieldsOf(result.outputs, f1040)?.line2a_tax_exempt, undefined);
});

Deno.test("box9 (PAB interest) routes to form6251 line2g_pab_interest", () => {
  const result = compute([minimalItem({ box8: 100, box9: 100 })]);
  assertEquals(fieldsOf(result.outputs, form6251)?.line2g_pab_interest, 100);
});

Deno.test("box9 = 0 produces no form6251 output", () => {
  const result = compute([minimalItem({ box8: 200, box9: 0 })]);
  assertEquals(findOutput(result, "form6251"), undefined);
});

Deno.test("box10 (market discount) adds to schedule_b taxable_interest_net", () => {
  const result = compute([minimalItem({ box1: 100, box10: 50 })]);
  assertEquals(fieldsOf(result.outputs, schedule_b)?.taxable_interest_net, 150);
});

Deno.test("box11 (ABP) reduces schedule_b taxable_interest_net when election made", () => {
  const result = compute([minimalItem({ box1: 100, box11: 30, elect_bond_premium_amortization: true })]);
  assertEquals(fieldsOf(result.outputs, schedule_b)?.taxable_interest_net, 70);
});

Deno.test("box11 (ABP) does NOT reduce net without IRC §171 election", () => {
  const result = compute([minimalItem({ box1: 100, box11: 30 })]);
  assertEquals(fieldsOf(result.outputs, schedule_b)?.taxable_interest_net, 100);
});

Deno.test("box12 (ABP treasury) reduces schedule_b taxable_interest_net", () => {
  const result = compute([minimalItem({ box3: 100, box12: 20 })]);
  assertEquals(fieldsOf(result.outputs, schedule_b)?.taxable_interest_net, 80);
});

Deno.test("box13 (ABP tax-exempt) reduces f1040 line2a — net = box8 - box13", () => {
  const result = compute([minimalItem({ box8: 100, box13: 15 })]);
  assertEquals(fieldsOf(result.outputs, f1040)?.line2a_tax_exempt, 85);
});

Deno.test("box13 = box8: line2a is zero, no f1040 line2a output", () => {
  const result = compute([minimalItem({ box8: 100, box13: 100 })]);
  assertEquals(fieldsOf(result.outputs, f1040)?.line2a_tax_exempt, undefined);
});

// ---------------------------------------------------------------------------
// 3. Net Taxable Interest Calculation
// ---------------------------------------------------------------------------

Deno.test("nominee_interest reduces schedule_b taxable_interest_net", () => {
  const result = compute([minimalItem({ box1: 100, nominee_interest: 40 })]);
  assertEquals(fieldsOf(result.outputs, schedule_b)?.taxable_interest_net, 60);
});

Deno.test("accrued_interest_paid reduces schedule_b taxable_interest_net", () => {
  const result = compute([minimalItem({ box1: 100, accrued_interest_paid: 10 })]);
  assertEquals(fieldsOf(result.outputs, schedule_b)?.taxable_interest_net, 90);
});

Deno.test("non_taxable_oid_adjustment reduces schedule_b taxable_interest_net", () => {
  const result = compute([minimalItem({ box1: 100, non_taxable_oid_adjustment: 8 })]);
  assertEquals(fieldsOf(result.outputs, schedule_b)?.taxable_interest_net, 92);
});

Deno.test("combined reductions: box1 - box11 - nominee - accrued - oid adjustment (with election)", () => {
  // 200 - 20 - 15 - 10 - 5 = 150
  const result = compute([
    minimalItem({
      box1: 200,
      box11: 20,
      elect_bond_premium_amortization: true,
      nominee_interest: 15,
      accrued_interest_paid: 10,
      non_taxable_oid_adjustment: 5,
    }),
  ]);
  assertEquals(fieldsOf(result.outputs, schedule_b)?.taxable_interest_net, 150);
});

// ---------------------------------------------------------------------------
// 4. Aggregation — Multiple Payers
// ---------------------------------------------------------------------------

Deno.test("multiple payers — box1 produces one schedule_b output per payer", () => {
  const result = compute([
    minimalItem({ payer_name: "Bank A", box1: 100 }),
    minimalItem({ payer_name: "Bank B", box1: 150 }),
  ]);
  const sbOutputs = result.outputs.filter((o) => o.nodeType === "schedule_b");
  assertEquals(sbOutputs.length, 2);
  const total = sbOutputs.reduce(
    (sum, o) => sum + ((o.fields.taxable_interest_net as number) ?? 0),
    0,
  );
  assertEquals(total, 250);
});

Deno.test("multiple payers — box2 summed to single schedule1 output", () => {
  const result = compute([
    minimalItem({ payer_name: "Bank A", box2: 25 }),
    minimalItem({ payer_name: "Bank B", box2: 50 }),
  ]);
  assertEquals(fieldsOf(result.outputs, schedule1)?.line18_early_withdrawal, 75);
});

Deno.test("multiple payers — box3 included in each schedule_b net", () => {
  const result = compute([
    minimalItem({ payer_name: "Bank A", box3: 60 }),
    minimalItem({ payer_name: "Bank B", box3: 80 }),
  ]);
  const total = result.outputs
    .filter((o) => o.nodeType === "schedule_b")
    .reduce((sum, o) => sum + ((o.fields.taxable_interest_net as number) ?? 0), 0);
  assertEquals(total, 140);
});

Deno.test("multiple payers — box4 withholding summed to single f1040 output", () => {
  const result = compute([
    minimalItem({ payer_name: "Bank A", box4: 10 }),
    minimalItem({ payer_name: "Bank B", box4: 20 }),
  ]);
  assertEquals(fieldsOf(result.outputs, f1040)?.line25b_withheld_1099, 30);
});

Deno.test("multiple payers — box8 summed to single f1040 line2a output", () => {
  const result = compute([
    minimalItem({ payer_name: "Bank A", box8: 200 }),
    minimalItem({ payer_name: "Bank B", box8: 300 }),
  ]);
  assertEquals(fieldsOf(result.outputs, f1040)?.line2a_tax_exempt, 500);
});

Deno.test("multiple payers — box9 summed to single form6251 output", () => {
  const result = compute([
    minimalItem({ payer_name: "Bank A", box8: 100, box9: 50 }),
    minimalItem({ payer_name: "Bank B", box8: 100, box9: 75 }),
  ]);
  assertEquals(fieldsOf(result.outputs, form6251)?.line2g_pab_interest, 125);
});

Deno.test("multiple payers — box13 reductions accumulate across payers", () => {
  // Bank A: 100 - 10 = 90; Bank B: 100 - 15 = 85; combined f1040 line2a = 175
  const result = compute([
    minimalItem({ payer_name: "Bank A", box8: 100, box13: 10 }),
    minimalItem({ payer_name: "Bank B", box8: 100, box13: 15 }),
  ]);
  assertEquals(fieldsOf(result.outputs, f1040)?.line2a_tax_exempt, 175);
});

Deno.test("multiple payers — nominee_interest deductions reduce each schedule_b net", () => {
  const result = compute([
    minimalItem({ payer_name: "Bank A", box1: 100, nominee_interest: 25 }),
    minimalItem({ payer_name: "Bank B", box1: 100, nominee_interest: 40 }),
  ]);
  const total = result.outputs
    .filter((o) => o.nodeType === "schedule_b")
    .reduce((sum, o) => sum + ((o.fields.taxable_interest_net as number) ?? 0), 0);
  assertEquals(total, 135); // (100-25) + (100-40)
});

// ---------------------------------------------------------------------------
// 5. Foreign Tax Thresholds — Schedule 3 vs Form 1116
// ---------------------------------------------------------------------------

Deno.test("box6 exactly at $300 single threshold routes to schedule3", () => {
  const result = compute([minimalItem({ box1: 500, box6: 300 })]);
  assertEquals(fieldsOf(result.outputs, schedule3)?.line1_foreign_tax_1099, 300);
  assertEquals(findOutput(result, "form_1116"), undefined);
});

Deno.test("box6 above $300 single threshold routes to form_1116", () => {
  const result = compute([minimalItem({ box1: 500, box6: 350 })]);
  assertEquals(fieldsOf(result.outputs, form_1116)?.foreign_tax_paid, 350);
  assertEquals(findOutput(result, "schedule3"), undefined);
});

Deno.test("box6 exactly at $600 MFJ threshold routes to schedule3", () => {
  const result = compute([minimalItem({ box1: 1000, box6: 600 })], "mfj");
  assertEquals(fieldsOf(result.outputs, schedule3)?.line1_foreign_tax_1099, 600);
  assertEquals(findOutput(result, "form_1116"), undefined);
});

Deno.test("box6 above $600 MFJ threshold routes to form_1116", () => {
  const result = compute([minimalItem({ box1: 1000, box6: 650 })], "mfj");
  assertEquals(fieldsOf(result.outputs, form_1116)?.foreign_tax_paid, 650);
  assertEquals(findOutput(result, "schedule3"), undefined);
});

// ---------------------------------------------------------------------------
// 6. Informational / no-op fields
// ---------------------------------------------------------------------------

Deno.test("box5 (TCJA-suspended investment expenses) does not add output", () => {
  const without = compute([minimalItem({ box1: 100 })]);
  const withBox5 = compute([minimalItem({ box1: 100, box5: 100 })]);
  assertEquals(withBox5.outputs.length, without.outputs.length);
});

Deno.test("box14, box15, box16, box17 (state fields) do not add federal outputs", () => {
  const without = compute([minimalItem({ box1: 100 })]);
  const withState = compute([
    minimalItem({ box1: 100, box14: "CA", box15: "CA", box16: "94-123", box17: 50 }),
  ]);
  assertEquals(withState.outputs.length, without.outputs.length);
});

Deno.test("box7 (foreign country name string) does not change output count", () => {
  const without = compute([minimalItem({ box1: 100, box6: 50 })]);
  const withCountry = compute([minimalItem({ box1: 100, box6: 50, box7: "France" })]);
  assertEquals(withCountry.outputs.length, without.outputs.length);
});

// ---------------------------------------------------------------------------
// 7. Hard Validation Rules
// ---------------------------------------------------------------------------

Deno.test("hard block: box9 > box8 throws (box9 is a subset of box8)", () => {
  assertThrows(() => compute([minimalItem({ box8: 80, box9: 100 })]), Error);
});

Deno.test("hard block: box13 > box8 throws (bond premium on tax-exempt cannot exceed interest)", () => {
  assertThrows(() => compute([minimalItem({ box8: 50, box13: 100 })]), Error);
});

Deno.test("hard block: seller_financed + missing SSN throws", () => {
  assertThrows(
    () => compute([minimalItem({ seller_financed: true, payer_ssn: "" })]),
    Error,
  );
});

Deno.test("hard block: seller_financed + missing payer_address throws", () => {
  assertThrows(
    () => compute([minimalItem({ seller_financed: true, payer_address: "" })]),
    Error,
  );
});

// ---------------------------------------------------------------------------
// 8. Edge Cases
// ---------------------------------------------------------------------------

Deno.test("box4 backup withholding with zero box1 still routes to f1040 line25b", () => {
  const result = compute([minimalItem({ box1: 0, box4: 50 })]);
  assertEquals(fieldsOf(result.outputs, f1040)?.line25b_withheld_1099, 50);
});

Deno.test("box8 tax-exempt interest and box1 taxable interest route to different nodes", () => {
  const result = compute([minimalItem({ box1: 100, box8: 500 })]);
  assertEquals(fieldsOf(result.outputs, schedule_b)?.taxable_interest_net, 100);
  assertEquals(fieldsOf(result.outputs, f1040)?.line2a_tax_exempt, 500);
});

Deno.test("box10 = 0 does not change schedule_b net vs baseline", () => {
  const baseline = compute([minimalItem({ box1: 100 })]);
  const withZero = compute([minimalItem({ box1: 100, box10: 0 })]);
  assertEquals(
    fieldsOf(baseline.outputs, schedule_b)?.taxable_interest_net,
    fieldsOf(withZero.outputs, schedule_b)?.taxable_interest_net,
  );
});

// ---------------------------------------------------------------------------
// 9. Smoke Test
// ---------------------------------------------------------------------------

Deno.test("smoke: two payers with multiple boxes — all expected outputs present", () => {
  // Payer A: box1=500, box3=200, box4=75, box6=100, box8=300, box9=50 (box8>=50)
  // Payer B: box1=600, box2=25, box4=50, box6=150, box8=100, box9=100, box13=50
  // Filing status MFJ; total foreign tax = $250 (< $600 MFJ) → schedule3
  const result = compute(
    [
      {
        payer_name: "Payer A",
        box1: 500,
        box3: 200,
        box4: 75,
        box6: 100,
        box8: 300,
        box9: 50,
      },
      {
        payer_name: "Payer B",
        box1: 600,
        box2: 25,
        box4: 50,
        box6: 150,
        box8: 100,
        box9: 100,
        box13: 50,
      },
    ],
    "mfj",
  );

  // schedule_b: one entry per payer
  const sbOutputs = result.outputs.filter((o) => o.nodeType === "schedule_b");
  assertEquals(sbOutputs.length, 2, "two schedule_b outputs");

  // schedule1: Payer B box2 = $25
  assertEquals(
    fieldsOf(result.outputs, schedule1)?.line18_early_withdrawal,
    25,
    "schedule1 early withdrawal",
  );

  // f1040 withholding: 75 + 50 = 125
  assertEquals(
    fieldsOf(result.outputs, f1040)?.line25b_withheld_1099,
    125,
    "total withholding",
  );

  // schedule3: box6 $100 + $150 = $250 (MFJ, <= $600)
  assertEquals(
    fieldsOf(result.outputs, schedule3)?.line1_foreign_tax_1099,
    250,
    "foreign tax simplified",
  );
  assertEquals(findOutput(result, "form_1116"), undefined, "form_1116 absent");

  // form6251: box9 50 + 100 = 150
  assertEquals(
    fieldsOf(result.outputs, form6251)?.line2g_pab_interest,
    150,
    "AMT PAB interest",
  );

  // f1040 line2a: Payer A net = 300, Payer B net = 100 - 50 = 50, total = 350
  assertEquals(
    fieldsOf(result.outputs, f1040)?.line2a_tax_exempt,
    350,
    "tax-exempt interest",
  );
});
