import { inputSchema as dividendSchema } from "../nodes/inputs/f1099div/index.ts";

/** Reconcile bounded Form 6251 Part III dividends to retained 1099-DIV payers. */
export function assertForm6251QualifiedDividendSource(
  fields: Readonly<Record<string, unknown>>,
  pending: Readonly<Record<string, unknown>> | undefined,
): void {
  const qualified = fields.qualified_dividends;
  const iso = typeof fields.iso_adjustment === "number" &&
    fields.iso_adjustment > 0;
  const basis = fields.line2k_8949_basis_dispositions !== undefined;
  if (
    !(iso || basis) ||
    !(typeof qualified === "number" && qualified > 0)
  ) return;
  const dividend = dividendSchema.safeParse(pending?.f1099div);
  const form1040 = pending?.f1040 as Record<string, unknown> | undefined;
  const payers = dividend.success ? dividend.data.f1099divs : [];
  const ordinaryTotal = payers.reduce((sum, payer) => sum + payer.box1a, 0);
  const qualifiedTotal = payers.reduce(
    (sum, payer) => sum + (payer.box1b ?? 0),
    0,
  );
  const sourceReferences = payers.map((payer) =>
    payer.source_document_reference
  );
  const basisRows = basis
    ? (Array.isArray(fields.line2k_8949_basis_dispositions)
      ? fields.line2k_8949_basis_dispositions
      : [fields.line2k_8949_basis_dispositions]) as Array<{
        part: string;
        regular_gain: number;
        amt_gain: number;
      }>
    : [];
  const shortNet = basisRows.filter((row) => ["A", "B", "C"].includes(row.part))
    .reduce((sum, row) => sum + row.amt_gain, 0);
  const longNet = basisRows.filter((row) => ["D", "E", "F"].includes(row.part))
    .reduce((sum, row) => sum + row.amt_gain, 0);
  const amtNetCapitalGain = longNet > 0
    ? Math.max(0, longNet + Math.min(0, shortNet))
    : 0;
  const expectedPartThreeGain = qualified + amtNetCapitalGain;
  const regularCapitalGain = basisRows.reduce(
    (sum, row) => sum + row.regular_gain,
    0,
  );
  if (
    payers.length === 0 || !form1040 ||
    (payers.length > 1 &&
      (sourceReferences.some((reference) => reference === undefined) ||
        new Set(sourceReferences).size !== payers.length)) ||
    ordinaryTotal < qualified || qualifiedTotal !== qualified ||
    payers.some((payer) =>
      payer.isNominee !== false || payer.box11 !== false ||
      (payer.box1b ?? 0) > payer.box1a ||
      [
        payer.box2a,
        payer.box2b,
        payer.box2c,
        payer.box2d,
        payer.box2e,
        payer.box2f,
        payer.box3,
        payer.box4,
        payer.box5,
        payer.box6,
        payer.box7,
        payer.box9,
        payer.box10,
        payer.box12,
        payer.box13,
        payer.box16,
        payer.foreign_source_dividends_usd,
        payer.foreign_source_qualified_dividends_usd,
      ].some((amount) => (amount ?? 0) !== 0) ||
      payer.nominee_distribution !== undefined ||
      payer.foreign_tax_irs_country_code !== undefined ||
      (payer.box8?.trim().length ?? 0) > 0 ||
      (payer.box14?.trim().length ?? 0) > 0 ||
      (payer.box15?.trim().length ?? 0) > 0
    ) ||
    pending?.k1_partnership !== undefined ||
    pending?.k1_s_corp !== undefined ||
    pending?.k1_trust !== undefined ||
    pending?.f8814 !== undefined ||
    pending?.form4952 !== undefined ||
    pending?.form2555 !== undefined ||
    iso && fields.net_capital_gain !== 0 &&
      fields.net_capital_gain !== undefined ||
    fields.unrecaptured_1250_gain !== 0 &&
      fields.unrecaptured_1250_gain !== undefined ||
    fields.rate_28_gain !== 0 && fields.rate_28_gain !== undefined ||
    iso && (fields.line2k_disposition ?? 0) !== 0 ||
    iso && basis ||
    (fields.form4952_regular_election ?? 0) !== 0 ||
    (fields.form4952_amt_election ?? 0) !== 0 ||
    (fields.form4952_regular_elected_capital_gain ?? 0) !== 0 ||
    (fields.form4952_amt_elected_capital_gain ?? 0) !== 0 ||
    (fields.foreign_earned_income_exclusion ?? 0) !== 0 ||
    form1040.line3a_qualified_dividends !== qualified ||
    form1040.line3b_ordinary_dividends !== ordinaryTotal ||
    basis && form1040.line7_capital_gain !== regularCapitalGain ||
    form1040.line15_taxable_income !== fields.regular_taxable_income ||
    typeof fields.taxable_excess !== "number" ||
    fields.taxable_excess < expectedPartThreeGain ||
    fields.line12 !== fields.taxable_excess ||
    fields.line13 !== expectedPartThreeGain ||
    fields.line15 !== expectedPartThreeGain
  ) {
    throw new Error(
      "Form 6251 qualified-dividend Part III needs reconciled 1099-DIV payers and finalized Form 1040 source",
    );
  }
}
