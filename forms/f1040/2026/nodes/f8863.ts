import {
  childTaxInput2026Schema,
  resolveChildTax2026,
} from "../inputs/child-tax.ts";
import { adoptionIncomeBridge2026Schema } from "../inputs/adoption-settlement.ts";
import { adoptionSupportWages2026 } from "../inputs/adoption-support.ts";
import { z } from "zod";
import { type NodeResult, TaxNode } from "../../../../core/types/tax-node.ts";
import type { NodeContext } from "../../../../core/types/node-context.ts";
import { OutputNodes } from "../../../../core/types/output-nodes.ts";
import { FilingStatus } from "../../nodes/types.ts";
import {
  calculateAocStudentLines,
  calculateForm8863AllowableRatio,
  calculateForm8863Line19,
} from "../../nodes/inputs/credits/individual/f8863/index.ts";
import {
  educationClaim2026Schema,
  resolveEducationExpenses2026,
} from "../inputs/education-source.ts";
import { roundWholeDollars } from "../../whole-dollars.ts";
import { businessReturnSource2026Schema } from "../inputs/business-qbi.ts";
import { businessCreditEarnings2026 } from "../inputs/business-earned.ts";
import { businessPersonalServices2026 } from "../inputs/business-personal-services.ts";
const whole = z.number().int().nonnegative();
const person = z.object({
  tin: z.string(),
  name: z.string().min(1),
  valid_ssn: z.boolean(),
  owner: z.enum(["taxpayer", "spouse", "dependent"]),
}).strict();
export const inputSchema = educationClaim2026Schema.partial().extend({
  education_context: z.object({
    filing_status: z.nativeEnum(FilingStatus),
    taxpayer_dob: z.string().date(),
    tax_residency: z.string().optional(),
    students: z.array(person),
  }).strict(),
  agi: z.number().int(),
  earned_income_from_agi: z.number().int(),
  adoption_income_2026: adoptionIncomeBridge2026Schema.optional(),
  unsupported_earned_income_activity: z.boolean(),
  business_sources_2026: businessReturnSource2026Schema.optional(),
  regular_tax: whole,
  child_tax_source_2026: childTaxInput2026Schema.optional(),
  schedule2_part1_tax: whole,
  finalized_dependent_care_credit: whole,
  finalized_schedule_r_credit: whole.default(0),
}).strict();
export type EducationInput2026 = z.input<typeof inputSchema>;
export function calculateEducationCredit2026(raw: EducationInput2026) {
  const input = inputSchema.parse(raw),
    claim = input.claim,
    context = input.education_context;
  if (!claim) {
    return {
      source_input: input,
      lines: null,
      students: [],
      file_form8863: false,
      under24_nonrefundable: false,
    };
  }
  if (
    context.filing_status === FilingStatus.MFS ||
    context.tax_residency !== "full_year_citizen_or_resident"
  ) {
    throw new Error(
      "Education credit requires eligible filing status and reviewed citizen/resident treatment",
    );
  }
  if (input.unsupported_earned_income_activity) {
    throw new Error(
      "Education credit needs the foreign, scholarship or business earned-income source owner",
    );
  }
  const filers = context.students.filter((p) => p.owner !== "dependent");
  const under24 = context.filing_status !== FilingStatus.MFJ &&
    context.taxpayer_dob > "2003-01-01";
  const adoption = under24 && input.adoption_income_2026
    ? adoptionSupportWages2026(
      input.adoption_income_2026,
      {
        filing_status: context.filing_status,
        taxpayer_ssn: filers.find((p) => p.owner === "taxpayer")?.tin ?? "",
        spouse_ssn: filers.find((p) => p.owner === "spouse")?.tin,
      },
      input.earned_income_from_agi,
      claim.adoption_inventory_reference,
    )
    : undefined;
  if (
    claim.adoption_inventory_reference &&
    claim.adoption_inventory_reference !==
      input.adoption_income_2026?.source.claim.record_reference
  ) {
    throw Error(
      "Education adoption review needs the actual adoption inventory",
    );
  }
  let businessWorkpaper:
    | ReturnType<typeof businessPersonalServices2026>
    | undefined;
  if (input.business_sources_2026) {
    if (
      claim.business_inventory_reference !==
        input.business_sources_2026.record_reference
    ) {
      throw new Error(
        "Education claim needs the actual business inventory reference",
      );
    }
    businessCreditEarnings2026(
      input.business_sources_2026,
      context.filing_status,
      {
        taxpayer_ssn: filers.find((p) => p.owner === "taxpayer")?.tin,
        spouse_ssn: filers.find((p) => p.owner === "spouse")?.tin,
      },
    );
    if (under24 || input.business_sources_2026.earned_income_review) {
      businessWorkpaper = businessPersonalServices2026(
        input.business_sources_2026,
      );
    }
  } else if (claim.business_inventory_reference) {
    throw new Error("Education business review needs actual business sources");
  }
  const supportEarned = Math.max(
    0,
    (adoption?.wages_for_support ?? input.earned_income_from_agi) +
      (businessWorkpaper?.taxpayer_education_earned_income ?? 0),
  );
  if (!filers.some((p) => p.valid_ssn)) {
    throw new Error(
      "2026 education credits require an employment-valid SSN issued by the due date for at least one filer",
    );
  }
  const students = resolveEducationExpenses2026(claim).map((s) => {
    const identities = context.students.filter((p) =>
      p.tin.replaceAll("-", "") === s.student_tin
    );
    if (identities.length !== 1) {
      throw new Error(
        "Education student must be the filer, joint spouse or an actually claimed eligible dependent",
      );
    }
    const identity = identities[0];
    if (identity.owner === "dependent" && !identity.valid_ssn) {
      throw new Error(
        "2026 dependent education student needs an employment-valid SSN issued by the due date",
      );
    }
    const rawLines = calculateAocStudentLines(s.adjusted_expenses);
    const line29 = roundWholeDollars(rawLines.line29);
    const aotc_lines = {
      ...rawLines,
      line29,
      line30: rawLines.line28 === 0 ? rawLines.line27 : 2000 + line29,
    };
    return {
      ...s,
      name: identity.name,
      owner: identity.owner,
      aotc_lines: s.credit_type === "aotc" ? aotc_lines : null,
    };
  });
  const review = claim.refundable_review;
  if (under24 !== (review.kind === "under24_nonjoint")) {
    throw new Error(
      "Education refundable review must match primary filer age and filing status",
    );
  }
  let denied = false;
  let support = 0;
  if (review.kind === "under24_nonjoint") {
    if (
      new Set(review.full_time_student_months).size !==
        review.full_time_student_months.length ||
      new Set(review.support_records.map((r) => r.record_reference)).size !==
        review.support_records.length
    ) throw new Error("Education support/enrollment records must be distinct");
    const fullTime = review.full_time_student_months.length >= 5;
    support = review.support_records.reduce(
      (n, r) => n + (fullTime && r.payer === "scholarship" ? 0 : r.amount),
      0,
    );
    if (input.child_tax_source_2026) {
      const child = resolveChildTax2026(input.child_tax_source_2026);
      const c = child.source_input.child_context, facts = child.eligibility;
      if (
        !facts || c.taxpayer_dob !== context.taxpayer_dob ||
        c.taxpayer_ssn !==
          filers.find((p) => p.owner === "taxpayer")?.tin.replaceAll("-", "") ||
        child.source_input.income_context.agi !== input.agi ||
        child.source_input.income_context.wages !==
          input.earned_income_from_agi ||
        JSON.stringify(child.source_input.business_sources_2026) !==
          JSON.stringify(input.business_sources_2026) ||
        JSON.stringify(child.source_input.adoption_income_2026) !==
          JSON.stringify(input.adoption_income_2026) ||
        facts.parent_alive !== review.at_least_one_parent_alive ||
        facts.support !== support ||
        JSON.stringify(
            [...child.source_input.claim!.full_time_student_months].sort((
              a,
              b,
            ) => a - b),
          ) !==
          JSON.stringify(
            [...review.full_time_student_months].sort((a, b) => a - b),
          )
      ) {
        throw new Error(
          "Education and child-tax reviews must reconcile the same filer, school, support and living-parent facts",
        );
      }
    }
    const under18 = context.taxpayer_dob > "2009-01-01";
    const age18 = context.taxpayer_dob > "2008-01-01" && !under18;
    denied = review.at_least_one_parent_alive &&
      (under18 ||
        ((age18 || fullTime) && supportEarned * 2 < support));
  }
  const line1 = students.reduce((n, s) => n + (s.aotc_lines?.line30 ?? 0), 0);
  const joint = context.filing_status === FilingStatus.MFJ,
    upper = joint ? 180000 : 90000,
    span = joint ? 20000 : 10000;
  const ratio = calculateForm8863AllowableRatio(
    input.agi,
    joint,
    160000,
    180000,
    80000,
    90000,
  );
  const line7 = roundWholeDollars(line1 * ratio),
    line8 = denied ? 0 : roundWholeDollars(line7 * .4),
    line9 = line7 - line8;
  const line10 = students.reduce(
    (n, s) => n + (s.credit_type === "llc" ? s.adjusted_expenses : 0),
    0,
  );
  const line11 = Math.min(10000, line10),
    line12 = roundWholeDollars(line11 * .2),
    line18 = roundWholeDollars(line12 * ratio);
  const credit_limit_worksheet = {
    form1040_line18_tax: input.regular_tax + input.schedule2_part1_tax,
    schedule3_line1_foreign_tax_credit: 0,
    schedule3_line2_dependent_care_credit:
      input.finalized_dependent_care_credit,
    schedule3_line6d: input.finalized_schedule_r_credit,
    schedule3_line6l: 0,
  };
  const line19 = calculateForm8863Line19(
    line9 + line18,
    credit_limit_worksheet,
  );
  return {
    source_input: input,
    students,
    under24_nonrefundable: denied,
    support_workpaper: support,
    earned_income_workpaper: {
      wages: input.earned_income_from_agi,
      business: businessWorkpaper ?? null,
      adoption: adoption ?? null,
      earned_income_for_support: under24 ? supportEarned : null,
    },
    credit_limit_worksheet,
    lines: {
      line1,
      line2: upper,
      line3: input.agi,
      line4: Math.max(0, upper - input.agi),
      line5: span,
      line6: ratio,
      line7,
      line8,
      line9,
      line10,
      line11,
      line12,
      line13: upper,
      line14: input.agi,
      line15: Math.max(0, upper - input.agi),
      line16: span,
      line17: ratio,
      line18,
      line19,
    },
    file_form8863: line8 > 0 || line19 > 0,
  };
}
class EducationCredit2026Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8863";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);
  override get outputNodeTypes() {
    return ["schedule3", "f1040", "form1062"];
  }
  compute(ctx: NodeContext, raw: EducationInput2026): NodeResult {
    if (ctx.taxYear !== 2026 || ctx.formType !== "f1040") {
      throw new Error("Education credit needs f1040:2026 context");
    }
    const calculation = calculateEducationCredit2026(raw);
    return {
      outputs: [{
        nodeType: "form1062",
        fields: {
          education: calculation.source_input,
          line29_refundable_aotc: calculation.lines?.line8 ?? 0,
        },
      }, {
        nodeType: "f8863",
        fields: { calculation_2026: calculation },
      }, {
        nodeType: "schedule3",
        fields: { line3_education_credit: calculation.lines?.line19 ?? 0 },
      }, {
        nodeType: "f1040",
        fields: { line29_refundable_aotc: calculation.lines?.line8 ?? 0 },
      }],
    };
  }
}
export const f8863_2026 = new EducationCredit2026Node();
