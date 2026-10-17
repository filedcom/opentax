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

function passes(number: string, body: string, filingStatus = 1): boolean {
  const ctx = createReturnContext(
    {},
    { primarySSN: "123456789", filingStatus },
    FIELD_REGISTRY,
    new Map([["form8962", 1]]),
    parseEmittedReturn(
      `<Return><ReturnHeader><TaxYr>2025</TaxYr></ReturnHeader><ReturnData><IRS8962 documentId="A">${body}</IRS8962></ReturnData></Return>`,
    ),
  );
  const rule = F8962_RULES.find((entry) => entry.ruleNumber === number)!;
  return (ctx.forRulePrefix?.("F8962") ?? [ctx]).every((scope) => rule.check!(scope));
}

test("F8962-005-02 uses the 2025 Table 5 poverty line for the location and family size", () => {
  const line4 = (size: number, amount: number, loc = "C") =>
    `<TotalExemptionsCnt>${size}</TotalExemptionsCnt><PovertyLevelAmt>${amount}</PovertyLevelAmt><FederalPovertyTableLocCd>${loc}</FederalPovertyTableLocCd>`;
  assertEquals(passes("F8962-005-02", line4(1, 15060)), true);
  assertEquals(passes("F8962-005-02", line4(3, 25820)), true);
  assertEquals(passes("F8962-005-02", line4(2, 25540, "A")), true);
  assertEquals(passes("F8962-005-02", line4(2, 20440, "B")), false);
});

test("F8962-007-02 uses the 2025 applicable figure table", () => {
  const line7 = (pct: number, rate: string) =>
    `<FederalPovertyLevelPct>${pct}</FederalPovertyLevelPct><ApplicableFigureRt>${rate}</ApplicableFigureRt>`;
  assertEquals(passes("F8962-007-02", line7(199, "0.0196")), true);
  assertEquals(passes("F8962-007-02", line7(301, "0.0603")), true);
  assertEquals(passes("F8962-007-02", line7(401, "0.0850")), true);
  assertEquals(passes("F8962-007-02", line7(140, "0.0000")), true);
  assertEquals(passes("F8962-007-02", line7(250, "0.0300")), false);
});

test("F8962-043-02 uses the repayment limitation for the filing status", () => {
  const line28 = (pct: number, amount: number) =>
    `<TotalExemptionsCnt>1</TotalExemptionsCnt><FederalPovertyLevelPct>${pct}</FederalPovertyLevelPct><AdditionalTaxLimitationAmt>${amount}</AdditionalTaxLimitationAmt>`;
  assertEquals(passes("F8962-043-02", line28(250, 975)), true);
  assertEquals(passes("F8962-043-02", line28(250, 1950), 2), true);
  assertEquals(passes("F8962-043-02", line28(250, 1950)), false);
  assertEquals(passes("F8962-043-02", line28(450, 1625)), false);
});

test("F8962-320 and F8962-322 check each month once at the line 8b contribution", () => {
  const month = (name: string, contribution: number) =>
    `<MonthlyPTCCalculationGrp><MonthCd>${name}</MonthCd><MonthlyContributionAmt>${contribution}</MonthlyContributionAmt></MonthlyPTCCalculationGrp>`;
  const body = (months: string) => `<MonthlyContriHealthCareCvrAmt>49</MonthlyContriHealthCareCvrAmt>${months}`;
  assertEquals(passes("F8962-320", body(month("JANUARY", 49) + month("FEBRUARY", 49))), true);
  assertEquals(passes("F8962-320", body(month("JANUARY", 49) + month("JANUARY", 49))), false);
  assertEquals(passes("F8962-322", body(month("JANUARY", 49) + month("FEBRUARY", 0))), true);
  assertEquals(passes("F8962-322", body(month("JANUARY", 50))), false);
});
