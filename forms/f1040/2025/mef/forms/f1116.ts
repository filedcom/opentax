import { element, elements } from "../../../mef/xml.ts";
import {
  type CategorySummary,
  categorySummarySchema,
  ForeignTaxCreditMethod,
  ForeignTaxKind,
  IncomeCategory,
} from "../../../nodes/intermediate/forms/form_1116/index.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";

interface Fields {
  category_summaries?: readonly CategorySummary[];
  total_income?: number;
  worldwide_gross_income?: number;
  general_deductions?: number;
  standard_or_itemized_deduction?: number;
  other_deductions?: number;
  us_tax_before_credits?: number;
  foreign_tax_paid?: number;
}

const CATEGORY_INDICATOR: Partial<Record<IncomeCategory, string>> = {
  [IncomeCategory.Passive]: "ForeignIncPassiveCategoryInd",
  [IncomeCategory.General]: "ForeignIncGeneralCategoryInd",
};

const CATEGORY_CREDIT: Partial<Record<IncomeCategory, string>> = {
  [IncomeCategory.Passive]: "ForeignPassiveIncTaxCreditAmt",
  [IncomeCategory.General]: "ForeignGeneralIncTaxCreditAmt",
};

const TAX_KIND_TAG: Record<ForeignTaxKind, string> = {
  [ForeignTaxKind.Dividends]: "USTaxWithheldOnDividendAmt",
  [ForeignTaxKind.RentsRoyalties]: "USTaxWithheldOnRentAmt",
  [ForeignTaxKind.Interest]: "USTaxWithheldOnInterestAmt",
  [ForeignTaxKind.Other]: "USDollarOtherForeignTaxPaidAmt",
};

function ratio(numerator: number, denominator: number): string {
  const value = denominator > 0
    ? Math.min(1, Math.max(0, numerator / denominator))
    : 0;
  return value.toFixed(5);
}

function sourceXml(
  items: CategorySummary["items"],
  worldwideGrossIncome: number,
  generalDeductions: number,
  standardOrItemizedDeduction: number,
  otherDeductions: number,
  directExpenseStatementId?: string,
): string {
  const first = items[0];
  if (
    items.length === 0 ||
    items.some((item) =>
      !item.irs_country_code || !item.tax_kind || !item.tax_credit_method
    )
  ) {
    throw new Error(
      "Form 1116 MeF needs the source country, tax kind, and paid/accrued method for every foreign-tax item",
    );
  }
  if (
    items.some((item) =>
      !item.tax_reported_on_1099 && !item.tax_paid_or_accrued_date
    )
  ) {
    throw new Error(
      "Form 1116 MeF needs the date each foreign tax was paid or accrued",
    );
  }
  if (
    items.some((item) =>
      (item.directly_allocable_deductions ?? 0) > 0 &&
      !item.direct_expense_explanation
    )
  ) {
    throw new Error(
      "Form 1116 direct expenses need a source explanation for their supporting statement",
    );
  }
  const foreignGrossIncome = items.reduce(
    (sum, item) => sum + item.foreign_gross_income,
    0,
  );
  const includedIncome = items.reduce(
    (sum, item) =>
      sum + item.foreign_gross_income - (item.excluded_income ?? 0),
    0,
  );
  const taxPaid = items.reduce((sum, item) => sum + item.foreign_tax_paid, 0);
  const directExpenses = items.reduce(
    (sum, item) => sum + (item.directly_allocable_deductions ?? 0),
    0,
  );
  const allocatedGeneralDeduction = worldwideGrossIncome > 0
    ? items.reduce(
      (sum, item) =>
        sum + generalDeductions *
          Number(ratio(item.foreign_gross_income, worldwideGrossIncome)),
      0,
    )
    : 0;
  const deductions = items.reduce(
    (sum, item) => sum + (item.apportioned_deductions ?? 0),
    allocatedGeneralDeduction + directExpenses,
  );
  return elements("ForeignTaxCreditSource", [
    element("ForeignCountryCd", first.irs_country_code),
    element("ForeignGrossIncomeAmt", includedIncome),
    directExpenses > 0
      ? element(
        "ForeignIncRelatedExpensesAmt",
        directExpenses,
        directExpenseStatementId
          ? {
            referenceDocumentId: directExpenseStatementId,
            referenceDocumentName: "ForeignIncmRelatedExpensesStmt",
          }
          : undefined,
      )
      : "",
    generalDeductions > 0
      ? element("ItemizedOrStandardDeductionAmt", standardOrItemizedDeduction)
      : "",
    otherDeductions > 0
      ? element("OtherDeductionsNotRelatedAmt", otherDeductions)
      : "",
    generalDeductions > 0
      ? element("TotalDeductionAmt", generalDeductions)
      : "",
    element("GrossForeignSourceIncomeAmt", foreignGrossIncome),
    worldwideGrossIncome > 0
      ? element("GrossIncomeAmt", worldwideGrossIncome)
      : "",
    worldwideGrossIncome > 0
      ? element(
        "ForeignIncomePct",
        ratio(foreignGrossIncome, worldwideGrossIncome),
      )
      : "",
    generalDeductions > 0
      ? element("ProRataDeductionsNotRelatedAmt", allocatedGeneralDeduction)
      : "",
    deductions > 0 ? element("ForeignIncNetDeductAndLossAmt", deductions) : "",
    first.tax_reported_on_1099
      ? element("ForeignTaxSpecialTypeCd", "1099 TAX")
      : element("ForeignTaxesPaidOrAccruedDt", first.tax_paid_or_accrued_date),
    ...[
      ForeignTaxKind.Dividends,
      ForeignTaxKind.RentsRoyalties,
      ForeignTaxKind.Interest,
      ForeignTaxKind.Other,
    ].map((kind) => {
      const amount = items
        .filter((item) => item.tax_kind === kind)
        .reduce((sum, item) => sum + item.foreign_tax_paid, 0);
      return amount > 0 ? element(TAX_KIND_TAG[kind], amount) : "";
    }),
    element("TotalForeignTaxesPaidOrAccrAmt", taxPaid),
  ]);
}

export function sourceGroups(
  summary: CategorySummary,
): CategorySummary["items"][] {
  const keys = [
    ...new Set(
      summary.items.map((item) =>
        `${item.irs_country_code ?? ""}|${
          item.tax_reported_on_1099
            ? "1099"
            : item.tax_paid_or_accrued_date ?? ""
        }`
      ),
    ),
  ];
  return keys.map((key) =>
    summary.items.filter((item) =>
      `${item.irs_country_code ?? ""}|${
        item.tax_reported_on_1099 ? "1099" : item.tax_paid_or_accrued_date ?? ""
      }` === key
    )
  );
}

function categoryXml(
  summary: CategorySummary,
  fields: Fields,
  partIV: string[],
  nextDirectExpenseStatementId: () => string | undefined,
): string {
  const categoryTag = CATEGORY_INDICATOR[summary.category];
  if (!categoryTag) {
    throw new Error(
      `Form 1116 MeF does not yet support ${summary.category} category rules`,
    );
  }
  const methods = new Set(summary.items.map((item) => item.tax_credit_method));
  if (methods.size !== 1 || methods.has(undefined)) {
    throw new Error(
      "Form 1116 tax items in one category must use one paid/accrued method",
    );
  }
  const method = summary.items[0].tax_credit_method;
  const worldwideGrossIncome = fields.worldwide_gross_income ?? 0;
  const generalDeductions = fields.general_deductions ?? 0;
  const standardOrItemizedDeduction = fields.standard_or_itemized_deduction ??
    0;
  const otherDeductions = fields.other_deductions ?? 0;
  if (
    Math.abs(
      generalDeductions - standardOrItemizedDeduction - otherDeductions,
    ) > 0.01
  ) {
    throw new Error(
      "Form 1116 deduction categories do not add to total general deductions",
    );
  }
  if (otherDeductions > 0) {
    throw new Error(
      "Form 1116 other deductions need a supporting statement before e-filing",
    );
  }
  const worldwideTaxableIncome = fields.total_income;
  const usTax = fields.us_tax_before_credits;
  if (worldwideTaxableIncome === undefined || usTax === undefined) {
    throw new Error(
      "Form 1116 MeF needs worldwide taxable income and U.S. tax",
    );
  }
  const deductions = summary.directlyAllocableDeductions +
    summary.explicitlyApportionedDeductions +
    summary.automaticallyApportionedDeductions;
  const line19 = ratio(summary.foreignTaxableIncome, worldwideTaxableIncome);
  const line21 = Math.round(usTax * Number(line19));
  const line24 = Math.min(Math.round(summary.foreignTaxPaid), line21);
  if (summary.allowedCredit !== line24) {
    throw new Error(
      "Form 1116 category credit differs from its limitation lines",
    );
  }
  return elements("IRS1116", [
    element(categoryTag, "X"),
    ...sourceGroups(summary).map((items) =>
      sourceXml(
        items,
        worldwideGrossIncome,
        generalDeductions,
        standardOrItemizedDeduction,
        otherDeductions,
        items.some((item) => (item.directly_allocable_deductions ?? 0) > 0)
          ? nextDirectExpenseStatementId()
          : undefined,
      )
    ),
    element("TotalForeignGrossIncomeAmt", summary.includedForeignIncome),
    deductions > 0 ? element("TotalDeductionOrLossAmt", deductions) : "",
    element("NetForeignTaxableIncomeLossAmt", summary.foreignTaxableIncome),
    element(
      method === ForeignTaxCreditMethod.Accrued
        ? "ForeignTaxesAccruedCreditInd"
        : "ForeignTaxesPaidCreditInd",
      "X",
    ),
    element("TotalForeignTaxesPaidOrAccrAmt", summary.foreignTaxPaid),
    element("ForeignGrossTaxPaidOrAccrAmt", summary.foreignTaxPaid),
    element("ForeignTaxAvailableForCrRedAmt", summary.foreignTaxPaid),
    element("ForeignTaxableIncomeOrLossAmt", summary.foreignTaxableIncome),
    element("ForeignNetTaxableIncomeAmt", summary.foreignTaxableIncome),
    element("ForeignTxblIncomeAftrExemptAmt", worldwideTaxableIncome),
    element("ForeignTxblIncomeAftrExemptRt", line19),
    element("TaxFromTaxReturnAmt", usTax),
    element("MaxAllowedForeignTaxCreditAmt", line21),
    element("CreditLimitationAmt", line21),
    element("GrossForeignTaxCreditAmt", line24),
    ...partIV,
  ]);
}

function buildIRS1116(
  fields: Fields,
  context?: MefBuildContext,
): readonly string[] {
  const rawSummaries = fields.category_summaries;
  if (!rawSummaries || rawSummaries.length === 0) {
    if (typeof fields.foreign_tax_paid === "number") {
      throw new Error("Form 1116 MeF needs category calculation details");
    }
    return [];
  }
  const summaries = rawSummaries.map((summary) =>
    categorySummarySchema.parse(summary)
  );
  const directExpenseGroups = summaries.flatMap(sourceGroups).filter((items) =>
    items.some((item) => (item.directly_allocable_deductions ?? 0) > 0)
  );
  const statementIds = context?.documentIdsByPendingKey
    ?.form1116_direct_expense_statement ?? [];
  if (
    context?.documentIdsByPendingKey &&
    statementIds.length !== directExpenseGroups.length
  ) {
    throw new Error(
      "Form 1116 direct-expense statement count does not match linked documents",
    );
  }
  let nextStatement = 0;
  if (
    new Set(summaries.map((summary) => summary.category)).size !==
      summaries.length
  ) {
    throw new Error("Form 1116 MeF has duplicate income categories");
  }
  for (const summary of summaries) {
    const paid = summary.items.reduce(
      (sum, item) => sum + item.foreign_tax_paid,
      0,
    );
    const gross = summary.items.reduce(
      (sum, item) => sum + item.foreign_gross_income,
      0,
    );
    const excluded = summary.items.reduce(
      (sum, item) => sum + (item.excluded_income ?? 0),
      0,
    );
    if (
      Math.abs(summary.foreignTaxPaid - paid) > 0.01 ||
      Math.abs(summary.foreignGrossIncome - gross) > 0.01 ||
      Math.abs(summary.includedForeignIncome - (gross - excluded)) > 0.01
    ) {
      throw new Error("Form 1116 category totals differ from source items");
    }
  }
  const methodSet = new Set(
    summaries.flatMap((summary) =>
      summary.items.map((item) => item.tax_credit_method)
    ),
  );
  if (methodSet.size !== 1) {
    throw new Error(
      "Form 1116 foreign-tax credit method must be consistent across categories",
    );
  }
  const mainIndex = summaries.reduce(
    (best, summary, index) =>
      summary.allowedCredit > summaries[best].allowedCredit ? index : best,
    0,
  );
  const usTax = fields.us_tax_before_credits;
  if (usTax === undefined) {
    throw new Error("Form 1116 MeF needs U.S. tax before credits");
  }
  const credits = [...summaries].sort((a, b) =>
    (a.category === IncomeCategory.Passive ? 0 : 1) -
    (b.category === IncomeCategory.Passive ? 0 : 1)
  ).map((summary) => {
    const tag = CATEGORY_CREDIT[summary.category];
    if (!tag) {
      throw new Error(
        `Form 1116 MeF does not yet support ${summary.category} category rules`,
      );
    }
    return element(tag, summary.allowedCredit);
  });
  const total = summaries.reduce(
    (sum, summary) => sum + summary.allowedCredit,
    0,
  );
  const claimedCredit = Math.min(total, usTax);
  if (context?.pending) {
    const schedule3 = context.pending.schedule3;
    const line1 = schedule3 && typeof schedule3 === "object" &&
        "line1_foreign_tax_credit" in schedule3
      ? schedule3.line1_foreign_tax_credit
      : undefined;
    if (
      line1 !== claimedCredit && !(claimedCredit === 0 && line1 === undefined)
    ) {
      throw new Error("Form 1116 credit differs from Schedule 3 line 1");
    }
  }
  const partIV = [
    ...credits,
    element("TentativeForeignTaxCreditAmt", total),
    element("SmllrOfRtnTaxOrForeignTaxCrAmt", claimedCredit),
    element("ForeignTaxCreditAmt", claimedCredit),
  ];
  return summaries.map((summary, index) =>
    categoryXml(
      summary,
      fields,
      index === mainIndex ? partIV : [],
      () => statementIds[nextStatement++],
    )
  );
}

export const form1116: MefFormDescriptor<
  "form_1116",
  Fields,
  readonly string[]
> = {
  pendingKey: "form_1116",
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f1116.pdf",
  build: buildIRS1116,
};
