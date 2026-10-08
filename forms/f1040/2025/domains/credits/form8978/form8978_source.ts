import { isDeepStrictEqual } from "node:util";
import { calculateFiling, inputSchema } from "../../../../nodes/inputs/f8978/index.ts";
import type { FilerIdentity } from "../../../../mef/header.ts";

export function reconcileForm8978Source(
  pending: Record<string, Record<string, unknown>>,
  filer?: FilerIdentity,
) {
  const raw = pending.f8978;
  const input = inputSchema.parse(raw);
  const filings = input.filings.map(calculateFiling);
  const total = filings.reduce((s, f) => s + f.line14, 0);
  if (
    !isDeepStrictEqual(raw.calculated_filings, filings) || raw.line14 !== total
  ) {
    throw new Error(
      "Form8978 source and native affected-year calculations disagree",
    );
  }
  const reviewed = input.reviewed_source;
  if (reviewed) {
    if (
      reviewed.partner_ssn !== filer?.primarySSN?.replaceAll("-", "") ||
      reviewed.partner_ssn !==
        String(pending.f1040?.taxpayer_ssn).replaceAll("-", "")
    ) {
      throw new Error(
        "Form8978 reviewed partner differs from reporting return and filer",
      );
    }
    if (reviewed.filings.length !== input.filings.length) {
      throw new Error("Form8978 needs one reviewed source per filing");
    }
    let auditSeen = false;
    const baseline = new Map<string, typeof filings[number]["years"][number]>();
    for (const [i, filing] of input.filings.entries()) {
      const record = reviewed.filings[i];
      if (!isDeepStrictEqual(record.reviewed_filing, filing)) {
        throw new Error("Form8978 reviewed filing facts differ from source");
      }
      if (filing.source === "bba_audit") auditSeen = true;
      else if (auditSeen) throw new Error("Form8978 AAR must precede audit");
      for (const year of filings[i].years) {
        if (+year.tax_year_end.slice(0, 4) >= reviewed.reporting_year) {
          throw new Error("Form8978 affected year must precede reporting year");
        }
        const previous = baseline.get(year.tax_year_end);
        if (
          previous &&
          (year.original_income !== previous.line2 ||
            year.original_deductions !== previous.line4 ||
            year.original_credits !== previous.line10 ||
            year.original_tax_liability !== previous.line11)
        ) {
          throw new Error(
            "Form8978 subsequent filing must use preceding corrected affected-year baseline",
          );
        }
        baseline.set(year.tax_year_end, year);
        for (
          const row of [
            ...year.income_adjustments,
            ...year.deduction_adjustments,
            ...year.credit_adjustments,
          ]
        ) {
          if (
            row.origin === "form8986" && row.ein &&
            row.ein !== record.issuer_ein
          ) {
            throw new Error(
              "Form8978 fallback issuer TIN differs from reviewed Form8986 issuer",
            );
          }
          const id = row.tracking_number ?? row.aar_tracking_number ??
            row.audit_control_number ?? row.ein ?? row.ssn ??
            row.missing_ein_reason;
          if (row.origin === "partner_tax_attribute") {
            if (id || !row.attribute_explanation) {
              throw new Error(
                "Form8978 partner tax attribute needs blank tracking and reviewed explanation",
              );
            }
          } else if (row.origin !== "form8986" || !id) {
            throw new Error(
              "Form8978 Form8986 row needs reviewed classification and actual tracking identifier",
            );
          }
        }
      }
    }
  }
  const ret = pending.f1040 ?? {},
    reporting = pending.form8978_reporting_year ?? {};
  if (
    total > 0 &&
    (ret.form8978_tax !== total || typeof ret.line16_income_tax !== "number" ||
      ret.line16_income_tax < total ||
      reporting.negative_form8978_line14 !== undefined)
  ) {
    throw new Error(
      "Form8978 positive total differs from finalized Form1040 routing",
    );
  }
  if (
    total < 0 &&
    (reporting.negative_form8978_line14 !== -total ||
      ret.form8978_tax !== undefined)
  ) {
    throw new Error(
      "Form8978 negative total differs from reporting-year worksheet",
    );
  }
  if (
    total === 0 &&
    (ret.form8978_tax !== undefined ||
      reporting.negative_form8978_line14 !== undefined)
  ) throw new Error("Form8978 zero total has unexpected reporting route");
  return { input, filings, total };
}

export async function assertForm8978SourceBytes(
  pending: Record<string, Record<string, unknown>>,
  filer: FilerIdentity | undefined,
  attachments: readonly { fileName: string; bytes: Uint8Array }[],
) {
  const { input } = reconcileForm8978Source(pending, filer);
  if (!input.reviewed_source) return;
  if (!filer) {
    throw new Error("Form8978 reviewed source requires filer identity");
  }
  const { buildForm8978Statements } = await import(
    "../../../mef/forms/taxes/f8978_statement.ts"
  );
  const statements = await buildForm8978Statements(input, filer);
  for (const statement of statements) {
    const matches = attachments.filter((a) =>
      a.fileName === statement.fileName
    );
    if (
      matches.length !== 1 ||
      !isDeepStrictEqual(matches[0].bytes, statement.bytes)
    ) {
      throw new Error(
        "Form8978 generated tax computation PDF differs from actual source and owner",
      );
    }
  }
  const seen = new Set<string>();
  for (const filing of input.reviewed_source.filings) {
    for (const doc of [filing.source_document, filing.computation_document]) {
      if (
        seen.has(doc.attachment_file_name) || seen.has(doc.document_reference)
      ) {
        throw new Error("Form8978 reviewed documents must be distinct");
      }
      seen.add(doc.attachment_file_name);
      seen.add(doc.document_reference);
      const matches = attachments.filter((a) =>
        a.fileName === doc.attachment_file_name
      );
      if (matches.length !== 1) {
        throw new Error(
          "Form8978 reviewed source needs one supplied PDF per record",
        );
      }
      const digest = Array.from(
        new Uint8Array(
          await crypto.subtle.digest(
            "SHA-256",
            new Uint8Array(matches[0].bytes),
          ),
        ),
        (b) => b.toString(16).padStart(2, "0"),
      ).join("");
      if (digest !== doc.sha256) {
        throw new Error(
          "Form8978 reviewed source PDF bytes differ from reviewed hash",
        );
      }
    }
  }
}
