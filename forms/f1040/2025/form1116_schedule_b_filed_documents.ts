import { PDFDocument, PDFForm } from "pdf-lib";
import { z } from "zod";
import {
  IncomeCategory,
  priorYearCarryoverSchema,
} from "../nodes/intermediate/forms/form_1116/index.ts";
import { assertForm1116CarryoverSource } from "./form1116_carryover_source.ts";

const documentSchema = z.object({
  source_document_id: z.string().trim().min(1),
  bytes: z.instanceof(Uint8Array).refine((bytes) =>
    bytes.length > 0 && bytes.length <= 60_000_000
  ),
  reviewed_sha256: z.string().regex(/^[a-f0-9]{64}$/),
  reviewed_by: z.string().trim().min(1),
  reviewed_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
}).strict();

export const form1116ScheduleBFiledDocumentReviewSchema = z.object({
  carryover_source: priorYearCarryoverSchema,
  filed_form1040: documentSchema,
  filed_schedule_b: documentSchema,
}).strict();

const form1040SsnField = "topmostSubform[0].Page1[0].f1_06[0]";
const scheduleBPrefix = "topmostSubform[0].Page1[0].";
const scheduleBYearField = `${scheduleBPrefix}Pg1Header[0].f1_01[0]`;
const scheduleBSsnField = `${scheduleBPrefix}f1_07[0]`;
const scheduleBCategoryFields = [
  `${scheduleBPrefix}CheckboxA-B_ReadOrder[0].c1_01[0]`,
  `${scheduleBPrefix}CheckboxA-B_ReadOrder[0].c1_01[1]`,
  `${scheduleBPrefix}CheckboxC-D_ReadOrder[0].c1_01[0]`,
  `${scheduleBPrefix}CheckboxC-D_ReadOrder[0].c1_01[1]`,
  `${scheduleBPrefix}CheckboxE-F_ReadOrder[0].c1_01[0]`,
  `${scheduleBPrefix}CheckboxE-F_ReadOrder[0].c1_01[1]`,
  `${scheduleBPrefix}c1_01[0]`,
] as const;
const scheduleBLine8Fields: Readonly<Record<number, string>> = {
  2015: "topmostSubform[0].Page1[0].Table_Page1[0].Line8[0].f1_107[0]",
  2016: "topmostSubform[0].Page1[0].Table_Page1[0].Line8[0].f1_108[0]",
  2017: "topmostSubform[0].Page1[0].Table_Page1[0].Line8[0].f1_109[0]",
  2018: "topmostSubform[0].Page1[0].Table_Page1[0].Line8[0].f1_110[0]",
  2019: "topmostSubform[0].Page1[0].Table_Page1[0].Line8[0].f1_111[0]",
  2020: "topmostSubform[0].Page2[0].Table_Page2[0].Line8[0].f2_98[0]",
  2021: "topmostSubform[0].Page2[0].Table_Page2[0].Line8[0].f2_99[0]",
  2022: "topmostSubform[0].Page2[0].Table_Page2[0].Line8[0].f2_100[0]",
  2023: "topmostSubform[0].Page2[0].Table_Page2[0].Line8[0].f2_101[0]",
  2024: "topmostSubform[0].Page2[0].Table_Page2[0].Line8[0].f2_102[0]",
};
const scheduleBTotalField =
  "topmostSubform[0].Page2[0].Table_Page2[0].Line8[0].f2_103[0]";

function digits(value: string): string {
  return value.replaceAll(/\D/g, "");
}

function textField(form: PDFForm, name: string, role: string): string {
  try {
    return form.getTextField(name).getText()?.trim() ?? "";
  } catch {
    throw new Error(
      `Form 1116 filed ${role} needs readable ${name} AcroForm field`,
    );
  }
}

function amountField(form: PDFForm, name: string): number {
  const printed = textField(form, name, "Schedule B");
  if (!printed) return 0;
  const normalized = printed.replaceAll(",", "").replaceAll("$", "");
  if (!/^\d+(?:\.00)?$/.test(normalized)) {
    throw new Error(
      `Form 1116 filed Schedule B has invalid line 8 amount in ${name}`,
    );
  }
  return Number(normalized);
}

async function reviewedPdf(
  document: z.infer<typeof documentSchema>,
  role: string,
): Promise<{ form: PDFForm; sha256: string }> {
  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", document.bytes),
  );
  const sha256 = Array.from(
    digest,
    (byte) => byte.toString(16).padStart(2, "0"),
  )
    .join("");
  if (sha256 !== document.reviewed_sha256) {
    throw new Error(
      `Form 1116 filed ${role} bytes differ from reviewed SHA-256`,
    );
  }
  let pdf: PDFDocument;
  try {
    pdf = await PDFDocument.load(document.bytes);
  } catch {
    throw new Error(
      `Form 1116 filed ${role} needs a readable, unencrypted PDF`,
    );
  }
  if (pdf.getPageCount() !== 2) {
    throw new Error(`Form 1116 filed ${role} needs a two-page AcroForm PDF`);
  }
  return { form: pdf.getForm(), sha256 };
}

/** Verify reviewed PDF bytes and their AcroForm values; this is not IRS acceptance. */
export async function reviewForm1116ScheduleBFiledDocuments(
  raw: z.infer<typeof form1116ScheduleBFiledDocumentReviewSchema>,
  currentFilerSsn: string,
) {
  const input = form1116ScheduleBFiledDocumentReviewSchema.parse(raw);
  const source = input.carryover_source;
  const filed = source.filed_2024_schedule_b;
  const currentOwner = digits(currentFilerSsn);
  assertForm1116CarryoverSource({
    general: { taxpayer_ssn: currentOwner },
    form1116_prior_carryover: { carryovers: [source] },
  }, source);
  if (
    !filed || !/^\d{9}$/.test(currentOwner) ||
    digits(filed.taxpayer_ssn) !== currentOwner ||
    input.filed_form1040.source_document_id !==
      filed.form1040_source_document_id ||
    input.filed_schedule_b.source_document_id !==
      filed.schedule_b_source_document_id ||
    input.filed_form1040.source_document_id ===
      input.filed_schedule_b.source_document_id ||
    !source.source_document_references.includes(
      input.filed_form1040.source_document_id,
    ) ||
    !source.source_document_references.includes(
      input.filed_schedule_b.source_document_id,
    )
  ) {
    throw new Error(
      "Form 1116 filed PDF identities differ from the retained carryover source",
    );
  }
  const form1040 = await reviewedPdf(input.filed_form1040, "Form 1040");
  const scheduleB = await reviewedPdf(input.filed_schedule_b, "Schedule B");
  if (
    digits(textField(form1040.form, form1040SsnField, "Form 1040")) !==
      currentOwner ||
    digits(textField(scheduleB.form, scheduleBSsnField, "Schedule B")) !==
      currentOwner ||
    textField(scheduleB.form, scheduleBYearField, "Schedule B") !== "24" ||
    ["02", "03", "04", "05"].some((suffix) =>
      textField(
        scheduleB.form,
        `${scheduleBPrefix}Pg1Header[0].f1_${suffix}[0]`,
        "Schedule B",
      ) !== ""
    )
  ) {
    throw new Error(
      "Form 1116 filed PDF year or taxpayer differs from the carryover source",
    );
  }
  let checked: boolean[];
  try {
    checked = scheduleBCategoryFields.map((field) =>
      scheduleB.form.getCheckBox(field).isChecked()
    );
  } catch {
    throw new Error(
      "Form 1116 filed Schedule B needs readable income-category boxes",
    );
  }
  const expectedCategoryIndex =
    source.income_category === IncomeCategory.Passive
      ? 2
      : source.income_category === IncomeCategory.General
      ? 3
      : -1;
  if (checked.filter(Boolean).length !== 1 || !checked[expectedCategoryIndex]) {
    throw new Error(
      "Form 1116 filed Schedule B category differs from the carryover source",
    );
  }
  const expected = new Map(source.vintages.map((vintage) => [
    vintage.vintage_tax_year,
    vintage.prior_year_schedule_b_line8_vintage_amount,
  ]));
  for (const [year, fieldName] of Object.entries(scheduleBLine8Fields)) {
    if (
      amountField(scheduleB.form, fieldName) !==
        (expected.get(Number(year)) ?? 0)
    ) {
      throw new Error(
        `Form 1116 filed Schedule B line 8 ${year} differs from the carryover source`,
      );
    }
  }
  if (
    amountField(scheduleB.form, scheduleBTotalField) !==
      source.prior_year_schedule_b_line8_total
  ) {
    throw new Error(
      "Form 1116 filed Schedule B line 8 total differs from the carryover source",
    );
  }
  return {
    reviewed_form1040_document_id: input.filed_form1040.source_document_id,
    reviewed_form1040_sha256: form1040.sha256,
    form1040_reviewed_by: input.filed_form1040.reviewed_by,
    form1040_reviewed_on: input.filed_form1040.reviewed_on,
    reviewed_schedule_b_document_id: input.filed_schedule_b.source_document_id,
    reviewed_schedule_b_sha256: scheduleB.sha256,
    schedule_b_reviewed_by: input.filed_schedule_b.reviewed_by,
    schedule_b_reviewed_on: input.filed_schedule_b.reviewed_on,
    taxpayer_ssn: currentOwner,
    income_category: source.income_category,
    line8_total: source.prior_year_schedule_b_line8_total,
    export_ready: false as const,
  };
}
