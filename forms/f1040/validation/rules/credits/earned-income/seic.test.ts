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
