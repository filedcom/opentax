import { test } from "bun:test";
import { assertEquals } from "@std/assert";
import { createReturnContext } from "../../../../../../core/validation/context.ts";
import { parseEmittedReturn } from "../../../../../../core/validation/emitted-documents.ts";
import { FIELD_REGISTRY } from "../../../field-registry.ts";
import { F8978_RULES } from "./f8978.ts";

const group = (tax: number) =>
  `<TYAuditLiabilityCmptGrp><TaxIncreaseDecreaseAmt>${tax}</TaxIncreaseDecreaseAmt></TYAuditLiabilityCmptGrp>`;

function failing(xml: string, counts: Record<string, number>): string[] {
  const ctx = createReturnContext(
    {},
    { primarySSN: "123456789", filingStatus: 1 },
    FIELD_REGISTRY,
    new Map(Object.entries(counts)),
    parseEmittedReturn(xml),
  );
  return F8978_RULES.filter((rule) =>
    rule.check &&
    !(ctx.forRulePrefix?.("F8978") ?? [ctx]).every((scope) => rule.check!(scope))
  ).map((rule) => rule.ruleNumber);
}

const form8978 = (id: number, groups: number[], total: number) =>
  `<IRS8978 documentId="F${id}">${groups.map(group).join("")}<TotRptgYrTxIncreaseDecreaseAmt>${total}</TotRptgYrTxIncreaseDecreaseAmt></IRS8978>`;

test("F8978-031 sums every audited year's tax change on each Form 8978", () => {
  const xml = `<Return><ReturnData>${form8978(1, [-1920, -1920, -1920], -5760)}${
    form8978(2, [500], 500)
  }</ReturnData></Return>`;
  assertEquals(failing(xml, { form8978: 2, form8978schedulea: 2 }), []);
  const wrong = `<Return><ReturnData>${
    form8978(1, [-1920, -1920], -1920)
  }</ReturnData></Return>`;
  assertEquals(failing(wrong, { form8978: 1, form8978schedulea: 1 }), [
    "F8978-031",
  ]);
});

test("F8978-030-01 needs a Schedule A for each Form 8978", () => {
  const xml = `<Return><ReturnData>${form8978(1, [500], 500)}${
    form8978(2, [500], 500)
  }</ReturnData></Return>`;
  assertEquals(failing(xml, { form8978: 2, form8978schedulea: 1 }), [
    "F8978-030-01",
  ]);
  assertEquals(failing(xml, { form8978: 2, form8978schedulea: 2 }), []);
});
