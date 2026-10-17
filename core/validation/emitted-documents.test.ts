import { test } from "bun:test";
import { assertEquals } from "@std/assert";
import { parseEmittedReturn } from "./emitted-documents.ts";
import { createReturnContext } from "./context.ts";
import { evaluateRules } from "./engine.ts";
import {
  all,
  alwaysPass,
  amount,
  attachmentDescStartsWith,
  documentCntMatches,
  eachGroup,
  eqField,
  formPresent,
  groupTotal,
  hasNonZero,
  hasValue,
  ifThen,
  irsSide,
  noValue,
  rule,
  sumOfAll,
} from "./mod.ts";

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
    rule("IND-T-4", "reject", "missing_data", irsSide),
    rule("IND-T-3", "reject", "missing_data", hasValue("NameLine1Txt")),
  ], context());
  assertEquals(report.summary.passed, 1);
  assertEquals(report.summary.skipped, 3);
});

const grouped = `<Return><ReturnHeader><TaxYr>2025</TaxYr></ReturnHeader><ReturnData documentCnt="3">` +
  `<IRS3800 documentId="a"><PassThroughEntityEIN>000000001</PassThroughEntityEIN>` +
  `<Frm8835Grp><Amt>5</Amt><PassThroughEntityEIN>000000002</PassThroughEntityEIN></Frm8835Grp>` +
  `<Frm8835Grp><Amt>7</Amt><Ref referenceDocumentId="s">X</Ref></Frm8835Grp>` +
  `<Frm7207Grp><Amt>9</Amt></Frm7207Grp></IRS3800>` +
  `<BinaryAttachment documentId="b"><Desc>Form8830 detail</Desc></BinaryAttachment>` +
  `</ReturnData></Return>`;

function groupedContext() {
  return createReturnContext(
    {},
    { primarySSN: "111223333", filingStatus: 1 },
    new Map(),
    new Map([["f1040", 1]]),
    parseEmittedReturn(grouped),
  ).forRulePrefix!("F3800")[0];
}

test("a group instance reads its own elements, never a sibling's", () => {
  const [first, second] = groupedContext().groupInstances!("Frm8835Grp");
  assertEquals(first.num("Amt"), 5);
  assertEquals(first.hasValue("PassThroughEntityEIN"), true);
  assertEquals(second.num("Amt"), 7);
  assertEquals(second.hasValue("PassThroughEntityEIN"), false);
  assertEquals(second.field("Ref@referenceDocumentId"), "s");
  assertEquals(second.num("TaxYr"), 2025);
  const [other] = groupedContext().groupInstances!("Frm7207Grp");
  assertEquals(other.hasValue("PassThroughEntityEIN"), true);
  const [local] = groupedContext().groupInstances!("Frm7207Grp", ["PassThroughEntityEIN"]);
  assertEquals(local.hasValue("PassThroughEntityEIN"), false);
});

test("each-group, attachment and document-count predicates read the emitted return", () => {
  const ctx = groupedContext();
  const needsForm = eachGroup(
    "Frm8835Grp",
    ifThen(all(hasNonZero("Amt"), noValue("PassThroughEntityEIN")), formPresent("form8835")),
  );
  assertEquals(needsForm(ctx), false);
  assertEquals(groupTotal("Frm8835Grp", amount("Amt"))(ctx), 12);
  assertEquals(attachmentDescStartsWith("form8830")(ctx), true);
  assertEquals(attachmentDescStartsWith("Form8904")(ctx), false);
  assertEquals(documentCntMatches(ctx), false);
});

test("a ReturnHeader/ path reads only the header", () => {
  const withW2 = xml.replace(
    "</IRS1040>",
    "</IRS1040><IRSW2 documentId=\"w\"><AddressLine2Txt>Suite 7</AddressLine2Txt></IRSW2>",
  );
  const ctx = createReturnContext(
    {},
    { primarySSN: "111223333", filingStatus: 1 },
    new Map(),
    new Map([["f1040", 1]]),
    parseEmittedReturn(withW2),
  );
  assertEquals(ctx.hasValue("AddressLine2Txt"), true);
  assertEquals(ctx.hasValue("ReturnHeader/AddressLine2Txt"), false);
  assertEquals(ctx.field("ReturnHeader/NameLine1Txt"), "ALEX<EXAMPLE");
});

test("a lower-case rule name reads an emitted attribute before engine facts", () => {
  const ctx = createReturnContext(
    { f1040: { childInterestAndDividendTaxAmt: 0, form8689Amt: 7 } },
    { primarySSN: "111223333", filingStatus: 1 },
    new Map(),
    new Map([["f1040", 1]]),
    parseEmittedReturn(
      `<Return><ReturnData><IRS1040 documentId="a"><Form8814Ind childInterestAndDividendTaxAmt="135" referenceDocumentId="x">X</Form8814Ind></IRS1040></ReturnData></Return>`,
    ),
  );
  assertEquals(ctx.num("childInterestAndDividendTaxAmt"), 135);
  assertEquals(ctx.num("form8689Amt"), 7);
  assertEquals(ctx.hasValue("referenceDocumentId"), false);
  assertEquals(ctx.field("Form8814Ind"), "X");
});
