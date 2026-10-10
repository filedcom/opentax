import { StandardFonts } from "pdf-lib";
import { reconcileLtcReturn } from "../../../../mef/forms/adjustments/health/f8853_ltc.ts";
import type {
  PdfFieldEntry,
  PdfFormDescriptor,
} from "../../../review-support/form-descriptor.ts";

const field = (n: number) => `topmostSubform[0].Page2[0].f2_${n}[0]`;
export const ltcPdfFields: ReadonlyArray<PdfFieldEntry> = [
  { kind: "text", domainKey: "ltc_policyholder_name", pdfField: field(1) },
  { kind: "text", domainKey: "ltc_policyholder_ssn", pdfField: field(2) },
  { kind: "text", domainKey: "ltc_insured_name", pdfField: field(3) },
  { kind: "text", domainKey: "ltc_insured_ssn", pdfField: field(4) },
  {
    kind: "checkboxWhen",
    domainKey: "ltc_other_payees",
    whenValue: "true",
    pdfField: "topmostSubform[0].Page2[0].c2_2[0]",
  },
  {
    kind: "checkboxWhen",
    domainKey: "ltc_other_payees",
    whenValue: "false",
    pdfField: "topmostSubform[0].Page2[0].c2_2[1]",
  },
  {
    kind: "checkboxWhen",
    domainKey: "ltc_terminally_ill",
    whenValue: "true",
    pdfField: "topmostSubform[0].Page2[0].c2_3[0]",
  },
  {
    kind: "checkboxWhen",
    domainKey: "ltc_terminally_ill",
    whenValue: "false",
    pdfField: "topmostSubform[0].Page2[0].c2_3[1]",
  },
  ...Array.from(
    { length: 10 },
    (_, i): PdfFieldEntry => ({
      kind: "text",
      domainKey: `ltc_line${17 + i}`,
      pdfField: field(5 + i),
      printZero: true,
    }),
  ),
];

export const ltcPdfInstances: NonNullable<PdfFormDescriptor["instances"]> = (
  raw,
  filer,
  pending,
) => {
  const { form } = reconcileLtcReturn(raw, { filer, pending });
  return [{
    ...raw,
    ltc_print: true,
    employer_archer_msa: undefined,
    taxpayer_archer_msa_contributions: undefined,
    line3_limitation_amount: undefined,
    compensation: undefined,
    ltc_policyholder_name: form.policyholder.name,
    ltc_policyholder_ssn: form.policyholder.ssn,
    ltc_insured_name: form.insured.name,
    ltc_insured_ssn: form.insured.ssn,
    ltc_other_payees: String(form.multiplePayees),
    ltc_terminally_ill: String(form.terminallyIll),
    ...Object.fromEntries(Array.from({ length: 10 }, (_, i) => {
      const line = 17 + i;
      const key = `line${line}` as keyof typeof form;
      const omit = form.terminalOnly
        ? line !== 26
        : form.multiplePayees && line >= 21 && line <= 24;
      return [`ltc_line${line}`, omit ? undefined : form[key]];
    })),
  }];
};

export const appendLtcStatement: NonNullable<
  PdfFormDescriptor["appendSupplementalPages"]
> = async (document, fields, filer, pending) => {
  if (!fields.ltc_ledger || fields.ltc_print !== true) return;
  const { form, insured } = reconcileLtcReturn(fields, { filer, pending });
  if (!form.multiplePayees || form.terminalOnly) return;
  const font = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  let page = document.addPage([612, 792]);
  let pageNumber = 0;
  let y = 0;
  const header = () => {
    pageNumber++;
    page.drawText("Form 8853 (2025) - Multiple Payees Statement", {
      x: 40,
      y: 750,
      size: 13,
      font: bold,
    });
    page.drawText(
      `${form.policyholder.name}   SSN ${form.policyholder.ssn}   Page ${pageNumber}`,
      { x: 40, y: 730, size: 10, font },
    );
    page.drawText(`Insured: ${form.insured.name}   SSN ${form.insured.ssn}`, {
      x: 40,
      y: 712,
      size: 10,
      font,
    });
    page.drawText(
      `LTC period: ${form.period.start_date} through ${form.period.end_date} (${insured.days} ${
        insured.days === 1 ? "day" : "days"
      })`,
      { x: 40, y: 694, size: 10, font },
    );
    y = 662;
  };
  const row = (label: string, amount?: number) => {
    if (y < 55) {
      page = document.addPage([612, 792]);
      header();
    }
    page.drawText(label, { x: 40, y, size: 10, font });
    if (amount !== undefined) {
      const text = amount.toLocaleString("en-US");
      page.drawText(text, {
        x: 565 - font.widthOfTextAtSize(text, 10),
        y,
        size: 10,
        font,
      });
    }
    y -= 19;
  };
  header();
  row("Aggregate calculation for all policyholders:");
  const labels = [
    "18  Qualified LTC payments",
    "19  Chronic-illness accelerated death benefits",
    "20  Total periodic payments",
    "21  $420 multiplied by days",
    "22  Qualified LTC service costs",
    "23  Larger of lines 21 and 22",
    "24  Reimbursements",
    "25  Per diem limitation",
    "26  Taxable payments",
  ];
  const values = [
    insured.aggregate.line18,
    insured.aggregate.line19,
    insured.aggregate.line20,
    insured.aggregate.line21,
    insured.aggregate.line22,
    insured.aggregate.line23,
    insured.aggregate.line24,
    insured.aggregate.line25,
    insured.aggregate.line26,
  ];
  labels.forEach((label, i) => row(label, values[i]));
  y -= 12;
  row(
    "Allocation: insured/joint spouse first, then other payees proportionally.",
  );
  for (const recipient of insured.recipients) {
    if (y < 145) {
      page = document.addPage([612, 792]);
      header();
    }
    row(recipient.policyholder.name);
    row("    Periodic payments", recipient.line20);
    row("    Allocated exclusion", recipient.line25 ?? 0);
    row("    Taxable payments", recipient.line26);
    y -= 8;
  }
  row(
    "Individual amounts are rounded; their sum may differ from the aggregate.",
  );
};
