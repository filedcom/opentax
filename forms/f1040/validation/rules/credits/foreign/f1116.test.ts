import { test } from "bun:test";
import { assertEquals } from "@std/assert";
import { emittedRulePasses } from "../../../../../../core/test-utils/emitted-rule.ts";
import { F1116_RULES } from "./f1116.ts";

const form = (id: string, body: string) => `<IRS1116 documentId="${id}">${body}</IRS1116>`;
const passes = (ruleNumber: string, documents: string) =>
  emittedRulePasses(F1116_RULES, ruleNumber, { documents });

test("F1116-002-01 allows one AMT Form 1116 per category", () => {
  const amt = (id: string, box: string) =>
    form(id, `<AlternativeMinimumTaxCd>AMT</AlternativeMinimumTaxCd><${box}>X</${box}>`);
  const general = "ForeignIncGeneralCategoryInd";
  const passive = "ForeignIncPassiveCategoryInd";
  assertEquals(passes("F1116-002-01", amt("A", general) + amt("B", passive)), true);
  assertEquals(passes("F1116-002-01", amt("A", general) + amt("B", general)), false);
  assertEquals(
    passes("F1116-002-01", amt("A", general) + form("B", `<${general}>X</${general}>`)),
    true,
  );
});

test("F1116-014-02 allows one Form 1116 with a line 35 credit", () => {
  const credit = (id: string, amount: number) =>
    form(id, `<ForeignIncPassiveCategoryInd>X</ForeignIncPassiveCategoryInd><ForeignTaxCreditAmt>${amount}</ForeignTaxCreditAmt>`);
  assertEquals(passes("F1116-014-02", credit("A", 100) + credit("B", 0)), true);
  assertEquals(passes("F1116-014-02", credit("A", 100) + credit("B", 50)), false);
});
