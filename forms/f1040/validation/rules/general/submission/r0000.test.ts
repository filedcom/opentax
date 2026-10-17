import { test } from "bun:test";
import { assertEquals } from "@std/assert";
import { emittedRulePasses } from "../../../../../../core/test-utils/emitted-rule.ts";
import { createReturnContext } from "../../../../../../core/validation/context.ts";
import { parseEmittedReturn } from "../../../../../../core/validation/emitted-documents.ts";
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

const checks = (id: string, header: string, documents = '<IRS1040 documentId="a"></IRS1040>') => {
  const rule = R0000_RULES.find((r) => r.ruleNumber === id);
  if (!rule?.check) throw new Error(`Missing rule ${id}`);
  const xml = `<Return returnVersion="2025v5.4"><ReturnHeader><TaxYr>2025</TaxYr>${header}</ReturnHeader>` +
    `<ReturnData documentCnt="1">${documents}</ReturnData></Return>`;
  return rule.check(
    createReturnContext({}, { primarySSN: "400011001", filingStatus: 1 }, new Map(), new Map(), parseEmittedReturn(xml)),
  );
};

test("R0000-500-01 needs a valid SSN and the primary's own name control", () => {
  const filer = (ssn: string, control: string) =>
    `<Filer><PrimarySSN>${ssn}</PrimarySSN><NameLine1Txt>JANE A&lt;NG-LEE&lt;</NameLine1Txt><PrimaryNameControlTxt>${control}</PrimaryNameControlTxt></Filer>`;
  assertEquals(checks("R0000-500-01", filer("400011001", "NG-L")), true);
  assertEquals(checks("R0000-500-01", filer("400011001", "NGLE")), true);
  assertEquals(checks("R0000-500-01", filer("400011001", "JANE")), false);
  assertEquals(checks("R0000-500-01", filer("400011001", "ng")), false);
});

test("R0000-504-02 and R0000-533-02 check each dependent's lookup key", () => {
  const dependent = (ssn: string, control: string) =>
    `<IRS1040 documentId="a"><DependentDetail><DependentFirstNm>Ann</DependentFirstNm><DependentLastNm>Smith</DependentLastNm>` +
    `<DependentNameControlTxt>${control}</DependentNameControlTxt><DependentSSN>${ssn}</DependentSSN></DependentDetail></IRS1040>`;
  assertEquals(checks("R0000-504-02", "", dependent("400011002", "SMIT")), true);
  assertEquals(checks("R0000-504-02", "", dependent("400011002", "ANN")), false);
  assertEquals(checks("R0000-533-02", "", dependent("400011002", "SMIT")), true);
  assertEquals(checks("R0000-533-02", "", dependent("000000000", "SMIT")), false);
});

test("R0000-905-01 and R0000-906-02 reject placeholder EFINs and non-Federal Reserve RTNs", () => {
  const efin = (v: string) => `<OriginatorGrp><EFIN>${v}</EFIN><OriginatorTypeCd>ERO</OriginatorTypeCd></OriginatorGrp>`;
  assertEquals(checks("R0000-905-01", efin("123456")), true);
  assertEquals(checks("R0000-905-01", efin("000000")), false);
  const rtn = (v: string) => `<IRS1040 documentId="a"><RoutingTransitNum>${v}</RoutingTransitNum></IRS1040>`;
  assertEquals(checks("R0000-906-02", "", rtn("021000021")), true);
  assertEquals(checks("R0000-906-02", "", rtn("801000021")), false);
});

test("R0000-004-01 and R0000-067 check the return type, version and attachment names", () => {
  assertEquals(checks("R0000-004-01", "<ReturnTypeCd>1040</ReturnTypeCd>"), true);
  assertEquals(checks("R0000-004-01", "<ReturnTypeCd>1120</ReturnTypeCd>"), false);
  const attachments = (a: string, b: string) =>
    `<BinaryAttachment documentId="b1"><DocumentTypeCd>PDF</DocumentTypeCd><Desc>One</Desc><AttachmentLocationTxt>${a}</AttachmentLocationTxt></BinaryAttachment>` +
    `<BinaryAttachment documentId="b2"><DocumentTypeCd>PDF</DocumentTypeCd><Desc>Two</Desc><AttachmentLocationTxt>${b}</AttachmentLocationTxt></BinaryAttachment>`;
  assertEquals(checks("R0000-067", "", attachments("a.pdf", "b.pdf")), true);
  assertEquals(checks("R0000-067", "", attachments("a.pdf", "A.PDF")), false);
  assertEquals(checks("R0000-236", "", attachments("a.pdf", "b.pdf")), true);
});
