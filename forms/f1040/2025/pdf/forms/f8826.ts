import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import { assertForm3800FinalCreditJoin } from "../../form3800_final_credit_join.ts";
import { form8826 } from "../../mef/forms/f8826_draft.ts";
import { reconcileDisabledAccessK1Credits } from "../../mef/forms/f8826_credit_evidence.ts";
import {
  calculateForm8826,
  inputSchema,
} from "../../../nodes/inputs/f8826/index.ts";
import { inputSchema as form3800InputSchema } from "../../../nodes/inputs/f3800/index.ts";

// The continuously used September 2017 form has one filing page followed by
// instructions. Its amount boxes separate dollars and cents.
const page = "topmostSubform[0].Page1[0]";
const text = (domainKey: string, number: number): PdfFieldEntry => ({
  kind: "text",
  domainKey,
  pdfField: `${page}.f1_${number}[0]`,
});
const fields: PdfFieldEntry[] = [
  ...([1, 3, 5, 6, 7, 8] as const).flatMap((line, index) => [
    text(`line${line}_dollars`, 3 + index * 2),
    text(`line${line}_cents`, 4 + index * 2),
  ]),
];

function moneyFields(line: number, amount: number): Record<string, string> {
  const cents = Math.round(amount * 100);
  if (
    !Number.isFinite(amount) || !Number.isSafeInteger(cents) ||
    Math.abs(amount * 100 - cents) > 0.000001 || cents < 0
  ) {
    throw new Error("Form 8826 printable amount needs cent precision");
  }
  return {
    [`line${line}_dollars`]: String(Math.floor(cents / 100)),
    [`line${line}_cents`]: String(cents % 100).padStart(2, "0"),
  };
}

export const form8826Pdf: PdfFormDescriptor = {
  pendingKey: "f8826",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8826--2017.pdf",
  pageIndices: () => [0],
  fields,
  filerFields: [
    text("nameLine1", 1),
    text("primarySSN", 2),
  ],
  includeWhen(raw) {
    if (raw.eligible_expenditures === undefined) return false;
    return calculateForm8826(inputSchema.parse(raw)).line6 > 0;
  },
  projectFields(raw, allPending) {
    if (raw.eligible_expenditures === undefined) return {};
    const source = inputSchema.parse(raw);
    const lines = calculateForm8826(source);
    if (
      lines.line6 <= 0 || source.subject_to_passive_activity_limit ||
      (source.pass_through_credits?.length ?? 0) > 1 ||
      source.pass_through_credits?.some((entry) =>
        entry.entity_type !== "s_corporation" ||
        entry.subject_to_passive_activity_limit
      )
    ) {
      throw new Error(
        "Form 8826 PDF needs one sourced nonpassive self claim and at most one nonpassive S-corporation K-1",
      );
    }
    form8826.build(source, { pending: allPending });
    const k1 = source.pass_through_credits?.[0];
    if (k1) {
      reconcileDisabledAccessK1Credits([{
        source_type: k1.entity_type,
        entity_ein: k1.entity_ein,
        source_document_reference: k1.source_document_reference,
        credit_amount: k1.credit_amount,
        subject_to_passive_activity_limit: false,
      }], allPending);
    }
    const parent = form3800InputSchema.parse(allPending.f3800);
    const allowedCredit = allPending.f3800?.allowed_credit;
    const entries = parent.f8826_credit_entries ?? [];
    if (
      entries.length !== (k1 ? 2 : 1) ||
      entries[0].source_type !== "self" ||
      entries[0].source_ein !== undefined ||
      entries[0].subject_to_passive_activity_limit ||
      entries[0].credit_amount !== lines.selfCreditAfterCap ||
      (k1 && (
        entries[1].source_type !== "s_corporation" ||
        entries[1].source_ein !== k1.entity_ein ||
        entries[1].source_document_reference !== k1.source_document_reference ||
        entries[1].credit_amount !== lines.passThroughCreditsAfterCap[0] ||
        entries[1].subject_to_passive_activity_limit
      )) ||
      entries.reduce((sum, entry) => sum + entry.credit_amount, 0) !==
        lines.line8 ||
      typeof allowedCredit !== "number"
    ) {
      throw new Error("Form 8826 PDF line 8 differs from Form 3800 source");
    }
    assertForm3800FinalCreditJoin(allowedCredit, allPending);
    return {
      ...moneyFields(1, lines.line1),
      ...moneyFields(3, lines.line3),
      ...moneyFields(5, lines.line5),
      ...moneyFields(6, lines.line6),
      ...(k1 ? moneyFields(7, lines.line7) : {}),
      ...moneyFields(8, lines.line8),
    };
  },
};
