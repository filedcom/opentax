import { assertEquals, assertThrows } from "@std/assert";
import { form6251, inputSchema } from "./index.ts";
import { fieldsOf } from "../../../../../../core/test-utils/output.ts";
import { schedule2 } from "../../aggregation/schedule2/index.ts";

function compute(input: Record<string, unknown>) {
  return form6251.compute({ taxYear: 2025, formType: "f1040" }, inputSchema.parse(input));
}

// ─── No AMT owed (AMT < regular tax) ─────────────────────────────────────────

Deno.test("form6251: no output when AMT is less than regular tax", () => {
  // Single filer, modest AMTI — regular tax exceeds tentative minimum tax
  // AMTI = $80,000; exemption = $88,100 → AMTI fully exempt → line6 = $0
  // TMT = $0 → AMT = max(0, 0 − regular_tax) = 0
  const result = compute({
    filing_status: "single",
    regular_tax_income: 80_000,
    regular_tax: 10_000,
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("form6251: no output when tentative minimum tax equals regular tax", () => {
  // Single: AMTI = $200,000; exemption = $88,100; line6 = $111,900
  // TMT = floor($111,900 × 0.26) = $29,094; regular_tax = $29,094
  const result = compute({
    filing_status: "single",
    regular_tax_income: 200_000,
    regular_tax: 29_094,
  });
  assertEquals(result.outputs.length, 0);
});

// ─── AMT owed calculation ─────────────────────────────────────────────────────

Deno.test("form6251: AMT owed routes to schedule2 line1_amt", () => {
  // Single: AMTI = $200,000; exemption = $88,100; line6 = $111,900
  // TMT = floor($111,900 × 0.26) = $29,094; regular_tax = $15,000
  // AMT = $29,094 − $15,000 = $14,094
  const result = compute({
    filing_status: "single",
    regular_tax_income: 200_000,
    regular_tax: 15_000,
  });
  assertEquals(fieldsOf(result.outputs, schedule2)!.line1_amt, 14_094);
});

Deno.test("form6251: AMT owed with ISO adjustment", () => {
  // Single: regular income $150,000, ISO adjustment $100,000
  // AMTI = $250,000; exemption = $88,100; line6 = $161,900
  // TMT = floor($161,900 × 0.26) = $42,094; regular_tax = $25,000
  // AMT = $42,094 − $25,000 = $17,094
  const result = compute({
    filing_status: "single",
    regular_tax_income: 150_000,
    iso_adjustment: 100_000,
    regular_tax: 25_000,
  });
  assertEquals(fieldsOf(result.outputs, schedule2)!.line1_amt, 17_094);
});

Deno.test("form6251: AMT owed with depreciation adjustment", () => {
  // Single: regular income $200,000, depreciation adjustment $50,000
  // AMTI = $250,000; exemption = $88,100; line6 = $161,900
  // TMT = floor($161,900 × 0.26) = $42,094; regular_tax = $30,000
  // AMT = $42,094 − $30,000 = $12,094
  const result = compute({
    filing_status: "single",
    regular_tax_income: 200_000,
    depreciation_adjustment: 50_000,
    regular_tax: 30_000,
  });
  assertEquals(fieldsOf(result.outputs, schedule2)!.line1_amt, 12_094);
});

// ─── Exemption phase-out ──────────────────────────────────────────────────────

Deno.test("form6251: exemption phases out for high-AMTI single filer", () => {
  // Single: AMTI = $700,000
  // Phase-out start = $626,350; excess = $73,650
  // Reduction = floor(0.25 × $73,650) = floor($18,412.50) = $18,412
  // Exemption = max(0, $88,100 − $18,412) = $69,688
  // Line 6 = $700,000 − $69,688 = $630,312
  // $630,312 > $239,100 → TMT = floor($630,312 × 0.28 − $4,782)
  //   = floor($176,487.36 − $4,782) = floor($171,705.36) = $171,705
  // AMT = $171,705 − $100,000 = $71,705
  const result = compute({
    filing_status: "single",
    regular_tax_income: 700_000,
    regular_tax: 100_000,
  });
  assertEquals(fieldsOf(result.outputs, schedule2)!.line1_amt, 71_705);
});

Deno.test("form6251: exemption is zero when AMTI exceeds complete phase-out threshold", () => {
  // Single: zero-exemption threshold = $626,350 + 4 × $88,100 = $978,750
  // AMTI = $1,000,000 → exemption = $0 → line6 = $1,000,000
  // TMT = floor($1,000,000 × 0.28 − $4,782) = floor($275,218) = $275,218
  // AMT = $275,218 − $150,000 = $125,218
  const result = compute({
    filing_status: "single",
    regular_tax_income: 1_000_000,
    regular_tax: 150_000,
  });
  assertEquals(fieldsOf(result.outputs, schedule2)!.line1_amt, 125_218);
});

// ─── 26% bracket vs 28% bracket ──────────────────────────────────────────────

Deno.test("form6251: 26% rate applies when taxable excess is at or below $239,100 (single)", () => {
  // Single: AMTI = $300,000; exemption = $88,100; line6 = $211,900
  // $211,900 ≤ $239,100 → TMT = floor($211,900 × 0.26) = $55,094
  // regular_tax = $40,000 → AMT = $15,094
  const result = compute({
    filing_status: "single",
    regular_tax_income: 300_000,
    regular_tax: 40_000,
  });
  assertEquals(fieldsOf(result.outputs, schedule2)!.line1_amt, 15_094);
});

Deno.test("form6251: 28% rate applies when taxable excess exceeds $239,100 (single)", () => {
  // Single: AMTI = $400,000; exemption = $88,100; line6 = $311,900
  // $311,900 > $239,100 → TMT = floor($311,900 × 0.28 − $4,782)
  //   = floor($87,332 − $4,782) = floor($82,550) = $82,550
  // regular_tax = $60,000 → AMT = $22,550
  const result = compute({
    filing_status: "single",
    regular_tax_income: 400_000,
    regular_tax: 60_000,
  });
  assertEquals(fieldsOf(result.outputs, schedule2)!.line1_amt, 22_550);
});

// ─── Filing status differences ────────────────────────────────────────────────

Deno.test("form6251: MFJ exemption $137,000 (vs single $88,100)", () => {
  // MFJ: AMTI = $300,000; exemption = $137,000; line6 = $163,000
  // TMT = floor($163,000 × 0.26) = $42,380; regular_tax = $30,000
  // AMT = $12,380
  const result = compute({
    filing_status: "mfj",
    regular_tax_income: 300_000,
    regular_tax: 30_000,
  });
  assertEquals(fieldsOf(result.outputs, schedule2)!.line1_amt, 12_380);
});

Deno.test("form6251: MFS has halved rate bracket threshold ($119,550 vs $239,100)", () => {
  // MFS: AMTI = $300,000; exemption = $68,500; line6 = $231,500
  // $231,500 > $119,550 → TMT = floor($231,500 × 0.28 − $2,391)
  //   = floor($64,820 − $2,391) = floor($62,429) = $62,429
  // regular_tax = $40,000 → AMT = $22,429
  const result = compute({
    filing_status: "mfs",
    regular_tax_income: 300_000,
    regular_tax: 40_000,
  });
  assertEquals(fieldsOf(result.outputs, schedule2)!.line1_amt, 22_429);
});

Deno.test("form6251: HOH uses same exemption as single ($88,100)", () => {
  // HOH: AMTI = $200,000; exemption = $88,100; line6 = $111,900
  // TMT = floor($111,900 × 0.26) = $29,094; regular_tax = $15,000
  // AMT = $14,094
  const result = compute({
    filing_status: "hoh",
    regular_tax_income: 200_000,
    regular_tax: 15_000,
  });
  assertEquals(fieldsOf(result.outputs, schedule2)!.line1_amt, 14_094);
});

Deno.test("form6251: QSS uses MFJ exemption amounts ($137,000)", () => {
  // QSS: AMTI = $300,000; exemption = $137,000; line6 = $163,000
  // TMT = floor($163,000 × 0.26) = $42,380; regular_tax = $30,000
  // AMT = $12,380
  const result = compute({
    filing_status: "qss",
    regular_tax_income: 300_000,
    regular_tax: 30_000,
  });
  assertEquals(fieldsOf(result.outputs, schedule2)!.line1_amt, 12_380);
});

// ─── AMTFTC reduces AMT ───────────────────────────────────────────────────────

Deno.test("form6251: AMTFTC reduces tentative minimum tax", () => {
  // Single: AMTI = $200,000; exemption = $88,100; line6 = $111,900
  // TMT = $29,094; amtftc = $5,000
  // Line 9 = $29,094 − $5,000 = $24,094; regular_tax = $10,000
  // AMT = $14,094
  const result = compute({
    filing_status: "single",
    regular_tax_income: 200_000,
    regular_tax: 10_000,
    amtftc: 5_000,
  });
  assertEquals(fieldsOf(result.outputs, schedule2)!.line1_amt, 14_094);
});

Deno.test("form6251: no output when AMTFTC fully offsets tentative minimum tax", () => {
  // Single: TMT = $29,094; amtftc = $29,094; line9 = $0 → AMT = 0
  const result = compute({
    filing_status: "single",
    regular_tax_income: 200_000,
    regular_tax: 10_000,
    amtftc: 29_094,
  });
  assertEquals(result.outputs.length, 0);
});

// ─── Other adjustment fields ──────────────────────────────────────────────────

Deno.test("form6251: private activity bond interest increases AMTI", () => {
  // Single: regular income $200,000, PAB interest $20,000
  // AMTI = $220,000; exemption = $88,100; line6 = $131,900
  // TMT = floor($131,900 × 0.26) = $34,294; regular_tax = $15,000
  // AMT = $19,294
  const result = compute({
    filing_status: "single",
    regular_tax_income: 200_000,
    private_activity_bond_interest: 20_000,
    regular_tax: 15_000,
  });
  assertEquals(fieldsOf(result.outputs, schedule2)!.line1_amt, 19_294);
});

Deno.test("form6251: NOL adjustment (negative) reduces AMTI", () => {
  // Single: regular income $300,000, NOL adjustment −$50,000 (ATNOLD)
  // AMTI = $250,000; exemption = $88,100; line6 = $161,900
  // TMT = floor($161,900 × 0.26) = $42,094; regular_tax = $20,000
  // AMT = $22,094
  const result = compute({
    filing_status: "single",
    regular_tax_income: 300_000,
    nol_adjustment: -50_000,
    regular_tax: 20_000,
  });
  assertEquals(fieldsOf(result.outputs, schedule2)!.line1_amt, 22_094);
});

Deno.test("form6251: other_adjustments field is included in AMTI", () => {
  // Single: regular income $200,000, other_adjustments $30,000
  // AMTI = $230,000; exemption = $88,100; line6 = $141,900
  // TMT = floor($141,900 × 0.26) = $36,894; regular_tax = $20,000
  // AMT = $16,894
  const result = compute({
    filing_status: "single",
    regular_tax_income: 200_000,
    other_adjustments: 30_000,
    regular_tax: 20_000,
  });
  assertEquals(fieldsOf(result.outputs, schedule2)!.line1_amt, 16_894);
});

// ─── Input validation ─────────────────────────────────────────────────────────

Deno.test("form6251: throws on invalid filing_status", () => {
  assertThrows(() => {
    compute({
      filing_status: "invalid",
      regular_tax_income: 200_000,
      regular_tax: 15_000,
    });
  });
});

Deno.test("form6251: throws on negative regular_tax_income", () => {
  assertThrows(() => {
    compute({
      filing_status: "single",
      regular_tax_income: -1,
      regular_tax: 0,
    });
  });
});

Deno.test("form6251: throws on negative regular_tax", () => {
  assertThrows(() => {
    compute({
      filing_status: "single",
      regular_tax_income: 200_000,
      regular_tax: -1,
    });
  });
});

// ─── Output routing ───────────────────────────────────────────────────────────

Deno.test("form6251: line2g_pab_interest alias produces same AMTI as private_activity_bond_interest", () => {
  // Both fields represent line 2g — only the larger should count (no double-count).
  const via_primary = compute({
    filing_status: "single",
    regular_tax_income: 200_000,
    private_activity_bond_interest: 20_000,
    regular_tax: 15_000,
  });
  const via_alias = compute({
    filing_status: "single",
    regular_tax_income: 200_000,
    line2g_pab_interest: 20_000,
    regular_tax: 15_000,
  });
  assertEquals(
    fieldsOf(via_primary.outputs, schedule2)!.line1_amt,
    fieldsOf(via_alias.outputs, schedule2)!.line1_amt,
  );
});

Deno.test("form6251: both PAB fields set to same value — no double-count", () => {
  // Setting both to 20_000 should produce same result as setting either alone.
  const result = compute({
    filing_status: "single",
    regular_tax_income: 200_000,
    private_activity_bond_interest: 20_000,
    line2g_pab_interest: 20_000,
    regular_tax: 15_000,
  });
  assertEquals(fieldsOf(result.outputs, schedule2)!.line1_amt, 19_294);
});

Deno.test("form6251: routes exactly one output to schedule2", () => {
  // Single: AMTI = $250,000; exemption = $88,100; line6 = $161,900
  // TMT = $42,094; regular_tax = $20,000; AMT = $22,094
  const result = compute({
    filing_status: "single",
    regular_tax_income: 250_000,
    regular_tax: 20_000,
  });
  assertEquals(result.outputs.length, 1);
  assertEquals(result.outputs[0].nodeType, "schedule2");
  assertEquals(fieldsOf(result.outputs, schedule2)!.line1_amt, 22_094);
});
