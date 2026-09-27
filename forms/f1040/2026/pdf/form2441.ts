import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import {
  benefitDetailsSchema,
  type Form2441Lines,
} from "../../nodes/intermediate/forms/form2441/calculation.ts";

const pinnedDraft = new URL(
  "../../../../docs/ty2026/corpus/draft/f2441.pdf",
  import.meta.url,
);
const pinnedDraftSha256 =
  "67eca7567ce5ff06e72d40a07db487f406da33139e664c0c0d9c67a4e31e9385";

type Filer = { name: string; ssn: string };
type Pending = Record<string, unknown>;
const partIILines = [
  "line3",
  "line4",
  "line5",
  "line6",
  "line7",
  "line8",
  "line9a",
  "line9b",
  "line9c",
  "line10",
  "line11",
] as const;
const partIIILines = [
  "line12",
  "line13",
  "line14",
  "line15",
  "line16",
  "line17",
  "line18",
  "line19",
  "line20",
  "line21",
  "line22",
  "line23",
  "line24",
  "line25",
  "line26",
  "line27",
  "line28",
  "line29",
  "line30",
  "line31",
] as const;

function amount(fields: Pending, key: keyof Form2441Lines): number {
  const value = fields[key];
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`TY2026 Form 2441 PDF needs ${key}`);
  }
  return value;
}

function optionalAmount(fields: Pending | undefined, key: string): number {
  const value = fields?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function validate(
  benefits: Pending,
  credit: Pending,
  f1040: Pending,
  schedule3: Pending | undefined,
  filer: Filer,
) {
  if (!filer.name.trim() || !/^\d{9}$/.test(filer.ssn)) {
    throw new Error("TY2026 Form 2441 PDF needs filer name and SSN");
  }
  const details = benefitDetailsSchema.parse(credit.filing_details);
  if (JSON.stringify(details) !== JSON.stringify(benefits.filing_details)) {
    throw new Error("TY2026 Form 2441 benefit and credit facts disagree");
  }
  if (
    details.care_providers.length > 3 || details.qualifying_people.length > 3
  ) {
    throw new Error("TY2026 Form 2441 PDF needs continuation statements");
  }
  for (const line of [...partIILines, ...partIIILines]) amount(credit, line);
  for (const line of partIIILines) {
    if (amount(credit, line) !== amount(benefits, line)) {
      throw new Error(`TY2026 Form 2441 benefit ${line} changed after AGI`);
    }
  }
  if (
    amount(credit, "line9b") !== 0 || amount(credit, "line22") !== 0 ||
    amount(credit, "line24") !== 0
  ) {
    throw new Error(
      "TY2026 Form 2441 PDF needs complete special-branch calculation",
    );
  }
  if (
    amount(credit, "line9c") !== amount(credit, "line9a") +
        amount(credit, "line9b") ||
    amount(credit, "line28") !== amount(credit, "line24") +
        amount(credit, "line25") ||
    amount(credit, "line11") !==
      (details.filing_status === "mfs" && details.mfs_eligibility_met === false
        ? 0
        : Math.min(amount(credit, "line9c"), amount(credit, "line10")))
  ) {
    throw new Error("TY2026 Form 2441 PDF lines do not reconcile");
  }
  if (
    amount(credit, "line26") !==
      optionalAmount(f1040, "line1e_taxable_dep_care") ||
    amount(credit, "line11") !==
      optionalAmount(schedule3, "line2_childcare_credit")
  ) {
    throw new Error(
      "TY2026 Form 2441 PDF disagrees with Form 1040 or Schedule 3",
    );
  }
  return details;
}

/** Fill the applicable printed pages of the pinned TY2026 draft Form 2441. */
export async function buildForm2441PdfBytes2026(
  benefits: Pending,
  credit: Pending,
  f1040: Pending,
  schedule3: Pending | undefined,
  filer: Filer,
): Promise<Uint8Array> {
  const details = validate(benefits, credit, f1040, schedule3, filer);
  const source = await Deno.readFile(pinnedDraft);
  const hash = [
    ...new Uint8Array(await crypto.subtle.digest("SHA-256", source)),
  ]
    .map((byte) => byte.toString(16).padStart(2, "0")).join("");
  if (hash !== pinnedDraftSha256) {
    throw new Error("Pinned TY2026 draft Form 2441 hash changed");
  }
  const draft = await PDFDocument.load(source, { ignoreEncryption: true });
  const form = draft.getForm();
  const font = await draft.embedFont(StandardFonts.Helvetica);
  const page1 = draft.getPage(1);
  const names = form.getFields().map((field) => field.getName());
  const fullName = (suffix: string) => {
    const matching = names.filter((name) => name.endsWith(`.${suffix}`));
    if (matching.length !== 1) {
      throw new Error(`TY2026 Form 2441 PDF field ${suffix} is not unique`);
    }
    return matching[0];
  };
  const setText = (suffix: string, value: string | number, fontSize = 9) => {
    const field = form.getTextField(fullName(suffix));
    const expected = typeof value === "number"
      ? String(Math.round(value))
      : value;
    field.setFontSize(fontSize);
    field.setText(expected);
    if (field.getText() !== expected) {
      throw new Error(`TY2026 Form 2441 PDF did not set ${suffix}`);
    }
  };
  const check = (suffix: string) => {
    const field = form.getCheckBox(fullName(suffix));
    field.check();
    if (!field.isChecked()) {
      throw new Error(`TY2026 Form 2441 PDF did not check ${suffix}`);
    }
  };

  setText("f1_1[0]", filer.name);
  setText("f1_2[0]", filer.ssn);
  if (details.mfs_eligibility_met === true) check("c1_1[0]");
  if (details.student_or_disabled_deemed_income_used === true) {
    check("c1_2[0]");
  }
  details.care_providers.forEach((provider, index) => {
    const n = index + 1;
    const name = provider.kind === "business"
      ? provider.name
      : `${provider.first_name} ${provider.last_name}`;
    const address = provider.us_address;
    setText(`f1_${3 + index}[0]`, name, 8);
    // The source's single multiline widget has a different line spacing
    // from its six printed address rows. Place each part on the printed row.
    const x = 233.4 + index * 115.2;
    for (
      const [value, y] of [
        [address.line1, 568],
        [address.line2, 544],
        [address.city, 532],
        [address.state, 520],
        [address.zip, 508],
      ] as const
    ) {
      if (!value) continue;
      let size = 8;
      while (size > 6 && font.widthOfTextAtSize(value, size) > 110) {
        size -= 0.5;
      }
      if (font.widthOfTextAtSize(value, size) > 110) {
        throw new Error("TY2026 Form 2441 PDF provider address is too long");
      }
      page1.drawText(value, { x, y, size, font, color: rgb(0, 0, 0.55) });
    }
    setText(
      `f1_${9 + index}[0]`,
      provider.kind === "business" ? provider.ein : provider.ssn,
    );
    check(`c1_${3 + n}[${provider.household_employee ? 0 : 1}]`);
    setText(`f1_${12 + index}[0]`, provider.amount_paid);
  });
  details.qualifying_people.forEach((person, index) => {
    const base = 15 + index * 4;
    setText(`f1_${base}[0]`, person.first_name);
    setText(`f1_${base + 1}[0]`, person.last_name);
    setText(`f1_${base + 2}[0]`, person.ssn);
    if (person.over_12_and_disabled) check(`c1_${8 + index}[0]`);
    setText(`f1_${base + 3}[0]`, person.credit_expenses_paid);
  });
  partIILines.forEach((line, index) => {
    const value = line === "line8"
      ? Math.round(amount(credit, line) * 100)
      : amount(credit, line);
    setText(`f1_${27 + index}[0]`, value);
  });
  const hasBenefits = amount(credit, "line12") + amount(credit, "line13") > 0;
  if (hasBenefits) {
    check("c2_1[0]");
    partIIILines.forEach((line, index) => {
      setText(`f2_${index + 1}[0]`, amount(credit, line));
    });
  }

  // The printed benefits question has no AcroForm widget.
  page1.drawText("X", {
    x: 260,
    y: hasBenefits ? 396 : 414,
    size: 10,
    font,
  });
  form.updateFieldAppearances(font);
  form.flatten();

  const output = await PDFDocument.create();
  const pages = await output.copyPages(draft, hasBenefits ? [1, 2] : [1]);
  for (const page of pages) output.addPage(page);
  return output.save();
}
