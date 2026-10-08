import { inputSchema as trustK1SourceSchema } from "../../../../nodes/inputs/k1_trust/index.ts";

/** Replay Form 6251 line 2j from identified trust K-1 box 12 code A copies. */
export function assertForm6251TrustSource(
  fields: Readonly<Record<string, unknown>>,
  pending: Readonly<Record<string, unknown>> | undefined,
): void {
  const amount = fields.line2j_estates_and_trusts;
  const parsed = trustK1SourceSchema.safeParse(pending?.k1_trust);
  const items = parsed.success
    ? parsed.data.k1_trusts.filter((item) =>
      (item.box12_code_a_amt_adjustment ?? 0) !== 0
    )
    : [];
  const total = items.reduce(
    (sum, item) => sum + item.box12_code_a_amt_adjustment!,
    0,
  );
  if (
    (amount === undefined || amount === null || amount === 0) &&
    total === 0
  ) return;
  const references = items.map((item) => item.source_document_reference);
  const form1040 = pending?.f1040 as Record<string, unknown> | undefined;
  const schedule2 = pending?.schedule2 as Record<string, unknown> | undefined;
  const filedAmt = fields.line11_amt;
  const taxpayerTin = typeof form1040?.taxpayer_ssn === "string"
    ? form1040.taxpayer_ssn.replace(/\D/g, "")
    : undefined;
  const spouseTin = typeof form1040?.spouse_ssn === "string"
    ? form1040.spouse_ssn.replace(/\D/g, "")
    : undefined;
  if (
    !parsed.success || items.length === 0 ||
    typeof amount !== "number" || amount !== total ||
    new Set(references).size !== references.length ||
    items.some((item) =>
      !item.estate_trust_ein || !item.source_document_reference ||
      !item.beneficiary_ssn ||
      (item.beneficiary_ssn !== taxpayerTin &&
        !(form1040?.filing_status === "mfj" &&
          item.beneficiary_ssn === spouseTin)) ||
      item.box12_codes_b_through_f_absent !== true ||
      item.box12_codes_g_through_i_absent !== true ||
      (item.box12_amt ?? 0) !== 0
    ) ||
    typeof filedAmt !== "number" || filedAmt < 0 ||
    (filedAmt === 0
      ? fields.must_file_for_negative_adjustments !== true ||
        (schedule2?.line2_amt ?? 0) !== 0
      : schedule2?.line2_amt !== filedAmt) ||
    typeof form1040?.line17_additional_taxes !== "number" ||
    form1040.line17_additional_taxes < filedAmt ||
    typeof form1040.line16_income_tax !== "number" ||
    form1040.line18_total_tax_before_credits !==
      form1040.line16_income_tax + form1040.line17_additional_taxes
  ) {
    throw new Error(
      "Form 6251 line 2j needs beneficiary-owned trust K-1 code A sources matching its signed amount and final-return tax",
    );
  }
}
