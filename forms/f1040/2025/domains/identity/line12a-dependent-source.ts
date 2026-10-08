import {
  inputSchema as generalInputSchema,
  isAge65ByEndOfTaxYear,
} from "../../../nodes/inputs/general/index.ts";
import { inputSchema as w2InputSchema } from "../../../nodes/inputs/w2/index.ts";
import { FilingStatus } from "../../../nodes/types.ts";

function amount(fields: Record<string, unknown>, key: string): number {
  const value = fields[key];
  const last = Array.isArray(value) ? value.at(-1) : value;
  return typeof last === "number" ? last : 0;
}

/** Keep the bounded MFJ dependent worksheet and refund-only claim tied to source. */
export function assertJointDependentRefundSource(
  fields: Record<string, unknown>,
  pending?: Readonly<Record<string, unknown>>,
): void {
  const rawGeneral = pending?.general as Record<string, unknown> | undefined;
  if (
    rawGeneral?.spouse_can_be_claimed_as_dependent === true &&
    fields.spouse_can_be_claimed_as_dependent !== true
  ) {
    throw new Error(
      "Form 1040 line 12a spouse dependent differs from retained source",
    );
  }
  const claimed = fields.taxpayer_can_be_claimed_as_dependent === true ||
    fields.spouse_can_be_claimed_as_dependent === true;
  if (!claimed || fields.filing_status !== FilingStatus.MFJ) {
    if (fields.spouse_can_be_claimed_as_dependent === true) {
      throw new Error("Form 1040 line 12a spouse dependent requires MFJ");
    }
    return;
  }
  const general = generalInputSchema.parse(pending?.general);
  if (
    !general.spouse_ssn ||
    general.filing_status !== FilingStatus.MFJ ||
    general.taxpayer_can_be_claimed_as_dependent !==
      fields.taxpayer_can_be_claimed_as_dependent ||
    general.spouse_can_be_claimed_as_dependent !==
      fields.spouse_can_be_claimed_as_dependent ||
    !general.mfj_dependent_refund_only_review
  ) {
    throw new Error(
      "Form 1040 line 12a MFJ dependent boxes need matching reviewed general source",
    );
  }
  const source = w2InputSchema.parse(pending?.w2);
  const recipients = new Set([
    general.taxpayer_ssn?.replace(/\D/g, ""),
    general.spouse_ssn.replace(/\D/g, ""),
  ]);
  const wages = source.w2s.reduce((sum, row) => {
    if (
      !row.employee_ssn || !recipients.has(row.employee_ssn.replace(/\D/g, ""))
    ) {
      throw new Error(
        "MFJ dependent worksheet W-2 recipient must match a spouse",
      );
    }
    return sum + row.box1_wages;
  }, 0);
  const w2Withheld = source.w2s.reduce(
    (sum, row) => sum + row.box2_fed_withheld,
    0,
  );
  if (
    source.w2s.length === 0 ||
    general.dependent_earned_income !== wages ||
    amount(fields, "line1a_wages") !== wages ||
    amount(fields, "line1z_total_wages") !== wages ||
    amount(fields, "line25a_w2_withheld") !== w2Withheld ||
    amount(fields, "line25b_withheld_1099") !== 0 ||
    amount(fields, "line25c_total") !== 0 ||
    Object.entries(pending?.schedule1 as Record<string, unknown> ?? {}).some(
      ([key, value]) =>
        key.startsWith("line") &&
        (Array.isArray(value)
          ? value.some((part) => typeof part === "number" && part !== 0)
          : typeof value === "number" && value !== 0),
    )
  ) {
    throw new Error(
      "MFJ dependent worksheet earned income needs matching W-2 wages without Schedule 1 income",
    );
  }
  const taxpayerAgeFromDob = isAge65ByEndOfTaxYear(
    general.taxpayer_dob,
    2025,
    "taxpayer",
  );
  const spouseAgeFromDob = isAge65ByEndOfTaxYear(
    general.spouse_dob,
    2025,
    "spouse",
  );
  if (
    (general.taxpayer_age_65_or_older !== undefined &&
      general.taxpayer_age_65_or_older !== taxpayerAgeFromDob) ||
    (general.spouse_age_65_or_older !== undefined &&
      general.spouse_age_65_or_older !== spouseAgeFromDob)
  ) {
    throw new Error(
      "MFJ dependent worksheet age answer conflicts with date of birth",
    );
  }
  for (
    const [key, expected] of [
      [
        "taxpayer_age_65_or_older",
        general.taxpayer_age_65_or_older ?? taxpayerAgeFromDob,
      ],
      [
        "spouse_age_65_or_older",
        general.spouse_age_65_or_older ?? spouseAgeFromDob,
      ],
      ["taxpayer_blind", general.taxpayer_blind],
      ["spouse_blind", general.spouse_blind],
    ] as const
  ) {
    if (expected === undefined || (fields[key] === true) !== expected) {
      throw new Error(
        "MFJ dependent worksheet age and blindness must match identified spouse sources",
      );
    }
  }
  const ageBlindCount = [
    "taxpayer_age_65_or_older",
    "taxpayer_blind",
    "spouse_age_65_or_older",
    "spouse_blind",
  ].filter((key) => fields[key] === true).length;
  const expectedDeduction = Math.min(31_500, Math.max(1_350, wages + 450)) +
    1_600 * ageBlindCount;
  if (
    amount(fields, "line12a_standard_deduction") !== expectedDeduction ||
    amount(fields, "line12c_deduction_total") !== expectedDeduction ||
    amount(fields, "line12e_itemized_deductions") !== 0 ||
    amount(fields, "dependent_count") !== 0 ||
    (Array.isArray(fields.dependent_details) &&
      fields.dependent_details.length !== 0) ||
    amount(fields, "qualifying_child_tax_credit_count") !== 0 ||
    amount(fields, "other_dependent_count") !== 0
  ) {
    throw new Error(
      "MFJ dependent return differs from its worksheet or claims dependents",
    );
  }
  for (
    const key of [
      "line16_income_tax",
      "line17_additional_taxes",
      "line19_child_tax_credit",
      "line18_total_tax_before_credits",
      "line20_nonrefundable_credits",
      "line21_credits_total",
      "line22_tax_after_credits",
      "line23_other_taxes",
      "line24_total_tax",
      "line27_eitc",
      "line28_actc",
      "line29_refundable_aoc",
      "line30_refundable_adoption",
      "line31_additional_payments",
      "line32_refundable_credits_total",
      "line37_amount_owed",
    ]
  ) {
    if (amount(fields, key) !== 0) {
      throw new Error(
        "MFJ dependent joint return can only claim a payment refund",
      );
    }
  }
  const payments = w2Withheld + amount(fields, "line26_estimated_tax");
  if (
    payments <= 0 || amount(fields, "line33_total_payments") !== payments ||
    amount(fields, "line34_overpayment") !== payments ||
    amount(fields, "line35a_refund") !== payments
  ) {
    throw new Error(
      "MFJ dependent joint return needs a refund of matched withholding or estimated payments",
    );
  }
}
