import { StandardFonts } from "pdf-lib";
import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import { reconcileForm4972Nua } from "../../form4972_nua_reconciliation.ts";
import { reconcileForm4972MultipleRecipients } from "../../form4972_multiple_recipient_reconciliation.ts";
import { reconcileForm4972EstatePartII } from "../../form4972_estate_part2_reconciliation.ts";
import { reconcileForm4972FullShare } from "../../form4972_full_share_reconciliation.ts";
import { inputSchema as f1099rSchema } from "../../../nodes/inputs/f1099r/index.ts";

// Field positions checked against the 2025 IRS AcroForm. Only page 1 is filed;
// the NUA and death-benefit worksheets on later pages are kept for records.
const page = "topmostSubform[0].Page1[0]";
const text = (domainKey: string, pdfField: string): PdfFieldEntry => ({
  kind: "text",
  domainKey,
  pdfField: `${page}.${pdfField}`,
});
const answer = (domainKey: string, number: number): PdfFieldEntry[] => [
  {
    kind: "checkboxWhen",
    domainKey,
    pdfField: `${page}.c1_${number}[0]`,
    whenValue: "true",
  },
  {
    kind: "checkboxWhen",
    domainKey,
    pdfField: `${page}.c1_${number}[1]`,
    whenValue: "false",
  },
];

const fields: ReadonlyArray<PdfFieldEntry> = [
  text("recipient_name", "f1_01[0]"),
  text("recipient_ssn", "f1_02[0]"),
  ...answer("entire_balance_distributed", 1),
  ...answer("rolled_over_any", 2),
  ...answer("beneficiary_distribution", 3),
  ...answer("participant_five_year_member", 4),
  ...answer("prior_election_after_1986", 5),
  ...answer("prior_beneficiary_election_after_1986", 6),
  text("line6", "f1_03[0]"),
  text("line7", "f1_04[0]"),
  text("line8", "f1_05[0]"),
  text("line9", "f1_06[0]"),
  text("line10", "f1_07[0]"),
  text("line11", "f1_08[0]"),
  text("line12", "f1_09[0]"),
  text("line13", "f1_10[0]"),
  text("line14", "Line14_ReadOrder[0].f1_11[0]"),
  text("line15", "f1_12[0]"),
  text("line16", "f1_13[0]"),
  text("line17", "f1_14[0]"),
  text("line18", "f1_15[0]"),
  text("line19", "f1_16[0]"),
  text("line20_whole", "Line20_ReadOrder[0].f1_17[0]"),
  text("line20_fraction", "Line20_ReadOrder[0].f1_18[0]"),
  text("line21", "f1_19[0]"),
  text("line22", "f1_20[0]"),
  text("line23", "f1_21[0]"),
  text("line24", "f1_22[0]"),
  text("line25", "f1_23[0]"),
  text("line26", "f1_24[0]"),
  text("line27", "f1_25[0]"),
  text("line28", "f1_26[0]"),
  text("line29", "f1_27[0]"),
  text("line30", "f1_28[0]"),
];

function recipientIdentity(
  fields: Record<string, unknown>,
  allPending: Record<string, Record<string, unknown>>,
) {
  const general = allPending.general ?? {};
  if (fields.recipient !== "T" && fields.recipient !== "S") {
    throw new Error("Form 4972 PDF needs a taxpayer or spouse recipient");
  }
  const spouse = fields.recipient === "S";
  const name = [
    general[spouse ? "spouse_first_name" : "taxpayer_first_name"],
    general[spouse ? "spouse_middle_initial" : "taxpayer_middle_initial"],
    general[spouse ? "spouse_last_name" : "taxpayer_last_name"],
  ].filter((part): part is string => typeof part === "string" && part !== "")
    .join(" ");
  const ssn = general[spouse ? "spouse_ssn" : "taxpayer_ssn"];
  if (!name || typeof ssn !== "string" || !/^\d{3}-?\d{2}-?\d{4}$/.test(ssn)) {
    throw new Error("Form 4972 PDF needs the selected recipient name and SSN");
  }
  return { recipient_name: name, recipient_ssn: ssn.replaceAll("-", "") };
}

function projectedFields(
  fields: Record<string, unknown>,
  allPending: Record<string, Record<string, unknown>>,
) {
  if (typeof fields.line6 !== "number" && typeof fields.line8 !== "number") {
    if (Object.keys(fields).length > 0) {
      throw new Error(
        "Form 4972 PDF has source facts but no elected printed part",
      );
    }
    return {};
  }
  const multipleRecipients = reconcileForm4972MultipleRecipients(
    fields,
    allPending,
  );
  assertElectedPdfShape(fields, allPending, multipleRecipients);
  reconcileForm4972Nua(fields, allPending);
  reconcileForm4972EstatePartII(fields, allPending);
  reconcileForm4972FullShare(fields, allPending);
  const recipient = recipientIdentity(fields, allPending);
  const printedFields = { ...fields };
  if (fields.beneficiary_distribution === true) {
    delete printedFields.prior_election_after_1986;
  } else {
    delete printedFields.prior_beneficiary_election_after_1986;
  }
  const ratio = fields.line20;
  if (typeof ratio !== "number") return { ...printedFields, ...recipient };
  const [whole, fraction] = ratio.toFixed(5).split(".");
  return {
    ...printedFields,
    ...recipient,
    line20_whole: whole,
    line20_fraction: fraction,
  };
}

function numberOn(fields: Record<string, unknown>, key: string): number {
  const amount = fields[key];
  if (typeof amount !== "number" || !Number.isFinite(amount)) {
    throw new Error(`Form 4972 PDF elected form needs ${key}`);
  }
  return amount;
}

function assertElectedPdfShape(
  fields: Record<string, unknown>,
  allPending: Record<string, Record<string, unknown>>,
  multipleRecipients: boolean,
): void {
  const capital = fields.elect_capital_gain === true;
  const averaging = fields.elect_10yr_averaging === true;
  if (
    !capital && !averaging ||
    capital !== (typeof fields.line6 === "number") ||
    averaging !== (typeof fields.line8 === "number")
  ) {
    throw new Error("Form 4972 PDF election and printed Parts II/III differ");
  }
  if (
    fields.born_before_1936 !== true ||
    fields.entire_balance_distributed !== true ||
    fields.rolled_over_any !== false ||
    typeof fields.beneficiary_distribution !== "boolean" ||
    typeof fields.participant_five_year_member !== "boolean" ||
    (fields.beneficiary_distribution === true &&
      fields.participant_five_year_member === true) ||
    !(fields.beneficiary_distribution || fields.participant_five_year_member) ||
    (fields.beneficiary_distribution === true
      ? fields.prior_beneficiary_election_after_1986 !== false
      : fields.prior_election_after_1986 !== false)
  ) {
    throw new Error("Form 4972 PDF needs qualifying printed Part I answers");
  }
  const source = f1099rSchema.safeParse(allPending.f1099r);
  const elected = source.success
    ? source.data.f1099rs.filter((item) =>
      item.exclude_4972 === true && item.no_distribution_received !== true
    )
    : [];
  const item = elected[0];
  if (
    elected.length !== 1 || !item || item.ts !== fields.recipient ||
    item.box9a_pct_total !== undefined &&
      item.box9a_pct_total !== 100 && !multipleRecipients ||
    item.box2a_taxable_amount !== fields.lump_sum_amount ||
    (item.box3_capital_gain ?? 0) !== (fields.capital_gain_amount ?? 0) ||
    (item.box6_nua ?? 0) !== (fields.box6_nua ?? 0) ||
    (item.box8_other ?? 0) !== (fields.annuity_actuarial_value ?? 0) ||
    (item.box8_pct_total ?? null) !== (fields.annuity_share_pct ?? null)
  ) {
    throw new Error(
      "Form 4972 PDF needs one matching Form 1099-R source and recipient share",
    );
  }
  if (capital) {
    if (
      numberOn(fields, "line7") !== Math.round(numberOn(fields, "line6") * 0.2)
    ) {
      throw new Error("Form 4972 PDF Part II lines 6 and 7 do not reconcile");
    }
  } else if (typeof fields.line7 === "number") {
    throw new Error("Form 4972 PDF has Part II tax without its election");
  }
  if (!averaging) {
    if (typeof fields.line30 === "number") {
      throw new Error("Form 4972 PDF has Part III tax without its election");
    }
    return;
  }
  for (
    const key of [
      "line8",
      "line9",
      "line10",
      "line11",
      "line12",
      "line17",
      "line18",
      "line19",
      "line23",
      "line24",
      "line25",
      "line29",
      "line30",
    ]
  ) numberOn(fields, key);
  const annuity = numberOn(fields, "line11");
  const taxable = numberOn(fields, "line12");
  const allowance = taxable < 70_000 ? numberOn(fields, "line16") : 0;
  if (taxable < 70_000) {
    for (const key of ["line13", "line14", "line15"]) numberOn(fields, key);
  } else if (
    ["line13", "line14", "line15", "line16"].some((key) =>
      typeof fields[key] === "number"
    )
  ) {
    throw new Error("Form 4972 PDF printed skipped allowance lines");
  }
  if (annuity > 0) {
    for (
      const key of ["line20", "line21", "line22", "line26", "line27", "line28"]
    ) {
      numberOn(fields, key);
    }
  } else if (
    ["line20", "line21", "line22", "line26", "line27", "line28"]
      .some((key) => typeof fields[key] === "number")
  ) {
    throw new Error("Form 4972 PDF printed skipped annuity lines");
  }
  if (
    numberOn(fields, "line10") !==
      numberOn(fields, "line8") - numberOn(fields, "line9") ||
    taxable !== numberOn(fields, "line10") + annuity ||
    taxable < 70_000 &&
      (numberOn(fields, "line13") !==
          Math.round(Math.min(10_000, taxable * 0.5)) ||
        numberOn(fields, "line14") !== Math.max(0, taxable - 20_000) ||
        numberOn(fields, "line15") !==
          Math.round(numberOn(fields, "line14") * 0.2) ||
        allowance !==
          numberOn(fields, "line13") - numberOn(fields, "line15")) ||
    numberOn(fields, "line17") !== taxable - allowance ||
    numberOn(fields, "line19") !==
      numberOn(fields, "line17") - numberOn(fields, "line18") ||
    numberOn(fields, "line23") !==
      Math.round(numberOn(fields, "line19") * 0.1) ||
    numberOn(fields, "line25") !== numberOn(fields, "line24") * 10 ||
    annuity > 0 &&
      (numberOn(fields, "line20") !==
          Math.round(annuity / taxable * 100_000) / 100_000 ||
        numberOn(fields, "line21") !==
          Math.round(allowance * numberOn(fields, "line20")) ||
        numberOn(fields, "line22") !== annuity - numberOn(fields, "line21") ||
        numberOn(fields, "line26") !==
          Math.round(numberOn(fields, "line22") * 0.1) ||
        numberOn(fields, "line28") !== numberOn(fields, "line27") * 10) ||
    numberOn(fields, "line29") !== Math.round(
        (numberOn(fields, "line25") -
          (annuity > 0 ? numberOn(fields, "line28") : 0)) *
          (multipleRecipients
            ? numberOn(fields, "recipient_share_pct") / 100
            : 1),
      ) ||
    numberOn(fields, "line30") !== numberOn(fields, "line29") +
        (capital ? numberOn(fields, "line7") : 0)
  ) {
    throw new Error("Form 4972 PDF elected Part III lines do not reconcile");
  }
}

// The 2025 filing page has no AcroForm fields on the dotted lines beside
// lines 6 and 8. The instructions require the NUA amount beside the elected
// line, so those two annotations are drawn after the numeric fields are filled.
export function form4972NuaAnnotations(fields: Record<string, unknown>) {
  const capital = fields.line6_nua_capital_gain;
  const ordinary = fields.line8_nua_included;
  return [
    ...(typeof fields.line6 === "number" && typeof capital === "number" &&
        capital > 0
      ? [{ amount: Math.round(capital), y: 485 }]
      : []),
    ...(typeof fields.line8 === "number" && typeof ordinary === "number" &&
        ordinary > 0
      ? [{ amount: Math.round(ordinary), y: 390 }]
      : []),
  ];
}

export const form4972Pdf: PdfFormDescriptor = {
  pendingKey: "form4972",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f4972--2025.pdf",
  pageIndices: () => [0],
  projectFields: projectedFields,
  decoratePages: async (document, pages, fields) => {
    const annotations = form4972NuaAnnotations(fields);
    const multipleRecipients = typeof fields.recipient_share_pct === "number" &&
      fields.recipient_share_pct < 100 && typeof fields.line29 === "number";
    if (annotations.length === 0 && !multipleRecipients) return;
    const page = pages[0];
    if (!page) throw new Error("Form 4972 filing page is missing");
    const font = await document.embedFont(StandardFonts.Helvetica);
    for (const { amount, y } of annotations) {
      const label = `NUA ${amount}`;
      // Keep the notation inside the dotted line, clear of the numbered box.
      const x = 470 - font.widthOfTextAtSize(label, 8);
      page.drawText(label, { x, y, size: 8, font });
    }
    if (multipleRecipients) {
      // Line 29's dotted-line baseline is at y≈90 in the 2025 source form.
      page.drawText("MRD", { x: 445, y: 90, size: 8, font });
    }
  },
  includeWhen: (fields) =>
    typeof fields.line6 === "number" || typeof fields.line8 === "number",
  fields,
};
