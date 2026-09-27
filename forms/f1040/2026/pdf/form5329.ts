import { PDFDocument, StandardFonts } from "pdf-lib";
import { calculateForm5329PartI2026 } from "../nodes/form5329.ts";

const pinnedDraft = new URL(
  "../../../../docs/ty2026/corpus/draft/f5329.pdf",
  import.meta.url,
);
const pinnedDraftSha256 =
  "f8822ccc8d14eca9424255d3b9606a8c210143ad8a317018f50222d03740edbe";
const page1 = "topmostSubform[0].Page1[0].";

function amount(fields: Record<string, unknown>, key: string): number {
  const value = fields[key];
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`TY2026 Form 5329 PDF needs ${key}`);
  }
  return value;
}

/** Fill the pinned three-page TY2026 draft for a Part I early SIMPLE IRA tax. */
export async function buildForm5329PdfBytes2026(
  fields: Record<string, unknown>,
  schedule2: Record<string, unknown>,
  f1040: Record<string, unknown>,
): Promise<Uint8Array> {
  const recipient = fields.recipient;
  if (recipient !== "taxpayer" && recipient !== "spouse") {
    throw new Error("TY2026 Form 5329 PDF needs the taxable recipient");
  }
  const name = recipient === "taxpayer"
    ? [
      f1040.taxpayer_first_name,
      f1040.taxpayer_middle_initial,
      f1040.taxpayer_last_name,
    ].filter(Boolean).join(" ")
    : [f1040.spouse_first_name, f1040.spouse_last_name].filter(Boolean).join(
      " ",
    );
  const ssn = String(
    recipient === "taxpayer"
      ? f1040.taxpayer_ssn ?? ""
      : f1040.spouse_ssn ?? "",
  );
  if (!name || !/^\d{9}$/.test(ssn)) {
    throw new Error("TY2026 Form 5329 PDF needs recipient name and SSN");
  }
  const calculated = calculateForm5329PartI2026({
    recipient,
    regular_early_distribution: amount(fields, "regular_early_distribution"),
    early_simple_ira_distribution: amount(
      fields,
      "early_simple_ira_distribution",
    ),
  });
  for (
    const key of [
      "line1_early_distributions",
      "line2_exception",
      "line3_subject_to_tax",
      "line4_early_distribution_tax",
    ]
  ) {
    if (amount(fields, key) !== calculated[key as keyof typeof calculated]) {
      throw new Error(`TY2026 Form 5329 PDF ${key} does not reconcile`);
    }
  }
  if (
    amount(schedule2, "line5_form5329_early_tax") !==
      calculated.line4_early_distribution_tax
  ) {
    throw new Error("TY2026 Form 5329 PDF disagrees with Schedule 2 line 5");
  }
  const source = await Deno.readFile(pinnedDraft);
  const hash = [
    ...new Uint8Array(await crypto.subtle.digest("SHA-256", source)),
  ]
    .map((byte) => byte.toString(16).padStart(2, "0")).join("");
  if (hash !== pinnedDraftSha256) {
    throw new Error("Pinned TY2026 draft Form 5329 hash changed");
  }
  const draft = await PDFDocument.load(source, { ignoreEncryption: true });
  const form = draft.getForm();
  form.getTextField(`${page1}f1_1[0]`).setText(name);
  form.getTextField(`${page1}f1_2[0]`).setText(ssn);
  for (
    const [key, field] of [
      ["line1_early_distributions", "f1_11[0]"],
      ["line3_subject_to_tax", "f1_14[0]"],
      ["line4_early_distribution_tax", "f1_15[0]"],
    ] as const
  ) {
    form.getTextField(`${page1}${field}`).setText(
      String(Math.round(amount(fields, key))),
    );
  }
  const font = await draft.embedFont(StandardFonts.Helvetica);
  form.updateFieldAppearances(font);
  form.flatten();
  const document = await PDFDocument.create();
  const pages = await document.copyPages(draft, [1, 2, 3]);
  for (const page of pages) document.addPage(page);
  return document.save();
}
