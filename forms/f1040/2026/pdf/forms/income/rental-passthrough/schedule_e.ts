import { scheduleEPdfFor } from "../../../../../2025/pdf/forms/income/rental-passthrough/schedule_e.ts";
import type { z } from "zod";
import { inputSchema } from "../../../../../nodes/inputs/income/rental-passthrough/schedule_e/index.ts";
import type {
  PdfFieldEntry,
  PdfFormDescriptor,
} from "../../../../../2025/pdf/review-support/form-descriptor.ts";
import { onTy2026Template, withoutStatements } from "../../../draft-template.ts";

// IRS 2026 Schedule E draft (page 1 is the IRS cover sheet). Line 1a splits
// each address into street, apt., city, state and ZIP; line 13 becomes 13a
// vehicle loan and 13b other, so the engine's one "other interest" amount
// prints on 13b. Lines 24-26 move to page 2 and Part V to a new page 3, so
// every later field renumbers.
const P1 = "topmostSubform[0].Page1[0]";
const P2 = "topmostSubform[0].Page2[0]";
const P3 = "topmostSubform[0].Page3[0]";
const ROWS = ["A", "B", "C"] as const;

const text = (domainKey: string, pdfField: string): PdfFieldEntry => ({
  kind: "text",
  domainKey,
  pdfField,
});

const range = (from: number, count: number) =>
  Array.from({ length: count }, (_, index) => from + index);

/** Page 1 fields keep their container and move by `by`. */
const shift = (
  container: string,
  from: number,
  count: number,
  by: number,
  target = container,
): Array<[string, string]> =>
  range(from, count).map((n) => [
    `${container}.f1_${n}[0]`,
    `${target}.f1_${n + by}[0]`,
  ]);

/** Page 2 fields after line 26 move by the three line 24-26 fields. */
const shift2 = (
  container: string,
  from: number,
  count: number,
): Array<[string, string]> =>
  range(from, count).map((n) => [
    `${container}.f2_${n}[0]`,
    `${container}.f2_${n + 3}[0]`,
  ]);

const expenses = `${P1}.Table_Expenses[0]`;
const expenseRename = (line: string, from: number, by: number, to = line) =>
  shift(
    `${expenses}.Line${line}[0]`,
    from,
    3,
    by,
    `${expenses}.Line${to}[0]`,
  );

const k1Rows = ["A", "B", "C", "D"];
const trustRows = ["A", "B"];

const rename: Readonly<Record<string, string>> = Object.fromEntries([
  ...ROWS.map((row, index): [string, string] => [
    `${P1}.Table_Line1b[0].Row${row}[0].f1_${6 + index}[0]`,
    `${P1}.Table_Line1b[0].Row${row}[0].f1_${18 + index}[0]`,
  ]),
  ...ROWS.flatMap((row, index) =>
    shift(`${P1}.Table_Line2[0].Row${row}[0]`, 9 + index * 2, 2, 12)
  ),
  [`${P1}.f1_15[0]`, `${P1}.f1_27[0]`],
  ...shift(`${P1}.Table_Income[0].Line3[0]`, 16, 3, 12),
  ...shift(`${P1}.Table_Income[0].Line4[0]`, 19, 3, 12),
  ...range(5, 14).flatMap((line) =>
    expenseRename(
      String(line),
      22 + (line - 5) * 3,
      line < 13 ? 12 : 18,
      line === 13 ? "13b" : String(line),
    )
  ),
  [`${expenses}.Line19[0].f1_64[0]`, `${expenses}.Line19[0].f1_82[0]`],
  ...expenseRename("19", 65, 18),
  ...expenseRename("20", 68, 18),
  ...expenseRename("21", 71, 18),
  ...expenseRename("22", 74, 18),
  ...shift(P1, 77, 5, 18),
  ...range(82, 3).map((n, index): [string, string] => [
    `${P1}.f1_${n}[0]`,
    `${P2}.f2_${3 + index}[0]`,
  ]),
  ...k1Rows.flatMap((row, index) => [
    ...shift2(`${P2}.Table_Line28a-f[0].Row${row}[0]`, 3 + index * 3, 3),
    ...shift2(`${P2}.Table_Line28g-k[0].Row${row}[0]`, 15 + index * 5, 5),
  ]),
  ...shift2(P2, 35, 13),
  ...trustRows.flatMap((row, index) => [
    ...shift2(`${P2}.Table_Line33a-b[0].Row${row}[0]`, 48 + index * 2, 2),
    ...shift2(`${P2}.Table_Line33c-f[0].Row${row}[0]`, 52 + index * 4, 4),
  ]),
  ...shift2(P2, 60, 11),
  [`${P2}.f2_77[0]`, `${P3}.f3_3[0]`],
  [`${P2}.f2_78[0]`, `${P3}.f3_4[0]`],
  [`${P2}.Line42_ReadOrder[0].f2_79[0]`, `${P3}.Line42_ReadOrder[0].f3_5[0]`],
]);

const addressFields: readonly PdfFieldEntry[] = ROWS.flatMap((row, index) =>
  ["street", "apt", "city", "state", "zip"].map((part, column) =>
    text(
      `ty2026_property_${index}_${part}`,
      `${P1}.Line1aTable[0].Row${row}[0].f1_${3 + index * 5 + column}[0]`,
    )
  )
);

/** Part I needs page 2 for lines 24-26; Part V is on page 3. */
function scheduleEPages(fields: Record<string, unknown>): number[] {
  const partI = fields.line26 !== undefined;
  const partIIOrIII = fields.trust_line37 !== undefined ||
    fields.k1_line32 !== undefined;
  const partV = fields.farm_line40 !== undefined ||
    fields.trust_line41 !== undefined;
  const pages = [
    ...(partI || !(partIIOrIII || partV) ? [0] : []),
    ...(partI || partIIOrIII ? [1] : []),
    ...(partV ? [2] : []),
  ];
  return pages;
}

const onPage = (page: number) => (fields: Record<string, unknown>) =>
  scheduleEPages(fields).includes(page);

const filerFields: PdfFormDescriptor["filerFields"] = [
  [`${P1}.f1_1[0]`, `${P1}.f1_2[0]`, 0],
  [`${P2}.f2_1[0]`, `${P2}.f2_2[0]`, 1],
  [`${P3}.f3_1[0]`, `${P3}.f3_2[0]`, 2],
].flatMap(([name, ssn, page]) => [
  {
    kind: "text" as const,
    domainKey: "nameShownOnForm1040",
    pdfField: String(name),
    includeWhen: onPage(Number(page)),
  },
  {
    kind: "text" as const,
    domainKey: "primarySSN",
    pdfField: String(ssn),
    includeWhen: onPage(Number(page)),
  },
]);

const TEMPLATE = {
  pdfUrl: "https://www.irs.gov/pub/irs-dft/f1040se--dft.pdf",
  pdfSha256: "0bee231f1ecb2470fb884b1f9cee7707eddee8994ce479fc563850b2dd3c5aed",
  formPages: [1, 2, 3],
};

const base = scheduleEPdfFor(2026);
const draft = onTy2026Template(
  { ...base, pageIndices: scheduleEPages, filerFields: undefined },
  TEMPLATE,
  rename,
  ROWS.map((_, index) => `property_${index}_address`),
  addressFields,
);

type Projected = Record<string, unknown>;
type ScheduleEProperty = z.infer<typeof inputSchema>["schedule_es"][number];

function splitAddresses(
  copy: Projected,
  properties: ReadonlyArray<ScheduleEProperty>,
): Projected {
  return {
    ...copy,
    ...Object.fromEntries(
      properties.flatMap((item, index) =>
        item.property_type === 6 ? [] : [
          [`ty2026_property_${index}_street`, item.street_address],
          [`ty2026_property_${index}_city`, item.city],
          [`ty2026_property_${index}_state`, item.state],
          [`ty2026_property_${index}_zip`, item.zip],
        ]
      ),
    ),
  };
}

export const scheduleEPdf2026: PdfFormDescriptor = withoutStatements(
  {
    ...draft,
    filerFields,
    projectFields(raw, allPending) {
      const projected = base.projectFields?.(raw, allPending) ?? raw;
      if (Number(projected.nonpassive_activity_amount ?? 0) !== 0) {
        throw new Error(
          "TY2026 PDF Schedule E nonpassive activity notation is not mapped; export MeF XML",
        );
      }
      const items = Object.keys(raw).length === 0
        ? []
        : inputSchema.parse(raw).schedule_es;
      const continuations = projected.partIContinuationPages;
      return {
        ...splitAddresses(projected, items.slice(0, 3)),
        ...(Array.isArray(continuations)
          ? {
            partIContinuationPages: continuations.map((copy, page) =>
              splitAddresses(
                copy as Projected,
                items.slice(3 + page * 3, 6 + page * 3),
              )
            ),
          }
          : {}),
      };
    },
    decoratePages: undefined,
  },
  "Schedule E",
);
