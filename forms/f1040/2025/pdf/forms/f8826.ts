import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import { assertForm3800FinalCreditJoin } from "../../form3800_final_credit_join.ts";
import { form8826 } from "../../mef/forms/f8826_draft.ts";
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
    const source = inputSchema.parse(raw);
    const lines = calculateForm8826(source);
    if (
      lines.line6 <= 0 || source.subject_to_passive_activity_limit ||
      (source.pass_through_credits?.length ?? 0) > 0
    ) {
      throw new Error(
        "Form 8826 PDF currently needs one self-earned, nonpassive source without pass-through credits",
      );
    }
    form8826.build(source, { pending: allPending });
    const parent = form3800InputSchema.parse(allPending.f3800);
    const entries = parent.f8826_credit_entries ?? [];
    if (
      entries.length !== 1 || entries[0].source_type !== "self" ||
      entries[0].source_ein !== undefined ||
      entries[0].subject_to_passive_activity_limit ||
      entries[0].credit_amount !== lines.line8 ||
      parent.allowed_credit === undefined
    ) {
      throw new Error("Form 8826 PDF line 8 differs from Form 3800 source");
    }
    assertForm3800FinalCreditJoin(parent.allowed_credit, allPending);
    return {
      ...moneyFields(1, lines.line1),
      ...moneyFields(3, lines.line3),
      ...moneyFields(5, lines.line5),
      ...moneyFields(6, lines.line6),
      ...moneyFields(8, lines.line8),
    };
  },
};
