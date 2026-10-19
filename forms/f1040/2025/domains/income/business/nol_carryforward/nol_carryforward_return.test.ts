import { test } from "bun:test";
import { assertEquals, assertStringIncludes } from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";

// Synthetic single return: wages 120,000 and a 2022 NOL of 200,000.
// IRC §172(a)(2): the post-2017 deduction is limited to 80% of taxable income
// figured without the NOL and QBI deductions: 80% × (120,000 − 15,750
// standard deduction) = 83,400 on Schedule 1 line 8a; 116,600 carries to 2026.
function run(extra: Record<string, unknown> = {}) {
  const r = f1040_2025.executeReturn({
    general: {
      filing_status: "single",
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Example",
      taxpayer_dob: "1980-01-01",
    },
    w2: [{
      box1_wages: 120_000,
      box2_fed_withheld: 15_000,
      box3_ss_wages: 120_000,
      box4_ss_withheld: 7_440,
      box5_medicare_wages: 120_000,
      box6_medicare_withheld: 1_740,
    }],
    nol_carryforward: {
      nol_carryforwards: [{
        year: 2022,
        nol_amount: 200_000,
        nol_type: "POST2017",
      }],
    },
    ...extra,
  });
  return { r, p: normalizeAllPending(r.pending) };
}

test("NOL deduction is figured from the return at 80% of pre-NOL taxable income", () => {
  const { r, p } = run();
  assertEquals(r.diagnostics, []);
  assertEquals(p.schedule1.line8a_nol_deduction, 83_400);
  assertEquals(p.f1040.line11_agi, 36_600);
  assertEquals(r.carryforwards.nol_carryforward_post2017, 116_600);
});

test("NOL limit rejects a return whose deduction is not the assumed standard deduction", () => {
  const { r } = run({
    schedule_a: { line_5a_state_income_tax: 30_000, force_itemized: true },
  });
  assertStringIncludes(
    r.diagnostics.map((d) => d.message).join("\n"),
    "enter nol_carryforward current_year_taxable_income",
  );
});

// Synthetic single filer aged 66 (17,750 standard deduction: 15,750 + 2,000
// additional; 2025 Form 1040 instructions) with a 2017 NOL of 20,000. A
// pre-2018 loss has no 80% limit (IRC §172(a)(1); Pub. 536), and taxable
// income of 102,250 absorbs it, so the deduction is 20,000 whatever the
// standard deduction is: no taxable-income override is needed.
test("a fully used pre-2018 NOL does not need the base standard deduction", () => {
  const { r, p } = run({
    general: {
      filing_status: "single",
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Example",
      taxpayer_dob: "1959-01-01",
    },
    nol_carryforward: {
      nol_carryforwards: [{ year: 2017, nol_amount: 20_000, nol_type: "PRE2018" }],
    },
  });
  assertEquals(r.diagnostics, []);
  assertEquals(p.schedule1.line8a_nol_deduction, 20_000);
  assertEquals(p.f1040.line11_agi, 100_000);
});
