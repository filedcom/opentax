import { inputSchema as partnershipSchema } from "../nodes/inputs/k1_partnership/index.ts";
import { inputSchema as sCorpSchema } from "../nodes/inputs/k1_s_corp/index.ts";
import type { K1PassiveEicReview } from "../nodes/inputs/k1_passive_eic.ts";

export interface ScheduleEK1Part2Row {
  readonly name: string;
  readonly code: "P" | "S";
  readonly ein: string;
  readonly passiveIncome: number;
  readonly nonpassiveIncome: number;
}

function classified(
  box1: number,
  box2: number,
  box3: number,
  review: K1PassiveEicReview | undefined,
): { passiveIncome: number; nonpassiveIncome: number } {
  if ([box1, box2, box3].some((amount) => amount < 0)) {
    throw new Error(
      "Schedule E K-1 mixed income and loss needs finalized basis, at-risk, and Form 8582 allocations",
    );
  }
  if (
    !review ||
    (box1 > 0 && !review.box1) ||
    (box2 > 0 && !review.box2) ||
    (box3 > 0 && !review.box3)
  ) {
    throw new Error(
      "Schedule E K-1 income needs reviewed per-box passive classification",
    );
  }
  const amounts = [box1, box2, box3] as const;
  const statuses = [review.box1, review.box2, review.box3] as const;
  return {
    passiveIncome: amounts.reduce(
      (sum, amount, index) =>
        sum + (statuses[index] === "passive" ? amount : 0),
      0,
    ),
    nonpassiveIncome: amounts.reduce(
      (sum, amount, index) =>
        sum + (statuses[index] === "nonpassive" ? amount : 0),
      0,
    ),
  };
}

/** Source-backed positive Part II rows shared by native and PDF Schedule E. */
export function scheduleEK1Part2Rows(
  pending: Readonly<Record<string, unknown>> | undefined,
): ScheduleEK1Part2Row[] {
  const general = pending?.general as Record<string, unknown> | undefined;
  const digits = (value: unknown) =>
    typeof value === "string" ? value.replace(/\D/g, "") : "";
  const recipients = [digits(general?.taxpayer_ssn)];
  if (
    general?.filing_status === "mfj" ||
    general?.filing_status === "married_filing_jointly"
  ) recipients.push(digits(general?.spouse_ssn));
  const assertRecipient = (review: K1PassiveEicReview | undefined) => {
    if (!review || !recipients.includes(review.recipient_tin)) {
      throw new Error(
        "Schedule E K-1 activity recipient needs the filer or joint spouse TIN",
      );
    }
  };
  const partnerships = pending?.k1_partnership === undefined
    ? []
    : partnershipSchema.parse(pending.k1_partnership).k1_partnerships;
  const sCorps = pending?.k1_s_corp === undefined
    ? []
    : sCorpSchema.parse(pending.k1_s_corp).k1_s_corps;
  const rows: ScheduleEK1Part2Row[] = [];
  const ownerKeys: string[] = [];
  for (const item of partnerships) {
    const box1 = item.box1_ordinary_business ?? 0;
    const box2 = item.box2_rental_re ?? 0;
    const box3 = item.box3_other_rental ?? 0;
    const guaranteed = (item.box4a_guaranteed_services ?? 0) +
      (item.box4b_guaranteed_capital ?? 0);
    if (box1 <= 0 && box2 <= 0 && box3 <= 0 && guaranteed <= 0) continue;
    if (!item.partnership_ein || !item.source_document_reference) {
      throw new Error(
        "Schedule E partnership K-1 needs issuer EIN and source reference",
      );
    }
    assertRecipient(item.eic_passive_activity_review);
    if (
      !item.eic_passive_activity_review
        ?.partnership_not_publicly_traded_verified
    ) {
      throw new Error(
        "Schedule E partnership K-1 needs reviewed non-PTP status",
      );
    }
    const result = [box1, box2, box3].some((amount) => amount > 0)
      ? classified(box1, box2, box3, item.eic_passive_activity_review)
      : { passiveIncome: 0, nonpassiveIncome: 0 };
    ownerKeys.push(
      `P:${item.partnership_ein}:${item.eic_passive_activity_review?.recipient_tin}`,
    );
    rows.push({
      name: item.partnership_name,
      code: "P",
      ein: item.partnership_ein,
      passiveIncome: result.passiveIncome,
      nonpassiveIncome: result.nonpassiveIncome + guaranteed,
    });
  }
  for (const item of sCorps) {
    const box1 = item.box1_ordinary_business ?? 0;
    const box2 = item.box2_rental_re ?? 0;
    const box3 = item.box3_other_rental ?? 0;
    if (box1 <= 0 && box2 <= 0 && box3 <= 0) continue;
    if (!item.corporation_ein || !item.source_document_reference) {
      throw new Error(
        "Schedule E S-corporation K-1 needs issuer EIN and source reference",
      );
    }
    assertRecipient(item.eic_passive_activity_review);
    if ((item.box6_royalties ?? 0) !== 0) {
      throw new Error(
        "Schedule E S-corporation K-1 royalty needs its Part I property source",
      );
    }
    const result = classified(
      box1,
      box2,
      box3,
      item.eic_passive_activity_review,
    );
    ownerKeys.push(
      `S:${item.corporation_ein}:${item.eic_passive_activity_review?.recipient_tin}`,
    );
    rows.push({
      name: item.corporation_name,
      code: "S",
      ein: item.corporation_ein,
      ...result,
    });
  }
  const keys = ownerKeys;
  if (new Set(keys).size !== keys.length) {
    throw new Error("Schedule E Part II K-1 owner/issuer rows must be unique");
  }
  return rows;
}
