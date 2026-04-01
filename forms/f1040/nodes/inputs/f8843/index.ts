import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Form 8843 — Statement for Exempt Individuals and Individuals With a Medical Condition
// IRC §7701(b)(3)(D); IRC §7701(b)(5); Reg. §301.7701(b)-3
//
// Filed by aliens who were present in the US and want to exclude "exempt"
// days from the Substantial Presence Test. Pure statement form — no tax
// computation. Must be filed even if no US income and no other filing obligation.

// Maximum calendar days that can be excluded in a year
const MAX_EXCLUDABLE_DAYS = 366;

// Exempt individual categories per IRC §7701(b)(5)
export enum ExemptCategory {
  // F/J/M/Q visa students (max 5 calendar years total) — IRC §7701(b)(5)(D)
  STUDENT = "STUDENT",
  // J/Q visa teachers and trainees (max 2 years in any 6-year period) — IRC §7701(b)(5)(E)
  TEACHER_TRAINEE = "TEACHER_TRAINEE",
  // A/G visa foreign government officials — IRC §7701(b)(5)(B)
  GOVERNMENT_OFFICIAL = "GOVERNMENT_OFFICIAL",
  // Professional athletes in charitable sports events — IRC §7701(b)(5)(C)
  ATHLETE = "ATHLETE",
  // Individuals unable to leave US due to a medical condition — IRC §7701(b)(3)(D)(ii)
  MEDICAL = "MEDICAL",
}

// Per-individual schema — one Form 8843 per exempt individual
export const itemSchema = z.object({
  // Category of exemption (determines applicable rules and year limits)
  exempt_category: z.nativeEnum(ExemptCategory),
  // Visa classification (e.g., F-1, J-1, M-1, Q-1, A, G)
  visa_type: z.string().optional(),
  // Taxpayer's country of citizenship (Form 8843 Part I line 1)
  country_of_citizenship: z.string().optional(),
  // Number of days excluded from SPT count for the current tax year
  days_excluded_current_year: z.number().int().nonnegative(),
  // Name of supervising academic institution (required for STUDENT category)
  supervising_academic_institution: z.string().optional(),
});

export const inputSchema = z.object({
  f8843s: z.array(itemSchema).min(1),
});

type F8843Item = z.infer<typeof itemSchema>;

function validateDays(item: F8843Item): void {
  if (item.days_excluded_current_year > MAX_EXCLUDABLE_DAYS) {
    throw new Error(
      `Form 8843: days_excluded_current_year (${item.days_excluded_current_year}) cannot exceed ${MAX_EXCLUDABLE_DAYS}. IRC §7701(b)(3)(D).`,
    );
  }
}

class F8843Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8843";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const parsed = inputSchema.parse(input);

    for (const item of parsed.f8843s) {
      validateDays(item);
    }

    // Form 8843 is a pure statement — no downstream computation.
    return { outputs: [] };
  }
}

export const f8843 = new F8843Node();
