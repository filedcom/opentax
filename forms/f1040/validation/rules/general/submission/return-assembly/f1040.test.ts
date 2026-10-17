import { test } from "bun:test";
import { assertEquals } from "@std/assert";
import { emittedRulePasses } from "../../../../../../../core/test-utils/emitted-rule.ts";
import { F1040_RULES } from "./f1040.ts";

const passes = (id: string, documents: string, header = "", filingStatus = 1) =>
  emittedRulePasses(F1040_RULES, id, { documents, header, filingStatus });

test("F1040-034-08 sums withholding from every W-2 and 1099-R within $5", () => {
  const forms = '<IRSW2 documentId="w1"><WithholdingAmt>100</WithholdingAmt></IRSW2>' +
    '<IRSW2 documentId="w2"><WithholdingAmt>50</WithholdingAmt></IRSW2>' +
    '<IRS1099R documentId="r"><FederalIncomeTaxWithheldAmt>25</FederalIncomeTaxWithheldAmt></IRS1099R>';
  const f1040 = (amt: number) => `<IRS1040 documentId="a"><WithholdingTaxAmt>${amt}</WithholdingTaxAmt></IRS1040>`;
  assertEquals(passes("F1040-034-08", f1040(179) + forms), true);
  assertEquals(passes("F1040-034-08", f1040(181) + forms), false);
});

test("F1040-068-03 checks the 25-to-64 EIC age from the header birth date", () => {
  const eic = '<IRS1040 documentId="a"><EarnedIncomeCreditAmt>600</EarnedIncomeCreditAmt></IRS1040>';
  const born = (date: string) => `<SelfSelectPINGrp><PrimaryBirthDt>${date}</PrimaryBirthDt></SelfSelectPINGrp>`;
  assertEquals(passes("F1040-068-03", eic, born("1990-06-01")), true);
  assertEquals(passes("F1040-068-03", eic, born("2001-01-01")), true);
  assertEquals(passes("F1040-068-03", eic, born("2001-01-02")), false);
  assertEquals(passes("F1040-068-03", eic, born("1961-01-01")), false);
  assertEquals(passes("F1040-068-03", eic), true);
});

test("F1040-471-01 applies the TY2025 Form 8995 taxable income threshold", () => {
  const ret = (agi: number) =>
    `<IRS1040 documentId="a"><AdjustedGrossIncomeAmt>${agi}</AdjustedGrossIncomeAmt>` +
    '<TotalItemizedOrStandardDedAmt>15750</TotalItemizedOrStandardDedAmt></IRS1040>' +
    '<IRS8995 documentId="q"><TotQlfyBusinessIncomeOrLossAmt>1000</TotQlfyBusinessIncomeOrLossAmt></IRS8995>';
  assertEquals(passes("F1040-471-01", ret(213_050)), true);
  assertEquals(passes("F1040-471-01", ret(213_051)), false);
});

test("F1040-455 matches combat pay to W-2 box 12 code Q only", () => {
  const ret = (election: number) =>
    `<IRS1040 documentId="a"><NontxCombatPayElectionAmt>${election}</NontxCombatPayElectionAmt></IRS1040>` +
    '<IRSW2 documentId="w"><EmployersUseGrp><EmployersUseCd>Q</EmployersUseCd><EmployersUseAmt>900</EmployersUseAmt></EmployersUseGrp>' +
    '<EmployersUseGrp><EmployersUseCd>D</EmployersUseCd><EmployersUseAmt>500</EmployersUseAmt></EmployersUseGrp></IRSW2>';
  assertEquals(passes("F1040-455", ret(900)), true);
  assertEquals(passes("F1040-455", ret(1_400)), false);
});
