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
  assertDigitalAssetDispositionAnswer,
  assertEitcChildSources,
  assertF1040FinalHeader,
  assertGeneral1040DependentSource,
  assertGeneral1040DepositSource,
  assertGeneral1040HeaderSource,
  assertKIncomeClassification,
  assertKPersonalSaleSources,
  assertKReportedErrorSources,
  assertKWithholdingSourceIdentity,
  assertSchedule1Box3SourceIdentity,
  assertSchedule1Box8SourceIdentity,
  assertSchedule1Form8814Source,
  assertSchedule1KSourceIdentity,
  assertSchedule1NecSourceIdentity,
  assertScheduleCReceiptSourceIdentity,
  assertScheduleCStatutoryW2Sources,
  assertScheduleFFarmSourceIdentity,
} from "../filer-source-reconciliation.ts";
import { assertScheduleDSalesMatchPrepared } from "../mef/forms/schedule_d.ts";
import { assertPreparedVehicleAcknowledgments } from "../mef/forms/f8283_vehicle_sale_evidence.ts";
import { inputSchema as form8283SourceSchema } from "../../nodes/inputs/f8283/index.ts";
import { assertBox11CodeJSources } from "../../nodes/inputs/k1_partnership/box11_code_j.ts";
import { assertBox11CodeESources } from "../../nodes/inputs/k1_partnership/box11_code_e.ts";
import { assertBox11CodeKSources } from "../../nodes/inputs/k1_partnership/box11_code_k.ts";
import { assertBox11CodeSSources } from "../../nodes/inputs/k1_partnership/box11_code_s.ts";
import { assertScheduleDK1Source } from "../schedule-d-k1-source.ts";
import { assertForm8858FilingSource } from "../../nodes/inputs/f8858/index.ts";
import { assertBox11Line10Sources } from "../../nodes/inputs/k1_partnership/box11_line10.ts";
import { assertForm8915FSourceLinks } from "../../nodes/inputs/f8915f/index.ts";
import { assertExtensionPaymentSource } from "../extension-payment-reconciliation.ts";
import { assert1099RRecipientOwner } from "../f1099r-recipient-owner.ts";
import { assertNecWithholdingRecipient } from "../f1099nec-withholding-owner.ts";
import { assert1099BRecipientOwner } from "../f1099b-recipient-owner.ts";
import { assertNoRepeatedBrokerSaleSources } from "../broker-sale-source-reconciliation.ts";
import {
  assertPatrIssuedCopies,
  assertPatrWithholdingRecipient,
} from "../f1099patr-withholding-owner.ts";
import {
  assertLine1aWageSource,
  assertLine1iCombatPayElectionSource,
  assertW2WithholdingSource,
} from "../w2-withholding-reconciliation.ts";
import { assertLine1hSupportedSource } from "../line1h-source.ts";
import { assertLine1bHouseholdWageSource } from "../line1b-household-wages.ts";
import {
  assertLine1cForm4137Income,
  assertSchedule2Form4137Tax,
} from "../schedule2-form4137-reconciliation.ts";
import {
  assertLine1gForm8919Wages,
  assertSchedule2Form8919Tax,
} from "../schedule2-form8919-reconciliation.ts";
import { assertSchedule2ScheduleHTax } from "../schedule2-schedule-h-reconciliation.ts";
import { assertSchedule2Form8960Tax } from "../schedule2-form8960-reconciliation.ts";
import { assertSchedule2ScheduleSETax } from "../schedule2-schedule-se-reconciliation.ts";
import { assertSchedule2Form8828Tax } from "../schedule2-form8828-reconciliation.ts";
import { assertSchedule2Form8936Repayment } from "../schedule2-form8936-reconciliation.ts";
import { assertSchedule3Form8859Credit } from "../schedule3-form8859-reconciliation.ts";
import { assertSchedule3Form8834Credit } from "../schedule3-form8834-reconciliation.ts";
import { assertSchedule3Form8912Credit } from "../schedule3-form8912-reconciliation.ts";
import { assertSchedule3Form8396Credit } from "../schedule3-form8396-reconciliation.ts";
import {
  assertSchedule2Line17HSources,
  assertSchedule2W2Line13Sources,
  assertSchedule2W2Line17KSource,
} from "../schedule2-w2-source-reconciliation.ts";
import { assert1099WithholdingSource } from "../f1099-withholding-reconciliation.ts";
import { assert1099GUnemploymentSource } from "../f1099g-unemployment-reconciliation.ts";
import { assertF8288WithholdingOwner } from "../f8288-withholding-owner.ts";
import {
  assertBenefitStatementOwner,
  assertSocialSecurityBenefitSource,
} from "../ssa-benefits-reconciliation.ts";
import { assertRrb1099rPensionSource } from "../rrb1099r-pension-reconciliation.ts";
import { assertPositiveW2GRecipient } from "../mef/forms/w2g.ts";
import { assertForm1098IssuerCopies } from "../../nodes/inputs/f1098/issuer_copy.ts";
import {
  hasForm8994Claim,
  reconcileForm8994EvidenceBytes,
} from "../../nodes/inputs/f8994/evidence_bytes.ts";
import {
  assertPublicForm8839Attachments,
  hasForm8839Claim,
} from "../../nodes/intermediate/forms/form8839/public_source.ts";

/** Diagnostic origin of a page in a prepared filled-PDF review packet. */
export interface PdfPageOrigin {
  readonly pageNumber: number;
  readonly formKey: string;
  readonly formCopy: number;
}

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
    if (typeof value === "number" && !Number.isFinite(value)) {
      throw new Error(`nonfinite projected value ${String(value)}`);
    }
    if (entry.kind === "text") {
      if (typeof value !== "string" && typeof value !== "number") {
        throw new Error("text field needs a string or finite number");
      }
      // IRS convention: leave numeric fields blank when value is zero —
      // unless the descriptor marks the line as printZero (explicit "0").
      const blankZero = typeof value === "number" && Math.round(value) === 0 &&
        !("printZero" in entry && entry.printZero);
      const field = form.getTextField(entry.pdfField);
      if (!blankZero) {
        const text = typeof value === "number"
          ? Math.round(value).toString()
          : String(value);
        field.setText(text);
      }
    } else if (entry.kind === "checkbox") {
      const box = form.getCheckBox(entry.pdfField);
      value ? box.check() : box.uncheck();
    } else if (entry.kind === "checkboxWhen") {
      const box = form.getCheckBox(entry.pdfField);
      if (String(value) === entry.whenValue) {
        box.check();
      } else {
        box.uncheck();
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
            const blankZero = typeof value === "number" &&
              Math.round(value) === 0 &&
              !("printZero" in entry && entry.printZero);
            const field = form.getTextField(extraField);
            if (!blankZero) {
              const text = typeof value === "number"
                ? Math.round(value).toString()
                : String(value);
              field.setText(text);
            }
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
    if (
      err instanceof Error &&
      err.message.startsWith(`[PDF] ${formKey}: failed to fill extra field`)
    ) {
      throw err;
    }
    throw new Error(
      `[PDF] ${formKey}: failed to fill field "${entry.pdfField}" (${entry.kind})`,
      { cause: err },
    );
  }
}

/** A mapped value must appear on at least one page retained in the packet. */
function assertRetainedPdfFields(
  doc: PDFDocument,
  descriptor: PdfFormDescriptor,
  fields: Record<string, unknown>,
): void {
  const indices = descriptor.pageIndices?.(fields);
  if (indices === undefined) return;
  const pages = doc.getPages();
  if (
    indices.length === 0 || new Set(indices).size !== indices.length ||
    indices.some((index) =>
      !Number.isInteger(index) || index < 0 || index >= pages.length
    )
  ) {
    throw new Error(
      `[PDF] ${descriptor.pendingKey}: invalid retained page selection`,
    );
  }
  const retained = new Set(indices.map((index) => String(pages[index].ref)));
  const form = doc.getForm();
  for (const entry of descriptor.fields) {
    const value = fields[entry.domainKey];
    const printable = entry.kind === "checkboxWhen"
      ? value !== undefined && String(value) === entry.whenValue
      : entry.kind === "checkbox"
      ? value === true
      : typeof value === "number"
      ? Math.round(value) !== 0 ||
        ("printZero" in entry && entry.printZero === true)
      : typeof value === "string" && value.length > 0;
    if (!printable) continue;
    for (
      const name of [
        entry.pdfField,
        ...("extraPdfFields" in entry ? entry.extraPdfFields ?? [] : []),
      ]
    ) {
      const widgets = form.getField(name).acroField.getWidgets();
      if (
        widgets.length === 0 ||
        !widgets.some((widget) => {
          const page = widget.P();
          return page !== undefined && retained.has(String(page));
        })
      ) {
        throw new Error(
          `[PDF] ${descriptor.pendingKey}: populated field "${name}" is not on a retained PDF page`,
        );
      }
    }
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

  for (const entry of descriptor.fields) {
    const value = fields[entry.domainKey];
    if (value === undefined || value === null || entry.kind !== "text") {
      continue;
    }
    if (
      (typeof value !== "string" && typeof value !== "number") ||
      (typeof value === "number" && !Number.isFinite(value))
    ) {
      throw new Error(
        `[PDF] ${descriptor.pendingKey}: failed to fill field "${entry.pdfField}" (text): expected a string or finite number`,
      );
    }
  }
  if (
    descriptor.rows && fields[descriptor.rows.domainKey] !== undefined &&
    !Array.isArray(fields[descriptor.rows.domainKey])
  ) {
    throw new Error(
      `[PDF] ${descriptor.pendingKey}: row field "${descriptor.rows.domainKey}" needs an array`,
    );
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
  const doc = await PDFDocument.load(pdfBytes, {
    ignoreEncryption: true,
    updateMetadata: false,
  });
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
    const needsShownName = descriptor.filerFields?.some((entry) =>
      entry.domainKey === "nameShownOnForm1040"
    );
    let nameShownOnForm1040: string | undefined;
    if (needsShownName) {
      const first = filer.firstNameWithInitial?.trim();
      const last = filer.lastName?.trim();
      if (!first || !last) {
        throw new Error(
          `[PDF] ${descriptor.pendingKey}: name shown on Form 1040 needs the identified first-name field and last name`,
        );
      }
      nameShownOnForm1040 = `${first} ${last}`;
    }
    for (const entry of descriptor.filerFields ?? []) {
      const value = entry.domainKey === "nameShownOnForm1040"
        ? nameShownOnForm1040
        : resolvePath(filerObj, entry.domainKey);
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
            if (typeof value === "number" && !Number.isFinite(value)) {
              throw new Error(`nonfinite projected value ${String(value)}`);
            }
            if (rf.kind === "checkbox") {
              const box = form.getCheckBox(pdfField);
              value ? box.check() : box.uncheck();
            } else {
              if (typeof value !== "string" && typeof value !== "number") {
                throw new Error(
                  "row text field needs a string or finite number",
                );
              }
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

  assertRetainedPdfFields(doc, descriptor, fields);

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
  pageOrigins?: PdfPageOrigin[],
): Promise<Uint8Array> {
  assertForm8858FilingSource(pending.f8858);
  assertDigitalAssetDispositionAnswer(pending);
  await assertForm1098IssuerCopies(pending);
  const normalized = normalizeAllPending(pending);
  if (normalized.f1040) {
    assertF1040FinalHeader(normalized.f1040, filer);
    assertLine1hSupportedSource(normalized.f1040, normalized, filer);
  }
  assertGeneral1040HeaderSource(normalized);
  assertGeneral1040DependentSource(normalized);
  assertGeneral1040DepositSource(normalized, filer);
  assertExtensionPaymentSource(normalized, filer);
  assert1099RRecipientOwner(normalized.f1099r, filer);
  assertPositiveW2GRecipient(normalized.w2g, filer);
  assertNecWithholdingRecipient(normalized.f1099nec, filer);
  assert1099BRecipientOwner(normalized.f1099b, filer);
  assertNoRepeatedBrokerSaleSources(normalized.f1099b, normalized.f8949);
  assertPatrIssuedCopies(normalized.f1099patr);
  assertPatrWithholdingRecipient(normalized.f1099patr, filer);
  assertW2WithholdingSource(normalized, filer);
  assertLine1aWageSource(normalized);
  assertLine1bHouseholdWageSource(normalized);
  assertLine1iCombatPayElectionSource(normalized);
  assertSchedule2W2Line13Sources(normalized);
  assertSchedule2W2Line17KSource(normalized);
  assertSchedule2Line17HSources(normalized, filer);
  assertSchedule2Form4137Tax(normalized);
  assertLine1cForm4137Income(normalized);
  assertSchedule2Form8919Tax(normalized);
  assertLine1gForm8919Wages(normalized);
  assertSchedule2ScheduleHTax(normalized);
  assertSchedule2Form8960Tax(normalized);
  assertSchedule2ScheduleSETax(normalized);
  assertSchedule2Form8828Tax(normalized);
  assertSchedule2Form8936Repayment(normalized);
  assertSchedule3Form8859Credit(normalized);
  assertSchedule3Form8834Credit(normalized);
  assertSchedule3Form8912Credit(normalized);
  assertSchedule3Form8396Credit(normalized);
  assert1099WithholdingSource(normalized, filer);
  assert1099GUnemploymentSource(normalized);
  assertF8288WithholdingOwner(normalized.f8288, filer);
  assertSocialSecurityBenefitSource(normalized);
  assertBenefitStatementOwner(normalized, filer);
  assertRrb1099rPensionSource(normalized, filer);
  assertForm8915FSourceLinks(normalized);
  assertKIncomeClassification(normalized);
  if (filer) {
    assertEitcChildSources(pending, filer);
    assertKReportedErrorSources(normalized, filer);
    assertScheduleCReceiptSourceIdentity(normalized, filer);
    assertScheduleCStatutoryW2Sources(normalized, filer);
    assertKWithholdingSourceIdentity(normalized, filer);
    assertKPersonalSaleSources(pending, filer);
    assertSchedule1Box3SourceIdentity(normalized, filer);
    assertSchedule1Box8SourceIdentity(normalized, filer);
    assertSchedule1Form8814Source(normalized);
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
  assertScheduleDK1Source(normalized.schedule_d ?? {}, normalized);
  assertBox11Line10Sources(normalized, k1Recipients);
  if (
    preparedBundle &&
    await preparedSourceSha256(pending, filer) !==
      preparedBundle.sourceSha256
  ) {
    throw new Error("PDF source differs from the prepared MeF return");
  }
  if (preparedBundle) {
    if (
      await preparedSourceSha256(preparedBundle.pending, filer) !==
        preparedBundle.sourceSha256
    ) {
      throw new Error(
        "PDF bundle pending differs from the prepared MeF return",
      );
    }
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
  const merged = await PDFDocument.create({ updateMetadata: false });

  for (const descriptor of ALL_PDF_FORMS) {
    let formCopy = 0;
    const fields = (normalized[descriptor.pendingKey] ?? {}) as Record<
      string,
      unknown
    >;
    const projectedFields = descriptor.projectFields?.(fields, normalized) ??
      fields;

    if (
      descriptor.rows && pending[descriptor.rows.domainKey] !== undefined
    ) {
      throw new Error(
        `[PDF] ${descriptor.pendingKey}: top-level ${descriptor.rows.domainKey} rows are not bound to the prepared form source`,
      );
    }

    const instances = descriptor.instances?.(
      projectedFields,
      filer,
      normalized,
      preparedBundle?.form3800Parts,
    ) ??
      [projectedFields];
    for (const instance of instances) {
      const filledBytes = await fillFormPdf(
        descriptor,
        instance,
        filer,
        cacheDir,
        normalized,
      );
      if (!filledBytes) continue;
      formCopy++;
      const firstPageNumber = merged.getPageCount() + 1;

      const filledDoc = await PDFDocument.load(filledBytes, {
        updateMetadata: false,
      });
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
      for (
        let pageNumber = firstPageNumber;
        pageNumber <= merged.getPageCount();
        pageNumber++
      ) {
        pageOrigins?.push({
          pageNumber,
          formKey: descriptor.pendingKey,
          formCopy,
        });
      }
    }
  }

  if (merged.getPageCount() === 0) {
    throw new Error(
      "No PDF forms were generated — return may have no computed data.",
    );
  }

  return merged.save();
}
