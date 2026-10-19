import { test } from "bun:test";
import { assertEquals, assertThrows } from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import { form8995 } from "../../../../mef/forms/deductions/business/f8995/f8995.ts";
import { form8995Pdf } from "../../../../pdf/forms/deductions/business/f8995/f8995.ts";

// Synthetic MFJ return: wages 282,509, a non-SSTB Schedule C with 150,000
// profit (no W-2 wages or UBIA), a partnership K-1 with box 20 code Z QBI of
// -20,000 and 1,000 of REIT dividends (1099-DIV box 5). Taxable income
// before the QBI deduction is 400,000.
function run(scheduleCProfit = 150_000, k1Qbi = -20_000) {
  const r = f1040_2025.executeReturn({
    general: {
      filing_status: "mfj",
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Example",
      taxpayer_dob: "1980-01-01",
      taxpayer_ssn: "400-00-0001",
      spouse_first_name: "Blair",
      spouse_last_name: "Example",
      spouse_dob: "1981-01-01",
      spouse_ssn: "400-00-0002",
    },
    w2: [{
      employee_ssn: "400-00-0001",
      employer_ein: "111111111",
      employer_name: "Example Employer",
      source_document_reference: "w2-1",
      box1_wages: 282_509,
      box2_fed_withheld: 60_000,
      box3_ss_wages: 176_100,
      box4_ss_withheld: 10_918.2,
      box5_medicare_wages: 282_509,
      box6_medicare_withheld: 4_096.38,
    }],
    schedule_c: [{
      business_reference: "c-1",
      proprietor_recipient: "T",
      line_a_principal_business: "Consulting",
      line_b_business_code: "541600",
      line_c_business_name: "Example Consulting",
      line_d_ein: "123456789",
      line_f_accounting_method: "cash",
      line_g_material_participation: true,
      line_1_gross_receipts: scheduleCProfit,
    }],
    k1_partnership: [{
      partnership_name: "Example LP",
      partnership_ein: "987654321",
      box1_ordinary_income: k1Qbi,
      box20z_qbi: k1Qbi,
    }],
    f1099div: [{
      payerName: "Example REIT",
      source_document_reference: "div-1",
      isNominee: false,
      box11: false,
      box1a: 1_000,
      box5: 1_000,
    }],
  });
  return { r, p: normalizeAllPending(r.pending) };
}

// 2025 Form 8995-A instructions: Schedule C QBI is the profit less the
// deductible part of SE tax (2,009) = 147,991; Schedule C nets the K-1 loss
// against it → 127,991. Part III: 20% = 25,598.2, W-2/UBIA limit 0, phase-in
// (400,000 − 394,600) / 100,000 = 5.4% → 25,598.2 − 1,382.3 = 24,215.9.
// Part IV: REIT 1,000 × 20% = 200; line 37 = min(24,416, 20% × 400,000).
test("Form 8995-A combines Schedule C, a K-1 loss and REIT dividends above the threshold", () => {
  const { r, p } = run();
  assertEquals(r.diagnostics, []);
  assertEquals(
    Number(p.f1040.line15_taxable_income) +
      Number(p.f1040.line13_qbi_deduction),
    400_000,
  );
  assertEquals(p.f1040.line13_qbi_deduction, 24_416);
  assertEquals(r.carryforwards.qbi_loss_carryforward, undefined);
});

test("a K-1 loss larger than the Schedule C profit carries the net loss forward", () => {
  // 147,991 Schedule C QBI less the 160,000 K-1 loss is a 12,009 net loss
  // (Form 8995-A line 39 carryforward); the REIT component stays separate:
  // 1,000 × 20% = 200 (line 31).
  const { r, p } = run(150_000, -160_000);
  assertEquals(r.diagnostics, []);
  assertEquals(p.f1040.line13_qbi_deduction, 200);
  assertEquals(r.carryforwards.qbi_loss_carryforward, 12_009);
});

test("multi-source QBI is not exported until Form 8995-A rows have a projection", () => {
  const { p } = run();
  assertThrows(
    () => form8995.build(p.form8995 as never, {} as never),
    Error,
    "no MeF projection yet",
  );
  assertThrows(
    () => form8995Pdf.projectFields!(p.form8995 as never, p as never),
    Error,
    "no printed projection yet",
  );
});

// Synthetic single return above the threshold with one Schedule C loss that
// carries no business name or EIN. The loss is fully allowed (material
// participation, all investment at risk), so Form 8995-A Schedule C carries
// the 10,000 net QBI loss to next year and there is no deduction.
test("an unidentified, fully allowed Schedule C loss carries forward above the threshold", () => {
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
    schedule_c: [{
      line_a_principal_business: "Consulting",
      line_b_business_code: "541600",
      line_f_accounting_method: "cash",
      line_g_material_participation: true,
      line_32_at_risk: "a",
      line_1_gross_receipts: 0,
      line_27b_other_expenses: 10_000,
    }],
  });
  const p = normalizeAllPending(r.pending);
  assertEquals(r.diagnostics, []);
  assertEquals(p.f1040.line13_qbi_deduction ?? 0, 0);
  assertEquals(r.carryforwards.qbi_loss_carryforward, 10_000);
});
