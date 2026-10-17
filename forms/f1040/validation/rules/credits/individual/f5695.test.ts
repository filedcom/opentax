import { test } from "bun:test";
import { assertEquals } from "@std/assert";
import { createReturnContext } from "../../../../../../core/validation/context.ts";
import { emittedRulePasses } from "../../../../../../core/test-utils/emitted-rule.ts";
import { F5695_RULES } from "./f5695.ts";

function passes(id: string, fields: Record<string, unknown>): boolean {
  const check = F5695_RULES.find((item) => item.ruleNumber === id)?.check;
  if (!check) throw new Error(`Missing rule ${id}`);
  return check(
    createReturnContext(
      { form5695: fields },
      { primarySSN: "400001032", filingStatus: 1 },
      new Map(),
    ),
  );
}

test("F5695 percentage rules accept the per-line caps printed on Form 5695", () => {
  assertEquals(
    passes("F5695-039-02", {
      MostExpnsExtrDoorCostAmt: 1_020,
      MostExpnsExtrDoorsStdPctCrAmt: 250,
    }),
    true,
  );
  assertEquals(
    passes("F5695-039-02", {
      MostExpnsExtrDoorCostAmt: 600,
      MostExpnsExtrDoorsStdPctCrAmt: 250,
    }),
    false,
  );
  assertEquals(
    passes("F5695-046-02", {
      CentralAirCondCostAmt: 2_500,
      CentralAirCondCostStdPctCrAmt: 600,
    }),
    true,
  );
});

test("F5695-040-02 takes 30% of line 19f, the total of lines 19d and 19e", () => {
  const doors = {
    NextMostExpnsExtrDoorCostAmt: 1_720,
    OtherQlfyExtrDoorsCostAmt: 2_740,
    TotalOtherQlfyExtrDoorsCostAmt: 4_460,
  };
  assertEquals(
    passes("F5695-040-02", { ...doors, OtherQlfyExtrDoorsStdPctCrAmt: 1_338 }),
    true,
  );
  assertEquals(
    passes("F5695-040-02", { ...doors, OtherQlfyExtrDoorsStdPctCrAmt: 822 }),
    false,
  );
});

test("F5695 door and QMID rules read each door group on its own", () => {
  const form = (doors: string, total: number) =>
    '<IRS5695 documentId="e"><EgyEffcntHmImprvCrGrp><ExteriorDoorEgyStarRqrGrp><OthExteriorDoorEgyStarRqrGrp>' +
    `${doors}<NextMostExpnsExtrDoorCostAmt>${total}</NextMostExpnsExtrDoorCostAmt>` +
    "</OthExteriorDoorEgyStarRqrGrp></ExteriorDoorEgyStarRqrGrp></EgyEffcntHmImprvCrGrp></IRS5695>";
  const door = (qmid: string, cost: number) =>
    `<NextMostExpnsExtrDoorGrp>${qmid}<CostAmt>${cost}</CostAmt></NextMostExpnsExtrDoorGrp>`;
  const twoDoors = door("<QMID>A1B3</QMID>", 920) + door("<QMID>A1B4</QMID>", 800);
  assertEquals(emittedRulePasses(F5695_RULES, "F5695-072", { documents: form(twoDoors, 1_720) }), true);
  assertEquals(emittedRulePasses(F5695_RULES, "F5695-072", { documents: form(twoDoors, 1_721) }), false);
  const noQmid = door("<QMID>A1B3</QMID>", 920) + door("", 800);
  assertEquals(emittedRulePasses(F5695_RULES, "F5695-071", { documents: form(noQmid, 1_720) }), false);
  const substantiated = form(noQmid, 1_720) +
    '<BinaryAttachment documentId="b"><Desc>Substantiate QMID door 2</Desc></BinaryAttachment>';
  assertEquals(emittedRulePasses(F5695_RULES, "F5695-071", { documents: substantiated }), true);
});

test("F5695-058 allows the more-than-one-main-home code on one Form 5695", () => {
  const form = (id: string, code: boolean) =>
    `<IRS5695 documentId="${id}"><AdjustedCreditLimitAmt${
      code ? ' adjustedCreditLimitCd="MORE THAN ONE MAIN HOME"' : ""
    }>500</AdjustedCreditLimitAmt></IRS5695>`;
  assertEquals(emittedRulePasses(F5695_RULES, "F5695-058", { documents: form("a", true) + form("b", false) }), true);
  assertEquals(emittedRulePasses(F5695_RULES, "F5695-058", { documents: form("a", true) + form("b", true) }), false);
});
