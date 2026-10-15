import {
  PDFDocument,
  PDFName,
  rgb,
  StandardFonts,
  TextAlignment,
} from "pdf-lib";
import {
  calculateMarketplaceReturn2026,
  type MarketplaceReturnInput2026,
} from "../inputs/marketplace-return.ts";
import { loadPinnedDraft2026 } from "./source.ts";

export type MarketplaceResult2026 = ReturnType<
  typeof calculateMarketplaceReturn2026
>;

/** Advances still require reconciliation when the printed dollar amount rounds to zero. */
export function requiresForm8962_2026(result: MarketplaceResult2026): boolean {
  return result.prepared.policies.annual_aptc > 0 ||
    Number(result.calculation.fields.total_premium_tax_credit ?? 0) > 0;
}

export interface Form8962Destinations2026 {
  form1040_line11b: number;
  form1040_line2a: number;
  form1040_nontaxable_social_security: number;
  schedule3_line9: number;
  schedule2_line1a: number;
  schedule2_line1z: number;
  filing_status: string;
  tax_family_tins: string[];
}

/** Ordinary family-only reconciliation. Above-400% column-(f)-only layout is
 * provisional until final 2026 instructions; reserved lines 28–29 stay blank. */
export async function buildForm8962PdfBytes2026(
  raw: MarketplaceReturnInput2026,
  destinations: Form8962Destinations2026,
  filer: { name: string; ssn: string },
): Promise<Uint8Array> {
  const result = calculateMarketplaceReturn2026(raw);
  if (!requiresForm8962_2026(result)) {
    throw new Error("Form 8962 has no filing trigger");
  }
  const source = result.source_input;
  const family = source.marketplace_sources_2026.tax_family;
  if (
    !filer.name.trim() || filer.ssn.replaceAll("-", "") !== family.taxpayer_tin
  ) {
    throw new Error("Form 8962 PDF needs matching filer identity");
  }
  const d = destinations, audit = source.pub974_income_audit;
  const tins = d.tax_family_tins.map((tin) => tin.replaceAll("-", ""));
  if (
    Object.values(d).some((n) =>
      typeof n === "number" && !Number.isSafeInteger(n)
    ) ||
    d.form1040_line11b !== audit.form1040_line9_total_income -
        audit.schedule1_adjustments_except_line17 -
        audit.schedule1_line17_se_health_insurance ||
    d.form1040_line2a !== audit.form1040_line2a_tax_exempt_interest ||
    d.form1040_nontaxable_social_security !==
      audit.form1040_nontaxable_social_security ||
    d.schedule3_line9 !==
      result.calculation.schedule3.line9_premium_tax_credit ||
    d.schedule2_line1a !==
      result.calculation.schedule2.line1a_excess_advance_premium ||
    d.schedule2_line1z !== result.calculation.amt.schedule2_line1z_tax ||
    d.filing_status !== family.filing_status ||
    tins.length !== result.prepared.family.tax_family_tins.length ||
    new Set(tins).size !== tins.length ||
    result.prepared.family.tax_family_tins.some((tin) => !tins.includes(tin))
  ) {
    throw new Error(
      "Form 8962 PDF destinations disagree with calculated sources",
    );
  }

  const bytes = await loadPinnedDraft2026(
    new URL("../../../../docs/ty2026/corpus/draft/f8962.pdf", import.meta.url),
    "https://www.irs.gov/pub/irs-dft/f8962--dft.pdf",
    "5b692171ee43a4596eabfcaad83bea920e6356c492656a1648f2aaf018cd1d35",
  );
  const draft = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const form = draft.getForm();
  const prefix = "topmostSubform[0].Page1[0].";
  if (
    draft.getPageCount() !== 3 || form.getFields().length !== 143 ||
    form.getFields().some((f) => f.acroField.getWidgets().length !== 1)
  ) {
    throw new Error("Form 8962 template field inventory changed");
  }
  const font = await draft.embedFont(StandardFonts.Helvetica);
  const fill = (index: number, value: string | number, table = "") => {
    const field = form.getTextField(`${prefix}${table}f1_${index}[0]`);
    const rect = field.acroField.getWidgets()[0].getRectangle();
    const text = String(value);
    const size = Math.min(
      9,
      9 * (rect.width - 4) / Math.max(1, font.widthOfTextAtSize(text, 9)),
    );
    if (size < 6) throw new Error("Form 8962 text exceeds its printable field");
    field.setFontSize(size);
    if (typeof value === "number" || index === 9) {
      field.setAlignment(TextAlignment.Right);
    }
    field.setText(text);
  };
  const check = (key: string) => form.getCheckBox(prefix + key).check();
  const fields = result.calculation.fields;
  const amount = (key: string): number => {
    const value = fields[key];
    if (typeof value !== "number" || !Number.isSafeInteger(value)) {
      throw new Error(`Form 8962 needs calculated whole-dollar ${key}`);
    }
    return value;
  };
  fill(1, filer.name);
  fill(2, filer.ssn);
  for (
    const [index, key] of [
      [3, "household_size"],
      [4, "taxpayer_modified_agi"],
      [5, "dependents_modified_agi"],
      [6, "household_income"],
      [7, "federal_poverty_line"],
      [8, "federal_poverty_pct"],
    ] as const
  ) fill(index, amount(key));
  const region = result.prepared.family.fpl_region;
  check(
    `Line4_ReadOrder[0].c1_2[${
      region === "alaska" ? 0 : region === "hawaii" ? 1 : 2
    }]`,
  );
  const above400 = amount("federal_poverty_pct") === 401;
  check(`c1_3[${above400 ? 1 : 0}]`);
  if (!above400) {
    const figure = fields.applicable_figure;
    if (typeof figure !== "number" || !Number.isFinite(figure)) {
      throw new Error("Form 8962 needs applicable figure");
    }
    fill(9, figure.toFixed(4));
    fill(10, amount("annual_applicable_contribution"));
    fill(11, amount("monthly_applicable_contribution"));
  }
  check("c1_4[1]");
  const annual = result.prepared.policies.annual_line11_eligible;
  check(`c1_5[${annual ? 0 : 1}]`);
  if (annual) {
    const keys = [
      "annual_premium",
      "annual_slcsp",
      "annual_applicable_contribution",
      "annual_max_ptc",
      "annual_ptc_allowed",
      "annual_aptc",
    ];
    keys.forEach((key, col) => {
      if (!above400 || col === 5) {
        fill(12 + col, amount(key), "Part2_Table1[0].BodyRow1[0].");
      }
    });
  } else {
    const rows = fields.monthly_ptc_rows as Record<string, unknown>[];
    if (!Array.isArray(rows) || rows.length !== 12) {
      throw new Error("Form 8962 needs twelve calculated months");
    }
    const keys = [
      "premium",
      "slcsp",
      "contribution",
      "max_assistance",
      "allowed_credit",
      "aptc",
    ];
    rows.forEach((row, month) => {
      // No policy in the month: leave the entire row blank, including contribution.
      if (
        result.prepared.policies.monthly_premiums[month] === 0 &&
        result.prepared.policies.monthly_aptcs[month] === 0
      ) return;
      keys.forEach((key, col) => {
        if (above400 && col !== 5) return;
        const value = row[key];
        if (typeof value !== "number" || !Number.isSafeInteger(value)) {
          throw new Error("Form 8962 needs calculated monthly dollars");
        }
        fill(
          18 + month * 6 + col,
          value,
          `Part2_Table2[0].BodyRow${month + 1}[0].`,
        );
      });
    });
  }
  fill(90, amount("total_premium_tax_credit"));
  fill(91, amount("total_advance_ptc"));
  if (d.schedule2_line1a > 0) fill(93, d.schedule2_line1a);
  else fill(92, d.schedule3_line9);
  // Unsupported Parts IV/V and reserved lines 28/29 retain their empty template fields.
  form.updateFieldAppearances(font);
  form.flatten();
  const doc = await PDFDocument.create();
  const footer = await doc.embedFont(StandardFonts.Helvetica);
  for (const page of await doc.copyPages(draft, [1, 2])) {
    doc.addPage(page);
    page.drawText("DRAFT - NOT FOR FILING", {
      x: 36,
      y: 12,
      font: footer,
      size: 8,
      color: rgb(.4, .1, .1),
    });
    page.node.delete(PDFName.of("Annots"));
  }
  doc.catalog.delete(PDFName.of("AcroForm"));
  return doc.save({ updateFieldAppearances: false });
}
