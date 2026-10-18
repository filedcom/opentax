import { test } from "bun:test";
import { assertEquals } from "@std/assert";
import { createReturnContext } from "./context.ts";
import { parseEmittedReturn } from "./emitted-documents.ts";
import {
  attachedAt,
  dateNotAfterReceipt,
  dateOf,
  daysBetween,
  documentCount,
  hasValue,
  referencedByExactlyOne,
} from "./mod.ts";

function context(documents: string, header = "") {
  return createReturnContext(
    {},
    { primarySSN: "400001001", filingStatus: 1 },
    new Map(),
    undefined,
    parseEmittedReturn(
      `<Return><ReturnHeader>${header}</ReturnHeader><ReturnData>${documents}</ReturnData></Return>`,
    ),
  );
}

const k1 = `<IRS8865ScheduleK1 documentId="K1"><EIN>123456789</EIN></IRS8865ScheduleK1>`;

test("the parser keeps each document's id, root attributes and references", () => {
  const ctx = context(
    `<IRS2555 documentId="A" claimFrgnEarnIncWaiverCd="CLAIMING WAIVER" referenceDocumentId="S1"><Grp><Amt referenceDocumentId="S2 S3">5</Amt></Grp></IRS2555>`,
  );
  assertEquals(ctx.documentReferences!(), [
    { prefix: "F2555", documentId: "A", references: ["S1", "S2", "S3"] },
  ]);
  assertEquals(ctx.field("claimFrgnEarnIncWaiverCd"), "CLAIMING WAIVER");
  assertEquals(ctx.field("Grp/Amt@referenceDocumentId"), "S2 S3");
});

test("referencedByExactlyOne: one parent passes; none or two fail", () => {
  const check = referencedByExactlyOne("IRS8865ScheduleK1", "IRS8865");
  const parent = (id: string) =>
    `<IRS8865 documentId="${id}" referenceDocumentId="K1"></IRS8865>`;
  assertEquals(check(context(parent("P1") + k1)), true);
  assertEquals(check(context(k1)), false);
  assertEquals(check(context(parent("P1") + parent("P2") + k1)), false);
  assertEquals(check(context(parent("P1"))), true);
});

test("attachedAt: the element must name an emitted statement of that tag", () => {
  const check = attachedAt("OtherIncomeLossAmt", "ItemizedOtherIncomeLossSch");
  const form = (ref: string) =>
    `<IRS8865 documentId="P"><OtherIncomeLossAmt referenceDocumentId="${ref}">5</OtherIncomeLossAmt></IRS8865>`;
  const statement = `<ItemizedOtherIncomeLossSch documentId="S"></ItemizedOtherIncomeLossSch>`;
  assertEquals(check(context(form("S") + statement)), true);
  assertEquals(check(context(form("S"))), false);
  assertEquals(check(context(form("X") + statement)), false);
});

test("documentCount counts emitted documents satisfying the check", () => {
  const ctx = context(
    `<IRS1116 documentId="A"><X>1</X></IRS1116><IRS1116 documentId="B"></IRS1116>`,
  );
  assertEquals(documentCount("F1116")(ctx), 2);
  assertEquals(documentCount("F1116", hasValue("X"))(ctx), 1);
});

test("dateOf and daysBetween read dates and timestamps; absent is NaN", () => {
  const ctx = context(
    "",
    "<ReturnTs>2026-02-01T10:00:00-05:00</ReturnTs><TaxPeriodBeginDt>2025-01-01</TaxPeriodBeginDt>",
  );
  assertEquals(dateOf("ReturnHeader/ReturnTs")(ctx), Date.UTC(2026, 1, 1));
  assertEquals(dateOf("TaxPeriodBeginDt", -1)(ctx), Date.UTC(2024, 0, 1));
  assertEquals(daysBetween("ReturnTs", "TaxPeriodBeginDt")(ctx), 396);
  assertEquals(Number.isNaN(dateOf("MissingDt")(ctx)), true);
});

test("dateNotAfterReceipt bounds a date by the Return Header ReturnTs", () => {
  const ts = "<ReturnTs>2026-02-01T10:00:00-05:00</ReturnTs>";
  const doc = (dt: string) =>
    `<IRS2555 documentId="A"><EndDt>${dt}</EndDt></IRS2555>`;
  const check = dateNotAfterReceipt("EndDt");
  assertEquals(check(context(doc("2026-02-01"), ts)), true);
  assertEquals(check(context(doc("2026-02-02"), ts)), false);
  assertEquals(check(context(doc("2025-12-31"))), false);
  assertEquals(check(context("", ts)), true);
});
