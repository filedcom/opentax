import { test } from "bun:test";
import { assertEquals } from "@std/assert";
import { emittedRulePasses } from "../../../../../../core/test-utils/emitted-rule.ts";
import { F2441_RULES } from "./f2441.ts";

const ret = (form2441: string, extra = "") =>
  '<IRS1040 documentId="a"><DependentDetail><DependentSSN>400001057</DependentSSN></DependentDetail></IRS1040>' +
  `<IRS2441 documentId="d">${form2441}</IRS2441>${extra}`;

test("F2441-024-01 rejects a care provider who is a dependent", () => {
  const provider = (id: string) => `<CareProviderGrp>${id}<PaidAmt>500</PaidAmt></CareProviderGrp>`;
  assertEquals(emittedRulePasses(F2441_RULES, "F2441-024-01", { documents: ret(provider("<EIN>000000041</EIN>")) }), true);
  assertEquals(emittedRulePasses(F2441_RULES, "F2441-024-01", { documents: ret(provider("<SSN>400001057</SSN>")) }), false);
});

test("F2441-011-02 needs every CPYE detail once any is given", () => {
  const statement = (body: string) =>
    `<CPYEExplanationStatement documentId="s"><CPYEInfo>${body}</CPYEInfo></CPYEExplanationStatement>`;
  const full = "<CPYECreditAmt>300</CPYECreditAmt><CPYEPersonFullName><PersonFirstNm>A</PersonFirstNm></CPYEPersonFullName>" +
    "<CPYESSN>400001057</CPYESSN><ExplanationTxt>Prior year expenses</ExplanationTxt>";
  assertEquals(emittedRulePasses(F2441_RULES, "F2441-011-02", { documents: ret("", statement(full)) }), true);
  assertEquals(emittedRulePasses(F2441_RULES, "F2441-011-02", { documents: ret("", statement("<CPYECreditAmt>300</CPYECreditAmt>")) }), false);
});

test("F2441-524 needs one name control per qualifying person SSN", () => {
  const person = (nc: string) =>
    `<QualifyingPersonGrp><QualifyingPersonNameControlTxt>${nc}</QualifyingPersonNameControlTxt>` +
    "<QualifyingPersonSSN>400001057</QualifyingPersonSSN></QualifyingPersonGrp>";
  const dependent = '<IRS1040 documentId="a"><DependentDetail><DependentNameControlTxt>BARK</DependentNameControlTxt>' +
    "<DependentSSN>400001057</DependentSSN></DependentDetail></IRS1040>";
  const header = "<Filer><PrimarySSN>400001039</PrimarySSN></Filer>";
  const check = (nc: string) =>
    emittedRulePasses(F2441_RULES, "F2441-524", {
      header,
      documents: dependent + `<IRS2441 documentId="d">${person(nc)}</IRS2441>`,
    });
  assertEquals(check("BARK"), false); // group 00 is only an ATS test SSN
  assertEquals(
    emittedRulePasses(F2441_RULES, "F2441-524", {
      header,
      documents: dependent.replaceAll("400001057", "400011057") +
        `<IRS2441 documentId="d">${person("BARK").replace("400001057", "400011057")}</IRS2441>`,
    }),
    true,
  );
  assertEquals(
    emittedRulePasses(F2441_RULES, "F2441-524", {
      header,
      documents: dependent.replaceAll("400001057", "400011057") +
        `<IRS2441 documentId="d">${person("BARR").replace("400001057", "400011057")}</IRS2441>`,
    }),
    false,
  );
});
