import { element, elements } from "../../../mef/xml.ts";
import {
  type F8854Input,
  inputSchema,
  sectionAExceptionAnswers,
} from "../../../nodes/inputs/f8854/index.ts";
import { calculateBalanceSheet } from "../../../nodes/inputs/f8854/balance-sheet.ts";

/** IRS8854 Part II Section A children in 2025v5.4 XSD order. */
export function buildForm8854PartIISectionA(
  rawInput: F8854Input,
  changeStatementId?: string,
  phase: "discover" | "link" = "link",
): string {
  const input = inputSchema.parse(rawInput);
  if (
    phase === "link" &&
    input.significant_asset_liability_changes_prior_5_years &&
    !changeStatementId
  ) {
    throw new Error(
      "Form 8854 significant asset changes need the linked statement document",
    );
  }
  if (
    !input.significant_asset_liability_changes_prior_5_years &&
    changeStatementId
  ) {
    throw new Error(
      "Form 8854 change statement cannot be linked without a yes answer",
    );
  }
  const taxes = input.prior_year_us_income_tax_less_foreign_tax_credit;
  const answers = sectionAExceptionAnswers(input);
  return elements("ExpatriationInformationGrp", [
    element("USIncomeTax1stYearBfrExptrtAmt", taxes.year_2024),
    element("USIncomeTax2ndYearBfrExptrtAmt", taxes.year_2023),
    element("USIncomeTax3rdYearBfrExptrtAmt", taxes.year_2022),
    element("USIncomeTax4thYearBfrExptrtAmt", taxes.year_2021),
    element("USIncomeTax5thYearBfrExptrtAmt", taxes.year_2020),
    element(
      "NetWorthOnExptrtDateAmt",
      calculateBalanceSheet(input.balance_sheet).netWorth,
    ),
    element(
      "ChangeAstLiab5YrBfrExptrtInd",
      String(input.significant_asset_liability_changes_prior_5_years),
      changeStatementId
        ? {
          referenceDocumentId: changeStatementId,
          referenceDocumentName: "ChangePreOrPostExpatriationDateStatement",
        }
        : undefined,
    ),
    element("DualCitizenBirthUSOthCntryInd", String(answers.dualCitizenBirth)),
    answers.usResidentNoMoreThan10Of15 === undefined ? "" : element(
      "USResNoMoreThan10Of15YrInd",
      String(answers.usResidentNoMoreThan10Of15),
    ),
    element("Under18USResLessThan10YrInd", String(answers.minorQualifies)),
    element(
      "InCompliance5PrecTaxYearInd",
      String(input.certified_tax_compliance),
    ),
  ]);
}

/** Separate native statement, linked only when Section A line 3 is yes. */
export function buildForm8854ChangeStatement(rawInput: F8854Input): string {
  const input = inputSchema.parse(rawInput);
  if (!input.significant_asset_liability_changes_prior_5_years) return "";
  return elements("ChangePrePostExptrtDateStmt", [
    element("MediumExplanationTxt", input.significant_change_explanation),
  ]);
}
