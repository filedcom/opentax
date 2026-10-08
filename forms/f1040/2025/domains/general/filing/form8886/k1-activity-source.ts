import { inputSchema as scheduleESchema } from "../../../../../nodes/inputs/income/rental-passthrough/schedule_e/index.ts";
import { z } from "zod";
import type { ExecuteResult } from "../../../../../../../core/runtime/executor.ts";
import type { FilerIdentity } from "../../../../../mef/header.ts";
import {
  inputSchema as partnershipSchema,
  itemSchema as partnershipRow,
} from "../../../../../nodes/inputs/income/rental-passthrough/k1_partnership/index.ts";
import {
  inputSchema as corporationSchema,
  itemSchema as corporationRow,
} from "../../../../../nodes/inputs/income/rental-passthrough/k1_s_corp/index.ts";
import {
  inputSchema as trustSchema,
  itemSchema as trustRow,
} from "../../../../../nodes/inputs/income/rental-passthrough/k1_trust/index.ts";
import { scheduleE as nativeScheduleE } from "../../../../mef/forms/income/rental-passthrough/schedule_e.ts";
import { buildPending } from "../../../../mef/execution/pending.ts";
import { scheduleEK1Part2Rows } from "../../../income/rental-passthrough/schedule-e/schedule-e-k1-part2.ts";
import { assertReturnScheduleJoins } from "../../../../return-processing/return-wide-arithmetic.ts";
import { assertForm8886K1Identity } from "./k1-source.ts";
import {
  currentReturnLinkSchema,
  disclosureSchema,
  EntityType,
  K1ActivityComponent,
  ReturnSourceKind,
} from "./source.ts";

export const k1ActivityReturnSourceSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal(ReturnSourceKind.PartnershipK1Activity),
    row: partnershipRow,
  }).strict(),
  z.object({
    kind: z.literal(ReturnSourceKind.SCorporationK1Activity),
    row: corporationRow,
  }).strict(),
  z.object({ kind: z.literal(ReturnSourceKind.TrustK1Activity), row: trustRow })
    .strict(),
]);
type ActivitySource = z.infer<typeof k1ActivityReturnSourceSchema>;
type Link = z.infer<typeof currentReturnLinkSchema>;
type Disclosure = z.infer<typeof disclosureSchema>;

export function findForm8886K1ActivitySource(
  link: Link,
  pending: ExecuteResult["pending"],
): ActivitySource | undefined {
  if (link.source_kind === ReturnSourceKind.PartnershipK1Activity) {
    const rows = partnershipSchema.parse(pending.k1_partnership).k1_partnerships
      .filter((row) =>
        row.partnership_ein === link.source_transaction_id &&
        row.source_document_reference === link.source_document_reference
      );
    if (rows.length !== 1) {
      throw new Error(
        "Form 8886 K-1 activity link must resolve exactly one retained row",
      );
    }
    return { kind: ReturnSourceKind.PartnershipK1Activity, row: rows[0] };
  }
  if (link.source_kind === ReturnSourceKind.SCorporationK1Activity) {
    const rows = corporationSchema.parse(pending.k1_s_corp).k1_s_corps.filter(
      (row) =>
        row.corporation_ein === link.source_transaction_id &&
        row.source_document_reference === link.source_document_reference,
    );
    if (rows.length !== 1) {
      throw new Error(
        "Form 8886 K-1 activity link must resolve exactly one retained row",
      );
    }
    return { kind: ReturnSourceKind.SCorporationK1Activity, row: rows[0] };
  }
  if (link.source_kind === ReturnSourceKind.TrustK1Activity) {
    const rows = trustSchema.parse(pending.k1_trust).k1_trusts.filter((row) =>
      row.estate_trust_ein === link.source_transaction_id &&
      row.source_document_reference === link.source_document_reference
    );
    if (rows.length !== 1) {
      throw new Error(
        "Form 8886 K-1 activity link must resolve exactly one retained row",
      );
    }
    return { kind: ReturnSourceKind.TrustK1Activity, row: rows[0] };
  }
  return undefined;
}
function activityFacts(source: ActivitySource, component: K1ActivityComponent) {
  if (source.kind === ReturnSourceKind.TrustK1Activity) {
    const row = source.row;
    const amount = component === K1ActivityComponent.OrdinaryBusiness
      ? row.box6_ordinary_business
      : component === K1ActivityComponent.RentalRealEstate
      ? row.box7_rental_real_estate
      : component === K1ActivityComponent.OtherRental
      ? row.box8_other_rental
      : row.box5_other_portfolio;
    return {
      owner: row.beneficiary_ssn,
      ein: row.estate_trust_ein,
      name: row.estate_trust_name,
      entity: EntityType.Trust,
      source_tax_year: row.source_tax_year,
      amount: amount ?? 0,
    };
  }
  if (component === K1ActivityComponent.OtherPortfolio) {
    throw new Error(
      "Form 8886 other-portfolio activity component belongs to a trust K-1",
    );
  }
  const row = source.row;
  const amount = component === K1ActivityComponent.OrdinaryBusiness
    ? row.box1_ordinary_business
    : component === K1ActivityComponent.RentalRealEstate
    ? row.box2_rental_re
    : row.box3_other_rental;
  if (row.eic_passive_activity_review?.recipient_tin !== row.recipient_tin) {
    throw new Error(
      "Form 8886 K-1 activity classification recipient differs from its source",
    );
  }
  return {
    owner: row.recipient_tin,
    ein: source.kind === ReturnSourceKind.PartnershipK1Activity
      ? source.row.partnership_ein
      : source.row.corporation_ein,
    name: source.kind === ReturnSourceKind.PartnershipK1Activity
      ? source.row.partnership_name
      : source.row.corporation_name,
    entity: source.kind === ReturnSourceKind.PartnershipK1Activity
      ? EntityType.Partnership
      : EntityType.SCorporation,
    source_tax_year: row.source_tax_year,
    amount: amount ?? 0,
  };
}

/** Validate the existing activity/basis/passive route and its actual Schedule E
 * and 1040 joins. Entered amounts are not gross section 165 loss evidence. */
export function reconcileForm8886K1ActivityFacts(
  source: ActivitySource,
  link: Link,
  disclosure: Disclosure,
  pending: ExecuteResult["pending"],
  filer: FilerIdentity,
) {
  const component = z.nativeEnum(K1ActivityComponent).parse(
    link.source_component,
  );
  const facts = activityFacts(source, component);
  assertForm8886K1Identity(facts, link, disclosure);
  if (
    !Number.isFinite(facts.amount) ||
    !Number.isSafeInteger(Math.round(facts.amount * 100)) ||
    Math.abs(facts.amount * 100 - Math.round(facts.amount * 100)) > 0.000001
  ) throw new Error("Form 8886 K-1 activity amount requires cent precision");
  if (facts.amount === 0) {
    throw new Error(
      "Form 8886 K-1 linked activity component has no retained amount",
    );
  }
  if (
    facts.amount < 0 &&
    !(source.kind === ReturnSourceKind.SCorporationK1Activity &&
      component === K1ActivityComponent.OrdinaryBusiness &&
      source.row.first_year_passive_loss_source)
  ) {
    throw new Error(
      "Form 8886 K-1 loss needs its finalized basis, at-risk and passive allocation route",
    );
  }
  const nativePending = buildPending(pending);
  if (source.kind === ReturnSourceKind.TrustK1Activity) {
    const trustRows =
      scheduleESchema.parse(nativePending.schedule_e ?? {}).estate_trust_rows ??
        [];
    const matches = trustRows.filter((row) =>
      row.estate_trust_ein === facts.ein &&
      row.estate_trust_name === facts.name &&
      row.source_document_reference === link.source_document_reference
    );
    if (matches.length !== 1) {
      throw new Error(
        "Form 8886 trust activity must have its actual Schedule E Part III row",
      );
    }
  }
  const native = nativeScheduleE.build(nativePending.schedule_e ?? {}, {
    pending: nativePending,
    filer,
  });
  if (typeof native !== "string" || !native) {
    throw new Error(
      "Form 8886 K-1 activity needs its source-backed native Schedule E",
    );
  }
  const total = /<TotalSuppIncomeOrLossAmt>(-?\d+)<\/TotalSuppIncomeOrLossAmt>/
    .exec(native)?.[1];
  // The calculated zero route omits zero Schedule 1 line 5 and 1040 line 8.
  // Require its finalized Schedule 1 total, and treat only absent values as zero.
  const line5 = pending.schedule1?.line5_schedule_e ?? 0;
  const line8 = pending.f1040?.line8_additional_income ?? 0;
  if (
    total === undefined || typeof line5 !== "number" ||
    line5 !== Number(total) ||
    typeof pending.schedule1?.line10_total_additional_income !== "number" ||
    typeof line8 !== "number" || !Number.isFinite(line8)
  ) {
    throw new Error(
      "Form 8886 K-1 activity needs finalized Schedule E, Schedule 1 and Form 1040 joins",
    );
  }
  assertReturnScheduleJoins(pending.f1040, pending);
  const nativeRows = source.kind === ReturnSourceKind.TrustK1Activity
    ? []
    : scheduleEK1Part2Rows(nativePending).filter((row) =>
      row.ein === facts.ein && row.name === facts.name &&
      row.code ===
        (source.kind === ReturnSourceKind.PartnershipK1Activity ? "P" : "S")
    );
  if (
    source.kind !== ReturnSourceKind.TrustK1Activity && nativeRows.length !== 1
  ) {
    throw new Error(
      "Form 8886 K-1 activity must have its actual Schedule E Part II row",
    );
  }
  return Object.freeze({
    issued_activity_income_loss: facts.amount,
    allowed_passive_activity_loss: facts.amount < 0
      ? nativeRows[0].passiveLoss
      : undefined,
    native_schedule_e_total: Number(total),
  });
}
