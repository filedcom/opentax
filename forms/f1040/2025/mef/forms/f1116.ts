import { element, elements } from "../../../mef/xml.ts";
import {
  type CategorySummary,
  categorySummarySchema,
  ForeignTaxCreditMethod,
  ForeignTaxKind,
  IncomeCategory,
  type RedeterminationDisclosure,
} from "../../../nodes/intermediate/forms/form_1116/index.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";
import {
  scheduleBFieldsSchema,
  scheduleBPresentation,
} from "./f1116_schedule_b.ts";
import {
  alternativeCompensationStatementId,
  assertAlternativeCompensationSources,
} from "./f1116_alternative_compensation_source.ts";
import {
  buildConversionExplanation,
  conversionExplanationAttachmentId,
} from "./f1116_conversion_explanation.ts";
import { inputSchema as k1PartnershipInputSchema } from "../../../nodes/inputs/k1_partnership/index.ts";
import { inputSchema as k1SCorpInputSchema } from "../../../nodes/inputs/k1_s_corp/index.ts";

interface Fields {
  category_summaries?: readonly CategorySummary[];
  foreign_tax_redeterminations?: readonly RedeterminationDisclosure[];
  total_income?: number;
  worldwide_gross_income?: number;
  general_deductions?: number;
  standard_or_itemized_deduction?: number;
  other_deductions?: number;
  other_deductions_explanation?: string;
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
  vehicleInterestAmount: number,
  directExpenseStatementId?: string,
  otherDeductionsStatementId?: string,
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
    allocatedGeneralDeduction + directExpenses + vehicleInterestAmount,
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
      ? element("OtherDeductionsNotRelatedAmt", otherDeductions, {
        ...(otherDeductionsStatementId
          ? {
            referenceDocumentId: otherDeductionsStatementId,
            referenceDocumentName: "OtherDeductionsNotRelatedStatement",
          }
          : {}),
      })
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
    vehicleInterestAmount > 0
      ? element("ApportionedOtherInterestExpAmt", vehicleInterestAmount)
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
  otherDeductionsStatementId?: string,
  alternativeCompensationStatementId?: string,
  conversionExplanationId?: string,
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
  if (otherDeductions > 0 && !fields.other_deductions_explanation?.trim()) {
    throw new Error(
      "Form 1116 other deductions need a source explanation for their supporting statement",
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
    summary.automaticallyApportionedDeductions +
    (summary.vehicleInterestByCountry ?? []).reduce(
      (sum, item) => sum + item.amount,
      0,
    );
  const line19 = ratio(summary.foreignTaxableIncome, worldwideTaxableIncome);
  const line21 = Math.round(usTax * Number(line19));
  const carryover = summary.priorYearCarryover ?? 0;
  const line24 = Math.min(
    Math.round(summary.foreignTaxPaid - (summary.foreignTaxReduction ?? 0)) +
      carryover,
    line21,
  );
  if (summary.allowedCredit !== line24) {
    throw new Error(
      "Form 1116 category credit differs from its limitation lines",
    );
  }
  return elements(
    "IRS1116",
    [
      element(categoryTag, "X"),
      ...sourceGroups(summary).map((items, groupIndex, groups) => {
        const country = items[0].irs_country_code;
        const firstGroupForCountry = groups.findIndex((group) =>
          group[0].irs_country_code === country
        ) === groupIndex;
        const vehicleInterestAmount = firstGroupForCountry
          ? summary.vehicleInterestByCountry?.find((row) =>
            row.irsCountryCode === country
          )?.amount ?? 0
          : 0;
        return sourceXml(
          items,
          worldwideGrossIncome,
          generalDeductions,
          standardOrItemizedDeduction,
          otherDeductions,
          vehicleInterestAmount,
          items.some((item) => (item.directly_allocable_deductions ?? 0) > 0)
            ? nextDirectExpenseStatementId()
            : undefined,
          otherDeductionsStatementId,
        );
      }),
      element("TotalForeignGrossIncomeAmt", summary.includedForeignIncome),
      summary.items.some((item) => item.alternative_compensation_sourcing)
        ? element("AltBasisCompensationSourceInd", "X", {
          ...(alternativeCompensationStatementId
            ? {
              referenceDocumentId: alternativeCompensationStatementId,
              referenceDocumentName: "AltBasisCompensationSourceStatement",
            }
            : {}),
        })
        : "",
      deductions > 0 ? element("TotalDeductionOrLossAmt", deductions) : "",
      element("NetForeignTaxableIncomeLossAmt", summary.foreignTaxableIncome),
      element(
        method === ForeignTaxCreditMethod.Accrued
          ? "ForeignTaxesAccruedCreditInd"
          : "ForeignTaxesPaidCreditInd",
        "X",
      ),
      element("TotalForeignTaxesPaidOrAccrAmt", summary.foreignTaxPaid),
      carryover > 0 ? element("ForeignTaxCrCarrybackOrOverAmt", carryover) : "",
      element(
        "ForeignGrossTaxPaidOrAccrAmt",
        summary.foreignTaxPaid + carryover,
      ),
      (summary.foreignTaxReduction ?? 0) > 0
        ? element("ForeignTaxReductionAmt", summary.foreignTaxReduction)
        : "",
      element(
        "ForeignTaxAvailableForCrRedAmt",
        summary.foreignTaxPaid + carryover -
          (summary.foreignTaxReduction ?? 0),
      ),
      element("ForeignTaxableIncomeOrLossAmt", summary.foreignTaxableIncome),
      element("ForeignNetTaxableIncomeAmt", summary.foreignTaxableIncome),
      element("ForeignTxblIncomeAftrExemptAmt", worldwideTaxableIncome),
      element("ForeignTxblIncomeAftrExemptRt", line19),
      element("TaxFromTaxReturnAmt", usTax),
      element("MaxAllowedForeignTaxCreditAmt", line21),
      element("CreditLimitationAmt", line21),
      element("GrossForeignTaxCreditAmt", line24),
      ...partIV,
    ],
    conversionExplanationId
      ? {
        referenceDocumentId: conversionExplanationId,
        referenceDocumentName:
          "BinaryAttachment FinancialServicesActiveFinancingIncomeStatement ElectionToUseExchangeRateStatement ForeignAuditExplanationStatement IRS1116ScheduleB IRS1116ScheduleC",
      }
      : undefined,
  );
}

function buildIRS1116(
  fields: Fields,
  context?: MefBuildContext,
): readonly string[] {
  if (fields.foreign_tax_redeterminations !== undefined) {
    throw new Error(
      "Form 1116 foreign tax redetermination needs native Schedule C and amended-year handling",
    );
  }
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
  const k3Items = summaries.flatMap((summary) => summary.items).filter((item) =>
    item.schedule_k3_line12_reduction !== undefined ||
    item.partnership_k3_passive_interest !== undefined ||
    item.s_corp_k3_passive_interest !== undefined
  );
  if (k3Items.length > 0) {
    const k3SourceKeys = k3Items.map((item) => {
      const partnership = item.partnership_k3_passive_interest;
      const sCorp = item.s_corp_k3_passive_interest;
      return partnership
        ? `p:${partnership.partnership_ein}:${partnership.k3_source_document_reference}`
        : `s:${sCorp?.corporation_ein}:${sCorp?.k3_source_document_reference}`;
    });
    if (new Set(k3SourceKeys).size !== k3SourceKeys.length) {
      throw new Error(
        "Form 1116 K-3 source cannot be credited twice",
      );
    }
    const source = k1PartnershipInputSchema.safeParse(
      context?.pending?.k1_partnership,
    );
    const partnerships = source.success ? source.data.k1_partnerships : [];
    const sCorpSource = k1SCorpInputSchema.safeParse(
      context?.pending?.k1_s_corp,
    );
    const sCorps = sCorpSource.success ? sCorpSource.data.k1_s_corps : [];
    for (const item of k3Items) {
      const sCorpK3 = item.s_corp_k3_passive_interest;
      if (sCorpK3) {
        const matches = sCorps.filter((sCorp) =>
          sCorp.corporation_ein === sCorpK3.corporation_ein &&
          sCorp.source_document_reference ===
            sCorpK3.k1_source_document_reference &&
          sCorp.schedule_k3_passive_interest?.k3_source_document_reference ===
            sCorpK3.k3_source_document_reference
        );
        if (
          item.partnership_k3_passive_interest !== undefined ||
          matches.length !== 1 ||
          item.tax_reported_on_1099 === true ||
          item.income_category !== IncomeCategory.Passive ||
          item.tax_kind !== ForeignTaxKind.Interest ||
          item.tax_credit_method !== ForeignTaxCreditMethod.Paid ||
          item.foreign_income_source_document_reference !==
            sCorpK3.k3_source_document_reference ||
          item.foreign_gross_income !==
            sCorpK3.part_ii_section_1_line_6_passive_interest ||
          item.foreign_gross_income !==
            sCorpK3.part_ii_section_1_line_24_passive_total ||
          item.foreign_tax_paid !==
            sCorpK3.part_iii_section_3_line_1_foreign_tax ||
          item.schedule_k3_line12_reduction?.amount !==
            sCorpK3.part_iii_section_3_line_2_tax_reduction ||
          item.schedule_k3_line12_reduction?.source_document_reference !==
            sCorpK3.k3_source_document_reference ||
          item.irs_country_code !== sCorpK3.irs_country_code ||
          item.tax_paid_or_accrued_date !== sCorpK3.tax_paid_date ||
          JSON.stringify(item.foreign_tax_currency) !==
            JSON.stringify(sCorpK3.foreign_tax_currency) ||
          matches[0].box4_interest !== item.foreign_gross_income ||
          matches[0].box14_foreign_income !== item.foreign_gross_income ||
          matches[0].box14_foreign_tax !== item.foreign_tax_paid ||
          matches[0].box14_foreign_income_category !== IncomeCategory.Passive ||
          matches[0].box14_foreign_tax_irs_country_code !==
            item.irs_country_code ||
          matches[0].box14_foreign_tax_paid_or_accrued_date !==
            item.tax_paid_or_accrued_date ||
          matches[0].box14_foreign_tax_kind !== ForeignTaxKind.Interest ||
          matches[0].box14_foreign_tax_credit_method !==
            ForeignTaxCreditMethod.Paid ||
          JSON.stringify(matches[0].schedule_k3_passive_interest) !==
            JSON.stringify(sCorpK3)
        ) {
          throw new Error(
            "Form 1116 K-3 line 12 reduction needs the matching S-corporation K-1 and K-3 source",
          );
        }
        continue;
      }
      const k3 = item.partnership_k3_passive_interest;
      const matches = partnerships.filter((partnership) =>
        k3 !== undefined &&
        partnership.partnership_ein === k3.partnership_ein &&
        partnership.source_document_reference ===
          k3.k1_source_document_reference &&
        partnership.schedule_k3_passive_interest
            ?.k3_source_document_reference ===
          k3.k3_source_document_reference
      );
      if (
        !k3 || matches.length !== 1 ||
        item.tax_reported_on_1099 === true ||
        item.income_category !== IncomeCategory.Passive ||
        item.tax_kind !== ForeignTaxKind.Interest ||
        item.tax_credit_method !== ForeignTaxCreditMethod.Paid ||
        item.foreign_income_source_document_reference !==
          k3.k3_source_document_reference ||
        item.foreign_gross_income !==
          k3.part_ii_section_1_line_6_passive_interest ||
        item.foreign_gross_income !==
          k3.part_ii_section_1_line_24_passive_total ||
        item.foreign_tax_paid !==
          k3.part_iii_section_4_line_1_foreign_tax ||
        item.schedule_k3_line12_reduction?.amount !==
          k3.part_iii_section_4_line_2_tax_reduction ||
        item.schedule_k3_line12_reduction?.source_document_reference !==
          k3.k3_source_document_reference ||
        item.irs_country_code !== k3.irs_country_code ||
        item.tax_paid_or_accrued_date !== k3.tax_paid_date ||
        JSON.stringify(item.foreign_tax_currency) !==
          JSON.stringify(k3.foreign_tax_currency) ||
        matches[0].box5_interest !== item.foreign_gross_income ||
        matches[0].box16_foreign_income !== item.foreign_gross_income ||
        matches[0].box16_foreign_tax !== item.foreign_tax_paid ||
        matches[0].box16_foreign_income_category !== IncomeCategory.Passive ||
        matches[0].box16_foreign_tax_irs_country_code !==
          item.irs_country_code ||
        matches[0].box16_foreign_tax_paid_or_accrued_date !==
          item.tax_paid_or_accrued_date ||
        matches[0].box16_foreign_tax_kind !== ForeignTaxKind.Interest ||
        matches[0].box16_foreign_tax_credit_method !==
          ForeignTaxCreditMethod.Paid ||
        JSON.stringify(matches[0].schedule_k3_passive_interest) !==
          JSON.stringify(k3)
      ) {
        throw new Error(
          "Form 1116 K-3 line 12 reduction needs the matching partnership K-1 and K-3 source",
        );
      }
    }
  }
  for (const item of summaries.flatMap((summary) => summary.items)) {
    if (
      (item.schedule_k3_line12_reduction?.amount ?? 0) >
        item.foreign_tax_paid
    ) {
      throw new Error(
        "Form 1116 Schedule K-3 line 12 reduction exceeds its sourced foreign tax",
      );
    }
    const currency = item.foreign_tax_currency;
    if (
      currency &&
      Math.round(currency.amount * currency.usd_per_foreign_unit * 100) !==
        Math.round(item.foreign_tax_paid * 100)
    ) {
      throw new Error(
        "Form 1116 foreign-currency source does not convert to its U.S.-dollar tax",
      );
    }
  }
  const alternativeCompensationItems = summaries.flatMap((summary) =>
    summary.items.filter((item) => item.alternative_compensation_sourcing)
  );
  assertAlternativeCompensationSources(summaries, context);
  const conversionExplanationId = alternativeCompensationItems.length > 0
    ? conversionExplanationAttachmentId(context)
    : undefined;
  const linkedAlternativeCompensationStatementId =
    alternativeCompensationStatementId(
      alternativeCompensationItems.length,
      context,
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
  const otherDeductionsStatementIds = context?.documentIdsByPendingKey
    ?.form1116_other_deductions_statement ?? [];
  if (
    context?.documentIdsByPendingKey &&
    otherDeductionsStatementIds.length !==
      ((fields.other_deductions ?? 0) > 0 ? 1 : 0)
  ) {
    throw new Error(
      "Form 1116 other-deductions statement count does not match linked documents",
    );
  }
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
    const reduction = summary.items.reduce(
      (sum, item) => sum + (item.schedule_k3_line12_reduction?.amount ?? 0),
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
      Math.abs((summary.foreignTaxReduction ?? 0) - reduction) > 0.01 ||
      reduction > paid ||
      Math.abs(summary.foreignGrossIncome - gross) > 0.01 ||
      Math.abs(summary.includedForeignIncome - (gross - excluded)) > 0.01 ||
      summary.currentYearExcessTax !==
        Math.max(
          0,
          Math.round(paid - reduction) - summary.allowedCredit +
            (summary.usedPriorYearCarryover ?? 0),
        )
    ) {
      throw new Error("Form 1116 category totals differ from source items");
    }
  }
  const excess = summaries.filter((summary) =>
    summary.currentYearExcessTax > 0
  );
  if (excess.length > 0) {
    if (excess.length !== 1) {
      throw new Error(
        "Form 1116 excess taxes need separate Schedule B reconciliation by category",
      );
    }
    const companion = scheduleBFieldsSchema.safeParse(
      context?.pending?.form1116_schedule_b,
    );
    if (
      !companion.success ||
      (companion.data.case !== "current_year_excess" &&
        companion.data.case !== "combined_current_excess_prior_balance") ||
      companion.data.category !== excess[0].category ||
      companion.data.current_year_excess_tax !==
        excess[0].currentYearExcessTax
    ) {
      throw new Error(
        "Form 1116 excess foreign tax needs the matching sourced Schedule B carryover",
      );
    }
    scheduleBPresentation(companion.data);
  }
  const priorUse = summaries.filter((summary) =>
    (summary.priorYearCarryover ?? 0) > 0
  );
  if (priorUse.length > 0) {
    if (
      priorUse.length !== 1 ||
      (excess.length > 0 && excess[0].category !== priorUse[0].category)
    ) {
      throw new Error(
        "Form 1116 prior-year carryover needs one matching category",
      );
    }
    const companion = scheduleBFieldsSchema.safeParse(
      context?.pending?.form1116_schedule_b,
    );
    if (
      !companion.success ||
      (companion.data.case !== "prior_year_use" &&
        companion.data.case !== "combined_current_excess_prior_balance") ||
      (excess.length > 0 &&
        companion.data.case !== "combined_current_excess_prior_balance") ||
      (excess.length === 0 && companion.data.case !== "prior_year_use") ||
      companion.data.category !== priorUse[0].category ||
      companion.data.prior_year_carryover !==
        priorUse[0].priorYearCarryover ||
      companion.data.used_prior_year_carryover !==
        priorUse[0].usedPriorYearCarryover ||
      companion.data.prior_year_carryover_source
          .prior_year_schedule_b_line8_total !==
        priorUse[0].priorYearCarryover ||
      companion.data.used_prior_year_carryover +
            companion.data.remaining_prior_year_carryover !==
        priorUse[0].priorYearCarryover
    ) {
      throw new Error(
        "Form 1116 prior-year credit needs a matching sourced Schedule B reconciliation",
      );
    }
    scheduleBPresentation(companion.data);
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
      otherDeductionsStatementIds[0],
      linkedAlternativeCompensationStatementId,
      summary.items.some((item) => item.alternative_compensation_sourcing)
        ? conversionExplanationId
        : undefined,
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
  async buildBinaryAttachments(fields, context) {
    const summaries = (fields.category_summaries ?? []).map((summary) =>
      categorySummarySchema.parse(summary)
    );
    const statement = await buildConversionExplanation(
      summaries,
      context?.filer,
    );
    return statement ? [statement] : [];
  },
};
