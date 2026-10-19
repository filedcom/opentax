import { form8962PdfFor } from "../../../../../2025/pdf/forms/credits/health/f8962.ts";
import type { PdfFormDescriptor } from "../../../../../2025/pdf/review-support/form-descriptor.ts";
import { onTy2026Template, withoutStatements } from "../../../draft-template.ts";

// IRS 2026 Form 8962 draft (page 1 is the IRS cover sheet). Line 6 is now the
// 401% question; the Part II tables drop one field number; line 27 goes
// straight to Schedule 2 and lines 28-29 are reserved (no repayment cap).
const P1 = "topmostSubform[0].Page1[0]";
const P2 = "topmostSubform[0].Page2[0]";

const shifted = (n: number) => n - 1;
const rename: Readonly<Record<string, string>> = Object.fromEntries([
  ...[0, 1, 2].map((box) => [
    `${P1}.c1_2[${box}]`,
    `${P1}.Line4_ReadOrder[0].c1_2[${box}]`,
  ]),
  ...Array.from({ length: 6 }, (_, i) => 13 + i).map((n) => [
    `${P1}.Part2Table1[0].BodyRow1[0].f1_${n}[0]`,
    `${P1}.Part2_Table1[0].BodyRow1[0].f1_${shifted(n)}[0]`,
  ]),
  ...Array.from({ length: 72 }, (_, i) => 19 + i).map((n) => {
    const row = Math.floor((n - 19) / 6) + 1;
    return [
      `${P1}.Part2Table2[0].BodyRow${row}[0].f1_${n}[0]`,
      `${P1}.Part2_Table2[0].BodyRow${row}[0].f1_${shifted(n)}[0]`,
    ];
  }),
  ...[91, 92, 93, 94].map((n) => [
    `${P1}.f1_${n}[0]`,
    `${P1}.f1_${shifted(n)}[0]`,
  ]),
  ...[30, 31, 32, 33].flatMap((line, row) =>
    (["e", "f"] as const).map((column, i) => {
      const field = `f2_${row * 7 + 5 + i}[0]`;
      return [
        `${P2}.Lines${line}e-g[0].${field}`,
        `${P2}.Lines${line}e-g[0].Line${line}${column}[0].${field}`,
      ];
    })
  ),
]);

const base = onTy2026Template(
  form8962PdfFor(2026),
  {
    pdfUrl: "https://www.irs.gov/pub/irs-dft/f8962--dft.pdf",
    pdfSha256:
      "5b692171ee43a4596eabfcaad83bea920e6356c492656a1648f2aaf018cd1d35",
    formPages: [1, 2],
  },
  rename,
  ["repayment_limitation", "excess_advance_premium"],
  [
    { kind: "checkbox", domainKey: "pdf_line6_no", pdfField: `${P1}.c1_3[0]` },
    { kind: "checkbox", domainKey: "pdf_line6_yes", pdfField: `${P1}.c1_3[1]` },
  ],
);

export const form8962Pdf2026: PdfFormDescriptor = withoutStatements({
  ...base,
  projectFields(fields, allPending) {
    const repaid = fields.excess_advance_premium ?? 0;
    if (
      fields.repayment_limitation !== undefined ||
      repaid !== (fields.excess_advance_payment ?? 0)
    ) {
      throw new Error(
        "TY2026 PDF Form 8962 line 27 needs the uncapped excess advance PTC; lines 28-29 are reserved",
      );
    }
    return base.projectFields?.(fields, allPending) ?? fields;
  },
}, "Form 8962");
