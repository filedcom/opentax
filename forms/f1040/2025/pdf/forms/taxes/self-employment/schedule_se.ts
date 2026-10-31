import { assertOwnedScheduleSE } from "../../../../domains/taxes/self-employment/schedule-se/schedule-se-owner-source.ts";
import type { PdfFieldEntry, PdfFormDescriptor } from "../../../review-support/form-descriptor.ts";
import { scheduleSELines } from "../../../../../nodes/intermediate/forms/taxes/self-employment/schedule_se/calculation.ts";
import { CONFIG_BY_YEAR } from "../../../../../nodes/config/index.ts";
import { FilingStatus } from "../../../../../nodes/types.ts";
import { scheduleSeSpouseProprietor } from "../../../../domains/taxes/self-employment/schedule-se/schedule-se-proprietor.ts";
import { withMinisterialEarnings } from "../../../../../nodes/intermediate/forms/taxes/self-employment/schedule_se/ministerial.ts";
import { assertFileableClergyReturn } from "../../../../domains/income/wages/clergy/clergy_source.ts";
import { StandardFonts } from "pdf-lib";

// IRS Schedule SE (2025) AcroForm field names.
// Verified layout from https://www.irs.gov/pub/irs-prior/f1040sse--2025.pdf
//
// The TY2025 AcroForm starts with name (f1_1) and SSN (f1_2). Part I
// then runs in printed line order; Part II line 15 is Page 2 f2_2.

const page1 = "topmostSubform[0].Page1[0].";
const page2 = "topmostSubform[0].Page2[0].";

const fields: ReadonlyArray<PdfFieldEntry> = [
  { kind: "text", domainKey: "owner_name", pdfField: `${page1}f1_1[0]` },
  { kind: "text", domainKey: "owner_ssn", pdfField: `${page1}f1_2[0]` },
  // Line A: Form 4361 minister with $400 or more of other SE earnings.
  { kind: "checkbox", domainKey: "line_a_form4361", pdfField: `${page1}c1_1[0]` },
  {
    kind: "text",
    domainKey: "net_profit_schedule_f",
    pdfField: `${page1}f1_3[0]`,
  },
  {
    kind: "text",
    domainKey: "net_profit_schedule_c",
    pdfField: `${page1}f1_5[0]`,
  },
  { kind: "text", domainKey: "line3", pdfField: `${page1}f1_6[0]` },
  { kind: "text", domainKey: "line4a", pdfField: `${page1}f1_7[0]` },
  { kind: "text", domainKey: "line4b", pdfField: `${page1}f1_8[0]` },
  { kind: "text", domainKey: "line4c", pdfField: `${page1}f1_9[0]` },
  { kind: "text", domainKey: "line6", pdfField: `${page1}f1_12[0]` },
  {
    kind: "text",
    domainKey: "w2_ss_wages",
    pdfField: `${page1}Line8a_ReadOrder[0].f1_14[0]`,
  },
  {
    kind: "text",
    domainKey: "unreported_tips_4137",
    pdfField: `${page1}f1_15[0]`,
  },
  { kind: "text", domainKey: "wages_8919", pdfField: `${page1}f1_16[0]` },
  { kind: "text", domainKey: "line8d", pdfField: `${page1}f1_17[0]` },
  {
    kind: "text",
    domainKey: "line9",
    pdfField: `${page1}f1_18[0]`,
    printZero: true,
  },
  {
    kind: "text",
    domainKey: "line10",
    pdfField: `${page1}f1_19[0]`,
    printZero: true,
  },
  { kind: "text", domainKey: "line11", pdfField: `${page1}f1_20[0]` },
  { kind: "text", domainKey: "line12", pdfField: `${page1}f1_21[0]` },
  { kind: "text", domainKey: "line13", pdfField: `${page1}f1_22[0]` },
  { kind: "text", domainKey: "line15", pdfField: `${page2}f2_2[0]` },
];

/** Words wrapped to the explanation page's line width. */
function wrapped(text: string, width = 96): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    if (line.length > 0 && line.length + word.length + 1 > width) {
      lines.push(line);
      line = word;
    } else {
      line = line.length === 0 ? word : `${line} ${word}`;
    }
  }
  if (line.length > 0) lines.push(line);
  return lines;
}

export function scheduleSePdfFor(taxYear: number): PdfFormDescriptor {
  const clergyFor = (
    allPending: Record<string, Record<string, unknown>> | undefined,
  ) => allPending ? assertFileableClergyReturn(allPending, taxYear) : undefined;
  return {
  pendingKey: "schedule_se",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f1040sse--2025.pdf",
  fields,
  projectFields(rawFields, allPending) {
    if (Object.keys(rawFields).length === 0) return rawFields;
    if (rawFields.owner_identity) {
      assertOwnedScheduleSE(allPending, taxYear);
      return rawFields;
    }
    // Line 2 adds ministerial earnings to Schedule C and K-1 profit.
    const fields = withMinisterialEarnings(rawFields);
    const lines = scheduleSELines(fields, CONFIG_BY_YEAR[taxYear].ssWageBase);
    const spouseOwned = scheduleSeSpouseProprietor(allPending, fields);
    const general = allPending?.general;
    const return1040 = allPending?.f1040;
    const prefix = spouseOwned ? "spouse" : "taxpayer";
    const first = general?.[`${prefix}_first_name`];
    const middle = general?.[`${prefix}_middle_initial`];
    const last = general?.[`${prefix}_last_name`];
    const sourceSsn = general?.[`${prefix}_ssn`];
    const returnSsn = return1040?.[`${prefix}_ssn`];
    if (
      typeof first !== "string" || typeof last !== "string" ||
      typeof sourceSsn !== "string" ||
      return1040?.[`${prefix}_first_name`] !== first ||
      return1040?.[`${prefix}_last_name`] !== last ||
      typeof returnSsn !== "string" ||
      returnSsn.replaceAll("-", "") !==
        sourceSsn.replaceAll("-", "") ||
      (spouseOwned && (
        general?.filing_status !== FilingStatus.MFJ ||
        return1040.filing_status !== FilingStatus.MFJ
      ))
    ) {
      throw new Error("Schedule SE PDF proprietor must match the return");
    }
    const recipient = spouseOwned ? "S" : "T";
    return {
      ...fields,
      owner_recipient: recipient,
      line_a_form4361:
        clergyFor(allPending)?.scheduleSeLineA.has(recipient) === true
          ? true
          : undefined,
      owner_name: [first, typeof middle === "string" ? middle : "", last]
        .filter(Boolean).join(" "),
      owner_ssn: sourceSsn.replaceAll("-", ""),
      ...(fields.farm_optional_method_elected === true
        ? { net_profit_schedule_f: undefined }
        : {}),
      ...lines,
    };
  },
  instances(fields, filer, allPending) {
    const owned = allPending
      ? assertOwnedScheduleSE(allPending, taxYear, filer)
      : undefined;
    if (!owned) return [fields];
    const clergy = clergyFor(allPending);
    return owned.instances.map((row) => {
      const general = allPending!.general;
      const prefix = row.recipient === "S" ? "spouse" : "taxpayer";
      return {
        ...row,
        owner_recipient: row.recipient,
        line_a_form4361: clergy?.scheduleSeLineA.has(row.recipient) === true
          ? true
          : undefined,
        owner_ssn: row.owner_ssn,
        owner_name: [
          general[`${prefix}_first_name`],
          general[`${prefix}_middle_initial`],
          general[`${prefix}_last_name`],
        ].filter(Boolean).join(" "),
        ...(row.farm_optional_method_elected
          ? { net_profit_schedule_f: undefined }
          : {}),
      };
    });
  },
  // Expenses subtracted from ministerial earnings on line 2 need an attached
  // explanation (i1040sse 2025, Ministers; Pub 517, "Allowable deductions").
  async appendSupplementalPages(document, instance, _filer, allPending) {
    const owner = instance.owner_recipient === "S" ? "S" : "T";
    const text = clergyFor(allPending)?.scheduleSeExplanations.get(owner);
    if (text === undefined) return;
    const name = instance.owner_name;
    const ssn = instance.owner_ssn;
    if (typeof name !== "string" || typeof ssn !== "string") {
      throw new Error("Schedule SE ministerial explanation needs its owner");
    }
    const page = document.addPage([612, 792]);
    const font = await document.embedFont(StandardFonts.Helvetica);
    const bold = await document.embedFont(StandardFonts.HelveticaBold);
    page.drawText("Schedule SE (Form 1040) line 2 - ministerial earnings explanation", {
      x: 42,
      y: 748,
      font: bold,
      size: 12,
    });
    page.drawText(`${name} | SSN ${ssn} | Tax year ${taxYear}`, {
      x: 42,
      y: 724,
      font,
      size: 9,
    });
    wrapped(text).forEach((line, index) => {
      page.drawText(line, { x: 42, y: 696 - index * 14, font, size: 10 });
    });
  },
  // Schedule SE is filed only when self-employment tax was actually computed
  // (Schedule 2 line 4); W-2 social security wages alone do not require it.
  includeWhen: (_fields, all) =>
    (((all?.["schedule2"]?.["line4_se_tax"]) as number | undefined) ?? 0) > 0,
  };
}

export const scheduleSePdf: PdfFormDescriptor = scheduleSePdfFor(2025);
