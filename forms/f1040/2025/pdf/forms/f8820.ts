import { StandardFonts } from "pdf-lib";
import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import {
  calculateForm8820,
  inputSchema,
} from "../../../nodes/inputs/f8820/index.ts";

// Form 8820 (Rev. September 2018) is the IRS continuous-use paper form.
// These paths and the 26 Part II rows were inspected in the official AcroForm.
const page1 = "topmostSubform[0].Page1[0]";
const page2 = "topmostSubform[0].Page2[0].Table_Part2[0]";
const text = (domainKey: string, pdfField: string): PdfFieldEntry => ({
  kind: "text",
  domainKey,
  pdfField,
});

const drugFields: PdfFieldEntry[] = Array.from({ length: 26 }, (_, index) => {
  const letter = String.fromCharCode(97 + index);
  const row = `${page2}.Row7${letter}[0]`;
  return [
    text(`drug_${index + 1}_name`, `${row}.f2_${index * 3 + 1}[0]`),
    text(`drug_${index + 1}_designation`, `${row}.f2_${index * 3 + 2}[0]`),
    text(`drug_${index + 1}_date`, `${row}.f2_${index * 3 + 3}[0]`),
  ];
}).flat();

function printedDate(value: string): string {
  const [year, month, day] = value.split("-");
  return `${month}/${day}/${year}`;
}

export const form8820Pdf: PdfFormDescriptor = {
  pendingKey: "f8820",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8820.pdf",
  pageIndices: () => [0, 1],
  fields: [
    text("line1", `${page1}.f1_3[0]`),
    {
      kind: "checkboxWhen",
      domainKey: "reduced_section280c_credit_election",
      pdfField: `${page1}.c1_1[0]`,
      whenValue: "true",
    },
    {
      kind: "checkboxWhen",
      domainKey: "reduced_section280c_credit_election",
      pdfField: `${page1}.c1_1[1]`,
      whenValue: "false",
    },
    text("line2a", `${page1}.f1_5[0]`),
    text("line2b", `${page1}.f1_7[0]`),
    text("line2c", `${page1}.f1_9[0]`),
    text("line3", `${page1}.f1_11[0]`),
    text("line4", `${page1}.f1_13[0]`),
    ...drugFields,
  ],
  filerFields: [
    text("nameLine1", `${page1}.f1_1[0]`),
    text("primarySSN", `${page1}.f1_2[0]`),
  ],
  projectFields(fields, allPending) {
    if (!Array.isArray(fields.f8820s)) return {};
    const source = inputSchema.parse(fields);
    const lines = calculateForm8820(source);
    if (lines.line2c > 0 || source.reduced_section280c_credit_election) {
      if (lines.line2c > 0 && source.subject_to_passive_activity_limit) {
        throw new Error("Form 8820 passive credit needs Form 8582-CR");
      }
      if (lines.line4 > 0) {
        const credit = allPending.f3800?.f8820_credit;
        if (
          !credit || typeof credit !== "object" ||
          !("credit_amount" in credit) ||
          credit.credit_amount !== lines.line4
        ) {
          throw new Error(
            "Form 8820 PDF does not reconcile to Form 3800 source",
          );
        }
      }
    }
    const projected: Record<string, unknown> = { ...fields, ...lines };
    source.f8820s.filter((drug) => drug.qualified_clinical_testing_expenses > 0)
      .slice(0, 26).forEach((drug, index) => {
        projected[`drug_${index + 1}_name`] = drug.generic_name;
        projected[`drug_${index + 1}_designation`] =
          drug.designation_application_number;
        projected[`drug_${index + 1}_date`] = printedDate(
          drug.designation_date,
        );
      });
    return projected;
  },
  includeWhen(fields) {
    if (!Array.isArray(fields.f8820s)) return false;
    const source = inputSchema.parse(fields);
    return calculateForm8820(source).line2c > 0 ||
      source.reduced_section280c_credit_election;
  },
  appendSupplementalPages: async (document, fields) => {
    const source = inputSchema.parse(fields);
    const extra = source.f8820s.filter((drug) =>
      drug.qualified_clinical_testing_expenses > 0
    ).slice(26);
    if (extra.length === 0) return;
    const regular = await document.embedFont(StandardFonts.Helvetica);
    const bold = await document.embedFont(StandardFonts.HelveticaBold);
    for (let offset = 0; offset < extra.length; offset += 20) {
      const page = document.addPage([612, 792]);
      page.drawText("Form 8820 - Part II continuation", {
        x: 40,
        y: 750,
        size: 12,
        font: bold,
      });
      page.drawText("Name of orphan drug", {
        x: 40,
        y: 715,
        size: 9,
        font: bold,
      });
      page.drawText("Designation number", {
        x: 295,
        y: 715,
        size: 9,
        font: bold,
      });
      page.drawText("Date designated", {
        x: 465,
        y: 715,
        size: 9,
        font: bold,
      });
      extra.slice(offset, offset + 20).forEach((drug, index) => {
        const y = 685 - index * 30;
        page.drawText(drug.generic_name, {
          x: 40,
          y,
          size: 8,
          font: regular,
          maxWidth: 245,
        });
        page.drawText(drug.designation_application_number, {
          x: 295,
          y,
          size: 8,
          font: regular,
          maxWidth: 160,
        });
        page.drawText(printedDate(drug.designation_date), {
          x: 465,
          y,
          size: 8,
          font: regular,
        });
      });
    }
  },
};
