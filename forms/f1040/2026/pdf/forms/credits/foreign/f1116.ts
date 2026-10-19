import { form1116PdfFor } from "../../../../../2025/pdf/forms/credits/foreign/f1116/f1116.ts";
import type { PdfFormDescriptor } from "../../../../../2025/pdf/review-support/form-descriptor.ts";
import { onTy2026Template, withoutStatements } from "../../../draft-template.ts";

// IRS 2026 Form 1116 draft (page 1 is the IRS cover sheet). Page 1 holds only
// Part I, whose fields from line 1a column A on drop two numbers. Part II moves
// to page 2 and splits into foreign-currency columns (l)-(q) and U.S.-dollar
// columns (r)-(w), adding PTEP columns the graph leaves empty; Parts III-IV
// follow on page 2 with their 2025 numbers raised by 43.
const P1 = "topmostSubform[0].Page1[0]";
const P2 = "topmostSubform[0].Page2[0]";

const part1 = Array.from({ length: 42 }, (_, i) => 10 + i).map((n) => {
  const old = `f1_${n}[0]`;
  const neu = `f1_${String(n - 2).padStart(2, "0")}[0]`;
  const line1a = ["ColA", "ColB", "ColC"][n - 10];
  if (line1a) {
    const at = `${P1}.Table_Part1_LinesI-1a[0].Line1a[0].${line1a}[0]`;
    return [`${at}.${old}`, `${at}.${neu}`];
  }
  if (n === 13 || n >= 50) return [`${P1}.${old}`, `${P1}.${neu}`];
  const line = [
    "Line2",
    "Line3a",
    "Line3b",
    "Line3c",
    "Line3d",
    "Line3e",
    "Line3f",
    "Line3g",
    "Line4a",
    "Line4b",
    "Line5",
    "Line6",
  ][Math.floor((n - 14) / 3)];
  const at = `${P1}.Table_Part1_Lines2-6[0].${line}[0]`;
  return [`${at}.${old}`, `${at}.${neu}`];
});

// 2025 row columns (l) date, (m)-(p) foreign currency, (q)-(t) U.S. dollars,
// (u) total, mapped onto the 2026 (l)-(o), (q), (r)-(t), (v), (w).
const PART2_COLUMNS: readonly (readonly ["L-Q" | "R-W", number])[] = [
  ["L-Q", 1],
  ["L-Q", 2],
  ["L-Q", 3],
  ["L-Q", 4],
  ["L-Q", 7],
  ["R-W", 22],
  ["R-W", 23],
  ["R-W", 24],
  ["R-W", 27],
  ["R-W", 28],
];
const part2 = ["A", "B", "C"].flatMap((row, index) =>
  PART2_COLUMNS.map(([table, number], column) => [
    `${P1}.Table_Part2[0].Row${row}[0].f1_${52 + index * 10 + column}[0]`,
    `${P2}.Table_Part2_Cols${table}[0].Row${row}[0].f2_${
      String(number + index * 7).padStart(2, "0")
    }[0]`,
  ])
);

const part3 = Array.from({ length: 27 }, (_, i) => i + 1).map((n) => {
  const old = `f2_${String(n).padStart(2, "0")}[0]`;
  const neu = `f2_${n + 43}[0]`;
  const group = n === 1 ? "Line9_ReadOrder[0]." : n === 7
    ? "Line15_ReadOrder[0]."
    : "";
  return [`${P2}.${group}${old}`, `${P2}.${group}${neu}`];
});

const rename: Readonly<Record<string, string>> = Object.fromEntries([
  ...part1,
  ...part2,
  ...part3,
  [`${P1}.f1_82[0]`, `${P2}.f2_43[0]`],
  ...[0, 1].map((box) => [
    `${P1}.Part2[0].ActiveHeaderElements[0].c1_3[${box}]`,
    `${P2}.Credit_ReadOrder[0].c2_1[${box}]`,
  ]),
  [`${P2}.Line10_ReadOrder[0].c2_1[0]`, `${P2}.Line10_ReadOrder[0].c2_2[0]`],
]);

export const form1116Pdf2026: PdfFormDescriptor = withoutStatements(
  onTy2026Template(
    form1116PdfFor(2026),
    {
      pdfUrl: "https://www.irs.gov/pub/irs-dft/f1116--dft.pdf",
      pdfSha256:
        "9899d7fbd5401ca26d5677cbc87e221c983c86f8f43130347e8f2329cc6c9779",
      formPages: [1, 2],
    },
    rename,
  ),
  "Form 1116",
);
