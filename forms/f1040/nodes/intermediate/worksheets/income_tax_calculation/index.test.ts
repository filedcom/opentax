import { assertAlmostEquals, assertEquals } from "@std/assert";
import { assertThrows } from "@std/assert";
import { income_tax_calculation, inputSchema } from "./index.ts";
import { f1040 } from "../../../outputs/f1040/index.ts";
import { form6251 } from "../../forms/form6251/index.ts";
import { form_1116 } from "../../forms/form_1116/index.ts";
import { fieldsOf } from "../../../../../../core/test-utils/output.ts";
import { FilingStatus } from "../../../types.ts";

function compute(input: Record<string, unknown>) {
  return income_tax_calculation.compute(
    { taxYear: 2025, formType: "f1040" },
    inputSchema.parse({
      form6251_line1b: input.taxable_income,
      form6251_line2a: 0,
      ...input,
    }),
  );
}

function f1040Fields(result: ReturnType<typeof compute>) {
  return fieldsOf(result.outputs, f1040);
}

function f6251Fields(result: ReturnType<typeof compute>) {
  return fieldsOf(result.outputs, form6251);
}

// ─── Smoke Tests ─────────────────────────────────────────────────────────────

Deno.test("smoke — missing required fields throws", () => {
  assertThrows(() => inputSchema.parse({}));
});

Deno.test("zero taxable income still sends Form 6251 its AMT base", () => {
  const result = compute({
    taxable_income: 0,
    filing_status: FilingStatus.Single,
  });
  assertEquals(f6251Fields(result)?.regular_tax_income, 0);
  assertEquals(f1040Fields(result)?.line16_income_tax, 0);
  assertEquals(result.outputs.length, 4);
});

Deno.test("Form 8814 tax remains on line 16 even with zero parent taxable income", () => {
  const result = compute({
    taxable_income: 0,
    filing_status: FilingStatus.Single,
    form8814_tax: 135,
  });
  assertEquals(f1040Fields(result)?.line16_income_tax, 135);
  assertEquals(f6251Fields(result)?.regular_tax, 135);
});

// ─── Bracket Computation ─────────────────────────────────────────────────────

Deno.test("Single — $50,000 taxable income (22% bracket)", () => {
  // Tax = $5,578.50 + ($50,000 − $48,475) × 22% = $5,578.50 + $335.50 = $5,914.00
  const result = compute({
    taxable_income: 50_000,
    filing_status: FilingStatus.Single,
  });
  assertAlmostEquals(
    f1040Fields(result)?.line16_income_tax as number,
    5_914,
    1,
  );
});

Deno.test("MFJ — $100,000 taxable income (22% bracket)", () => {
  // Tax = $11,157 + ($100,000 − $96,950) × 22% = $11,157 + $671 = $11,828
  const result = compute({
    taxable_income: 100_000,
    filing_status: FilingStatus.MFJ,
  });
  assertAlmostEquals(
    f1040Fields(result)?.line16_income_tax as number,
    11_828,
    1,
  );
});

Deno.test("MFS — $50,000 taxable income (22% bracket)", () => {
  // MFS lower brackets match Single at this income: $5,914
  const result = compute({
    taxable_income: 50_000,
    filing_status: FilingStatus.MFS,
  });
  assertAlmostEquals(
    f1040Fields(result)?.line16_income_tax as number,
    5_914,
    1,
  );
});

Deno.test("HOH — $70,000 taxable income (22% bracket)", () => {
  // Tax = $7,442 + ($70,000 − $64,850) × 22% = $7,442 + $1,133 = $8,575
  const result = compute({
    taxable_income: 70_000,
    filing_status: FilingStatus.HOH,
  });
  assertAlmostEquals(
    f1040Fields(result)?.line16_income_tax as number,
    8_575,
    1,
  );
});

Deno.test("QSS — $100,000 uses MFJ brackets", () => {
  // QSS = MFJ brackets → same as MFJ at $100,000 = $11,828
  const result = compute({
    taxable_income: 100_000,
    filing_status: FilingStatus.QSS,
  });
  assertAlmostEquals(
    f1040Fields(result)?.line16_income_tax as number,
    11_828,
    1,
  );
});

// ─── Bracket Boundaries ───────────────────────────────────────────────────────

Deno.test("Single — at 10% ceiling ($11,925) → 10% only", () => {
  // Tax = $11,925 × 10% = $1,192.50
  const result = compute({
    taxable_income: 11_925,
    filing_status: FilingStatus.Single,
  });
  assertAlmostEquals(
    f1040Fields(result)?.line16_income_tax as number,
    1_192.50,
    1,
  );
});

Deno.test("Single — $1 into 12% bracket ($11,926)", () => {
  // Tax = $1,192.50 + $1 × 12% = $1,192.62
  const result = compute({
    taxable_income: 11_926,
    filing_status: FilingStatus.Single,
  });
  assertAlmostEquals(
    f1040Fields(result)?.line16_income_tax as number,
    1_192.62,
    0.5,
  );
});

// ─── High Income ──────────────────────────────────────────────────────────────

Deno.test("Single — $700,000 (37% bracket)", () => {
  // Tax = $188,769.75 + ($700,000 − $626,350) × 37%
  // = $188,769.75 + $27,250.50 = $216,020.25
  const result = compute({
    taxable_income: 700_000,
    filing_status: FilingStatus.Single,
  });
  assertAlmostEquals(
    f1040Fields(result)?.line16_income_tax as number,
    216_020.25,
    1,
  );
});

Deno.test("MFS — $400,000 (37% bracket, MFS-specific split at $375,800)", () => {
  // Tax = $101,077.25 + ($400,000 − $375,800) × 37%
  // = $101,077.25 + $8,954 = $110,031.25
  const result = compute({
    taxable_income: 400_000,
    filing_status: FilingStatus.MFS,
  });
  assertAlmostEquals(
    f1040Fields(result)?.line16_income_tax as number,
    110_031.25,
    1,
  );
});

Deno.test("HOH — $650,000 (37% bracket)", () => {
  // Tax = $187,031.50 + ($650,000 − $626,350) × 37%
  // = $187,031.50 + $8,750.50 = $195,782.00
  const result = compute({
    taxable_income: 650_000,
    filing_status: FilingStatus.HOH,
  });
  assertAlmostEquals(
    f1040Fields(result)?.line16_income_tax as number,
    195_782,
    1,
  );
});

// ─── Output Routing ───────────────────────────────────────────────────────────

Deno.test("routes line16_income_tax to f1040", () => {
  // $50k Single → $5,914 (same as bracket test above)
  const result = compute({
    taxable_income: 50_000,
    filing_status: FilingStatus.Single,
  });
  const fields = f1040Fields(result);
  assertEquals(typeof fields?.line16_income_tax, "number");
  assertEquals(Math.round(fields!.line16_income_tax as number), 5_914);
});

Deno.test("routes regular_tax, regular_tax_income, filing_status to form6251", () => {
  const result = compute({
    taxable_income: 50_000,
    filing_status: FilingStatus.Single,
  });
  const fields = f6251Fields(result)!;
  assertAlmostEquals(fields.regular_tax as number, 5_914, 1);
  assertEquals(fields.regular_tax_income, 50_000);
  assertEquals(fields.filing_status, FilingStatus.Single);
});

Deno.test("tax amounts agree between f1040 and form6251 outputs", () => {
  const result = compute({
    taxable_income: 100_000,
    filing_status: FilingStatus.MFJ,
  });
  assertEquals(
    f1040Fields(result)?.line16_income_tax,
    f6251Fields(result)?.regular_tax,
  );
});

// ─── Small Income ─────────────────────────────────────────────────────────────

Deno.test("$1 taxable income — 10% bracket", () => {
  const result = compute({
    taxable_income: 1,
    filing_status: FilingStatus.Single,
  });
  assertAlmostEquals(
    f1040Fields(result)?.line16_income_tax as number,
    0.10,
    0.01,
  );
});

// ─── Unknown Tax Year ─────────────────────────────────────────────────────────

Deno.test("unknown tax year throws with year in message", () => {
  assertThrows(
    () =>
      income_tax_calculation.compute(
        { taxYear: 9999, formType: "f1040" },
        inputSchema.parse({
          taxable_income: 50_000,
          form6251_line1b: 50_000,
          form6251_line2a: 0,
          filing_status: FilingStatus.Single,
        }),
      ),
    Error,
    "No f1040 config for year 9999",
  );
});

// ─── QDCGT Worksheet — preferential rates ────────────────────────────────────
// Rev. Proc. 2024-40, §3.02; IRC §1(h)

Deno.test("QDCGT: qualified dividends entirely in 0% bracket (Single, low income)", () => {
  // AGI below zero_ceiling ($48,350): all qual divs taxed at 0%
  // taxable_income = $40,000, qual_div = $5,000
  // ordinary = $35,000; in_zero = min($40k, $48,350) - $35k = $5k; pref_tax = 0
  // ordinary_tax = $1,192.50 + ($35,000 - $11,925) × 12% = $1,192.50 + $2,769 = $3,961.50
  const result = compute({
    taxable_income: 40_000,
    filing_status: FilingStatus.Single,
    qualified_dividends: 5_000,
  });
  assertAlmostEquals(
    f1040Fields(result)?.line16_income_tax as number,
    3_961.50,
    1,
  );
});

Deno.test("QDCGT: qualified dividends in 15% bracket (Single, mid income)", () => {
  // taxable_income = $100,000, qual_div = $10,000
  // ordinary = $90,000; in_zero = max(0, $48,350 - $90,000) = 0; all $10k in 15%
  // pref_tax = $10,000 × 15% = $1,500
  // ordinary_tax = $5,578.50 + ($90,000 - $48,475) × 22% = $5,578.50 + $9,135.50 = $14,714
  // total = $16,214
  const result = compute({
    taxable_income: 100_000,
    filing_status: FilingStatus.Single,
    qualified_dividends: 10_000,
  });
  assertAlmostEquals(
    f1040Fields(result)?.line16_income_tax as number,
    16_214,
    1,
  );
});

Deno.test("QDCGT: LTCG split across 15% and 20% brackets (Single, high income)", () => {
  // taxable_income = $600,000, net_capital_gain = $100,000
  // ordinary = $500,000; in_zero = 0
  // avail_fifteen = $533,400 - max($500,000, $48,350) = $33,400
  // in_fifteen = $33,400; in_twenty = $66,600
  // pref_tax = $33,400 × 0.15 + $66,600 × 0.20 = $5,010 + $13,320 = $18,330
  // ordinary_tax = $57,231 + ($500,000 - $250,525) × 35% = $57,231 + $87,316.25 = $144,547.25
  // total = $162,877.25
  const result = compute({
    taxable_income: 600_000,
    filing_status: FilingStatus.Single,
    net_capital_gain: 100_000,
  });
  assertAlmostEquals(
    f1040Fields(result)?.line16_income_tax as number,
    162_877.25,
    1,
  );
});

Deno.test("QDCGT: MFJ qualified dividends in 0% bracket", () => {
  // MFJ zero_ceiling = $96,700; taxable_income = $80,000, qual_div = $5,000
  // ordinary = $75,000; in_zero = min($80k, $96,700) - $75k = $5k; all in 0%
  // pref_tax = 0
  // ordinary_tax = $11,157 + ($75,000 - $96,950) × ... wait, $75k < $96,950 → 22% bracket
  // ordinary_tax = $2,385 + ($75,000 - $23,850) × 12% = $2,385 + $6,138 = $8,523
  const result = compute({
    taxable_income: 80_000,
    filing_status: FilingStatus.MFJ,
    qualified_dividends: 5_000,
  });
  assertAlmostEquals(
    f1040Fields(result)?.line16_income_tax as number,
    8_523,
    1,
  );
});

Deno.test("QDCGT: no qual div or LTCG — falls back to regular brackets", () => {
  // Same as existing bracket tests
  const result = compute({
    taxable_income: 50_000,
    filing_status: FilingStatus.Single,
  });
  assertAlmostEquals(
    f1040Fields(result)?.line16_income_tax as number,
    5_914,
    1,
  );
});

Deno.test("QDCGT: zero qualified dividends — no QDCGT applied", () => {
  const result = compute({
    taxable_income: 50_000,
    filing_status: FilingStatus.Single,
    qualified_dividends: 0,
  });
  assertAlmostEquals(
    f1040Fields(result)?.line16_income_tax as number,
    5_914,
    1,
  );
});

Deno.test("QDCGT: QDCGT tax is always ≤ regular bracket tax (invariant)", () => {
  // For any combination of qual div + LTCG, the QDCGT worksheet should never
  // produce MORE tax than the regular brackets.
  const cases = [
    { ti: 50_000, qd: 5_000, cg: 0 },
    { ti: 100_000, qd: 10_000, cg: 5_000 },
    { ti: 200_000, qd: 20_000, cg: 30_000 },
    { ti: 600_000, qd: 0, cg: 100_000 },
  ];
  for (const { ti, qd, cg } of cases) {
    const withQdcgt = compute({
      taxable_income: ti,
      filing_status: FilingStatus.Single,
      qualified_dividends: qd,
      net_capital_gain: cg,
    });
    const withoutQdcgt = compute({
      taxable_income: ti,
      filing_status: FilingStatus.Single,
    });
    const qdcgtTax = f1040Fields(withQdcgt)!.line16_income_tax as number;
    const regularTax = f1040Fields(withoutQdcgt)!.line16_income_tax as number;
    assertEquals(
      qdcgtTax <= regularTax + 0.01,
      true,
      `QDCGT ($${qdcgtTax}) exceeds regular ($${regularTax}) for ti=${ti} qd=${qd} cg=${cg}`,
    );
  }
});

Deno.test("QDCGT: Form 6251 line 10 receives Form 1040 line 16 tax", () => {
  const result = compute({
    taxable_income: 100_000,
    filing_status: FilingStatus.Single,
    qualified_dividends: 10_000,
  });
  const f1040Tax = f1040Fields(result)!.line16_income_tax as number;
  const f6251Tax = f6251Fields(result)!.regular_tax as number;
  assertAlmostEquals(f1040Tax, 16_214, 1); // QDCGT-reduced (qual divs at 15%)
  assertEquals(f6251Tax, f1040Tax);
});

Deno.test("Schedule D worksheet: 25% and 28% gains use line 21 ordinary-rate cap", () => {
  const result = compute({
    taxable_income: 200_000,
    filing_status: FilingStatus.Single,
    qualified_dividends: 1_000,
    net_capital_gain: 50_000,
    unrecaptured_1250_gain: 10_000,
    rate_28_gain: 5_000,
  });
  // Schedule D Tax Worksheet line 21 = 164,000, taxed at ordinary rates
  // (32,207); line 30 = 36,000 at 15% (5,400).
  assertEquals(f1040Fields(result)?.line16_income_tax, 37_607);
  assertEquals(f6251Fields(result)?.regular_tax, 37_607);
  assertEquals(f6251Fields(result)?.unrecaptured_1250_gain, 10_000);
  assertEquals(f6251Fields(result)?.rate_28_gain, 5_000);
});

Deno.test("Form 4952 election taxes elected qualified dividends at ordinary rates", () => {
  const source = {
    taxable_income: 40_000,
    filing_status: FilingStatus.Single,
    qualified_dividends: 1_000,
  };
  const withoutElection = f1040Fields(compute(source))
    ?.line16_income_tax as number;
  const elected = compute({
    ...source,
    form4952_election: 1_000,
    form4952_elected_capital_gain: 0,
    form4952_amt_election: 1_000,
    form4952_amt_elected_capital_gain: 0,
  });
  assertAlmostEquals(
    (f1040Fields(elected)?.line16_income_tax as number) - withoutElection,
    120,
    0.01,
  );
  assertEquals(f6251Fields(elected)?.form4952_amt_election, 1_000);
});

Deno.test("Form 4952 elected gain leaves Form 1040 capital gain unchanged but changes its rate", () => {
  const source = {
    taxable_income: 100_000,
    filing_status: FilingStatus.Single,
    net_capital_gain: 5_000,
  };
  const withoutElection = f1040Fields(compute(source))
    ?.line16_income_tax as number;
  const elected = compute({
    ...source,
    form4952_election: 2_000,
    form4952_elected_capital_gain: 2_000,
    form4952_amt_election: 2_000,
    form4952_amt_elected_capital_gain: 2_000,
  });
  assertAlmostEquals(
    (f1040Fields(elected)?.line16_income_tax as number) - withoutElection,
    140,
    0.01,
  );
  assertEquals(f6251Fields(elected)?.form4952_amt_elected_capital_gain, 2_000);
});

Deno.test("Form 6251 receives signed line 1b even when Form 1040 line 15 is zero", () => {
  const result = compute({
    taxable_income: 0,
    form6251_line1b: -12_000,
    filing_status: FilingStatus.Single,
  });
  assertEquals(f6251Fields(result)?.regular_tax_income, -12_000);
  assertEquals(f6251Fields(result)?.regular_tax, 0);
});

Deno.test("QDCGT: qualified dividends exceeding taxable income capped at taxable income", () => {
  // If somehow qual_div > taxable_income, pref_income is capped
  const result = compute({
    taxable_income: 5_000,
    filing_status: FilingStatus.Single,
    qualified_dividends: 10_000,
  });
  // pref_income = min(10_000, 5_000) = 5_000; ordinary = 0; all in 0%
  // ordinary_tax = 0; pref_tax = 0
  assertAlmostEquals(f1040Fields(result)?.line16_income_tax as number, 0, 1);
});

Deno.test("QDCGT: HOH filing status uses HOH thresholds", () => {
  // HOH zero_ceiling = $64,750; taxable_income = $60,000, qual_div = $3,000
  // ordinary = $57,000; in_zero = min($60k, $64,750) - $57k = $3k; all in 0%
  // pref_tax = 0
  // ordinary_tax = $1,700 + ($57,000 - $17,000) × 12% = $1,700 + $4,800 = $6,500
  const result = compute({
    taxable_income: 60_000,
    filing_status: FilingStatus.HOH,
    qualified_dividends: 3_000,
  });
  assertAlmostEquals(
    f1040Fields(result)?.line16_income_tax as number,
    6_500,
    1,
  );
});

// ─── Form 1116 Part III line 20 (IRC §904(a)) ────────────────────────────────
// "Individuals: Enter the total of Form 1040, 1040-SR, or 1040-NR, line 16, and
// Schedule 2 (Form 1040), line 1z." Line 16 is figured here, so the FTC
// limitation base is routed from here.

Deno.test("form_1116: line 16 routes as us_tax_before_credits", () => {
  // taxable $85,250 single = $5,578.50 + ($85,250 − $48,475) × 22% = $13,669
  const result = compute({
    taxable_income: 85_250,
    filing_status: FilingStatus.Single,
  });
  assertEquals(
    fieldsOf(result.outputs, form_1116)?.us_tax_before_credits,
    13_669,
  );
});

Deno.test("form_1116: zero taxable income routes a zero limitation base", () => {
  // No US tax → line 21 is zero → no credit, the taxes carry over instead.
  const result = compute({
    taxable_income: 0,
    filing_status: FilingStatus.Single,
  });
  assertEquals(fieldsOf(result.outputs, form_1116)?.us_tax_before_credits, 0);
});
