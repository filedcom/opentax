import { PDFDocument, StandardFonts } from "pdf-lib";
import { z } from "zod";
import type { PdfFieldEntry } from "../../pdf/form-descriptor.ts";
import {
  DependentCreditCategory,
  dependentFilingSchema,
} from "../../nodes/inputs/general/index.ts";
import { irs1040Pdf2026 } from "./forms/f1040.ts";

const pinnedDraft = new URL(
  "../../../../docs/ty2026/corpus/draft/f1040.pdf",
  import.meta.url,
);
const pinnedDraftSha256 =
  "e044e765ace334c76bda7910bd3193fc813c7789d06340124359b885c98d58d0";

const dependentsSchema = z.array(dependentFilingSchema);
type Dependent = z.infer<typeof dependentFilingSchema>;

function number(fields: Record<string, unknown>, key: string): number {
  const value = fields[key];
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new Error(`TY2026 Form 1040 PDF needs ${key}`);
  }
  return value;
}

function dependents(fields: Record<string, unknown>): Dependent[] {
  const count = number(fields, "dependent_count");
  const details = dependentsSchema.parse(fields.dependent_details ?? []);
  if (
    details.length !== count ||
    details.filter((dep) =>
        dep.credit_category === DependentCreditCategory.ChildTaxCredit
      ).length !== number(fields, "qualifying_child_tax_credit_count") ||
    details.filter((dep) =>
        dep.credit_category === DependentCreditCategory.OtherDependentCredit
      ).length !== number(fields, "other_dependent_count")
  ) {
    throw new Error(
      "TY2026 Form 1040 dependent rows and credit counts disagree",
    );
  }
  for (const dep of details) {
    if (
      !dep.first_name.trim() || !dep.last_name.trim() ||
      !(dep.ssn || dep.itin || dep.atin) ||
      dep.lived_in_us_over_half_year === undefined
    ) {
      throw new Error("TY2026 Form 1040 PDF needs complete dependent rows");
    }
  }
  return details;
}

function relationship(dep: Dependent): string {
  return dep.irs_relationship_code ??
    dep.relationship.replaceAll("_", " ").toUpperCase();
}

function fillDependentRows(
  form: ReturnType<PDFDocument["getForm"]>,
  details: readonly Dependent[],
): void {
  const root = "topmostSubform[0].Page1[0].";
  if (details.length > 4) {
    form.getCheckBox(`${root}Dependents_ReadOrder[0].c1_13[0]`).check();
  }
  for (const [index, dep] of details.slice(0, 4).entries()) {
    for (
      const [rowIndex, value] of [
        dep.first_name,
        dep.last_name,
        dep.ssn ?? dep.itin ?? dep.atin,
        relationship(dep),
      ].entries()
    ) {
      const row = `${root}Table_Dependents[0].Row${rowIndex + 1}[0].`;
      form.getTextField(`${row}f1_${31 + 4 * rowIndex + index}[0]`).setText(
        value!,
      );
    }
    const lived = `${root}Table_Dependents[0].Row5[0].Dependent${
      index + 1
    }[0].`;
    if (dep.months_in_home > 6) {
      form.getCheckBox(`${lived}c1_${14 + 2 * index}[0]`).check();
    }
    if (dep.lived_in_us_over_half_year) {
      form.getCheckBox(`${lived}c1_${15 + 2 * index}[0]`).check();
    }
    const student = `${root}Table_Dependents[0].Row6[0].Dependent${
      index + 1
    }[0].`;
    if (dep.full_time_student) {
      form.getCheckBox(`${student}c1_${22 + 2 * index}[0]`).check();
    }
    if (dep.disabled) {
      form.getCheckBox(`${student}c1_${23 + 2 * index}[0]`).check();
    }
    const credit = `${root}Table_Dependents[0].Row7[0].Dependent${
      index + 1
    }[0].`;
    if (dep.credit_category !== DependentCreditCategory.None) {
      const choice = dep.credit_category ===
          DependentCreditCategory.ChildTaxCredit
        ? 0
        : 1;
      form.getCheckBox(`${credit}c1_${30 + index}[${choice}]`).check();
    }
  }
}

async function appendDependentStatements(
  document: PDFDocument,
  fields: Record<string, unknown>,
  details: readonly Dependent[],
): Promise<void> {
  if (details.length <= 4) return;
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const remaining = details.slice(4);
  const perPage = 25;
  for (
    let pageNumber = 0;
    pageNumber < Math.ceil(remaining.length / perPage);
    pageNumber++
  ) {
    const page = document.addPage([612, 792]);
    page.drawText("Form 1040 (2026) - Additional Dependents", {
      x: 36,
      y: 752,
      size: 12,
      font: bold,
    });
    page.drawText(
      `Page ${pageNumber + 1} of ${Math.ceil(remaining.length / perPage)}`,
      { x: 505, y: 752, size: 8, font: regular },
    );
    page.drawText(
      `Name: ${String(fields.taxpayer_first_name ?? "")} ${
        String(fields.taxpayer_last_name ?? "")
      }`,
      { x: 36, y: 734, size: 9, font: regular },
    );
    page.drawText(`SSN: ${String(fields.taxpayer_ssn ?? "")}`, {
      x: 36,
      y: 719,
      size: 9,
      font: regular,
    });
    page.drawText("Name / TIN", { x: 36, y: 692, size: 8, font: bold });
    page.drawText("Relationship", { x: 195, y: 692, size: 8, font: bold });
    page.drawText("Home / U.S.", { x: 288, y: 692, size: 8, font: bold });
    page.drawText("Student / Disabled", {
      x: 377,
      y: 692,
      size: 8,
      font: bold,
    });
    page.drawText("Credit", { x: 510, y: 692, size: 8, font: bold });
    for (
      const [index, dep] of remaining.slice(
        pageNumber * perPage,
        (pageNumber + 1) * perPage,
      ).entries()
    ) {
      const y = 670 - 25 * index;
      const values = [
        `${dep.first_name} ${dep.last_name}\n${
          dep.ssn ?? dep.itin ?? dep.atin
        }`,
        relationship(dep),
        `${dep.months_in_home > 6 ? "Yes" : "No"} / ${
          dep.lived_in_us_over_half_year ? "Yes" : "No"
        }`,
        `${dep.full_time_student ? "Yes" : "No"} / ${
          dep.disabled ? "Yes" : "No"
        }`,
        dep.credit_category.toUpperCase(),
      ];
      const xs = [36, 195, 288, 377, 510];
      const widths = [152, 86, 82, 125, 60];
      for (const [column, value] of values.entries()) {
        const lines = value.split("\n");
        for (const [lineIndex, line] of lines.entries()) {
          const size = Math.min(
            8,
            8 * widths[column] /
              Math.max(1, regular.widthOfTextAtSize(line, 8)),
          );
          if (size < 6) {
            throw new Error(
              "TY2026 dependent statement text exceeds its column",
            );
          }
          page.drawText(line, {
            x: xs[column],
            y: y - 10 * lineIndex,
            size,
            font: regular,
          });
        }
      }
      page.drawLine({
        start: { x: 36, y: y - 16 },
        end: { x: 576, y: y - 16 },
        thickness: 0.25,
      });
    }
  }
}

function fillField(
  form: ReturnType<PDFDocument["getForm"]>,
  entry: PdfFieldEntry,
  value: unknown,
): void {
  if (value === undefined || value === null) return;
  if (entry.kind === "text") {
    if (
      typeof value === "number" && Math.round(value) === 0 && !entry.printZero
    ) {
      return;
    }
    const text = typeof value === "number"
      ? Math.round(value).toString()
      : String(value);
    form.getTextField(entry.pdfField).setText(text);
  } else if (entry.kind === "checkbox") {
    if (value === true) form.getCheckBox(entry.pdfField).check();
  } else if (entry.kind === "checkboxWhen") {
    if (String(value) === entry.whenValue) {
      form.getCheckBox(entry.pdfField).check();
    }
  } else if (entry.kind === "radio") {
    const selected = entry.valueMap[String(value)];
    if (selected !== undefined) {
      form.getRadioGroup(entry.pdfField).select(selected);
    }
  }
}

/** Fill the pinned TY2026 draft Form 1040; this is one component of the future PDF bundle. */
export async function buildF1040PdfBytes2026(
  rawFields: Record<string, unknown>,
): Promise<Uint8Array> {
  const fields = irs1040Pdf2026.projectFields!(rawFields, { f1040: rawFields });
  const dependentRows = dependents(fields);
  const source = await Deno.readFile(pinnedDraft);
  const hash = [
    ...new Uint8Array(await crypto.subtle.digest("SHA-256", source)),
  ]
    .map((byte) => byte.toString(16).padStart(2, "0")).join("");
  if (hash !== pinnedDraftSha256) {
    throw new Error("Pinned TY2026 draft Form 1040 hash changed");
  }
  const filled = await PDFDocument.load(source, { ignoreEncryption: true });
  const form = filled.getForm();
  for (const entry of irs1040Pdf2026.fields) {
    fillField(form, entry, fields[entry.domainKey]);
  }
  fillDependentRows(form, dependentRows);
  const font = await filled.embedFont(StandardFonts.Helvetica);
  form.updateFieldAppearances(font);
  form.flatten();

  const document = await PDFDocument.create();
  const pages = await document.copyPages(
    filled,
    [...irs1040Pdf2026.pageIndices!(fields)],
  );
  for (const page of pages) document.addPage(page);
  await appendDependentStatements(document, fields, dependentRows);
  return document.save();
}
