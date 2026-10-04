import { assertEquals } from "@std/assert";
import { normalizeAllPending, normalizePendingDict } from "./pending.ts";

// ---------------------------------------------------------------------------
// normalizePendingDict
// ---------------------------------------------------------------------------

Deno.test("normalizePendingDict: returns undefined for null", () => {
  assertEquals(normalizePendingDict(null, "f1040"), undefined);
});

Deno.test("normalizePendingDict: returns undefined for undefined", () => {
  assertEquals(normalizePendingDict(undefined, "f1040"), undefined);
});

Deno.test("normalizePendingDict: returns undefined for array", () => {
  assertEquals(normalizePendingDict([1, 2, 3], "f1040"), undefined);
});

Deno.test("normalizePendingDict: returns undefined for primitive", () => {
  assertEquals(normalizePendingDict(42, "f1040"), undefined);
});

Deno.test("normalizePendingDict: passes through scalar number values unchanged", () => {
  assertEquals(normalizePendingDict({ wages: 75000 }, "f1040"), {
    wages: 75000,
  });
});

Deno.test("normalizePendingDict: passes through string values unchanged", () => {
  assertEquals(
    normalizePendingDict({ filing_status: "single" }, "f1040"),
    { filing_status: "single" },
  );
});

Deno.test("normalizePendingDict: resolves all-numeric array to last element", () => {
  assertEquals(
    normalizePendingDict({ wages: [60000, 75000] }, "f1040"),
    { wages: 75000 },
  );
});

Deno.test("normalizePendingDict: adds independent Schedule E and passive K-1 sources", () => {
  assertEquals(
    normalizePendingDict({
      line5_schedule_e: [6_000, 5_950],
      eic_passive_k1_income: [6_000, 5_950],
      agi: [15_000, 16_950],
    }, "f1040"),
    {
      line5_schedule_e: 11_950,
      eic_passive_k1_income: 11_950,
      agi: 16_950,
    },
  );
});

Deno.test("normalizePendingDict: single-element numeric array resolves to that element", () => {
  assertEquals(
    normalizePendingDict({ wages: [75000] }, "f1040"),
    { wages: 75000 },
  );
});

Deno.test("normalizePendingDict: AGI line 1h sums distinct retained wage sources only in AGI", () => {
  assertEquals(
    normalizePendingDict(
      { line1h_other_earned: [3_000, 3_500] },
      "agi_aggregator",
    ),
    { line1h_other_earned: 6_500 },
  );
  assertEquals(
    normalizePendingDict({ line1h_other_earned: [3_000, 6_500] }, "f1040"),
    { line1h_other_earned: 6_500 },
  );
});

Deno.test("normalizePendingDict: AGI tax-exempt interest sums independent issued sources", () => {
  assertEquals(
    normalizePendingDict(
      { tax_exempt_interest: [150_000, 150_000] },
      "agi_aggregator",
    ),
    { tax_exempt_interest: 300_000 },
  );
  assertEquals(
    normalizePendingDict({ tax_exempt_interest: [150_000, 300_000] }, "f1040"),
    { tax_exempt_interest: 300_000 },
  );
});

Deno.test("normalizePendingDict: AGI ordinary dividends sum independent child and issuer sources", () => {
  assertEquals(
    normalizePendingDict(
      { line3b_ordinary_dividends: [100, 200] },
      "agi_aggregator",
    ),
    { line3b_ordinary_dividends: 300 },
  );
  assertEquals(
    normalizePendingDict({ line3b_ordinary_dividends: [100, 300] }, "f1040"),
    { line3b_ordinary_dividends: 300 },
  );
});

Deno.test("normalizePendingDict: mixed-type array is left as-is", () => {
  const input = { items: [1, "two", 3] };
  assertEquals(normalizePendingDict(input, "f1040"), { items: [1, "two", 3] });
});

Deno.test("normalizePendingDict: handles multiple fields independently", () => {
  assertEquals(
    normalizePendingDict({
      wages: [50000, 75000],
      interest: 1200,
      filing_status: "single",
    }, "f1040"),
    {
      wages: 75000,
      interest: 1200,
      filing_status: "single",
    },
  );
});

Deno.test("normalizePendingDict: Form 4952 retains individual payer amounts", () => {
  assertEquals(
    normalizePendingDict({
      source_1099_interest: [30_000, 30_000],
      source_1099_dividends: [15_000, 25_000],
      line4a: [60_000, 100_000],
    }, "form4952"),
    {
      source_1099_interest: [30_000, 30_000],
      source_1099_dividends: [15_000, 25_000],
      line4a: 100_000,
    },
  );
});

// ---------------------------------------------------------------------------
// normalizeAllPending
// ---------------------------------------------------------------------------

Deno.test("normalizeAllPending: empty object returns empty object", () => {
  assertEquals(normalizeAllPending({}), {});
});

Deno.test("normalizeAllPending: skips keys whose value is not a plain object", () => {
  const result = normalizeAllPending({
    f1040: { wages: 75000 },
    schedule_b: null,
    schedule_c: [1, 2, 3],
  });
  assertEquals(result, { f1040: { wages: 75000 } });
});

Deno.test("normalizeAllPending: normalizes numeric arrays across all form keys", () => {
  const result = normalizeAllPending({
    f1040: { wages: [60000, 75000], interest: 1200 },
    schedule_b: { taxable_interest_net: [800, 1200] },
  });
  assertEquals(result, {
    f1040: { wages: 75000, interest: 1200 },
    schedule_b: { taxable_interest_net: 1200 },
  });
});

Deno.test("normalizeAllPending: preserves non-numeric fields as-is", () => {
  const result = normalizeAllPending({
    f1040: { filing_status: "mfj", wages: 120000 },
  });
  assertEquals(result, {
    f1040: { filing_status: "mfj", wages: 120000 },
  });
});
