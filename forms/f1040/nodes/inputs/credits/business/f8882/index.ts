import { z } from "zod";
import {
  type NodeResult,
  output,
  TaxNode,
} from "../../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../../../core/types/node-context.ts";
import { f3800 } from "../f3800/index.ts";
import { configForYear } from "../../../../config/index.ts";

// Form 8882 (Rev. 12/2017) for TY2025 and the draft Rev. December 2026 form
// for P.L. 119-21 §70401. This bounded source covers one non-group Schedule C
// employer's current-year contracted facility and/or resource-referral
// expense, not capital property, jointly owned facilities, pass-through
// credits, controlled groups, or recapture.
const positiveMoney = z.number().int().finite().positive().refine(
  Number.isSafeInteger,
);
const reference = z.string().trim().min(1);
const paidDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value;
}, "Use a valid date");

const contractSource = z.object({
  provider_name: reference,
  provider_ein: z.string().regex(/^\d{9}$/),
  contract_reference: reference,
  payment_ledger_reference: reference,
  schedule_c_expense_description: reference,
  paid_or_incurred_date: paidDate,
  gross_expenditure_usd: positiveMoney,
  available_to_employees_confirmed: z.literal(true),
  no_highly_compensated_employee_discrimination_confirmed: z.literal(true),
  no_other_credit_or_deduction_for_credited_portion_confirmed: z.literal(true),
}).strict();

const facilityContract = contractSource.extend({
  facility_license_reference: reference,
  facility_license_state: z.string().regex(/^[A-Z]{2}$/),
  facility_principal_use_childcare_confirmed: z.literal(true),
  facility_complies_with_state_local_law_confirmed: z.literal(true),
  employer_principal_trade_is_not_childcare_facility_confirmed: z.literal(true),
  no_capital_property_or_residence_expenditure_confirmed: z.literal(true),
  fair_market_value_of_care_usd: positiveMoney,
}).strict().superRefine((contract, ctx) => {
  if (contract.gross_expenditure_usd > contract.fair_market_value_of_care_usd) {
    ctx.addIssue({
      code: "custom",
      path: ["gross_expenditure_usd"],
      message: "Contracted care expenditure cannot exceed fair market value",
    });
  }
});

const referralContract = contractSource.extend({
  childcare_resource_and_referral_services_confirmed: z.literal(true),
}).strict();

export const inputSchema = z.object({
  source_type: z.literal("direct_schedule_c"),
  schedule_c_business_reference: reference,
  proprietor_ssn: z.string().regex(/^\d{9}$/),
  no_controlled_group_or_common_control_confirmed: z.literal(true),
  no_pass_through_credit_confirmed: z.literal(true),
  no_prior_facility_credit_recapture_event_confirmed: z.literal(true),
  /** Item A: an IRC §45F(c)(4) eligible small business. */
  eligible_small_business: z.boolean().optional(),
  facility_contract: facilityContract.optional(),
  referral_contract: referralContract.optional(),
}).strict().superRefine((source, ctx) => {
  if (!source.facility_contract && !source.referral_contract) {
    ctx.addIssue({
      code: "custom",
      path: ["facility_contract"],
      message: "One current-year contract is required",
    });
  }
  if (
    source.facility_contract && source.referral_contract &&
    (source.facility_contract.payment_ledger_reference ===
        source.referral_contract.payment_ledger_reference ||
      source.facility_contract.schedule_c_expense_description ===
        source.referral_contract.schedule_c_expense_description)
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["referral_contract"],
      message:
        "Facility and referral need distinct ledger rows and expense descriptions",
    });
  }
});

export type F8882Input = z.infer<typeof inputSchema>;

/** The tax year of the contracts' payments; each contract is current-year. */
export function form8882ContractYear(source: F8882Input): number {
  const years = new Set(
    [source.facility_contract, source.referral_contract].flatMap((contract) =>
      contract ? [Number(contract.paid_or_incurred_date.slice(0, 4))] : []
    ),
  );
  if (years.size !== 1) {
    throw new Error("Form 8882 contracts must be paid or incurred in one year");
  }
  return [...years][0];
}

function wholeDollars(amount: number, line: string): number {
  const rounded = Math.round(amount);
  if (Math.abs(amount - rounded) > 1e-9) {
    throw new Error(`Bounded Form 8882 source needs a whole-dollar ${line}`);
  }
  return rounded;
}

/** Lines in the Rev. 12/2017 order: 2 is the facility credit, 7 the limit. */
export function calculateForm8882(raw: F8882Input) {
  const source = inputSchema.parse(raw);
  const year = form8882ContractYear(source);
  const terms = configForYear(year).employerProvidedChildcare;
  const tiered = terms.smallBusinessFacilityRate !== terms.facilityRate ||
    terms.smallBusinessCreditLimit !== terms.creditLimit;
  if (tiered && source.eligible_small_business === undefined) {
    throw new Error(
      `Form 8882 for ${year} needs item A: whether the employer is an eligible small business`,
    );
  }
  const small = tiered && source.eligible_small_business === true;
  const rate = small ? terms.smallBusinessFacilityRate : terms.facilityRate;
  const limit = small ? terms.smallBusinessCreditLimit : terms.creditLimit;
  const line1 = source.facility_contract?.gross_expenditure_usd ?? 0;
  const line2 = wholeDollars(line1 * rate, "facility credit");
  const line3 = source.referral_contract?.gross_expenditure_usd ?? 0;
  const line4 = wholeDollars(line3 * terms.referralRate, "referral credit");
  const line5 = 0; // Direct-employer source; pass-through credits are separate.
  const line6 = line2 + line4 + line5;
  if (line6 > limit) {
    throw new Error(
      "Capped credit allocation needs a separate deduction workpaper",
    );
  }
  const line7 = line6;
  return { line1, line2, line3, line4, line5, line6, line7 };
}

class F8882Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8882";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([f3800]);

  compute(ctx: NodeContext, rawInput: F8882Input): NodeResult {
    const source = inputSchema.parse(rawInput);
    if (form8882ContractYear(source) !== ctx.taxYear) {
      throw new Error(
        `Form 8882 contracts must be paid or incurred in ${ctx.taxYear}`,
      );
    }
    return {
      outputs: [output(f3800, {
        f8882_direct_employer_credit: {
          credit_amount: calculateForm8882(source).line7,
          schedule_c_business_reference: source.schedule_c_business_reference,
          subject_to_passive_activity_limit: false,
        },
      })],
    };
  }
}

export const f8882 = new F8882Node();
