import { PDFCheckBox, PDFDocument, PDFTextField } from "pdf-lib";
import {
  type Form8908Source,
  form8908SourceSchema,
} from "../../form8908_source.ts";

function normalize(value: string): string {
  return value.trim().replace(/\s+/g, " ").toUpperCase();
}

function digits(value: string): string {
  return value.replace(/\D/g, "");
}

function formDate(iso: string): string {
  return `${iso.slice(5, 7)}/${iso.slice(8, 10)}/${iso.slice(0, 4)}`;
}

/** Inspect the AcroForm values in the exact PDF intended for BinaryAttachment. */
export async function assertForm8908Form7220PdfContents(
  raw: Form8908Source,
  acquisitionRecordReference: string,
  pdfBytes: Uint8Array,
): Promise<void> {
  const source = form8908SourceSchema.parse(raw);
  const home = source.homes.find((candidate) =>
    candidate.acquisition_record_reference === acquisitionRecordReference
  );
  if (!home?.form7220) {
    throw new Error("Form 8908 Form 7220 PDF has no matching PWA residence");
  }
  const digest = Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", Uint8Array.from(pdfBytes)),
    ),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
  if (digest !== home.form7220.pdf_sha256) {
    throw new Error(
      "Form 8908 Form 7220 PDF differs from reviewed exact bytes",
    );
  }
  const reviewed = home.form7220.reviewed_record;
  let pdf: PDFDocument;
  try {
    pdf = await PDFDocument.load(pdfBytes);
  } catch {
    throw new Error("Form 8908 Form 7220 attachment is not a readable PDF");
  }
  if (pdf.getPageCount() !== 5) {
    throw new Error(
      "Form 8908 Form 7220 attachment needs all five official pages",
    );
  }
  const form = pdf.getForm();
  const prefix = "topmostSubform[0].Page1[0].";
  const field = (name: string): string => {
    try {
      return form.getTextField(name).getText() ?? "";
    } catch {
      throw new Error(`Form 8908 Form 7220 unreadable field ${name}`);
    }
  };
  const checked = (name: string): boolean => {
    try {
      return form.getCheckBox(name).isChecked();
    } catch {
      throw new Error(`Form 8908 Form 7220 unreadable mark ${name}`);
    }
  };
  const expectText = (name: string, expected: string) => {
    if (normalize(field(name)) !== normalize(expected)) {
      throw new Error(
        `Form 8908 Form 7220 ${name} differs from reviewed source`,
      );
    }
  };
  const expectTin = (name: string, expected: string) => {
    if (digits(field(name)) !== digits(expected)) {
      throw new Error(
        `Form 8908 Form 7220 ${name} differs from reviewed taxpayer/employer`,
      );
    }
  };
  const expectAmount = (name: string, expected: number) => {
    const actual = Number(field(name).replace(/[$,\s]/g, ""));
    if (
      field(name).trim() === "" || !Number.isFinite(actual) ||
      actual !== expected
    ) {
      throw new Error(
        `Form 8908 Form 7220 ${name} differs from reviewed wages`,
      );
    }
  };
  const expectMark = (name: string, expected: boolean) => {
    if (checked(name) !== expected) {
      throw new Error(`Form 8908 Form 7220 ${name} differs from reviewed mark`);
    }
  };
  expectText(`${prefix}f1_1[0]`, reviewed.taxpayer_name);
  expectTin(`${prefix}f1_2[0]`, reviewed.taxpayer_tin);
  expectText(`${prefix}f1_4[0]`, reviewed.facility_description);
  expectText(
    `${prefix}f1_5[0]`,
    `${home.street}${home.unit ? ` ${home.unit}` : ""}`,
  );
  expectText(`${prefix}f1_6[0]`, `${home.city}, ${home.state} ${home.zip}`);
  expectText(`${prefix}f1_13[0]`, formDate(reviewed.construction_began_on));
  expectText(`${prefix}f1_14[0]`, formDate(home.acquired_on));
  // Lines 5–10: current-year acquisition, Form 8908, PLA, no corrections,
  // apprenticeship exception, and no later alterations/repairs.
  const marks: readonly [string, readonly boolean[]][] = [
    ["c1_1", [true, false]],
    ["c1_2", Array.from({ length: 12 }, (_, index) => index === 9)],
    ["c1_3", [
      reviewed.project_labor_agreement,
      !reviewed.project_labor_agreement,
    ]],
    ["c1_4", [false, true]],
    ["c1_5", [false, false, true]],
    ["c1_6", [false, true]],
  ];
  for (const [group, values] of marks) {
    values.forEach((value, index) =>
      expectMark(`${prefix}${group}[${index}]`, value)
    );
  }
  for (let row = 1; row <= 18; row++) {
    const base = `topmostSubform[0].Page2[0].Table_PartII[0].Line${row}[0].`;
    const wage = reviewed.wage_rows[row - 1];
    for (let column = 0; column < 8; column++) {
      const name = `${base}f2_${(row - 1) * 8 + column + 1}[0]`;
      if (!wage) {
        if (field(name).trim() !== "") {
          throw new Error("Form 8908 Form 7220 has an unreviewed wage row");
        }
        continue;
      }
      if (column === 0) expectText(name, wage.employer_name);
      if (column === 1) expectTin(name, wage.employer_ein);
      if (column === 2) expectText(name, wage.work_classification);
      if (column === 3) expectAmount(name, wage.laborers_and_mechanics);
      if (column === 4) expectAmount(name, wage.hours_worked);
      if (column === 5) expectAmount(name, wage.hourly_wages_paid);
      if (column === 6) expectAmount(name, wage.fringe_benefits_paid);
      if (column === 7) {
        expectAmount(name, wage.hourly_wages_paid + wage.fringe_benefits_paid);
      }
    }
  }
  for (let index = 145; index <= 149; index++) {
    if (field(`topmostSubform[0].Page2[0].f2_${index}[0]`).trim() !== "") {
      throw new Error(
        "Form 8908 Form 7220 has an unreviewed Part II continuation",
      );
    }
  }
  const total = (
    key:
      | "laborers_and_mechanics"
      | "hours_worked"
      | "hourly_wages_paid"
      | "fringe_benefits_paid",
  ) => reviewed.wage_rows.reduce((sum, wage) => sum + Number(wage[key]), 0);
  const totals = [
    total("laborers_and_mechanics"),
    total("hours_worked"),
    total("hourly_wages_paid"),
    total("fringe_benefits_paid"),
    total("hourly_wages_paid") + total("fringe_benefits_paid"),
  ];
  totals.forEach((value, index) =>
    expectAmount(`topmostSubform[0].Page2[0].f2_${150 + index}[0]`, value)
  );
  for (const extra of form.getFields()) {
    if (!/\.Page[345]\[0\]\./.test(extra.getName())) continue;
    if (extra instanceof PDFTextField && extra.getText()?.trim()) {
      throw new Error(
        "Form 8908 Form 7220 has unreviewed apprenticeship/correction data",
      );
    }
    if (extra instanceof PDFCheckBox && extra.isChecked()) {
      throw new Error(
        "Form 8908 Form 7220 has unreviewed apprenticeship/correction marks",
      );
    }
  }
  // The Form 7220 template has no signature field. The line-10 statement is
  // separate evidence and must be authenticated before this route opens.
}
