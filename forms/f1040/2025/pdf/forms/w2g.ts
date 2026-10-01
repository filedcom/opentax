import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import { StandardFonts } from "pdf-lib";
import { inputSchema, type W2GItem } from "../../../nodes/inputs/w2g/index.ts";
import { assertWithheldW2GSource } from "../../mef/forms/w2g.ts";

// Copy B is the recipient copy identified on the continuous-use Dec. 2023
// Form W-2G. It occupies PDF page 3 (zero-based index 2).
const left = "topmostSubform[0].CopyB[0].Col_Left[0]";
const right = "topmostSubform[0].CopyB[0].Col_Right[0]";
const fields: readonly PdfFieldEntry[] = [
  {
    kind: "text",
    domainKey: "year",
    pdfField: "topmostSubform[0].CopyB[0].CopyBHeader[0].f1_01[0]",
  },
  ...([
    "payer_address",
    "payer_ein",
    "payer_phone",
    "winner_name",
    "winner_street",
    "winner_city",
  ] as const).map(
    (domainKey, index): PdfFieldEntry => ({
      kind: "text",
      domainKey,
      pdfField: `${left}.f1_${String(index + 2).padStart(2, "0")}[0]`,
    }),
  ),
  ...([
    ["box1_winnings", "Box1[0].f1_08[0]"],
    ["box2_date_won", "f1_09[0]"],
    ["box3_type_of_wager", "f1_10[0]"],
    ["box4_federal_withheld", "f1_11[0]"],
    ["box5_transaction", "f1_12[0]"],
    ["box6_race", "f1_13[0]"],
    ["box7_identical_wagers", "Box7[0].f1_14[0]"],
    ["box8_cashier", "f1_15[0]"],
    ["winner_tin", "f1_16[0]"],
    ["box10_window", "f1_17[0]"],
    ["box11_first_id", "f1_18[0]"],
    ["box12_second_id", "f1_19[0]"],
    ["state_payer_id", "f1_20[0]"],
    ["box14_state_winnings", "f1_21[0]"],
    ["box15_state_withheld", "Box15[0].f1_22[0]"],
  ] as const).map(([domainKey, suffix]): PdfFieldEntry => ({
    kind: "text",
    domainKey,
    pdfField: `${right}.${suffix}`,
  })),
];

function addressLines(
  address: NonNullable<W2GItem["payer_us_address"]>,
): string[] {
  return [
    address.line1,
    ...(address.line2 ? [address.line2] : []),
    `${address.city}, ${address.state} ${address.zip}`,
  ];
}

function project(item: W2GItem): Record<string, unknown> {
  const payer = item.payer_us_address!;
  const winner = item.winner_us_address!;
  const dateWon = item.box2_date_won;
  if (dateWon !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(dateWon)) {
    throw new Error("W-2G PDF date won must be an ISO calendar date");
  }
  return {
    ...item,
    year: "25",
    box2_date_won: dateWon === undefined
      ? undefined
      : `${dateWon.slice(5, 7)}/${dateWon.slice(8, 10)}/${dateWon.slice(0, 4)}`,
    payer_address: [item.payer_name, ...addressLines(payer)].join("\n"),
    payer_ein: item.payer_ein?.replaceAll("-", ""),
    winner_street: [winner.line1, winner.line2].filter(Boolean).join(" "),
    winner_city: `${winner.city}, ${winner.state} ${winner.zip}`,
    winner_tin: item.box9_winner_tin?.replaceAll("-", ""),
    state_payer_id: [item.box13_state, item.box13_payer_state_id]
      .filter(Boolean).join(" / "),
  };
}

export const w2gPdf: PdfFormDescriptor = {
  pendingKey: "w2g",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/fw2g--2023.pdf",
  fields,
  pageIndices: () => [2],
  async decoratePages(document, pages) {
    const page = pages[0];
    if (!page) throw new Error("W-2G PDF recipient page is missing");
    const font = await document.embedFont(StandardFonts.Helvetica);
    page.drawText(
      "Prepared display copy from entered W-2G facts; verify against payer-issued form.",
      { x: 52, y: 80, size: 8, font },
    );
  },
  instances(raw, filer, allPending) {
    if (Object.keys(raw).length === 0) return [];
    const source = inputSchema.parse(raw);
    const active = source.w2gs.filter((item) =>
      (item.box4_federal_withheld ?? 0) > 0
    );
    if (active.length === 0) return [];
    active.forEach((item) => assertWithheldW2GSource(item, filer));
    const withheld = active.reduce(
      (sum, item) => sum + item.box4_federal_withheld!,
      0,
    );
    const line25c = allPending?.f1040?.line25c_total;
    if (typeof line25c !== "number" || line25c < withheld) {
      throw new Error(
        "W-2G PDF withholding needs the reconciled Form 1040 line 25c",
      );
    }
    return active.map(project);
  },
};
