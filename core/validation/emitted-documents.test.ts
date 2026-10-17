import { test } from "bun:test";
import { assertEquals } from "@std/assert";
import { parseEmittedReturn } from "./emitted-documents.ts";
import { createReturnContext } from "./context.ts";
import { evaluateRules } from "./engine.ts";
import { alwaysPass, eqField, hasValue, rule, sumOfAll } from "./mod.ts";

const xml = `<Return><ReturnHeader><Filer><NameLine1Txt>ALEX&lt;EXAMPLE</NameLine1Txt></Filer></ReturnHeader><ReturnData>` +
  `<IRS1040 documentId="a"><TotalIncomeAmt>900</TotalIncomeAmt></IRS1040>` +
  `<IRS1040Schedule1 documentId="b"><BusinessIncomeLossAmt>300</BusinessIncomeLossAmt></IRS1040Schedule1>` +
  `<IRS1040ScheduleC documentId="c"><NetProfitOrLossAmt>100</NetProfitOrLossAmt></IRS1040ScheduleC>` +
  `<IRS1040ScheduleC documentId="d"><NetProfitOrLossAmt>200</NetProfitOrLossAmt></IRS1040ScheduleC>` +
  `<IRS8960 documentId="e"><TotalIncomeAmt>50</TotalIncomeAmt><Grp><Name><Line1>X</Line1></Name></Grp></IRS8960>` +
  `</ReturnData></Return>`;

function context() {
  return createReturnContext(
    {},
    { primarySSN: "111223333", filingStatus: 1 },
    new Map(),
    new Map([["f1040", 1]]),
    parseEmittedReturn(xml),
  );
}

test("emitted rules read their own document, then the header and Form 1040", () => {
  const ctx = context();
  const [f8960] = ctx.forRulePrefix!("F8960");
  assertEquals(f8960.num("TotalIncomeAmt"), 50);
  assertEquals(ctx.num("TotalIncomeAmt"), 900);
  assertEquals(ctx.field("NameLine1Txt"), "ALEX<EXAMPLE");
  assertEquals(ctx.hasValue("Grp/Name"), true);
  assertEquals(ctx.field("Grp/Line1"), "X");
  assertEquals(ctx.num("Schedule1/BusinessIncomeLossAmt"), 300);
  assertEquals(ctx.hasValue("NotEmittedAmt"), false);
});

test("a repeated document is checked once per copy and sums across copies", () => {
  const report = evaluateRules([
    rule("SC-T-1", "reject", "math_error", hasValue("NetProfitOrLossAmt")),
    rule("SC-T-2", "reject", "math_error", eqField("NetProfitOrLossAmt", "TotalIncomeAmt")),
    rule("S1-T-3", "reject", "math_error", sumOfAll("BusinessIncomeLossAmt", "NetProfitOrLossAmt")),
    rule("SA-F8992-T", "reject", "missing_data", hasValue("EIN")),
  ], context(), new Set(["SC", "S1", "SA"]));
  assertEquals(report.entries.map((entry) => entry.ruleNumber), ["SC-T-2"]);
});

test("an unimplemented rule is not checked rather than passed", () => {
  const report = evaluateRules([
    rule("IND-T-1", "reject", "missing_data", alwaysPass),
    rule("IND-T-2", "reject", "missing_data", null),
    rule("IND-T-3", "reject", "missing_data", hasValue("NameLine1Txt")),
  ], context());
  assertEquals(report.summary.passed, 1);
  assertEquals(report.summary.skipped, 2);
});
