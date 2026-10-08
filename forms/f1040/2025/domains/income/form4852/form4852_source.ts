import { assertQualifiedRothSource } from "../../../../nodes/inputs/f4852/qualified-roth.ts";
import { reviewedForm4852AccountType } from "../../../../nodes/inputs/f4852/retirement-account.ts";
import { reconcileForm8606RothInventories } from "../../retirement/form8606/form8606_roth_inventory_reconciliation.ts";
import { reconcileForm8606RothActivity } from "../../retirement/form8606/form8606_roth_activity_reconciliation.ts";
import { isDeepStrictEqual } from "node:util";
import { createHash } from "node:crypto";
import { type FilerIdentity, FilingStatus } from "../../../../mef/header.ts";
import { inputSchema as w2Schema } from "../../../../nodes/inputs/w2/index.ts";
import { inputSchema as r1099Schema } from "../../../../nodes/inputs/f1099r/index.ts";
import {
  form4852CalculationSources,
  FormType,
  inputSchema,
} from "../../../../nodes/inputs/f4852/index.ts";

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
  const distributions = new Set<string>();
  const documentReferences = new Set<string>();
  const treatmentDigests = new Map<string, string>();
  const issuedLineages = new Map<string, string>();
  const normalize = (s: string) => s.replace(/\D/g, "");
  const primary = normalize(filer.primarySSN);
  const spouse = filer.filingStatus === FilingStatus.MarriedFilingJointly
    ? normalize(filer.spouse?.ssn ?? "")
    : "";
  const rawW2 = (pending.w2 as { w2s?: unknown[] } | undefined)?.w2s ?? [];
  const rawR =
    (pending.f1099r as { f1099rs?: unknown[] } | undefined)?.f1099rs ?? [];
  if (!Array.isArray(rawW2) || !Array.isArray(rawR)) {
    throw new Error("Form4852 ordinary source inventories must be arrays");
  }
  const ordinaryW2 = rawW2.length ? w2Schema.parse({ w2s: rawW2 }).w2s : [];
  const ordinaryR = rawR.length
    ? r1099Schema.parse({ f1099rs: rawR }).f1099rs
    : [];
  const issued = [
    ...ordinaryW2.map((
      r,
    ) => ({
      facts: r,
      reference: r.source_document_reference,
      type: FormType.W2,
      tin: String(r.employer_ein ?? ""),
      ssn: String(r.employee_ssn ?? ""),
    })),
    ...ordinaryR.map((r) => ({
      facts: r,
      reference: r.source_document_reference,
      type: FormType.R_1099,
      tin: String(r.payer_ein ?? ""),
      ssn: String(r.recipient_ssn ?? ""),
    })),
  ];
  const retainedCoreReferences = new Set(
    review.records.flatMap(
      (record) => [
        record.source_workpaper.document_reference,
        record.completed_form.document_reference,
        ...(record.incorrect_original
          ? [record.incorrect_original.document_reference]
          : []),
      ],
    ),
  );
  if (
    issued.some((item) =>
      item.reference && retainedCoreReferences.has(item.reference)
    )
  ) {
    throw new Error(
      "Form4852 ordinary income input cannot reuse a substitute workpaper, completed or incorrect-original source reference",
    );
  }
  for (const [i, item] of source.f4852s.entries()) {
    const record = review.records[i];
    if (!isDeepStrictEqual(item, record.reviewed_substitute)) {
      throw new Error(
        "Form 4852 reviewed facts differ from entered substitute",
      );
    }
    reviewedForm4852AccountType(item, true);
    assertQualifiedRothSource(
      item,
      pending.general as Record<string, unknown> | undefined,
      item.subject_ts === "S",
    );
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
      item.source_copy_lineage ?? null,
    ]);
    if (identities.has(identity)) {
      throw new Error("Form 4852 duplicate owner/payer substitute");
    }
    identities.add(identity);
    if (
      item.form_type === FormType.R_1099 && item.account_number &&
      item.distribution_reference
    ) {
      const distribution = JSON.stringify([
        recipient,
        payer,
        item.account_number,
        item.distribution_reference,
      ]);
      if (distributions.has(distribution)) {
        throw new Error(
          "Form 4852 repeats the same owned retirement account/distribution claim",
        );
      }
      distributions.add(distribution);
    }

    const samePayerIssued = issued.filter((r) =>
      payer && r.type === item.form_type && normalize(r.tin) === payer &&
      normalize(r.ssn) === recipient
    );
    const otherCopies = record.other_current_copy_references ?? [];
    if (
      samePayerIssued.some((r) =>
        !item.source_copy_lineage || !r.reference ||
        r.reference === item.source_copy_lineage ||
        r.reference === record.incorrect_original?.document_reference
      ) ||
      new Set(otherCopies).size !== otherCopies.length ||
      otherCopies.length !== samePayerIssued.length ||
      samePayerIssued.some((r) =>
        !r.reference || !otherCopies.includes(r.reference)
      )
    ) {
      throw new Error(
        "Form 4852 original and substitute cannot both enter current income; distinct same-payer copies require complete reviewed lineage",
      );
    }
    if (samePayerIssued.length > 0) {
      const lineageSources = record.other_current_copy_sources ?? [];
      if (
        lineageSources.length !== samePayerIssued.length ||
        new Set(
            lineageSources.map((row) => row.issued_source_document_reference),
          ).size !== lineageSources.length
      ) {
        throw new Error(
          "Form4852 same-payer issued copies need complete actual account/distribution source records",
        );
      }
      for (const issuedCopy of samePayerIssued) {
        const lineage = lineageSources.find((row) =>
          row.issued_source_document_reference === issuedCopy.reference
        );
        if (!lineage) {
          throw new Error("Form4852 actual issued copy lineage missing");
        }
        const serialized = JSON.stringify(lineage);
        const priorLineage = issuedLineages.get(
          lineage.issued_source_document_reference,
        );
        if (priorLineage !== undefined && priorLineage !== serialized) {
          throw new Error(
            "Form4852 issued copy has contradictory account/payroll lineage reviews",
          );
        }
        issuedLineages.set(
          lineage.issued_source_document_reference,
          serialized,
        );
        if (item.form_type === FormType.W2) {
          const payroll = lineage.payroll_allocations;
          const facts = issuedCopy.facts as Record<string, unknown>;
          if (
            !payroll?.length || lineage.distribution_source ||
            lineage.source_copy_lineage === item.source_copy_lineage
          ) {
            throw new Error(
              "Form4852 issued W2 needs distinct actual payroll lineage",
            );
          }
          const periods = new Set<string>();
          for (const row of payroll) {
            const identity = JSON.stringify([
              row.payroll_account_reference,
              row.period_identifier,
            ]);
            if (
              row.owner_ssn !== recipient || row.payer_tin !== payer ||
              !row.paid_on.startsWith("2025-") || periods.has(identity) ||
              (item.payroll_allocations ?? []).some((source) =>
                source.payroll_account_reference ===
                  row.payroll_account_reference &&
                source.period_identifier === row.period_identifier
              )
            ) {
              throw new Error(
                "Form4852 issued/substitute W2 repeats payroll or conflicts with employer/owner/year",
              );
            }
            periods.add(identity);
          }
          for (
            const [sourceKey, issuedKey] of [
              ["wages", "box1_wages"],
              ["federal_withheld", "box2_fed_withheld"],
              ["social_security_wages", "box3_ss_wages"],
              ["social_security_withheld", "box4_ss_withheld"],
              ["social_security_tips", "box7_ss_tips"],
              ["medicare_wages", "box5_medicare_wages"],
              ["medicare_withheld", "box6_medicare_withheld"],
              ["state_tax_withheld", "box17_state_withheld"],
              ["local_tax_withheld", "box19_local_withheld"],
            ] as const
          ) {
            if (
              Math.abs(
                payroll.reduce((sum, row) => sum + row[sourceKey], 0) -
                  Number(facts[issuedKey] ?? 0),
              ) > .0000001
            ) {
              throw new Error(
                "Form4852 issued W2 amounts differ from actual payroll allocation",
              );
            }
          }
          continue;
        }
        const actual = lineage.distribution_source;
        const facts = issuedCopy.facts as Record<string, unknown>;
        if (
          lineage.payroll_allocations || !actual ||
          lineage.source_copy_lineage === item.source_copy_lineage ||
          actual.payer_tin !== payer || actual.owner_ssn !== recipient ||
          actual.account_number !== facts.account_number ||
          !actual.paid_on.startsWith("2025-")
        ) {
          throw new Error(
            "Form4852 issued copy account/owner/payer differs from retained actual lineage source",
          );
        }
        for (
          const [sourceKey, issuedKey] of [
            ["gross_distribution", "box1_gross_distribution"],
            ["taxable_amount", "box2a_taxable_amount"],
            ["employee_contributions", "box5_employee_contributions"],
            ["capital_gain", "box3_capital_gain"],
            ["federal_withheld", "box4_federal_withheld"],
            ["state_tax_withheld", "box14_state_tax"],
            ["local_tax_withheld", "box17_local_tax"],
            ["distribution_code", "box7_distribution_code"],
            ["is_ira", "box7_ira_simple_indicator"],
          ] as const
        ) {
          const expected = facts[issuedKey] ??
            (sourceKey === "is_ira"
              ? false
              : sourceKey === "distribution_code"
              ? ""
              : 0);
          if (actual[sourceKey] !== expected) {
            throw new Error(
              "Form4852 issued copy fields differ from retained account/distribution source",
            );
          }
        }
        if (
          actual.account_number === item.account_number &&
          actual.distribution_reference === item.distribution_reference
        ) {
          throw new Error(
            "Form4852 original/replacement distribution cannot also enter as an issued current copy",
          );
        }
      }
    } else if ((record.other_current_copy_sources ?? []).length) {
      throw new Error(
        "Form4852 other-copy account source has no actual issued counterpart",
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
    for (const document of record.treatment_documents ?? []) {
      const prior = treatmentDigests.get(document.document_reference);
      if (
        documentReferences.has(document.document_reference) ||
        (prior !== undefined && prior !== document.sha256)
      ) {
        throw new Error(
          "Form4852 shared treatment source conflicts with a distinct retained document",
        );
      }
      treatmentDigests.set(document.document_reference, document.sha256);
    }
  }
  if (
    [...treatmentDigests.keys()].some((reference) =>
      documentReferences.has(reference)
    )
  ) {
    throw new Error(
      "Form4852 treatment source cannot replace an original, workpaper or completed copy",
    );
  }
  reconcileForm8606RothInventories(pending ?? {}, filer);
  reconcileForm8606RothActivity(pending ?? {}, filer);
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
        ...(record.treatment_documents ?? []),
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
