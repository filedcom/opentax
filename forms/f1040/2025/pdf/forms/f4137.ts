import { StandardFonts } from "pdf-lib";
import type { FilerIdentity } from "../../../mef/header.ts";
import { CONFIG_BY_YEAR } from "../../../nodes/config/index.ts";
import {
  calculateForm4137,
  type Form4137Calculation,
  inputSchema,
} from "../../../nodes/intermediate/forms/form4137/index.ts";
import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";

const page1 = "topmostSubform[0].Page1[0].";
const text = (domainKey: string, pdfField: string): PdfFieldEntry => ({
  kind: "text",
  domainKey,
  pdfField,
});

const employerFields: ReadonlyArray<PdfFieldEntry> = Array.from(
  { length: 5 },
  (_, index) => {
    const row = `Table_Line1[0].BodyRow${index + 1}[0].`;
    const first = 3 + index * 4;
    return [
      text(`employer_${index + 1}_name`, `${page1}${row}f1_${first}[0]`),
      text(`employer_${index + 1}_ein`, `${page1}${row}f1_${first + 1}[0]`),
      text(
        `employer_${index + 1}_received`,
        `${page1}${row}f1_${first + 2}[0]`,
      ),
      text(
        `employer_${index + 1}_reported`,
        `${page1}${row}f1_${first + 3}[0]`,
      ),
    ];
  },
).flat();

const fields: ReadonlyArray<PdfFieldEntry> = [
  ...employerFields,
  text("line2", `${page1}f1_23[0]`),
  text("line3", `${page1}f1_24[0]`),
  text("line4", `${page1}f1_25[0]`),
  text("line5", `${page1}f1_26[0]`),
  text("line6", `${page1}f1_27[0]`),
  text("line8", `${page1}f1_29[0]`),
  {
    kind: "text",
    domainKey: "line9",
    pdfField: `${page1}f1_30[0]`,
    printZero: true,
  },
  text("line10", `${page1}f1_31[0]`),
  text("line11", `${page1}f1_32[0]`),
  text("line12", `${page1}f1_33[0]`),
  text("line13", `${page1}f1_34[0]`),
];

function printSsn(ssn: string): string {
  const digits = ssn.replace(/\D/g, "");
  return digits.length === 9
    ? `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`
    : ssn;
}

function recipientIdentity(
  fields: Record<string, unknown>,
  filer: FilerIdentity | undefined,
): { name: string; ssn: string } {
  if (!filer) throw new Error("Form 4137 PDF needs filer identity");
  if (fields.recipient === "spouse") {
    const spouse = filer.spouse;
    if (!spouse?.firstName || !spouse.lastName || !spouse.ssn) {
      throw new Error("Form 4137 PDF needs spouse name and SSN");
    }
    return {
      name: `${spouse.firstName} ${spouse.lastName}`,
      ssn: printSsn(spouse.ssn),
    };
  }
  const name = filer.fullName ?? filer.nameLine1;
  if (!name || !filer.primarySSN) {
    throw new Error("Form 4137 PDF needs taxpayer name and SSN");
  }
  return { name, ssn: printSsn(filer.primarySSN) };
}

function projectedForm(form: Form4137Calculation): Record<string, unknown> {
  const projected: Record<string, unknown> = {
    recipient: form.recipient,
    employers: form.employers,
    government_employee_tips: form.governmentEmployeeTips,
    line2: form.totalTipsReceived,
    line3: form.totalTipsReported,
    line4: form.unreportedTips,
    line5: form.incidentalTips,
    line6: form.medicareTips,
    line8: form.ssWagesAndTips,
    line9: form.ssWageBaseRoom,
    line10: form.ssTips,
    line11: form.ssTax,
    line12: form.medicareTax,
    line13: form.totalTax,
  };
  form.employers.slice(0, 5).forEach((employer, index) => {
    const row = index + 1;
    projected[`employer_${row}_name`] = employer.name;
    projected[`employer_${row}_ein`] = employer.ein;
    projected[`employer_${row}_received`] = employer.tips_received;
    projected[`employer_${row}_reported`] = employer.tips_reported;
  });
  return projected;
}

export const form4137Pdf: PdfFormDescriptor = {
  pendingKey: "form4137",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f4137--2025.pdf",
  fields,
  pageIndices: () => [0],
  instances(raw) {
    const input = inputSchema.parse(raw);
    return calculateForm4137(input, CONFIG_BY_YEAR[2025].ssWageBase).map(
      projectedForm,
    );
  },
  decoratePages: async (document, pages, fields, filer) => {
    const page = pages[0];
    const font = await document.embedFont(StandardFonts.Helvetica);
    const { name, ssn } = recipientIdentity(fields, filer);
    page.drawText(name, { x: 37, y: 682, size: 9, font, maxWidth: 425 });
    page.drawText(ssn, { x: 475, y: 682, size: 9, font });
    const employers = fields.employers as Form4137Calculation["employers"];
    employers.slice(0, 5).forEach((employer, index) => {
      if (employer.applied_for_ein) {
        page.drawText("Applied For", {
          x: 307,
          y: 615 - index * 24,
          size: 8,
          font,
        });
      }
    });
    const government = fields.government_employee_tips;
    if (typeof government === "number" && government > 0) {
      page.drawText(`1.45% tips ${Math.round(government)}`, {
        x: 405,
        y: 330,
        size: 7,
        font,
      });
    }
  },
  appendSupplementalPages: async (document, fields, filer) => {
    const employers = fields.employers as Form4137Calculation["employers"];
    const extra = employers.slice(5);
    if (extra.length === 0) return;
    const { name, ssn } = recipientIdentity(fields, filer);
    const regular = await document.embedFont(StandardFonts.Helvetica);
    const bold = await document.embedFont(StandardFonts.HelveticaBold);
    for (let offset = 0; offset < extra.length; offset += 22) {
      const page = document.addPage([612, 792]);
      page.drawText("Form 4137 (2025) - line 1 employer continuation", {
        x: 40,
        y: 750,
        size: 12,
        font: bold,
      });
      page.drawText(`${name}  |  SSN ${ssn}  |  Calendar year 2025`, {
        x: 40,
        y: 727,
        size: 9,
        font: regular,
      });
      page.drawText("Employer", { x: 40, y: 698, size: 9, font: bold });
      page.drawText("EIN", { x: 275, y: 698, size: 9, font: bold });
      page.drawText("Tips received", { x: 365, y: 698, size: 9, font: bold });
      page.drawText("Tips reported", { x: 470, y: 698, size: 9, font: bold });
      extra.slice(offset, offset + 22).forEach((employer, index) => {
        const y = 675 - index * 26;
        page.drawText(employer.name, {
          x: 40,
          y,
          size: 8,
          font: regular,
          maxWidth: 220,
        });
        page.drawText(employer.ein ?? "Applied For", {
          x: 275,
          y,
          size: 8,
          font: regular,
        });
        page.drawText(String(Math.round(employer.tips_received)), {
          x: 365,
          y,
          size: 8,
          font: regular,
        });
        page.drawText(String(Math.round(employer.tips_reported)), {
          x: 470,
          y,
          size: 8,
          font: regular,
        });
      });
      page.drawText(
        "Lines 2-13 on the main form include all employers on this continuation.",
        { x: 40, y: 60, size: 9, font: regular },
      );
    }
  },
};
