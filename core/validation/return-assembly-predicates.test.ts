import { test } from "bun:test";
import { assertEquals } from "@std/assert";
import { createReturnContext } from "./context.ts";
import { parseEmittedReturn } from "./emitted-documents.ts";
import {
  dateBeforeReceipt,
  isIssuableTin,
  issuableTins,
  plausibleBirthDate,
  postOriginalReturn,
  priorYearReturn,
  validFiveDigitPins,
  validIpPins,
} from "./predicates.ts";

const ctx = (header: string, documents = "", ats = false, forms: Record<string, number> = {}) =>
  createReturnContext(
    {},
    { primarySSN: "400011234", filingStatus: 1, ...(ats ? { ats_test_submission: true } : {}) },
    new Map(),
    new Map(Object.entries(forms)),
    parseEmittedReturn(
      `<Return><ReturnHeader><TaxYr>2025</TaxYr>${header}</ReturnHeader><ReturnData>${documents}</ReturnData></Return>`,
    ),
  );

test("isIssuableTin rejects SSA-invalid areas, groups and serials", () => {
  assertEquals(isIssuableTin("400-01-1234"), true);
  assertEquals(isIssuableTin("000011234"), false);
  assertEquals(isIssuableTin("666011234"), false);
  assertEquals(isIssuableTin("400001234"), false);
  assertEquals(isIssuableTin("400010000"), false);
  assertEquals(isIssuableTin("078051120"), false);
  assertEquals(isIssuableTin("40001123"), false);
});

test("isIssuableTin accepts ITIN and ATIN groups only for 9xx", () => {
  assertEquals(isIssuableTin("912701234"), true);
  assertEquals(isIssuableTin("912501234"), true);
  assertEquals(isIssuableTin("912931234"), true);
  assertEquals(isIssuableTin("912451234"), false);
  assertEquals(isIssuableTin("912891234"), false);
  assertEquals(isIssuableTin("912661234"), false);
});

test("issuableTins allows the Pub 1436 group 00 only on an ATS submission", () => {
  const header = "";
  const check = issuableTins("PrimarySSN");
  const ats = createReturnContext({}, { primarySSN: "400001234", filingStatus: 1, ats_test_submission: true }, new Map());
  const live = createReturnContext({}, { primarySSN: "400001234", filingStatus: 1 }, new Map());
  assertEquals(check(ats), true);
  assertEquals(check(live), false);
  assertEquals(check(ctx(header)), true);
});

test("validIpPins and validFiveDigitPins check length and all zeros", () => {
  assertEquals(validIpPins("IdentityProtectionPIN")(ctx("<IdentityProtectionPIN>123456</IdentityProtectionPIN>")), true);
  assertEquals(validIpPins("IdentityProtectionPIN")(ctx("<IdentityProtectionPIN>000000</IdentityProtectionPIN>")), false);
  assertEquals(validIpPins("IdentityProtectionPIN")(ctx("<IdentityProtectionPIN>12345</IdentityProtectionPIN>")), false);
  assertEquals(validIpPins("IdentityProtectionPIN")(ctx("")), true);
  assertEquals(validFiveDigitPins("PrimaryPriorYearPIN")(ctx("<PrimaryPriorYearPIN>54321</PrimaryPriorYearPIN>")), true);
  assertEquals(validFiveDigitPins("PrimaryPriorYearPIN")(ctx("<PrimaryPriorYearPIN>00000</PrimaryPriorYearPIN>")), false);
});

test("dateBeforeReceipt compares a date with the ReturnTs day", () => {
  const ts = "<ReturnTs>2026-02-01T10:00:00-05:00</ReturnTs>";
  const at = (d: string) => ctx(`${ts}<TaxPeriodEndDt>${d}</TaxPeriodEndDt>`);
  assertEquals(dateBeforeReceipt("TaxPeriodEndDt", true)(at("2025-12-31")), true);
  assertEquals(dateBeforeReceipt("TaxPeriodEndDt", true)(at("2026-02-01")), false);
  assertEquals(dateBeforeReceipt("TaxPeriodEndDt")(at("2026-02-01")), true);
  assertEquals(dateBeforeReceipt("TaxPeriodEndDt")(at("2026-02-02")), false);
  assertEquals(dateBeforeReceipt("TaxPeriodEndDt")(ctx("<TaxPeriodEndDt>2026-12-31</TaxPeriodEndDt>")), true);
});

test("plausibleBirthDate needs a real date within 125 years before TaxYr", () => {
  const born = (d: string) => ctx(`<PrimaryBirthDt>${d}</PrimaryBirthDt>`);
  assertEquals(plausibleBirthDate("PrimaryBirthDt")(born("1980-02-29")), true);
  assertEquals(plausibleBirthDate("PrimaryBirthDt")(born("1981-02-29")), false);
  assertEquals(plausibleBirthDate("PrimaryBirthDt")(born("2026-01-01")), false);
  assertEquals(plausibleBirthDate("PrimaryBirthDt")(born("1899-12-31")), false);
});

test("priorYearReturn and postOriginalReturn read TaxYr, ReturnTs and the amended checkboxes", () => {
  assertEquals(priorYearReturn(ctx("<ReturnTs>2026-02-01T10:00:00-05:00</ReturnTs>")), false);
  assertEquals(priorYearReturn(ctx("<ReturnTs>2027-02-01T10:00:00-05:00</ReturnTs>")), true);
  assertEquals(priorYearReturn(ctx("")), false);
  const f1040 = (body: string) => `<IRS1040 documentId="a">${body}</IRS1040>`;
  assertEquals(postOriginalReturn(ctx("", f1040("<AmendedReturnInd>X</AmendedReturnInd>"))), true);
  assertEquals(postOriginalReturn(ctx("", f1040(""), false, { form1040x: 1 })), true);
  assertEquals(postOriginalReturn(ctx("", f1040(""))), false);
});
