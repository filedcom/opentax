import { test } from "bun:test";
import { assertEquals } from "@std/assert";
import { emittedRulePasses } from "../../../../../../../core/test-utils/emitted-rule.ts";
import { F8854_RULES } from "./f8854.ts";

const passes = (ruleNumber: string, documents: string) =>
  emittedRulePasses(F8854_RULES, ruleNumber, { documents });

test("F8854-017-09 bars property rows below both thresholds when compliant", () => {
  const form = (tax: number, property: boolean) =>
    `<IRS8854 documentId="A"><USIncomeTax1stYearBfrExptrtAmt>${tax}</USIncomeTax1stYearBfrExptrtAmt>` +
    `<NetWorthOnExptrtDateAmt>100</NetWorthOnExptrtDateAmt><InCompliance5PrecTaxYearInd>true</InCompliance5PrecTaxYearInd>` +
    (property ? `<PropertyOwnedDtExpatriationGrp><Desc>X</Desc></PropertyOwnedDtExpatriationGrp>` : "") +
    `</IRS8854>`;
  assertEquals(passes("F8854-017-09", form(1_000_000, true)), false);
  assertEquals(passes("F8854-017-09", form(1_000_000, false)), true);
  // An average of 206,001 is not below the threshold.
  assertEquals(passes("F8854-017-09", form(1_030_005, true)), true);
});

test("F8854-021 checks each mark-to-market row's computation statement", () => {
  const row = (ref: string) =>
    `<MarkToMarketPropertySaleGrp><GainAfterAllocationExclAmt${ref ? ` referenceDocumentId="${ref}"` : ""}>50</GainAfterAllocationExclAmt></MarkToMarketPropertySaleGrp>`;
  const statement = `<Form8854ComputationStatement documentId="C"></Form8854ComputationStatement>`;
  const form = (rows: string) => `<IRS8854 documentId="A">${rows}</IRS8854>`;
  assertEquals(passes("F8854-021", form(row("C") + row("C")) + statement), true);
  assertEquals(passes("F8854-021", form(row("C") + row("")) + statement), false);
  assertEquals(passes("F8854-021", form(row("C"))), false);
});
