import {
  PDFDocument,
  PDFName,
  rgb,
  StandardFonts,
  TextAlignment,
} from "pdf-lib";
import { calculateEic2026, type EicInput2026 } from "../nodes/eitc.ts";
import { loadPinnedDraft2026 } from "./source.ts";
import { FilingStatus } from "../../nodes/types.ts";

export async function buildScheduleEicPdfBytes2026(
  raw: EicInput2026,
  destinations: {
    form1040_line27a: number;
    form1040_line11b: number;
    form1040_line1i: number;
  },
  filer: { name: string; ssn: string },
): Promise<Uint8Array> {
  const result = calculateEic2026(raw);
  if (!result.file_schedule_eic) {
    throw new Error("Schedule EIC needs a positive child-based credit");
  }
  if (
    result.credit_amount !== destinations.form1040_line27a ||
    result.source_input.agi !== destinations.form1040_line11b ||
    result.elected_combat_pay !== destinations.form1040_line1i
  ) {
    throw new Error(
      "Schedule EIC PDF destinations disagree with source calculation",
    );
  }
  if (
    !filer.name.trim() ||
    filer.ssn.replaceAll("-", "") !== raw.taxpayer_ssn.replaceAll("-", "")
  ) {
    throw new Error("Schedule EIC PDF needs matching filer identity");
  }
  const bytes = await loadPinnedDraft2026(
    new URL(
      "../../../../docs/ty2026/corpus/draft/f1040sei.pdf",
      import.meta.url,
    ),
    "https://www.irs.gov/pub/irs-dft/f1040sei--dft.pdf",
    "fc9784fd1f64b2ea53e86d9a23a2b946f317c1bb92885e18f8a614252dcf7ef3",
  );
  const draft = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const form = draft.getForm();
  if (draft.getPageCount() !== 3 || form.getFields().length !== 38) {
    throw new Error("Schedule EIC template inventory changed");
  }
  const font = await draft.embedFont(StandardFonts.Helvetica);
  const prefix = "topmostSubform[0].Page1[0].";
  const sizeFor = (text: string, width: number) => {
    const size = Math.min(
      9,
      9 * (width - 4) / Math.max(1, font.widthOfTextAtSize(text, 9)),
    );
    if (size < 6) {
      throw new Error("Schedule EIC text exceeds its printed field");
    }
    return size;
  };
  const fill = (index: number, value: string | number, path = "") => {
    const field = form.getTextField(
      `${prefix}${path}f1_${String(index).padStart(2, "0")}[0]`,
    );
    const rect = field.acroField.getWidgets()[0].getRectangle();
    field.setFontSize(sizeFor(String(value), rect.width));
    if (typeof value === "number") field.setAlignment(TextAlignment.Right);
    field.setText(String(value));
  };
  fill(1, filer.name);
  fill(2, filer.ssn);
  const page = draft.getPage(1);
  result.qualifying_child_details.forEach((child, index) => {
    const n = index + 1;
    // IRS combines the full-name widget although the paper shows two halves.
    // Draw both names inside their actual widget rectangle after flattening.
    fill(6 + index, child.ssn!);
    child.dob.slice(0, 4).split("").forEach((digit, d) =>
      fill(9 + 4 * index + d, digit, n < 3 ? `Year${n}_ReadOrder[0].` : "")
    );
    const younger = child.dob > raw.taxpayer_dob ||
      (raw.filing_status === FilingStatus.MFJ && !!raw.spouse_dob &&
        child.dob > raw.spouse_dob);
    const answer = (line: "4a" | "4b", value: boolean) => {
      const group = line === "4a" ? n : n + 3;
      const path = n < 3
        ? `Line${line}_Child${n}_ReadOrder[0].${
          value ? "Yes_ReadOrder[0]." : ""
        }c1_${group}[0]`
        : `${
          value ? `Line${line}_Child3_Yes_ReadOrder[0].` : ""
        }c1_${group}[0]`;
      form.getCheckBox(prefix + path).check();
    };
    if (!(Number(child.dob.slice(0, 4)) > 2007 && younger)) {
      const student = child.dob > "2002-12-31" &&
        child.full_time_student === true && younger;
      answer("4a", student);
      if (!student) {
        if (child.disabled !== true) {
          throw new Error(
            "Schedule EIC child fails student and disability tests",
          );
        }
        answer("4b", true);
      }
    }
    fill(
      21 + index,
      child.irs_relationship_code ??
        child.relationship.replaceAll("_", " ").toUpperCase(),
    );
    if (child.eic_printed_months === undefined) {
      throw new Error(
        "Schedule EIC needs reviewed printed U.S. residence months",
      );
    }
    fill(
      24 + index,
      child.eic_printed_months,
      n < 3 ? `Line6_Child${n}_ReadOrder[0].` : "",
    );
  });
  form.updateFieldAppearances(font);
  form.flatten();
  result.qualifying_child_details.forEach((child, index) => {
    const left = 209.8 + index * 122.4;
    for (
      const [offset, value] of [[0, child.first_name], [
        60,
        child.last_name,
      ]] as const
    ) {
      page.drawText(value, {
        x: left + offset + 2,
        y: 470,
        size: sizeFor(value, 60),
        font,
        color: rgb(0, 0, .55),
      });
    }
  });
  const doc = await PDFDocument.create();
  const [filingPage] = await doc.copyPages(draft, [1]);
  doc.addPage(filingPage);
  const footer = await doc.embedFont(StandardFonts.Helvetica);
  filingPage.drawText("DRAFT - NOT FOR FILING", {
    x: 36,
    y: 12,
    size: 8,
    font: footer,
    color: rgb(.4, .1, .1),
  });
  filingPage.node.delete(PDFName.of("Annots"));
  doc.catalog.delete(PDFName.of("AcroForm"));
  return doc.save({ updateFieldAppearances: false });
}
