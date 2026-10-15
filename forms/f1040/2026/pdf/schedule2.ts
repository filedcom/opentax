import { z } from "zod";
import {
  PDFDocument,
  PDFFont,
  PDFName,
  rgb,
  StandardFonts,
  TextAlignment,
} from "pdf-lib";
import {
  calculateSchedule2_2026,
  type Schedule2Input2026,
  schedule2Input2026Schema,
  type Schedule2Result2026,
} from "../schedule2.ts";
import { loadPinnedDraft2026 } from "./source.ts";

const description = z.string().trim().min(1).max(1000);
const item = z.object({
  type: description,
  amount: z.number().int().positive().safe(),
}).strict();
const choices = z.array(z.enum(["1a", "1c", "1d", "2a"])).min(1).max(4)
  .refine(
    (values) => new Set(values).size === values.length,
    "Duplicate Form 4255 selection",
  );
/** Print disclosures supplied by their source owners, separately from finalized line amounts. */
export const schedule2PrintDetailsSchema = z.object({
  line1e_form4255_columns: choices.optional(),
  line1f_form4255_columns: choices.optional(),
  line1y_items: z.array(item).min(1).optional(),
  line13a_items: z.array(
    item.extend({ form_number: z.string().trim().min(1).max(40) }).strict(),
  ).min(1).optional(),
  line13z_items: z.array(item).min(1).optional(),
  self_employment_exemptions: z.array(z.enum(["4361", "4029"])).min(1).max(2)
    .refine(
      (values) => new Set(values).size === values.length,
      "Duplicate SE exemption",
    ).optional(),
  other_self_employment_exemption: description.optional(),
  form5329_not_required: z.boolean().optional(),
}).strict();
export type Schedule2PrintDetails2026 = z.input<
  typeof schedule2PrintDetailsSchema
>;

const page1 = (n: number, group = "") =>
  `form1[0].Page1[0].${group}f1_${String(n).padStart(2, "0")}[0]`;
const page2 = (n: number, group = "") =>
  `form1[0].Page2[0].${group}f2_${String(n).padStart(2, "0")}[0]`;
const numericFields = {
  line1a_excess_advance_premium: page1(3, "Line1_ReadOrder[0]."),
  line1b_new_clean_vehicle_repayment: page1(4),
  line1c_used_clean_vehicle_repayment: page1(5),
  line1d_net_epe_recapture: page1(6),
  line1e_excessive_payment: page1(7),
  line1f_twenty_percent_excessive_payment: page1(8),
  line1y_other_additions: page1(10),
  line1z_additions: page1(11),
  line2_amt: page1(12),
  line3_part1_tax: page1(13),
  line4_self_employment_tax: page1(15),
  line5_form5329_early_tax: page1(16),
  line6_niit: page1(17),
  line7_residential_lot_interest: page1(18),
  line8_installment_sale_interest: page1(19),
  line9_lihtc_recapture: page1(20),
  line10_net_epe_recapture: page1(21),
  line11_medicare_self_employment_tax: page1(22),
  line12_section965_installment: page1(23),
  line13a_other_credit_recapture: page1(25, "Line13_ReadOrder[0]."),
  line13b_mortgage_subsidy_recapture: page1(26),
  line13c_hsa_distribution_tax: page1(27),
  line13d_hsa_eligibility_tax: page1(28),
  line13e_archer_msa_tax: page1(29),
  line13f_medicare_advantage_msa_tax: page1(30),
  line13g_fractional_interest_recapture: page1(31),
  line13h_section409a_tax: page1(32),
  line13i_section457a_tax: page1(33),
  line13j_section72m5_tax: page1(34),
  line13k_golden_parachute_tax: page1(35),
  line13l_trust_accumulation_tax: page1(36),
  line13m_expatriated_corporation_tax: page2(1),
  line13n_lookback_interest: page2(2),
  line13o_nonresident_alien_tax: page2(3),
  line13z_other_income_taxes: page2(5),
  line14_other_income_taxes: page2(6),
  line15_additional_income_taxes: page2(7),
  line16a_form4137_tip_tax: page2(8, "Line16_ReadOrder[0]."),
  line16b_form8919_wage_tax: page2(9),
  line16c_additional_fica: page2(10),
  line17a_household_employment_tax: page2(11, "Line17_ReadOrder[0]."),
  line17b_medicare_wage_tax: page2(12),
  line17c_w2_uncollected_fica: page2(13),
  line17d_other_employment_taxes: page2(14),
  line18_form5329_excess_tax: page2(15),
  line19a_form8621_line16f_interest: page2(16, "Line19a_ReadOrder[0]."),
  line19b_form8621_line24_interest: page2(17),
  line19c_form8621_interest: page2(18),
  line20_employment_and_other_taxes: page2(19),
  line21_total_additional_taxes: page2(20),
} satisfies Record<
  keyof Schedule2Input2026 | keyof Schedule2Result2026,
  string
>;

function wrap(text: string, font: PDFFont, width: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.replace(/\s+/g, " ").split(" ")) {
    if (font.widthOfTextAtSize(line ? `${line} ${word}` : word, 9) <= width) {
      line = line ? `${line} ${word}` : word;
    } else {
      if (line) lines.push(line);
      line = "";
      for (const char of word) {
        if (font.widthOfTextAtSize(line + char, 9) > width) {
          lines.push(line);
          line = "";
        }
        line += char;
      }
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Internal PDF component from finalized source-owner amounts; this does not enable their calculators. */
export async function buildSchedule2PdfBytes2026(
  raw: Schedule2Input2026,
  destinations: {
    form1040_line17: number;
    form1040_line23: number;
    schedule3a_line4: number;
  },
  filer: { name: string; ssn: string },
  rawDetails: Schedule2PrintDetails2026 = {},
): Promise<Uint8Array> {
  const input = schedule2Input2026Schema.parse(raw);
  const result = calculateSchedule2_2026(input);
  const details = schedule2PrintDetailsSchema.parse(rawDetails);
  if (!filer.name.trim() || !/^\d{3}-?\d{2}-?\d{4}$/.test(filer.ssn)) {
    throw new Error("Schedule 2 PDF needs filer identity");
  }
  if (
    destinations.form1040_line17 !== result.line3_part1_tax ||
    destinations.form1040_line23 !== result.line21_total_additional_taxes ||
    destinations.schedule3a_line4 !== result.line20_employment_and_other_taxes
  ) {
    throw new Error(
      "Schedule 2 PDF destinations disagree with calculated totals",
    );
  }
  for (
    const [amount, selected] of [
      [input.line1e_excessive_payment, details.line1e_form4255_columns],
      [
        input.line1f_twenty_percent_excessive_payment,
        details.line1f_form4255_columns,
      ],
    ] as const
  ) {
    if (((amount ?? 0) > 0) !== !!selected?.length) {
      throw new Error(
        "Schedule 2 excessive payment needs matching Form 4255 selections",
      );
    }
  }
  const disclosures = [
    {
      line: "1y",
      field: page1(9),
      amount: input.line1y_other_additions ?? 0,
      items: details.line1y_items,
    },
    {
      line: "13a",
      field: page1(24, "Line13_ReadOrder[0].Line13a_ReadOrder[0]."),
      amount: input.line13a_other_credit_recapture ?? 0,
      items: details.line13a_items,
    },
    {
      line: "13z",
      field: page2(4, "Line13z_ReadOrder[0]."),
      amount: input.line13z_other_income_taxes ?? 0,
      items: details.line13z_items,
    },
  ];
  for (const disclosure of disclosures) {
    if (
      (disclosure.items?.reduce((n, item) => n + item.amount, 0) ?? 0) !==
        disclosure.amount
    ) {
      throw new Error(
        `Schedule 2 line ${disclosure.line} needs descriptions and amounts that reconcile`,
      );
    }
  }
  const bytes = await loadPinnedDraft2026(
    new URL(
      "../../../../docs/ty2026/corpus/draft/f1040s2.pdf",
      import.meta.url,
    ),
    "https://www.irs.gov/pub/irs-dft/f1040s2--dft.pdf",
    "0e3d4faa4b96f692bc31119d2c86189c3d8b9263e8f3aaaf7c3da371887ebc56",
  );
  const draft = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const form = draft.getForm();
  if (form.getFields().length !== 68 || draft.getPageCount() !== 3) {
    throw new Error("Schedule 2 template field inventory changed");
  }
  const font = await draft.embedFont(StandardFonts.Helvetica);
  const fill = (name: string, value: string | number) => {
    const field = form.getTextField(name);
    const rect = field.acroField.getWidgets()[0].getRectangle();
    const text = String(value);
    const size = Math.min(
      9,
      9 * (rect.width - 4) / Math.max(1, font.widthOfTextAtSize(text, 9)),
    );
    if (size < 6) {
      throw new Error("Schedule 2 text exceeds its printable field");
    }
    field.setFontSize(size);
    if (typeof value === "number") field.setAlignment(TextAlignment.Right);
    field.setText(text);
  };
  fill(page1(1), filer.name);
  const ssn = filer.ssn.replaceAll("-", "");
  fill(page1(2), `${ssn.slice(0, 3)}-${ssn.slice(3, 5)}-${ssn.slice(5)}`);
  const values = { ...input, ...result };
  for (const [key, field] of Object.entries(numericFields)) {
    const value = values[key as keyof typeof values];
    if (value !== undefined) fill(field, value);
  }
  const statements: {
    line: string;
    items: { type: string; amount: number; form_number?: string }[];
    amount: number;
  }[] = [];
  const describe = (item: { type: string; form_number?: string }) =>
    `${item.type}${item.form_number ? ` (Form ${item.form_number})` : ""}`;
  for (const disclosure of disclosures) {
    if (!disclosure.items) continue;
    const text = disclosure.items.map((item) =>
      `${describe(item)}: ${item.amount}`
    ).join("; ");
    const rect = form.getTextField(disclosure.field).acroField.getWidgets()[0]
      .getRectangle();
    if (font.widthOfTextAtSize(text, 8) <= rect.width - 4) {
      fill(disclosure.field, text);
    } else {
      fill(disclosure.field, "See attached statement");
      statements.push({ ...disclosure, items: disclosure.items });
    }
  }
  for (
    const [line, selections, number] of [[
      "e",
      details.line1e_form4255_columns,
      1,
    ], ["f", details.line1f_form4255_columns, 2]] as const
  ) {
    for (const selection of selections ?? []) {
      const index = ["1a", "1c", "1d", "2a"].indexOf(selection);
      form.getCheckBox(
        `form1[0].Page1[0].Line1${line}_ReadOrder[0].c1_${number}[${index}]`,
      ).check();
    }
  }
  for (const exemption of details.self_employment_exemptions ?? []) {
    form.getCheckBox(`form1[0].Page1[0].c1_${exemption === "4361" ? 3 : 4}[0]`)
      .check();
  }
  if (details.other_self_employment_exemption) {
    form.getCheckBox("form1[0].Page1[0].c1_5[0]").check();
    fill(page1(14), details.other_self_employment_exemption);
  }
  if (details.form5329_not_required) {
    form.getCheckBox("form1[0].Page1[0].c1_6[0]").check();
  }
  form.updateFieldAppearances(font);
  form.flatten();
  const doc = await PDFDocument.create();
  for (const page of await doc.copyPages(draft, [1, 2])) doc.addPage(page);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  for (const statement of statements) {
    const newPage = () => {
      const page = doc.addPage([612, 792]);
      page.drawText(`Schedule 2 (2026) - Line ${statement.line} statement`, {
        x: 36,
        y: 750,
        size: 12,
        font: bold,
      });
      const header = `${filer.name} | SSN ${ssn.slice(0, 3)}-${
        ssn.slice(3, 5)
      }-${ssn.slice(5)}`;
      const size = Math.min(9, 9 * 540 / regular.widthOfTextAtSize(header, 9));
      if (size < 6) {
        throw new Error("Schedule 2 statement identity exceeds its field");
      }
      page.drawText(header, { x: 36, y: 730, size, font: regular });
      page.drawText("Type / form", { x: 36, y: 705, size: 9, font: bold });
      page.drawText("Amount", { x: 530, y: 705, size: 9, font: bold });
      return page;
    };
    let page = newPage();
    let y = 685;
    for (const item of statement.items) {
      const lines = wrap(describe(item), regular, 460);
      if (y - lines.length * 12 < 65) {
        page = newPage();
        y = 685;
      }
      const value = String(item.amount);
      page.drawText(value, {
        x: 576 - regular.widthOfTextAtSize(value, 9),
        y,
        size: 9,
        font: regular,
      });
      for (const line of lines) {
        page.drawText(line, { x: 36, y, size: 9, font: regular });
        y -= 12;
      }
      y -= 8;
    }
    if (y < 65) {
      page = newPage();
      y = 685;
    }
    page.drawText(`Line ${statement.line} total: ${statement.amount}`, {
      x: 36,
      y,
      size: 9,
      font: bold,
    });
  }
  for (const page of doc.getPages()) {
    page.drawText("DRAFT - NOT FOR FILING", {
      x: 36,
      y: 12,
      font: regular,
      size: 8,
      color: rgb(0.4, 0.1, 0.1),
      opacity: 1,
    });
    page.node.delete(PDFName.of("Annots"));
  }
  doc.catalog.delete(PDFName.of("AcroForm"));
  return doc.save({ updateFieldAppearances: false });
}
