import { test } from "bun:test";
import { assertEquals } from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";

// Synthetic return: one Schedule C (QBI 161,000 less the 11,375 deductible
// part of SE tax = 149,625), W-2 wages keep taxable income under the threshold.
function prepared(carryforward?: Record<string, number>) {
  const r = f1040_2025.executeReturn({
    general: {
      filing_status: "single",
      taxpayer_first_name: "Pat",
      taxpayer_last_name: "Example",
      taxpayer_dob: "1980-01-01",
    },
    schedule_c: [{
      line_a_principal_business: "Consulting",
      line_b_business_code: "541600",
      line_f_accounting_method: "cash",
      line_g_material_participation: true,
      line_1_gross_receipts: 161_000,
    }],
    w2: [{
      box1_wages: 20_000,
      box2_fed_withheld: 1_000,
      box3_ss_wages: 20_000,
      box4_ss_withheld: 1_240,
      box5_medicare_wages: 20_000,
      box6_medicare_withheld: 290,
    }],
    ...(carryforward && { qbi_loss_carryforward: carryforward }),
  });
  return { r, p: normalizeAllPending(r.pending) };
}

test("prior-year QBI loss carryforward reduces Form 8995 line 4 (i8995 line 3)", () => {
  assertEquals(prepared().p.f1040.line13_qbi_deduction, 29_925);
  const { r, p } = prepared({ qbi_loss_carryforward: 58_738 });
  assertEquals(r.diagnostics, []);
  // (149,625 - 58,738) × 20% = 18,177.4, under the 20% taxable income limit.
  assertEquals(p.form8995.line3, -58_738);
  assertEquals(p.form8995.line4, 90_887);
  assertEquals(p.f1040.line13_qbi_deduction, 18_177);
  assertEquals(r.carryforwards.qbi_loss_carryforward, undefined);
});

test("unused QBI and REIT/PTP losses carry to next year on lines 16 and 17", () => {
  const { r, p } = prepared({
    qbi_loss_carryforward: 200_000,
    reit_ptp_loss_carryforward: 500,
  });
  assertEquals(r.diagnostics, []);
  assertEquals(p.f1040.line13_qbi_deduction ?? 0, 0);
  assertEquals(p.form8995.line16, 50_375);
  assertEquals(p.form8995.line17, 500);
  assertEquals(r.carryforwards.qbi_loss_carryforward, 50_375);
  assertEquals(r.carryforwards.reit_ptp_loss_carryforward, 500);
});
