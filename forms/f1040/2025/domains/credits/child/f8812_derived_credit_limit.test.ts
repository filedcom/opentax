import { test } from "bun:test";
import { assertEquals } from "@std/assert";
import { f1040_2025 } from "../../../index.ts";
import { normalizeAllPending } from "../../../return-processing/pending.ts";

const child = (first_name: string, dob: string, ssn: string) => ({
  first_name,
  last_name: "Example",
  dob,
  ssn,
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

// Synthetic MFJ return: two children under 17, wages only, no Schedule 3
// credit. 2025 Schedule 8812 instructions, Credit Limit Worksheet A: line 2
// (Schedule 3 lines 1-4, 5b, 6d, 6f, 6l, 6m) is zero and, with no Form 8396,
// 8839, 5695 Part I or 8859 credit, Worksheet B is not completed.
test("Schedule 8812 derives Credit Limit Worksheet A from a return without Schedule 3 credits", () => {
  const r = f1040_2025.executeReturn({
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
      dependents: [
        child("Casey", "2015-03-01", "400-00-0003"),
        child("Drew", "2018-06-01", "400-00-0004"),
      ],
    },
    w2: [{
      box1_wages: 120_000,
      box2_fed_withheld: 9_000,
      box3_ss_wages: 120_000,
      box4_ss_withheld: 7_440,
      box5_medicare_wages: 120_000,
      box6_medicare_withheld: 1_740,
    }],
  });
  const p = normalizeAllPending(r.pending);
  assertEquals(r.diagnostics, []);
  assertEquals(p.f1040.line19_child_tax_credit, 4_400);
});
