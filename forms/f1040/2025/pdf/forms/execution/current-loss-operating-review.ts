import { PDFDocument } from "pdf-lib";
import { extractFilerIdentity } from "../../../../mef/filer.ts";
import { inputSchema as scheduleSchema } from "../../../../nodes/inputs/schedule_e/index.ts";
import { inputSchema as farmSchema } from "../../../../nodes/inputs/f4835/index.ts";
import { currentPropertyPassiveAmounts } from "../../../../nodes/inputs/schedule_e/current-property-source.ts";
import { reviewCurrentLossOriginalForms } from "../../../mef/forms/execution/current-loss-original-form-review.ts";
import { fillFormPdf } from "../../builder.ts";
import { scheduleEPdf } from "../business/schedule_e.ts";
import { form4835ActivityFields, form4835Pdf } from "../business/f4835.ts";

/** Operating-form review packet only; full-return filing routes remain guarded. */
export async function buildCurrentLossOperatingReviewPdfs(
  pending: Record<string, Record<string, any>>,
  cacheDir: string,
) {
  const review = reviewCurrentLossOriginalForms(pending);
  const properties = scheduleSchema.parse(pending.schedule_e).schedule_es;
  const farms = pending.f4835 === undefined
    ? []
    : farmSchema.parse(pending.f4835).f4835s;
  const filer = extractFilerIdentity(pending.f1040);
  if (!filer) {
    throw new Error("Current loss operating PDF review needs finalized filer");
  }
  const document = await PDFDocument.create();
  const projections: Record<string, unknown>[] = [];
  const payments = properties.some((r) => r.form_1099_payments_made);
  const sum = (
    key: "rent" | "royalty" | "mortgage" | "depreciation" | "expenses",
  ) => review.properties.reduce((n, r) => n + r[key], 0);
  for (let start = 0; start < properties.length; start += 3) {
    const fields: Record<string, unknown> = {
      payments_made: payments,
      forms_1099_filed: payments
        ? properties.every((r) =>
          !r.form_1099_payments_made || r.form_1099_filed
        )
        : undefined,
    };
    properties.slice(start, start + 3).forEach((p, i) => {
      const line = review.properties[start + i];
      Object.assign(fields, {
        [`property_${i}_address`]:
          `${p.street_address}, ${p.city}, ${p.state} ${p.zip}`,
        [`property_${i}_type`]: p.property_type,
        [`property_${i}_fair_rental_days`]: p.fair_rental_days,
        [`property_${i}_personal_use_days`]: p.personal_use_days,
        [`property_${i}_qualified_joint_venture`]: p.qualified_joint_venture,
        [`property_${i}_line3`]: line.rent,
        [`property_${i}_line4`]: line.royalty,
        [`property_${i}_expense_taxes`]: p.expense_taxes,
        [`property_${i}_line20`]: line.expenses,
        [`property_${i}_line21`]: line.net,
        [`property_${i}_line22`]: line.deductibleLoss || undefined,
      });
    });
    if (start === 0) {
      Object.assign(fields, {
        line23a: sum("rent"),
        line23b: sum("royalty"),
        line23c: sum("mortgage"),
        line23d: sum("depreciation"),
        line23e: sum("expenses"),
        line24: review.properties.reduce((n, r) => n + Math.max(0, r.net), 0),
        line25: review.properties.reduce((n, r) => n + r.deductibleLoss, 0) ||
          undefined,
        line26: review.properties.reduce(
          (n, r) => n + Math.max(0, r.net) - r.deductibleLoss,
          0,
        ),
        farm_line40: review.farmRows.length
          ? review.farmRows.reduce((n, r) => n + r.filed_net, 0)
          : undefined,
        farm_line42: review.farmRows.length
          ? review.farmRows.reduce((n, r) => n + r.gross, 0)
          : undefined,
        trust_line41: review.farmRows.length ? review.line5 : undefined,
        nonpassive_activity_amount: properties.reduce((n, r) =>
          n +
          currentPropertyPassiveAmounts(r.current_property_source!)
            .nonpassiveOperating, 0),
      });
    }
    const filled = await fillFormPdf(scheduleEPdf, fields, filer, cacheDir);
    if (!filled) {
      throw new Error("Current loss Schedule E review has no filled page");
    }
    const source = await PDFDocument.load(filled);
    const indices = scheduleEPdf.pageIndices!(fields);
    const pages = await document.copyPages(source, [...indices]);
    for (const page of pages) document.addPage(page);
    await scheduleEPdf.decoratePages!(document, pages, fields, filer);
    projections.push(fields);
  }
  const farmDocuments = [];
  for (let i = 0; i < farms.length; i++) {
    const fields = form4835ActivityFields(
      farms[i],
      review.farmRows[i].allowed_loss,
    );
    const filled = await fillFormPdf(form4835Pdf, fields, filer, cacheDir);
    if (!filled) throw new Error("Current loss farm review has no filled page");
    const source = await PDFDocument.load(filled);
    const farmDocument = await PDFDocument.create();
    const pages = await farmDocument.copyPages(source, [
      ...form4835Pdf.pageIndices!(fields),
    ]);
    for (const page of pages) farmDocument.addPage(page);
    await form4835Pdf.decoratePages!(farmDocument, pages, fields, filer);
    farmDocuments.push({
      activity_id: farms[i].activity_id,
      fields,
      bytes: await farmDocument.save(),
    });
  }
  return {
    review,
    scheduleE: { fields: projections, bytes: await document.save() },
    farms: farmDocuments,
    filingReady: false as const,
    issuerVerified: false as const,
  };
}
