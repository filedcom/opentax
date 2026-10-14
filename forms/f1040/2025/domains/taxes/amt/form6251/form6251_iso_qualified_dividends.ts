import { inputSchema as dividendSchema } from "../../../../../nodes/inputs/income/investments/f1099div/index.ts";
import { inputSchema as saleSchema } from "../../../../../nodes/inputs/income/investments/f8949/index.ts";
import {
  assertForm8814CalculatedLines,
  type Form8814Lines,
} from "../../../../../nodes/inputs/income/investments/f8814/index.ts";
import { assertDirectCapitalGainDistributionSource } from "../../../income/investments/line7a-source-reconciliation.ts";
import { assertCapitalSaleSourceRows } from "../../../income/investments/broker-sale-source-reconciliation.ts";
import { reconcileForm4952ScheduleJChildDividend } from "../../../deductions/investments/form4952/form4952_schedulej_child_reconciliation.ts";

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
  const child = (pending?.form8814 as { items?: Form8814Lines[] } | undefined)
    ?.items;
  const childQualified = child?.reduce((sum, line) => sum + line.line9, 0) ?? 0;
  const childInvestment = child?.reduce(
    (sum, line) => sum + line.line12InvestmentIncome,
    0,
  ) ?? 0;
  const childCapital = child?.reduce((sum, line) => sum + line.line10, 0) ?? 0;
  if (child !== undefined) {
    const owner = form1040?.taxpayer_ssn;
    if (!Array.isArray(child) || typeof owner !== "string") {
      throw new Error(
        "Form 6251 needs retained Form 8814 owner and child sources",
      );
    }
    assertForm8814CalculatedLines(child, owner);
    if (childCapital > 0) {
      const refs = new Set<string>();
      for (const line of child) {
        if (line.line10 <= 0) continue;
        const review = line.item.source_review
          ?.capital_gain_distribution_review;
        if (
          !review || review.box2a !== line.item.capital_gain_distributions ||
          (line.item.capital_gain_nominee_distribution ?? 0) !== 0 ||
          [review.box2b, review.box2c, review.box2d, review.box2e, review.box2f]
            .some((amount) => amount !== 0) ||
          refs.has(review.source_document_reference)
        ) {
          throw new Error(
            "Form 6251 child capital gains need distinct reviewed ordinary 1099-DIV box 2 sources",
          );
        }
        refs.add(review.source_document_reference);
      }
      assertDirectCapitalGainDistributionSource(form1040!, pending);
    }
  }
  const form4952 = pending?.form4952 as Record<string, unknown> | undefined;
  const childOnlyForm4952 = child !== undefined && form4952 !== undefined &&
    Object.keys(form4952).every((key) =>
      key === "form8814_line9_qualified_dividends" ||
      key === "form8814_line12_investment_income"
    ) &&
    form4952.form8814_line9_qualified_dividends === childQualified &&
    form4952.form8814_line12_investment_income === childInvestment;
  const electedForm4952 = form4952 !== undefined &&
      pending?.schedule_j !== undefined && childCapital > 0 &&
      !childOnlyForm4952
    ? reconcileForm4952ScheduleJChildDividend(form4952, pending!)
    : 0;
  const childInput = (pending?.f8814 as { f8814s?: unknown[] } | undefined)
    ?.f8814s;
  const childCopiesMatch = child !== undefined &&
    Array.isArray(childInput) &&
    JSON.stringify(childInput) ===
      JSON.stringify(child.map((line) => line.item));
  const sourceReferences = payers.map((payer) =>
    payer.source_document_reference
  );
  const sales = pending?.f8949 === undefined
    ? []
    : saleSchema.parse(pending.f8949).f8949s;
  const ordinarySales = childCapital > 0 && sales.length > 0 &&
    pending?.f1099b === undefined && pending?.f1099k === undefined &&
    sales.every((row) =>
      ["D", "E", "F"].includes(row.part) &&
      row.source_transaction_id && row.broker_statement_reference &&
      row.proceeds > row.cost_basis &&
      (row.amt_cost_basis ?? row.cost_basis) === row.cost_basis &&
      row.adjustment_codes === undefined &&
      row.adjustment_amount === undefined &&
      row.qsbs_code === undefined && row.qsbs_amount === undefined &&
      row.wash_sale_loss === undefined &&
      row.loss_not_allowed === undefined &&
      row.accrued_market_discount === undefined &&
      row.ordinary_income_portion === undefined
    );
  const ordinarySaleGain = ordinarySales
    ? sales.reduce((sum, row) => sum + row.proceeds - row.cost_basis, 0)
    : 0;
  if (ordinarySales) {
    assertCapitalSaleSourceRows(pending!);
    const schedule = pending?.schedule_d as Record<string, unknown> | undefined;
    const transactions = schedule?.transaction === undefined
      ? []
      : Array.isArray(schedule.transaction)
      ? schedule.transaction
      : [schedule.transaction];
    if (transactions.length !== sales.length) {
      throw new Error(
        "Form 6251 Schedule D has extra or missing retained capital sales",
      );
    }
  }
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
  const distributions = payers.reduce(
    (sum, payer) => sum + (payer.box2a ?? 0),
    0,
  );
  const issuedIsoCapital = iso && !basis ? distributions : 0;
  const expectedPartThreeGain = qualified + amtNetCapitalGain +
    issuedIsoCapital + childCapital + ordinarySaleGain - electedForm4952;
  const regularCapitalGain = basisRows.reduce(
    (sum, row) => sum + row.regular_gain,
    0,
  );
  const capitalLine = (key: string): number =>
    form1040?.[key] === undefined
      ? 0
      : typeof form1040[key] === "number"
      ? form1040[key] as number
      : NaN;
  if (
    payers.length === 0 || !form1040 ||
    (payers.length > 1 &&
      (sourceReferences.some((reference) => reference === undefined) ||
        new Set(sourceReferences).size !== payers.length)) ||
    ordinaryTotal + childQualified < qualified ||
    qualifiedTotal + childQualified !== qualified ||
    payers.some((payer) =>
      payer.isNominee !== false || payer.box11 !== false ||
      (payer.box1b ?? 0) > payer.box1a ||
      [
        ...(iso && !basis ? [] : [payer.box2a]),
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
    pending?.f8814 !== undefined && !childCopiesMatch ||
    childCapital > 0 && sales.length > 0 && !ordinarySales ||
    ordinarySales &&
      (pending?.schedule_d as Record<string, unknown> | undefined)
          ?.print_line16_combined !==
        issuedIsoCapital + childCapital + ordinarySaleGain ||
    pending?.form4952 !== undefined && !childOnlyForm4952 &&
      electedForm4952 === 0 ||
    pending?.form2555 !== undefined ||
    iso && (fields.net_capital_gain ?? 0) !==
        issuedIsoCapital + childCapital + ordinarySaleGain ||
    iso &&
      (capitalLine("line7_capital_gain") +
          capitalLine("line7a_cap_gain_distrib")) !==
        issuedIsoCapital + childCapital + ordinarySaleGain ||
    iso && issuedIsoCapital > 0 &&
      ((pending?.schedule_d as Record<string, unknown> | undefined)
            ?.line13_cap_gain_distrib !== issuedIsoCapital ||
        (pending?.schedule_d as Record<string, unknown> | undefined)
                ?.print_line16_combined !== undefined &&
          (pending?.schedule_d as Record<string, unknown> | undefined)
              ?.print_line16_combined !==
            issuedIsoCapital + childCapital + ordinarySaleGain) ||
    fields.unrecaptured_1250_gain !== 0 &&
      fields.unrecaptured_1250_gain !== undefined ||
    fields.rate_28_gain !== 0 && fields.rate_28_gain !== undefined ||
    iso && (fields.line2k_disposition ?? 0) !== 0 ||
    iso && basis ||
    (fields.form4952_regular_election ?? 0) !== electedForm4952 ||
    (fields.form4952_amt_election ?? 0) !== electedForm4952 ||
    (fields.form4952_regular_elected_capital_gain ?? 0) !==
      (form4952?.elected_capital_gain_portion ?? 0) ||
    (fields.form4952_amt_elected_capital_gain ?? 0) !==
      (form4952?.elected_capital_gain_portion ?? 0) ||
    (fields.foreign_earned_income_exclusion ?? 0) !== 0 ||
    form1040.line3a_qualified_dividends !== qualified ||
    form1040.line3b_ordinary_dividends !== ordinaryTotal + childQualified ||
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
