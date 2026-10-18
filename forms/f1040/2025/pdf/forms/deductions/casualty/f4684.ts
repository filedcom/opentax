import {
  casualtyLossLines,
  inputSchema,
  PersonalCasualtyKind,
  personalSectionA,
} from "../../../../../nodes/intermediate/forms/deductions/casualty/form4684/index.ts";
import type {
  PersonalCasualty,
  PersonalCasualtyLines,
} from "../../../../../nodes/intermediate/forms/deductions/casualty/form4684/index.ts";
import { personalLine18 } from "../../../../../nodes/intermediate/forms/deductions/casualty/form4684/line18.ts";
import type { PdfFieldEntry, PdfFormDescriptor } from "../../../review-support/form-descriptor.ts";

// Section A is one copy per personal casualty (page 1); Section B is the one
// long-term business casualty route (page 2).
const page1 = "topmostSubform[0].Page1[0]";
const page2 = "topmostSubform[0].Page2[0]";
const part1 = `${page2}.Table_Line20-27[0]`;
const text = (domainKey: string, pdfField: string): PdfFieldEntry => ({
  kind: "text",
  domainKey,
  pdfField,
});

const checkbox = (domainKey: string, pdfField: string): PdfFieldEntry => ({
  kind: "checkbox",
  domainKey,
  pdfField,
});

const COLUMNS = ["a", "b", "c", "d"] as const;
const ROWS = ["RowA", "RowB", "RowC", "RowD"] as const;
// Lines 2 through 9 run f1_21 through f1_52, four columns per line.
const COLUMN_LINES = [2, 3, 4, 5, 6, 7, 8, 9] as const;

const personalFields: ReadonlyArray<PdfFieldEntry> = [
  checkbox("p_federally_declared", `${page1}.c1_1[0]`),
  text("p_dr_number", `${page1}.f1_3[0]`),
  text("p_em_number", `${page1}.f1_4[0]`),
  ...ROWS.flatMap((row, index) => {
    const base = 5 + index * 4;
    const column = COLUMNS[index];
    return [
      text(`p_type_${column}`, `${page1}.Table_Line1[0].${row}[0].f1_${base}[0]`),
      text(
        `p_location_${column}`,
        `${page1}.Table_Line1[0].${row}[0].f1_${base + 1}[0]`,
      ),
      text(`p_zip_${column}`, `${page1}.Table_Line1[0].${row}[0].f1_${base + 2}[0]`),
      text(
        `p_acquired_${column}`,
        `${page1}.Table_Line1[0].${row}[0].f1_${base + 3}[0]`,
      ),
    ];
  }),
  ...COLUMN_LINES.flatMap((line, lineIndex) =>
    COLUMNS.map((column, index) =>
      text(
        `p_line${line}_${column}`,
        `${page1}.Table_Lines2-9[0].Line${line}[0].f1_${
          21 + lineIndex * 4 + index
        }[0]`,
      )
    )
  ),
  ...[10, 11, 12, 13, 14, 15, 16, 17, 18].map((line) =>
    text(`p_line${line}`, `${page1}.f1_${43 + line}[0]`)
  ),
];

function personalProjection(
  form: PersonalCasualtyLines,
  totals: Record<string, number | undefined>,
): Record<string, unknown> {
  const { casualty } = form;
  const [prefix, number] = casualty.fema_declaration_number?.split("-") ?? [];
  const columns = casualty.properties.flatMap((property, index) => {
    const column = COLUMNS[index];
    const lines = form.properties[index];
    return Object.entries({
      [`p_type_${column}`]: property.property_type,
      [`p_location_${column}`]: `${property.city}, ${property.state}`,
      [`p_zip_${column}`]: property.zip,
      [`p_acquired_${column}`]: property.acquired_date,
      [`p_line2_${column}`]: property.basis,
      [`p_line3_${column}`]: property.insurance,
      [`p_line4_${column}`]: lines.line4Gain,
      ...(lines.line4Gain === undefined
        ? {
          [`p_line5_${column}`]: property.fmv_before,
          [`p_line6_${column}`]: property.fmv_after,
          [`p_line7_${column}`]: lines.line7FmvDecline,
          [`p_line8_${column}`]: lines.line8Smaller,
          [`p_line9_${column}`]: lines.line9Loss,
        }
        : {}),
    });
  });
  return {
    personal_section: true,
    p_federally_declared:
      casualty.kind !== PersonalCasualtyKind.NotFederallyDeclared,
    p_dr_number: prefix === "DR" ? number : undefined,
    p_em_number: prefix === "EM" ? number : undefined,
    ...Object.fromEntries(columns),
    p_line10: form.line10,
    p_line11: form.line11,
    p_line12: form.line12,
    ...totals,
  };
}

/** One Section A copy per casualty; lines 13 through 18 on the first. */
function personalInstances(
  casualties: readonly PersonalCasualty[],
  allPending: Record<string, Record<string, unknown>>,
): Record<string, unknown>[] {
  const summary = personalSectionA(casualties);
  const agi = allPending.f1040?.line11_agi;
  if (summary.line16 !== undefined && typeof agi !== "number") {
    throw new Error("Form 4684 PDF line 17 needs Form 1040 line 11b");
  }
  const limited = summary.line16 === undefined
    ? undefined
    : personalLine18(summary.line16, Number(agi));
  const totals = {
    p_line13: summary.line13,
    p_line14: summary.line14,
    p_line15: summary.line15,
    p_line16: summary.line16,
    p_line17: limited?.line17,
    p_line18: limited?.line18,
  };
  return summary.forms.map((form, index) =>
    personalProjection(form, index === 0 ? totals : {})
  );
}

const fields: ReadonlyArray<PdfFieldEntry> = [
  ...personalFields,
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
  pageIndices: (instance) => instance.personal_section === true ? [0] : [0, 1],
  filerFields: [
    text("nameLine1", `${page1}.f1_1[0]`),
    text("primarySSN", `${page1}.f1_2[0]`),
  ],
  instances(projected) {
    const personal = projected.personal_instances;
    return Array.isArray(personal) ? personal : [projected];
  },
  projectFields(fields, allPending) {
    const input = inputSchema.parse(fields);
    if (input.personal_casualties) {
      if (
        [
          input.business_fmv_before,
          input.business_fmv_after,
          input.business_basis,
          input.business_insurance,
        ].some((value) => value !== undefined && value !== 0)
      ) {
        throw new Error(
          "Form 4684 PDF with both personal-use and business casualties needs separate forms",
        );
      }
      return {
        personal_instances: personalInstances(
          input.personal_casualties,
          allPending,
        ),
      };
    }
    if (
      [
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
