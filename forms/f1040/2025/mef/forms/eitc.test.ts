import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { eitc } from "./eitc.ts";

const child = {
  first_name: "Ada",
  last_name: "Taxpayer",
  name_control: "TAXP",
  ssn: "111-22-3334",
  ssn_valid_for_employment: true,
  tin_issued_by_due_date: true,
  dob: "2017-06-15",
  irs_relationship_code: "DAUGHTER",
  months_in_home: 12,
  ip_pin: "123456",
};

Deno.test("Schedule EIC serializes qualifying child identity and IRS line answers", () => {
  const xml = eitc.build({
    credit_amount: 2_000,
    qualifying_children: 2,
    qualifying_child_details: [
      child,
      {
        ...child,
        first_name: "Ben",
        ssn: "111-22-3335",
        dob: "2006-01-01",
        irs_relationship_code: "SON",
        full_time_student: true,
        ip_pin: undefined,
      },
    ],
  });
  assertEquals((xml.match(/<QualifyingChildInformation>/g) ?? []).length, 2);
  assertStringIncludes(xml, "<QualifyingChildNameControlTxt>TAXP</QualifyingChildNameControlTxt>");
  assertStringIncludes(xml, "<QualifyingChildSSN>111223334</QualifyingChildSSN>");
  assertStringIncludes(xml, "<ChildBirthYr>2017</ChildBirthYr>");
  assertStringIncludes(xml, "<ChildRelationshipCd>DAUGHTER</ChildRelationshipCd>");
  assertStringIncludes(xml, "<MonthsChildLivedWithYouCnt>12</MonthsChildLivedWithYouCnt>");
  assertStringIncludes(xml, "<ChildIsAStudentUnder24Ind>true</ChildIsAStudentUnder24Ind>");
});

Deno.test("childless EITC does not create Schedule EIC", () => {
  assertEquals(eitc.build({ credit_amount: 649, qualifying_children: 0 }), "");
});

Deno.test("unclaimed EITC does not create Schedule EIC", () => {
  assertEquals(eitc.build({
    credit_amount: 0,
    qualifying_children: 1,
    qualifying_child_details: [child],
  }), "");
});

Deno.test("Schedule EIC rejects a child count without matching rows", () => {
  assertThrows(
    () => eitc.build({ credit_amount: 1_000, qualifying_children: 1 }),
    Error,
    "count does not match child detail",
  );
});

Deno.test("Schedule EIC rejects duplicate SSNs and invalid residence", () => {
  assertThrows(
    () => eitc.build({
      credit_amount: 1_000,
      qualifying_children: 2,
      qualifying_child_details: [child, { ...child, first_name: "Ben" }],
    }),
    Error,
    "unique nine-digit SSN",
  );
  assertThrows(
    () => eitc.build({
      credit_amount: 1_000,
      qualifying_children: 1,
      qualifying_child_details: [{ ...child, months_in_home: 6 }],
    }),
    Error,
    "seven through twelve months",
  );
});

Deno.test("Schedule EIC rejects an employment-invalid SSN", () => {
  assertThrows(
    () => eitc.build({
      credit_amount: 1_000,
      qualifying_children: 1,
      qualifying_child_details: [{
        ...child,
        ssn_valid_for_employment: false,
      }],
    }),
    Error,
    "timely employment-valid SSN",
  );
});
