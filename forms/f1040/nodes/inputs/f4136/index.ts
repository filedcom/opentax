import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule3 } from "../../intermediate/aggregation/schedule3/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Represented 2025 Part II claims retain the IRS line, qualified fuel quantity,
// and column (d) actual fuel cost for the Form 4136 document.
export const FORM4136_RATES = {
  "1a": 0.183,
  "1b": 0.183,
  "1c": 0.183,
  "1d": 0.184,
  "2a": 0.15,
  "2b": 0.193,
  "2c": 0.194,
  "2d": 0.001,
  "3a": 0.243,
  "3b": 0.243,
  "4a": 0.243,
  "4b": 0.243,
  "5c": 0.243,
  "5d": 0.218,
  "11a": 0.183,
  "11b": 0.183,
  "11c": 0.183,
  "11d": 0.183,
  "11e": 0.243,
  "11f": 0.243,
  "11g": 0.243,
  "11h": 0.183,
} as const;

export const FORM4136_BUS_RATES = {
  "11a": 0.109,
  "11b": 0.110,
  "11c": 0.109,
  "11d": 0.110,
  "11e": 0.170,
  "11f": 0.170,
  "11g": 0.169,
  "11h": 0.110,
} as const;

const fuelLine = z.enum([
  "1a",
  "1b",
  "1c",
  "1d",
  "2a",
  "2b",
  "2c",
  "2d",
  "3a",
  "3b",
  "4a",
  "4b",
  "5c",
  "5d",
  "11a",
  "11b",
  "11c",
  "11d",
  "11e",
  "11f",
  "11g",
  "11h",
]);

const alternativeFuelUseCodes = [
  "01",
  "02",
  "04",
  "05",
  "06",
  "07",
  "11",
  "13",
  "14",
  "15",
] as const;
const allowedUseCodes: Partial<
  Record<z.infer<typeof fuelLine>, readonly string[]>
> = {
  "1c": ["04", "05", "07", "11", "13", "14", "15"],
  "2b": ["01", "02", "09", "10", "11", "13", "14", "15"],
  "3a": ["02", "06", "07", "08", "11", "13", "14", "15"],
  "4a": ["02", "06", "07", "08", "11", "13", "14", "15"],
  "5c": ["01", "09", "10", "11", "13", "15", "16"],
  "5d": ["01", "09", "10", "11", "13", "15", "16"],
  "11a": alternativeFuelUseCodes,
  "11b": alternativeFuelUseCodes,
  "11c": alternativeFuelUseCodes,
  "11d": alternativeFuelUseCodes,
  "11e": alternativeFuelUseCodes,
  "11f": alternativeFuelUseCodes,
  "11g": alternativeFuelUseCodes,
  "11h": alternativeFuelUseCodes,
};

export const fuelClaimSchema = z.object({
  line: fuelLine,
  type_of_use: z.string().regex(/^\d{2}$/).optional(),
  unit: z.enum(["gallons", "GGE", "DGE"]),
  qualified_quantity: z.number().int().positive().max(999_999_999),
  actual_fuel_cost: z.number().finite().positive(),
  undyed_fuel_confirmed: z.literal(true).optional(),
  right_to_claim_not_waived: z.literal(true).optional(),
  credit_card_issuer_certificate_not_provided: z.literal(true).optional(),
  not_highway_vehicle: z.literal(true).optional(),
  not_noncommercial_motorboat: z.literal(true).optional(),
  exported_fuel_confirmed: z.literal(true).optional(),
  commercial_aviation_nonforeign_trade_confirmed: z.literal(true).optional(),
  foreign_trade_lust_tax_paid_confirmed: z.literal(true).optional(),
});

const businessSchema = z.object({
  qualifying_business_activity: z.literal(true),
  claimant_is_ultimate_purchaser: z.literal(true),
  business_name: z.string().trim().min(1),
  business_ein: z.string().regex(/^\d{9}$/).optional(),
  principal_activity_code: z.string().regex(/^\d{6}$/),
  equipment_make: z.string().trim().min(1),
  equipment_model: z.string().trim().min(1),
  equipment_type: z.string().trim().min(1),
  purchase_records_confirmed: z.literal(true),
  no_duplicate_excise_claim: z.literal(true),
});

const activitySchema = z.object({
  business: businessSchema,
  claims: z.array(fuelClaimSchema).min(1),
}).superRefine((input, ctx) => {
  const seen = new Set<string>();
  input.claims.forEach((claim, index) => {
    if (claim.type_of_use === "05" && claim.line in FORM4136_BUS_RATES) {
      const requiredUnit = claim.line === "11a" || claim.line === "11c"
        ? "GGE"
        : claim.line === "11g"
        ? "DGE"
        : "gallons";
      if (claim.unit !== requiredUnit) {
        ctx.addIssue({
          code: "custom",
          message: `Form 4136 bus line ${claim.line} must use ${requiredUnit}`,
          path: ["claims", index, "unit"],
        });
      }
    }
    if (
      !["11a", "11c", "11g"].includes(claim.line) &&
      claim.unit !== "gallons"
    ) {
      ctx.addIssue({
        code: "custom",
        message: `Form 4136 line ${claim.line} must use gallons`,
        path: ["claims", index, "unit"],
      });
    }
    const codes = allowedUseCodes[claim.line];
    if (codes && !claim.type_of_use) {
      ctx.addIssue({
        code: "custom",
        message:
          `Form 4136 line ${claim.line} requires an IRS type-of-use code`,
        path: ["claims", index, "type_of_use"],
      });
    }
    if (!codes && claim.type_of_use) {
      ctx.addIssue({
        code: "custom",
        message: `Form 4136 line ${claim.line} has a fixed use type`,
        path: ["claims", index, "type_of_use"],
      });
    }
    if (codes && claim.type_of_use && !codes.includes(claim.type_of_use)) {
      ctx.addIssue({
        code: "custom",
        message: `Form 4136 line ${claim.line} does not allow this type of use`,
        path: ["claims", index, "type_of_use"],
      });
    }
    const requiredFacts = [
      ...(["3a", "3b", "4a", "4b"].includes(claim.line)
        ? ["undyed_fuel_confirmed"] as const
        : []),
      ...(claim.line === "5c" || claim.line === "5d" ||
          (claim.line === "1c" &&
            ["13", "14"].includes(claim.type_of_use ?? "")) ||
          (claim.line === "2b" &&
            ["13", "14"].includes(claim.type_of_use ?? ""))
        ? ["right_to_claim_not_waived"] as const
        : []),
      ...((claim.line === "1c" || claim.line === "2b") &&
          ["13", "14"].includes(claim.type_of_use ?? "")
        ? ["credit_card_issuer_certificate_not_provided"] as const
        : []),
      ...(claim.line === "1c" ? ["not_noncommercial_motorboat"] as const : []),
      ...(claim.line === "1d" || claim.line === "2c"
        ? ["exported_fuel_confirmed"] as const
        : []),
      ...(claim.line === "2a"
        ? ["commercial_aviation_nonforeign_trade_confirmed"] as const
        : []),
      ...(claim.line === "2d"
        ? ["foreign_trade_lust_tax_paid_confirmed"] as const
        : []),
      ...(claim.line === "1a" || claim.type_of_use === "02"
        ? ["not_highway_vehicle"] as const
        : []),
    ];
    for (const fact of requiredFacts) {
      if (claim[fact] !== true) {
        ctx.addIssue({
          code: "custom",
          message: `Form 4136 line ${claim.line} requires ${fact}`,
          path: ["claims", index, fact],
        });
      }
    }
    const key = `${claim.line}:${claim.type_of_use ?? ""}`;
    if (seen.has(key)) {
      ctx.addIssue({
        code: "custom",
        message: "Form 4136 claim line and type of use appear more than once",
        path: ["claims", index, "line"],
      });
    }
    seen.add(key);
  });
});

const businessInputSchema = z.object({
  claimant_context: z.literal("business"),
  business: businessSchema,
  claims: z.array(fuelClaimSchema).min(1),
  additional_activities: z.array(activitySchema),
  primary_activity_has_most_credit: z.literal(true),
});

const homeKeroseneInputSchema = z.object({
  claimant_context: z.literal("home_kerosene"),
  business: z.never().optional(),
  additional_activities: z.never().optional(),
  primary_activity_has_most_credit: z.never().optional(),
  claimant_is_ultimate_purchaser: z.literal(true),
  home_purchase_outside_blocked_pump: z.literal(true),
  home_use_heating_lighting_or_cooking: z.literal(true),
  purchase_records_confirmed: z.literal(true),
  no_duplicate_excise_claim: z.literal(true),
  claims: z.array(fuelClaimSchema).length(1),
});

export const inputSchema = z.discriminatedUnion("claimant_context", [
  businessInputSchema,
  homeKeroseneInputSchema,
]).superRefine((input, ctx) => {
  if (input.claimant_context === "home_kerosene") {
    const claim = input.claims[0];
    if (
      claim.line !== "4a" || claim.type_of_use !== "08" ||
      claim.unit !== "gallons" || claim.undyed_fuel_confirmed !== true
    ) {
      ctx.addIssue({
        code: "custom",
        message:
          "Home-use Form 4136 claims require undyed kerosene on line 4a, type of use 08, in gallons",
        path: ["claims", 0],
      });
    }
    return;
  }
  const primary = activitySchema.safeParse({
    business: input.business,
    claims: input.claims,
  });
  if (!primary.success) {
    for (const issue of primary.error.issues) ctx.addIssue(issue);
  }
  const unitsByLine = new Map<z.infer<typeof fuelLine>, string>();
  const activities = [
    { claims: input.claims },
    ...input.additional_activities,
  ];
  const primaryCreditCents = input.claims.reduce(
    (sum, claim) => sum + form4136ClaimCreditCents(claim),
    0,
  );
  input.additional_activities.forEach((activity, index) => {
    const activityCreditCents = activity.claims.reduce(
      (sum, claim) => sum + form4136ClaimCreditCents(claim),
      0,
    );
    if (activityCreditCents > primaryCreditCents) {
      ctx.addIssue({
        code: "custom",
        message:
          "Form 4136 Part I must identify the business activity generating the most credit",
        path: ["additional_activities", index, "claims"],
      });
    }
  });
  activities.forEach((activity, activityIndex) => {
    activity.claims.forEach((claim, claimIndex) => {
      const previousUnit = unitsByLine.get(claim.line);
      if (previousUnit && previousUnit !== claim.unit) {
        ctx.addIssue({
          code: "custom",
          message:
            `Form 4136 line ${claim.line} cannot combine ${previousUnit} and ${claim.unit} without a verified conversion`,
          path: activityIndex === 0 ? ["claims", claimIndex, "unit"] : [
            "additional_activities",
            activityIndex - 1,
            "claims",
            claimIndex,
            "unit",
          ],
        });
      }
      unitsByLine.set(claim.line, claim.unit);
    });
  });
});

export type Form4136Input = z.infer<typeof inputSchema>;

export function allForm4136Claims(input: Form4136Input) {
  return input.claimant_context === "home_kerosene" ? input.claims : [
    ...input.claims,
    ...input.additional_activities.flatMap((activity) => activity.claims),
  ];
}

export function rateForForm4136Claim(
  claim: Form4136Input["claims"][number],
): number {
  if (claim.type_of_use === "05" && claim.line in FORM4136_BUS_RATES) {
    return FORM4136_BUS_RATES[claim.line as keyof typeof FORM4136_BUS_RATES];
  }
  return FORM4136_RATES[claim.line];
}

export function form4136ClaimCreditCents(
  claim: Form4136Input["claims"][number],
): number {
  return Math.round(
    claim.qualified_quantity * rateForForm4136Claim(claim) * 100,
  );
}

export function calculateForm4136(input: Form4136Input): number {
  const cents = allForm4136Claims(input).reduce(
    (sum, claim) => sum + form4136ClaimCreditCents(claim),
    0,
  );
  return cents / 100;
}

class F4136Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f4136";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule3]);
  readonly pdfUrl = "https://www.irs.gov/pub/irs-pdf/f4136.pdf";

  compute(_ctx: NodeContext, rawInput: Form4136Input): NodeResult {
    const input = inputSchema.parse(rawInput);
    const credit = calculateForm4136(input);
    return {
      outputs: credit > 0
        ? [{
          nodeType: schedule3.nodeType,
          fields: { line12_fuel_tax_credit: credit },
        }]
        : [],
    };
  }
}

export const f4136 = new F4136Node();
