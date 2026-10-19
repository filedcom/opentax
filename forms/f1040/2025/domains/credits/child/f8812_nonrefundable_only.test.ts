import { test } from "bun:test";
import { assertEquals } from "@std/assert";
import { f1040_2025 } from "../../../index.ts";
import { normalizeAllPending } from "../../../return-processing/pending.ts";

const child = (index: number) => ({
  first_name: `Child${index}`,
  last_name: "Example",
  dob: `2012-03-0${index + 1}`,
  ssn: `400-00-00${10 + index}`,
  relationship: "son",
  months_in_home: 12,
  qualifying_child_for_ctc: true,
  ssn_valid_for_employment: true,
  ssn_issued_before_due_date: true,
  tin_issued_by_due_date: true,
  us_citizen_national_or_resident: true,
  provided_over_half_own_support: false,
  filed_joint_return_except_refund_only: false,
  dependent_on_another_return: false,
  lived_in_us_over_half_year: true,
  months_lived_with_you_in_us: 12,
});

// Synthetic MFJ return: wages 170,000 and seven children under 17. Schedule
// 8812 line 12 is 7 × 2,200 = 15,400, under the line 13 tax limit, so line 14
// takes all of it and line 16a (line 12 minus line 14) is zero: there is no
// refundable credit and Part II-A (line 18a earned income) is not reached
// (2025 Schedule 8812, lines 14-17).
function run(children: number, wages: number) {
  return f1040_2025.executeReturn({
    general: {
      filing_status: "mfj",
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Example",
      taxpayer_dob: "1980-01-01",
      taxpayer_ssn: "400-00-0001",
      taxpayer_ssn_valid_for_employment: true,
      taxpayer_ssn_issued_before_due_date: true,
      taxpayer_tin_issued_by_due_date: true,
      spouse_first_name: "Blair",
      spouse_last_name: "Example",
      spouse_dob: "1981-01-01",
      spouse_ssn: "400-00-0002",
      spouse_ssn_valid_for_employment: true,
      spouse_ssn_issued_before_due_date: true,
      spouse_tin_issued_by_due_date: true,
      dependents: Array.from({ length: children }, (_, index) => child(index)),
    },
    w2: [{
      box1_wages: wages,
      box2_fed_withheld: 5_000,
      box3_ss_wages: wages,
      box4_ss_withheld: wages * 0.062,
      box5_medicare_wages: wages,
      box6_medicare_withheld: wages * 0.0145,
    }],
  });
}

test("Schedule 8812 claims a fully nonrefundable credit without line 18a earned income", () => {
  const r = run(7, 170_000);
  const p = normalizeAllPending(r.pending);
  assertEquals(r.diagnostics, []);
  assertEquals(p.f1040.line19_child_tax_credit, 15_400);
  assertEquals(p.f1040.line28_actc, undefined);
});

// Synthetic MFJ return: wages 70,000 and two children. Line 12 (4,400) exceeds
// the tax, so line 17 is refundable and Part II-A needs line 18a. With wages
// as the only earned income, the Earned Income Worksheet line 7 is Form 1040
// line 1z (70,000); line 20 is (70,000 - 2,500) × 15% = 10,125, so the whole
// line 17 is refundable (2025 Schedule 8812, lines 16a-27).
test("Schedule 8812 derives line 18a from wages when part of the credit is refundable", () => {
  const r = run(2, 70_000);
  const p = normalizeAllPending(r.pending);
  assertEquals(r.diagnostics, []);
  // Line 14 is limited to the Form 1040 line 16 tax (no other credits).
  const nonrefundable = Number(p.f1040.line19_child_tax_credit);
  const refundable = Number(p.f1040.line28_actc);
  assertEquals(nonrefundable, p.f1040.line16_income_tax);
  assertEquals(nonrefundable + refundable, 4_400);
  assertEquals(refundable > 0, true);
});
