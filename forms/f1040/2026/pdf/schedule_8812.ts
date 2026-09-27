import { PDFDocument, StandardFonts } from "pdf-lib";
import type { PdfFieldEntry } from "../../pdf/form-descriptor.ts";
import { irsSchedule8812Pdf2026 } from "./forms/schedule_8812.ts";

const pinnedDraft = new URL(
  "../../../../docs/ty2026/corpus/draft/f1040s8.pdf",
  import.meta.url,
);
const pinnedDraftSha256 =
  "0638b2863bdaeadfd3fccee12a9145bf92a442d8de156584c5602cc7e3881422";

type Filer = { name: string; ssn: string };

function amount(fields: Record<string, unknown>, key: string): number {
  const value = fields[key];
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`TY2026 Schedule 8812 PDF needs ${key}`);
  }
  return value;
}

function signedAmount(fields: Record<string, unknown>, key: string): number {
  const value = fields[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`TY2026 Schedule 8812 PDF needs ${key}`);
  }
  return value;
}

function validate(
  schedule: Record<string, unknown>,
  f1040: Record<string, unknown>,
  filer: Filer,
): void {
  if (!filer.name.trim() || !filer.ssn.trim()) {
    throw new Error("TY2026 Schedule 8812 PDF needs filer name and SSN");
  }
  if (
    signedAmount(schedule, "line1") !==
      signedAmount(f1040, "line11b_agi") ||
    amount(schedule, "line4") !==
      amount(f1040, "qualifying_child_tax_credit_count") ||
    amount(schedule, "line6") !== amount(f1040, "other_dependent_count") ||
    amount(schedule, "line14") !== amount(f1040, "line19_child_tax_credit") ||
    amount(schedule, "line27") !== amount(f1040, "line28_actc") ||
    amount(schedule, "line13") >
      amount(f1040, "line18_total_tax_before_credits")
  ) {
    throw new Error("TY2026 Schedule 8812 PDF disagrees with Form 1040");
  }
  if (
    amount(schedule, "line12") !== Math.max(
        0,
        amount(schedule, "line8") - amount(schedule, "line11"),
      ) ||
    amount(schedule, "line14") !==
      Math.min(amount(schedule, "line12"), amount(schedule, "line13")) ||
    amount(schedule, "line27") > amount(schedule, "line17")
  ) {
    throw new Error("TY2026 Schedule 8812 PDF lines do not reconcile");
  }
  if (schedule.needsPartIIB === true && !schedule.partIIBLines) {
    throw new Error("TY2026 Schedule 8812 PDF needs Part II-B lines");
  }
}

function fillField(
  form: ReturnType<PDFDocument["getForm"]>,
  entry: PdfFieldEntry,
  value: unknown,
): void {
  if (entry.kind !== "text" || value === undefined || value === null) return;
  if (typeof value === "number" && value === 0 && !entry.printZero) return;
  form.getTextField(entry.pdfField).setText(
    typeof value === "number" ? String(Math.round(value)) : String(value),
  );
}

export async function buildSchedule8812PdfBytes2026(
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
    throw new Error("Pinned TY2026 draft Schedule 8812 hash changed");
  }
  const draft = await PDFDocument.load(source, { ignoreEncryption: true });
  const form = draft.getForm();
  const partIIB = schedule.partIIBLines as Record<string, unknown> | null;
  const values: Record<string, unknown> = {
    ...schedule,
    filer_name: filer.name,
    filer_ssn: filer.ssn,
    ...Object.fromEntries(
      [21, 22, 23, 24, 25, 26].map((line) => [
        `part_iib_line${line}`,
        partIIB?.[`line${line}`],
      ]),
    ),
  };
  for (const entry of irsSchedule8812Pdf2026.fields) {
    if (
      amount(schedule, "line16a") === 0 &&
      entry.pdfField.includes("Page2[0]") &&
      entry.domainKey !== "line16a"
    ) continue;
    fillField(form, entry, values[entry.domainKey]);
  }
  if (amount(schedule, "line12") > 0) {
    form.getCheckBox("topmostSubform[0].Page1[0].c1_1[1]").check();
  } else {
    form.getCheckBox("topmostSubform[0].Page1[0].c1_1[0]").check();
  }
  if (amount(schedule, "line17") > 0) {
    form.getCheckBox(
      `topmostSubform[0].Page2[0].c2_1[${
        amount(schedule, "line18a") > 2_500 ? 1 : 0
      }]`,
    ).check();
    form.getCheckBox(
      `topmostSubform[0].Page2[0].c2_2[${
        amount(schedule, "line16b") >= 5_100 ? 1 : 0
      }]`,
    ).check();
  }
  const font = await draft.embedFont(StandardFonts.Helvetica);
  form.updateFieldAppearances(font);
  form.flatten();
  const document = await PDFDocument.create();
  const pages = await document.copyPages(draft, [0, 1]);
  for (const page of pages) document.addPage(page);
  return document.save();
}
