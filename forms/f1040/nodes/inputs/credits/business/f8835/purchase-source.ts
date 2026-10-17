import { z } from "zod";
import type { F8835Item, F8835Lines } from "./index.ts";

const reference = z.string().trim().min(1);

/** Form 3800 instructions "Transfer Election Statement or Other Document". */
export const FORM8835_PURCHASE_STATEMENT_DESCRIPTION =
  "Transfer Election Statement";

export enum QualifiedFacilityRequirement {
  UnderOneMw = "under_one_mw",
  ConstructionBefore20230129 = "construction_before_2023_01_29",
  PrevailingWageAndApprenticeship = "prevailing_wage_and_apprenticeship",
}

/**
 * A section 45 credit bought for cash under IRC §6418 (transferee side). The
 * transferor's statement supplies the Form 3800 Part III line, registration
 * number and transferred amount; the transferee reports it in column (f) as a
 * positive amount (2025 Form 3800 instructions, column (f)).
 */
export const purchaseSourceSchema = z.object({
  transferor_name: reference,
  transferor_tin: z.string().regex(/^\d{9}$/),
  registration_number: z.string().regex(
    /^[CPT][A-M][A-Za-z0-9]{3}[0-9]{2}[A-Za-z0-9]{5}$/,
  ),
  form3800_line: z.enum(["1f", "4e"]),
  purchased_credit_amount: z.number().int().positive(),
  agreement_reference: reference,
  cash_consideration_cents: z.number().int().positive(),
  paid_on: z.string().regex(/^2025-\d{2}-\d{2}$/),
  unrelated_under_267b_and_707b_verified: z.literal(true),
  minimum_documentation_received_verified: z.literal(true),
  qualified_facility_requirements: z.array(
    z.nativeEnum(QualifiedFacilityRequirement),
  ).max(3),
  statement_file_name: z.string().regex(
    /^Transfer Election Statement(?: [A-Za-z0-9_-]+)?\.pdf$/,
  ),
  statement_sha256: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();
export type Form8835PurchaseSource = z.infer<typeof purchaseSourceSchema>;

/** A purchased credit is not the filer's production; no Part II credit is figured. */
export function calculatePurchasedForm8835(item: F8835Item): F8835Lines {
  const source = item.purchase_source;
  if (
    !source || item.facility_owned_by_filer !== false ||
    item.facility_owner_person !== undefined ||
    item.facility_owner_business?.name !== source.transferor_name ||
    item.facility_owner_business?.ein !== source.transferor_tin ||
    item.registration_number !== source.registration_number ||
    item.transfer_source !== undefined ||
    (item.transfer_election_amount ?? 0) !== 0 ||
    item.transfer_election_statement_file_name !== undefined ||
    item.is_fiscal_year ||
    // Line 8 answers come from the transferor's statement, not this field.
    item.increased_credit_reason !== "none" ||
    new Set(source.qualified_facility_requirements).size !==
      source.qualified_facility_requirements.length
  ) {
    throw new Error(
      "Form 8835 purchased credit needs the transferor as facility owner, its registration number, and no own production or transfer-out",
    );
  }
  return {
    line1: 0,
    line2: 0,
    line3: 0,
    line4: 0,
    line5a: 0,
    line5b: 0,
    line5c: 0,
    line5d: 0,
    line6: 0,
    line7g: 0,
    line8: 0,
    line9: 0,
    line10: 0,
    line11: 0,
    line12: 0,
    line13: 0,
    line15: 0,
    form3800Line: source.form3800_line,
  };
}
