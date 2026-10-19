import { test } from "bun:test";
import { assertEquals } from "@std/assert";
import { f1040_2025 } from "../../../index.ts";
import { returnHints } from "../../../../../../cli/commands/return-hints.ts";

// Synthetic MFS return with no answer on living apart. 2025 Form 1040
// instructions, Social Security Benefits Worksheet: an MFS filer who lived
// with their spouse skips lines 8-15; line 16 = 85% of line 7 and line 18 is
// the smaller of line 16 and 85% of benefits. Line 7 = 23,333.50 + 100,000;
// 85% of benefits, 39,667, is smaller.
function run(livedApart?: boolean) {
  return f1040_2025.executeReturn({
    general: {
      filing_status: "mfs",
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Owner",
      taxpayer_ssn: "111223333",
      taxpayer_dob: "1955-01-01",
      spouse_first_name: "Sam",
      spouse_last_name: "Owner",
      spouse_ssn: "111224444",
      address_line1: "1 Main St",
      address_city: "Austin",
      address_state: "TX",
      address_zip: "78701",
      ...(livedApart === undefined
        ? {}
        : { mfs_spouse_lived_with_taxpayer: !livedApart }),
    },
    ssa1099: [{ box3_gross_benefits: 46_667, box5_net_benefits: 46_667 }],
    f1099r: [{
      payer_name: "Synthetic Pension Plan",
      payer_ein: "123456789",
      recipient_ssn: "111-22-3333",
      box1_gross_distribution: 100_000,
      box2a_taxable_amount: 100_000,
      box7_distribution_code: "7",
      box7_ira_simple_indicator: false,
    }],
  });
}

test("MFS benefits default to the lived-with-spouse rule and the return computes tax", () => {
  const result = run();
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040.line6b_ss_taxable, 39_667);
  assertEquals(result.pending.f1040.line11_agi, 139_667);
  // Filing status and AGI reach the standard deduction and tax nodes.
  assertEquals(result.pending.standard_deduction.filing_status, "mfs");
  assertEquals(result.pending.income_tax_calculation.filing_status, "mfs");
  assertEquals(result.pending.form6251.filing_status, "mfs");
  assertEquals(Number(result.pending.f1040.line24_total_tax) > 0, true);
  assertEquals(
    returnHints(result.pending).some((hint) =>
      hint.includes("assumed you lived with your spouse")
    ),
    true,
  );
  assertEquals(
    returnHints(run(false).pending).some((hint) =>
      hint.includes("assumed you lived with your spouse")
    ),
    false,
  );
});
