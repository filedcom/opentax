import { PDFDocument, StandardFonts } from "pdf-lib";
import { join } from "@std/path";
import { normalizeAllPending } from "../pending.ts";
import { ALL_PDF_FORMS } from "./forms/index.ts";
import type { PdfFieldEntry, PdfFormDescriptor } from "./form-descriptor.ts";
import { type FilerIdentity, FilingStatus } from "../../mef/header.ts";
import { assertAttachmentCoverage } from "../attachment-coverage.ts";
import type { MefBundle } from "../mef/builder.ts";
import { assertPreparedAttachmentManifest } from "../mef/prepared-attachment-manifest.ts";
import { preparedSourceSha256, sha256Hex } from "../prepared-source.ts";
import {
  assertEitcChildSources,
  assertF1040FinalHeader,
  assertKIncomeClassification,
  assertKPersonalSaleSources,
  assertKReportedErrorSources,
  assertKWithholdingSourceIdentity,
  assertSchedule1Box3SourceIdentity,
  assertSchedule1Box8SourceIdentity,
  assertSchedule1KSourceIdentity,
  assertSchedule1NecSourceIdentity,
  assertScheduleCReceiptSourceIdentity,
  assertScheduleFFarmSourceIdentity,
} from "../filer-source-reconciliation.ts";
import { assertScheduleDSalesMatchPrepared } from "../mef/forms/schedule_d.ts";
import { assertPreparedVehicleAcknowledgments } from "../mef/forms/f8283_vehicle_sale_evidence.ts";
import { inputSchema as form8283SourceSchema } from "../../nodes/inputs/f8283/index.ts";
import { assertBox11CodeJSources } from "../../nodes/inputs/k1_partnership/box11_code_j.ts";
import { assertBox11CodeESources } from "../../nodes/inputs/k1_partnership/box11_code_e.ts";
import { assertBox11CodeKSources } from "../../nodes/inputs/k1_partnership/box11_code_k.ts";
import { assertBox11CodeSSources } from "../../nodes/inputs/k1_partnership/box11_code_s.ts";
import { assertBox11Line10Sources } from "../../nodes/inputs/k1_partnership/box11_line10.ts";
import { assertForm8915FSourceLinks } from "../../nodes/inputs/f8915f/index.ts";
import { assertExtensionPaymentSource } from "../extension-payment-reconciliation.ts";
import { assert1099RRecipientOwner } from "../f1099r-recipient-owner.ts";
import { assertForm1098IssuerCopies } from "../../nodes/inputs/f1098/issuer_copy.ts";
import {
  hasForm8994Claim,
  reconcileForm8994EvidenceBytes,
} from "../../nodes/inputs/f8994/evidence_bytes.ts";
import {
  assertPublicForm8839Attachments,
  hasForm8839Claim,
} from "../../nodes/intermediate/forms/form8839/public_source.ts";

async function fetchWithCache(
  url: string,
  cacheDir: string,
): Promise<Uint8Array> {
  const slug = url.replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_");
  const cachePath = join(cacheDir, `${slug}.pdf`);
  try {
    return await Deno.readFile(cachePath);
  } catch {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch IRS PDF: ${url} (${res.status})`);
    }
    const bytes = new Uint8Array(await res.arrayBuffer());
    await Deno.mkdir(cacheDir, { recursive: true });
    await Deno.writeFile(cachePath, bytes);
    return bytes;
  }
}

/** Resolves dot-notation paths like "address.line1" against a nested object. */
function resolvePath(obj: Record<string, unknown>, path: string): unknown {
  let current: unknown = obj;
  for (const part of path.split(".")) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function fillEntry(
  form: ReturnType<PDFDocument["getForm"]>,
  entry: PdfFieldEntry,
  value: unknown,
  formKey: string,
): void {
  try {
    if (entry.kind === "text") {
      // IRS convention: leave numeric fields blank when value is zero —
      // unless the descriptor marks the line as printZero (explicit "0").
      if (
        typeof value === "number" && Math.round(value) === 0 &&
        !("printZero" in entry && entry.printZero)
      ) return;
      const text = typeof value === "number"
        ? Math.round(value).toString()
        : String(value);
      form.getTextField(entry.pdfField).setText(text);
    } else if (entry.kind === "checkbox") {
      const box = form.getCheckBox(entry.pdfField);
      value ? box.check() : box.uncheck();
    } else if (entry.kind === "checkboxWhen") {
      if (String(value) === entry.whenValue) {
        form.getCheckBox(entry.pdfField).check();
      }
    } else if (entry.kind === "radio") {
      const mapped = entry.valueMap[String(value)];
      if (!mapped) {
        throw new Error(`unmapped radio value ${String(value)}`);
      }
      form.getRadioGroup(entry.pdfField).select(mapped);
    }
    // Fill any additional PDF fields that share the same domain value
    if ("extraPdfFields" in entry && entry.extraPdfFields) {
      for (const extraField of entry.extraPdfFields) {
        try {
          if (entry.kind === "text") {
            if (
              typeof value === "number" && Math.round(value) === 0 &&
              !("printZero" in entry && entry.printZero)
            ) continue;
            const text = typeof value === "number"
              ? Math.round(value).toString()
              : String(value);
            form.getTextField(extraField).setText(text);
          } else if (entry.kind === "checkbox") {
            const box = form.getCheckBox(extraField);
            value ? box.check() : box.uncheck();
          }
        } catch (extraErr) {
          throw new Error(
            `[PDF] ${formKey}: failed to fill extra field "${extraField}" (${entry.kind})`,
            { cause: extraErr },
          );
        }
      }
    }
  } catch (err) {
    throw new Error(
      `[PDF] ${formKey}: failed to fill field "${entry.pdfField}" (${entry.kind})`,
      { cause: err },
    );
  }
}

export async function fillFormPdf(
  descriptor: PdfFormDescriptor,
  fields: Record<string, unknown>,
  filer: FilerIdentity | undefined,
  cacheDir: string,
  allPending?: Record<string, Record<string, unknown>>,
): Promise<Uint8Array | undefined> {
  if (descriptor.presenceKey !== undefined) {
    const gate = fields[descriptor.presenceKey];
    if (gate === undefined || gate === null) return undefined;
  }

  // A form is only emitted when it carries at least one *meaningful* value:
  // a number that doesn't round to zero, a true boolean, or a nonempty string.
  // Merely-defined zeros previously caused blank Schedule A / EIC / SE / 6251 /
  // 8959 / 8960 / 8962 pages to be included in the export.
  const isMeaningful = (v: unknown): boolean => {
    if (v === undefined || v === null) return false;
    if (typeof v === "number") return Math.round(v) !== 0;
    if (typeof v === "boolean") return v;
    if (typeof v === "string") return v.length > 0;
    return false;
  };
  const hasData =
    descriptor.fields.some(({ domainKey }) =>
      isMeaningful(fields[domainKey])
    ) ||
    (descriptor.rows !== undefined &&
      Array.isArray(fields[descriptor.rows.domainKey]) &&
      (fields[descriptor.rows.domainKey] as unknown[]).length > 0);

  if (!hasData && descriptor.includeWhenNoMappedData !== true) return undefined;
  if (descriptor.includeWhen === undefined && !hasData) return undefined;
  if (
    descriptor.includeWhen !== undefined &&
    !descriptor.includeWhen(fields, allPending)
  ) return undefined;

  if (descriptor.rows) {
    const items = fields[descriptor.rows.domainKey];
    if (Array.isArray(items) && items.length > descriptor.rows.maxRows) {
      throw new Error(
        `[PDF] ${descriptor.pendingKey}: ${items.length} rows exceed the printable row limit of ${descriptor.rows.maxRows}`,
      );
    }
  }

  const pdfBytes = await fetchWithCache(descriptor.pdfUrl, cacheDir);
  const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const form = doc.getForm();

  // Fill computed fields
  for (const entry of descriptor.fields) {
    const value = fields[entry.domainKey];
    if (value === undefined || value === null) continue;
    fillEntry(form, entry, value, descriptor.pendingKey);
  }

  // Fill filer identity fields (domainKey supports dot-notation, e.g. "address.line1")
  if (filer !== undefined) {
    const filerObj = filer as unknown as Record<string, unknown>;
    for (const entry of descriptor.filerFields ?? []) {
      const value = resolvePath(filerObj, entry.domainKey);
      if (value === undefined || value === null) continue;
      fillEntry(form, entry, value, descriptor.pendingKey);
    }

    // pdf-lib strips the IRS XFA layer, but the 2025 filing-status checkboxes
    // also exist in AcroForm and are filled by the Form 1040 descriptor.
  }

  // Fill row arrays (Form 8949-style)
  if (descriptor.rows) {
    const items = fields[descriptor.rows.domainKey];
    if (Array.isArray(items)) {
      for (let i = 0; i < items.length; i++) {
        const row = items[i] as Record<string, unknown>;
        for (const rf of descriptor.rows.rowFields) {
          let pdfField = rf.pdfFieldPattern.replace("{row}", String(i + 1));
          if (
            rf.fieldNumBase !== undefined &&
            descriptor.rows.rowStride !== undefined
          ) {
            const fieldNum = rf.fieldNumBase + i * descriptor.rows.rowStride;
            pdfField = pdfField.replace(
              "{field_num}",
              String(fieldNum).padStart(2, "0"),
            );
          }
          const value = row[rf.domainKey];
          if (value === undefined || value === null) continue;
          try {
            if (rf.kind === "checkbox") {
              const box = form.getCheckBox(pdfField);
              value ? box.check() : box.uncheck();
            } else {
              form.getTextField(pdfField).setText(
                typeof value === "number"
                  ? Math.round(value).toString()
                  : String(value),
              );
            }
          } catch (err) {
            throw new Error(
              `[PDF] ${descriptor.pendingKey}: failed to fill row ${
                i + 1
              } field "${pdfField}"`,
              { cause: err },
            );
          }
        }
      }
    }
  }

  // IRS PDFs reference non-embedded fonts (e.g. HelveticaLTStd-Bold) in their
  // field DA strings. pdf-lib cannot synthesize these, so form.flatten() would
  // produce invisible content. Regenerating appearances with a standard embedded
  // font ensures all field values render correctly after flattening.
  const font = await doc.embedFont(StandardFonts.Helvetica);
  form.updateFieldAppearances(font);
  form.flatten();
  return doc.save();
}

/**
 * Build a merged PDF from all applicable IRS forms filled with the computed
 * return data and filer identity.
 *
 * @param pending   Raw executor pending dict (all form keys)
 * @param filer     Filer identity (name, SSN, address)
 * @param cacheDir  Directory to cache downloaded IRS PDFs (default: .pdf-cache)
 */
export async function buildPdfBytes(
  pending: Record<string, unknown>,
  filer: FilerIdentity | undefined,
  cacheDir = ".pdf-cache",
  preparedBundle?: MefBundle,
): Promise<Uint8Array> {
  await assertForm1098IssuerCopies(pending);
  const normalized = normalizeAllPending(pending);
  if (normalized.f1040) {
    assertF1040FinalHeader(normalized.f1040, filer);
  }
  assertExtensionPaymentSource(normalized, filer);
  assert1099RRecipientOwner(normalized.f1099r, filer);
  assertForm8915FSourceLinks(normalized);
  assertKIncomeClassification(normalized);
  if (filer) {
    assertEitcChildSources(pending, filer);
    assertKReportedErrorSources(normalized, filer);
    assertScheduleCReceiptSourceIdentity(normalized, filer);
    assertKWithholdingSourceIdentity(normalized, filer);
    assertKPersonalSaleSources(pending, filer);
    assertSchedule1Box3SourceIdentity(normalized, filer);
    assertSchedule1Box8SourceIdentity(normalized, filer);
    assertSchedule1NecSourceIdentity(normalized, filer);
    assertSchedule1KSourceIdentity(normalized, filer);
    assertScheduleFFarmSourceIdentity(normalized, filer);
  }
  const k1Recipients = filer
    ? [
      filer.primarySSN,
      ...(filer.filingStatus === FilingStatus.MarriedFilingJointly &&
          filer.spouse?.ssn
        ? [filer.spouse.ssn]
        : []),
    ]
    : [];
  assertBox11CodeJSources(normalized, k1Recipients);
  assertBox11CodeESources(normalized, k1Recipients);
  assertBox11CodeKSources(normalized, k1Recipients);
  assertBox11CodeSSources(normalized, k1Recipients);
  assertBox11Line10Sources(normalized, k1Recipients);
  if (
    preparedBundle &&
    await preparedSourceSha256(pending, filer) !==
      preparedBundle.sourceSha256
  ) {
    throw new Error("PDF source differs from the prepared MeF return");
  }
  if (preparedBundle) {
    await assertPreparedAttachmentManifest(preparedBundle);
  }
  const form8283Source = normalized.f8283
    ? form8283SourceSchema.parse(normalized.f8283)
    : undefined;
  if (
    form8283Source?.section_a_items?.some((item) =>
      item.vehicle_sale_acknowledgment !== undefined ||
      item.vehicle_needy_transfer_acknowledgment !== undefined ||
      item.vehicle_significant_use_acknowledgment !== undefined ||
      item.vehicle_material_improvement_acknowledgment !== undefined
    )
  ) {
    if (!preparedBundle || !filer) {
      throw new Error(
        "Form 8283 vehicle PDF needs its prepared MeF return and reviewed acknowledgment bytes",
      );
    }
    if (
      await sha256Hex(new TextEncoder().encode(preparedBundle.xml)) !==
        preparedBundle.xmlSha256
    ) {
      throw new Error("Form 8283 vehicle prepared MeF XML digest differs");
    }
    await assertPreparedVehicleAcknowledgments(
      form8283Source,
      preparedBundle.attachments,
      preparedBundle.xml,
      filer.primarySSN,
    );
  }
  if (hasForm8994Claim(pending)) {
    if (!preparedBundle) {
      throw new Error(
        "Form 8994 PDF requires a prepared MeF bundle with validated policy and payroll attachments",
      );
    }
    await reconcileForm8994EvidenceBytes(
      pending.f8994,
      preparedBundle.attachments,
    );
  }
  if (hasForm8839Claim(pending)) {
    if (!preparedBundle) {
      throw new Error(
        "Form 8839 PDF requires a prepared MeF bundle with reviewed attachment bytes",
      );
    }
    const route = pending.form8839_route as
      | { public_source?: unknown }
      | undefined;
    if (!route || !/<IRS8839\b/.test(preparedBundle.xml)) {
      throw new Error("Form 8839 PDF needs its prepared native document");
    }
    await assertPublicForm8839Attachments(
      route.public_source,
      preparedBundle.attachments,
    );
    if (
      await sha256Hex(new TextEncoder().encode(preparedBundle.xml)) !==
        preparedBundle.xmlSha256
    ) {
      throw new Error("Form 8839 prepared MeF XML digest differs");
    }
  }
  // The prepared MeF return stores canonical Form 8949 rows as an array;
  // the existing PDF projector consumes them through its transaction field.
  if (Array.isArray(pending.form8949)) {
    normalized.form8949 = { transaction: pending.form8949 };
  }
  const form8949Rows = normalized.form8949?.transaction;
  if (
    form8949Rows !== undefined &&
    (!Array.isArray(form8949Rows) || form8949Rows.length > 0) &&
    !normalized.schedule_d
  ) {
    throw new Error("Form 8949 PDF needs its Schedule D");
  }
  if (normalized.schedule_d) {
    if (form8949Rows !== undefined && !Array.isArray(form8949Rows)) {
      throw new Error("Form 8949 PDF needs prepared transaction rows");
    }
    assertScheduleDSalesMatchPrepared(
      normalized.schedule_d.transaction,
      form8949Rows ?? [],
    );
  }
  if (
    preparedBundle?.form3800Parts &&
    await sha256Hex(
        new TextEncoder().encode(JSON.stringify(preparedBundle.form3800Parts)),
      ) !== preparedBundle.form3800PartsSha256
  ) {
    throw new Error("Form 3800 PDF parts differ from the prepared MeF return");
  }
  assertAttachmentCoverage(normalized, "pdf");
  const merged = await PDFDocument.create();

  for (const descriptor of ALL_PDF_FORMS) {
    const fields = (normalized[descriptor.pendingKey] ?? {}) as Record<
      string,
      unknown
    >;
    const projectedFields = descriptor.projectFields?.(fields, normalized) ??
      fields;

    const effectiveFields = descriptor.rows
      ? {
        ...projectedFields,
        [descriptor.rows.domainKey]: pending[descriptor.rows.domainKey] ??
          projectedFields[descriptor.rows.domainKey],
      }
      : projectedFields;

    const instances = descriptor.instances?.(
      effectiveFields,
      filer,
      normalized,
      preparedBundle?.form3800Parts,
    ) ??
      [effectiveFields];
    for (const instance of instances) {
      const filledBytes = await fillFormPdf(
        descriptor,
        instance,
        filer,
        cacheDir,
        normalized,
      );
      if (!filledBytes) continue;

      const filledDoc = await PDFDocument.load(filledBytes);
      const pageIndices = [
        ...(descriptor.pageIndices?.(instance) ??
          filledDoc.getPageIndices()),
      ];
      const copiedPages = await merged.copyPages(filledDoc, pageIndices);
      await descriptor.decoratePages?.(merged, copiedPages, instance, filer);
      for (const page of copiedPages) {
        merged.addPage(page);
      }
      await descriptor.appendSupplementalPages?.(
        merged,
        instance,
        filer,
        normalized,
        preparedBundle?.form3800Parts,
      );
    }
  }

  if (merged.getPageCount() === 0) {
    throw new Error(
      "No PDF forms were generated — return may have no computed data.",
    );
  }

  return merged.save();
}
