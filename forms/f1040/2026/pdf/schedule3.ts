import { PDFDocument, StandardFonts } from "pdf-lib";
import type { PdfFieldEntry } from "../../pdf/form-descriptor.ts";
import { irsSchedule3Pdf2026 } from "./forms/schedule3.ts";

const pinnedDraft = new URL(
  "../../../../docs/ty2026/corpus/draft/f1040s3.pdf",
  import.meta.url,
);
const pinnedDraftSha256 =
  "5feb6f8d0f08191a2da153573d195fc354f385e26915b99b57d4588893b7cef0";

type Filer = { name: string; ssn: string };

function amount(fields: Record<string, unknown>, key: string): number {
  const value = fields[key];
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`TY2026 Schedule 3 PDF needs ${key}`);
  }
  return value;
}

function optionalAmount(fields: Record<string, unknown>, key: string): number {
  return fields[key] === undefined ? 0 : amount(fields, key);
}

function validate(
  schedule: Record<string, unknown>,
  f1040: Record<string, unknown>,
  filer: Filer,
): void {
  if (!filer.name.trim() || !filer.ssn.trim()) {
    throw new Error("TY2026 Schedule 3 PDF needs filer name and SSN");
  }
  if (
    amount(schedule, "line8_total") !==
      optionalAmount(f1040, "line20_nonrefundable_credits") ||
    amount(schedule, "line15_total") !==
      optionalAmount(f1040, "line31_other_payments") ||
    amount(schedule, "line7_total") !== [
        "line6a_total",
        "line6b_prior_year_min_tax_credit",
        "line6c_adoption_credit",
        "line6d_elderly_disabled_credit",
        "line6f_total",
        "line6g_mortgage_interest_credit",
        "line6h_dc_homebuyer_credit",
        "line6i_qualified_electric_vehicle_credit",
        "line6j_alt_fuel_vehicle_refueling",
        "line6k_tax_credit_bonds",
        "line6l_form8978_credit",
        "line6m_total",
        "line6z_other_nonrefundable",
      ].reduce((total, key) => total + optionalAmount(schedule, key), 0) ||
    amount(schedule, "line8_total") !==
      [
        "line1_total",
        "line2_childcare_credit",
        "line3_education_credit",
        "line4_retirement_savings_credit",
        "line5a_residential_clean_energy",
        "line7_total",
      ].reduce((total, key) => total + optionalAmount(schedule, key), 0) ||
    amount(schedule, "line15_total") !==
      [
        "line9_premium_tax_credit",
        "line10_amount_paid_extension",
        "line11_excess_ss",
        "line12_fuel_tax_credit",
        "line14_total",
      ]
        .reduce((total, key) => total + optionalAmount(schedule, key), 0)
  ) {
    throw new Error("TY2026 Schedule 3 PDF lines disagree with Form 1040");
  }
  if (schedule.line5b_energy_efficient_home !== undefined) {
    throw new Error("TY2026 Schedule 3 line 5b is reserved");
  }
}

function fillField(
  form: ReturnType<PDFDocument["getForm"]>,
  entry: PdfFieldEntry,
  value: unknown,
): void {
  if (entry.kind !== "text" || value === undefined || value === null) return;
  if (typeof value === "number" && Math.round(value) === 0) return;
  form.getTextField(entry.pdfField).setText(
    typeof value === "number" ? String(Math.round(value)) : String(value),
  );
}

export async function buildSchedule3PdfBytes2026(
  schedule: Record<string, unknown>,
  f1040: Record<string, unknown>,
  filer: Filer,
): Promise<Uint8Array> {
  validate(schedule, f1040, filer);
  const source = await Deno.readFile(pinnedDraft);
  const hash = [
    ...new Uint8Array(await crypto.subtle.digest("SHA-256", source)),
  ]
    .map((byte) => byte.toString(16).padStart(2, "0")).join("");
  if (hash !== pinnedDraftSha256) {
    throw new Error("Pinned TY2026 draft Schedule 3 hash changed");
  }
  const draft = await PDFDocument.load(source, { ignoreEncryption: true });
  const form = draft.getForm();
  const fields: Record<string, unknown> = {
    ...schedule,
    filer_name: filer.name,
    filer_ssn: filer.ssn,
  };
  for (const entry of irsSchedule3Pdf2026.fields) {
    fillField(form, entry, fields[entry.domainKey]);
  }
  const font = await draft.embedFont(StandardFonts.Helvetica);
  form.updateFieldAppearances(font);
  form.flatten();
  const document = await PDFDocument.create();
  const pages = await document.copyPages(draft, [1]);
  for (const page of pages) document.addPage(page);
  return document.save();
}
