import { form8826InterpreterInputs } from "../../../../pdf/reviews/credits/business/review-8826-interpreter.fixture.ts";

export const disabledAccessInventoryCases = [
  { id: "mixed-two", credits: [100, 200], receipts: 80000 },
  { id: "exact-cap", credits: [1300, 1325], receipts: 80000 },
  { id: "seventeen-sources", credits: Array(16).fill(100), receipts: 80000 },
  { id: "above-cap-integral", credits: Array(15).fill(475), receipts: 80000 },
  { id: "above-cap-cents", credits: Array(31).fill(100), receipts: 80000 },
  { id: "partial-tax-use", credits: [100, 200], receipts: 22000 },
  { id: "zero-tax-use", credits: [100, 200], receipts: 6000 },
];

/** Synthetic reviewed interpreter and issued K-1 facts; no authenticity claim. */
export function disabledAccessInventoryFixture(
  c: typeof disabledAccessInventoryCases[number],
) {
  const base = form8826InterpreterInputs(c.receipts);
  const credits = c.credits.map((credit_amount, index) => ({
    entity_type: index % 2 === 0
      ? "partnership" as const
      : "s_corporation" as const,
    entity_ein: String(610000001 + index),
    source_document_reference: `2025 access credit K-1 ${index + 1}`,
    credit_amount,
    subject_to_passive_activity_limit: false,
  }));
  return {
    ...base,
    f8826: { ...base.f8826, pass_through_credits: credits },
    k1_partnership: credits.filter((c) => c.entity_type === "partnership").map((
      c,
      i,
    ) => ({
      recipient_tin: "111223333",
      partnership_name: `Access Partnership ${i + 1}`,
      partnership_ein: c.entity_ein,
      source_document_reference: c.source_document_reference,
      box15_code_k_disabled_access_credit: c.credit_amount,
      disabled_access_credit_subject_to_passive_activity_limit: false,
    })),
    k1_s_corp: credits.filter((c) => c.entity_type === "s_corporation").map((
      c,
      i,
    ) => ({
      recipient_tin: "111223333",
      corporation_name: `Access Corporation ${i + 1}`,
      corporation_ein: c.entity_ein,
      source_document_reference: c.source_document_reference,
      box13_code_k_disabled_access_credit: c.credit_amount,
      disabled_access_credit_subject_to_passive_activity_limit: false,
    })),
  };
}
