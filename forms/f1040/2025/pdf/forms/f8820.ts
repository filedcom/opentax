import { StandardFonts } from "pdf-lib";
import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import {
  calculateForm8820,
  inputSchema,
} from "../../../nodes/inputs/f8820/index.ts";
import { appendForm8820ExpenseStatement } from "./f8820_expense_statement.ts";

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
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8820--2018.pdf",
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
  decoratePages: async (document, pages, fields) => {
    const source = inputSchema.parse(fields);
    if (!source.controlled_group) return;
    const page = pages[0];
    if (!page) throw new Error("Form 8820 PDF is missing page 1");
    const font = await document.embedFont(StandardFonts.HelveticaBold);
    page.drawText("See Attached", {
      x: 399,
      y: 575,
      size: 7,
      font,
    });
  },
  appendSupplementalPages: async (document, fields, filer) => {
    const source = inputSchema.parse(fields);
    if (source.controlled_group) {
      const group = calculateForm8820(source).controlledGroup!;
      const regular = await document.embedFont(StandardFonts.Helvetica);
      const bold = await document.embedFont(StandardFonts.HelveticaBold);
      let page = document.addPage([612, 792]);
      let y = 660;
      const header = () => {
        page.drawText("Form 8820 - Controlled-group line 2a allocation", {
          x: 40,
          y: 750,
          size: 12,
          font: bold,
        });
        page.drawText(
          `Group basis: ${
            source.controlled_group!.group_classification_document_reference
          }`,
          { x: 40, y: 730, size: 8, font: regular, maxWidth: 530 },
        );
        page.drawText(
          `Group expenses: ${group.totalExpenses}    Group credit: ${group.totalCredit}    Rate: ${
            source.reduced_section280c_credit_election ? "19.75%" : "25%"
          }`,
          { x: 40, y: 710, size: 9, font: regular },
        );
        page.drawText("Member", { x: 40, y: 680, size: 9, font: bold });
        page.drawText("EIN", { x: 288, y: 680, size: 9, font: bold });
        page.drawText("Expenses", { x: 375, y: 680, size: 9, font: bold });
        page.drawText("Credit share", {
          x: 480,
          y: 680,
          size: 9,
          font: bold,
        });
        y = 660;
      };
      header();
      for (const member of group.members) {
        if (y < 70) {
          page = document.addPage([612, 792]);
          header();
        }
        page.drawText(member.business_name, {
          x: 40,
          y,
          size: 8,
          font: regular,
          maxWidth: 235,
        });
        page.drawText(member.ein, { x: 288, y, size: 8, font: regular });
        page.drawText(String(member.qualified_clinical_testing_expenses), {
          x: 375,
          y,
          size: 8,
          font: regular,
        });
        page.drawText(String(member.credit_share), {
          x: 480,
          y,
          size: 8,
          font: regular,
        });
        y -= 18;
      }
      if (y < 65) {
        page = document.addPage([612, 792]);
        header();
      }
      page.drawText(
        `Taxpayer EIN ${source.controlled_group.taxpayer_member_ein}; Form 8820 line 2a share: ${
          calculateForm8820(source).line2a
        }`,
        { x: 40, y: y - 12, size: 9, font: bold },
      );
    }
    const extra = source.f8820s.filter((drug) =>
      drug.qualified_clinical_testing_expenses > 0
    ).slice(26);
    if (extra.length > 0) {
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
    }
    await appendForm8820ExpenseStatement(document, source, filer);
  },
};
