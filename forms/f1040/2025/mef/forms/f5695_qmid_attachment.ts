import { PDFDocument, StandardFonts } from "pdf-lib";
import type { FilerIdentity } from "../../../mef/header.ts";
import {
  type Form5695Input,
  sectionBQualifiedItems,
} from "../../../nodes/intermediate/forms/form5695/index.ts";
import type { MefPdfAttachment } from "../form-descriptor.ts";

type QmidItem = { readonly qmid: string; readonly cost: number };

export interface AdditionalQmidLine {
  readonly formLine:
    | "19e"
    | "20b"
    | "22b"
    | "23b"
    | "24b"
    | "29b"
    | "29d"
    | "29f";
  readonly property: string;
  readonly items: ReadonlyArray<QmidItem>;
}

export function additionalQmidLines(
  input: Form5695Input,
): ReadonlyArray<AdditionalQmidLine> {
  const section = input.part_ii_section_a;
  const doors = [...(section?.exterior_doors ?? [])].sort((a, b) =>
    b.cost - a.cost
  );
  const windows = [...(section?.windows ?? [])].sort((a, b) => b.cost - a.cost);
  const lines: AdditionalQmidLine[] = [];
  if (doors.length > 3) {
    lines.push({
      formLine: "19e",
      property: "Exterior doors",
      items: doors.slice(3),
    });
  }
  if (windows.length > 4) {
    lines.push({
      formLine: "20b",
      property: "Exterior windows and skylights",
      items: windows.slice(4),
    });
  }
  const qualified = sectionBQualifiedItems(input.part_ii_section_b);
  const sectionBOverflow = [
    [
      "22b",
      "Central air conditioners",
      qualified.centralAirConditioners.slice(1),
    ],
    [
      "23b",
      "Natural gas, propane, or oil water heaters",
      qualified.waterHeaters.slice(2),
    ],
    [
      "24b",
      "Natural gas, propane, or oil furnaces or boilers",
      qualified.furnacesOrBoilers.slice(1),
    ],
    ["29b", "Electric or natural gas heat pumps", qualified.heatPumps.slice(1)],
    [
      "29d",
      "Electric or natural gas heat pump water heaters",
      qualified.heatPumpWaterHeaters.slice(1),
    ],
    [
      "29f",
      "Biomass stoves or boilers",
      qualified.biomassStovesOrBoilers.slice(1),
    ],
  ] as const;
  for (const [formLine, property, items] of sectionBOverflow) {
    if (items.length > 0) lines.push({ formLine, property, items });
  }
  return lines;
}

type PdfRow =
  | { readonly kind: "title"; readonly text: string }
  | { readonly kind: "item"; readonly qmid: string; readonly cost: number }
  | { readonly kind: "total"; readonly amount: number };

export async function buildAdditionalQmidAttachment(
  input: Form5695Input,
  filer?: FilerIdentity,
): Promise<MefPdfAttachment | undefined> {
  const lines = additionalQmidLines(input);
  if (lines.length === 0) return undefined;
  if (!filer?.fullName) {
    throw new Error("Form 5695 additional QMID statement needs filer identity");
  }

  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const money = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  });
  const allRows: PdfRow[] = lines.flatMap((line): PdfRow[] => [
    { kind: "title", text: `Line ${line.formLine}: ${line.property}` },
    ...line.items.map((item) => ({
      kind: "item" as const,
      qmid: item.qmid,
      cost: item.cost,
    })),
    {
      kind: "total",
      amount: line.items.reduce((sum, item) => sum + item.cost, 0),
    },
  ]);
  let page = pdf.addPage([612, 792]);
  let y = 744;
  const addPage = () => {
    page = pdf.addPage([612, 792]);
    y = 744;
  };
  const drawHeader = () => {
    page.drawText("Form 5695 (2025) - Additional QMID Statement", {
      x: 54,
      y,
      font: bold,
      size: 14,
    });
    y -= 25;
    page.drawText(`Taxpayer: ${filer.fullName}`, {
      x: 54,
      y,
      font: regular,
      size: 10,
    });
    y -= 20;
    page.drawText(
      "QMID and cost for items included on Form 5695 overflow lines",
      {
        x: 54,
        y,
        font: regular,
        size: 10,
      },
    );
    y -= 28;
  };
  drawHeader();
  let currentLineTitle: string | undefined;
  for (const row of allRows) {
    if (y < 60 || (row.kind === "title" && y < 90)) {
      addPage();
      drawHeader();
      if (row.kind !== "title" && currentLineTitle) {
        page.drawText(`${currentLineTitle} (continued)`, {
          x: 54,
          y,
          font: bold,
          size: 11,
        });
        y -= 20;
      }
    }
    if (row.kind === "title") {
      currentLineTitle = row.text;
      page.drawText(row.text, { x: 54, y, font: bold, size: 11 });
      y -= 20;
    } else if (row.kind === "item") {
      page.drawText(row.qmid, { x: 76, y, font: regular, size: 10 });
      page.drawText(money.format(row.cost), {
        x: 445,
        y,
        font: regular,
        size: 10,
      });
      y -= 17;
    } else {
      page.drawText(`Total: ${money.format(row.amount)}`, {
        x: 76,
        y,
        font: bold,
        size: 10,
      });
      y -= 27;
    }
  }
  return {
    fileName: "AdditionalQMIDStatement.pdf",
    description: "Additional QMID Statement",
    bytes: await pdf.save(),
  };
}
