import { assertEquals, assertThrows } from "@std/assert";
import { FilingStatus } from "../../../mef/header.ts";
import { form8862Pdf } from "./f8862.ts";

const filer = {
  primarySSN: "123456789",
  nameLine1: "Jane Doe",
  nameControl: "DOE",
  firstName: "Jane",
  lastName: "Doe",
  address: { line1: "1 Main St", city: "Anywhere", state: "CA", zip: "90001" },
  filingStatus: FilingStatus.Single,
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
    eitc_income_reporting_only: false,
    eitc_qualifying_child_of_other: false,
    eitc_children: [{ first_name: "Alice", last_name: "Doe", days_in_us: 300 }],
    claim_ctc: true,
    ctc_children: [{
      first_name: "Alice",
      last_name: "Doe",
      lived_with_over_half_year: true,
      qualifying_child: true,
      dependent: true,
      us_citizen_national_or_resident: true,
    }],
  };
  const instances = form8862Pdf.instances?.(source, filer, {
    f1040: { line27_eitc: 500, line19_child_tax_credit: 2200 },
  }) ?? [];
  assertEquals(instances.length, 1);
  assertEquals(instances[0].tax_year, 2025);
  assertEquals(instances[0].eitc_child_0_name, "Alice Doe");
  assertEquals(instances[0].eitc_child_0_days, 300);
  assertEquals(instances[0].eitc_has_child, "yes");
  assertEquals(instances[0].ctc_child_0_name, "Alice Doe");
  assertEquals(instances[0].ctc_child_0_citizen, "yes");
});

Deno.test("Form 8862 PDF rejects unclaimed credits and overflow rows", () => {
  const ctc = {
    claim_ctc: true,
    ctc_children: ["Alice", "Betty", "Carol", "David", "Ellen"].map((name) => ({
      first_name: name,
      last_name: "Doe",
      lived_with_over_half_year: true,
      qualifying_child: true,
      dependent: true,
      us_citizen_national_or_resident: true,
    })),
  };
  assertThrows(
    () =>
      form8862Pdf.instances?.(ctc, filer, {
        f1040: { line19_child_tax_credit: 500 },
      }),
    Error,
    "additional statement",
  );
  assertThrows(
    () =>
      form8862Pdf.instances?.(
        {
          claim_eitc: true,
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
    aotc_students: [{
      first_name: "Alice",
      last_name: "Doe",
      eligible: true,
      credit_claimed_four_prior_years: false,
    }],
  };
  const pending = {
    f1040: { line29_refundable_aoc: 1000 },
    f8863: { f8863s: [{ credit_type: "aoc", student_name: "Alice Doe" }] },
  };
  assertEquals(
    form8862Pdf.instances?.(aotc, filer, pending)?.[0].aotc_student_0_name,
    "Alice Doe",
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
