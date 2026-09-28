import { inputSchema as fecInputSchema } from "../../../nodes/inputs/fec/index.ts";
import {
  type CategorySummary,
  ForeignTaxCreditMethod,
  ForeignTaxKind,
  IncomeCategory,
} from "../../../nodes/intermediate/forms/form_1116/index.ts";
import type { MefBuildContext } from "../form-descriptor.ts";

/** Require every line 1b item to be the identified foreign-employer source. */
export function assertAlternativeCompensationSources(
  summaries: readonly CategorySummary[],
  context: MefBuildContext | undefined,
): void {
  const items = summaries.flatMap((summary) =>
    summary.items.filter((item) => item.alternative_compensation_sourcing)
  );
  if (
    items.length > 5 ||
    summaries.some((summary) =>
      summary.category !== IncomeCategory.General &&
      summary.items.some((item) => item.alternative_compensation_sourcing)
    )
  ) {
    throw new Error(
      "Form 1116 alternative compensation statement supports up to five general-category items",
    );
  }
  if (items.length === 0) return;

  const fec = fecInputSchema.safeParse(context?.pending?.fec);
  if (!fec.success) {
    throw new Error(
      "Form 1116 line 1b needs the foreign-employer compensation source",
    );
  }
  const sourceItems = fec.data.fecs.filter((item) =>
    item.alternative_compensation_sourcing !== undefined
  );
  if (
    sourceItems.length !== items.length ||
    items.some((item) => {
      const alternative = item.alternative_compensation_sourcing;
      const matching = sourceItems.filter((source) =>
        source.alternative_compensation_sourcing
          ?.source_document_reference ===
          alternative?.source_document_reference
      );
      const source = matching[0];
      if (!alternative || matching.length !== 1 || !source) return true;
      const currency = source.foreign_tax_currency;
      const itemCurrency = item.foreign_tax_currency;
      const foreignServices = source.foreign_service_compensation_usd ?? 0;
      const excluded = Math.min(
        foreignServices,
        source.foreign_earned_income_exclusion_usd ?? 0,
      );
      const eligibleTax = foreignServices > 0
        ? (source.foreign_tax_paid_usd ?? 0) *
          ((foreignServices - excluded) / foreignServices)
        : 0;
      return JSON.stringify(source.alternative_compensation_sourcing) !==
          JSON.stringify(alternative) ||
        !currency || !itemCurrency ||
        currency.currency_code !== itemCurrency.currency_code ||
        currency.amount !== itemCurrency.amount ||
        currency.usd_per_foreign_unit !==
          itemCurrency.usd_per_foreign_unit ||
        currency.conversion_date !== itemCurrency.conversion_date ||
        currency.conversion_rate_explanation !==
          itemCurrency.conversion_rate_explanation ||
        currency.source_document_reference !==
          itemCurrency.source_document_reference ||
        source.foreign_tax_credit_method !== ForeignTaxCreditMethod.Paid ||
        source.foreign_tax_paid_or_accrued_date !== currency.conversion_date ||
        item.tax_paid_or_accrued_date !== currency.conversion_date ||
        item.tax_credit_method !== ForeignTaxCreditMethod.Paid ||
        item.tax_kind !== ForeignTaxKind.Other ||
        (source.foreign_earned_income_exclusion_usd ?? 0) !== 0 ||
        Math.round(currency.amount * currency.usd_per_foreign_unit * 100) !==
          Math.round((source.foreign_tax_paid_usd ?? 0) * 100) ||
        source.compensation_usd < 250_000 ||
        Math.round(source.compensation_usd * 100) !==
          Math.round(alternative.compensation_item_total_usd * 100) ||
        Math.round(foreignServices * 100) !==
          Math.round(alternative.alternative_foreign_source_usd * 100) ||
        Math.round(item.foreign_gross_income * 100) !==
          Math.round(alternative.alternative_foreign_source_usd * 100) ||
        Math.round(item.foreign_tax_paid * 100) !==
          Math.round(eligibleTax * 100) ||
        item.irs_country_code !== source.foreign_tax_irs_country_code ||
        item.foreign_income_source_document_reference !==
          alternative.source_document_reference ||
        (item.excluded_income ?? 0) !== excluded;
    })
  ) {
    throw new Error(
      "Form 1116 line 1b source amounts must match each identified foreign-employer wage item and prove that item's $250,000 threshold",
    );
  }
}

/** The line 1b indicator must point to the serialized native statement. */
export function alternativeCompensationStatementId(
  itemCount: number,
  context: MefBuildContext | undefined,
): string | undefined {
  const ids = context?.documentIdsByPendingKey
    ?.form1116_alternative_compensation_statement ?? [];
  if (itemCount === 0) {
    if (ids.length !== 0) {
      throw new Error(
        "Form 1116 alternative compensation statement count does not match its linked document",
      );
    }
    return undefined;
  }
  if (ids.length !== 1 || !ids[0]?.trim()) {
    throw new Error(
      "Form 1116 line 1b needs one linked alternative compensation statement",
    );
  }
  return ids[0];
}
