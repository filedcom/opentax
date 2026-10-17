import { test } from "bun:test";
import { assertEquals } from "@std/assert";
import { emittedRulePasses } from "../../../../../../core/test-utils/emitted-rule.ts";
import { R0000_RULES } from "./r0000.ts";

const filer = (state: string, zip: string) =>
  `<Filer><USAddress><StateAbbreviationCd>${state}</StateAbbreviationCd><ZIPCd>${zip}</ZIPCd></USAddress></Filer>`;
const passes = (id: string, header: string, documents = '<IRS1040 documentId="a"></IRS1040>') =>
  emittedRulePasses(R0000_RULES, id, { header, documents });

test("R0000-007-02 and R0000-046-01 check the filer ZIP against the IRS state list", () => {
  assertEquals(passes("R0000-007-02", filer("DE", "19702")), true);
  assertEquals(passes("R0000-007-02", filer("SC", "19702")), false);
  assertEquals(passes("R0000-046-01", filer("DC", "20500")), true);
  assertEquals(passes("R0000-046-01", filer("DE", "19700")), false);
});

test("R0000-205 caps the deduction at the lesser 8995 limitation", () => {
  const ret = (deduction: number) =>
    `<IRS1040 documentId="a"><QualifiedBusinessIncomeDedAmt>${deduction}</QualifiedBusinessIncomeDedAmt></IRS1040>` +
    '<IRS8995 documentId="q"><QBIDedBfrIncomeLimitationAmt>900</QBIDedBfrIncomeLimitationAmt><IncomeLimitationAmt>700</IncomeLimitationAmt></IRS8995>';
  const check = (deduction: number) =>
    emittedRulePasses(R0000_RULES, "R0000-205", { documents: ret(deduction), forms: { form8995: 1 } });
  assertEquals(check(700), true);
  assertEquals(check(701), false);
});

test("R0000-030-01 compares the practitioner PIN EFIN with the originator's own", () => {
  const header = (practitioner: string) =>
    `<OriginatorGrp><EFIN>123456</EFIN><OriginatorTypeCd>ERO</OriginatorTypeCd><PractitionerPINGrp><EFIN>${practitioner}</EFIN><PIN>12345</PIN></PractitionerPINGrp></OriginatorGrp>`;
  assertEquals(passes("R0000-030-01", header("123456")), true);
  assertEquals(passes("R0000-030-01", header("654321")), false);
});
