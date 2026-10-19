import { test } from "bun:test";
import { assertEquals } from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";

// Synthetic single return below the threshold: wages 60,000 and one Schedule
// C with a 15,000 loss. 2025 Form 8995 instructions, lines 2-5 and 16: a net
// qualified business loss gives no QBI component this year and carries
// forward as next year's line 3.
test("Form 8995 carries a current-year net QBI loss forward on line 16", () => {
  const r = f1040_2025.executeReturn({
    general: {
      filing_status: "single",
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Example",
      taxpayer_dob: "1980-01-01",
      taxpayer_ssn: "400-00-0001",
    },
    w2: [{
      box1_wages: 60_000,
      box2_fed_withheld: 5_000,
      box3_ss_wages: 60_000,
      box4_ss_withheld: 3_720,
      box5_medicare_wages: 60_000,
      box6_medicare_withheld: 870,
    }],
    schedule_c: [{
      business_reference: "c-1",
      line_a_principal_business: "Retail",
      line_b_business_code: "459999",
      line_c_business_name: "Example Shop",
      line_d_ein: "123456789",
      line_f_accounting_method: "cash",
      line_g_material_participation: true,
      line_32_at_risk: "a",
      line_1_gross_receipts: 0,
      line_27b_other_expenses: 15_000,
      qbi_w2_wages: 0,
    }],
  });
  const p = normalizeAllPending(r.pending);
  assertEquals(r.diagnostics, []);
  assertEquals(p.f1040.line13_qbi_deduction ?? 0, 0);
  assertEquals([p.form8995.line2, p.form8995.line16], [-15_000, 15_000]);
  assertEquals(r.carryforwards.qbi_loss_carryforward, 15_000);
});
