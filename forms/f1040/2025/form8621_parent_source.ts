import {
  type F8621Item,
  form8621ParentSourceSchema,
  PficRegime,
} from "../nodes/inputs/f8621/index.ts";

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
