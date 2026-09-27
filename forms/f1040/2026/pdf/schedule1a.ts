import { PDFDocument, StandardFonts } from "pdf-lib";
import { z } from "zod";
import {
  type EmployeeTipRow2026,
  reconcileEmployeeTips2026,
} from "../employee-tips.ts";
import { FilingStatus } from "../../nodes/types.ts";

const pinnedDraft = new URL(
  "../../../../docs/ty2026/corpus/draft/f1040s1a.pdf",
  import.meta.url,
);
const pinnedDraftSha256 =
  "e22aec7feb2f5b734e16ee74d70acfdfdc0d66a5292f69cf0ced3b87543d95ac";
const p1 = "form1[0].Page1[0].";
const p2 = "form1[0].Page2[0].";
const p3 = "form1[0].Page3[0].";

const tipSourceSchema = z.object({
  source: z.enum(["w2", "form4137"]),
  employer_ein: z.string().optional(),
  employer_name: z.string().min(1),
  employee_ssn: z.string().optional(),
  recipient: z.enum(["taxpayer", "spouse"]).optional(),
  amount: z.number().finite().nonnegative(),
  occupation_codes: z.array(z.string()).optional(),
  qualified_amount: z.number().finite().nonnegative().optional(),
});

const printSchema = z.object({
  filing_status: z.nativeEnum(FilingStatus),
  taxpayer_ssn: z.string(),
  spouse_ssn: z.string().optional(),
  taxpayer_has_valid_ssn: z.boolean(),
  spouse_has_valid_ssn: z.boolean(),
  taxpayer_age_65_or_older: z.boolean().optional(),
  spouse_age_65_or_older: z.boolean().optional(),
  qualified_employee_tip_sources_2026: z.array(tipSourceSchema).optional(),
  qualified_employee_overtime: z.array(z.object({
    employee_ssn: z.string(),
    amount: z.number().finite().nonnegative(),
    employer_name: z.string().optional(),
    employer_ein: z.string().optional(),
  })).optional(),
  taxpayer_non_w2_qualified_overtime_compensation: z.number().optional(),
  spouse_non_w2_qualified_overtime_compensation: z.number().optional(),
  magi: z.number().finite(),
  line15_qualified_tips: z.number().finite().nonnegative(),
  line27_qualified_overtime: z.number().finite().nonnegative(),
  line36_vehicle_loan_interest: z.number().finite().nonnegative(),
  line43_enhanced_senior: z.number().finite().nonnegative(),
  line44_total_additional_deductions: z.number().finite().positive(),
});

function amount(fields: Record<string, unknown>, key: string): number {
  const value = fields[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`TY2026 Schedule 1-A PDF needs ${key}`);
  }
  return value;
}

function fill(
  form: ReturnType<PDFDocument["getForm"]>,
  field: string,
  value: string | number | undefined,
): void {
  if (value === undefined || value === "" || value === 0) return;
  form.getTextField(field).setText(
    typeof value === "number" ? String(Math.round(value)) : value,
  );
}

async function appendTipContinuation(
  document: PDFDocument,
  rows: readonly EmployeeTipRow2026[],
  filer: { name: string; ssn: string },
  total: number,
): Promise<void> {
  const extra = rows.slice(5);
  if (extra.length === 0) return;
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  for (let offset = 0; offset < extra.length; offset += 29) {
    const sheet = document.addPage([612, 792]);
    sheet.drawText("Schedule 1-A (2026) - line 4 employee tip continuation", {
      x: 36,
      y: 748,
      size: 11,
      font: bold,
    });
    sheet.drawText(`Name: ${filer.name}    SSN: ${filer.ssn}`, {
      x: 36,
      y: 728,
      size: 9,
      font: regular,
    });
    const headers = [
      ["Employer", 36],
      ["EIN", 290],
      ["W-2 TP", 390],
      ["4137", 458],
      ["Larger", 520],
    ] as const;
    for (const [label, x] of headers) {
      sheet.drawText(label, { x, y: 694, size: 8, font: bold });
    }
    for (const [index, row] of extra.slice(offset, offset + 29).entries()) {
      const y = 674 - index * 19;
      const width = 244;
      const size = Math.min(
        9,
        9 * width / regular.widthOfTextAtSize(row.employerName, 9),
      );
      if (size < 6) {
        throw new Error("TY2026 Schedule 1-A tip employer name is too long");
      }
      sheet.drawText(row.employerName, { x: 36, y, size, font: regular });
      sheet.drawText(row.employerEin ?? "APPLIED FOR", {
        x: 290,
        y,
        size: 8,
        font: regular,
      });
      for (
        const [value, x] of [
          [row.w2ReportedCashTips, 390],
          [row.form4137CashTips, 458],
          [row.amountUsed, 520],
        ] as const
      ) {
        sheet.drawText(String(Math.round(value)), {
          x,
          y,
          size: 8,
          font: regular,
        });
      }
    }
    sheet.drawText(`Line 5 total, all employers: ${Math.round(total)}`, {
      x: 36,
      y: 78,
      size: 9,
      font: bold,
    });
  }
}

async function appendOvertimeContinuation(
  document: PDFDocument,
  rows: readonly {
    employer_name?: string;
    employer_ein?: string;
    amount: number;
  }[],
  filer: { name: string; ssn: string },
  total: number,
): Promise<void> {
  const extra = rows.slice(5);
  if (extra.length === 0) return;
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  for (let offset = 0; offset < extra.length; offset += 29) {
    const sheet = document.addPage([612, 792]);
    sheet.drawText("Schedule 1-A (2026) - line 16 overtime continuation", {
      x: 36,
      y: 748,
      size: 11,
      font: bold,
    });
    sheet.drawText(`Name: ${filer.name}    SSN: ${filer.ssn}`, {
      x: 36,
      y: 728,
      size: 9,
      font: regular,
    });
    for (
      const [label, x] of [
        ["Employer", 36],
        ["EIN", 380],
        ["W-2 code TT", 500],
      ] as const
    ) {
      sheet.drawText(label, { x, y: 694, size: 8, font: bold });
    }
    for (const [index, row] of extra.slice(offset, offset + 29).entries()) {
      const y = 674 - index * 19;
      const name = row.employer_name!;
      const size = Math.min(
        9,
        9 * 330 / regular.widthOfTextAtSize(name, 9),
      );
      if (size < 6) {
        throw new Error(
          "TY2026 Schedule 1-A overtime employer name is too long",
        );
      }
      sheet.drawText(name, { x: 36, y, size, font: regular });
      sheet.drawText(row.employer_ein!, {
        x: 380,
        y,
        size: 8,
        font: regular,
      });
      sheet.drawText(String(Math.round(row.amount)), {
        x: 500,
        y,
        size: 8,
        font: regular,
      });
    }
    sheet.drawText(`Line 17 total, all employers: ${Math.round(total)}`, {
      x: 36,
      y: 78,
      size: 9,
      font: bold,
    });
  }
}

/** Current filed 2026 Schedule 1-A PDF slice: employee tips and seniors. */
export async function buildSchedule1APdfBytes2026(
  rawFields: Record<string, unknown>,
  f1040: Record<string, unknown>,
  filer: { name: string; ssn: string },
): Promise<Uint8Array> {
  const fields = printSchema.parse(rawFields);
  if (!filer.name || !filer.ssn) {
    throw new Error("TY2026 Schedule 1-A PDF needs filer name and SSN");
  }
  if (
    fields.line36_vehicle_loan_interest > 0
  ) {
    throw new Error("TY2026 Schedule 1-A PDF needs vehicle row details");
  }
  if (
    fields.line27_qualified_overtime > 0 &&
    ((fields.taxpayer_non_w2_qualified_overtime_compensation ?? 0) > 0 ||
      (fields.spouse_non_w2_qualified_overtime_compensation ?? 0) > 0)
  ) {
    throw new Error(
      "TY2026 Schedule 1-A PDF needs non-W-2 overtime business and payer details",
    );
  }
  const agi = amount(f1040, "line11b_agi");
  if (fields.magi !== agi) {
    throw new Error("TY2026 Schedule 1-A PDF needs MAGI addback details");
  }
  const tips = reconcileEmployeeTips2026({
    filingStatus: fields.filing_status,
    taxpayerSsn: fields.taxpayer_ssn,
    spouseSsn: fields.spouse_ssn,
    sources: fields.qualified_employee_tip_sources_2026 ?? [],
  }).rows.filter((row) =>
    row.recipient === "taxpayer"
      ? fields.taxpayer_has_valid_ssn
      : fields.spouse_has_valid_ssn
  );
  const line5 = tips.reduce((sum, row) => sum + row.amountUsed, 0);
  const line9 = Math.min(line5, 25_000);
  const tipsThreshold = fields.filing_status === FilingStatus.MFJ
    ? 300_000
    : 150_000;
  const tipsExcess = Math.max(0, fields.magi - tipsThreshold);
  const tipsQuotient = Math.floor(tipsExcess / 1_000);
  const tipReduction = tipsQuotient * 100;
  const expectedTips = Math.max(0, line9 - tipReduction);
  const overtime = (fields.qualified_employee_overtime ?? []).filter((row) => {
    const employee = row.employee_ssn.replaceAll("-", "");
    if (employee === fields.taxpayer_ssn.replaceAll("-", "")) {
      return fields.taxpayer_has_valid_ssn;
    }
    if (
      fields.filing_status === FilingStatus.MFJ && fields.spouse_ssn &&
      employee === fields.spouse_ssn.replaceAll("-", "")
    ) return fields.spouse_has_valid_ssn;
    throw new Error("TY2026 Schedule 1-A overtime employee SSN is unmatched");
  });
  if (
    fields.line27_qualified_overtime > 0 &&
    overtime.some((row) =>
      !row.employer_name?.trim() || !row.employer_ein?.trim()
    )
  ) {
    throw new Error(
      "TY2026 Schedule 1-A PDF needs W-2 overtime employer identity",
    );
  }
  const overtimeTotal = overtime.reduce((sum, row) => sum + row.amount, 0);
  const overtimeCap = fields.filing_status === FilingStatus.MFJ
    ? 25_000
    : 12_500;
  const overtimeLimited = Math.min(overtimeTotal, overtimeCap);
  const expectedOvertime = Math.max(0, overtimeLimited - tipReduction);
  const taxpayerSenior = fields.taxpayer_age_65_or_older === true &&
    fields.taxpayer_has_valid_ssn;
  const spouseSenior = fields.filing_status === FilingStatus.MFJ &&
    fields.spouse_age_65_or_older === true && fields.spouse_has_valid_ssn;
  const seniorsThreshold = fields.filing_status === FilingStatus.MFJ
    ? 150_000
    : 75_000;
  const seniorExcess = Math.max(0, fields.magi - seniorsThreshold);
  const seniorReduction = seniorExcess * 0.06;
  const perSenior = Math.max(0, 6_000 - seniorReduction);
  const expectedSenior = perSenior *
    (Number(taxpayerSenior) + Number(spouseSenior));
  if (
    expectedTips !== fields.line15_qualified_tips ||
    expectedOvertime !== fields.line27_qualified_overtime ||
    expectedSenior !== fields.line43_enhanced_senior ||
    expectedTips + expectedOvertime + expectedSenior !==
      fields.line44_total_additional_deductions ||
    fields.line44_total_additional_deductions !==
      amount(f1040, "line13a_schedule1a")
  ) {
    throw new Error("TY2026 Schedule 1-A PDF lines disagree with Form 1040");
  }
  const source = await Deno.readFile(pinnedDraft);
  const hash = [
    ...new Uint8Array(await crypto.subtle.digest("SHA-256", source)),
  ]
    .map((byte) => byte.toString(16).padStart(2, "0")).join("");
  if (hash !== pinnedDraftSha256) {
    throw new Error("Pinned TY2026 draft Schedule 1-A hash changed");
  }
  const draft = await PDFDocument.load(source, { ignoreEncryption: true });
  const form = draft.getForm();
  fill(form, `${p1}f1_01[0]`, filer.name);
  fill(form, `${p1}f1_02[0]`, filer.ssn);
  fill(form, `${p1}f1_03[0]`, agi);
  fill(form, `${p1}f1_09[0]`, fields.magi);
  for (const [index, row] of tips.slice(0, 5).entries()) {
    const base = 10 + index * 5;
    const rowPrefix = `${p1}Table_Line4[0].Row4${"abcde"[index]}[0].`;
    fill(form, `${rowPrefix}f1_${base}[0]`, row.employerName);
    fill(
      form,
      `${rowPrefix}f1_${base + 1}[0]`,
      row.employerEin ?? "APPLIED FOR",
    );
    fill(form, `${rowPrefix}f1_${base + 2}[0]`, row.w2ReportedCashTips);
    fill(form, `${rowPrefix}f1_${base + 3}[0]`, row.form4137CashTips);
    fill(form, `${rowPrefix}f1_${base + 4}[0]`, row.amountUsed);
  }
  const tipLines: readonly (readonly [number, number])[] = [
    [35, line5],
    [101, 0],
    [102, line5],
    [103, line9],
    [104, fields.magi],
    [105, tipsThreshold],
    [106, tipsExcess],
    [107, tipsQuotient],
    [108, tipReduction],
    [109, expectedTips],
  ];
  for (const [number, value] of tipLines) {
    if (line5 > 0) fill(form, `${p1}f1_${number}[0]`, value);
  }
  if (fields.line27_qualified_overtime > 0) {
    for (const [index, row] of overtime.slice(0, 5).entries()) {
      const base = 1 + index * 3;
      const prefix = `${p2}Table_Line16[0].Row16${"abcde"[index]}[0].`;
      fill(
        form,
        `${prefix}f2_${String(base).padStart(2, "0")}[0]`,
        row.employer_name,
      );
      fill(
        form,
        `${prefix}f2_${String(base + 1).padStart(2, "0")}[0]`,
        row.employer_ein,
      );
      fill(
        form,
        `${prefix}f2_${String(base + 2).padStart(2, "0")}[0]`,
        row.amount,
      );
    }
    const overtimeLines: readonly (readonly [number, number])[] = [
      [16, overtimeTotal],
      [38, overtimeTotal],
      [39, overtimeLimited],
      [40, fields.magi],
      [41, tipsThreshold],
      [42, tipsExcess],
      [43, tipsQuotient],
      [44, tipReduction],
      [45, expectedOvertime],
    ];
    for (const [number, value] of overtimeLines) {
      fill(form, `${p2}f2_${String(number).padStart(2, "0")}[0]`, value);
    }
  }
  if (expectedSenior > 0) {
    const seniorLines: readonly (readonly [number, number])[] = [
      [15, fields.magi],
      [16, seniorsThreshold],
      [17, seniorExcess],
      [18, seniorReduction],
      [19, perSenior],
      [20, taxpayerSenior ? perSenior : 0],
      [21, spouseSenior ? perSenior : 0],
      [22, expectedSenior],
    ];
    for (const [number, value] of seniorLines) {
      fill(form, `${p3}f3_${number.toString().padStart(2, "0")}[0]`, value);
    }
  }
  fill(form, `${p3}f3_23[0]`, fields.line44_total_additional_deductions);
  form.updateFieldAppearances(await draft.embedFont(StandardFonts.Helvetica));
  form.flatten();
  const document = await PDFDocument.create();
  const pages = await document.copyPages(draft, [1, 2, 3]);
  for (const page of pages) document.addPage(page);
  await appendTipContinuation(document, tips, filer, line5);
  if (fields.line27_qualified_overtime > 0) {
    await appendOvertimeContinuation(document, overtime, filer, overtimeTotal);
  }
  return document.save();
}
