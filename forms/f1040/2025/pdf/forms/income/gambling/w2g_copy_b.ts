import type { PdfFieldEntry } from "../../../review-support/form-descriptor.ts";
import type { W2GItem } from "../../../../../nodes/inputs/income/gambling/w2g/index.ts";

/** The recipient Copy B of the Form W-2G revision a payer issues for one calendar year. */
export interface W2GCopyBLayout {
  readonly pdfUrl: string;
  readonly pdfSha256?: string;
  /** Zero-based PDF page holding Copy B. */
  readonly pageIndex: number;
  readonly fields: readonly PdfFieldEntry[];
  readonly project: (item: W2GItem) => Record<string, unknown>;
}

type UsAddress = NonNullable<W2GItem["payer_us_address"]>;

function text(domainKey: string, pdfField: string): PdfFieldEntry {
  return { kind: "text", domainKey, pdfField };
}

function isoToUsDate(date: string | undefined): string | undefined {
  if (date === undefined) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("W-2G PDF date won must be an ISO calendar date");
  }
  return `${date.slice(5, 7)}/${date.slice(8, 10)}/${date.slice(0, 4)}`;
}

/** Fields both revisions print the same way. */
function commonValues(item: W2GItem): Record<string, unknown> {
  return {
    ...item,
    year: String(item.calendar_year).slice(2),
    box2_date_won: isoToUsDate(item.box2_date_won),
    payer_ein: item.payer_ein?.replaceAll("-", ""),
    winner_tin: item.box9_winner_tin?.replaceAll("-", ""),
    state_payer_id: [item.box13_state, item.box13_payer_state_id]
      .filter(Boolean).join(" / "),
  };
}

function addressLines(address: UsAddress): string[] {
  return [
    address.line1,
    ...(address.line2 ? [address.line2] : []),
    `${address.city}, ${address.state} ${address.zip}`,
  ];
}

// Continuous-use Rev. December 2023 Form W-2G: Copy B on PDF page 3, with the
// payer's name and address in one box and the winner's street and city boxes.
const decLeft = "topmostSubform[0].CopyB[0].Col_Left[0]";
const decRight = "topmostSubform[0].CopyB[0].Col_Right[0]";
const continuousUse: W2GCopyBLayout = {
  pdfUrl: "https://www.irs.gov/pub/irs-prior/fw2g--2023.pdf",
  pageIndex: 2,
  fields: [
    text("year", "topmostSubform[0].CopyB[0].CopyBHeader[0].f1_01[0]"),
    ...([
      "payer_address",
      "payer_ein",
      "payer_phone",
      "winner_name",
      "winner_street",
      "winner_city",
    ] as const).map((key, index) =>
      text(key, `${decLeft}.f1_${String(index + 2).padStart(2, "0")}[0]`)
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
    ] as const).map(([key, suffix]) => text(key, `${decRight}.${suffix}`)),
  ],
  project(item) {
    const payer = item.payer_us_address!;
    const winner = item.winner_us_address!;
    return {
      ...commonValues(item),
      payer_address: [item.payer_name, ...addressLines(payer)].join("\n"),
      winner_street: [winner.line1, winner.line2].filter(Boolean).join(" "),
      winner_city: `${winner.city}, ${winner.state} ${winner.zip}`,
    };
  },
};

// Rev. January 2026 Form W-2G (irs.gov/pub/irs-prior/fw2g--2026.pdf): Copy B
// on PDF page 3 splits each address into street, room or apartment, city,
// state, country and ZIP boxes, and adds boxes 16-18 for local winnings and
// withholding. Widgets are named by their position on the page.
const janLeft = "topmostSubform[0].CopyB[0].Col_Left[0]";
const janRight = "topmostSubform[0].CopyB[0].Col_Right[0]";
const januaryRevision: W2GCopyBLayout = {
  pdfUrl: "https://www.irs.gov/pub/irs-prior/fw2g--2026.pdf",
  pdfSha256: "2d75e44d5ea6574aec1c5b68884cdf1bd2bcc96f9f897a57c3b15cc691631168",
  pageIndex: 2,
  fields: [
    text("year", "topmostSubform[0].CopyB[0].CopyBHeader[0].f1_01[0]"),
    ...([
      "payer_name",
      "payer_street",
      "payer_room",
      "payer_city",
      "payer_state",
      "payer_country",
      "payer_zip",
      "payer_ein",
      "payer_phone",
      "winner_name",
      "winner_street",
      "winner_apartment",
      "winner_city",
      "winner_state",
      "winner_country",
      "winner_zip",
    ] as const).map((key, index) =>
      text(key, `${janLeft}.f1_${String(index + 2).padStart(2, "0")}[0]`)
    ),
    ...([
      ["box1_winnings", "Box1_ReadOrder[0].f1_18[0]"],
      ["box2_date_won", "f1_19[0]"],
      ["box3_type_of_wager", "f1_20[0]"],
      ["box4_federal_withheld", "f1_21[0]"],
      ["box5_transaction", "f1_22[0]"],
      ["box6_race", "f1_23[0]"],
      ["box7_identical_wagers", "Box7_ReadOrder[0].f1_24[0]"],
      ["box8_cashier", "f1_25[0]"],
      ["winner_tin", "f1_26[0]"],
      ["box10_window", "f1_27[0]"],
      ["box11_first_id", "f1_28[0]"],
      ["box12_second_id", "f1_29[0]"],
      ["state_payer_id", "f1_30[0]"],
      ["box14_state_winnings", "f1_31[0]"],
      ["box15_state_withheld", "Box15_ReadOrder[0].f1_32[0]"],
      ["box16_local_winnings", "f1_33[0]"],
      ["box17_local_withheld", "Box17_ReadOrder[0].f1_34[0]"],
      ["box18_locality", "f1_35[0]"],
    ] as const).map(([key, suffix]) => text(key, `${janRight}.${suffix}`)),
  ],
  project(item) {
    const payer = item.payer_us_address!;
    const winner = item.winner_us_address!;
    return {
      ...commonValues(item),
      payer_street: payer.line1,
      payer_room: payer.line2,
      payer_city: payer.city,
      payer_state: payer.state,
      payer_zip: payer.zip,
      winner_street: winner.line1,
      winner_apartment: winner.line2,
      winner_city: winner.city,
      winner_state: winner.state,
      winner_zip: winner.zip,
    };
  },
};

/** The Copy B a payer issues for `calendarYear`. */
export function w2gCopyBLayout(calendarYear: number): W2GCopyBLayout {
  return calendarYear >= 2026 ? januaryRevision : continuousUse;
}
