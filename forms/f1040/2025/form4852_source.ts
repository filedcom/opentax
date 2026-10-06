import { isDeepStrictEqual } from "node:util";
import { createHash } from "node:crypto";
import { type FilerIdentity, FilingStatus } from "../mef/header.ts";
import { inputSchema as w2Schema } from "../nodes/inputs/w2/index.ts";
import { inputSchema as r1099Schema } from "../nodes/inputs/f1099r/index.ts";
import { FormType, inputSchema } from "../nodes/inputs/f4852/index.ts";

export interface Form4852RetainedDocument {
  readonly document_reference: string;
  readonly bytes: Uint8Array;
}

/** Validate the source contract without opening the final filing route. */
export function reconcileForm4852Source(
  pending: Readonly<Record<string, unknown>>,
  filer: FilerIdentity,
) {
  const source = inputSchema.parse(pending.f4852);
  const review = source.reviewed_source;
  if (!review || review.records.length !== source.f4852s.length) {
    throw new Error(
      "Form 4852 needs one reviewed source record per substitute",
    );
  }
  const identities = new Set<string>();
  const documentReferences = new Set<string>();
  const normalize = (s: string) => s.replace(/\D/g, "");
  const primary = normalize(filer.primarySSN);
  const spouse = filer.filingStatus === FilingStatus.MarriedFilingJointly
    ? normalize(filer.spouse?.ssn ?? "")
    : "";
  const issued = [
    ...(pending.w2 === undefined ? [] : w2Schema.parse(pending.w2).w2s).map((
      r,
    ) => ({
      type: FormType.W2,
      tin: String(r.employer_ein ?? ""),
      ssn: String(r.employee_ssn ?? ""),
    })),
    ...(pending.f1099r === undefined
      ? []
      : r1099Schema.parse(pending.f1099r).f1099rs).map((r) => ({
        type: FormType.R_1099,
        tin: String(r.payer_ein ?? ""),
        ssn: String(r.recipient_ssn ?? ""),
      })),
  ];
  for (const [i, item] of source.f4852s.entries()) {
    const record = review.records[i];
    if (!isDeepStrictEqual(item, record.reviewed_substitute)) {
      throw new Error(
        "Form 4852 reviewed facts differ from entered substitute",
      );
    }
    const recipient = normalize(item.recipient_ssn ?? "");
    if (
      !recipient || (recipient !== primary && recipient !== spouse) ||
      item.subject_ts !== (recipient === primary ? "T" : "S")
    ) {
      throw new Error(
        "Form 4852 recipient and owner must match filed taxpayer or joint spouse",
      );
    }
    if (
      item.form_year !== 2025 || !item.missing_or_incorrect ||
      !item.amount_determination_explanation ||
      !item.payer_form_efforts_explanation ||
      !item.payer_address_line1 || !item.payer_address_city ||
      !item.payer_address_state || !item.payer_address_zip
    ) {
      throw new Error(
        "Form 4852 needs completed year, payer address and explanations",
      );
    }
    if (
      item.source_workpaper_reference !==
        record.source_workpaper.document_reference ||
      item.completed_form_review_reference !==
        record.completed_form.document_reference
    ) {
      throw new Error(
        "Form 4852 workpaper and completed-form references differ from review",
      );
    }
    if (
      (item.missing_or_incorrect === "incorrect") !==
        Boolean(record.incorrect_original)
    ) {
      throw new Error(
        "Form 4852 incorrect substitute needs its retained original; missing source must not claim one",
      );
    }
    const payer = normalize(item.payer_tin ?? "");
    // An unknown TIN can be retained on paper. It cannot be invented for MeF.
    const identity = JSON.stringify([
      item.form_type,
      recipient,
      payer ||
      [
        item.payer_name.trim().toUpperCase(),
        item.payer_address_line1.trim().toUpperCase(),
      ],
      2025,
    ]);
    if (identities.has(identity)) {
      throw new Error("Form 4852 duplicate owner/payer substitute");
    }
    identities.add(identity);
    if (
      payer && issued.some((r) =>
        r.type === item.form_type &&
        normalize(r.tin) === payer && normalize(r.ssn) === recipient
      )
    ) {
      throw new Error(
        "Form 4852 original and substitute cannot both enter current income",
      );
    }
    for (
      const document of [
        record.source_workpaper,
        record.completed_form,
        ...(record.incorrect_original ? [record.incorrect_original] : []),
      ]
    ) {
      if (documentReferences.has(document.document_reference)) {
        throw new Error(
          "Form 4852 retained document reference reused across sources",
        );
      }
      documentReferences.add(document.document_reference);
    }
  }
  return source;
}

/** Resolve exact retained bytes; does not claim issuer authenticity or IRS acceptance. */
export function assertForm4852RetainedBytes(
  pending: Readonly<Record<string, unknown>>,
  filer: FilerIdentity,
  documents: readonly Form4852RetainedDocument[],
) {
  const source = reconcileForm4852Source(pending, filer);
  for (const record of source.reviewed_source!.records) {
    for (
      const expected of [
        record.source_workpaper,
        record.completed_form,
        ...(record.incorrect_original ? [record.incorrect_original] : []),
      ]
    ) {
      const matches = documents.filter((d) =>
        d.document_reference === expected.document_reference
      );
      if (
        matches.length !== 1 || matches[0].bytes.length === 0 ||
        createHash("sha256").update(matches[0].bytes).digest("hex") !==
          expected.sha256
      ) {
        throw new Error(
          "Form 4852 retained document missing, duplicated or digest changed",
        );
      }
    }
  }
  return source;
}
