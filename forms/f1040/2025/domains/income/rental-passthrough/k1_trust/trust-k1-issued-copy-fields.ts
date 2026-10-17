import { PDFDocument } from "pdf-lib";
import { type FilerIdentity } from "../../../../../mef/header.ts";
import { inputSchema } from "../../../../../nodes/inputs/income/rental-passthrough/k1_trust/index.ts";
import { assertPrintableSourceTextFields } from "../../../../../source-printable-fields.ts";
import { trustK1CanonicalFields } from "./trust-k1-canonical-fields.ts";
import { assertTrustK1PrintableCheckboxes } from "./trust-k1-printable-checkboxes.ts";
import { assertTrustK1StaticPages } from "./trust-k1-static-pages.ts";
import {
  inspectTrustK1IssuedCopies,
  type ReviewedTrustK1Copy,
} from "./trust-k1-issued-copy-review.ts";

export interface ExtractedTrustK1Copy extends ReviewedTrustK1Copy {
  readonly canonicalFields: Readonly<Record<string, string | boolean>>;
  readonly textFieldAppearancesVerified: true;
  readonly checkboxAppearancesVerified: true;
  readonly staticPageLayoutVerified: true;
  readonly issuerVerified: false;
}

function amount(text: string): number {
  if (!/^\$?\s*(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?\s*$/.test(text)) {
    throw new Error(
      "Trust K-1 code B printed amount needs positive dollars and cents",
    );
  }
  const value = Number(text.replace(/[$,\s]/g, ""));
  if (
    !Number.isFinite(value) || value <= 0 ||
    !Number.isSafeInteger(Math.round(value * 100))
  ) {
    throw new Error("Trust K-1 code B printed amount is invalid");
  }
  return value;
}

/** Capture every canonical field and compare source identity/code B to exact PDF bytes.
 * This verifies canonical template content, resources, layout and appearances,
 * but does not authenticate fiduciary issuance or enable filing exports. */
export async function extractTrustK1IssuedCopyFields(
  rawSource: unknown,
  filer: FilerIdentity,
  documents: ReadonlyArray<{ reference: string; bytes: Uint8Array }>,
): Promise<readonly ExtractedTrustK1Copy[]> {
  const source = inputSchema.parse(rawSource);
  const retainedDocuments = documents.map((doc) => ({
    reference: doc.reference,
    bytes: Uint8Array.from(doc.bytes),
  }));
  const inspected = await inspectTrustK1IssuedCopies(
    source,
    filer,
    retainedDocuments,
  );
  const rows = source.k1_trusts.filter((row) =>
    row.box13_code_b_backup_withholding !== undefined
  );
  return await Promise.all(rows.map(async (row, index) => {
    const review = inspected[index];
    const bytes = retainedDocuments.find((doc) =>
      doc.reference === review.pdfReference
    )!.bytes;
    const pdf = await PDFDocument.load(bytes);
    if (pdf.getPageCount() !== 2) {
      throw new Error("Trust K-1 canonical copy needs both official pages");
    }
    const form = pdf.getForm();
    const names = new Set(form.getFields().map((field) => field.getName()));
    if (
      names.size !== trustK1CanonicalFields.length ||
      trustK1CanonicalFields.some((field) => !names.has(field.pdfField))
    ) {
      throw new Error(
        "Trust K-1 canonical copy needs all and only the official fields",
      );
    }
    await assertPrintableSourceTextFields(
      bytes,
      trustK1CanonicalFields.filter((field) => field.kind === "text").map((
        field,
      ) => ({ pdfField: field.pdfField, domainKey: field.key })),
      "Trust K-1 issued copy",
    );
    await assertTrustK1PrintableCheckboxes(bytes);
    await assertTrustK1StaticPages(bytes);
    const values = Object.fromEntries(trustK1CanonicalFields.map((field) => [
      field.key,
      field.kind === "text"
        ? form.getTextField(field.pdfField).getText() ?? ""
        : form.getCheckBox(field.pdfField).isChecked(),
    ]));
    const digits = (key: string) => {
      const text = String(values[key] ?? "").trim();
      if (!/^[\d -]+$/.test(text)) return undefined;
      return text.replace(/[ -]/g, "");
    };
    if (
      digits("f1_6[0]") !== row.estate_trust_ein ||
      digits("f1_10[0]") !== row.beneficiary_ssn
    ) {
      throw new Error(
        "Trust K-1 printed EIN or beneficiary SSN differs from retained source",
      );
    }
    const creditRows = [["f1_50[0]", "f1_51[0]"], ["f1_52[0]", "f1_53[0]"], [
      "f1_54[0]",
      "f1_55[0]",
    ]];
    const codeB = creditRows.filter(([code]) =>
      String(values[code]).trim().toUpperCase() === "B"
    );
    if (
      codeB.length !== 1 ||
      Math.round(amount(String(values[codeB[0][1]])) * 100) !==
        Math.round(row.box13_code_b_backup_withholding! * 100)
    ) {
      throw new Error(
        "Trust K-1 printed box 13 code B differs from retained source",
      );
    }
    return {
      ...review,
      canonicalFields: Object.freeze(values),
      textFieldAppearancesVerified: true as const,
      checkboxAppearancesVerified: true as const,
      staticPageLayoutVerified: true as const,
      issuerVerified: false as const,
    };
  }));
}
