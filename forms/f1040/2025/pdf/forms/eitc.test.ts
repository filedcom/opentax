import { assertEquals, assertThrows } from "@std/assert";
import { eitcPdf } from "./eitc.ts";

const child = {
  first_name: "Ada",
  last_name: "Taxpayer",
  name_control: "TAXP",
  ssn: "111-22-3334",
  dob: "2017-06-15",
  irs_relationship_code: "DAUGHTER",
  months_in_home: 12,
};

Deno.test("Schedule EIC PDF maps child rows, not income into line 6 months", () => {
  const mapped = new Map(
    eitcPdf.fields.map((entry) => [entry.domainKey, entry.pdfField]),
  );
  assertEquals(
    mapped.get("child1_months_in_home"),
    "topmostSubform[0].Page1[0].Line6_Child1_ReadOrder[0].f1_24[0]",
  );
  assertEquals(
    mapped.get("child2_months_in_home"),
    "topmostSubform[0].Page1[0].Line6_Child2_ReadOrder[0].f1_25[0]",
  );
  assertEquals(
    mapped.get("child3_months_in_home"),
    "topmostSubform[0].Page1[0].f1_26[0]",
  );
  assertEquals(mapped.has("earned_income"), false);
  assertEquals(mapped.has("investment_income"), false);
  assertEquals(mapped.has("qualifying_children"), false);
  assertEquals(
    eitcPdf.fields.some((entry) =>
      entry.domainKey === "child1_student" &&
      entry.pdfField ===
        "topmostSubform[0].Page1[0].Line4a_Child1_ReadOrder[0].Yes_ReadOrder[0].c1_1[0]"
    ),
    true,
  );
});

Deno.test("Schedule EIC PDF projects qualifying-child identity and residency", () => {
  const projected = eitcPdf.projectFields?.({
    credit_amount: 3_000,
    qualifying_children: 1,
    qualifying_child_details: [child],
  }, {}) ?? {};
  assertEquals(projected.child1_name, "Ada Taxpayer");
  assertEquals(projected.child1_ssn, "111223334");
  assertEquals(projected.child1_birth_year_digit1, "2");
  assertEquals(projected.child1_birth_year_digit4, "7");
  assertEquals(projected.child1_relationship, "DAUGHTER");
  assertEquals(projected.child1_months_in_home, 12);
  assertEquals(projected.child1_student, undefined);
});

Deno.test("Schedule EIC PDF needs explicit adult child line 4 answers", () => {
  const older = { ...child, dob: "2005-06-15" };
  assertThrows(
    () =>
      eitcPdf.projectFields?.({
        qualifying_children: 1,
        qualifying_child_details: [older],
      }, {}),
    Error,
    "line 4a student answer",
  );
  const projected = eitcPdf.projectFields?.({
    qualifying_children: 1,
    qualifying_child_details: [{
      ...older,
      full_time_student: false,
      disabled: true,
    }],
  }, {}) ?? {};
  assertEquals(projected.child1_student, false);
  assertEquals(projected.child1_disabled, true);
});

Deno.test("Schedule EIC PDF cannot print a child credit without child details", () => {
  assertThrows(
    () =>
      eitcPdf.projectFields?.({
        credit_amount: 3_000,
        qualifying_children: 1,
      }, {}),
    Error,
    "count does not match qualifying-child details",
  );
});
