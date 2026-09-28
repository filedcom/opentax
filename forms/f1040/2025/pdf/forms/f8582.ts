import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import { form8582 as nativeForm8582 } from "../../mef/forms/f8582.ts";
import { inputSchema } from "../../../nodes/intermediate/forms/form8582/index.ts";

// The actual 2025 AcroForm has five rows each in Parts IV–VIII and a single
// three-line Part IX block. Project the native, source-reconciled worksheet;
// never put raw Schedule C/F aggregates directly on the printed form.
const p1 = "topmostSubform[0].Page1[0]";
const p2 = "topmostSubform[0].Page2[0]";
const p3 = "topmostSubform[0].Page3[0]";

type Pair = readonly [string, string];
type PdfTable = {
  readonly part: string;
  readonly page: string;
  readonly first: number;
  readonly columns: readonly string[];
  readonly parentTag: string;
  readonly rowTag: string;
  readonly tags: readonly Pair[];
};

const tables: readonly PdfTable[] = [
  {
    part: "4",
    page: p1,
    first: 20,
    columns: ["name", "income", "loss", "prior", "gain", "overall_loss"],
    parentTag: "ParentWrkshtRentalActGrp",
    rowTag: "WrkshtRentalActGrp",
    tags: [
      ["name", "PassiveActivityNm"],
      ["income", "CurrentYearNetIncomeAmt"],
      ["loss", "CurrentYearNetLossAmt"],
      ["prior", "PriorYearRentalUnallowedAmt"],
      ["gain", "OverallGainAmt"],
      ["overall_loss", "OverallLossAmt"],
    ],
  },
  {
    part: "5",
    page: p2,
    first: 1,
    columns: ["name", "income", "loss", "prior", "gain", "overall_loss"],
    parentTag: "ParentWrkshtPassiveGrp",
    rowTag: "WrkshtPassiveGrp",
    tags: [
      ["name", "NonParticipateActivityNm"],
      ["income", "CurrentYearNetIncomeAmt"],
      ["loss", "CurrentYearNetLossAmt"],
      ["prior", "PriorYearUnallowedLossesAmt"],
      ["gain", "OverallGainAmt"],
      ["overall_loss", "OverallLossAmt"],
    ],
  },
  {
    part: "6",
    page: p2,
    first: 36,
    columns: ["name", "form", "loss", "ratio", "allowance", "remainder"],
    parentTag: "ParentWrkshtAllowanceGrp",
    rowTag: "WrkshtAllowanceGrp",
    tags: [
      ["name", "SpecialAllowanceActivityNm"],
      ["form", "ReportingFormOrScheduleNm"],
      ["loss", "F8582WrkshtLossesAmt"],
      ["ratio", "LossesPct"],
      ["allowance", "SpecialAllowanceAmt"],
      ["remainder", "NetSpecialAllowanceAmt"],
    ],
  },
  {
    part: "7",
    page: p2,
    first: 70,
    columns: ["name", "form", "loss", "ratio", "unallowed"],
    parentTag: "ParentWrkshtLossGrp",
    rowTag: "WrkshtLossGrp",
    tags: [
      ["name", "UnallowedLossActivityNm"],
      ["form", "ReportingFormOrScheduleNm"],
      ["loss", "F8582WrkshtLossesAmt"],
      ["ratio", "LossesPct"],
      ["unallowed", "PriorYearUnallowedLossesAmt"],
    ],
  },
  {
    part: "VIII",
    page: p2,
    first: 98,
    columns: ["name", "form", "loss", "unallowed", "allowed"],
    parentTag: "ParentWrkshtListActivityGrp",
    rowTag: "WrkshtListActivityGrp",
    tags: [
      ["name", "AllowedLossActivityNm"],
      ["form", "ReportingFormOrScheduleNm"],
      ["loss", "F8582WrkshtLossesAmt"],
      ["unallowed", "PriorYearUnallowedLossesAmt"],
      ["allowed", "F8582WrkshtAllowedLossesAmt"],
    ],
  },
];

const lineTags: readonly Pair[] = [
  ["line1a", "RentalRealtyIncomeAmt"],
  ["line1b", "RentalRealtyLossAmt"],
  ["line1c", "PYUnallowedRentalLossAmt"],
  ["line1d", "NetRentalRealtyAmt"],
  ["line2a", "OtherActivityIncomeAmt"],
  ["line2b", "OtherActivityLossAmt"],
  ["line2c", "PriorYearUnallowedOtherLossAmt"],
  ["line2d", "NetOtherActivityAmt"],
  ["line3", "TotalPassiveActivityAmt"],
  ["line4", "RentalRealtyLossLimitAmt"],
  ["line5", "MaximumAllowedIncomeAmt"],
  ["line6", "ModifiedAGIAmt"],
  ["line7", "ModifiedAGIDifferenceAmt"],
  ["line8", "PercentNetSpecialAllowanceAmt"],
  ["line9", "AllowedRentalRealtyLossAmt"],
  ["line10", "TotalIncomeAmt"],
  ["line11", "TotalLossesAllowedAmt"],
];

const totals: readonly {
  readonly parentTag: string;
  readonly fields: readonly Pair[];
}[] = [
  {
    parentTag: "ParentWrkshtRentalActGrp",
    fields: [["part4_total_income", "TotalCurrentYearNetIncomeAmt"], [
      "part4_total_loss",
      "TotalCurrentYearNetLossAmt",
    ], ["part4_total_prior", "TotalPriorYrRentalUnallowedAmt"]],
  },
  {
    parentTag: "ParentWrkshtPassiveGrp",
    fields: [["part5_total_income", "TotalOtherCurrentYearIncomeAmt"], [
      "part5_total_loss",
      "TotalOtherCurrentYearLossAmt",
    ], ["part5_total_prior", "TotalOtherPYUnallowedAmt"]],
  },
  {
    parentTag: "ParentWrkshtAllowanceGrp",
    fields: [["part6_total_loss", "TotalLossAmt"], [
      "part6_total_allowance",
      "TotalSpecialAllowanceAmt",
    ], ["part6_total_remainder", "TotalNetSpecialAllowanceAmt"]],
  },
  {
    parentTag: "ParentWrkshtLossGrp",
    fields: [["part7_total_loss", "TotalAllocationLossAmt"], [
      "part7_total_unallowed",
      "TotalLossAmt",
    ]],
  },
  {
    parentTag: "ParentWrkshtListActivityGrp",
    fields: [["part8_total_loss", "TotalLossAmt"], [
      "part8_total_unallowed",
      "TotalUnallowedLossAmt",
    ], ["part8_total_allowed", "TotalAllowedLossAmt"]],
  },
];

function pdfText(key: string, field: string): PdfFieldEntry {
  return { kind: "text", domainKey: key, pdfField: field };
}

function pageField(page: string, number: number): string {
  return `${page}.f${page === p1 ? 1 : 2}_${
    String(number).padStart(2, "0")
  }[0]`;
}

function tableField(
  table: PdfTable,
  row: number,
  column: number,
): PdfFieldEntry {
  const number = table.first + (row - 1) * table.columns.length + column;
  return pdfText(
    `part${table.part}_${row}_${table.columns[column]}`,
    `${table.page}.Table_Part${table.part}[0].Row${row}[0].f${
      table.page === p1 ? 1 : 2
    }_${String(number).padStart(2, "0")}[0]`,
  );
}

const fields: ReadonlyArray<PdfFieldEntry> = [
  ...lineTags.map(([key], index) => pdfText(key, pageField(p1, index + 3))),
  ...tables.flatMap((table) =>
    Array.from(
      { length: 5 },
      (_, index) =>
        table.columns.map((_, column) => tableField(table, index + 1, column)),
    ).flat()
  ),
  ...["income", "loss", "prior", "gain", "overall_loss"].map((key, index) =>
    pdfText(
      `part4_total_${key}`,
      `${p1}.Table_Part4[0].Row6[0].f1_${50 + index}[0]`,
    )
  ),
  ...["income", "loss", "prior", "gain", "overall_loss"].map((key, index) =>
    pdfText(
      `part5_total_${key}`,
      `${p2}.Table_Part5[0].Total[0].f2_${31 + index}[0]`,
    )
  ),
  ...([
    ["part6_total_loss", 66],
    ["part6_total_allowance", 68],
    ["part6_total_remainder", 69],
    ["part7_total_loss", 95],
    ["part7_total_unallowed", 97],
    ["part8_total_loss", 123],
    ["part8_total_unallowed", 124],
    ["part8_total_allowed", 125],
  ] as const).map(([key, number]) => pdfText(key, pageField(p2, number))),
  pdfText("part9_name", `${p3}.f3_01[0]`),
  ...[2, 9, 16].flatMap((first, index) => {
    const container = `${p3}.Form${index + 1}_NotATable[0]`;
    return [
      pdfText(
        `part9_${index + 1}_form`,
        `${container}.Form${index + 1}_ReadOrder[0].f3_${
          String(first).padStart(2, "0")
        }[0]`,
      ),
      ...["loss", "income", "net", "ratio", "unallowed", "allowed"].map((
        key,
        offset,
      ) =>
        pdfText(
          `part9_${index + 1}_${key}`,
          `${container}.f3_${String(first + offset + 1).padStart(2, "0")}[0]`,
        )
      ),
    ];
  }),
  ...([["part9_total_net", 23], ["part9_total_unallowed", 25], [
    "part9_total_allowed",
    26,
  ]] as const).map(([key, number]) => pdfText(key, `${p3}.f3_${number}[0]`)),
];

function content(xml: string, tag: string): string | undefined {
  return new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`).exec(xml)?.[1];
}

function groups(xml: string, tag: string): string[] {
  return [...xml.matchAll(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "g"))]
    .map((match) => match[1]);
}

function value(xml: string, tag: string): string | undefined {
  return content(xml, tag)?.replace(/&(?:amp|lt|gt|quot|apos);/g, (entity) =>
    ({
      "&amp;": "&",
      "&lt;": "<",
      "&gt;": ">",
      "&quot;": '"',
      "&apos;": "'",
    })[entity] ?? entity);
}

function copy(
  target: Record<string, unknown>,
  xml: string,
  pairs: readonly Pair[],
  prefix = "",
): void {
  for (const [key, tag] of pairs) {
    const found = value(xml, tag);
    if (found !== undefined) target[`${prefix}${key}`] = found;
  }
}

function sumRows(rows: readonly string[], tag: string): number {
  return rows.reduce((sum, row) => sum + Number(value(row, tag) ?? 0), 0);
}

function projectWorksheet(xml: string): Record<string, unknown> {
  const projected: Record<string, unknown> = {};
  copy(projected, xml, lineTags);
  for (const table of tables) {
    const parent = content(xml, table.parentTag);
    if (parent === undefined) continue;
    const rows = groups(parent, table.rowTag);
    if (rows.length > 5) {
      throw new Error(
        `Form 8582 PDF Part ${table.part} exceeds five printed rows`,
      );
    }
    rows.forEach((row, index) =>
      copy(projected, row, table.tags, `part${table.part}_${index + 1}_`)
    );
    if (table.part === "4" || table.part === "5") {
      projected[`part${table.part}_total_gain`] = sumRows(
        rows,
        "OverallGainAmt",
      );
      projected[`part${table.part}_total_overall_loss`] = sumRows(
        rows,
        "OverallLossAmt",
      );
    }
  }
  for (const total of totals) {
    const parent = content(xml, total.parentTag);
    if (parent !== undefined) copy(projected, parent, total.fields);
  }
  for (const [part, prefix] of [["4", "line1"], ["5", "line2"]] as const) {
    for (
      const [column, line] of [["income", "a"], ["loss", "b"], [
        "prior",
        "c",
      ]] as const
    ) {
      const printedTotal = Number(
        projected[`part${part}_total_${column}`] ?? 0,
      );
      const nativeLine = Number(projected[`${prefix}${line}`] ?? 0);
      if (printedTotal !== nativeLine) {
        throw new Error(
          `Form 8582 PDF Part ${part} rows do not reconcile to Part I ${prefix}${line}`,
        );
      }
    }
  }
  const part9 = groups(xml, "ParentWrkshtLossActivityGrp");
  if (part9.length > 1) {
    throw new Error("Form 8582 PDF Part IX exceeds one printed activity block");
  }
  if (part9.length === 1) {
    copy(projected, part9[0], [["part9_name", "MultipleLossActivityNm"]]);
    const rows = groups(part9[0], "WrkshtLossActivityGrp");
    if (rows.length > 3) {
      throw new Error("Form 8582 PDF Part IX exceeds three printed form lines");
    }
    rows.forEach((row, index) =>
      copy(projected, row, [
        ["form", "ReportingFormOrScheduleNm"],
        ["loss", "NetLossAmt"],
        ["income", "NetIncomeAmt"],
        ["net", "NetIncomeLossAmt"],
        ["ratio", "LossesPct"],
        ["unallowed", "PriorYearUnallowedLossesAmt"],
        ["allowed", "F8582WrkshtLossesAmt"],
      ], `part9_${index + 1}_`)
    );
    copy(projected, part9[0], [
      ["part9_total_net", "TotalNetIncomeLossAmt"],
      ["part9_total_unallowed", "TotalUnallowedAmt"],
      ["part9_total_allowed", "TotalAllowedAmt"],
    ]);
  }
  return projected;
}

export const form8582Pdf: PdfFormDescriptor = {
  pendingKey: "form8582",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8582--2025.pdf",
  projectFields(fields, allPending) {
    const input = inputSchema.parse(fields);
    const hasActivity = (input.activities?.length ?? 0) > 0 ||
      (input.current_4797_sale_gains?.length ?? 0) > 0 ||
      input.has_current_4797_transaction === true ||
      input.has_active_rental === true || input.has_other_passive === true ||
      [
        input.passive_schedule_c,
        input.passive_schedule_f,
        input.current_income,
        input.rental_current_income,
        input.current_loss,
        input.rental_current_loss,
        input.rental_prior_eligible_loss,
        input.prior_unallowed,
      ]
        .some((amount) => (amount ?? 0) !== 0);
    if (!hasActivity) return {};
    const xml = nativeForm8582.build(fields, { pending: allPending });
    if (typeof xml !== "string" || xml.length === 0) {
      throw new Error("Form 8582 PDF needs a native reconciled worksheet");
    }
    return projectWorksheet(xml);
  },
  fields,
  filerFields: [
    pdfText("nameLine1", `${p1}.f1_01[0]`),
    pdfText("primarySSN", `${p1}.f1_02[0]`),
  ],
};
