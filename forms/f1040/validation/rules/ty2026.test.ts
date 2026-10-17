import { test } from "bun:test";
import { assertEquals } from "@std/assert";
import { emittedRulePasses } from "../../../../core/test-utils/emitted-rule.ts";
import { ALL_RULES } from "./index.ts";
import {
  rulesForReturnVersion,
  TY2026_NEW_RULES,
  TY2026_RETIRED_RULES,
} from "./ty2026.ts";

const numbers = (rules: readonly { ruleNumber: string }[]) =>
  new Set(rules.map((rule) => rule.ruleNumber));

test("TY2025 returns keep the full 2025 rule set", () => {
  assertEquals(rulesForReturnVersion("2025v5.4"), ALL_RULES);
  assertEquals(rulesForReturnVersion(undefined), ALL_RULES);
});

test("TY2026 returns swap the 2026v1.0 replacements for retired 2025 rules", () => {
  const rules = numbers(rulesForReturnVersion("2026v1.0"));
  for (const retired of TY2026_RETIRED_RULES) {
    assertEquals(rules.has(retired), false, retired);
  }
  for (const id of ["F1040-339-12", "F1040-350-13", "SH-F1040-008-11"]) {
    assertEquals(rules.has(id), true, id);
  }
  assertEquals(numbers(TY2026_NEW_RULES).size, TY2026_NEW_RULES.length);
  const single = TY2026_NEW_RULES.find((r) => r.ruleNumber === "F1040-339-12");
  assertEquals(single?.ruleText.endsWith("must equal 16100."), true);
});

test("TY2026 F8854-017-10 and IND-067-11 are checked with the 2026 amounts", () => {
  const passes = (id: string, documents: string, filingStatus = 1) =>
    emittedRulePasses(TY2026_NEW_RULES, id, { documents, filingStatus });
  const f8854 = (tax: number) =>
    `<IRS8854 documentId="e">${
      ["1st", "2nd", "3rd", "4th", "5th"].map((n) =>
        `<USIncomeTax${n}YearBfrExptrtAmt>${tax}</USIncomeTax${n}YearBfrExptrtAmt>`
      ).join("")
    }<NetWorthOnExptrtDateAmt>100</NetWorthOnExptrtDateAmt><InCompliance5PrecTaxYearInd>true</InCompliance5PrecTaxYearInd>` +
    `<PropertyOwnedDtExpatriationGrp><PropertyDesc>Home</PropertyDesc></PropertyOwnedDtExpatriationGrp></IRS8854>`;
  assertEquals(passes("F8854-017-10", f8854(211001)), true);
  assertEquals(passes("F8854-017-10", f8854(211000)), false);
  const hoh = '<IRS1040 documentId="a"><PaidPreparerInformationGrp><PTIN>P12345678</PTIN></PaidPreparerInformationGrp></IRS1040>';
  assertEquals(passes("IND-067-11", hoh, 1), true);
  assertEquals(passes("IND-067-11", hoh, 4), false);
});
