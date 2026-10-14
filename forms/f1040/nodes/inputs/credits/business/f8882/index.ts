import { z } from "zod";
import {
  type NodeResult,
  output,
  TaxNode,
} from "../../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../../../core/types/node-context.ts";
import { f3800 } from "../f3800/index.ts";

// Form 8882 (Rev. 12/2017) remains the TY2025 direct-employer form. This
// bounded source covers one non-group Schedule C employer's current-year
// contracted facility and/or resource-referral expense, not capital property,
// pass-through credits, controlled groups, or recapture.
const positiveMoney = z.number().int().finite().positive().refine(
  Number.isSafeInteger,
);
const reference = z.string().trim().min(1);
const paidDate = z.string().regex(/^2025-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value;
}, "Use a valid TY2025 date");

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
  if (contract.gross_expenditure_usd % 4 !== 0) {
    ctx.addIssue({
      code: "custom",
      path: ["gross_expenditure_usd"],
      message: "Bounded Form 8882 source needs a whole-dollar 25% credit",
    });
  }
});

const referralContract = contractSource.extend({
  childcare_resource_and_referral_services_confirmed: z.literal(true),
}).strict().superRefine((contract, ctx) => {
  if (contract.gross_expenditure_usd % 10 !== 0) {
    ctx.addIssue({
      code: "custom",
      path: ["gross_expenditure_usd"],
      message: "Bounded Form 8882 source needs a whole-dollar 10% credit",
    });
  }
});

export const inputSchema = z.object({
  source_type: z.literal("direct_schedule_c"),
  schedule_c_business_reference: reference,
  proprietor_ssn: z.string().regex(/^\d{9}$/),
  no_controlled_group_or_common_control_confirmed: z.literal(true),
  no_pass_through_credit_confirmed: z.literal(true),
  no_prior_facility_credit_recapture_event_confirmed: z.literal(true),
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
  const facilityCredit =
    (source.facility_contract?.gross_expenditure_usd ?? 0) / 4;
  const referralCredit =
    (source.referral_contract?.gross_expenditure_usd ?? 0) / 10;
  if (facilityCredit + referralCredit > 150_000) {
    ctx.addIssue({
      code: "custom",
      path: ["facility_contract"],
      message: "Capped credit allocation needs a separate deduction workpaper",
    });
  }
});

export type F8882Input = z.infer<typeof inputSchema>;

export function calculateForm8882(raw: F8882Input) {
  const source = inputSchema.parse(raw);
  const line1 = source.facility_contract?.gross_expenditure_usd ?? 0;
  const line2 = line1 / 4;
  const line3 = source.referral_contract?.gross_expenditure_usd ?? 0;
  const line4 = line3 / 10;
  const line5 = 0; // Direct-employer source; pass-through credits are separate.
  const line6 = line2 + line4 + line5;
  const line7 = Math.min(line6, 150_000);
  return { line1, line2, line3, line4, line5, line6, line7 };
}

class F8882Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8882";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([f3800]);

  compute(_ctx: NodeContext, rawInput: F8882Input): NodeResult {
    const source = inputSchema.parse(rawInput);
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
