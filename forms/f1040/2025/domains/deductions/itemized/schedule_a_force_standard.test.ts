import { test } from "bun:test";
import { assertEquals } from "@std/assert";
import { f1040_2025 } from "../../../index.ts";
import { normalizeAllPending } from "../../../return-processing/pending.ts";

// IRC §63(e): a taxpayer may elect the standard deduction even when itemized
// deductions are larger. Synthetic single return with $30,000 state income tax.
function run(forceStandard: boolean) {
  const r = f1040_2025.executeReturn({
    general: {
      filing_status: "single",
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Example",
      taxpayer_dob: "1980-01-01",
    },
    w2: [{
      box1_wages: 300_000,
      box2_fed_withheld: 60_000,
      box3_ss_wages: 176_100,
      box4_ss_withheld: 10_918.2,
      box5_medicare_wages: 300_000,
      box6_medicare_withheld: 4_350,
    }],
    schedule_a: {
      line_5a_state_income_tax: 30_000,
      ...(forceStandard && { force_standard: true }),
    },
  });
  return { r, p: normalizeAllPending(r.pending) };
}

test("Schedule A force_standard files the $15,750 standard deduction", () => {
  const { r, p } = run(true);
  assertEquals(r.diagnostics, []);
  assertEquals(p.f1040.line12a_standard_deduction, 15_750);
  assertEquals(p.f1040.line12e_itemized_deductions, undefined);
  assertEquals(run(false).p.f1040.line12e_itemized_deductions, 30_000);
});
