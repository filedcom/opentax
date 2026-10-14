import { PDFDocument } from "pdf-lib";
import { extractFilerIdentity } from "../../../mef/filer.ts";
import { reviewCurrentLossOriginalForms } from "../../mef/support/current-loss-original-form-review.ts";
import { fillFormPdf } from "../builder.ts";
import { form4797Pdf } from "../forms/income/business/f4797.ts";

/** Original-form review only. Fully suspended sales produce no deduction page. */
export async function buildCurrentLoss4797ReviewPdf(
  pending: Record<string, Record<string, any>>,
  cacheDir: string,
) {
  const review = reviewCurrentLossOriginalForms(pending);
  const rows = review.saleRows.filter((r) => r.filed_net !== 0);
  const emptyFields: Record<string, unknown> = {};
  if (!rows.length) return { ...review, fields: emptyFields, bytes: undefined };
  if (rows.length > 4) {
    throw new Error(
      "Current loss Form 4797 review needs more than four sale columns",
    );
  }
  const fields: Record<string, unknown> = {
    pdf_line17: review.line4,
    ordinary_gain: review.line4,
    pdf_current_joint_ordinary: pending.general?.filing_status === "mfj",
  };
  const date = (iso: string) => {
    const [y, m, d] = iso.split("-");
    return `${m}/${d}/${y}`;
  };
  rows.forEach((r, i) => {
    const prefix = i === 0 ? "pdf_sale" : `pdf_current_sale_${i + 1}`;
    Object.assign(fields, {
      [`${prefix}_description`]: r.description,
      [`${prefix}_acquired`]: date(r.acquired_on),
      [`${prefix}_sold`]: date(r.sold_on),
      [`${prefix}_price`]: r.gross_sales_price,
      [`${prefix}_depreciation`]: r.depreciation_allowed,
      [`${prefix}_basis`]: r.cost_or_other_basis,
      [`${prefix}_gain`]: r.filed_net,
    });
  });
  const filled = await fillFormPdf(
    form4797Pdf,
    fields,
    extractFilerIdentity(pending.f1040),
    cacheDir,
  );
  if (!filled) {
    throw new Error("Current loss Form 4797 review has no filled page");
  }
  const source = await PDFDocument.load(filled);
  const document = await PDFDocument.create();
  for (const page of await document.copyPages(source, [0])) {
    document.addPage(page);
  }
  return { ...review, fields, bytes: await document.save() };
}
