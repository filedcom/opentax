import { inputSchema as dividendSchema } from "../nodes/inputs/f1099div/index.ts";

/** Sourced retained-ISO Part III route with one ordinary 1099-DIV payer. */
export function assertIsoQualifiedDividendSource(
  fields: Readonly<Record<string, unknown>>,
  pending: Readonly<Record<string, unknown>> | undefined,
): void {
  const iso = fields.iso_adjustment;
  const qualified = fields.qualified_dividends;
  if (
    !(typeof iso === "number" && iso > 0) ||
    !(typeof qualified === "number" && qualified > 0)
  ) return;
  const dividend = dividendSchema.safeParse(pending?.f1099div);
  const form1040 = pending?.f1040 as Record<string, unknown> | undefined;
  const payer = dividend.success && dividend.data.f1099divs.length === 1
    ? dividend.data.f1099divs[0]
    : undefined;
  if (
    !payer || !form1040 ||
    payer.isNominee !== false || payer.box11 !== false ||
    payer.box1a < qualified || payer.box1b !== qualified ||
    [
      payer.box2a,
      payer.box2b,
      payer.box2c,
      payer.box2d,
      payer.box2e,
      payer.box2f,
      payer.box7,
      payer.foreign_source_dividends_usd,
      payer.foreign_source_qualified_dividends_usd,
    ].some((amount) => (amount ?? 0) !== 0) ||
    payer.nominee_distribution !== undefined ||
    payer.foreign_tax_irs_country_code !== undefined ||
    (payer.box8?.trim().length ?? 0) > 0 ||
    pending?.k1_partnership !== undefined ||
    pending?.k1_s_corp !== undefined ||
    pending?.k1_trust !== undefined ||
    pending?.f8814 !== undefined ||
    pending?.form4952 !== undefined ||
    pending?.form2555 !== undefined ||
    fields.net_capital_gain !== 0 &&
      fields.net_capital_gain !== undefined ||
    fields.unrecaptured_1250_gain !== 0 &&
      fields.unrecaptured_1250_gain !== undefined ||
    fields.rate_28_gain !== 0 && fields.rate_28_gain !== undefined ||
    (fields.line2k_disposition ?? 0) !== 0 ||
    fields.line2k_8949_basis_dispositions !== undefined ||
    (fields.form4952_regular_election ?? 0) !== 0 ||
    (fields.form4952_amt_election ?? 0) !== 0 ||
    (fields.form4952_regular_elected_capital_gain ?? 0) !== 0 ||
    (fields.form4952_amt_elected_capital_gain ?? 0) !== 0 ||
    (fields.foreign_earned_income_exclusion ?? 0) !== 0 ||
    form1040.line3a_qualified_dividends !== qualified ||
    form1040.line3b_ordinary_dividends !== payer.box1a ||
    form1040.line15_taxable_income !== fields.regular_taxable_income ||
    typeof fields.taxable_excess !== "number" ||
    fields.taxable_excess < qualified ||
    fields.line12 !== fields.taxable_excess ||
    fields.line13 !== qualified ||
    fields.line15 !== qualified
  ) {
    throw new Error(
      "Form 6251 ISO qualified-dividend Part III needs one reconciled 1099-DIV and finalized Form 1040 source",
    );
  }
}
