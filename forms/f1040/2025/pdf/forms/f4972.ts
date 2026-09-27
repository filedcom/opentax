import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";

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
    return fields;
  }
  const recipient = recipientIdentity(fields, allPending);
  const ratio = fields.line20;
  if (typeof ratio !== "number") return { ...fields, ...recipient };
  const [whole, fraction] = ratio.toFixed(5).split(".");
  return {
    ...fields,
    ...recipient,
    line20_whole: whole,
    line20_fraction: fraction,
  };
}

export const form4972Pdf: PdfFormDescriptor = {
  pendingKey: "form4972",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f4972--2025.pdf",
  pageIndices: () => [0],
  projectFields: projectedFields,
  includeWhen: (fields) =>
    typeof fields.line6 === "number" || typeof fields.line8 === "number",
  fields,
};
