import type {
  PdfFieldEntry,
  PdfFormDescriptor,
} from "../../2025/pdf/review-support/form-descriptor.ts";

/** A pinned IRS TY2026 form PDF and the pages that carry the form. */
export interface Ty2026Template {
  readonly pdfUrl: string;
  readonly pdfSha256: string;
  /** Draft PDFs open with an IRS cover sheet that is not part of the form. */
  readonly formPages: readonly number[];
}

export const TY2026_DRAFT_NOTICE =
  "TY2026 PDF uses IRS draft forms (DRAFT — DO NOT FILE); file the MeF XML";

function renameEntry(
  entry: PdfFieldEntry,
  rename: Readonly<Record<string, string>>,
): PdfFieldEntry {
  const name = (field: string) => rename[field] ?? field;
  return "extraPdfFields" in entry && entry.extraPdfFields
    ? {
      ...entry,
      pdfField: name(entry.pdfField),
      extraPdfFields: entry.extraPdfFields.map(name),
    }
    : { ...entry, pdfField: name(entry.pdfField) };
}

/** The base form's pages, shifted past the draft cover sheet. */
function draftPages(
  base: PdfFormDescriptor,
  template: Ty2026Template,
  fields: Record<string, unknown>,
): readonly number[] {
  if (!base.pageIndices) return template.formPages;
  return base.pageIndices(fields).map((index) => {
    const page = template.formPages[index];
    if (page === undefined) {
      throw new Error(
        `TY2026 PDF ${base.pendingKey} page ${index + 1} is not on the 2026 draft`,
      );
    }
    return page;
  });
}

/**
 * The 2025 projection printed on a 2026 template. `rename` maps a 2025 field
 * name to its 2026 name; `drop` removes domain keys the 2026 form has no box for.
 */
export function onTy2026Template(
  base: PdfFormDescriptor,
  template: Ty2026Template,
  rename: Readonly<Record<string, string>>,
  drop: readonly string[] = [],
  added: readonly PdfFieldEntry[] = [],
): PdfFormDescriptor {
  const keep = (entry: PdfFieldEntry) => !drop.includes(entry.domainKey);
  return {
    ...base,
    pdfUrl: template.pdfUrl,
    pdfSha256: template.pdfSha256,
    pageIndices: (fields) => draftPages(base, template, fields),
    fields: [
      ...base.fields.filter(keep).map((entry) => renameEntry(entry, rename)),
      ...added,
    ],
    filerFields: base.filerFields?.map((entry) => ({
      ...entry,
      ...renameEntry(entry, rename),
    })),
  };
}

/** Throws when the return needs a form that has no TY2026 PDF mapping yet. */
export function refusedOnTy2026(base: PdfFormDescriptor): PdfFormDescriptor {
  const form = base.printedFormKey ?? base.pendingKey;
  const pdf = base.pdfUrl.split("/").pop() ?? base.pdfUrl;
  return {
    pendingKey: base.pendingKey,
    printedFormKey: base.printedFormKey,
    pdfUrl: base.pdfUrl,
    presenceKey: base.presenceKey,
    projectFields: base.projectFields,
    instances: base.instances,
    fields: base.fields,
    rows: base.rows,
    includeWhenNoMappedData: base.includeWhenNoMappedData,
    includeWhen(fields, allPending) {
      if (base.includeWhen && !base.includeWhen(fields, allPending)) {
        return false;
      }
      throw new Error(
        `TY2026 PDF export needs ${form} (2025 template ${pdf}), which has no TY2026 PDF mapping yet; export MeF XML`,
      );
    },
  };
}

/**
 * Refuses, by name, when the 2025 projection would append its continuation
 * statements, whose page titles still name 2025.
 */
export function withoutStatements(
  descriptor: PdfFormDescriptor,
  form: string,
): PdfFormDescriptor {
  const append = descriptor.appendSupplementalPages;
  if (!append) return descriptor;
  return {
    ...descriptor,
    async appendSupplementalPages(document, ...rest) {
      const pages = document.getPageCount();
      await append(document, ...rest);
      if (document.getPageCount() > pages) {
        throw new Error(
          `TY2026 PDF ${form} continuation statements are not mapped; export MeF XML`,
        );
      }
    },
  };
}
