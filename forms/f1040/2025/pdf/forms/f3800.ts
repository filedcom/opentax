import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import { assertForm3800FinalCreditJoin } from "../../form3800_final_credit_join.ts";
import { sourceOrphanDrugK1Credits } from "../../mef/forms/f3800.ts";
import {
  inputSchema as f3800InputSchema,
  reconcileForm3800NonpassiveCarryforwards,
} from "../../../nodes/inputs/f3800/index.ts";
import { appendForm3800CarryoverStatement } from "./f3800_carryover_statement.ts";
import {
  form3800HeaderFields,
  form3800PartIAndIIFields,
  form3800PartIIIFields,
  form3800PartIIILines,
  form3800PartIVFields,
  form3800PartIVLines,
  form3800PartVFields,
  form3800PartVIFields,
} from "./f3800_fields.ts";
import {
  projectForm3800HeaderFields,
  projectForm3800PartIAndIIFields,
  projectForm3800PartIIIFields,
  projectForm3800PartIVFields,
} from "./f3800_print_projection.ts";
import {
  projectForm3800PartVFields,
  projectForm3800PartVIFields,
} from "./f3800_detail_projection.ts";

const checkboxPaths = new Set<string>([
  form3800HeaderFields.camtAndBeatYes,
  form3800HeaderFields.camtAndBeatNo,
  form3800HeaderFields.transferElectionYes,
  form3800HeaderFields.transferElectionNo,
  form3800HeaderFields.line4RevisedCarryforward,
  form3800HeaderFields.line34RevisedCarryforward,
]);
const paths = new Set<string>([
  ...Object.values(form3800HeaderFields),
  ...Object.values(form3800PartIAndIIFields),
  ...form3800PartIIILines.flatMap((line) =>
    Object.values(form3800PartIIIFields(line))
  ),
  ...form3800PartIVLines.flatMap((line) =>
    Object.values(form3800PartIVFields(line))
  ),
  ...Array.from(
    { length: 15 },
    (_, index) => Object.values(form3800PartVFields(index + 1)),
  ).flat(),
  ...Array.from(
    { length: 35 },
    (_, index) => Object.values(form3800PartVIFields(index + 1)),
  ).flat(),
]);
const fields: readonly PdfFieldEntry[] = [...paths].map((path) => ({
  kind: checkboxPaths.has(path) ? "checkbox" : "text",
  domainKey: path,
  pdfField: path,
}));

export const form3800Pdf: PdfFormDescriptor = {
  pendingKey: "f3800",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f3800--2025.pdf",
  fields,
  instances(raw, filer, all, prepared) {
    if (Object.keys(raw).length === 0) return [];
    if (!prepared || !filer || !all?.schedule3) {
      throw new Error(
        "Form 3800 PDF needs the same prepared MeF return, filer, and Schedule 3",
      );
    }
    const allowed = raw.allowed_credit;
    const pending3800 = all.f3800;
    if (
      !pending3800 || typeof pending3800 !== "object" ||
      Array.isArray(pending3800) ||
      (pending3800 as Record<string, unknown>).allowed_credit !== allowed ||
      typeof allowed !== "number" || !Number.isFinite(allowed) ||
      !Number.isSafeInteger(Math.round(allowed * 100)) ||
      Math.abs(allowed * 100 - Math.round(allowed * 100)) > 0.000001 ||
      Math.round(allowed * 100) !==
        Math.round(prepared.lines.line38 * 100)
    ) {
      throw new Error(
        "Form 3800 PDF pending allowed credit differs from prepared MeF line 38",
      );
    }
    const line6a = all.schedule3.line6a_total;
    if (typeof line6a !== "number") {
      throw new Error("Form 3800 PDF needs finalized Schedule 3 line 6a");
    }
    assertForm3800FinalCreditJoin(prepared.lines.line38, all);
    const source = f3800InputSchema.parse(pending3800);
    const directOrphanK1 = source.f8820_k1_credit_entries;
    const rawOrphanK1 = raw.f8820_k1_credit_entries === undefined
      ? undefined
      : f3800InputSchema.parse(raw).f8820_k1_credit_entries;
    if (
      [...(directOrphanK1 ?? []), ...(rawOrphanK1 ?? [])].some((entry) =>
        entry.source_type === "estate" || entry.source_type === "trust"
      )
    ) {
      throw new Error(
        "Form 3800 PDF estate/trust K-1 box 13 code M is clean electricity investment credit, not orphan-drug credit",
      );
    }
    if (
      directOrphanK1?.length === 1 &&
      directOrphanK1[0].source_type === "partnership" &&
      !source.f8820_credit &&
      !(source.passive_source_allocations ?? []).some((entry) =>
        entry.form3800_credit_line === "1h"
      )
    ) {
      const [entry] = sourceOrphanDrugK1Credits(source, { pending: all });
      if (!entry) {
        throw new Error(
          "Form 3800 printable orphan-drug K-1 source is missing",
        );
      }
      const rawEntries = rawOrphanK1;
      const rawEntry = rawEntries?.[0];
      const row = prepared.currentRows.find((item) => item.line === "1h");
      const amount = prepared.currentAmounts.find((item) => item.line === "1h");
      if (
        rawEntries?.length !== 1 || !rawEntry ||
        rawEntry.source_type !== entry.source_type ||
        rawEntry.source_ein !== entry.source_ein ||
        rawEntry.source_document_reference !==
          entry.source_document_reference ||
        rawEntry.credit_amount !== entry.credit_amount ||
        rawEntry.subject_to_passive_activity_limit !==
          entry.subject_to_passive_activity_limit ||
        !row || !amount || row.metadata.sourceCount !== 1 ||
        row.entityCredits.length !== 1 ||
        !("ein" in row.entityCredits[0].entity) ||
        row.entityCredits[0].entity.ein !== entry.source_ein ||
        row.entityCredits[0].credit !== entry.credit_amount ||
        !(row.metadata.entity && "ein" in row.metadata.entity) ||
        row.metadata.entity.ein !== entry.source_ein ||
        amount.nonpassiveCredit !== entry.credit_amount ||
        amount.totalCredit !== entry.credit_amount ||
        amount.passiveBeforeLimit !== 0 ||
        amount.passiveAfterLimit !== 0
      ) {
        throw new Error(
          "Form 3800 printable orphan-drug line 1h differs from its K-1 source",
        );
      }
    }
    const projected = {
      ...projectForm3800HeaderFields(prepared, filer),
      ...projectForm3800PartIAndIIFields(prepared, line6a),
      ...projectForm3800PartIIIFields(prepared),
      ...projectForm3800PartIVFields(prepared),
      ...projectForm3800PartVFields(prepared),
      ...projectForm3800PartVIFields(prepared),
    };
    for (const key of Object.keys(projected)) {
      if (!paths.has(key)) {
        throw new Error(`Form 3800 printable field is not mapped: ${key}`);
      }
    }
    return [projected];
  },
  async appendSupplementalPages(document, _fields, filer, all, prepared) {
    const entries = all?.f3800
      ? f3800InputSchema.parse(all.f3800).carryforward_vintages ?? []
      : [];
    if (entries.length === 0) {
      if (prepared?.carryforwardSources.length) {
        throw new Error(
          "Form 3800 printable carryforward source lacks ledger history",
        );
      }
      return;
    }
    if (!prepared) {
      throw new Error(
        "Form 3800 carryforward history needs prepared MeF parts",
      );
    }
    const reconciled = reconcileForm3800NonpassiveCarryforwards(entries);
    if (prepared.carryforwardSources.length !== reconciled.length) {
      throw new Error(
        "Form 3800 printable carryforward history source count differs from MeF",
      );
    }
    for (const vintage of reconciled) {
      const source = prepared.carryforwardSources.find((source) =>
        source.sourceKey === `carryforward:${vintage.sourceKey}`
      );
      const sourceCents = Math.round((source?.availableCredit ?? NaN) * 100);
      if (
        !source || source.line !== vintage.form3800CreditLine ||
        source.originatingTaxYear !== vintage.originatingTaxYear ||
        !source.documentId.trim() ||
        !Number.isSafeInteger(sourceCents) ||
        Math.abs(source.availableCredit * 100 - sourceCents) > 0.000001 ||
        sourceCents !==
          Math.round(vintage.availableAfterAdjustment * 100) ||
        source.revisedFromOriginal !== vintage.revisedFromOriginal
      ) {
        throw new Error(
          "Form 3800 printable carryforward history differs from prepared MeF source",
        );
      }
    }
    await appendForm3800CarryoverStatement(
      document,
      entries.map((entry) => entry.vintage),
      filer,
    );
  },
};
