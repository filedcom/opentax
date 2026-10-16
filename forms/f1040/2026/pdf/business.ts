import { renderForm8995Draft2026 } from "./form8995.ts";
import {
  PDFDocument,
  PDFName,
  rgb,
  StandardFonts,
  TextAlignment,
} from "pdf-lib";
import {
  type BusinessInput2026,
  calculateBusiness2026,
} from "../nodes/business.ts";
import { calculateDeductionSelection2026 } from "../nodes/standard_deduction.ts";
import { loadPinnedDraft2026 } from "./source.ts";

type Owner = { name: string; ssn: string };
export type BusinessPdfDestinations2026 = {
  schedule1_line3: number;
  schedule1_line15: number;
  schedule2_line4: number;
  form1040_line11b: number;
  form1040_line12e: number;
  form1040_line12f: number;
  form1040_line13a: number;
  form1040_line13b: number;
  form1040_line15: number;
};
type SelectionInput = Parameters<typeof calculateDeductionSelection2026>[0];
const templateInfo = {
  schedule_c: {
    file: "f1040sc",
    hash: "287b4510dd847c11f6cbbcc98fee05ac5ff187cc18e1413f8759a4a7cd802224",
    pages: 3,
    fields: 109,
  },
  schedule_se: {
    file: "f1040sse",
    hash: "a59fa5dcf2f0a8a5a71c46aa3837e9e8e605eeecc0a666bcb784a368900d141c",
    pages: 3,
    fields: 27,
  },
};
const numeric = (n: number) => n < 0 ? `(${Math.abs(n)})` : String(n);

/** Replays both source owners. Official pages precede any supporting statements. */
export async function buildBusinessPdfBytes2026(
  raw: BusinessInput2026,
  selection: SelectionInput,
  destinations: BusinessPdfDestinations2026,
  owners: { taxpayer: Owner; spouse?: Owner },
  kind: "schedule_c" | "schedule_se" | "form8995",
): Promise<Uint8Array> {
  const c = calculateBusiness2026(raw).calculation;
  if (!c) throw new Error("Business PDF needs a complete business inventory");
  const selected = calculateDeductionSelection2026(selection);
  const d = selected.resolution.selected;
  const qbi = d.qbi.forms.form8995 as {
    rows: typeof c.rows;
    lines: Record<string, number>;
  } | undefined;
  if (
    !qbi ||
    JSON.stringify(selected.source_input.business_sources_2026) !==
      JSON.stringify(c.source_input)
  ) {
    throw new Error(
      "Business PDF must use the same retained sources as deduction selection",
    );
  }
  if (
    destinations.schedule1_line3 !== c.business.schedule1_line3 ||
    destinations.schedule1_line15 !== c.business.schedule1_line15 ||
    destinations.schedule2_line4 !== c.business.schedule2_line4 ||
    destinations.form1040_line11b !== selected.source_input.agi ||
    destinations.form1040_line12e !== d.line12eStandardOrItemized ||
    destinations.form1040_line12f !== d.line12fNonitemizerCharity ||
    destinations.form1040_line13a !== d.line13aSchedule1a ||
    destinations.form1040_line13b !== d.line13bQbi ||
    destinations.form1040_line15 !== d.line15TaxableIncome
  ) {
    throw new Error(
      "Business PDF destinations disagree with calculated sources",
    );
  }
  for (
    const [role, tin] of [["taxpayer", c.source_input.taxpayer_tin], [
      "spouse",
      c.source_input.spouse_tin,
    ]] as const
  ) {
    const person = owners[role];
    if (
      tin
        ? !person?.name.trim() || person.ssn.replaceAll("-", "") !== tin
        : person !== undefined
    ) {
      throw new Error("Business PDF needs matching proprietor identities");
    }
  }
  if (kind === "form8995") {
    return renderForm8995Draft2026(qbi, {
      name: [owners.taxpayer.name, owners.spouse?.name].filter(Boolean).join(
        " & ",
      ),
      ssn: owners.taxpayer.ssn,
    });
  }
  const ownerFor = (tin: string) =>
    tin === c.source_input.taxpayer_tin ? owners.taxpayer : owners.spouse!;
  const info = templateInfo[kind];
  const bytes = await loadPinnedDraft2026(
    new URL(
      `../../../../docs/ty2026/corpus/draft/${info.file}.pdf`,
      import.meta.url,
    ),
    `https://www.irs.gov/pub/irs-dft/${info.file}--dft.pdf`,
    info.hash,
  );
  const output = await PDFDocument.create();
  const statements: {
    title: string;
    owner: Owner;
    rows: { description: string; amount: string }[];
    total?: string;
  }[] = [];
  async function template() {
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const form = doc.getForm();
    if (
      doc.getPageCount() !== info.pages ||
      form.getFields().length !== info.fields
    ) {
      throw new Error(`${kind} template inventory changed`);
    }
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const name = (leaf: string) => {
      const fields = form.getFields().filter((f) =>
        f.getName().endsWith(`.${leaf}`)
      );
      if (fields.length !== 1) {
        throw new Error(`Business PDF field changed: ${leaf}`);
      }
      return fields[0].getName();
    };
    const fill = (page: number, index: number, value: string | number) => {
      const field = form.getTextField(name(`f${page}_${index}[0]`));
      const rect = field.acroField.getWidgets()[0].getRectangle();
      const text = typeof value === "number" ? numeric(value) : value;
      const size = Math.min(
        9,
        9 * (rect.width - 3) / Math.max(1, font.widthOfTextAtSize(text, 9)),
      );
      if (size < 6) {
        throw new Error("Business PDF text exceeds printable field");
      }
      field.setFontSize(size);
      if (typeof value === "number") field.setAlignment(TextAlignment.Right);
      field.setText(text);
    };
    const check = (page: number, index: number, option = 0) =>
      form.getCheckBox(name(`c${page}_${index}[${option}]`)).check();
    const append = async (pages: number[]) => {
      form.updateFieldAppearances(font);
      form.flatten();
      for (const page of doc.getPages()) page.node.delete(PDFName.of("Annots"));
      doc.catalog.delete(PDFName.of("AcroForm"));
      for (const index of pages) {
        doc.getPage(index).drawText("DRAFT - NOT FOR FILING", {
          x: 36,
          y: 12,
          size: 8,
          font,
          color: rgb(.4, .1, .1),
        });
        const [page] = await output.copyPages(doc, [index]);
        output.addPage(page);
      }
    };
    return { fill, check, append };
  }
  if (kind === "schedule_c") {
    for (const b of c.business.businesses) {
      const { fill, check, append } = await template();
      const s = b.source, owner = ownerFor(s.owner_tin);
      fill(1, 1, owner.name);
      fill(1, 2, owner.ssn);
      fill(1, 3, s.principal_business);
      fill(1, 4, s.business_code);
      if (s.business_name) fill(1, 5, s.business_name);
      if (s.ein) fill(1, 6, s.ein);
      const a = s.business_address;
      fill(1, 7, a.line1);
      if (a.line2) fill(1, 8, a.line2);
      fill(1, 9, a.city);
      fill(1, 10, a.state);
      fill(1, 11, a.zip);
      check(1, 1);
      check(1, 2);
      if (s.new_business) check(1, 3);
      check(1, 4, s.information_return_obligation.required ? 0 : 1);
      if (s.information_return_obligation.required) {
        check(1, 5, s.information_return_obligation.filed_or_will_file ? 0 : 1);
      }
      if (s.kind === "statutory_employee") check(1, 6);
      const map: Record<string, number> = {
        line1: 13,
        line2: 14,
        line3: 15,
        line4: 16,
        line5: 17,
        line6: 18,
        line7: 19,
        line8: 20,
        line9: 21,
        line10: 22,
        line11: 23,
        line12: 24,
        line13: 25,
        line14: 26,
        line15: 27,
        line16a: 28,
        line16b: 29,
        line16c: 31,
        line17: 32,
        line18: 33,
        line19: 34,
        line20a: 35,
        line20b: 36,
        line21: 37,
        line22: 38,
        line23: 39,
        line24a: 40,
        line24b: 41,
        line25: 42,
        line26: 43,
        line27a: 44,
        line27b: 45,
        line28: 46,
        line29: 47,
        line30: 50,
        line31: 51,
      };
      for (const [line, field] of Object.entries(map)) {
        fill(1, field, b.lines[line as keyof typeof b.lines]);
      }
      if (b.lines.line31 < 0) check(1, 7);
      if (b.vehicle) {
        const v = b.vehicle,
          [year, month, day] = v.source.in_service_date.split("-");
        fill(2, 9, month);
        fill(2, 10, day);
        fill(2, 11, year);
        fill(2, 12, v.line44a_business_miles);
        fill(2, 13, v.line44b_commuting_miles);
        fill(2, 14, v.line44c_other_miles);
        check(2, 5, v.source.available_for_personal_use ? 0 : 1);
        check(2, 6, v.source.another_vehicle_available ? 0 : 1);
        check(2, 7);
        check(2, 8);
      }
      const details = b.part_v_source_entries;
      // A statement retains source cents instead of inventing whole-dollar
      // detail amounts whose rounded sum can differ from the single line total.
      const statement = details.length > 9 ||
        details.some((r) =>
          !Number.isInteger(r.amount) || r.description.length > 50
        );
      if (statement) {
        fill(2, 15, "See attached expense statement");
        fill(2, 16, b.lines.line48);
        statements.push({
          title: `2026 Schedule C - Part V - ${
            s.business_name ?? s.principal_business
          }`,
          owner,
          rows: details.map((r) => ({
            description: `${r.date}: ${r.description}`,
            amount: r.amount.toFixed(2),
          })),
          total: `Total reported on lines 48 and 27b: ${b.lines.line48}`,
        });
      } else {details.forEach((r, i) => {
          fill(2, 15 + i * 2, r.description);
          fill(2, 16 + i * 2, r.amount);
        });}
      fill(2, 33, b.lines.line48);
      await append([1, 2]);
    }
  } else if (kind === "schedule_se") {
    const rows = c.business.owners.filter((o) => o.schedule_se);
    if (!rows.length) throw new Error("No regular Schedule SE is required");
    for (const row of rows) {
      const { fill, append } = await template(),
        owner = ownerFor(row.owner_tin),
        s = row.schedule_se!;
      fill(1, 1, owner.name);
      fill(1, 2, owner.ssn);
      fill(1, 5, row.net_profit_subject_to_se);
      fill(1, 6, s.line3);
      fill(1, 7, s.line4a);
      fill(1, 9, s.line4c);
      fill(1, 12, s.line6);
      fill(1, 14, row.w2_ss_wages_and_tips);
      if (row.w2_ss_wages_and_tips < 184500) {
        fill(1, 15, 0);
        fill(1, 16, 0);
        fill(1, 17, s.line8d);
        fill(1, 18, s.line9);
        fill(1, 19, s.line10);
      }
      fill(1, 20, s.line11);
      fill(1, 21, s.line12);
      fill(1, 22, s.line13);
      await append([1]);
    }
  }
  const font = await output.embedFont(StandardFonts.Helvetica);
  function wrapped(text: string, width: number, size: number) {
    const lines: string[] = [];
    let current = "";
    for (const char of text) {
      if (font.widthOfTextAtSize(current + char, size) > width && current) {
        lines.push(current);
        current = "";
      }
      current += char;
    }
    if (current) lines.push(current);
    return lines;
  }
  for (const s of statements) {
    let page = output.addPage([612, 792]), y = 740;
    const header = () => {
      y = 740;
      for (const line of wrapped(s.title, 528, 10)) {
        page.drawText(line, { x: 42, y, size: 10, font });
        y -= 14;
      }
      for (
        const line of wrapped(`${s.owner.name} | SSN ${s.owner.ssn}`, 528, 9)
      ) {
        page.drawText(line, { x: 42, y, size: 9, font });
        y -= 13;
      }
      y -= 15;
      page.drawText("DRAFT - NOT FOR FILING", {
        x: 42,
        y: 24,
        size: 8,
        font,
        color: rgb(.4, .1, .1),
      });
    };
    header();
    for (
      const r of [
        ...s.rows,
        ...(s.total ? [{ description: s.total, amount: "" }] : []),
      ]
    ) {
      const lines = wrapped(r.description, 440, 9);
      const amountWidth = font.widthOfTextAtSize(r.amount, 9);
      if (amountWidth > 75) {
        throw new Error("Business statement amount exceeds printable column");
      }
      for (const [i, line] of lines.entries()) {
        if (y < 55) {
          page = output.addPage([612, 792]);
          header();
        }
        page.drawText(line, { x: 42, y, size: 9, font });
        if (i === 0) {
          page.drawText(r.amount, { x: 570 - amountWidth, y, size: 9, font });
        }
        y -= 12;
      }
      y -= 5;
    }
  }
  output.catalog.delete(PDFName.of("AcroForm"));
  return output.save({ updateFieldAppearances: false });
}
