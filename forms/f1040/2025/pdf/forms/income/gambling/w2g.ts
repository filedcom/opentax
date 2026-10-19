import type { PdfFormDescriptor } from "../../../review-support/form-descriptor.ts";
import type { FilerIdentity } from "../../../../../mef/header.ts";
import { mefTaxYear } from "../../../../mef/support/year-config.ts";
import { w2gCopyBLayout } from "./w2g_copy_b.ts";
import { StandardFonts } from "pdf-lib";
import { inputSchema } from "../../../../../nodes/inputs/income/gambling/w2g/index.ts";
import { assertWithheldW2GSource } from "../../../../mef/forms/income/gambling/w2g.ts";

/** Each withheld W-2G as its Copy B values, on the layout issued for `taxYear`. */
export function withheldW2GCopies(
  raw: Record<string, unknown>,
  filer: FilerIdentity | undefined,
  allPending: Record<string, Record<string, unknown>> | undefined,
  taxYear: number,
): Record<string, unknown>[] {
  if (Object.keys(raw).length === 0) return [];
  const source = inputSchema.parse(raw);
  const active = source.w2gs.filter((item) =>
    (item.box4_federal_withheld ?? 0) > 0
  );
  if (active.length === 0) return [];
  active.forEach((item) => assertWithheldW2GSource(item, filer, taxYear));
  const withheld = active.reduce(
    (sum, item) => sum + item.box4_federal_withheld!,
    0,
  );
  const line25c = allPending?.f1040?.line25c_total;
  if (typeof line25c !== "number" || line25c < withheld) {
    throw new Error(
      "W-2G PDF withholding needs the reconciled Form 1040 line 25c",
    );
  }
  return active.map(w2gCopyBLayout(taxYear).project);
}

// The printed return shows Copy B of the form issued for its tax year.
const layout = w2gCopyBLayout(mefTaxYear());

export const w2gPdf: PdfFormDescriptor = {
  pendingKey: "w2g",
  pdfUrl: layout.pdfUrl,
  fields: layout.fields,
  pageIndices: () => [layout.pageIndex],
  async decoratePages(document, pages) {
    const page = pages[0];
    if (!page) throw new Error("W-2G PDF recipient page is missing");
    const font = await document.embedFont(StandardFonts.Helvetica);
    page.drawText(
      "Prepared display copy from entered W-2G facts; verify against payer-issued form.",
      { x: 52, y: 80, size: 8, font },
    );
  },
  instances(raw, filer, allPending) {
    return withheldW2GCopies(raw, filer, allPending, mefTaxYear());
  },
};
