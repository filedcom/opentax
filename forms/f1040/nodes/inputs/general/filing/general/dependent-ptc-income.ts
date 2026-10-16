import { z } from "zod";

/** Annual amounts for the shared, single-dependent Form 8962 Worksheet 1-2. */
export interface DependentPtcAnnualRules<Y extends 2025 | 2026 = 2025 | 2026> {
  readonly taxYear: Y;
  readonly singleStandardDeduction: number;
  readonly dependentMinimum: number;
  readonly earnedIncomeAddition: number;
  readonly ageOrBlindAddition: number;
  /** Source cents and filed whole-dollar entries stay separate. */
  readonly sumSourceAmounts?: (values: readonly number[]) => number;
  readonly formEntry?: (value: number) => number;
}

export const dependentPtcRules2025: DependentPtcAnnualRules<2025> = {
  taxYear: 2025,
  singleStandardDeduction: 15_750,
  dependentMinimum: 1_350,
  earnedIncomeAddition: 450,
  ageOrBlindAddition: 2_000,
};

const ptcDividendSourceSchema = z.object({
  source_document_id: z.string().min(1),
  payer_ein: z.string().regex(/^\d{9}$/),
  recipient_ssn: z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/),
  box1a_ordinary_dividends: z.number().positive(),
  box1b_qualified_dividends: z.literal(0),
  box2a_capital_gain_distributions: z.literal(0),
  box12_exempt_interest_dividends: z.literal(0),
}).strict();

export function dependentPtcReturnSchemaForYear<Y extends 2025 | 2026>(
  rules: DependentPtcAnnualRules<Y>,
) {
  return z.union([
    z.object({
      filing: z.literal("not_required"),
      // Bounded wage-only Table 2 determination. The reviewed inventory also
      // rules out the separate Pub. 501 Table 3 filing triggers.
      wage_form_w2: z.object({
        source_document_id: z.string().min(1),
        employer_name: z.string().trim().min(1),
        employer_ein: z.string().regex(/^\d{9}$/),
        employee_ssn: z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/),
        box1_wages: z.number().positive(),
      }).strict(),
      filing_requirement_review: z.object({
        source_document_id: z.string().min(1),
        dependent_ssn: z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/),
        tax_year: z.literal(rules.taxYear),
        filing_status: z.literal("single"),
        blind: z.literal(false),
        wage_source_document_id: z.string().min(1),
        other_income_reviewed_absent: z.literal(true),
        other_filing_triggers_reviewed_absent: z.literal(true),
        return_filed: z.literal(false),
        reviewed_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        reviewer_name: z.string().trim().min(1),
      }).strict(),
    }).strict(),
    z.object({
      filing: z.literal("not_required"),
      interest_form1099: z.object({
        source_document_id: z.string().min(1),
        recipient_ssn: z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/),
        box1_taxable_interest: z.number().positive().max(
          rules.dependentMinimum,
        ),
        box8_tax_exempt_interest: z.number().nonnegative(),
      }).strict(),
      filing_requirement_review: z.object({
        source_document_id: z.string().min(1),
        dependent_ssn: z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/),
        tax_year: z.literal(rules.taxYear),
        filing_status: z.literal("single"),
        blind: z.literal(false),
        interest_source_document_id: z.string().min(1),
        other_income_reviewed_absent: z.literal(true),
        other_filing_triggers_reviewed_absent: z.literal(true),
        return_filed: z.literal(false),
        reviewed_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        reviewer_name: z.string().trim().min(1),
      }).strict(),
    }).strict(),
    z.object({ filing: z.literal("form8814") }),
    z.object({
      filing: z.literal("required"),
      filed_form1040: z.object({
        source_document_id: z.string().min(1),
        taxpayer_ssn: z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/).optional(),
        tax_year: z.literal(rules.taxYear),
        filing_status: z.literal("single"),
        blind: z.boolean(),
        line1z_wages: z.number().nonnegative(),
        line2a_tax_exempt_interest: z.number().nonnegative(),
        line2b_taxable_interest: z.number().nonnegative(),
        line3b_dividends: z.number().nonnegative(),
        line4b_ira: z.literal(0),
        line5b_pensions: z.literal(0),
        line6b_social_security: z.literal(0),
        line7a_capital_gain: z.literal(0),
        line8_additional_income: z.literal(0),
        line10_adjustments: z.literal(0),
        line11b_agi: z.number().positive(),
      }).strict(),
      interest_forms1099: z.array(
        z.object({
          source_document_id: z.string().min(1),
          recipient_ssn: z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/).optional(),
          box1_taxable_interest: z.number().nonnegative(),
          box8_tax_exempt_interest: z.number().nonnegative(),
        }).strict(),
      ),
      dividend_form1099: ptcDividendSourceSchema.optional(),
      dividend_forms1099: z.array(ptcDividendSourceSchema).min(1).optional(),
      wage_forms_w2: z.array(
        z.object({
          source_document_id: z.string().min(1),
          employer_name: z.string().trim().min(1),
          employer_ein: z.string().regex(/^\d{9}$/),
          employee_ssn: z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/),
          box1_wages: z.number().positive(),
        }).strict(),
      ).min(1).optional(),
    }).strict(),
  ]);
}

export type DependentPtcReturn = z.infer<
  ReturnType<typeof dependentPtcReturnSchemaForYear>
>;
export interface DependentPtcFacts {
  readonly ssn?: string;
  readonly dob: string;
  readonly ptc_tax_return?: DependentPtcReturn;
}

type RequiredDependentReturn = Extract<
  DependentPtcReturn,
  { filing: "required" }
>;

export function ptcDependentDividendSources(source: RequiredDependentReturn) {
  if (
    source.dividend_form1099 !== undefined &&
    source.dividend_forms1099 !== undefined
  ) {
    throw new Error(
      "Form 8962 dependent dividend sources must use one collection",
    );
  }
  return source.dividend_forms1099 ??
    (source.dividend_form1099 ? [source.dividend_form1099] : []);
}

export function calculateDependentPtcMagi(
  dependents: readonly DependentPtcFacts[],
  rules: DependentPtcAnnualRules,
): number {
  const sum = rules.sumSourceAmounts ??
    ((values: readonly number[]) =>
      values.reduce((total, value) => total + value, 0));
  const entry = rules.formEntry ?? ((value: number) => value);
  const claimedSsns = dependents.map((dependent) =>
    dependent.ssn?.replaceAll("-", "")
  ).filter((ssn): ssn is string => ssn !== undefined);
  if (new Set(claimedSsns).size !== claimedSsns.length) {
    throw new Error("Form 8962 claimed dependents need distinct SSNs");
  }
  return dependents.reduce((total, dep) => {
    const taxReturn = dep.ptc_tax_return;
    if (taxReturn?.filing === "not_required") {
      const review = taxReturn.filing_requirement_review;
      if (review.tax_year !== rules.taxYear) {
        throw new Error(
          "Form 8962 dependent review tax year does not match the annual rules",
        );
      }
      const birth = /^\d{4}-\d{2}-\d{2}$/.test(dep.dob)
        ? new Date(`${dep.dob}T00:00:00Z`)
        : new Date(Number.NaN);
      const reviewed = new Date(`${review.reviewed_on}T00:00:00Z`);
      if (
        Number.isNaN(birth.getTime()) ||
        birth.toISOString().slice(0, 10) !== dep.dob
      ) {
        throw new Error("Form 8962 dependent needs a valid birth date");
      }
      if (
        birth.getTime() < Date.UTC(rules.taxYear - 64, 0, 2) ||
        Number.isNaN(reviewed.getTime()) ||
        reviewed.toISOString().slice(0, 10) !== review.reviewed_on ||
        reviewed.getTime() < Date.UTC(rules.taxYear + 1, 0, 1) ||
        review.dependent_ssn.replaceAll("-", "") !==
          dep.ssn?.replaceAll("-", "") ||
        !dep.ssn
      ) {
        throw new Error(
          `Form 8962 dependent not-required review must match the under-65 dependent and ${rules.taxYear} filing threshold`,
        );
      }
      if ("wage_form_w2" in taxReturn) {
        const wage = taxReturn.wage_form_w2;
        if (
          wage.box1_wages > rules.singleStandardDeduction ||
          !("wage_source_document_id" in review) ||
          review.wage_source_document_id !== wage.source_document_id ||
          review.source_document_id === wage.source_document_id ||
          wage.employee_ssn.replaceAll("-", "") !== dep.ssn.replaceAll("-", "")
        ) {
          throw new Error(
            "Form 8962 dependent wage-only not-required review must match the W-2 and filing threshold",
          );
        }
      } else {
        const interest = taxReturn.interest_form1099;
        if (
          !("interest_source_document_id" in review) ||
          review.interest_source_document_id !== interest.source_document_id ||
          review.source_document_id === interest.source_document_id ||
          interest.recipient_ssn.replaceAll("-", "") !==
            dep.ssn.replaceAll("-", "")
        ) {
          throw new Error(
            "Form 8962 dependent interest-only not-required review must match the Form 1099-INT",
          );
        }
      }
      return total;
    }
    if (!taxReturn || taxReturn.filing !== "required") return total;
    const filed = taxReturn.filed_form1040;
    if (filed.tax_year !== rules.taxYear) {
      throw new Error(
        "Form 8962 dependent return tax year does not match the annual rules",
      );
    }
    const taxableInterest = sum(taxReturn.interest_forms1099.map(
      (source) => source.box1_taxable_interest,
    ));
    const exemptInterest = sum(taxReturn.interest_forms1099.map(
      (source) => source.box8_tax_exempt_interest,
    ));
    const wages = sum((taxReturn.wage_forms_w2 ?? []).map(
      (source) => source.box1_wages,
    ));
    const dividendSources = ptcDependentDividendSources(taxReturn);
    const dividends = sum(dividendSources.map(
      (source) => source.box1a_ordinary_dividends,
    ));
    const documents = [
      filed.source_document_id,
      ...taxReturn.interest_forms1099.map((source) =>
        source.source_document_id
      ),
      ...(taxReturn.wage_forms_w2 ?? []).map((source) =>
        source.source_document_id
      ),
      ...dividendSources.map((source) => source.source_document_id),
    ];
    if (new Set(documents).size !== documents.length) {
      throw new Error(
        "Form 8962 dependent needs distinct filed-return and income source documents",
      );
    }
    if (
      taxReturn.wage_forms_w2 &&
      new Set(taxReturn.wage_forms_w2.map((form) => form.employer_ein)).size !==
        taxReturn.wage_forms_w2.length
    ) {
      throw new Error(
        "Form 8962 dependent W-2 wage sources need distinct documents and employers",
      );
    }
    if (wages + taxableInterest + dividends <= 0) {
      throw new Error(
        "Form 8962 dependent needs positive sourced earned or unearned income",
      );
    }
    if (
      filed.line1z_wages !== entry(wages) ||
      filed.line2a_tax_exempt_interest !== entry(exemptInterest) ||
      filed.line2b_taxable_interest !== entry(taxableInterest) ||
      filed.line3b_dividends !== entry(dividends) ||
      filed.line11b_agi !==
        entry(wages) + entry(taxableInterest) + entry(dividends)
    ) {
      throw new Error(
        "Form 8962 dependent filed Form 1040 wages, interest, dividends, and AGI must reconcile to W-2 or Forms 1099",
      );
    }
    const birth = /^\d{4}-\d{2}-\d{2}$/.test(dep.dob)
      ? new Date(`${dep.dob}T00:00:00Z`)
      : new Date(Number.NaN);
    if (
      Number.isNaN(birth.getTime()) ||
      birth.toISOString().slice(0, 10) !== dep.dob
    ) {
      throw new Error("Form 8962 dependent needs a valid birth date");
    }
    const age65 = birth.getTime() < Date.UTC(rules.taxYear - 64, 0, 2);
    // Pub. 501 Table 2: each age/blind condition adds the annual amount.
    const increase = (age65 ? rules.ageOrBlindAddition : 0) +
      (filed.blind ? rules.ageOrBlindAddition : 0);
    const unearned = sum([taxableInterest, dividends]);
    const gross = sum([wages, unearned]);
    const combinedThreshold = Math.max(
      rules.dependentMinimum + increase,
      Math.min(
        wages,
        rules.singleStandardDeduction - rules.earnedIncomeAddition,
      ) + rules.earnedIncomeAddition + increase,
    );
    if (
      unearned <= rules.dependentMinimum + increase &&
      wages <= rules.singleStandardDeduction + increase &&
      gross <= combinedThreshold
    ) {
      throw new Error(
        `Form 8962 dependent sourced income does not establish the ${rules.taxYear} single-dependent filing requirement`,
      );
    }
    return total + filed.line11b_agi + entry(exemptInterest);
  }, 0);
}
