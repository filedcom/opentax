import { StandardFonts } from "pdf-lib";
import type { FilerIdentity } from "../../../mef/header.ts";
import { CONFIG_BY_YEAR } from "../../../nodes/config/index.ts";
import {
  calculateForm8919,
  type Form8919Calculation,
  inputSchema,
} from "../../../nodes/intermediate/forms/form8919/index.ts";
import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";

const page1 = "topmostSubform[0].Page1[0].";
const text = (domainKey: string, pdfField: string): PdfFieldEntry => ({
  kind: "text",
  domainKey,
  pdfField,
});

const firmFields: ReadonlyArray<PdfFieldEntry> = Array.from(
  { length: 5 },
  (_, index) => {
    const row = `Pg1Table[0].Row${index + 1}[0].`;
    const first = 3 + index * 5;
    return [
      text(`firm_${index + 1}_name`, `${page1}${row}f1_${first}[0]`),
      text(`firm_${index + 1}_tin`, `${page1}${row}f1_${first + 1}[0]`),
      text(`firm_${index + 1}_reason`, `${page1}${row}f1_${first + 2}[0]`),
      text(`firm_${index + 1}_date`, `${page1}${row}f1_${first + 3}[0]`),
      {
        kind: "checkbox" as const,
        domainKey: `firm_${index + 1}_form1099_received`,
        pdfField: `${page1}${row}c1_${index + 1}[0]`,
      },
      text(`firm_${index + 1}_wages`, `${page1}${row}f1_${first + 4}[0]`),
    ];
  },
).flat();

const fields: ReadonlyArray<PdfFieldEntry> = [
  ...firmFields,
  text("line6", `${page1}f1_28[0]`),
  {
    kind: "text",
    domainKey: "line8",
    pdfField: `${page1}f1_30[0]`,
    printZero: true,
  },
  {
    kind: "text",
    domainKey: "line9",
    pdfField: `${page1}f1_31[0]`,
    printZero: true,
  },
  {
    kind: "text",
    domainKey: "line10",
    pdfField: `${page1}f1_32[0]`,
    printZero: true,
  },
  {
    kind: "text",
    domainKey: "line11",
    pdfField: `${page1}f1_33[0]`,
    printZero: true,
  },
  text("line12", `${page1}f1_34[0]`),
  text("line13", `${page1}f1_35[0]`),
];

function printSsn(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits.length === 9
    ? `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`
    : value;
}

function printTin(employer: Form8919Calculation["employers"][number]): string {
  if (!employer.tin) return "unknown";
  const digits = employer.tin.replace(/\D/g, "");
  return employer.tin_type === "ssn"
    ? `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`
    : `${digits.slice(0, 2)}-${digits.slice(2)}`;
}

function printDate(value: string | undefined): string | undefined {
  return value
    ? `${value.slice(5, 7)}/${value.slice(8, 10)}/${value.slice(0, 4)}`
    : undefined;
}

function projectedForm(
  form: Form8919Calculation,
  firms: Form8919Calculation["employers"],
  firstPage: boolean,
): Record<string, unknown> {
  const projected: Record<string, unknown> = { recipient: form.recipient };
  firms.forEach((employer, index) => {
    const row = index + 1;
    projected[`firm_${row}_name`] = employer.name;
    projected[`firm_${row}_tin`] = printTin(employer);
    projected[`firm_${row}_reason`] = employer.reason_code;
    projected[`firm_${row}_date`] = printDate(
      employer.correspondence_received_date,
    );
    projected[`firm_${row}_form1099_received`] = employer.form1099_received;
    projected[`firm_${row}_wages`] = employer.wages;
  });
  if (firstPage) {
    Object.assign(projected, {
      line6: form.line6,
      line8: form.line8,
      line9: form.line9,
      line10: form.line10,
      line11: form.line11,
      line12: form.line12,
      line13: form.line13,
    });
  }
  return projected;
}

function recipientIdentity(
  recipient: unknown,
  filer: FilerIdentity | undefined,
): { name: string; ssn: string } {
  if (!filer) throw new Error("Form 8919 PDF needs filer identity");
  if (recipient === "spouse") {
    const spouse = filer.spouse;
    if (!spouse?.firstName || !spouse.lastName || !spouse.ssn) {
      throw new Error("Form 8919 PDF needs spouse name and SSN");
    }
    return {
      name: `${spouse.firstName} ${spouse.lastName}`,
      ssn: printSsn(spouse.ssn),
    };
  }
  const name = filer.fullName ?? filer.nameLine1;
  if (!name || !filer.primarySSN) {
    throw new Error("Form 8919 PDF needs taxpayer name and SSN");
  }
  return { name, ssn: printSsn(filer.primarySSN) };
}

export const form8919Pdf: PdfFormDescriptor = {
  pendingKey: "form8919",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8919--2025.pdf",
  fields,
  pageIndices: () => [0],
  instances(raw) {
    const input = inputSchema.parse(raw);
    const calculated = calculateForm8919(
      input,
      CONFIG_BY_YEAR[2025].ssWageBase,
    );
    return calculated.flatMap((form) => {
      const copies: Record<string, unknown>[] = [];
      for (let offset = 0; offset < form.employers.length; offset += 5) {
        copies.push(projectedForm(
          form,
          form.employers.slice(offset, offset + 5),
          offset === 0,
        ));
      }
      return copies;
    });
  },
  decoratePages: async (document, pages, fields, filer) => {
    const page = pages[0];
    const font = await document.embedFont(StandardFonts.Helvetica);
    const { name, ssn } = recipientIdentity(fields.recipient, filer);
    page.drawText(name, { x: 37, y: 682, size: 9, font, maxWidth: 425 });
    page.drawText(ssn, { x: 475, y: 682, size: 9, font });
  },
};
