import { assertEquals, assertThrows } from "@std/assert";
import { FilingStatus } from "../../../nodes/types.ts";
import { irs1040Pdf } from "./f1040.ts";
import { schedule1aPdf } from "./schedule1a.ts";

const source = {
  filing_status: FilingStatus.MFJ,
  magi: 160_000,
  taxpayer_age_65_or_older: true,
  taxpayer_has_valid_ssn: true,
  taxpayer_ssn: "111223333",
  spouse_age_65_or_older: true,
  spouse_has_valid_ssn: true,
  spouse_ssn: "222334444",
  senior_zero_exclusions_review: {
    no_section933_puerto_rico_excluded_income: true as const,
    section933_review_source_reference: "2025 residency and income review",
    no_form2555_filed: true as const,
    form2555_review_source_reference: "2025 foreign-income return review",
    no_form4563_filed: true as const,
    form4563_review_source_reference: "2025 Samoa-source income review",
  },
};

const return1040 = {
  filing_status: FilingStatus.MFJ,
  line11_agi: 160_000,
  line13b_additional_deductions: 10_800,
  schedule1a_line37_senior_deduction: 10_800,
  taxpayer_ssn: "111223333",
  taxpayer_age_65_or_older: true,
  taxpayer_ssn_valid_for_employment: true,
  taxpayer_ssn_issued_before_due_date: true,
  taxpayer_tin_issued_by_due_date: true,
  spouse_ssn: "222334444",
  spouse_age_65_or_older: true,
  spouse_ssn_valid_for_employment: true,
  spouse_ssn_issued_before_due_date: true,
  spouse_tin_issued_by_due_date: true,
};

Deno.test("2025 Schedule 1-A PDF maps the senior-only worksheet to both pages", () => {
  const map = new Map(schedule1aPdf.fields.map((entry) => [
    entry.domainKey,
    entry.pdfField,
  ]));
  assertEquals(map.get("line1_agi"), "form1[0].Page1[0].f1_03[0]");
  assertEquals(map.get("line3_magi"), "form1[0].Page1[0].f1_09[0]");
  assertEquals(map.get("line31_magi"), "form1[0].Page2[0].f2_15[0]");
  assertEquals(map.get("line36a_taxpayer"), "form1[0].Page2[0].f2_20[0]");
  assertEquals(map.get("line36b_spouse"), "form1[0].Page2[0].f2_21[0]");
  assertEquals(map.get("line38_total"), "form1[0].Page2[0].f2_23[0]");
  assertEquals(
    schedule1aPdf.filerFields?.map((field) => field.domainKey),
    ["fullName", "primarySSN"],
  );

  const pending = { schedule1a: source, f1040: return1040 };
  const projected = schedule1aPdf.projectFields?.(source, pending);
  assertEquals(projected?.line1_agi, 160_000);
  assertEquals(projected?.line2e_zero_exclusions, 0);
  assertEquals(projected?.line31_magi, 160_000);
  assertEquals(projected?.line35_per_person, 5_400);
  assertEquals(projected?.line36a_taxpayer, 5_400);
  assertEquals(projected?.line36b_spouse, 5_400);
  assertEquals(projected?.line37_senior, 10_800);
  assertEquals(projected?.line38_total, 10_800);
  assertEquals(
    irs1040Pdf.projectFields?.(return1040, pending)
      ?.line13b_additional_deductions,
    10_800,
  );
});

Deno.test("2025 Schedule 1-A PDF rejects unsupported and mismatched line 13b", () => {
  assertThrows(
    () =>
      schedule1aPdf.projectFields?.({
        ...source,
        taxpayer_qualified_overtime_compensation: 100,
      }, { schedule1a: source, f1040: return1040 }),
    Error,
    "cannot include tips, overtime, or vehicle interest",
  );
  assertThrows(
    () =>
      irs1040Pdf.projectFields?.(
        { ...return1040, line13b_additional_deductions: 10_900 },
        {
          schedule1a: source,
          f1040: { ...return1040, line13b_additional_deductions: 10_900 },
        },
      ),
    Error,
    "do not reconcile",
  );
  assertThrows(
    () => irs1040Pdf.projectFields?.(return1040, { f1040: return1040 }),
    Error,
    "needs a reconciled Schedule 1-A page",
  );
});
