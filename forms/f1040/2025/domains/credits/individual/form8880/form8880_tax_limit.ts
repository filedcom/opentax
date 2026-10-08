import type { Fields as F1040Fields } from "../../../../mef/forms/general/return-assembly/f1040.ts";
import type { Fields as Schedule3Fields } from "../../../../mef/forms/general/return-assembly/schedule3.ts";
import type { Fields as Schedule1Fields } from "../../../../mef/forms/general/return-assembly/schedule1/schedule1.ts";
import {
  calculateForm8880,
  inputSchema as form8880InputSchema,
} from "../../../../../nodes/intermediate/forms/credits/individual/form8880/calculation.ts";
import {
  calculatePhysicalPresence2555,
  physicalPresenceFilingSchema,
} from "../../../../../nodes/intermediate/forms/income/foreign/form2555/calculation.ts";
import {
  assertDistinctW2IssuedCopies,
  inputSchema as w2InputSchema,
} from "../../../../../nodes/inputs/income/wages/w2/index.ts";
import { inputSchema as generalInputSchema } from "../../../../../nodes/inputs/general/filing/general/index.ts";

const saverCreditCodes = new Set(["D", "E", "F", "H", "S", "AA", "BB", "EE"]);

function assertForm8880W2DeferralSources(
  source: ReturnType<typeof form8880InputSchema.parse>,
  pending: Readonly<Record<string, unknown>>,
): void {
  if (!source.w2_deferral_entries?.length) return;
  if (pending.w2 === undefined) {
    throw new Error(
      "Form 8880 W-2 deferrals differ from retained W-2 box 12 sources",
    );
  }
  const w2s = w2InputSchema.parse(pending.w2).w2s;
  assertDistinctW2IssuedCopies(w2s);
  const actual = source.w2_deferral_entries.map((entry) =>
    JSON.stringify([
      entry.employee_ssn.replaceAll("-", ""),
      entry.code,
      entry.amount,
      entry.governmental_457b ?? null,
      entry.employee_elective_amount ?? null,
      entry.employee_split_review_ref ?? null,
    ])
  ).sort();
  const expected = w2s.flatMap((item) =>
    (item.box12_entries ?? [])
      .filter((entry) =>
        (saverCreditCodes.has(entry.code) && entry.amount > 0) ||
        (entry.code === "G" && (entry.code_g_employee_elective_amount ?? 0) > 0)
      )
      .map((entry) =>
        JSON.stringify([
          item.employee_ssn?.replaceAll("-", "") ?? null,
          entry.code,
          entry.amount,
          entry.code === "G" ? true : null,
          entry.code === "G"
            ? entry.code_g_employee_elective_amount ?? null
            : null,
          entry.code === "G"
            ? entry.code_g_employee_split_review_ref ?? null
            : null,
        ])
      )
  ).sort();
  if (
    actual.length !== expected.length ||
    actual.some((entry, index) => entry !== expected[index])
  ) {
    throw new Error(
      "Form 8880 W-2 deferrals differ from retained W-2 box 12 sources",
    );
  }
}

function assertForm8880GeneralEligibility(
  source: ReturnType<typeof form8880InputSchema.parse>,
  fields: Record<string, unknown>,
  pending: Readonly<Record<string, unknown>>,
): void {
  // Standalone Form 8880 inputs can supply reviewed eligibility facts. When
  // the return retains their general-source origin, replay each claimed owner.
  if (pending.general === undefined) return;
  const general = generalInputSchema.parse(pending.general);
  const sameOwner = (left: string | undefined, right: string | undefined) =>
    left === undefined && right === undefined ||
    left !== undefined && right !== undefined &&
      /^\d{9}$/.test(left.replaceAll("-", "")) &&
      left.replaceAll("-", "") === right.replaceAll("-", "");
  if (source.filing_status !== general.filing_status) {
    throw new Error(
      "Form 8880 retained general eligibility differs from claimed owner facts",
    );
  }
  const claimed = [
    {
      amount: fields.print_line6a_eligible,
      sourceSsn: source.taxpayer_ssn,
      generalSsn: general.taxpayer_ssn,
      sourceDob: source.taxpayer_dob,
      generalDob: general.taxpayer_dob,
      sourceStudent: source.taxpayer_student_five_months,
      generalStudent: general.taxpayer_form8880_student_five_months,
      sourceDependent: source.taxpayer_claimed_as_dependent,
      generalDependent: general.taxpayer_form8880_claimed_as_dependent,
    },
    {
      amount: fields.print_line6b_eligible,
      sourceSsn: source.spouse_ssn,
      generalSsn: general.spouse_ssn,
      sourceDob: source.spouse_dob,
      generalDob: general.spouse_dob,
      sourceStudent: source.spouse_student_five_months,
      generalStudent: general.spouse_form8880_student_five_months,
      sourceDependent: source.spouse_claimed_as_dependent,
      generalDependent: general.spouse_form8880_claimed_as_dependent,
    },
  ];
  for (const owner of claimed) {
    if (typeof owner.amount !== "number" || owner.amount <= 0) continue;
    if (
      !sameOwner(owner.sourceSsn, owner.generalSsn) ||
      owner.sourceDob !== owner.generalDob ||
      owner.sourceStudent !== owner.generalStudent ||
      owner.sourceDependent !== owner.generalDependent
    ) {
      throw new Error(
        "Form 8880 retained general eligibility differs from claimed owner facts",
      );
    }
  }
}

// 2025 Form 8880 Credit Limit Worksheet: 1040 line 18 less Schedule 3
// lines 1 through 3, 6d, and 6l. The retirement credit on line 4 is not
// subtracted from its own limit.
export function assertForm8880TaxLimit(
  line11: number,
  credit: number,
  pending: Readonly<Record<string, unknown>>,
): void {
  const f1040 = pending.f1040 as F1040Fields | undefined;
  const schedule3 = pending.schedule3 as Schedule3Fields | undefined;
  const line18 = f1040?.line18_total_tax_before_credits;
  if (
    typeof line18 !== "number" || !Number.isFinite(line18) || line18 < 0
  ) {
    throw new Error(
      "Form 8880 needs finalized Form 1040 line 18 for its credit-limit worksheet",
    );
  }
  const creditLines = [
    schedule3?.line1_total,
    schedule3?.line2_childcare_credit,
    schedule3?.line3_education_credit,
    schedule3?.line6d_elderly_disabled_credit,
    schedule3?.line6l_form8978_credit,
  ];
  if (
    creditLines.some((amount) =>
      amount !== undefined && amount !== null &&
      (!Number.isFinite(amount) || amount < 0)
    )
  ) {
    throw new Error(
      "Form 8880 credit-limit worksheet has invalid Schedule 3 amounts",
    );
  }
  const priorCredits = creditLines.reduce<number>(
    (sum, amount) => sum + (amount ?? 0),
    0,
  );
  if (!Number.isFinite(line11) || !Number.isFinite(credit) || credit <= 0) {
    throw new Error(
      "Form 8880 needs finite positive calculated credit amounts",
    );
  }
  const expected = Math.max(0, line18 - priorCredits);
  if (line11 !== expected) {
    throw new Error(
      "Form 8880 line 11 differs from the finalized credit-limit worksheet",
    );
  }
  if (schedule3?.line4_retirement_savings_credit !== credit) {
    throw new Error("Form 8880 credit differs from Schedule 3 line 4");
  }
}

export function assertForm8880EligibleTotals(
  taxpayer: unknown,
  spouse: unknown,
  total: unknown,
): void {
  if (
    typeof taxpayer !== "number" || !Number.isFinite(taxpayer) ||
    taxpayer < 0 ||
    (spouse !== undefined &&
      (typeof spouse !== "number" || !Number.isFinite(spouse) || spouse < 0)) ||
    typeof total !== "number" || !Number.isFinite(total) || total <= 0 ||
    taxpayer + (typeof spouse === "number" ? spouse : 0) !== total
  ) {
    throw new Error(
      "Form 8880 line 7 differs from eligible contributor lines 6a and 6b",
    );
  }
}

export function assertForm8880FiledCalculation(
  fields: object,
  pending: Readonly<Record<string, unknown>>,
): void {
  const source = form8880InputSchema.parse(fields);
  assertForm8880W2DeferralSources(source, pending);
  assertForm8880GeneralEligibility(
    source,
    fields as Record<string, unknown>,
    pending,
  );
  const f1040 = pending.f1040 as F1040Fields | undefined;
  if (
    !f1040 || source.filing_status !== f1040.filing_status ||
    source.agi === undefined || source.agi !== f1040.line11_agi
  ) {
    throw new Error(
      "Form 8880 filing status and AGI need the finalized Form 1040 source",
    );
  }
  const form2555 = pending.form2555;
  const filing = form2555 && typeof form2555 === "object" &&
      "filing_details" in form2555
    ? physicalPresenceFilingSchema.safeParse(form2555.filing_details)
    : undefined;
  const foreignLines = filing?.success
    ? calculatePhysicalPresence2555(filing.data, 2025)
    : undefined;
  const foreignAddback = source.foreign_agi_addback ?? 0;
  const schedule1 = pending.schedule1 as Schedule1Fields | undefined;
  if (
    foreignAddback !== (foreignLines?.line45 ?? 0) +
        (foreignLines?.line50 ?? 0) ||
    (schedule1?.line8d_foreign_earned_income_exclusion ?? 0) !==
      (foreignLines?.line45 ?? 0)
  ) {
    throw new Error(
      "Form 8880 foreign AGI addback differs from filed Form 2555 and Schedule 1",
    );
  }
  const line18 = f1040.line18_total_tax_before_credits;
  const schedule3 = pending.schedule3 as Schedule3Fields | undefined;
  if (typeof line18 !== "number" || !schedule3) {
    throw new Error(
      "Form 8880 source calculation needs the finalized return and Schedule 3",
    );
  }
  const capacity = Math.max(
    0,
    line18 -
      (schedule3.line1_total ?? 0) -
      (schedule3.line2_childcare_credit ?? 0) -
      (schedule3.line3_education_credit ?? 0) -
      (schedule3.line6d_elderly_disabled_credit ?? 0) -
      (schedule3.line6l_form8978_credit ?? 0),
  );
  const calculated = calculateForm8880(
    { taxYear: 2025, formType: "f1040" },
    source,
    capacity,
  );
  if (calculated.calculatedZero) {
    throw new Error(
      "Form 8880 positive filing has no positive source calculation",
    );
  }
  const expected = Object.entries(calculated.printFields).filter(([key]) =>
    key.startsWith("print_")
  );
  const actual = Object.entries(fields).filter(([key]) =>
    key.startsWith("print_")
  );
  if (
    expected.length !== actual.length ||
    expected.some(([key, value]) =>
      !actual.some(([actualKey, actualValue]) =>
        actualKey === key && actualValue === value
      )
    )
  ) {
    throw new Error("Form 8880 filed lines differ from its source calculation");
  }
}
