import { test } from "bun:test";
import { assertEquals } from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import { scenario104005Input } from "../../../../../e2e/ats/scenario_1040_05_input.ts";

// 2025 Form 8863 instructions, lines 3 and 14: MAGI is Form 1040 line 11
// (plus any Form 2555 exclusion), and the filing status is the return's.
// The synthetic ATS Scenario 5 return claims the AOTC with both keyed; the
// same return without them must reach the same credit.
test("Form 8863 takes MAGI and filing status from the return when not keyed", () => {
  const keyed = scenario104005Input() as Record<string, unknown>;
  const derived = structuredClone(keyed);
  for (const item of derived.f8863 as Record<string, unknown>[]) {
    delete item.filer_magi;
    delete item.filing_status;
  }
  const a = normalizeAllPending(f1040_2025.executeReturn(keyed).pending);
  const r = f1040_2025.executeReturn(derived);
  const b = normalizeAllPending(r.pending);
  assertEquals(r.diagnostics, []);
  assertEquals(b.f1040.line29_refundable_aoc, a.f1040.line29_refundable_aoc);
  assertEquals(b.schedule3?.line3_education_credit, a.schedule3?.line3_education_credit);
  assertEquals(Number(b.f1040.line29_refundable_aoc ?? 0) > 0, true);
});
