import { FilingStatus } from "../../nodes/types.ts";
import { z } from "zod";
import { type NodeResult, TaxNode } from "../../../../core/types/tax-node.ts";
import type { NodeContext } from "../../../../core/types/node-context.ts";
import { OutputNodes } from "../../../../core/types/output-nodes.ts";
import { calculateForm2441FromAmounts } from "../../nodes/intermediate/forms/credits/individual/form2441/calculation.ts";
import { dependentCare2026 } from "../../nodes/config/2026-dependent-care.ts";
import { businessReturnSource2026Schema } from "../inputs/business-qbi.ts";
import {
  calculateDependentCareBenefits2026,
  inputSchema as benefitSchema,
} from "../inputs/dependent-care.ts";

const whole = z.number().int().nonnegative();
export const inputSchema = z.object({
  benefit_source: benefitSchema,
  agi: z.number().int(),
  regular_tax: whole,
  schedule2_part1_tax: whole,
  wage_income_from_agi: whole,
  unsupported_earned_income_activity: z.boolean(),
  business_sources_2026: businessReturnSource2026Schema.optional(),
}).strict();
export type CareCreditInput2026 = z.input<typeof inputSchema>;
export function calculateCareCredit2026(raw: CareCreditInput2026) {
  const input = inputSchema.parse(raw);
  const benefit = calculateDependentCareBenefits2026(input.benefit_source);
  if (!benefit.details) {
    return {
      source_input: input,
      benefit,
      lines: null,
      file_form2441: false,
      part3: false,
    };
  }
  if (
    JSON.stringify(input.business_sources_2026) !==
      JSON.stringify(benefit.source_input.business_sources_2026)
  ) {
    throw new Error(
      "Care benefits and final AGI must use the same business sources",
    );
  }
  if (
    input.unsupported_earned_income_activity ||
    input.wage_income_from_agi !== benefit.expected_wage_income
  ) {
    throw new Error("Form 2441 needs reconciliation of non-W-2 earned income");
  }
  for (const person of benefit.qualifying_person_workpaper!.people) {
    if (
      person.custody_other_parent_agi !== undefined &&
      input.agi <= person.custody_other_parent_agi
    ) {
      throw new Error(
        "Equal-night care custody requires calculated AGI greater than the other parent's AGI",
      );
    }
  }
  // Current intake explicitly reviews FTC and Form 8978 as absent. Their
  // finalized credit owners must feed this worksheet before those routes open.
  const details = {
    ...benefit.details,
    tax_liability_limit: input.regular_tax + input.schedule2_part1_tax,
  };
  const core = calculateForm2441FromAmounts(
    details,
    input.agi,
    benefit.benefits,
    dependentCare2026,
    benefit.credit_income!,
  );
  const currentCreditEligible = details.qualifying_people.length > 0 &&
    (details.filing_status !== FilingStatus.MFS ||
      details.mfs_eligibility_met === true);
  const line9a = currentCreditEligible ? core.line9a : 0;
  // MFS without the current-year exception may still claim eligible prior-year
  // expenses: i2441 (2026), line A. Only current credit is suppressed.
  const line9b = benefit.prior_year_worksheet?.lines.line13 ?? 0;
  const line9c = line9a + line9b;
  const lines = {
    ...core,
    line9a,
    line9b,
    line9c,
    line11: Math.min(line9c, core.line10),
    line22: 0,
    line24: 0,
  };
  const part3 = (input.benefit_source.dep_care_benefits ?? 0) > 0 ||
    lines.line13 > 0 || lines.line14 > 0;
  return {
    source_input: input,
    benefit: { ...benefit, details },
    lines,
    current_credit_eligible: currentCreditEligible,
    check_line_a: details.filing_status === FilingStatus.MFS &&
      (currentCreditEligible || line9b > 0),
    file_form2441: part3 || lines.line11 > 0,
    part3,
  };
}
class CareCreditNode2026 extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f2441";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);
  override get outputNodeTypes() {
    return ["schedule3", "f8863"];
  }
  compute(ctx: NodeContext, raw: CareCreditInput2026): NodeResult {
    if (ctx.taxYear !== 2026 || ctx.formType !== "f1040") {
      throw new Error("Care credit needs f1040:2026 context");
    }
    const result = calculateCareCredit2026(raw);
    return {
      outputs: [
        {
          nodeType: "f8863",
          fields: {
            finalized_dependent_care_credit: result.lines?.line11 ?? 0,
          },
        },
        { nodeType: "f2441", fields: { calculation_2026: result } },
        {
          nodeType: "schedule3",
          fields: { line2_childcare_credit: result.lines?.line11 ?? 0 },
        },
      ],
    };
  }
}
export const f2441_2026 = new CareCreditNode2026();
