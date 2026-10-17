/**
 * MeF Business Rules: T0000
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 5 rules (5 implemented, 0 stubs)
 *
 * Checked on the transmission facts (EnvelopeFact): the Message ID, the
 * transmitter ETIN and the Submission IDs sent. There is no local store of
 * earlier transmissions, so global uniqueness is checked as far as one
 * transmission and its processing day reach.
 */

import type {
  ReturnContext,
  RuleDef,
} from "../../../../../../core/validation/types.ts";
import { rule } from "../../../../../../core/validation/mod.ts";
import {
  EnvelopeFact,
  factText,
  factTexts,
} from "../../../../../../core/validation/predicates.ts";
import { manifestText, submissionEnvelope } from "./envelope.ts";

/** ccyyddd of a YYYY-MM-DD date: the date part of Message and Submission IDs. */
function julianStamp(date: string): string | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return undefined;
  const day = (Date.UTC(+m[1], +m[2] - 1, +m[3]) - Date.UTC(+m[1], 0, 1)) /
      86_400_000 + 1;
  return m[1] + String(day).padStart(3, "0");
}

/** Every Submission ID the context sends: the submission's own and the transmission's. */
const submissionIds = (ctx: ReturnContext): readonly string[] => {
  const own = manifestText(submissionEnvelope(ctx), "SubmissionId");
  return [
    ...(own === undefined ? [] : [own]),
    ...factTexts(ctx, EnvelopeFact.TransmissionSubmissionIds),
  ];
};

/** An ID minted on the processing day cannot repeat one minted on an earlier day. */
const mintedOn = (
  id: string,
  stampAt: number,
  processingDate: string | undefined,
): boolean => {
  const stamp = processingDate ? julianStamp(processingDate) : undefined;
  return stamp === undefined || id.slice(stampAt, stampAt + 7) === stamp;
};

export const T0000_RULES: readonly RuleDef[] = [
  rule(
    "T0000-013",
    "reject_and_stop",
    "incorrect_data",
    // Uniqueness against other transmitters' and earlier messages is MeF's.
    (ctx) => {
      const id = factText(ctx, EnvelopeFact.MessageId);
      return id === undefined ||
        (/^[0-9]{12}[a-z0-9]{8}$/.test(id) &&
          mintedOn(id, 5, factText(ctx, EnvelopeFact.ProcessingDate)));
    },
    "The Message ID must be globally unique.",
  ),
  rule(
    "T0000-014",
    "reject_and_stop",
    "incorrect_data",
    // Uniqueness against submissions sent in earlier transmissions is MeF's.
    (ctx) => {
      const ids = submissionIds(ctx);
      const own = manifestText(submissionEnvelope(ctx), "SubmissionId");
      const listed = factTexts(ctx, EnvelopeFact.TransmissionSubmissionIds);
      const processed = factText(ctx, EnvelopeFact.ProcessingDate);
      return new Set(listed).size === listed.length &&
        ids.every((id) => mintedOn(id, 6, processed)) &&
        (own === undefined || listed.length === 0 || listed.includes(own));
    },
    "The Submission ID must be globally unique.",
  ),
  rule(
    "T0000-015",
    "reject_and_stop",
    "incorrect_data",
    (ctx) => {
      const id = factText(ctx, EnvelopeFact.MessageId);
      const etin = factText(ctx, EnvelopeFact.TransmitterEtin);
      return id === undefined || etin === undefined || id.slice(0, 5) === etin;
    },
    "The ETIN in the Message ID (the first five digits) must match the ETIN provided with the request.",
  ),
  rule(
    "T0000-016",
    "reject_and_stop",
    "incorrect_data",
    (ctx) => {
      const id = factText(ctx, EnvelopeFact.MessageId);
      return id === undefined || /^[0-9]{12}[a-z0-9]{8}$/.test(id);
    },
    "The Message ID must be 20 positions in length and conform to the following format: 12 digits followed by 8 alphanumeric characters (only lower case alphabetic characters allowed).",
  ),
  rule(
    "T0000-017",
    "reject_and_stop",
    "incorrect_data",
    (ctx) => submissionIds(ctx).every((id) => id.length === 20),
    "The Submission ID must be 20 characters in length.",
  ),
];
