import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { agi_aggregator } from "../../intermediate/aggregation/agi_aggregator/index.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import {
  ExclusionType,
  form982,
} from "../../intermediate/forms/form982/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

export const itemSchema = z.object({
  creditor_name: z.string(),
  box1_date: z.string().optional(),
  box2_cod_amount: z.number().nonnegative(),
  box3_interest: z.number().nonnegative().optional(),
  // Box 3 is part of box 2, but not QPRI principal. The cash-method
  // deductible-debt exception applies before the QPRI exclusion.
  box3_interest_treatment: z.enum(["cash_basis_deductible_if_paid", "taxable"])
    .optional(),
  box3_interest_treatment_source: z.string().trim().min(1).optional(),
  box4_debt_description: z.string().optional(),
  // Official box 5 asks whether the debtor was personally liable. It does
  // not classify the property's personal or business use.
  box5_personally_liable: z.boolean().optional(),
  box6_identifiable_event: z.string().optional(),
  box7_fmv_property: z.number().nonnegative().optional(),
  property_disposition_status: z.enum(["retained", "transferred"]).optional(),
  routing: z.enum(["taxable", "excluded"]).optional(),
  exclusion_type: z.nativeEnum(ExclusionType).optional(),
  insolvency_amount: z.number().nonnegative().optional(),
  qpri_mfs: z.boolean().optional(),
  qpri_total_loan_balance_before_discharge: z.number().nonnegative().optional(),
  qpri_qualified_loan_balance_before_discharge: z.number().nonnegative()
    .optional(),
  qpri_main_home_security_confirmed: z.literal(true).optional(),
  qpri_discharge_reason: z.enum(["home_value_decline", "financial_condition"])
    .optional(),
  qpri_discharge_reason_source: z.string().trim().min(1).optional(),
  qpri_actual_discharge_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  qpri_discharged_principal_amount: z.number().nonnegative().optional(),
  principal_residence_retained: z.boolean().optional(),
  principal_residence_basis: z.number().nonnegative().optional(),
});

export const inputSchema = z.object({
  f1099cs: z.array(itemSchema),
});

type C99Input = z.infer<typeof inputSchema>;

// Partition items by routing type.
function taxableItems(items: z.infer<typeof itemSchema>[]) {
  return items.filter((item) => (item.routing ?? "taxable") === "taxable");
}

function excludedItems(items: z.infer<typeof itemSchema>[]) {
  return items.filter((item) => item.routing === "excluded");
}

class F1099cNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f1099c";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([
    schedule1,
    agi_aggregator,
    form982,
  ]);

  compute(_ctx: NodeContext, input: C99Input): NodeResult {
    const parsed = inputSchema.parse(input);
    const { f1099cs: c99s } = parsed;

    if (c99s.length === 0) {
      return { outputs: [] };
    }

    for (const item of c99s) {
      const interest = item.box3_interest ?? 0;
      if (interest > item.box2_cod_amount) {
        throw new Error(
          "Form 1099-C box 3 interest exceeds box 2 discharged debt",
        );
      }
      if (
        interest > 0 &&
        (!item.box3_interest_treatment ||
          !item.box3_interest_treatment_source)
      ) {
        throw new Error(
          "Form 1099-C box 3 interest needs documented taxable or cash-basis deductible-debt treatment",
        );
      }
      if (
        interest > 0 && item.routing === "excluded" &&
        item.exclusion_type !== ExclusionType.Qpri
      ) {
        throw new Error(
          "Non-QPRI Form 1099-C interest needs separate exception and exclusion allocation",
        );
      }
      if (item.property_disposition_status === "transferred") {
        throw new Error(
          "Form 1099-C property transfer needs recourse, debt balance, adjusted basis, and holding facts before disposition reporting",
        );
      }
      if (
        (item.box7_fmv_property ?? 0) > 0 &&
        item.property_disposition_status !== "retained"
      ) {
        throw new Error(
          "Form 1099-C box 7 FMV needs an explicit retained-or-transferred property answer",
        );
      }
      if (
        item.exclusion_type === ExclusionType.Qpri &&
        item.routing === "excluded"
      ) {
        if (
          item.qpri_discharged_principal_amount === undefined ||
          interest > item.box2_cod_amount ||
          item.qpri_discharged_principal_amount !==
            item.box2_cod_amount - interest
        ) {
          throw new Error(
            "Form 1099-C QPRI needs box 2 reconciled to discharged principal and box 3 interest, with fees and penalties classified separately",
          );
        }
        if (!item.qpri_actual_discharge_date) {
          throw new Error(
            "Form 1099-C QPRI needs the actual discharge date separately from box 1 identifiable-event date",
          );
        }
      }
    }

    const outputs = [];

    // Aggregate taxable COD income → Schedule 1 line 8c
    const taxableQpriInterest = excludedItems(c99s).reduce(
      (sum, item) =>
        sum + (item.exclusion_type === ExclusionType.Qpri &&
            item.box3_interest_treatment === "taxable"
          ? item.box3_interest ?? 0
          : 0),
      0,
    );
    const totalTaxable = taxableItems(c99s).reduce(
      (sum, item) =>
        sum + item.box2_cod_amount -
        (item.box3_interest_treatment === "cash_basis_deductible_if_paid"
          ? item.box3_interest ?? 0
          : 0),
      0,
    ) + taxableQpriInterest;
    if (totalTaxable > 0) {
      outputs.push(
        this.outputNodes.output(schedule1, { line8c_cod_income: totalTaxable }),
      );
      outputs.push(
        this.outputNodes.output(agi_aggregator, {
          line8c_cod_income: totalTaxable,
        }),
      );
    }

    // Aggregate excluded COD income → Form 982 line 2
    const excluded = excludedItems(c99s);
    const totalExcluded = excluded.reduce(
      (sum, item) =>
        sum + item.box2_cod_amount -
        (item.exclusion_type === ExclusionType.Qpri
          ? item.box3_interest ?? 0
          : 0),
      0,
    );
    if (totalExcluded > 0) {
      const detailed = excluded.filter((item) =>
        item.exclusion_type !== undefined
      );
      if (detailed.length > 0 && excluded.length !== 1) {
        throw new Error(
          "Multiple excluded 1099-C debts need separate Form 982 exclusion detail",
        );
      }
      const detail = detailed[0];
      outputs.push(this.outputNodes.output(form982, {
        line2_excluded_cod: totalExcluded,
        ...(detail?.exclusion_type
          ? { exclusion_type: detail.exclusion_type }
          : {}),
        ...(detail?.insolvency_amount !== undefined
          ? { insolvency_amount: detail.insolvency_amount }
          : {}),
        ...(detail?.qpri_mfs !== undefined
          ? { qpri_mfs: detail.qpri_mfs }
          : {}),
        ...(detail?.qpri_total_loan_balance_before_discharge !== undefined
          ? {
            qpri_total_loan_balance_before_discharge:
              detail.qpri_total_loan_balance_before_discharge,
          }
          : {}),
        ...(detail?.qpri_qualified_loan_balance_before_discharge !== undefined
          ? {
            qpri_qualified_loan_balance_before_discharge:
              detail.qpri_qualified_loan_balance_before_discharge,
          }
          : {}),
        ...(detail?.qpri_main_home_security_confirmed === true
          ? { qpri_main_home_security_confirmed: true }
          : {}),
        ...(detail?.qpri_discharge_reason
          ? { qpri_discharge_reason: detail.qpri_discharge_reason }
          : {}),
        ...(detail?.qpri_discharge_reason_source
          ? {
            qpri_discharge_reason_source: detail.qpri_discharge_reason_source,
          }
          : {}),
        ...(detail?.principal_residence_retained !== undefined
          ? {
            principal_residence_retained: detail.principal_residence_retained,
          }
          : {}),
        ...(detail?.principal_residence_basis !== undefined
          ? { principal_residence_basis: detail.principal_residence_basis }
          : {}),
        ...(detail?.qpri_actual_discharge_date
          ? { discharge_date: detail.qpri_actual_discharge_date }
          : {}),
      }));
    }

    return { outputs };
  }
}

export const f1099c = new F1099cNode();
