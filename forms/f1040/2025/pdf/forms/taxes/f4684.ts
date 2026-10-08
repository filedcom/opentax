import {
  casualtyLossLines,
  inputSchema,
} from "../../../../nodes/intermediate/forms/form4684/index.ts";
import type { PdfFieldEntry, PdfFormDescriptor } from "../../reviews/execution/form-descriptor.ts";

// The retained positive route is one long-term business casualty. Section A
// belongs to personal-use property and must remain blank for this route.
const page1 = "topmostSubform[0].Page1[0]";
const page2 = "topmostSubform[0].Page2[0]";
const part1 = `${page2}.Table_Line20-27[0]`;
const text = (domainKey: string, pdfField: string): PdfFieldEntry => ({
  kind: "text",
  domainKey,
  pdfField,
});

const fields: ReadonlyArray<PdfFieldEntry> = [
  text("property_print", `${page2}.f2_3[0]`),
  text("basis", `${part1}.Line20[0].f2_7[0]`),
  text("insurance", `${part1}.Line21[0].f2_11[0]`),
  text("fmv_before", `${part1}.Line23[0].f2_19[0]`),
  text("fmv_after", `${part1}.Line24[0].f2_23[0]`),
  text("fmv_decline", `${part1}.Line25[0].f2_27[0]`),
  text("capped_loss", `${part1}.Line26[0].f2_31[0]`),
  text("loss", `${part1}.Line27[0].f2_35[0]`),
  text("loss", `${page2}.f2_39[0]`),
  text("casualty_print", `${page2}.Table_Line34[0].Row1[0].f2_54[0]`),
  text("loss", `${page2}.Table_Line34[0].Row1[0].bi[0].f2_55[0]`),
  text("loss", `${page2}.f2_62[0]`),
  text("loss", `${page2}.f2_65[0]`),
  text("negative_loss", `${page2}.f2_66[0]`),
];

export const form4684Pdf: PdfFormDescriptor = {
  pendingKey: "form4684",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f4684--2025.pdf",
  fields,
  // Pages 3–4 are the separate Ponzi theft and prior-year disaster elections.
  pageIndices: () => [0, 1],
  filerFields: [
    text("nameLine1", `${page1}.f1_1[0]`),
    text("primarySSN", `${page1}.f1_2[0]`),
  ],
  projectFields(fields, allPending) {
    const input = inputSchema.parse(fields);
    if (
      [
        input.personal_fmv_before,
        input.personal_fmv_after,
        input.personal_basis,
        input.personal_insurance,
        input.business_fmv_before,
        input.business_fmv_after,
        input.business_basis,
        input.business_insurance,
        input.business_property_description,
        input.business_property_location,
      ].every((value) => value === undefined || value === 0)
    ) {
      return {};
    }
    if (
      [
        input.personal_fmv_before,
        input.personal_fmv_after,
        input.personal_basis,
        input.personal_insurance,
      ].some((value) => value !== undefined && value !== 0)
    ) {
      throw new Error(
        "Form 4684 personal casualty PDF needs a separate supported route",
      );
    }
    const before = input.business_fmv_before;
    const after = input.business_fmv_after;
    const basis = input.business_basis;
    const insurance = input.business_insurance ?? 0;
    if (
      input.business_is_section_1231 !== true || before === undefined ||
      after === undefined || basis === undefined ||
      !input.business_property_description ||
      !input.business_property_location ||
      !input.business_acquired_date || !input.business_casualty_date ||
      !input.business_casualty_description ||
      [before, after, basis, insurance].some((amount) =>
        !Number.isSafeInteger(amount)
      )
    ) {
      throw new Error(
        "Form 4684 business casualty PDF needs one documented long-term property",
      );
    }
    const acquired = new Date(`${input.business_acquired_date}T00:00:00Z`);
    const casualty = new Date(`${input.business_casualty_date}T00:00:00Z`);
    const anniversary = new Date(acquired);
    anniversary.setUTCFullYear(anniversary.getUTCFullYear() + 1);
    if (
      Number.isNaN(acquired.getTime()) || Number.isNaN(casualty.getTime()) ||
      acquired.toISOString().slice(0, 10) !== input.business_acquired_date ||
      casualty.toISOString().slice(0, 10) !== input.business_casualty_date ||
      casualty.getUTCFullYear() !== 2025 || casualty <= anniversary
    ) {
      throw new Error(
        "Form 4684 business casualty PDF needs a valid long-term 2025 loss date",
      );
    }
    const lines = casualtyLossLines(before, after, basis, insurance);
    const form4797 = allPending.form4797;
    const schedule1 = allPending.schedule1;
    if (
      lines.loss <= 0 || form4797?.ordinary_gain_form4684 !== -lines.loss ||
      schedule1?.line4_other_gains !== -lines.loss
    ) {
      throw new Error(
        "Form 4684 business casualty PDF must reconcile with Form 4797 and Schedule 1",
      );
    }
    return {
      property_print: [
        input.business_property_description,
        input.business_property_location,
        `acquired ${input.business_acquired_date}`,
      ].join("; "),
      casualty_print:
        `${input.business_casualty_description}; ${input.business_casualty_date}`,
      basis,
      insurance,
      fmv_before: before,
      fmv_after: after,
      fmv_decline: lines.fmvDecline,
      capped_loss: lines.cappedLoss,
      loss: lines.loss,
      negative_loss: -lines.loss,
    };
  },
};
