import { assertEquals, assertThrows } from "@std/assert";
import { f1099int, inputSchema } from "./index.ts";
import { fieldsOf } from "../../../../../core/test-utils/output.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { form6251 } from "../../intermediate/forms/form6251/index.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import { schedule_b } from "../../intermediate/aggregation/schedule_b/index.ts";
import { form_1116 } from "../../intermediate/forms/form_1116/index.ts";
import { agi_aggregator } from "../../intermediate/aggregation/agi_aggregator/index.ts";
import type { SellerFinancedBuyer } from "../../../seller_financed_buyer.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type ItemOverrides = Partial<{
  payer_name: string;
  payer_tin: string;
  seller_financed: boolean;
  buyer_used_as_personal_residence: boolean;
  seller_financed_buyer: SellerFinancedBuyer;
  box1: number;
  investment_property_for_form4952: boolean;
  box2: number;
  box3: number;
  box4: number;
  box5: number;
  box6: number;
  box7: string;
  foreign_source_interest_usd: number;
  foreign_tax_irs_country_code: string;
  foreign_tax_source_document_reference: string;
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

const buyer: SellerFinancedBuyer = {
  address_type: "us",
  name: "Jane Buyer",
  ssn: "123456789",
  address_line1: "456 Oak Ave",
  city: "Austin",
  state: "TX",
  zip: "78701",
};

function taxedInterest(
  tax: number,
  foreignInterest: number,
  overrides: ItemOverrides = {},
): ItemOverrides {
  return minimalItem({
    box1: foreignInterest,
    box6: tax,
    box7: "France",
    foreign_source_interest_usd: foreignInterest,
    foreign_tax_irs_country_code: "FR",
    ...overrides,
  });
}

function compute(items: ItemOverrides[]) {
  return f1099int.compute(
    { taxYear: 2025, formType: "f1040" },
    inputSchema.parse({ f1099ints: items }),
  );
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

function interestNet(fields: unknown): number | undefined {
  return (fields as { interest_detail?: { net: number } } | undefined)
    ?.interest_detail?.net;
}

Deno.test("1099-INT routes adjusted investment-property interest to Form 4952 only when affirmed", () => {
  const ordinary = compute([minimalItem({ box1: 1_000 })]);
  assertEquals(findOutput(ordinary, "form4952"), undefined);
  const investment = compute([minimalItem({
    box1: 1_000,
    box11: 100,
    elect_bond_premium_amortization: true,
    investment_property_for_form4952: true,
  })]);
  assertEquals(
    findOutput(investment, "form4952")?.fields.source_1099_interest,
    900,
  );
});

Deno.test("1099-INT routes affirmed private-activity-bond interest to AMT Form 4952", () => {
  const result = compute([minimalItem({
    box8: 500,
    box9: 300,
    investment_property_for_form4952: true,
  })]);
  assertEquals(
    result.outputs.find((output) =>
      output.nodeType === "form4952" &&
      output.fields.source_private_activity_bond_interest === 300
    )?.fields.source_private_activity_bond_interest,
    300,
  );
});

Deno.test("1099-INT rejects adjustments larger than reported interest", () => {
  assertThrows(
    () =>
      compute([minimalItem({
        box1: 100,
        nominee_interest: 200,
        investment_property_for_form4952: true,
      })]),
    Error,
    "interest adjustments cannot exceed reported taxable interest",
  );
});

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

Deno.test("schema: seller financing requires the buyer-use answer", () => {
  assertThrows(
    () => compute([minimalItem({ seller_financed: true, box1: 100 })]),
    Error,
  );
});

Deno.test("schema: personal-residence seller financing requires buyer details", () => {
  assertThrows(() =>
    compute([minimalItem({
      seller_financed: true,
      buyer_used_as_personal_residence: true,
      box1: 100,
    })])
  );
});

Deno.test("schema: buyer-use answer requires seller financing", () => {
  assertThrows(() =>
    compute([minimalItem({
      buyer_used_as_personal_residence: false,
      box1: 100,
    })])
  );
});

Deno.test("schema: seller_financed with 8-digit SSN throws", () => {
  assertThrows(
    () =>
      compute([
        minimalItem({
          seller_financed: true,
          buyer_used_as_personal_residence: true,
          box1: 100,
          seller_financed_buyer: { ...buyer, ssn: "12345678" },
        }),
      ]),
    Error,
  );
});

Deno.test("schema: seller_financed requires a structured address", () => {
  assertThrows(
    () =>
      compute([
        minimalItem({
          seller_financed: true,
          buyer_used_as_personal_residence: true,
          box1: 100,
          seller_financed_buyer: { ...buyer, address_line1: "" },
        }),
      ]),
    Error,
  );
});

Deno.test("schema: seller_financed with all required fields is valid", () => {
  const result = compute([
    minimalItem({
      seller_financed: true,
      buyer_used_as_personal_residence: true,
      box1: 100,
      seller_financed_buyer: buyer,
    }),
  ]);
  assertEquals(Array.isArray(result.outputs), true);
  assertEquals(
    (fieldsOf(result.outputs, schedule_b)?.interest_detail as {
      seller_financed_buyer?: typeof buyer;
    })?.seller_financed_buyer,
    buyer,
  );
});

Deno.test("schema: seller-financed foreign buyer uses a complete foreign address", () => {
  const foreignBuyer: SellerFinancedBuyer = {
    address_type: "foreign",
    name: "Jane Buyer",
    ssn: "123456789",
    address_line1: "10 Queen St",
    city: "Toronto",
    province_or_state: "Ontario",
    country_code: "CA",
    foreign_postal_code: "M5H2N2",
  };
  const result = compute([minimalItem({
    seller_financed: true,
    buyer_used_as_personal_residence: true,
    seller_financed_buyer: foreignBuyer,
    box1: 900,
  })]);
  assertEquals(
    (fieldsOf(result.outputs, schedule_b)?.interest_detail as {
      seller_financed_buyer?: SellerFinancedBuyer;
    })?.seller_financed_buyer,
    foreignBuyer,
  );
  assertThrows(() =>
    compute([minimalItem({
      seller_financed: true,
      buyer_used_as_personal_residence: true,
      box1: 900,
      seller_financed_buyer: { ...foreignBuyer, country_code: "" },
    })])
  );
  assertThrows(() =>
    inputSchema.parse({
      f1099ints: [{
        payer_name: "Buyer mortgage",
        seller_financed: true,
        buyer_used_as_personal_residence: true,
        box1: 900,
        seller_financed_buyer: { ...foreignBuyer, state: "TX" },
      }],
    })
  );
});

// ---------------------------------------------------------------------------
// 2. Per-Box Routing
// ---------------------------------------------------------------------------

Deno.test("box1 routes to schedule_b with correct net taxable_interest", () => {
  const result = compute([minimalItem({ box1: 100 })]);
  assertEquals(interestNet(fieldsOf(result.outputs, schedule_b)), 100);
});

Deno.test("box1 = 0 routes to schedule_b with taxable_interest_net = 0", () => {
  const result = compute([minimalItem({ box1: 0 })]);
  assertEquals(interestNet(fieldsOf(result.outputs, schedule_b)), 0);
});

Deno.test("box2 routes to schedule1 line18_early_withdrawal", () => {
  const result = compute([minimalItem({ box2: 50 })]);
  assertEquals(
    fieldsOf(result.outputs, schedule1)?.line18_early_withdrawal,
    50,
  );
});

Deno.test("box2 = 0 produces no schedule1 output", () => {
  const result = compute([minimalItem({ box2: 0 })]);
  assertEquals(findOutput(result, "schedule1"), undefined);
});

Deno.test("box3 (US savings bond interest) adds to schedule_b taxable_interest_net", () => {
  const result = compute([minimalItem({ box3: 75 })]);
  assertEquals(interestNet(fieldsOf(result.outputs, schedule_b)), 75);
});

Deno.test("box3 + box1 both included in schedule_b taxable_interest_net", () => {
  const result = compute([minimalItem({ box1: 100, box3: 75 })]);
  assertEquals(interestNet(fieldsOf(result.outputs, schedule_b)), 175);
});

Deno.test("box4 routes to f1040 line25b_withheld_1099", () => {
  const result = compute([minimalItem({ box4: 25 })]);
  assertEquals(fieldsOf(result.outputs, f1040)?.line25b_withheld_1099, 25);
});

Deno.test("box4 = 0 produces no f1040 withholding output", () => {
  const result = compute([minimalItem({ box4: 0 })]);
  assertEquals(
    fieldsOf(result.outputs, f1040)?.line25b_withheld_1099,
    undefined,
  );
});

Deno.test("box6 below $300 still routes to Form 1116 without an election", () => {
  const result = compute([taxedInterest(200, 500)]);
  assertEquals(
    fieldsOf(result.outputs, form_1116)?.foreign_tax_items?.[0]
      .foreign_tax_paid,
    200,
  );
});

Deno.test("1099-INT foreign tax preserves its document reference for Form 1116", () => {
  const result = compute([taxedInterest(50, 1_000, {
    foreign_tax_source_document_reference: "Bank 1099-INT 2025",
  })]);
  assertEquals(
    fieldsOf(result.outputs, form_1116)?.foreign_tax_items?.[0]
      .foreign_income_source_document_reference,
    "Bank 1099-INT 2025",
  );
});

Deno.test("box6 = 0 produces no foreign tax output", () => {
  const result = compute([minimalItem({ box1: 500, box6: 0 })]);
  assertEquals(findOutput(result, "form_1116"), undefined);
});

Deno.test("box8 routes to f1040 line2a_tax_exempt (informational MAGI component)", () => {
  const result = compute([minimalItem({ box8: 300 })]);
  assertEquals(fieldsOf(result.outputs, f1040)?.line2a_tax_exempt, 300);
  assertEquals(
    fieldsOf(result.outputs, agi_aggregator)?.tax_exempt_interest,
    300,
  );
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
  assertEquals(interestNet(fieldsOf(result.outputs, schedule_b)), 150);
});

Deno.test("box11 (ABP) reduces schedule_b taxable_interest_net when election made", () => {
  const result = compute([
    minimalItem({
      box1: 100,
      box11: 30,
      elect_bond_premium_amortization: true,
    }),
  ]);
  assertEquals(interestNet(fieldsOf(result.outputs, schedule_b)), 70);
});

Deno.test("box11 (ABP) does NOT reduce net without IRC §171 election", () => {
  const result = compute([minimalItem({ box1: 100, box11: 30 })]);
  assertEquals(interestNet(fieldsOf(result.outputs, schedule_b)), 100);
});

Deno.test("box12 (ABP treasury) reduces schedule_b taxable_interest_net", () => {
  const result = compute([minimalItem({ box3: 100, box12: 20 })]);
  assertEquals(interestNet(fieldsOf(result.outputs, schedule_b)), 80);
});

Deno.test("box13 (ABP tax-exempt) reduces f1040 line2a — net = box8 - box13", () => {
  const result = compute([minimalItem({ box8: 100, box13: 15 })]);
  assertEquals(fieldsOf(result.outputs, f1040)?.line2a_tax_exempt, 85);
  assertEquals(
    fieldsOf(result.outputs, agi_aggregator)?.tax_exempt_interest,
    85,
  );
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
  assertEquals(interestNet(fieldsOf(result.outputs, schedule_b)), 60);
});

Deno.test("accrued_interest_paid reduces schedule_b taxable_interest_net", () => {
  const result = compute([
    minimalItem({ box1: 100, accrued_interest_paid: 10 }),
  ]);
  assertEquals(interestNet(fieldsOf(result.outputs, schedule_b)), 90);
});

Deno.test("non_taxable_oid_adjustment reduces schedule_b taxable_interest_net", () => {
  const result = compute([
    minimalItem({ box1: 100, non_taxable_oid_adjustment: 8 }),
  ]);
  assertEquals(interestNet(fieldsOf(result.outputs, schedule_b)), 92);
});

Deno.test("1099-INT keeps reported interest and adjustment categories for Schedule B", () => {
  const result = compute([minimalItem({
    payer_name: "Bond Bank",
    box1: 2_000,
    nominee_interest: 100,
    accrued_interest_paid: 50,
    non_taxable_oid_adjustment: 75,
    box11: 125,
    elect_bond_premium_amortization: true,
  })]);
  assertEquals(fieldsOf(result.outputs, schedule_b)?.interest_detail, {
    payer_name: "Bond Bank",
    gross: 2_000,
    net: 1_650,
    nominee: 100,
    accrued: 50,
    oid_adjustment: 75,
    bond_premium: 125,
  });
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
  assertEquals(interestNet(fieldsOf(result.outputs, schedule_b)), 150);
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
    (sum, o) => sum + (interestNet(o.fields) ?? 0),
    0,
  );
  assertEquals(total, 250);
});

Deno.test("multiple payers — box2 summed to single schedule1 output", () => {
  const result = compute([
    minimalItem({ payer_name: "Bank A", box2: 25 }),
    minimalItem({ payer_name: "Bank B", box2: 50 }),
  ]);
  assertEquals(
    fieldsOf(result.outputs, schedule1)?.line18_early_withdrawal,
    75,
  );
});

Deno.test("multiple payers — box3 included in each schedule_b net", () => {
  const result = compute([
    minimalItem({ payer_name: "Bank A", box3: 60 }),
    minimalItem({ payer_name: "Bank B", box3: 80 }),
  ]);
  const total = result.outputs
    .filter((o) => o.nodeType === "schedule_b")
    .reduce(
      (sum, o) => sum + (interestNet(o.fields) ?? 0),
      0,
    );
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
    .reduce(
      (sum, o) => sum + (interestNet(o.fields) ?? 0),
      0,
    );
  assertEquals(total, 135); // (100-25) + (100-40)
});

// ---------------------------------------------------------------------------
// 5. Foreign tax source facts for Form 1116
// ---------------------------------------------------------------------------

Deno.test("box6 at $300 still routes to Form 1116 without an election", () => {
  const result = compute([taxedInterest(300, 500)]);
  assertEquals(
    fieldsOf(result.outputs, form_1116)?.foreign_tax_items?.[0]
      .foreign_tax_paid,
    300,
  );
});

Deno.test("box6 above $300 routes to Form 1116", () => {
  const result = compute([taxedInterest(350, 500)]);
  assertEquals(
    fieldsOf(result.outputs, form_1116)?.foreign_tax_items?.[0]
      .foreign_tax_paid,
    350,
  );
});

Deno.test("box6 at $600 still routes to Form 1116 without an election", () => {
  const result = compute([taxedInterest(600, 1000)]);
  assertEquals(
    fieldsOf(result.outputs, form_1116)?.foreign_tax_items?.[0]
      .foreign_tax_paid,
    600,
  );
});

Deno.test("box6 above $600 routes to Form 1116", () => {
  const result = compute([taxedInterest(650, 1000)]);
  assertEquals(
    fieldsOf(result.outputs, form_1116)?.foreign_tax_items?.[0]
      .foreign_tax_paid,
    650,
  );
});

Deno.test("foreign tax cannot assume the whole 1099-INT box 1 is foreign source", () => {
  assertThrows(
    () => compute([minimalItem({ box1: 500, box6: 50 })]),
    Error,
    "verified foreign-source interest",
  );
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
    minimalItem({
      box1: 100,
      box14: "CA",
      box15: "CA",
      box16: "94-123",
      box17: 50,
    }),
  ]);
  assertEquals(withState.outputs.length, without.outputs.length);
});

Deno.test("box7 (foreign country name string) does not change output count", () => {
  const without = compute([taxedInterest(50, 100, { box7: undefined })]);
  const withCountry = compute([taxedInterest(50, 100)]);
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
    () =>
      compute([
        minimalItem({
          seller_financed: true,
          buyer_used_as_personal_residence: true,
          box1: 100,
          seller_financed_buyer: { ...buyer, ssn: "" },
        }),
      ]),
    Error,
  );
});

Deno.test("hard block: seller_financed + missing buyer address throws", () => {
  assertThrows(
    () =>
      compute([
        minimalItem({
          seller_financed: true,
          buyer_used_as_personal_residence: true,
          box1: 100,
          seller_financed_buyer: { ...buyer, city: "" },
        }),
      ]),
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
  assertEquals(interestNet(fieldsOf(result.outputs, schedule_b)), 100);
  assertEquals(fieldsOf(result.outputs, f1040)?.line2a_tax_exempt, 500);
});

Deno.test("box10 = 0 does not change schedule_b net vs baseline", () => {
  const baseline = compute([minimalItem({ box1: 100 })]);
  const withZero = compute([minimalItem({ box1: 100, box10: 0 })]);
  assertEquals(
    interestNet(fieldsOf(baseline.outputs, schedule_b)),
    interestNet(fieldsOf(withZero.outputs, schedule_b)),
  );
});

// ---------------------------------------------------------------------------
// 9. Smoke Test
// ---------------------------------------------------------------------------

Deno.test("smoke: two payers with multiple boxes — all expected outputs present", () => {
  // Payer A: box1=500, box3=200, box4=75, box6=100, box8=300, box9=50 (box8>=50)
  // Payer B: box1=600, box2=25, box4=50, box6=150, box8=100, box9=100, box13=50
  // Both payers have verified foreign-source interest; no shortcut election.
  const result = compute([
    {
      payer_name: "Payer A",
      box1: 500,
      box3: 200,
      box4: 75,
      box6: 100,
      foreign_source_interest_usd: 500,
      foreign_tax_irs_country_code: "CA",
      box8: 300,
      box9: 50,
    },
    {
      payer_name: "Payer B",
      box1: 600,
      box2: 25,
      box4: 50,
      box6: 150,
      foreign_source_interest_usd: 600,
      foreign_tax_irs_country_code: "FR",
      box8: 100,
      box9: 100,
      box13: 50,
    },
  ]);

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

  // Form 1116 retains both country-specific source records.
  assertEquals(
    fieldsOf(result.outputs, form_1116)?.foreign_tax_items?.map((item) =>
      item.foreign_tax_paid
    ),
    [100, 150],
    "foreign taxes by statement",
  );

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

// ---------------------------------------------------------------------------
// Foreign source income for the §904 limitation (Form 1116 Part I line 1a)
// ---------------------------------------------------------------------------

Deno.test("Form 1116 uses verified foreign-source interest, not the whole box 1", () => {
  const result = compute([taxedInterest(500, 600, { box1: 1000 })]);
  assertEquals(
    fieldsOf(result.outputs, form_1116)?.foreign_tax_items?.[0]
      .foreign_gross_income,
    600,
  );
});

Deno.test("Form 1116 carries 1099 tax kind, method, and country", () => {
  const result = compute([taxedInterest(500, 1000)]);
  assertEquals(
    fieldsOf(result.outputs, form_1116)?.foreign_tax_items?.[0]
      .foreign_gross_income,
    1000,
  );
  assertEquals(
    fieldsOf(result.outputs, form_1116)?.foreign_tax_items?.[0]
      .irs_country_code,
    "FR",
  );
  assertEquals(
    fieldsOf(result.outputs, form_1116)?.foreign_tax_items?.[0]
      .tax_reported_on_1099,
    true,
  );
});

Deno.test("only payers that withheld foreign tax contribute foreign_income", () => {
  const result = compute([
    taxedInterest(500, 1000, { payer_name: "FOREIGN BANK" }),
    minimalItem({ payer_name: "DOMESTIC BANK", box1: 4000 }),
  ]);
  assertEquals(
    fieldsOf(result.outputs, form_1116)?.foreign_tax_items?.[0]
      .foreign_tax_paid,
    500,
  );
  assertEquals(
    fieldsOf(result.outputs, form_1116)?.foreign_tax_items?.[0]
      .foreign_gross_income,
    1000,
  );
});
