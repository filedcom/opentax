import { z } from "zod";
import type { NodeResult } from "../../../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../../../core/types/node-context.ts";
import { PINEnteredBy } from "../../../../../../f1040/mef/header.ts";
import {
  form4868,
  type Form4868Lines,
} from "../../../../outputs/general/filing/form4868/index.ts";

/** ReturnHeader4868.xsd PINCodeType. */
export enum PinType {
  SelfSelectOnLine = "Self-Select On-Line",
  SelfSelectPractitioner = "Self-Select Practitioner",
  Practitioner = "Practitioner",
}

/** efileTypes.xsd OriginatorType. */
export enum OriginatorType {
  ERO = "ERO",
  OnlineFiler = "OnlineFiler",
  ReportingAgent = "ReportingAgent",
  FinancialAgent = "FinancialAgent",
  LargeTaxpayer = "LargeTaxpayer",
}

export enum BankAccountType {
  Checking = "checking",
  Savings = "savings",
}

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const pin = z.string().regex(/^\d{5}$/);

/** A Form 4868 filer and, with a payment, the Self-Select PIN signature. */
export const signerSchema = z.object({
  first_name: z.string().trim().min(1),
  middle_initial: z.string().trim().length(1).optional(),
  last_name: z.string().trim().min(1),
  ssn: z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/),
  birth_date: date.optional(),
  prior_year_agi: z.number().int().optional(),
  prior_year_pin: pin.optional(),
  signature_pin: pin.optional(),
  signature_date: date.optional(),
  pin_entered_by: z.nativeEnum(PINEnteredBy).optional(),
});

export const addressSchema = z.object({
  line1: z.string().trim().min(1).max(35),
  line2: z.string().trim().min(1).max(35).optional(),
  city: z.string().trim().min(1).max(22),
  state: z.string().regex(/^[A-Z]{2}$/).optional(),
  zip: z.string().regex(/^\d{5}(\d{4})?$/).optional(),
  foreign_country_code: z.string().regex(/^[A-Z]{2}$/).optional(),
  foreign_province_state: z.string().trim().min(1).optional(),
  foreign_postal_code: z.string().trim().min(1).optional(),
}).superRefine((address, context) => {
  const us = address.state !== undefined && address.zip !== undefined;
  if (us === (address.foreign_country_code !== undefined)) {
    context.addIssue({
      code: "custom",
      message: "Address needs either a US state and ZIP or a foreign country",
    });
  }
});

/** IRS Payment Record: an electronic funds withdrawal filed with the extension. */
export const paymentSchema = z.object({
  routing_transit_number: z.string().regex(/^\d{9}$/),
  bank_account_number: z.string().regex(/^[A-Za-z0-9-]{1,17}$/),
  bank_account_type: z.nativeEnum(BankAccountType),
  amount: z.number().positive(),
  requested_payment_date: date,
  daytime_phone: z.string().regex(/^\d{10}$/),
});

export const originatorSchema = z.object({
  efin: z.string().regex(/^\d{6}$/),
  type: z.nativeEnum(OriginatorType),
  practitioner_pin: pin.optional(),
});

export const inputSchema = z.object({
  taxpayer: signerSchema,
  spouse: signerSchema.optional(),
  address: addressSchema,
  in_care_of: z.string().trim().min(1).optional(),
  line4_estimated_total_tax: z.number().int().nonnegative(),
  line5_total_payments: z.number().int().nonnegative(),
  line7_amount_paying: z.number().nonnegative().optional(),
  line8_out_of_country: z.boolean().optional(),
  line9_1040nr_no_wages_withheld: z.boolean().optional(),
  payment: paymentSchema.optional(),
  pin_type: z.nativeEnum(PinType).optional(),
  originator: originatorSchema.optional(),
  software_id: z.string().regex(/^\d{8}$/).optional(),
  ats_test_submission: z.boolean().optional(),
});

export type F4868Input = z.infer<typeof inputSchema>;

/** Line 6: line 4 minus line 5, or zero. */
export function balanceDue(input: F4868Input): number {
  return Math.max(
    0,
    input.line4_estimated_total_tax - input.line5_total_payments,
  );
}

export function form4868Lines(input: F4868Input): Form4868Lines {
  return {
    line4_total_tax_liability: input.line4_estimated_total_tax,
    line5_total_payments: input.line5_total_payments,
    line6_balance_due: balanceDue(input),
    line7_amount_paying: input.line7_amount_paying ?? 0,
    line8_out_of_country: input.line8_out_of_country === true,
    line9_1040nr_no_wages_withheld: input.line9_1040nr_no_wages_withheld ===
      true,
  };
}

class F4868Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f4868";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([form4868]);

  compute(_ctx: NodeContext, input: F4868Input): NodeResult {
    return {
      outputs: [this.outputNodes.output(form4868, form4868Lines(input))],
    };
  }
}

export const f4868 = new F4868Node();
