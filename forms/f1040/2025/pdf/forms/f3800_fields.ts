/** Field paths inspected from the official TY2025 nine-page IRS Form 3800. */
const root = "topmostSubform[0]";

export const form3800HeaderFields = {
  filerName: `${root}.Page1[0].f1_1[0]`,
  filerTin: `${root}.Page1[0].f1_2[0]`,
  camtAndBeatYes: `${root}.Page1[0].c1_1[0]`,
  camtAndBeatNo: `${root}.Page1[0].c1_1[1]`,
  transferElectionYes: `${root}.Page1[0].c1_2[0]`,
  transferElectionNo: `${root}.Page1[0].c1_2[1]`,
  transferStatementCount: `${root}.Page1[0].f1_3[0]`,
  line4RevisedCarryforward: `${root}.Page1[0].c1_3[0]`,
  line34RevisedCarryforward: `${root}.Page2[0].c2_1[0]`,
} as const;

export const form3800PartIAndIIFields = {
  line1: `${root}.Page1[0].f1_4[0]`,
  line2: `${root}.Page1[0].Line2_ReadOrder[0].f1_5[0]`,
  line3: `${root}.Page1[0].f1_6[0]`,
  line4: `${root}.Page1[0].f1_7[0]`,
  line5: `${root}.Page1[0].f1_8[0]`,
  line6: `${root}.Page1[0].f1_9[0]`,
  line7: `${root}.Page1[0].f1_10[0]`,
  line8: `${root}.Page1[0].f1_11[0]`,
  line9: `${root}.Page1[0].f1_12[0]`,
  line10a: `${root}.Page1[0].f1_13[0]`,
  line10b: `${root}.Page1[0].f1_14[0]`,
  line10c: `${root}.Page1[0].f1_15[0]`,
  line11: `${root}.Page1[0].f1_16[0]`,
  line12: `${root}.Page1[0].f1_17[0]`,
  line13: `${root}.Page1[0].f1_18[0]`,
  line14: `${root}.Page1[0].f1_19[0]`,
  line15: `${root}.Page1[0].f1_20[0]`,
  line16: `${root}.Page1[0].f1_21[0]`,
  line17: `${root}.Page1[0].f1_22[0]`,
  line18: `${root}.Page2[0].f2_1[0]`,
  line19: `${root}.Page2[0].f2_2[0]`,
  line20: `${root}.Page2[0].f2_3[0]`,
  line21: `${root}.Page2[0].f2_4[0]`,
  line22: `${root}.Page2[0].f2_5[0]`,
  line23: `${root}.Page2[0].f2_6[0]`,
  line24: `${root}.Page2[0].f2_7[0]`,
  line25: `${root}.Page2[0].f2_8[0]`,
  line26: `${root}.Page2[0].f2_9[0]`,
  line27: `${root}.Page2[0].f2_10[0]`,
  line28: `${root}.Page2[0].f2_11[0]`,
  line29: `${root}.Page2[0].f2_12[0]`,
  line30: `${root}.Page2[0].f2_13[0]`,
  line32: `${root}.Page2[0].f2_15[0]`,
  line33: `${root}.Page2[0].f2_16[0]`,
  line34: `${root}.Page2[0].f2_17[0]`,
  line35: `${root}.Page2[0].f2_18[0]`,
  line36: `${root}.Page2[0].f2_19[0]`,
  line37: `${root}.Page2[0].f2_20[0]`,
  line38: `${root}.Page2[0].f2_21[0]`,
} as const;

const letters = "abcdefghijklmnopqrstuvwxyz".split("");
const partIIIPage3 = [
  ...letters.map((letter) => `1${letter}`),
  ...["aa", "bb", "cc", "dd", "ee", "ff", "gg", "hh", "ii"]
    .map((suffix) => `1${suffix}`),
  "1zz",
  "2",
];
const partIIIPage4 = [
  "3",
  ...letters.slice(0, 13).map((letter) => `4${letter}`),
  "4z",
  "5",
  "6",
];
export const form3800PartIIILines = [...partIIIPage3, ...partIIIPage4] as const;
const partIVPage5 = [
  ...letters.map((letter) => `1${letter}`),
  ...["aa", "bb", "cc", "dd", "ee", "ff", "gg", "hh", "ii", "jj"]
    .map((suffix) => `1${suffix}`),
  "1zz",
];
const partIVPage6 = [
  ...letters.map((letter) => `2${letter}`),
  "2zz",
  "3",
];
const partIVPage7 = [
  ...letters.slice(0, 13).map((letter) => `4${letter}`),
  "4y",
  "4z",
  "5",
  "6",
  "7",
];
export const form3800PartIVLines = [
  ...partIVPage5,
  ...partIVPage6,
  ...partIVPage7,
] as const;

function rowFields(
  line: string,
  layouts: readonly {
    page: number;
    rows: readonly string[];
    columns: string;
  }[],
): Readonly<Record<string, string>> {
  for (const { page, rows, columns } of layouts) {
    const index = rows.indexOf(line);
    if (index < 0) continue;
    const count = columns.length;
    return Object.fromEntries(
      columns.split("").map((column, offset) => [
        column,
        `${root}.Page${page}[0].Pg${page}Table[0].Line${line}[0].f${page}_${
          index * count + offset + 1
        }[0]`,
      ]),
    );
  }
  throw new Error(`Form 3800 printed row ${line} is not on this part`);
}

/** Exact Part III columns (a)-(j), pages 3-4. */
export function form3800PartIIIFields(
  line: string,
): Readonly<Record<string, string>> {
  return rowFields(line, [
    { page: 3, rows: partIIIPage3, columns: "abcdefghij" },
    { page: 4, rows: partIIIPage4, columns: "abcdefghij" },
  ]);
}

/** Exact Part IV columns (a)-(i), pages 5-7. */
export function form3800PartIVFields(
  line: string,
): Readonly<Record<string, string>> {
  return rowFields(line, [
    { page: 5, rows: partIVPage5, columns: "abcdefghi" },
    { page: 6, rows: partIVPage6, columns: "abcdefghi" },
    { page: 7, rows: partIVPage7, columns: "abcdefghi" },
  ]);
}

const partVFirstColumns = [
  "a",
  "b",
  "c1",
  "c2",
  "d1",
  "d2",
  "d3",
  "d4",
  "e",
  "f1",
];
const partVSecondColumns = ["f2", "g", "h1", "h2", "i1", "i2", "j", "k"];

/** Exact Part V columns, page 8, for one-based printed rows 1-15. */
export function form3800PartVFields(
  row: number,
): Readonly<Record<string, string>> {
  if (!Number.isInteger(row) || row < 1 || row > 15) {
    throw new Error("Form 3800 Part V printed row must be 1-15");
  }
  return Object.fromEntries([
    ...partVFirstColumns.map((column, offset) => [
      column,
      `${root}.Page8[0].Pg8Table_1[0].Line${row}[0].f8_${
        (row - 1) * 10 + offset + 1
      }[0]`,
    ]),
    ...partVSecondColumns.map((column, offset) => [
      column,
      `${root}.Page8[0].Pg8Table_2[0].Line${row}[0].f8_${
        150 + (row - 1) * 8 + offset + 1
      }[0]`,
    ]),
  ]);
}

/** Exact Part VI columns (a)-(i), page 9, for printed rows 1-35. */
export function form3800PartVIFields(
  row: number,
): Readonly<Record<string, string>> {
  if (!Number.isInteger(row) || row < 1 || row > 35) {
    throw new Error("Form 3800 Part VI printed row must be 1-35");
  }
  return Object.fromEntries(
    "abcdefghi".split("").map((column, offset) => [
      column,
      `${root}.Page9[0].Pg9Table[0].Line${row}[0].f9_${
        (row - 1) * 9 + offset + 1
      }[0]`,
    ]),
  );
}
