import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import type { Form3800CarryoverRow } from "./f3800_passive_rows.ts";
import { buildForm3800PartIVXml } from "./f3800_part_iv.ts";

const standard: Form3800CarryoverRow = {
  line: "1h",
  sourceKeys: ["form8820-2024"],
  originatingTaxYear: 2024,
  entity: { ein: "123456789" },
  amount: {
    line: "1h",
    passiveBeforeLimit: 300,
    passiveAfterLimit: 250,
    nonpassiveCredit: 0,
    appliedCredit: 100,
    recapturedOrAdjusted: 0,
    carryforwardCredit: 150,
  },
};

const empowerment: Form3800CarryoverRow = {
  line: "3",
  sourceKeys: ["form8844-2024"],
  originatingTaxYear: 2024,
  amount: {
    line: "3",
    passiveBeforeLimit: 100,
    passiveAfterLimit: 80,
    nonpassiveCredit: 0,
    appliedCredit: 50,
    recapturedOrAdjusted: 0,
    carryforwardCredit: 30,
  },
};

const specified: Form3800CarryoverRow = {
  line: "4e",
  sourceKeys: ["form8835-2023"],
  originatingTaxYear: 2023,
  amount: {
    line: "4e",
    passiveBeforeLimit: 200,
    passiveAfterLimit: 150,
    nonpassiveCredit: 25,
    appliedCredit: 100,
    recapturedOrAdjusted: 10,
    carryforwardCredit: 65,
  },
};

Deno.test("Form 3800 Part IV orders carryover rows and derives lines 5-7", () => {
  const rows = buildForm3800PartIVXml([specified, empowerment, standard]);
  assertEquals(rows.map((row) => row.match(/^<[^\s/>]+/)?.[0]), [
    "<Frm8820CYCyovCrGrp",
    "<Frm8844CYCrovCrGrp",
    "<Frm8835CYSpcfdCrGrp",
    "<CYOtherSpcfdCreditsSubTotGrp",
    "<TotCYGBCOrESBCAmtGrp",
    "<Tot8844OthSpcfdGBCOrESBCAmtGrp",
  ]);
  assertStringIncludes(
    rows[3],
    "<PassiveActivityCrAfterLmtAmt>150</PassiveActivityCrAfterLmtAmt>",
  );
  assertStringIncludes(
    rows[4],
    "<CarryforwardGeneralBusCrAmt>150</CarryforwardGeneralBusCrAmt>",
  );
  assertStringIncludes(
    rows[5],
    "<TotalGeneralBusCreditsAppTxAmt>250</TotalGeneralBusCreditsAppTxAmt>",
  );
  assertStringIncludes(
    rows[5],
    "<CarryforwardGeneralBusCrAmt>245</CarryforwardGeneralBusCrAmt>",
  );
});

Deno.test("Form 3800 Part IV rejects duplicate and unreconciled carryovers", () => {
  assertEquals(buildForm3800PartIVXml([]), []);
  assertThrows(
    () => buildForm3800PartIVXml([standard, { ...standard }]),
    Error,
    "rows do not reconcile",
  );
  assertThrows(
    () =>
      buildForm3800PartIVXml([{
        ...standard,
        amount: { ...standard.amount, carryforwardCredit: 151 },
      }]),
    Error,
    "source amount does not reconcile",
  );
  assertThrows(
    () =>
      buildForm3800PartIVXml([{
        ...standard,
        sourceKeys: ["same", "same"],
      }]),
    Error,
    "typed source identity is invalid",
  );
  assertThrows(
    () =>
      buildForm3800PartIVXml([{
        ...standard,
        originatingTaxYear: 2025,
      }]),
    Error,
    "typed source identity is invalid",
  );
});

Deno.test("Form 3800 Part IV keeps a signed carryover adjustment in column h", () => {
  const rows = buildForm3800PartIVXml([{
    ...standard,
    amount: {
      ...standard.amount,
      recapturedOrAdjusted: -5,
      carryforwardCredit: 155,
    },
  }]);
  assertStringIncludes(
    rows[1],
    "<GeneralBusCrCyovRcptrAdjAmt>-5</GeneralBusCrCyovRcptrAdjAmt>",
  );
  assertStringIncludes(
    rows[2],
    "<CarryforwardGeneralBusCrAmt>155</CarryforwardGeneralBusCrAmt>",
  );
});
