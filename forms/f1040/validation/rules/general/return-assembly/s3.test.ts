import { test } from "bun:test";
import { assertEquals } from "@std/assert";
import { createReturnContext } from "../../../../../../core/validation/context.ts";
import { parseEmittedReturn } from "../../../../../../core/validation/emitted-documents.ts";
import type { RuleDef } from "../../../../../../core/validation/types.ts";
import { emittedRulePasses } from "../../../../../../core/test-utils/emitted-rule.ts";
import { FIELD_REGISTRY } from "../../../field-registry.ts";
import { F1040_RULES } from "../submission/return-assembly/f1040.ts";
import { S3_RULES } from "./s3.ts";

function passes(rules: readonly RuleDef[], number: string, xml: string) {
  const rule = rules.find((entry) => entry.ruleNumber === number);
  if (!rule?.check) throw new Error(`Missing rule ${number}`);
  const ctx = createReturnContext(
    {},
    { primarySSN: "123456789", filingStatus: 1 },
    FIELD_REGISTRY,
    new Map(),
    parseEmittedReturn(`<Return><ReturnData>${xml}</ReturnData></Return>`),
  );
  return rule.check(ctx);
}

// Form 1040 (2025) line 30 refundable adoption credit; Schedule 3 line 6c.
const adoption = (totalPayments: number) =>
  `<IRS1040 documentId="A"><WithholdingTaxAmt>15000</WithholdingTaxAmt><RefundableAdoptionCreditAmt>5000</RefundableAdoptionCreditAmt><TotalPaymentsAmt>${totalPayments}</TotalPaymentsAmt></IRS1040>` +
  `<IRS1040Schedule3 documentId="B"><NonrefundableAdoptionCreditAmt>6000</NonrefundableAdoptionCreditAmt><OtherCreditsAmt>6000</OtherCreditsAmt></IRS1040Schedule3>`;

test("F1040-066-10 counts the line 30 refundable adoption credit as a payment", () => {
  assertEquals(passes(F1040_RULES, "F1040-066-10", adoption(20_000)), true);
  assertEquals(passes(F1040_RULES, "F1040-066-10", adoption(15_000)), false);
});

test("S3-F1040-013-02 accepts line 6c nonrefundable adoption credit as an other credit", () => {
  assertEquals(passes(S3_RULES, "S3-F1040-013-02", adoption(20_000)), true);
  assertEquals(
    passes(
      S3_RULES,
      "S3-F1040-013-02",
      `<IRS1040Schedule3 documentId="B"><OtherCreditsAmt>6000</OtherCreditsAmt></IRS1040Schedule3>`,
    ),
    false,
  );
});

const ret = (line18: number, schedule3: number, form8978: number) =>
  `<IRS1040 documentId="a"><TotalTaxBeforeCrAndOthTaxesAmt>${line18}</TotalTaxBeforeCrAndOthTaxesAmt></IRS1040>` +
  `<IRS1040Schedule3 documentId="s"><TotRptgYrTxIncreaseDecreaseAmt>${schedule3}</TotRptgYrTxIncreaseDecreaseAmt></IRS1040Schedule3>` +
  `<IRS8978 documentId="p"><TotRptgYrTxIncreaseDecreaseAmt>${form8978}</TotRptgYrTxIncreaseDecreaseAmt></IRS8978>`;

test("S3-F1040-109-01 and S3-F1040-021 limit a Form 8978 decrease to the line 18 tax", () => {
  assertEquals(emittedRulePasses(S3_RULES, "S3-F1040-109-01", { documents: ret(1_000, 400, -400) }), true);
  assertEquals(emittedRulePasses(S3_RULES, "S3-F1040-109-01", { documents: ret(1_000, 300, -400) }), false);
  assertEquals(emittedRulePasses(S3_RULES, "S3-F1040-021", { documents: ret(300, 300, -400) }), true);
  assertEquals(emittedRulePasses(S3_RULES, "S3-F1040-021", { documents: ret(300, 400, -400) }), false);
});
