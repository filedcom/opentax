import {
  PDFDocument,
  type PDFFont,
  type PDFPage,
  rgb,
  StandardFonts,
} from "pdf-lib";
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

function rankedRows<T>(
  rows: readonly T[],
  amountOf: (row: T) => number,
): readonly T[] {
  return rows.map((row, index) => ({ row, index }))
    .sort((a, b) => amountOf(b.row) - amountOf(a.row) || a.index - b.index)
    .map(({ row }) => row);
}

function wrapLine(font: PDFFont, value: string, maxWidth: number): string[] {
  const words = value.trim().split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (let word of words) {
    while (font.widthOfTextAtSize(word, 9) > maxWidth) {
      let length = 1;
      while (
        length < word.length &&
        font.widthOfTextAtSize(word.slice(0, length + 1), 9) <= maxWidth
      ) length++;
      if (current) {
        lines.push(current);
        current = "";
      }
      lines.push(word.slice(0, length));
      word = word.slice(length);
    }
    const candidate = current ? `${current} ${word}` : word;
    if (current && font.widthOfTextAtSize(candidate, 9) > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function appendContinuationPages(
  output: PDFDocument,
  filer: Filer,
  providers: ReturnType<typeof benefitDetailsSchema.parse>["care_providers"],
  people: ReturnType<typeof benefitDetailsSchema.parse>["qualifying_people"],
  font: PDFFont,
  bold: PDFFont,
): void {
  if (providers.length === 0 && people.length === 0) return;
  let page!: PDFPage;
  let y = 0;
  let currentSection: string | undefined;
  const newPage = () => {
    page = output.addPage([612, 792]);
    page.drawText("Form 2441 (2026) - Continuation Statement", {
      x: 54,
      y: 742,
      size: 14,
      font: bold,
    });
    page.drawText(`Name: ${filer.name}    SSN: ${filer.ssn}`, {
      x: 54,
      y: 717,
      size: 10,
      font,
    });
    page.drawLine({ start: { x: 54, y: 704 }, end: { x: 558, y: 704 } });
    y = 681;
    if (currentSection) {
      page.drawText(`${currentSection} (continued)`, {
        x: 54,
        y,
        size: 9,
        font: bold,
      });
      y -= 22;
    }
  };
  const write = (value: string, emphasized = false) => {
    const selectedFont = emphasized ? bold : font;
    for (const line of wrapLine(selectedFont, value, 504)) {
      if (y < 60) newPage();
      page.drawText(line, { x: 54, y, size: 9, font: selectedFont });
      y -= 14;
    }
  };
  const section = (heading: string) => {
    if (y < 130) {
      currentSection = undefined;
      newPage();
    }
    currentSection = heading;
    write(heading, true);
    y -= 8;
  };
  newPage();
  if (providers.length > 0) {
    section("Part I - Additional care providers (lines 1a-1e)");
    providers.forEach((provider, index) => {
      if (y < 135) newPage();
      const name = provider.kind === "business"
        ? provider.name
        : `${provider.first_name} ${provider.last_name}`;
      const address = provider.us_address;
      write(`Provider ${index + 4}: ${name}`, true);
      write(
        `Address: ${
          [
            address.line1,
            address.line2,
            address.city,
            address.state,
            address.zip,
          ].filter(Boolean).join(", ")
        }`,
      );
      write(
        `${provider.kind === "business" ? "EIN" : "SSN"}: ${
          provider.kind === "business" ? provider.ein : provider.ssn
        }    Household employee: ${
          provider.household_employee ? "Yes" : "No"
        }    Amount paid: $${provider.amount_paid}`,
      );
      y -= 10;
    });
  }
  if (people.length > 0) {
    section("Part II - Additional qualifying people (line 2)");
    people.forEach((person, index) => {
      if (y < 110) newPage();
      write(
        `Qualifying person ${
          index + 4
        }: ${person.first_name} ${person.last_name}`,
        true,
      );
      write(
        `SSN: ${person.ssn}    Over age 12 and disabled: ${
          person.over_12_and_disabled ? "Yes" : "No"
        }    2026 qualified expenses paid: $${person.credit_expenses_paid}`,
      );
      y -= 10;
    });
  }
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
  const providers = rankedRows(
    details.care_providers,
    (provider) => provider.amount_paid,
  );
  const people = rankedRows(
    details.qualifying_people,
    (person) => person.credit_expenses_paid,
  );
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
  if (providers.length > 3) check("c1_3[0]");
  if (people.length > 3) check("c1_7[0]");
  providers.slice(0, 3).forEach((provider, index) => {
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
  people.slice(0, 3).forEach((person, index) => {
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
  const statementFont = await output.embedFont(StandardFonts.Helvetica);
  const statementBold = await output.embedFont(StandardFonts.HelveticaBold);
  appendContinuationPages(
    output,
    filer,
    providers.slice(3),
    people.slice(3),
    statementFont,
    statementBold,
  );
  return output.save();
}
