import { test } from "bun:test";
import { assertEquals } from "@std/assert";
import { emittedRulePasses } from "../../../../../../core/test-utils/emitted-rule.ts";
import { F8863_RULES } from "./f8863.ts";

const student = (ssn: string, line30: number, line31: number) =>
  `<StudentAndEducationalInstnGrp><StudentSSN>${ssn}</StudentSSN>` +
  (line30 ? `<AmerOppCreditNetCalcExpnssAmt>${line30}</AmerOppCreditNetCalcExpnssAmt>` : "") +
  (line31 ? `<LifetimeQualifiedExpensesAmt>${line31}</LifetimeQualifiedExpensesAmt>` : "") +
  "</StudentAndEducationalInstnGrp>";
const passes = (id: string, students: string) =>
  emittedRulePasses(F8863_RULES, id, {
    documents: '<IRS1040 documentId="a"><DependentDetail><DependentSSN>400001057</DependentSSN></DependentDetail></IRS1040>' +
      `<IRS8863 documentId="e">${students}</IRS8863>`,
  });

test("F8863-003-03 lets each student claim one education credit once", () => {
  assertEquals(passes("F8863-003-03", student("400001001", 4000, 0) + student("400001057", 0, 3000)), true);
  assertEquals(passes("F8863-003-03", student("400001001", 4000, 0) + student("400001001", 0, 3000)), false);
  assertEquals(passes("F8863-003-03", student("400001001", 4000, 3000)), false);
});

test("F8863-001-04 accepts only filer and dependent SSNs as students", () => {
  assertEquals(passes("F8863-001-04", student("400001001", 4000, 0) + student("400001057", 4000, 0)), true);
  assertEquals(passes("F8863-001-04", student("400001099", 4000, 0)), false);
});
