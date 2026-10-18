import { test } from "bun:test";
import { assertEquals } from "@std/assert";
import { createReturnContext } from "./context.ts";
import { parseEmittedReturn } from "./emitted-documents.ts";
import {
  documentCountWhere,
  everyDocument,
  issuableTins,
  hasValue,
  isIssuableTin,
  personNameControlAgrees,
  scheduleReferencedOnce,
  statementAttached,
  validVin,
  validIpPins,
} from "./predicates.ts";
import type { ReturnContext } from "./types.ts";

const header =
  "<Filer><PrimarySSN>123456789</PrimarySSN><PrimaryNameControlTxt>SMIT</PrimaryNameControlTxt></Filer>";

function emitted(documents: string, ats = false): ReturnContext {
  const xml = `<Return><ReturnHeader><TaxYr>2025</TaxYr>${header}</ReturnHeader>` +
    `<ReturnData>${documents}</ReturnData></Return>`;
  return createReturnContext(
    {},
    { primarySSN: "123456789", filingStatus: 1, ats_test_submission: ats },
    new Map(),
    undefined,
    parseEmittedReturn(xml),
  );
}

const dependent = (ssn: string, nc: string) =>
  `<IRS1040 documentId="a"><DependentDetail><DependentNameControlTxt>${nc}</DependentNameControlTxt>` +
  `<DependentSSN>${ssn}</DependentSSN></DependentDetail></IRS1040>`;

test("isIssuableTin accepts SSNs, ITINs and ATINs the SSA or IRS issue", () => {
  for (const tin of ["123456789", "111-22-3333", "912701234", "987654321", "912931234"]) {
    assertEquals(isIssuableTin(tin), true, tin);
  }
});

test("isIssuableTin rejects area 000, 666 and 9XX outside ITIN ranges, group 00 and serial 0000", () => {
  for (const tin of ["000123456", "666123456", "912891234", "912401234", "123001234", "123450000", "12345678"]) {
    assertEquals(isIssuableTin(tin), false, tin);
  }
  assertEquals(isIssuableTin("400001057", true), true);
  // SSNs the SSA voided after they were published (078-05-1120, 219-09-9999).
  assertEquals(isIssuableTin("078051120"), false);
  assertEquals(isIssuableTin("219099999"), false);
});

test("issuableTins keeps the Pub 1436 group-00 exception for ATS returns", () => {
  const doc = '<IRSW2G documentId="g"><PayerSSN>400001057</PayerSSN></IRSW2G>';
  assertEquals(issuableTins("PayerSSN")(emitted(doc)), false);
  assertEquals(issuableTins("PayerSSN")(emitted(doc, true)), true);
});

test("personNameControlAgrees needs the person format and one name control per TIN", () => {
  const ctx = emitted(dependent("123451234", "JONE"));
  const child = (ssn: string, nc: string) =>
    emitted(dependent("123451234", "JONE") + `<X documentId="x"><NC>${nc}</NC><SSN>${ssn}</SSN></X>`);
  assertEquals(personNameControlAgrees("NC", "SSN")(child("123451234", "JONE")), true);
  assertEquals(personNameControlAgrees("NC", "SSN")(child("123451234", "JONS")), false);
  assertEquals(personNameControlAgrees("NC", "SSN")(child("123456789", "SMIT")), true);
  assertEquals(personNameControlAgrees("NC", "SSN")(child("123456789", "SMYT")), false);
  assertEquals(personNameControlAgrees("NC", "SSN")(child("222334444", "J0NE")), false);
  assertEquals(personNameControlAgrees("Missing", "SSN")(ctx), true);
});

test("validIpPins needs six digits other than 000000", () => {
  const pin = (v: string) => emitted(`<X documentId="x"><IdentityProtectionPIN>${v}</IdentityProtectionPIN></X>`);
  assertEquals(validIpPins("IdentityProtectionPIN")(pin("123456")), true);
  assertEquals(validIpPins("IdentityProtectionPIN")(pin("000000")), false);
  assertEquals(validIpPins("IdentityProtectionPIN")(pin("12345")), false);
});

test("documentCountWhere and everyDocument read each copy of a form on its own", () => {
  const ctx = emitted(
    '<IRS8697 documentId="a"><TotalInterestDueOnIncreaseAmt>5</TotalInterestDueOnIncreaseAmt></IRS8697>' +
      '<IRS8697 documentId="b"><Other>1</Other></IRS8697>',
  );
  assertEquals(documentCountWhere("F8697", hasValue("TotalInterestDueOnIncreaseAmt"))(ctx), 1);
  assertEquals(documentCountWhere("F8697")(ctx), 2);
  assertEquals(everyDocument("F8697", hasValue("TotalInterestDueOnIncreaseAmt"))(ctx), false);
  assertEquals(everyDocument("F9999", hasValue("Nothing"))(ctx), true);
});

test("scheduleReferencedOnce needs a parent form for each schedule", () => {
  const schedule = '<IRS5471ScheduleH documentId="h"><A>1</A></IRS5471ScheduleH>';
  const form = '<IRS5471 documentId="f"><A>1</A></IRS5471>';
  assertEquals(scheduleReferencedOnce("F5471ScheduleH", "F5471")(emitted(schedule)), false);
  assertEquals(scheduleReferencedOnce("F5471ScheduleH", "F5471")(emitted(schedule + form)), true);
  assertEquals(scheduleReferencedOnce("F5471ScheduleH", "F5471")(emitted(form)), true);
});

test("statementAttached needs the reference and the statement", () => {
  const form = (ref: string) => `<IRS2210F documentId="f"><PenaltyAmt${ref}>10</PenaltyAmt></IRS2210F>`;
  const statement = '<WaiverExplanationStatement documentId="s"><ExplanationTxt>x</ExplanationTxt></WaiverExplanationStatement>';
  const check = statementAttached("PenaltyAmt", "WaiverExplanationStatement");
  assertEquals(check(emitted(form(' referenceDocumentId="s"') + statement)), true);
  assertEquals(check(emitted(form("") + statement)), false);
  assertEquals(check(emitted(form(' referenceDocumentId="s"'))), false);
});

test("validVin checks characters, the check digit and the model-year code", () => {
  const vin = (v: string, year = "", ats = false) =>
    emitted(`<X documentId="x"><VIN>${v}</VIN>${year && `<VehicleModelYr>${year}</VehicleModelYr>`}</X>`, ats);
  assertEquals(validVin("VIN", "VehicleModelYr")(vin("1HGCM82633A004352", "2003")), true);
  assertEquals(validVin("VIN", "VehicleModelYr")(vin("1HGCM82633A004352", "2025")), false);
  assertEquals(validVin("VIN")(vin("1HGCM82633A004353")), false);
  assertEquals(validVin("VIN")(vin("1HGCM8263IA004352")), false);
  assertEquals(validVin("VIN")(vin("1HGBH41JXMN108186", "", true)), true);
});
