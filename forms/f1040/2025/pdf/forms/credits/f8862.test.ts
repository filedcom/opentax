import { assertEquals, assertThrows } from "@std/assert";
import { FilingStatus } from "../../../../mef/header.ts";
import { form8862OverflowRows, form8862Pdf } from "./f8862.ts";

const filer = {
  primarySSN: "123456789",
  nameLine1: "Jane Doe",
  nameControl: "DOE",
  firstName: "Jane",
  lastName: "Doe",
  address: { line1: "1 Main St", city: "Anywhere", state: "CA", zip: "90001" },
  filingStatus: FilingStatus.Single,
};

const priorEicEvidence = {
  credit_disallowance_ban_active: false,
  eitc_disallowed_year: 2023,
  eitc_disallowance_notice_reference: "Synthetic 2023 IRS notice",
};
const noticeReviews = {
  filing_status: "single",
  taxpayer_ssn: "123456789",
  prior_eic_disallowance_review: {
    status: "requires_8862",
    disallowed_year: 2023,
    disallowance_notice_reference: "Synthetic 2023 IRS notice",
  },
  prior_ctc_disallowance_review: {
    disallowed_year: 2023,
    notice_reference: "Synthetic 2023 IRS CTC notice",
    notice_copy_reference: "Retained synthetic CTC notice copy",
    taxpayer_ssn: "123456789",
    nonclerical_disallowance_verified: true,
    no_active_ban_verified: true,
  },
  prior_aotc_disallowance_review: {
    disallowed_year: 2023,
    notice_reference: "Synthetic 2023 IRS AOTC notice",
    notice_copy_reference: "Retained synthetic AOTC notice copy",
    taxpayer_ssn: "123456789",
    nonclerical_disallowance_verified: true,
    no_active_ban_verified: true,
  },
};

Deno.test("Form 8862 PDF maps exact Dec 2025 widget names on all three pages", () => {
  const map = new Map(
    form8862Pdf.fields.map((entry) => [entry.domainKey, entry.pdfField]),
  );
  assertEquals(form8862Pdf.pageIndices?.({}), [0, 1, 2]);
  assertEquals(
    map.get("tax_year"),
    "topmostSubform[0].Page1[0].Line1_CombField[0].f1_03[0]",
  );
  assertEquals(
    map.get("eitc_child_2_death_day"),
    "topmostSubform[0].Page1[0].Child3_Death_Ln8[0].f1_21[0]",
  );
  assertEquals(
    map.get("primary_home_days"),
    "topmostSubform[0].Page2[0].Ln9a_CombField[0].f2_01[0]",
  );
  assertEquals(
    map.get("ctc_child_3_name"),
    "topmostSubform[0].Page2[0].f2_08[0]",
  );
  assertEquals(map.get("odc_3_name"), "topmostSubform[0].Page2[0].f2_12[0]");
  assertEquals(
    map.get("aotc_student_2_name"),
    "topmostSubform[0].Page3[0].f3_03[0]",
  );
});

Deno.test("Form 8862 PDF projects bounded EITC and CTC claims", () => {
  const source = {
    claim_eitc: true,
    ...priorEicEvidence,
    eitc_income_reporting_only: false,
    eitc_qualifying_child_of_other: false,
    eitc_children: [{ first_name: "Alice", last_name: "Doe", days_in_us: 300 }],
    claim_ctc: true,
    ctc_disallowed_year: 2023,
    ctc_disallowance_notice_reference: "Synthetic 2023 IRS CTC notice",
    ctc_children: [{
      first_name: "Alice",
      last_name: "Doe",
      lived_with_over_half_year: true,
      qualifying_child: true,
      dependent: true,
      us_citizen_national_or_resident: true,
    }],
  };
  assertThrows(
    () =>
      form8862Pdf.instances?.(source, filer, {
        general: noticeReviews,
        f1040: {
          taxpayer_ssn: "123456789",
          line27_eitc: 500,
          line19_child_tax_credit: 2200,
          dependent_details: [{
            first_name: "Alice",
            last_name: "Doe",
            credit_category: "ctc",
          }],
        },
        eitc: {
          credit_amount: 500,
          qualifying_children: 1,
          qualifying_child_details: [{ first_name: "Alice", last_name: "Doe" }],
        },
      }),
    Error,
    "executor-owned authentication of prior IRS notice issuance and contents",
  );
});

Deno.test("Form 8862 retains numbered continuation rows without exporting CTC", () => {
  const ctc = {
    claim_ctc: true,
    ctc_disallowed_year: 2023,
    ctc_disallowance_notice_reference: "Synthetic 2023 IRS CTC notice",
    ctc_children: ["Alice", "Betty", "Carol", "David", "Ellen"].map((name) => ({
      first_name: name,
      last_name: "Doe",
      lived_with_over_half_year: true,
      qualifying_child: true,
      dependent: true,
      us_citizen_national_or_resident: true,
    })),
  };
  assertEquals(form8862OverflowRows(ctc), [{
    heading: "12. Child 5: Ellen Doe",
    answers: "14 lived with filer: yes; 15 qualifying child: yes; " +
      "16 dependent: yes; 17 US citizen/national/resident: yes",
  }]);
});

Deno.test("Form 8862 continuation includes extra ODC and AOTC answers", () => {
  const rows = form8862OverflowRows({
    other_dependents: Array.from({ length: 5 }, (_, i) => ({
      first_name: `Other${i}`,
      last_name: "Doe",
      dependent: true,
      us_citizen_national_or_resident: true,
    })),
    aotc_students: Array.from({ length: 4 }, (_, i) => ({
      first_name: `Student${i}`,
      last_name: "Doe",
      eligible: true,
      credit_claimed_four_prior_years: false,
    })),
  });
  assertEquals(rows, [{
    heading: "13. Other dependent 5: Other4 Doe",
    answers: "16 dependent: yes; 17 US citizen/national/resident: yes",
  }, {
    heading: "18. Student 4: Student3 Doe",
    answers:
      "19a eligible student: yes; 19b credit claimed four prior years: no",
  }]);
});

Deno.test("Form 8862 PDF rejects a claim missing from the finalized return", () => {
  assertThrows(
    () =>
      form8862Pdf.instances?.(
        {
          claim_eitc: true,
          ...priorEicEvidence,
          eitc_income_reporting_only: true,
        },
        filer,
        { f1040: { line27_eitc: 0 } },
      ),
    Error,
    "line 27",
  );
});

Deno.test("Form 8862 PDF requires AOTC students to match Form 8863", () => {
  const aotc = {
    claim_aotc: true,
    aotc_disallowed_year: 2023,
    aotc_disallowance_notice_reference: "Synthetic 2023 IRS AOTC notice",
    aotc_students: [{
      first_name: "Alice",
      last_name: "Doe",
      eligible: true,
      credit_claimed_four_prior_years: false,
    }],
  };
  const pending = {
    general: noticeReviews,
    f1040: { line29_refundable_aoc: 1000 },
    f8863: { f8863s: [{ credit_type: "aoc", student_name: "Alice Doe" }] },
  };
  assertThrows(
    () => form8862Pdf.instances?.(aotc, filer, pending),
    Error,
    "standalone AOTC source, Form 8863, Schedule 3, and Form 1040 amounts do not reconcile",
  );
  assertThrows(
    () =>
      form8862Pdf.instances?.(aotc, filer, {
        ...pending,
        f8863: {
          f8863s: [{ credit_type: "aoc", student_name: "Other Student" }],
        },
      }),
    Error,
    "reconcile",
  );
});
