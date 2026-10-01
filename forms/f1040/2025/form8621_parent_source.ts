import {
  type F8621Item,
  form8621ParentSourceSchema,
  PficRegime,
} from "../nodes/inputs/f8621/index.ts";
import { ExcessEventKind } from "../nodes/inputs/f8621/excess_distribution.ts";

/** Source reconciliation shared by native and future printable parent forms. */
export function projectForm8621ParentSource(item: F8621Item) {
  if (!item.parent_source) {
    throw new Error(
      "Form 8621 parent needs corporation, share-class, and election source facts",
    );
  }
  const source = form8621ParentSourceSchema.parse(item.parent_source);
  const shares = source.share_classes.reduce(
    (sum, row) => sum + row.year_end_shares,
    0,
  );
  const value = source.share_classes.reduce(
    (sum, row) => sum + row.year_end_value_usd,
    0,
  );
  if (
    shares !== item.shares_owned ||
    Math.abs(value - item.fmv_at_year_end) > 0.005
  ) {
    throw new Error(
      "Form 8621 share classes differ from calculated shares or value",
    );
  }
  const compatible = item.regime === PficRegime.EXCESS_DISTRIBUTION
    ? source.election_status === "section1291_no_new_election"
    : item.regime === PficRegime.QEF
    ? source.election_status === "qef_new_2025" ||
      source.election_status === "qef_continuing"
    : source.election_status === "mtm_new_2025" ||
      source.election_status === "mtm_continuing";
  if (!compatible) {
    throw new Error(
      "Form 8621 election source disagrees with calculation regime",
    );
  }
  return source;
}

/** Bind each Part V line 15b history amount to a reviewed source locator. */
export function reconcileForm8621PriorDistributionRecords(item: F8621Item) {
  const parent = projectForm8621ParentSource(item);
  if (item.regime !== PficRegime.EXCESS_DISTRIBUTION) {
    throw new Error("Form 8621 prior distribution records need section 1291");
  }
  const expected = (item.excess_events ?? []).flatMap((event, eventIndex) =>
    event.kind === ExcessEventKind.Distribution
      ? event.prior_year_distributions.map((year) => ({
        source_event_index: eventIndex,
        tax_year: year.tax_year,
        currency_code: "currency_code" in event ? event.currency_code : "USD",
        amount: "amount_foreign" in year
          ? year.amount_foreign
          : year.amount_usd,
      }))
      : []
  );
  const records = parent.section1291_prior_distribution_records ?? [];
  const key = (row: { source_event_index: number; tax_year: number }) =>
    `${row.source_event_index}:${row.tax_year}`;
  const byKey = new Map(records.map((record) => [key(record), record]));
  if (
    records.length !== expected.length || byKey.size !== records.length ||
    expected.some((year) => {
      const record = byKey.get(key(year));
      return !record || record.currency_code !== year.currency_code ||
        Math.abs(record.amount - year.amount) > 0.005;
    })
  ) {
    throw new Error(
      "Form 8621 Part V prior distribution records differ from each source event and holding year",
    );
  }
  return records;
}
