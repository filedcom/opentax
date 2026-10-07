import {
  type F8621Item,
  form8621ParentSourceSchema,
  PficRegime,
} from "../nodes/inputs/f8621/index.ts";
import { ExcessEventKind } from "../nodes/inputs/f8621/excess_distribution.ts";
import { assertRetainedSourceCopy } from "../nodes/inputs/f8621/retained_source_copy.ts";
import { mtmOtherLossForm8949Transaction } from "../nodes/inputs/f8621/mtm_disposition.ts";

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

/** A printable holding needs the actual bytes behind each asserted source. */
export function assertForm8621PrintableSource(item: F8621Item): void {
  const parent = projectForm8621ParentSource(item);
  if (!parent.issuer_record.bytes_base64) {
    throw new Error("Form 8621 issuer record needs retained source bytes");
  }
  assertRetainedSourceCopy(
    parent.issuer_record as Parameters<typeof assertRetainedSourceCopy>[0],
    "Form 8621 issuer record",
  );
  if (item.regime === PficRegime.EXCESS_DISTRIBUTION) {
    const records = reconcileForm8621PriorDistributionRecords(item);
    for (const record of records) {
      if (!record.bytes_base64) {
        throw new Error("Form 8621 Part V history needs retained source bytes");
      }
      assertRetainedSourceCopy(
        record as Parameters<typeof assertRetainedSourceCopy>[0],
        "Form 8621 Part V history",
      );
    }
    return;
  }
  if (item.regime === PficRegime.QEF) {
    const statement = parent.qef_annual_statement;
    if (!statement) {
      throw new Error("Form 8621 QEF needs its annual information statement");
    }
    assertRetainedSourceCopy(statement, "Form 8621 QEF statement");
    if (
      statement.ordinary_earnings_usd !== item.qef_ordinary_income ||
      statement.net_capital_gain_usd !== item.qef_capital_gain
    ) {
      throw new Error("Form 8621 QEF income differs from annual statement");
    }
    const election = item.qef_1294_election;
    if (election) {
      const activity = parent.qef_1294_activity_record;
      if (!activity) {
        throw new Error(
          "Form 8621 Election B needs retained distribution and transfer activity",
        );
      }
      assertRetainedSourceCopy(activity, "Form 8621 Election B activity");
      if (
        activity.distributions_cash_and_property_usd !==
          election.distributions_cash_and_property_usd ||
        activity.transferred_share_earnings_usd !==
          election.transferred_share_earnings_usd
      ) {
        throw new Error(
          "Form 8621 Election B distribution or transferred earnings differ from reviewed activity",
        );
      }
    }
  } else {
    const value = parent.mtm_year_end_value_record;
    const basis = parent.mtm_adjusted_basis_record;
    if (!value || !basis) {
      throw new Error("Form 8621 MTM needs quoted value and basis records");
    }
    assertRetainedSourceCopy(value, "Form 8621 MTM value record");
    assertRetainedSourceCopy(basis, "Form 8621 MTM basis record");
    if (
      value.quoted_value_usd !== item.fmv_at_year_end ||
      basis.adjusted_basis_usd !== item.mtm_adjusted_basis_at_year_end ||
      basis.unreversed_inclusions_usd !==
        (item.mtm_unreversed_inclusions ?? 0)
    ) {
      throw new Error("Form 8621 MTM value or basis differs from source");
    }
    if (
      parent.election_status === "mtm_new_2025" &&
      !parent.shares_acquired_during_2025
    ) {
      throw new Error(
        "Form 8621 first-year MTM on older stock needs section 1291 coordination",
      );
    }
    for (const disposition of item.mtm_dispositions ?? []) {
      if (
        !disposition.broker_record || !disposition.basis_record ||
        disposition.broker_record.document_id !==
          disposition.broker_record_id ||
        disposition.basis_record.document_id !== disposition.basis_record_id
      ) {
        throw new Error(
          "Form 8621 MTM sale needs broker and basis source copies",
        );
      }
      assertRetainedSourceCopy(
        disposition.broker_record,
        "Form 8621 MTM broker record",
      );
      assertRetainedSourceCopy(
        disposition.basis_record,
        "Form 8621 MTM sale basis record",
      );
      const otherLoss = mtmOtherLossForm8949Transaction(disposition);
      if (otherLoss) {
        const review = disposition.other_loss_review!;
        assertRetainedSourceCopy(
          review.acquisition_record,
          "Form 8621 MTM capital-loss acquisition record",
        );
        if (
          disposition.broker_record.tax_form_kind !== review.broker_tax_form
        ) {
          throw new Error(
            "Form 8621 MTM Form 8949 box differs from broker source",
          );
        }
      } else if (disposition.other_loss_review) {
        throw new Error(
          "Form 8621 MTM capital-loss review lacks line 14c loss",
        );
      }
    }
  }
  const continuing = parent.election_status === "qef_continuing" ||
    parent.election_status === "mtm_continuing";
  if (continuing) {
    const prior = parent.prior_election_filing;
    if (
      !prior || prior.election_kind !==
        (item.regime === PficRegime.QEF ? "qef" : "mtm")
    ) {
      throw new Error("Form 8621 continuing election needs prior filed proof");
    }
    assertRetainedSourceCopy(prior, "Form 8621 prior election");
    assertRetainedSourceCopy(
      prior.acceptance_record,
      "Form 8621 prior election acceptance",
    );
    if (
      prior.acceptance_record.submission_id !==
        prior.accepted_submission_id
    ) {
      throw new Error(
        "Form 8621 prior election acceptance ID differs from filed return",
      );
    }
  } else if (parent.prior_election_filing) {
    throw new Error("Form 8621 new election cannot claim a prior filing");
  }
}
