import { test } from "bun:test";
import { assertEquals } from "@std/assert";
import { createReturnContext } from "../../../../../../core/validation/context.ts";
import { parseEmittedReturn } from "../../../../../../core/validation/emitted-documents.ts";
import { EnvelopeFact } from "../../../../../../core/validation/predicates.ts";
import { FPYMT_RULES, returnDueDay } from "./fpymt.ts";

const day = (iso: string) => Date.parse(`${iso}T00:00:00Z`) / 86_400_000;

function passes(
  id: string,
  documents: string,
  signed = "2026-02-01",
  processed?: string,
): boolean {
  const rule = FPYMT_RULES.find((r) => r.ruleNumber === id);
  if (!rule?.check) throw new Error(`Missing rule ${id}`);
  const xml = `<Return><ReturnHeader><TaxYr>2025</TaxYr><TaxPeriodEndDt>2025-12-31</TaxPeriodEndDt>` +
    `<PrimarySignatureDt>${signed}</PrimarySignatureDt></ReturnHeader><ReturnData>${documents}</ReturnData></Return>`;
  return rule.check(createReturnContext(
    {},
    {
      primarySSN: "400001001",
      filingStatus: 1,
      ...(processed ? { [EnvelopeFact.ProcessingDate]: processed } : {}),
    },
    new Map(),
    new Map(),
    parseEmittedReturn(xml),
  ));
}

const payment = (date: string) =>
  `<IRSPayment documentId="p"><PaymentAmt>100</PaymentAmt><RequestedPaymentDt>${date}</RequestedPaymentDt></IRSPayment>`;
const es = (...dates: string[]) =>
  dates.map((d, i) =>
    `<IRSESPayment documentId="e${i}"><PaymentAmt>100</PaymentAmt><EstimatedPaymentDueDt>${d}</EstimatedPaymentDueDt></IRSESPayment>`
  ).join("");

test("the Form 1040 due date moves past weekends and Emancipation Day", () => {
  assertEquals(returnDueDay(2025), day("2026-04-15"));
  assertEquals(returnDueDay(2016), day("2017-04-18"));
  assertEquals(returnDueDay(2021), day("2022-04-18"));
  assertEquals(returnDueDay(2017), day("2018-04-17"));
});

test("RequestedPaymentDt is bounded by the earliest receipt and the due date", () => {
  assertEquals(passes("FPYMT-071-01", payment("2026-01-28")), true);
  assertEquals(passes("FPYMT-071-01", payment("2026-01-26")), false);
  assertEquals(passes("FPYMT-072-01", payment("2026-04-15")), true);
  assertEquals(passes("FPYMT-072-01", payment("2026-04-16")), false);
  // Signed after the due date: a late return pays by the day it is received.
  assertEquals(passes("FPYMT-072-01", payment("2026-05-02"), "2026-05-01"), true);
  assertEquals(passes("FPYMT-074-01", payment("2026-05-01"), "2026-05-01"), true);
  assertEquals(passes("FPYMT-074-01", payment("2026-05-02"), "2026-05-01"), false);
  assertEquals(
    passes("FPYMT-071-01", payment("2026-02-03"), "2026-02-01", "2026-02-10"),
    false,
  );
});

test("IRS ES Payment Records have distinct dates within a year of receipt", () => {
  assertEquals(passes("FPYMT-045-02", es("2026-04-15", "2026-06-15")), true);
  assertEquals(passes("FPYMT-045-02", es("2026-04-15", "2026-04-15")), false);
  assertEquals(passes("FPYMT-087", es("2027-01-15")), true);
  assertEquals(passes("FPYMT-087", es("2027-02-02")), false);
  assertEquals(passes("FPYMT-086", es("2026-01-15")), false);
});
