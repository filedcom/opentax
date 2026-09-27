import { PDFDocument, StandardFonts } from "pdf-lib";
import { CONFIG_BY_YEAR } from "../../nodes/config/index.ts";
import {
  calculateForm4137,
  type Form4137Calculation,
  inputSchema,
} from "../../nodes/intermediate/forms/form4137/index.ts";

const pinnedDraft = new URL(
  "../../../../docs/ty2026/corpus/draft/f4137.pdf",
  import.meta.url,
);
const pinnedDraftSha256 =
  "5aa2841964470753f5106136dc9d505c9301c024ef683f014ea1f6bec852dbc0";
const page = "topmostSubform[0].Page1[0].";

function amount(fields: Record<string, unknown>, key: string): number {
  const value = fields[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`TY2026 Form 4137 PDF needs ${key}`);
  }
  return value;
}

function identity(
  recipient: Form4137Calculation["recipient"],
  f1040: Record<string, unknown>,
): { name: string; ssn: string } {
  const prefix = recipient === "taxpayer" ? "taxpayer" : "spouse";
  const name = [
    f1040[`${prefix}_first_name`],
    f1040[`${prefix}_middle_initial`],
    f1040[`${prefix}_last_name`],
  ].filter(Boolean).join(" ");
  const ssn = String(f1040[`${prefix}_ssn`] ?? "");
  if (!name || !/^\d{9}$/.test(ssn.replaceAll("-", ""))) {
    throw new Error(`TY2026 Form 4137 PDF needs ${recipient} name and SSN`);
  }
  return { name, ssn };
}

function fill(
  form: ReturnType<PDFDocument["getForm"]>,
  number: number,
  value: string | number | undefined,
): void {
  if (value === undefined || value === "" || value === 0) return;
  const parent = number >= 3 && number <= 22
    ? `Table_Line1[0].BodyRow${Math.floor((number - 3) / 4) + 1}[0].`
    : "";
  form.getTextField(`${page}${parent}f1_${number}[0]`).setText(String(value));
}

function fit(
  text: string,
  width: number,
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
): number {
  const size = Math.min(9, 9 * width / font.widthOfTextAtSize(text, 9));
  if (size < 6) throw new Error("TY2026 Form 4137 statement text is too long");
  return size;
}

async function appendContinuation(
  document: PDFDocument,
  calculation: Form4137Calculation,
  filer: { name: string; ssn: string },
): Promise<void> {
  const extra = calculation.employers.slice(5);
  if (extra.length === 0) return;
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  for (let offset = 0; offset < extra.length; offset += 32) {
    const sheet = document.addPage([612, 792]);
    sheet.drawText("Form 4137 (2026) - line 1 employer continuation", {
      x: 36,
      y: 748,
      size: 11,
      font: bold,
    });
    sheet.drawText(`Name: ${filer.name}    SSN: ${filer.ssn}`, {
      x: 36,
      y: 727,
      size: 9,
      font: regular,
    });
    const headers = [
      ["Employer", 36],
      ["EIN", 326],
      ["Tips received", 418],
      ["Tips reported", 508],
    ] as const;
    for (const [label, x] of headers) {
      sheet.drawText(label, { x, y: 695, size: 8, font: bold });
    }
    for (
      const [index, employer] of extra.slice(offset, offset + 32).entries()
    ) {
      const y = 676 - index * 18;
      const ein = employer.ein ?? "APPLIED FOR";
      sheet.drawText(employer.name, {
        x: 36,
        y,
        size: fit(employer.name, 275, regular),
        font: regular,
      });
      sheet.drawText(ein, { x: 326, y, size: 8, font: regular });
      sheet.drawText(String(Math.round(employer.tips_received)), {
        x: 418,
        y,
        size: 8,
        font: regular,
      });
      sheet.drawText(String(Math.round(employer.tips_reported)), {
        x: 508,
        y,
        size: 8,
        font: regular,
      });
    }
    sheet.drawText(
      `Line 2 total received: ${
        Math.round(calculation.totalTipsReceived)
      }    ` +
        `Line 3 total reported: ${Math.round(calculation.totalTipsReported)}`,
      { x: 36, y: 78, size: 9, font: bold },
    );
  }
}

/** Fill each recipient's 2026 Form 4137 and its line 1 continuation, if needed. */
export async function buildForm4137PdfBytes2026(
  fields: Record<string, unknown>,
  f1040: Record<string, unknown>,
  schedule2: Record<string, unknown>,
): Promise<Uint8Array> {
  const input = inputSchema.parse(fields);
  const calculations = calculateForm4137(
    input,
    CONFIG_BY_YEAR[2026].ssWageBase,
  );
  const income = calculations.reduce(
    (sum, item) => sum + item.unreportedTips,
    0,
  );
  const tax = calculations.reduce((sum, item) => sum + item.totalTax, 0);
  if (
    calculations.length === 0 ||
    (income === 0 && tax === 0) ||
    income !== amount(f1040, "line1c_unreported_tips") ||
    tax !== amount(schedule2, "line16a_form4137_tip_tax")
  ) {
    throw new Error(
      "TY2026 Form 4137 PDF disagrees with Form 1040 or Schedule 2",
    );
  }
  const source = await Deno.readFile(pinnedDraft);
  const hash = [
    ...new Uint8Array(await crypto.subtle.digest("SHA-256", source)),
  ]
    .map((byte) => byte.toString(16).padStart(2, "0")).join("");
  if (hash !== pinnedDraftSha256) {
    throw new Error("Pinned TY2026 draft Form 4137 hash changed");
  }
  const combined = await PDFDocument.create();
  for (const calculation of calculations) {
    const filer = identity(calculation.recipient, f1040);
    const draft = await PDFDocument.load(source, { ignoreEncryption: true });
    const form = draft.getForm();
    fill(form, 1, filer.name);
    fill(form, 2, filer.ssn);
    for (
      const [index, employer] of calculation.employers.slice(0, 5).entries()
    ) {
      const base = 3 + index * 4;
      fill(form, base, employer.name);
      fill(form, base + 1, employer.ein ?? "APPLIED FOR");
      fill(form, base + 2, Math.round(employer.tips_received));
      fill(form, base + 3, Math.round(employer.tips_reported));
    }
    const lines: readonly (readonly [number, number])[] = [
      [23, calculation.totalTipsReceived],
      [24, calculation.totalTipsReported],
      [25, calculation.unreportedTips],
      [26, calculation.incidentalTips],
      [27, calculation.medicareTips],
      [29, calculation.ssWagesAndTips],
      [30, calculation.ssWageBaseRoom],
      [31, calculation.ssTips],
      [32, calculation.ssTax],
      [33, calculation.medicareTax],
      [34, calculation.totalTax],
    ];
    for (const [number, value] of lines) fill(form, number, Math.round(value));
    form.updateFieldAppearances(
      await draft.embedFont(StandardFonts.Helvetica),
    );
    form.flatten();
    combined.addPage((await combined.copyPages(draft, [1]))[0]);
    await appendContinuation(combined, calculation, filer);
  }
  return combined.save();
}
