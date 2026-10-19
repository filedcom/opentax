import { scheduleCPdfFor } from "../../../../../2025/pdf/forms/income/business/schedule_c.ts";
import type {
  PdfFieldEntry,
  PdfFormDescriptor,
} from "../../../../../2025/pdf/review-support/form-descriptor.ts";
import { onTy2026Template } from "../../../draft-template.ts";

// IRS 2026 Schedule C draft (page 1 is the IRS cover sheet). Line E splits
// the address into street, apt., city, state and ZIP; line F gains "Other";
// line 16 becomes 16a mortgage, 16b vehicle loan and 16c other, so the
// fields after line E renumber. The engine keeps one "other interest" amount,
// printed on 16c. Part V rows leave their table container.
const P1 = "topmostSubform[0].Page1[0]";
const P2 = "topmostSubform[0].Page2[0]";

const lineE: ReadonlyArray<readonly [string, string]> = [
  ["ty2026_business_street", `${P1}.f1_7[0]`],
  ["ty2026_business_apt", `${P1}.f1_8[0]`],
  ["ty2026_business_city", `${P1}.f1_9[0]`],
  ["ty2026_business_state", `${P1}.f1_10[0]`],
  ["ty2026_business_zip", `${P1}.f1_11[0]`],
];

const rename: Readonly<Record<string, string>> = {
  [`${P1}.BComb[0].f1_4[0]`]: `${P1}.f1_4[0]`,
  [`${P1}.DComb[0].f1_6[0]`]: `${P1}.BoxD[0].f1_6[0]`,
  ...Object.fromEntries(
    Array.from({ length: 7 }, (_, index) => [
      `${P1}.f1_${10 + index}[0]`,
      `${P1}.f1_${13 + index}[0]`,
    ]),
  ),
  ...Object.fromEntries(
    [20, 21, 22, 23, 24, 25, 26, 27, 28, 31, 32].map((number, index) => [
      `${P1}.Lines8-17[0].f1_${17 + index}[0]`,
      `${P1}.Lines8-16c_ReadOrder[0].f1_${number}[0]`,
    ]),
  ),
  ...Object.fromEntries(
    Array.from({ length: 11 }, (_, index) => [
      `${P1}.Lines18-27[0].f1_${28 + index}[0]`,
      `${P1}.f1_${33 + index}[0]`,
    ]),
  ),
  [`${P1}.Lines18-27[0].f1_40[0]`]: `${P1}.f1_44[0]`,
  [`${P1}.Lines18-27[0].f1_39[0]`]: `${P1}.f1_45[0]`,
  [`${P1}.f1_41[0]`]: `${P1}.f1_46[0]`,
  [`${P1}.f1_42[0]`]: `${P1}.f1_47[0]`,
  [`${P1}.Line30_ReadOrder[0].f1_43[0]`]: `${P1}.Line30_ReadOrder[0].f1_48[0]`,
  [`${P1}.Line30_ReadOrder[0].f1_44[0]`]: `${P1}.Line30_ReadOrder[0].f1_49[0]`,
  [`${P1}.f1_45[0]`]: `${P1}.f1_50[0]`,
  [`${P1}.f1_46[0]`]: `${P1}.f1_51[0]`,
};

const base = scheduleCPdfFor(2026);
const draft = onTy2026Template(
  base,
  {
    pdfUrl: "https://www.irs.gov/pub/irs-dft/f1040sc--dft.pdf",
    pdfSha256:
      "287b4510dd847c11f6cbbcc98fee05ac5ff187cc18e1413f8759a4a7cd802224",
    formPages: [1, 2],
  },
  rename,
  ["business_street", "business_city_state_zip"],
  lineE.map(([domainKey, pdfField]): PdfFieldEntry => ({
    kind: "text",
    domainKey,
    pdfField,
  })),
);

function splitAddress(copy: Record<string, unknown>): Record<string, unknown> {
  const address = copy.line_e_business_address as
    | { line1: string; line2?: string; city: string; state: string; zip: string }
    | undefined;
  if (!address) return copy;
  return {
    ...copy,
    ty2026_business_street: address.line1,
    ty2026_business_apt: address.line2,
    ty2026_business_city: address.city,
    ty2026_business_state: address.state,
    ty2026_business_zip: address.zip,
  };
}

export const scheduleCPdf2026: PdfFormDescriptor = {
  ...draft,
  projectFields(raw, allPending) {
    const projected = base.projectFields?.(raw, allPending) ?? raw;
    const copies = projected.schedule_c_instances as Record<string, unknown>[];
    return { ...projected, schedule_c_instances: copies.map(splitAddress) };
  },
  rows: {
    domainKey: "part_v_other_expenses",
    maxRows: 9,
    rowStride: 2,
    rowFields: [
      {
        kind: "text",
        domainKey: "description",
        pdfFieldPattern: `${P2}.f2_{field_num}[0]`,
        fieldNumBase: 15,
      },
      {
        kind: "text",
        domainKey: "amount",
        pdfFieldPattern: `${P2}.f2_{field_num}[0]`,
        fieldNumBase: 16,
      },
    ],
  },
};
