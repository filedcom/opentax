import type {
  PdfFieldEntry,
  PdfFormDescriptor,
} from "../../../review-support/form-descriptor.ts";
import { assertForm3800FinalCreditJoin } from "../../../../domains/credits/business/form3800/form3800_final_credit_join.ts";
import { form8826 } from "../../../../mef/forms/credits/business/f8826_draft.ts";
import { reconcileDisabledAccessK1Credits } from "../../../../mef/forms/credits/business/f8826_credit_evidence.ts";
import {
  calculateForm8826,
  inputSchema,
} from "../../../../../nodes/inputs/credits/business/f8826/index.ts";
import { inputSchema as form3800InputSchema } from "../../../../../nodes/inputs/credits/business/f3800/index.ts";

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
  includeWhen: (fields) => fields.line6_dollars !== undefined,
  projectFields(raw, allPending) {
    if (raw.eligible_expenditures === undefined) return {};
    const source = inputSchema.parse(raw);
    const lines = calculateForm8826(source);
    if (
      lines.line6 <= 0 || source.subject_to_passive_activity_limit ||
      source.pass_through_credits?.some((entry) =>
        entry.subject_to_passive_activity_limit
      )
    ) {
      throw new Error(
        "Form 8826 PDF needs one sourced nonpassive self claim and nonpassive partnership/S-corporation K-1s",
      );
    }
    form8826.build(source, { pending: allPending });
    const k1s = source.pass_through_credits ?? [];
    reconcileDisabledAccessK1Credits(
      k1s.map((k1) => ({
        source_type: k1.entity_type,
        entity_ein: k1.entity_ein,
        source_document_reference: k1.source_document_reference,
        credit_amount: k1.credit_amount,
        subject_to_passive_activity_limit: false,
      })),
      allPending,
    );
    const parent = form3800InputSchema.parse(allPending.f3800);
    const allowedCredit = allPending.f3800?.allowed_credit;
    const entries = parent.f8826_credit_entries ?? [];
    const expected = [
      {
        source_type: "self",
        source_ein: undefined,
        source_document_reference: undefined,
        credit_amount: lines.selfCreditAfterCap,
        subject_to_passive_activity_limit: false,
      },
      ...k1s.map((k1, index) => ({
        source_type: k1.entity_type,
        source_ein: k1.entity_ein,
        source_document_reference: k1.source_document_reference,
        credit_amount: lines.passThroughCreditsAfterCap[index],
        subject_to_passive_activity_limit: false,
      })),
    ].filter((entry) => entry.credit_amount > 0);
    const identity = (
      entry: {
        source_type: string;
        source_ein?: string;
        source_document_reference?: string;
        credit_amount: number;
        subject_to_passive_activity_limit: boolean;
      },
    ) =>
      JSON.stringify([
        entry.source_type,
        entry.source_ein,
        entry.source_document_reference,
        entry.credit_amount,
        entry.subject_to_passive_activity_limit,
      ]);
    if (
      JSON.stringify(entries.map(identity).sort()) !==
        JSON.stringify(expected.map(identity).sort()) ||
      Math.round(
          entries.reduce((sum, entry) => sum + entry.credit_amount, 0) * 100,
        ) !==
        Math.round(lines.line8 * 100) ||
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
      ...(k1s.length ? moneyFields(7, lines.line7) : {}),
      ...moneyFields(8, lines.line8),
    };
  },
  instances(fields, _filer, allPending, prepared) {
    if (Object.keys(fields).length === 0) return [];
    if (!allPending || !prepared) {
      throw new Error("Form 8826 PDF needs the prepared Form 3800 document");
    }
    const source = inputSchema.parse(allPending.f8826);
    const lines = calculateForm8826(source);
    const k1s = source.pass_through_credits ?? [];
    const rows = prepared.currentRows.filter((row) => row.line === "1e");
    const amounts = prepared.currentAmounts.filter((row) => row.line === "1e");
    const details = prepared.currentDetails.filter((row) => row.line === "1e");
    const [row] = rows;
    const [amount] = amounts;
    const expectedDetails = [
      {
        sourceDocumentId: row?.metadata.referenceDocumentId,
        passThroughEin: undefined,
        credit: lines.selfCreditAfterCap,
      },
      ...k1s.map((k1, index) => ({
        sourceDocumentId: undefined,
        passThroughEin: k1.entity_ein,
        credit: lines.passThroughCreditsAfterCap[index],
      })),
    ].filter((detail) => detail.credit > 0);
    const detailIdentity = (
      detail: {
        sourceDocumentId?: string;
        passThroughEin?: string;
        credit: number;
      },
    ) =>
      JSON.stringify([
        detail.sourceDocumentId,
        detail.passThroughEin,
        detail.credit,
      ]);
    const expectedLine8 = moneyFields(8, lines.line8);
    if (
      fields.line8_dollars !== expectedLine8.line8_dollars ||
      fields.line8_cents !== expectedLine8.line8_cents ||
      rows.length !== 1 || amounts.length !== 1 ||
      JSON.stringify(details.map(detailIdentity).sort()) !==
        JSON.stringify(expectedDetails.map(detailIdentity).sort()) ||
      row.metadata.sourceCount !== details.length ||
      row.metadata.referenceDocumentName !== "IRS8826" ||
      !row.metadata.referenceDocumentId ||
      amount.nonpassiveCredit !== lines.line8 ||
      amount.totalCredit !== lines.line8 ||
      amount.transferOutCredit !== 0 ||
      amount.passiveBeforeLimit !== 0 ||
      amount.passiveAfterLimit !== 0 ||
      amount.appliedCredit !==
        details.reduce((sum, detail) => sum + detail.appliedCredit, 0) ||
      prepared.lines.line38 !== allPending.f3800.allowed_credit
    ) {
      throw new Error("Form 8826 PDF differs from filed Form 3800 line 1e");
    }
    assertForm3800FinalCreditJoin(prepared.lines.line38, allPending);
    return [fields];
  },
};
