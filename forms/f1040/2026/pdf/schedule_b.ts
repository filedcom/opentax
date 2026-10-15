import {
  PDFDocument,
  type PDFFont,
  PDFName,
  type PDFPage,
  rgb,
  StandardFonts,
  TextAlignment,
} from "pdf-lib";
import { z } from "zod";
import {
  calculateInvestmentClaim2026,
  type InvestmentSource2026,
} from "../inputs/investment-claim.ts";
import { investmentSum } from "../inputs/investment-source.ts";
import { sellerFinancedBuyerSchema } from "../../seller_financed_buyer.ts";
import { loadPinnedDraft2026 } from "./source.ts";

const rowSchema = z.object({
  payerName: z.string().trim().min(1),
  amount: z.number().finite().nonnegative(),
});
type Row = { payerName: string; amount?: number };
const adjustments = [
  ["interest_nominee", "Nominee Distribution"],
  ["interest_accrued", "Accrued Interest"],
  ["interest_oid_adjustment", "OID Adjustment"],
  ["interest_bond_premium", "ABP Adjustment"],
] as const;

/** Recompute the shared Schedule B workpaper from the retained issued copies. */
export function scheduleBPrintData2026(
  raw: InvestmentSource2026,
  destinations: {
    form1040_line2b: number;
    form1040_line3b: number;
  },
) {
  const result = calculateInvestmentClaim2026(raw);
  if (!result.schedule_b.required || !result.schedule_b.workpaper) {
    throw new Error("This calculation does not require Schedule B attachment");
  }
  if (
    destinations.form1040_line2b !== result.lines.line2b ||
    destinations.form1040_line3b !== result.lines.line3b
  ) {
    throw new Error(
      "Schedule B PDF destinations disagree with calculated sources",
    );
  }
  const fields = result.schedule_b.workpaper;
  const interest = z.array(rowSchema).parse(fields.print_interest_rows ?? []);
  const dividends = z.array(rowSchema).parse(fields.dividend_rows ?? []);
  const amount = (key: string) =>
    z.number().finite().nonnegative().parse(fields[key] ?? 0);
  const deductions = adjustments.flatMap(([key, label]) =>
    amount(key) > 0 ? [{ payerName: label, amount: -amount(key) }] : []
  );
  if (
    investmentSum([
        ...interest.map((r) => r.amount),
        ...deductions.map((r) => r.amount),
      ]) !== result.cents.taxable_interest ||
    investmentSum(dividends.map((r) => r.amount)) !==
      result.cents.ordinary_dividends ||
    investmentSum([amount("print_line4_total")]) !==
      result.cents.taxable_interest ||
    investmentSum([amount("print_line6_total")]) !==
      result.cents.ordinary_dividends
  ) throw new Error("Schedule B payer rows do not reconcile");
  const sellers = z.array(
    z.object({
      buyer: sellerFinancedBuyerSchema,
      amount: z.number().positive(),
    }),
  ).parse(fields.seller_financed_rows ?? []);
  const interestRows: Row[] = [
    ...interest,
    ...(deductions.length
      ? [{
        payerName: "Subtotal",
        amount: investmentSum(interest.map((r) => r.amount)),
      }, ...deductions]
      : []),
  ];
  return { result, interestRows, dividendRows: dividends as Row[], sellers };
}

function fit(font: PDFFont, text: string, width: number, maximum = 9) {
  const size = Math.min(
    maximum,
    maximum * width / Math.max(1, font.widthOfTextAtSize(text, maximum)),
  );
  if (size < 6) throw new Error("Schedule B text exceeds its printable field");
  return size;
}
function money(amount: number) {
  return amount < 0 ? `(${(-amount).toFixed(2)})` : amount.toFixed(2);
}

/** Static draft attachment; unsupported foreign reporting remains rejected by the source schema. */
export async function buildScheduleBPdfBytes2026(
  raw: InvestmentSource2026,
  destinations: { form1040_line2b: number; form1040_line3b: number },
  filer: { name: string; ssn: string },
): Promise<Uint8Array> {
  const data = scheduleBPrintData2026(raw, destinations);
  if (
    !filer.name.trim() ||
    filer.ssn.replaceAll("-", "") !== data.result.source_input.taxpayer_ssn
  ) {
    throw new Error("Schedule B PDF needs matching filer identity");
  }
  const bytes = await loadPinnedDraft2026(
    new URL(
      "../../../../docs/ty2026/corpus/draft/f1040sb.pdf",
      import.meta.url,
    ),
    "https://www.irs.gov/pub/irs-dft/f1040sb--dft.pdf",
    "aa6272f6b3b8a8c6a2aa6ef9d1069f1edb88fb9df4df60278d198da89cdfd93f",
  );
  const draft = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const form = draft.getForm();
  const prefix = "topmostSubform[0].Page1[0].";
  const key = (n: number) =>
    `${prefix}${
      n === 3 ? "Line1_ReadOrder[0]." : n === 34 ? "ReadOrderControl[0]." : ""
    }f1_${String(n).padStart(2, "0")}[0]`;
  const check = (n: number, yes: boolean) =>
    `${prefix}${n === 1 ? "TagcorrectingSubform[0]." : ""}c1_${n}[${
      yes ? 0 : 1
    }]`;
  const expected = [
    ...Array.from({ length: 66 }, (_, i) => key(i + 1)),
    ...[1, 2, 3].flatMap((n) => [check(n, true), check(n, false)]),
  ];
  if (
    draft.getPageCount() !== 2 || form.getFields().length !== expected.length ||
    form.getFields().some((f) =>
      !expected.includes(f.getName()) || f.acroField.getWidgets().length !== 1
    )
  ) {
    throw new Error("Schedule B template field inventory changed");
  }
  const font = await draft.embedFont(StandardFonts.Helvetica);
  const fill = (n: number, text: string, numeric = false) => {
    const field = form.getTextField(key(n));
    field.setFontSize(
      fit(font, text, field.acroField.getWidgets()[0].getRectangle().width - 4),
    );
    if (numeric) field.setAlignment(TextAlignment.Right);
    field.setText(text);
  };
  fill(1, filer.name);
  fill(2, filer.ssn);
  const rows = (items: Row[], slots: number, first: number) => {
    // A complete statement repeats all rows so adjustments follow the last payer.
    const shown = items.length > slots
      ? [...items.slice(0, slots - 1), {
        payerName: "See attached complete statement",
      }]
      : items;
    shown.forEach((row, i) => {
      fill(first + 2 * i, row.payerName);
      if ("amount" in row && row.amount !== undefined) {
        fill(first + 2 * i + 1, money(row.amount), true);
      }
    });
  };
  rows(data.interestRows, 14, 3);
  rows(data.dividendRows, 15, 34);
  fill(31, String(data.result.lines.line2b), true);
  fill(33, String(data.result.lines.line2b), true);
  fill(64, String(data.result.lines.line3b), true);
  // No foreign account: leave the conditional FBAR follow-up and countries blank.
  form.getCheckBox(check(1, false)).check();
  form.getCheckBox(check(3, false)).check();
  form.updateFieldAppearances(font);
  form.flatten();
  const doc = await PDFDocument.create();
  const [main] = await doc.copyPages(draft, [1]);
  doc.addPage(main);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const text = (
    page: PDFPage,
    value: string,
    x: number,
    y: number,
    width: number,
    heading = false,
  ) => {
    const f = heading ? bold : regular;
    page.drawText(value, {
      x,
      y,
      font: f,
      size: fit(f, value, width, heading ? 11 : 9),
    });
  };
  const statement = (title: string) => {
    const page = doc.addPage([612, 792]);
    text(page, `Schedule B (Form 1040) 2026 - ${title}`, 36, 748, 540, true);
    text(page, filer.name, 36, 726, 540);
    text(page, `SSN: ${filer.ssn}`, 36, 709, 540);
    return page;
  };
  const continuation = (
    items: Row[],
    slots: number,
    title: string,
    total: number,
  ) => {
    if (items.length <= slots) return;
    for (let start = 0; start < items.length; start += 30) {
      const page = statement(title);
      text(page, "Payer / adjustment", 36, 678, 410, true);
      text(page, "Amount", 470, 678, 106, true);
      items.slice(start, start + 30).forEach((row, i) => {
        text(page, row.payerName, 36, 654 - i * 18, 420);
        if (row.amount !== undefined) {
          const value = money(row.amount);
          const size = fit(regular, value, 106);
          page.drawText(value, {
            x: 576 - regular.widthOfTextAtSize(value, size),
            y: 654 - i * 18,
            size,
            font: regular,
          });
        }
      });
      text(
        page,
        `Complete statement: rows ${start + 1}-${
          Math.min(start + 30, items.length)
        } of ${items.length}`,
        36,
        95,
        540,
      );
      text(
        page,
        `Total reported on Schedule B (whole dollars): ${total}`,
        36,
        77,
        540,
      );
    }
  };
  continuation(
    data.interestRows,
    14,
    "Line 1 Interest",
    data.result.lines.line2b,
  );
  continuation(
    data.dividendRows,
    15,
    "Line 5 Ordinary Dividends",
    data.result.lines.line3b,
  );
  for (let start = 0; start < data.sellers.length; start += 7) {
    const page = statement("Line 1 Buyer Details");
    data.sellers.slice(start, start + 7).forEach(({ buyer, amount }, i) => {
      const y = 674 - i * 80;
      text(page, `${start + i + 1}. ${buyer.name}`, 36, y, 540);
      text(
        page,
        `SSN: ${buyer.ssn}    Interest: ${money(amount)}`,
        48,
        y - 16,
        528,
      );
      text(
        page,
        [buyer.address_line1, buyer.address_line2].filter(Boolean).join(", "),
        48,
        y - 32,
        528,
      );
      const location = buyer.address_type === "us"
        ? `${buyer.city}, ${buyer.state} ${buyer.zip}`
        : [
          buyer.city,
          buyer.province_or_state,
          buyer.country_code,
          buyer.foreign_postal_code,
        ].filter(Boolean).join(", ");
      text(page, location, 48, y - 48, 528);
    });
  }
  for (const page of doc.getPages()) {
    page.drawText("DRAFT - NOT FOR FILING", {
      x: 36,
      y: 12,
      size: 8,
      font: regular,
      color: rgb(.4, .1, .1),
    });
    page.node.delete(PDFName.of("Annots"));
  }
  doc.catalog.delete(PDFName.of("AcroForm"));
  return doc.save({ updateFieldAppearances: false });
}
