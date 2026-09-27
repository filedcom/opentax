import { PDFDocument, StandardFonts } from "pdf-lib";
import {
  calculateScheduleH2026,
  scheduleHInput2026Schema,
} from "../nodes/schedule_h.ts";

const pinnedDraft = new URL(
  "../../../../docs/ty2026/corpus/draft/f1040sh.pdf",
  import.meta.url,
);
const pinnedDraftSha256 =
  "0fbdf600ded379d23f381286a3f9b35d15af062c83072b50de149d5c5afb3077";
const page1 = "topmostSubform[0].Page1[0].";
const page2 = "topmostSubform[0].Page2[0].";

type Filer = { name: string; ssn: string };

function fill(
  form: ReturnType<PDFDocument["getForm"]>,
  name: string,
  value: unknown,
): void {
  if (value === undefined || value === null || value === "") return;
  if (typeof value === "number" && Math.round(value) === 0) return;
  form.getTextField(name).setText(
    typeof value === "number" ? String(Math.round(value)) : String(value),
  );
}

function check(
  form: ReturnType<PDFDocument["getForm"]>,
  prefix: string,
  answer: boolean | undefined,
): void {
  if (answer === undefined) return;
  form.getCheckBox(`${prefix}[${answer ? 0 : 1}]`).check();
}

/** Fill both printed pages of the pinned TY2026 Schedule H draft. */
export async function buildScheduleHPdfBytes2026(
  rawFields: Record<string, unknown>,
  schedule2: Record<string, unknown>,
  filer: Filer,
): Promise<Uint8Array> {
  if (!filer.name.trim() || !/^\d{9}$/.test(filer.ssn.replaceAll("-", ""))) {
    throw new Error("TY2026 Schedule H PDF needs filer name and SSN");
  }
  const rawInput = Object.fromEntries(
    Object.keys(scheduleHInput2026Schema.shape).map((
      key,
    ) => [key, rawFields[key]]),
  );
  const lines = calculateScheduleH2026(
    scheduleHInput2026Schema.parse(rawInput),
  );
  for (
    const key of [
      "line2_ss_tax",
      "line4_medicare_tax",
      "line6_additional_medicare_tax",
      "line8_fica_and_withholding",
      "line15_futa_wages",
      "line16_futa_tax",
      "line25_fica_to_total",
      "line26_total_household_tax",
      "total_tax",
    ] as const
  ) {
    if (rawFields[key] !== lines[key]) {
      throw new Error(`TY2026 Schedule H PDF ${key} does not reconcile`);
    }
  }
  if (schedule2.line17a_household_employment_tax !== lines.total_tax) {
    throw new Error("TY2026 Schedule H PDF disagrees with Schedule 2 line 17a");
  }
  const source = await Deno.readFile(pinnedDraft);
  const hash = [
    ...new Uint8Array(await crypto.subtle.digest("SHA-256", source)),
  ]
    .map((byte) => byte.toString(16).padStart(2, "0")).join("");
  if (hash !== pinnedDraftSha256) {
    throw new Error("Pinned TY2026 draft Schedule H hash changed");
  }
  const draft = await PDFDocument.load(source, { ignoreEncryption: true });
  const form = draft.getForm();
  fill(form, `${page1}f1_1[0]`, filer.name);
  fill(form, `${page1}f1_2[0]`, filer.ssn);
  fill(form, `${page1}CombField[0].f1_3[0]`, lines.employer_ein);
  check(form, `${page1}c1_1`, lines.line_a_any_employee_3000);
  check(form, `${page1}c1_2`, lines.line_b_withheld_income_tax);
  check(form, `${page1}c1_3`, lines.line_c_futa_quarter);
  const part1 = [
    lines.line1_ss_wages,
    lines.line2_ss_tax,
    lines.line3_medicare_wages,
    lines.line4_medicare_tax,
    lines.line5_additional_medicare_wages,
    lines.line6_additional_medicare_tax,
    lines.line7_income_tax_withheld,
    lines.line8_fica_and_withholding,
  ];
  part1.forEach((value, index) =>
    fill(form, `${page1}f1_${index + 4}[0]`, value)
  );
  check(form, `${page1}c1_4`, lines.line9_futa_quarter);
  if (lines.futa) {
    check(form, `${page2}Line10[0].c2_1`, lines.futa.line10_one_state);
    check(form, `${page2}c2_2`, lines.futa.line11_contributions_timely);
    check(form, `${page2}c2_3`, lines.futa.line12_all_wages_state_taxable);
    fill(form, `${page2}f2_1[0]`, lines.futa.line13_state);
    fill(form, `${page2}f2_2[0]`, lines.futa.line14_contributions);
    fill(form, `${page2}f2_3[0]`, lines.line15_futa_wages);
    fill(form, `${page2}f2_4[0]`, lines.line16_futa_tax);
    form.getTextField(`${page2}f2_31[0]`).setText(
      String(Math.round(lines.line25_fica_to_total!)),
    );
    fill(form, `${page2}f2_32[0]`, lines.line26_total_household_tax);
    form.getCheckBox(`${page2}c2_5[0]`).check();
  }
  form.updateFieldAppearances(await draft.embedFont(StandardFonts.Helvetica));
  form.flatten();
  const document = await PDFDocument.create();
  for (const pdfPage of await document.copyPages(draft, [1, 2])) {
    document.addPage(pdfPage);
  }
  return document.save();
}
