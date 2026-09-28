import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import { inputSchema } from "../../../nodes/inputs/f9465/index.ts";
import { buildAttachedForm9465 } from "../../mef/forms/f9465_attached.ts";

// Current IRS Form 9465 is the September 2020 revision, also used with TY2025.
// The signature lines are not AcroForm fields. This descriptor is deliberately
// unregistered, and neither export may emit an unsigned request yet.
const page = "topmostSubform[0].Page1[0].";
const text = (domainKey: string, field: string): PdfFieldEntry => ({
  kind: "text",
  domainKey,
  pdfField: `${page}${field}`,
});

const fields: readonly PdfFieldEntry[] = [
  text("return_type", "f1_1[0]"),
  text("tax_year", "f1_2[0]"),
  text("first_name_and_initial", "f1_3[0]"),
  text("last_name", "f1_4[0]"),
  text("ssn", "f1_5[0]"),
  text("street", "f1_9[0]"),
  text("apartment", "f1_10[0]"),
  text("city_state_zip", "f1_11[0]"),
  text("line5_tax_due", "f1_22[0]"),
  text("line7_total_balance", "f1_24[0]"),
  text("line9_amount_owed", "f1_26[0]"),
  text("line10_minimum_monthly", "f1_27[0]"),
  text("line11a_proposed_monthly", "f1_28[0]"),
  text("line12_due_day", "f1_30[0]"),
];

/** Staged PDF projection only; not part of ALL_PDF_FORMS. */
export const form9465AttachedPdf: PdfFormDescriptor = {
  pendingKey: "f9465",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f9465.pdf",
  fields,
  pageIndices: () => [0],
  instances(raw, filer, allPending) {
    const source = inputSchema.parse(raw);
    if (!filer || !allPending) {
      throw new Error("Form 9465 PDF needs filer and final Form 1040");
    }
    // Native and PDF projections must reject the same balance/source mismatch.
    buildAttachedForm9465(source, { filer, pending: allPending });
    const address = filer.address;
    if (
      !address?.line1?.trim() || !address.city?.trim() ||
      !address.state?.trim() || !address.zip?.trim() ||
      address.foreignCountry || address.foreignProvinceState ||
      address.foreignPostalCode
    ) {
      throw new Error(
        "Form 9465 bounded PDF needs a complete domestic address",
      );
    }
    const amount = source.final_1040_line37_amount_owed;
    return [{
      return_type: "Form 1040",
      tax_year: "2025",
      first_name_and_initial: filer.middleInitial
        ? `${filer.firstName} ${filer.middleInitial}`
        : filer.firstName,
      last_name: filer.lastName,
      ssn: filer.primarySSN,
      street: address.line1,
      apartment: address.line2,
      city_state_zip: `${address.city}, ${address.state} ${address.zip}`,
      line5_tax_due: amount,
      line7_total_balance: amount,
      line9_amount_owed: amount,
      line10_minimum_monthly: Math.ceil(amount / 72),
      line11a_proposed_monthly: source.proposed_monthly_payment,
      line12_due_day: source.payment_due_day,
    }];
  },
};
