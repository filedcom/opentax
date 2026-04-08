import { assertEquals } from "@std/assert";
import { normalizeAllPending, normalizePendingDict } from "./pending.ts";

// ---------------------------------------------------------------------------
// normalizePendingDict
// ---------------------------------------------------------------------------

Deno.test("normalizePendingDict: returns undefined for null", () => {
  assertEquals(normalizePendingDict(null), undefined);
});

Deno.test("normalizePendingDict: returns undefined for undefined", () => {
  assertEquals(normalizePendingDict(undefined), undefined);
});

Deno.test("normalizePendingDict: returns undefined for array", () => {
  assertEquals(normalizePendingDict([1, 2, 3]), undefined);
});

Deno.test("normalizePendingDict: returns undefined for primitive", () => {
  assertEquals(normalizePendingDict(42), undefined);
});

Deno.test("normalizePendingDict: passes through scalar number values unchanged", () => {
  assertEquals(normalizePendingDict({ wages: 75000 }), { wages: 75000 });
});

Deno.test("normalizePendingDict: passes through string values unchanged", () => {
  assertEquals(
    normalizePendingDict({ filing_status: "single" }),
    { filing_status: "single" },
  );
});

Deno.test("normalizePendingDict: resolves all-numeric array to last element", () => {
  assertEquals(
    normalizePendingDict({ wages: [60000, 75000] }),
    { wages: 75000 },
  );
});

Deno.test("normalizePendingDict: single-element numeric array resolves to that element", () => {
  assertEquals(
    normalizePendingDict({ wages: [75000] }),
    { wages: 75000 },
  );
});

Deno.test("normalizePendingDict: mixed-type array is left as-is", () => {
  const input = { items: [1, "two", 3] };
  assertEquals(normalizePendingDict(input), { items: [1, "two", 3] });
});

Deno.test("normalizePendingDict: handles multiple fields independently", () => {
  assertEquals(
    normalizePendingDict({
      wages: [50000, 75000],
      interest: 1200,
      filing_status: "single",
    }),
    {
      wages: 75000,
      interest: 1200,
      filing_status: "single",
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
