import { rgb, StandardFonts } from "pdf-lib";
import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import {
  calculateForm5884,
  inputSchema,
} from "../../../nodes/inputs/f5884/index.ts";

// Form 5884 (Rev. March 2021), the IRS continuous-use form for TY2025.
// The field paths were inspected on the official fillable one-page PDF.
const page = "topmostSubform[0].Page1[0]";
const text = (domainKey: string, fieldNumber: number): PdfFieldEntry => ({
  kind: "text",
  domainKey,
  pdfField: `${page}.f1_${fieldNumber}[0]`,
});

export const form5884Pdf: PdfFormDescriptor = {
  pendingKey: "f5884",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f5884--2021.pdf",
  fields: [
    text("line1aWages", 3),
    text("line1aCredit", 4),
    text("line1bWages", 5),
    text("line1bCredit", 6),
    text("line1cWages", 7),
    text("line1cCredit", 8),
    text("line2", 9),
    text("line3", 10),
    text("line4", 11),
  ],
  filerFields: [
    {
      kind: "text",
      domainKey: "nameLine1",
      pdfField: `${page}.f1_1[0]`,
    },
    {
      kind: "text",
      domainKey: "primarySSN",
      pdfField: `${page}.f1_2[0]`,
    },
  ],
  projectFields(fields, allPending) {
    if (!Array.isArray(fields.f5884s) || fields.f5884s.length === 0) return {};
    const source = inputSchema.parse(fields);
    const lines = calculateForm5884(source);
    if (lines.line2 <= 0) return {};
    if (
      source.subject_to_passive_activity_limit ||
      (source.pass_through_credits ?? []).some((entry) =>
        entry.credit_amount > 0 && entry.subject_to_passive_activity_limit
      )
    ) {
      throw new Error(
        "Form 5884 passive credit needs Form 8582-CR before PDF output",
      );
    }
    const form3800 = allPending.f3800;
    const credit = form3800?.f5884_credit;
    if (
      !credit || typeof credit !== "object" ||
      !("credit_amount" in credit) ||
      typeof credit.credit_amount !== "number" ||
      credit.credit_amount !== lines.line4
    ) {
      throw new Error("Form 5884 PDF does not reconcile to Form 3800 source");
    }
    return { ...fields, ...lines };
  },
  decoratePages: async (document, pages, fields) => {
    const source = inputSchema.parse(fields);
    if (!source.controlled_group) return;
    const page = pages[0];
    if (!page) throw new Error("Form 5884 PDF is missing page 1");
    const font = await document.embedFont(StandardFonts.HelveticaBold);
    page.drawText("See attached", {
      x: 430,
      y: 507,
      size: 7,
      font,
      color: rgb(0, 0, 0),
    });
  },
  appendSupplementalPages: async (document, fields) => {
    const source = inputSchema.parse(fields);
    if (!source.controlled_group) return;
    const lines = calculateForm5884(source);
    const font = await document.embedFont(StandardFonts.Helvetica);
    const bold = await document.embedFont(StandardFonts.HelveticaBold);
    const totalWages = lines.controlledGroupShares.reduce(
      (sum, member) => sum + member.qualified_wages,
      0,
    );
    let page = document.addPage([612, 792]);
    let y = 714;
    const header = () => {
      page.drawText("Form 5884 - Controlled-group line 2 allocation", {
        x: 40,
        y: 752,
        size: 12,
        font: bold,
      });
      page.drawText(
        `Group qualified wages: ${totalWages.toFixed(0)}    Group credit: ${
          lines.groupCredit.toFixed(0)
        }`,
        { x: 40, y: 730, size: 9, font },
      );
      page.drawText(
        `Group basis: ${
          source.controlled_group!.group_classification_document_reference
        }`,
        { x: 40, y: 712, size: 8, font, maxWidth: 530 },
      );
      page.drawText("Member", { x: 40, y: 695, size: 9, font: bold });
      page.drawText("EIN", { x: 300, y: 695, size: 9, font: bold });
      page.drawText("Wages", { x: 390, y: 695, size: 9, font: bold });
      page.drawText("Credit share", {
        x: 480,
        y: 695,
        size: 9,
        font: bold,
      });
      y = 675;
    };
    header();
    for (const member of lines.controlledGroupShares) {
      if (y < 75) {
        page = document.addPage([612, 792]);
        header();
      }
      page.drawText(member.business_name, {
        x: 40,
        y,
        size: 8,
        font,
        maxWidth: 245,
        lineHeight: 10,
      });
      page.drawText(member.ein, { x: 300, y, size: 8, font });
      page.drawText(member.qualified_wages.toFixed(0), {
        x: 390,
        y,
        size: 8,
        font,
      });
      page.drawText(member.credit_share.toFixed(0), {
        x: 480,
        y,
        size: 8,
        font,
      });
      y -= 30;
    }
    page.drawText(
      `Taxpayer member ${source.controlled_group.taxpayer_member_ein}: Form 5884 line 2 = ${
        lines.line2.toFixed(0)
      }`,
      { x: 40, y: Math.max(40, y - 12), size: 9, font: bold },
    );
  },
  includeWhen(fields) {
    if (!Array.isArray(fields.f5884s) || fields.f5884s.length === 0) {
      return false;
    }
    return calculateForm5884(inputSchema.parse(fields)).line2 > 0;
  },
};
