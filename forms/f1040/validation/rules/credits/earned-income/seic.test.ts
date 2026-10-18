import { test } from "bun:test";
import { assertEquals } from "@std/assert";
import { emittedRulePasses } from "../../../../../../core/test-utils/emitted-rule.ts";
import { SEIC_RULES } from "./seic.ts";

const child = (body: string) => `<QualifyingChildInformation>${body}</QualifyingChildInformation>`;
const passes = (id: string, children: string, header = "", filingStatus = 1) =>
  emittedRulePasses(SEIC_RULES, id, {
    documents: `<IRS1040ScheduleEIC documentId="e">${children}</IRS1040ScheduleEIC>`,
    header,
    filingStatus,
  });

test("SEIC-F1040-004-05 needs 12 months only for the child born in the tax year", () => {
  const older = child("<ChildBirthYr>2015</ChildBirthYr><MonthsChildLivedWithYouCnt>7</MonthsChildLivedWithYouCnt>");
  assertEquals(passes("SEIC-F1040-004-05", older + child("<ChildBirthYr>2025</ChildBirthYr><MonthsChildLivedWithYouCnt>12</MonthsChildLivedWithYouCnt>")), true);
  assertEquals(passes("SEIC-F1040-004-05", child("<ChildBirthYr>2025</ChildBirthYr><MonthsChildLivedWithYouCnt>7</MonthsChildLivedWithYouCnt>") + older), false);
  assertEquals(passes("SEIC-F1040-004-05", child("<ChildBirthYr>2025</ChildBirthYr><KidnappedChildCd>KC</KidnappedChildCd>")), true);
});

test("SEIC-F1040-005-10 needs a student or disabled answer for a child 19 to 23", () => {
  assertEquals(passes("SEIC-F1040-005-10", child("<ChildBirthYr>2004</ChildBirthYr><ChildIsAStudentUnder24Ind>true</ChildIsAStudentUnder24Ind>")), true);
  assertEquals(passes("SEIC-F1040-005-10", child("<ChildBirthYr>2004</ChildBirthYr><ChildIsAStudentUnder24Ind>false</ChildIsAStudentUnder24Ind>")), false);
  assertEquals(passes("SEIC-F1040-005-10", child("<ChildBirthYr>2010</ChildBirthYr>")), true);
});

test("SEIC-F1040-536-04 rejects a child born before the primary taxpayer", () => {
  const born = "<SelfSelectPINGrp><PrimaryBirthDt>1990-04-01</PrimaryBirthDt></SelfSelectPINGrp>";
  assertEquals(passes("SEIC-F1040-536-04", child("<ChildBirthYr>1990</ChildBirthYr>"), born), true);
  assertEquals(passes("SEIC-F1040-536-04", child("<ChildBirthYr>1989</ChildBirthYr>"), born), false);
});

test("SEIC-F1040-501-02 needs an issuable SSN whose name control matches the dependent's", () => {
  const dependent = '<IRS1040 documentId="a"><DependentDetail><DependentNameControlTxt>BARK</DependentNameControlTxt>' +
    "<DependentSSN>123451057</DependentSSN></DependentDetail></IRS1040>";
  const eic = (nc: string, ssn: string) =>
    emittedRulePasses(SEIC_RULES, "SEIC-F1040-501-02", {
      documents: dependent + `<IRS1040ScheduleEIC documentId="e">` +
        child(`<QualifyingChildNameControlTxt>${nc}</QualifyingChildNameControlTxt><QualifyingChildSSN>${ssn}</QualifyingChildSSN>`) +
        "</IRS1040ScheduleEIC>",
    });
  assertEquals(eic("BARK", "123451057"), true);
  assertEquals(eic("BARR", "123451057"), false);
  assertEquals(eic("BARK", "666451057"), false);
});

test("SEIC-F1040-534-03 lists a child marked DIED only for the tax year of birth", () => {
  assertEquals(passes("SEIC-F1040-534-03", child("<DiedLiteralCd>DIED</DiedLiteralCd><ChildBirthYr>2025</ChildBirthYr>")), true);
  assertEquals(passes("SEIC-F1040-534-03", child("<DiedLiteralCd>DIED</DiedLiteralCd><ChildBirthYr>2024</ChildBirthYr>")), false);
  assertEquals(passes("SEIC-F1040-534-03", child("<ChildBirthYr>2026</ChildBirthYr>")), false);
});

test("SEIC-F1040-506-04 rejects a child listed twice or who is a filer", () => {
  const ssn = (v: string) => child(`<QualifyingChildSSN>${v}</QualifyingChildSSN>`);
  assertEquals(passes("SEIC-F1040-506-04", ssn("123451057") + ssn("123451058")), true);
  assertEquals(passes("SEIC-F1040-506-04", ssn("123451057") + ssn("123451057")), false);
  assertEquals(passes("SEIC-F1040-506-04", ssn("400001001")), false);
});

test("SEIC-F1040-996-01 needs a six-digit IP PIN when one is entered", () => {
  assertEquals(passes("SEIC-F1040-996-01", child("<IdentityProtectionPIN>123456</IdentityProtectionPIN>")), true);
  assertEquals(passes("SEIC-F1040-996-01", child("<IdentityProtectionPIN>000000</IdentityProtectionPIN>")), false);
});
