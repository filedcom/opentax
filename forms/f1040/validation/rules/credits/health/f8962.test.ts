import { test } from "bun:test";
import { assertEquals } from "@std/assert";
import { createReturnContext } from "../../../../../../core/validation/context.ts";
import { parseEmittedReturn } from "../../../../../../core/validation/emitted-documents.ts";
import { FIELD_REGISTRY } from "../../../field-registry.ts";
import { F8962_RULES } from "./f8962.ts";

function failing(body: string): string[] {
  const ctx = createReturnContext(
    {},
    { primarySSN: "123456789", filingStatus: 1 },
    FIELD_REGISTRY,
    new Map([["form8962", 1]]),
    parseEmittedReturn(
      `<Return><ReturnData><IRS8962 documentId="A">${body}</IRS8962></ReturnData></Return>`,
    ),
  );
  return ["F8962-012", "F8962-057", "F8962-321"].filter((number) => {
    const rule = F8962_RULES.find((entry) => entry.ruleNumber === number)!;
    return !(ctx.forRulePrefix?.("F8962") ?? [ctx]).every((scope) =>
      rule.check!(scope)
    );
  });
}

const line8a = "<AnnualContributionAmt>602</AnnualContributionAmt>";
const allocation =
  "<SharedPolicyAllocationGrp><PolicyNum>P1</PolicyNum></SharedPolicyAllocationGrp>";
const annual = (contribution: number) =>
  `<AnnualPTCCalculationGrp><AnnualPremiumAmt>2880</AnnualPremiumAmt><AnnualPremiumSLCSPAmt>3600</AnnualPremiumSLCSPAmt><AnnualContributionAmt>${contribution}</AnnualContributionAmt><AnnualMaxPremiumAssistanceAmt>${
    3600 - contribution
  }</AnnualMaxPremiumAssistanceAmt></AnnualPTCCalculationGrp>`;

test("F8962 line 11 rules read AnnualPTCCalculationGrp, not line 8a", () => {
  // Monthly lines 12-23 with a Part IV allocation: line 8a alone is not line 11C.
  assertEquals(failing(line8a + allocation), []);
  assertEquals(failing(line8a + allocation + annual(602)), ["F8962-057"]);
  assertEquals(failing(line8a + annual(602)), []);
  assertEquals(failing(line8a + annual(500)), ["F8962-321"]);
});
