import { z } from "zod";
import { PDFDocument } from "pdf-lib";
import { sha256Hex } from "../../../2025/prepared-source.ts";
import { inputSchema as generalInputSchema } from "../general/index.ts";
import {
  assertCreditDisallowanceEvidence,
  type F8862Input,
  priorCreditDisallowanceReviewSchema,
} from "./index.ts";

const noticeByteReviewSchema = z.object({
  credit: z.enum(["ctc_odc", "aotc"]),
  notice: priorCreditDisallowanceReviewSchema,
  notice_copy_sha256: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();

export type Form8862PriorNoticeByteReview = z.infer<
  typeof noticeByteReviewSchema
>;

export type Form8862PriorNoticeCopy = Readonly<{
  notice_copy_reference: string;
  bytes: Uint8Array;
}>;

/** Bind reviewed notice identities to exact retained PDF bytes. */
export async function bindForm8862PriorNoticeCopies(
  fields: F8862Input,
  rawReviews: unknown,
  copies: readonly Form8862PriorNoticeCopy[],
  finalFilerSsn: string,
  rawFinalGeneral: unknown,
): Promise<void> {
  assertCreditDisallowanceEvidence(fields);
  const general = generalInputSchema.parse(rawFinalGeneral);
  const reviews = z.array(noticeByteReviewSchema).min(1).max(2).parse(
    rawReviews,
  );
  const expectedCredits = [
    ...(fields.claim_ctc ? ["ctc_odc"] : []),
    ...(fields.claim_aotc ? ["aotc"] : []),
  ];
  const normalizedSsn = finalFilerSsn.replace(/\D/g, "");
  if (
    fields.claim_eitc === true ||
    fields.credit_disallowance_ban_active !== false ||
    !/^\d{9}$/.test(normalizedSsn) ||
    general.taxpayer_ssn?.replace(/\D/g, "") !== normalizedSsn ||
    reviews.length !== expectedCredits.length ||
    new Set(reviews.map((entry) => entry.credit)).size !== reviews.length ||
    new Set(reviews.map((entry) => entry.notice.notice_copy_reference)).size !==
      reviews.length ||
    reviews.some((entry) => {
      const year = entry.credit === "ctc_odc"
        ? fields.ctc_disallowed_year
        : fields.aotc_disallowed_year;
      const reference = entry.credit === "ctc_odc"
        ? fields.ctc_disallowance_notice_reference
        : fields.aotc_disallowance_notice_reference;
      const finalReview = entry.credit === "ctc_odc"
        ? general.prior_ctc_disallowance_review
        : general.prior_aotc_disallowance_review;
      return !expectedCredits.includes(entry.credit) ||
        entry.notice.disallowed_year !== year ||
        entry.notice.notice_reference !== reference ||
        entry.notice.taxpayer_ssn.replace(/\D/g, "") !== normalizedSsn ||
        !finalReview ||
        entry.notice.disallowed_year !== finalReview.disallowed_year ||
        entry.notice.notice_reference !== finalReview.notice_reference ||
        entry.notice.notice_copy_reference !==
          finalReview.notice_copy_reference ||
        entry.notice.taxpayer_ssn.replace(/\D/g, "") !==
          finalReview.taxpayer_ssn.replace(/\D/g, "") ||
        entry.notice.nonclerical_disallowance_verified !==
          finalReview.nonclerical_disallowance_verified ||
        entry.notice.no_active_ban_verified !==
          finalReview.no_active_ban_verified;
    }) ||
    copies.length !== reviews.length ||
    new Set(copies.map((copy) => copy.notice_copy_reference)).size !==
      copies.length
  ) {
    throw new Error(
      "Form 8862 prior notice copies do not match each claimed credit, year, notice, and filer",
    );
  }
  for (const entry of reviews) {
    const copy = copies.find((item) =>
      item.notice_copy_reference === entry.notice.notice_copy_reference
    );
    if (
      !copy || !(copy.bytes instanceof Uint8Array) ||
      copy.bytes.length < 8 ||
      new TextDecoder().decode(copy.bytes.subarray(0, 5)) !== "%PDF-" ||
      await sha256Hex(copy.bytes) !== entry.notice_copy_sha256
    ) {
      throw new Error(
        `Form 8862 reviewed ${entry.notice.notice_copy_reference} PDF bytes differ from the retained notice copy`,
      );
    }
    try {
      const parsed = await PDFDocument.load(copy.bytes, {
        ignoreEncryption: false,
        updateMetadata: false,
      });
      if (parsed.getPageCount() < 1) {
        throw new Error("no pages");
      }
    } catch {
      throw new Error(
        `Form 8862 reviewed ${entry.notice.notice_copy_reference} copy is not a readable PDF notice`,
      );
    }
  }
}
