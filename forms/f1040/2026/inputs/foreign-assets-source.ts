import { z } from "zod";
import {
  createForm8938Schemas,
  deriveF8938Summary,
  ForeignAssetType,
  form8938ThresholdDecision,
} from "../../nodes/inputs/general/foreign/f8938/index.ts";
import { investmentOwner2026 } from "./investment-source.ts";
import { FilingStatus } from "../../nodes/types.ts";
import {
  isSourceMoney,
  sourceCents,
} from "../../nodes/intermediate/forms/taxes/retirement/form4972/source-rounding.ts";
import { roundWholeDollars } from "../../whole-dollars.ts";
import {
  foreignBeneficialInterest2026Schema,
  prepareForeignBeneficialInterest2026,
} from "./foreign-beneficial-interest.ts";

const shared = createForm8938Schemas(2026);
const ref = z.string().trim().min(1), date = z.string().date();
const money = z.number().finite().nonnegative().max(1e9).refine(isSourceMoney);
const evidence = z.object({
  document_reference: ref,
  document_sha256: z.string().regex(/^[0-9a-f]{64}$/),
}).strict();
const rate = z.number().finite().min(1e-8).max(1e5).refine(
  (v) => Math.abs(v * 1e8 - Math.round(v * 1e8)) < 0.00001,
  "Foreign asset exchange rates need at most eight decimal places",
);
const taxItem = z.object({
  record_reference: ref,
  return_source_reference: ref,
  kind: shared.assetSchema.innerType().shape.tax_items.element.shape.kind,
  amount_usd: z.number().finite().min(-1e9).max(1e9).refine((v) =>
    isSourceMoney(Math.abs(v))
  ),
  source_document: evidence,
}).strict();
const asset = shared.assetSchema.innerType().omit({
  maximum_value_native: true,
  year_end_value_native: true,
  maximum_value_usd: true,
  year_end_value_usd: true,
  year_end_exchange_rate_usd_per_unit: true,
  exchange_rate_source: true,
  exchange_rate_date: true,
  tax_items: true,
  spouse_is_specified_individual: true,
  excepted_on_form: true,
  filed_exception_form_reference: true,
}).extend({
  // Optional on the December 2026 draft; retain only a supplied identifier.
  giin: z.string().regex(/^[A-Z0-9]{6}\.[A-Z0-9]{5}\.[A-Z0-9]{2}\.[0-9]{3}$/)
    .optional(),
  ownership_and_classification_document: evidence,
  specified_foreign_asset_and_not_excluded_account_verified: z.literal(true),
  not_a_holding_already_represented_by_another_account_verified: z.literal(
    true,
  ),
  valuation_method: z.enum([
    "reviewed_fair_market_values",
    "beneficial_interest_workpaper",
  ]),
  beneficial_interest: foreignBeneficialInterest2026Schema.optional(),
  fx: evidence.extend({
    rate_date: z.literal("2026-12-31"),
    usd_per_currency_unit: rate,
    source: z.enum(["us_treasury", "other_public_source", "usd_no_conversion"]),
    treasury_rate_unavailable_verified: z.literal(true).optional(),
  }).strict(),
  exception_form_reference: ref.optional(),
  tax_items: z.array(taxItem).max(1000),
}).strict();

/** Source-only valuation stage. This is not public intake or filed-form evidence:
 * Part III items and Part IV forms still need binding to the executed return.
 */
export const foreignAssetClaim2026Schema = z.object({
  tax_year: z.literal(2026),
  record_reference: ref,
  reviewed_on: date,
  full_calendar_year_specified_individual_and_no_dual_resident_or_possession_exception_verified:
    z.literal(true),
  complete_owner_asset_and_tax_item_inventory_verified: z.literal(true),
  all_valuation_dates_needed_for_reasonable_asset_and_portfolio_maxima_reviewed:
    z.literal(true),
  ...shared.inputSchema.innerType().pick({
    specified_individual_type: true,
    annual_income_tax_return_required: true,
    residence: true,
    eligibility_evidence: true,
  }).shape,
  spouse_specified_status_review: evidence.extend({
    spouse_tin: z.string().regex(/^\d{9}$/),
    is_specified_individual: z.boolean(),
  }).strict().optional(),
  assets: z.array(asset).min(1).max(100),
  valuation_snapshots: z.array(
    z.object({
      record_reference: ref,
      valued_on: date,
      observation: z.enum(["contemporaneous", "year_end"]),
      values: z.array(
        z.object({
          asset_reference: ref,
          native_value: money.optional(),
          source_document: evidence,
        }).strict(),
      ).min(1).max(100),
    }).strict(),
  ).min(1).max(1000),
  exception_forms: z.array(
    evidence.extend({
      record_reference: ref,
      form: z.enum(["3520", "3520-A", "5471", "8621", "8865"]),
      tax_year: z.literal(2026),
      owner_tin: z.string().regex(/^\d{9}$/),
      timely_filed_or_included_in_current_return_reviewed: z.literal(true),
      foreign_trust_beneficiary_part_iii_reviewed: z.literal(true).optional(),
      asset_references: z.array(ref).min(1).max(100),
    }).strict(),
  ).max(100),
}).strict();
export const foreignAssetSource2026Schema = investmentOwner2026.extend({
  claim: foreignAssetClaim2026Schema,
}).strict();
export type ForeignAssetSource2026 = z.input<
  typeof foreignAssetSource2026Schema
>;

// Native cents times an eight-place FX rate. Keep threshold comparisons exact,
// including half of a spousal joint interest and values just above a threshold.
const usdScale = 10_000_000_000n;
const thresholdScale = usdScale * 2n;
function usdUnits(native: number, fx: number) {
  return BigInt(sourceCents(native)) * BigInt(Math.round(fx * 1e8));
}
const dollars = (units: bigint) => Number(units) / Number(usdScale);
const printedDollars = (units: bigint) => {
  const result = Number((units + usdScale / 2n) / usdScale);
  if (!Number.isSafeInteger(result)) {
    throw Error("Foreign asset total exceeds exact whole-dollar range");
  }
  return result;
};
function exactThresholdDollars(units: bigint) {
  // 1/(2*10^10) = 5/10^11, so this decimal string never loses a half share.
  const scaled = (units * 5n).toString().padStart(12, "0");
  return `${scaled.slice(0, -11)}.${scaled.slice(-11)}`;
}

export function prepareForeignAssets2026(raw: ForeignAssetSource2026) {
  const s = foreignAssetSource2026Schema.parse(raw), c = s.claim;
  const owners = new Set([s.taxpayer_ssn]);
  if (
    s.spouse_ssn === s.taxpayer_ssn ||
    s.filing_status === FilingStatus.MFJ && !s.spouse_ssn
  ) {
    throw Error("Foreign assets need distinct actual joint return owners");
  }
  if (s.filing_status === FilingStatus.MFJ) owners.add(s.spouse_ssn!);
  if (c.eligibility_evidence.legal_status.subject_ssn !== s.taxpayer_ssn) {
    throw Error("Foreign asset eligibility must belong to the actual taxpayer");
  }
  const eligibilityRecords = Object.values(c.eligibility_evidence);
  if (
    c.reviewed_on < "2026-12-31" ||
    eligibilityRecords.some((r) => r.reviewed_on > c.reviewed_on) ||
    c.eligibility_evidence.return_requirement.reviewed_on < "2026-12-31"
  ) {
    throw Error(
      "Foreign asset annual review needs completed-year filing evidence and consistent review dates",
    );
  }
  const spouseReview = c.spouse_specified_status_review;
  const needsSpouseReview = s.filing_status === FilingStatus.MFS &&
    c.assets.some((a) => a.owner === "joint_with_spouse");
  if (
    needsSpouseReview !== !!spouseReview ||
    spouseReview && spouseReview.spouse_tin !== s.spouse_ssn
  ) {
    throw Error(
      "Separate-return joint foreign assets need the actual spouse's specified-status evidence",
    );
  }
  const ids = new Set<string>(), accounts = new Set<string>();
  const documents = new Map<string, string>();
  const checkDocument = (document: z.infer<typeof evidence>) => {
    const previous = documents.get(document.document_reference);
    if (previous !== undefined && previous !== document.document_sha256) {
      throw Error(
        "Foreign asset evidence reference identifies conflicting document copies",
      );
    }
    documents.set(document.document_reference, document.document_sha256);
  };
  for (const document of eligibilityRecords) checkDocument(document);
  if (spouseReview) checkDocument(spouseReview);
  const unique = (value: string) => {
    if (ids.has(value)) {
      throw Error("Foreign asset inventory has a duplicate record reference");
    }
    ids.add(value);
  };
  unique(c.record_reference);
  const fxByCurrency = new Map<string, number>();
  const beneficialInterests = new Map<
    string,
    ReturnType<typeof prepareForeignBeneficialInterest2026>
  >();
  for (const a of c.assets) {
    unique(a.asset_id);
    checkDocument(a.ownership_and_classification_document);
    checkDocument(a.fx);
    const key = [
      a.country,
      a.institution_or_issuer_name.trim().toUpperCase(),
      a.asset_identifier.trim().toUpperCase(),
    ].join("|");
    if (accounts.has(key)) {
      throw Error(
        "Foreign asset inventory repeats the same account or asset identity",
      );
    }
    accounts.add(key);
    const specialValuation =
      a.asset_type === ForeignAssetType.ForeignTrustInterest ||
      a.asset_type === ForeignAssetType.ForeignPensionInterest ||
      a.foreign_entity_type === "trust" || a.foreign_entity_type === "estate";
    if (
      specialValuation && a.valuation_method !== "beneficial_interest_workpaper"
    ) {
      throw Error(
        "Foreign trust, estate and pension interests need their separate distribution and beneficial-interest valuation workpaper",
      );
    }
    if (
      (a.valuation_method === "beneficial_interest_workpaper") !==
        !!a.beneficial_interest
    ) {
      throw Error(
        "Foreign asset valuation method needs exactly its corresponding beneficial-interest workpaper",
      );
    }
    if (a.beneficial_interest) {
      const benefit = prepareForeignBeneficialInterest2026(
        a.beneficial_interest,
        {
          ...a,
          owner_tin: a.owner === "spouse" ? s.spouse_ssn ?? "" : s.taxpayer_ssn,
        },
        c.reviewed_on,
      );
      benefit.documents.forEach(checkDocument);
      benefit.record_references.forEach(unique);
      beneficialInterests.set(a.asset_id, benefit);
    }
    if (
      a.country === "US" ||
      a.currency_code === "USD" && a.fx.usd_per_currency_unit !== 1 ||
      (a.currency_code === "USD") !== (a.fx.source === "usd_no_conversion")
    ) {
      throw Error(
        "Foreign assets need a foreign classification and USD uses a rate of one",
      );
    }
    if (
      (a.fx.source === "other_public_source") !==
        !!a.fx.treasury_rate_unavailable_verified
    ) {
      throw Error(
        "Alternative foreign asset FX sources require reviewed unavailability of the Treasury year-end rate",
      );
    }
    const previousFx = fxByCurrency.get(a.currency_code);
    if (previousFx !== undefined && previousFx !== a.fx.usd_per_currency_unit) {
      throw Error(
        "Foreign assets in one currency need the same reviewed year-end exchange rate",
      );
    }
    fxByCurrency.set(a.currency_code, a.fx.usd_per_currency_unit);
    for (const item of a.tax_items) {
      unique(item.record_reference);
      checkDocument(item.source_document);
    }
  }
  const exceptions = new Map(
    c.exception_forms.map((f) => [f.record_reference, f]),
  );
  const formCopies = new Set<string>();
  for (const f of c.exception_forms) {
    unique(f.record_reference);
    checkDocument(f);
    if (!owners.has(f.owner_tin)) {
      throw Error("Foreign asset exception form needs an actual return owner");
    }
    const key = `${f.form}:${f.document_sha256}`;
    if (formCopies.has(key)) {
      throw Error("Foreign asset exception forms repeat the same source copy");
    }
    formCopies.add(key);
    const actual = c.assets.filter((a) =>
      a.exception_form_reference === f.record_reference
    ).map((a) => a.asset_id).sort();
    if (
      JSON.stringify(actual) !== JSON.stringify([...f.asset_references].sort())
    ) {
      throw Error(
        "Foreign asset exception form must identify exactly its reviewed assets",
      );
    }
  }
  const assetMap = new Map(c.assets.map((a) => [a.asset_id, a]));
  const maxima = new Map<
    string,
    { native: number; units: bigint; date: string }
  >();
  let yearEndSnapshots = 0;
  const snapshots = [...c.valuation_snapshots].sort((a, b) =>
    a.valued_on.localeCompare(b.valued_on) ||
    a.observation.localeCompare(b.observation)
  ).map((snapshot) => {
    unique(snapshot.record_reference);
    if (
      !snapshot.valued_on.startsWith("2026-") ||
      snapshot.observation === "year_end" && snapshot.valued_on !== "2026-12-31"
    ) {
      throw Error(
        "Foreign asset snapshots must be in 2026 with year-end values dated December 31",
      );
    }
    if (snapshot.observation === "year_end") yearEndSnapshots++;
    const seen = new Set<string>();
    let total = 0n;
    const values = snapshot.values.map((value) => {
      checkDocument(value.source_document);
      const a = assetMap.get(value.asset_reference);
      if (!a || seen.has(value.asset_reference)) {
        throw Error(
          "Each foreign valuation snapshot needs each actual asset exactly once",
        );
      }
      seen.add(value.asset_reference);
      const outsideHoldingPeriod = !!(a.opened_or_acquired_date &&
          snapshot.valued_on < a.opened_or_acquired_date ||
        a.closed_or_disposed_date &&
          (snapshot.valued_on > a.closed_or_disposed_date ||
            snapshot.observation === "year_end"));
      const benefit = beneficialInterests.get(a.asset_id);
      let native: number;
      if (benefit && !benefit.threshold_fmv_known) {
        if (value.native_value !== undefined) {
          throw Error(
            "Unknown foreign beneficial interests use the derived fallback, not an entered snapshot value",
          );
        }
        native = outsideHoldingPeriod ? 0 : benefit.threshold_fallback_native!;
      } else {
        if (value.native_value === undefined) {
          throw Error(
            "Known foreign asset values require their actual source snapshot amount",
          );
        }
        native = value.native_value;
      }
      if (native !== 0 && outsideHoldingPeriod) {
        throw Error(
          "Foreign asset values outside its holding period must be zero",
        );
      }
      if (
        snapshot.observation === "year_end" && benefit &&
        benefit.source.kind !== "foreign_trust_beneficiary" &&
        benefit.source.year_end_interest.kind === "known" &&
        native !== benefit.source.year_end_interest.value_native
      ) {
        throw Error(
          "Foreign beneficial year-end snapshot differs from its actual interest valuation document",
        );
      }
      const units = usdUnits(native, a.fx.usd_per_currency_unit);
      const previous = maxima.get(a.asset_id);
      if (!previous || previous.units < units) {
        maxima.set(a.asset_id, {
          native,
          units,
          date: snapshot.valued_on,
        });
      }
      const factor = needsSpouseReview && a.owner === "joint_with_spouse" &&
          spouseReview!.is_specified_individual
        ? 1n
        : 2n;
      total += units * factor;
      return {
        ...value,
        native_value: native,
        valuation_basis: benefit && !benefit.threshold_fmv_known
          ? "beneficial_interest_fallback" as const
          : "source_fair_market_value" as const,
        usd_value: dollars(units),
        threshold_share: Number(factor) / 2,
      };
    });
    if (seen.size !== c.assets.length) {
      throw Error(
        "Each foreign valuation snapshot needs the complete asset inventory",
      );
    }
    return {
      record_reference: snapshot.record_reference,
      valued_on: snapshot.valued_on,
      observation: snapshot.observation,
      values,
      units: total,
    };
  });
  const last = snapshots.at(-1)!;
  if (yearEndSnapshots !== 1 || last.observation !== "year_end") {
    throw Error(
      "Foreign asset values require the actual year-end snapshot, including closed accounts",
    );
  }
  const peak = snapshots.reduce((a, b) => a.units >= b.units ? a : b);
  const reportedUnits = new Map(c.assets.map((a) => {
    const benefit = beneficialInterests.get(a.asset_id);
    if (
      benefit && !benefit.threshold_fmv_known &&
      benefit.reported_maximum_native > 0 &&
      maxima.get(a.asset_id)!.native === 0
    ) {
      throw Error(
        "Foreign beneficial distributions need an active holding-period observation for their threshold fallback",
      );
    }
    return [
      a.asset_id,
      benefit
        ? usdUnits(benefit.reported_maximum_native, a.fx.usd_per_currency_unit)
        : maxima.get(a.asset_id)!.units,
    ];
  }));
  const assets = c.assets.map((a) => {
    const maximum = maxima.get(a.asset_id)!,
      end = last.values.find((v) => v.asset_reference === a.asset_id)!;
    const exception = a.exception_form_reference
      ? exceptions.get(a.exception_form_reference)
      : undefined;
    if (a.exception_form_reference && !exception) {
      throw Error(
        "Foreign asset exception needs its actual reviewed form copy",
      );
    }
    if (
      exception?.form === "3520-A"
    ) {
      throw Error(
        "Foreign grantor trust exceptions require the separate ownership and paired 3520/3520-A filing workpaper",
      );
    }
    if (exception?.form === "3520") {
      const benefit = beneficialInterests.get(a.asset_id);
      if (
        benefit?.source.kind !== "foreign_trust_beneficiary" ||
        !exception.foreign_trust_beneficiary_part_iii_reviewed ||
        exception.owner_tin !== benefit.source.beneficiary_tin
      ) {
        throw Error(
          "Foreign trust beneficiary exception needs the actual beneficiary's reviewed Form 3520 Part III",
        );
      }
    } else if (exception?.foreign_trust_beneficiary_part_iii_reviewed) {
      throw Error(
        "Foreign trust Part III review belongs only to a Form 3520 exception",
      );
    }
    if (
      exception && exception.form !== "3520" && (
        ![ForeignAssetType.ForeignStock, ForeignAssetType.ForeignEntityInterest]
          .includes(a.asset_type) ||
        (exception.form === "8865"
          ? a.foreign_entity_type !== "partnership"
          : a.foreign_entity_type !== "corporation")
      )
    ) {
      throw Error(
        "Foreign asset exception form must match the actual foreign entity interest",
      );
    }
    const {
      ownership_and_classification_document: _evidence,
      specified_foreign_asset_and_not_excluded_account_verified:
        _classification,
      not_a_holding_already_represented_by_another_account_verified: _holding,
      valuation_method: _method,
      beneficial_interest: _beneficialInterest,
      fx,
      exception_form_reference: _exception,
      tax_items: _taxItems,
      ...detail
    } = a;
    return shared.assetSchema.parse({
      ...detail,
      ...(a.owner === "joint_with_spouse" && needsSpouseReview
        ? {
          spouse_is_specified_individual: spouseReview!.is_specified_individual,
        }
        : {}),
      maximum_value_native: maximum.native,
      maximum_value_usd: dollars(maximum.units),
      year_end_value_native: end.native_value,
      year_end_value_usd: end.usd_value,
      year_end_exchange_rate_usd_per_unit: fx.usd_per_currency_unit,
      exchange_rate_date: fx.rate_date,
      exchange_rate_source: fx.document_reference,
      ...(exception
        ? {
          excepted_on_form: exception.form,
          filed_exception_form_reference: exception.record_reference,
        }
        : {}),
      // Only valuation and summary reuse this shape. Tax items are retained
      // separately until the actual source and filed destination are bound.
      tax_items: [],
    });
  });
  const input = shared.inputSchema.parse({
    specified_individual_type: c.specified_individual_type,
    annual_income_tax_return_required: c.annual_income_tax_return_required,
    filing_status: s.filing_status === FilingStatus.QSS
      ? "qw"
      : s.filing_status,
    residence: c.residence,
    eligibility_evidence: c.eligibility_evidence,
    max_value_all_assets: Number(peak.units) / Number(thresholdScale),
    year_end_value_all_assets: Number(last.units) / Number(thresholdScale),
    assets,
  });
  const thresholds = form8938ThresholdDecision(input);
  const filingRequired = input.annual_income_tax_return_required &&
    (last.units > BigInt(thresholds.yearEndThreshold) * thresholdScale ||
      peak.units > BigInt(thresholds.anyTimeThreshold) * thresholdScale);
  const summary = deriveF8938Summary(input, 2026);
  const detailUnits = (type: "deposit" | "custodial" | "other") =>
    c.assets.filter((a) =>
      !a.exception_form_reference &&
      (type === "deposit"
        ? a.asset_type === ForeignAssetType.DepositAccount
        : type === "custodial"
        ? a.asset_type === ForeignAssetType.CustodialAccount
        : a.asset_type !== ForeignAssetType.DepositAccount &&
          a.asset_type !== ForeignAssetType.CustodialAccount)
    ).reduce((n, a) => n + reportedUnits.get(a.asset_id)!, 0n);
  return {
    source_input: s,
    valuation_input: input,
    threshold: {
      ...thresholds,
      filingRequired,
      year_end_usd_exact: exactThresholdDollars(last.units),
      maximum_usd_exact: exactThresholdDollars(peak.units),
      peak_date: peak.valued_on,
    },
    snapshots: snapshots.map(({ units, ...snapshot }) => ({
      ...snapshot,
      threshold_usd_exact: exactThresholdDollars(units),
    })),
    asset_values: c.assets.map((a) => ({
      asset_reference: a.asset_id,
      threshold_maximum_date: maxima.get(a.asset_id)!.date,
      reported_value_date: beneficialInterests.has(a.asset_id)
        ? "2026-12-31"
        : maxima.get(a.asset_id)!.date,
      maximum_reported_dollars: printedDollars(reportedUnits.get(a.asset_id)!),
      reported_value_basis:
        beneficialInterests.get(a.asset_id)?.reported_value_basis ??
          "maximum_observed_fair_market_value",
    })),
    beneficial_interest_workpapers: [...beneficialInterests.entries()].map((
      [asset_reference, workpaper],
    ) => ({ asset_reference, ...workpaper })),
    summary: {
      ...summary,
      partI: {
        ...summary.partI,
        depositMaximumValueUsd: printedDollars(detailUnits("deposit")),
        custodialMaximumValueUsd: printedDollars(detailUnits("custodial")),
      },
      partII: {
        ...summary.partII,
        otherMaximumValueUsd: printedDollars(detailUnits("other")),
      },
    },
    tax_items: c.assets.flatMap((a) =>
      a.tax_items.map((item) => ({
        asset_reference: a.asset_id,
        excepted: !!a.exception_form_reference,
        ...item,
        printed_amount: roundWholeDollars(item.amount_usd),
      }))
    ),
    requires_tax_item_return_binding:
      c.assets.some((a) => a.tax_items.length > 0) ||
      [...beneficialInterests.values()].some((b) =>
        b.distribution_rows.length > 0
      ),
    requires_exception_filing_binding: c.exception_forms.length > 0,
    filing_ready: false as const,
  };
}
