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
  "3c": 0.243,
  "3d": 0.17,
  "3e": 0.244,
  "4a": 0.243,
  "4b": 0.243,
  "4c": 0.17,
  "4d": 0.244,
  "4e": 0.043,
  "4f": 0.218,
  "5a": 0.2,
  "5b": 0.175,
  "5c": 0.243,
  "5d": 0.218,
  "5e": 0.001,
  "6a": 0.243,
  "6b": 0.17,
  "11a": 0.183,
  "11b": 0.183,
  "11c": 0.183,
  "11d": 0.183,
  "11e": 0.243,
  "11f": 0.243,
  "11g": 0.243,
  "11h": 0.183,
  "14a": 0.197,
  "14b": 0.198,
  "15a": 0.046,
  "16a": 0.001,
  "16b": 0.001,
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
  "14a": 0.124,
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
  "3c",
  "3d",
  "3e",
  "4a",
  "4b",
  "4c",
  "4d",
  "4e",
  "4f",
  "5a",
  "5b",
  "5c",
  "5d",
  "5e",
  "6a",
  "6b",
  "11a",
  "11b",
  "11c",
  "11d",
  "11e",
  "11f",
  "11g",
  "11h",
  "14a",
  "14b",
  "15a",
  "16a",
  "16b",
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
const saleDate = z.string().refine((value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value;
}, "Invalid sale date");
const modelWaiverN = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("single_purchase"),
    record_reference: z.string().trim().min(1),
    invoice_or_delivery_ticket_number: z.string().trim().min(1),
    waived_gallons: z.number().int().positive(),
    signed_by_buyer_confirmed: z.literal(true),
    held_unexpired_when_claimed_confirmed: z.literal(true),
  }),
  z.object({
    kind: z.literal("account_period"),
    record_reference: z.string().trim().min(1),
    account_or_order_number: z.string().trim().min(1),
    effective_date: saleDate,
    expiration_date: saleDate,
    signed_by_buyer_confirmed: z.literal(true),
    held_unexpired_when_claimed_confirmed: z.literal(true),
  }),
]);
const allowedUseCodes: Partial<
  Record<z.infer<typeof fuelLine>, readonly string[]>
> = {
  "1c": ["04", "05", "07", "11", "13", "14", "15"],
  "2b": ["01", "02", "09", "10", "11", "13", "14", "15"],
  "3a": ["02", "06", "07", "08", "11", "13", "14", "15"],
  "4a": ["02", "06", "07", "08", "11", "13", "14", "15"],
  "4e": ["02"],
  "4f": ["02"],
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
  "14a": ["01", "02", "05", "06", "07", "08", "11", "13", "14", "15"],
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
  aviation_gasoline_outside_propulsion_confirmed: z.literal(true).optional(),
  export_proof: z.object({
    kind: z.enum([
      "carrier_bill_of_lading",
      "export_carrier_certificate",
      "foreign_customs_bill_of_lading",
      "foreign_consignee_receipt_statement",
    ]),
    record_reference: z.string().trim().min(1),
  }).optional(),
  commercial_aviation_nonforeign_trade_confirmed: z.literal(true).optional(),
  foreign_trade_lust_tax_paid_confirmed: z.literal(true).optional(),
  train_use_confirmed: z.literal(true).optional(),
  certain_intercity_or_local_bus_use_confirmed: z.literal(true).optional(),
  excise_tax_rate_per_gallon: z.number().finite().positive().optional(),
  vendor_registration_number: z.string().regex(/^[A-Z0-9]{1,20}$/).optional(),
  vendor_tax_settlement: z.enum([
    "tax_excluded_price",
    "tax_repaid_to_buyer",
    "buyer_written_consent",
  ]).optional(),
  government_sales: z.array(z.object({
    sale_date: saleDate,
    buyer_name: z.string().trim().min(1),
    buyer_ein: z.string().regex(/^\d{9}$/),
    gallons: z.number().int().positive(),
    certificate_p_record_reference: z.string().trim().min(1),
    certificate_information_believed_true: z.literal(true),
    exclusive_government_use_confirmed: z.literal(true),
  })).min(1).optional(),
  intercity_local_bus_sales: z.array(z.object({
    sale_date: saleDate,
    buyer_name: z.string().trim().min(1),
    buyer_address: z.string().trim().min(1),
    gallons: z.number().int().positive(),
    certain_intercity_or_local_bus_use_confirmed: z.literal(true),
    waiver_n: modelWaiverN,
  })).min(1).optional(),
  emulsion_water_percentage: z.number().finite().min(14).max(100).optional(),
  emulsion_epa_additive_record_reference: z.string().trim().min(1).max(100)
    .optional(),
  exporter_of_record_confirmed: z.literal(true).optional(),
  exported_fuel_kind: z.enum([
    "dyed_diesel",
    "gasoline_blendstock",
    "dyed_kerosene",
  ]).optional(),
  blender_registration_number: z.string().regex(/^M[A-Z0-9]{1,19}$/).optional(),
  blender_produced_confirmed: z.literal(true).optional(),
  blender_input_diesel_gallons: z.number().int().positive().optional(),
  blender_trade_or_business_disposition: z.enum([
    "used_in_business",
    "sold_for_business_use",
  ]).optional(),
});

const businessSchema = z.object({
  qualifying_business_activity: z.literal(true),
  claimant_is_ultimate_purchaser: z.literal(true).optional(),
  business_name: z.string().trim().min(1),
  business_ein: z.string().regex(/^\d{9}$/).optional(),
  principal_activity_code: z.string().regex(/^\d{6}$/),
  equipment_make: z.string().trim().min(1),
  equipment_model: z.string().trim().min(1),
  equipment_type: z.string().trim().min(1),
  purchase_records_confirmed: z.literal(true).optional(),
  sales_records_confirmed: z.literal(true).optional(),
  export_records_confirmed: z.literal(true).optional(),
  production_records_confirmed: z.literal(true).optional(),
  no_duplicate_excise_claim: z.literal(true),
});

const activitySchema = z.object({
  business: businessSchema,
  claims: z.array(fuelClaimSchema).min(1),
}).superRefine((input, ctx) => {
  const seen = new Set<string>();
  input.claims.forEach((claim, index) => {
    if (claim.line === "6a") {
      if (!/^UV[A-Z0-9]{1,18}$/.test(claim.vendor_registration_number ?? "")) {
        ctx.addIssue({
          code: "custom",
          message:
            "Form 4136 line 6a needs an IRS-issued UV registration number",
          path: ["claims", index, "vendor_registration_number"],
        });
      }
      if (!claim.vendor_tax_settlement) {
        ctx.addIssue({
          code: "custom",
          message: "Form 4136 line 6a needs the vendor tax-settlement method",
          path: ["claims", index, "vendor_tax_settlement"],
        });
      }
      if (
        !claim.government_sales?.length ||
        claim.government_sales.reduce((sum, sale) => sum + sale.gallons, 0) !==
          claim.qualified_quantity
      ) {
        ctx.addIssue({
          code: "custom",
          message:
            "Form 4136 line 6a government sales must reconcile to claimed gallons",
          path: ["claims", index, "government_sales"],
        });
      }
      if (input.business.sales_records_confirmed !== true) {
        ctx.addIssue({
          code: "custom",
          message: "Form 4136 line 6a needs confirmed sales records",
          path: ["business", "sales_records_confirmed"],
        });
      }
    } else if (claim.line === "6b") {
      if (!/^UB[A-Z0-9]{1,18}$/.test(claim.vendor_registration_number ?? "")) {
        ctx.addIssue({
          code: "custom",
          message:
            "Form 4136 line 6b needs an IRS-issued UB registration number",
          path: ["claims", index, "vendor_registration_number"],
        });
      }
      if (!claim.vendor_tax_settlement) {
        ctx.addIssue({
          code: "custom",
          message: "Form 4136 line 6b needs the vendor tax-settlement method",
          path: ["claims", index, "vendor_tax_settlement"],
        });
      }
      if (
        !claim.intercity_local_bus_sales?.length ||
        claim.intercity_local_bus_sales.reduce(
            (sum, sale) => sum + sale.gallons,
            0,
          ) !== claim.qualified_quantity
      ) {
        ctx.addIssue({
          code: "custom",
          message:
            "Form 4136 line 6b bus sales must reconcile to claimed gallons",
          path: ["claims", index, "intercity_local_bus_sales"],
        });
      }
      for (
        const [saleIndex, sale] of (
          claim.intercity_local_bus_sales ?? []
        ).entries()
      ) {
        const waiver = sale.waiver_n;
        if (waiver.kind === "single_purchase") {
          if (waiver.waived_gallons !== sale.gallons) {
            ctx.addIssue({
              code: "custom",
              message:
                "Form 4136 line 6b single-purchase waiver gallons must match the sale",
              path: [
                "claims",
                index,
                "intercity_local_bus_sales",
                saleIndex,
                "waiver_n",
              ],
            });
          }
        } else {
          const latestExpiration = new Date(
            `${waiver.effective_date}T00:00:00.000Z`,
          );
          latestExpiration.setUTCFullYear(
            latestExpiration.getUTCFullYear() + 1,
          );
          if (
            waiver.effective_date > sale.sale_date ||
            sale.sale_date > waiver.expiration_date ||
            waiver.expiration_date > latestExpiration.toISOString().slice(0, 10)
          ) {
            ctx.addIssue({
              code: "custom",
              message:
                "Form 4136 line 6b account waiver must cover the sale and last no longer than one year",
              path: [
                "claims",
                index,
                "intercity_local_bus_sales",
                saleIndex,
                "waiver_n",
              ],
            });
          }
        }
      }
      if (input.business.sales_records_confirmed !== true) {
        ctx.addIssue({
          code: "custom",
          message: "Form 4136 line 6b needs confirmed sales records",
          path: ["business", "sales_records_confirmed"],
        });
      }
    } else if (claim.line === "15a") {
      if (
        !claim.blender_registration_number ||
        claim.blender_produced_confirmed !== true ||
        input.business.production_records_confirmed !== true ||
        !claim.blender_trade_or_business_disposition ||
        claim.blender_input_diesel_gallons !== claim.qualified_quantity ||
        claim.emulsion_water_percentage === undefined ||
        !claim.emulsion_epa_additive_record_reference ||
        claim.excise_tax_rate_per_gallon !== 0.244
      ) {
        ctx.addIssue({
          code: "custom",
          message:
            "Form 4136 line 15a needs registered blender, production, taxed diesel, emulsion, and business-use records",
          path: ["claims", index],
        });
      }
    } else if (claim.line === "16a" || claim.line === "16b") {
      if (
        claim.exporter_of_record_confirmed !== true ||
        input.business.export_records_confirmed !== true
      ) {
        ctx.addIssue({
          code: "custom",
          message: "Form 4136 export claim needs exporter and export records",
          path: ["claims", index, "exporter_of_record_confirmed"],
        });
      }
      const allowedKinds = claim.line === "16a"
        ? ["dyed_diesel", "gasoline_blendstock"]
        : ["dyed_kerosene"];
      if (
        !claim.exported_fuel_kind ||
        !allowedKinds.includes(claim.exported_fuel_kind)
      ) {
        ctx.addIssue({
          code: "custom",
          message: "Form 4136 export claim needs the correct fuel kind",
          path: ["claims", index, "exported_fuel_kind"],
        });
      }
      if (claim.excise_tax_rate_per_gallon !== 0.001) {
        ctx.addIssue({
          code: "custom",
          message: "Form 4136 line 16 needs fuel taxed at $.001 per gallon",
          path: ["claims", index, "excise_tax_rate_per_gallon"],
        });
      }
    } else if (
      input.business.claimant_is_ultimate_purchaser !== true ||
      input.business.purchase_records_confirmed !== true
    ) {
      ctx.addIssue({
        code: "custom",
        message:
          `Form 4136 line ${claim.line} needs an ultimate purchaser and purchase records`,
        path: ["business", "claimant_is_ultimate_purchaser"],
      });
    }
    if (
      (claim.line === "14a" || claim.line === "14b") &&
      (claim.emulsion_water_percentage === undefined ||
        !claim.emulsion_epa_additive_record_reference)
    ) {
      ctx.addIssue({
        code: "custom",
        message:
          `Form 4136 line ${claim.line} needs the emulsion composition and EPA additive record`,
        path: ["claims", index, "emulsion_water_percentage"],
      });
    }
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
      ...([
          "3a",
          "3b",
          "3c",
          "3d",
          "3e",
          "4a",
          "4b",
          "4c",
          "4d",
          "4e",
          "4f",
          "6a",
          "6b",
          "15a",
        ]
          .includes(claim.line)
        ? ["undyed_fuel_confirmed"] as const
        : []),
      ...(claim.line === "3d" || claim.line === "4c" ||
          claim.line.startsWith("5") ||
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
      ...(claim.line === "1a" || claim.line === "1c"
        ? ["not_noncommercial_motorboat"] as const
        : []),
      ...(claim.line === "2b"
        ? ["aviation_gasoline_outside_propulsion_confirmed"] as const
        : []),
      ...(claim.line === "2a" || claim.line === "5a" || claim.line === "5b"
        ? ["commercial_aviation_nonforeign_trade_confirmed"] as const
        : []),
      ...(claim.line === "2d" || claim.line === "5e"
        ? ["foreign_trade_lust_tax_paid_confirmed"] as const
        : []),
      ...(claim.line === "3c" ? ["train_use_confirmed"] as const : []),
      ...(claim.line === "3d" || claim.line === "4c"
        ? ["certain_intercity_or_local_bus_use_confirmed"] as const
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
    if (
      ["1d", "2c", "3e", "4d", "14b", "16a", "16b"].includes(claim.line) &&
      !claim.export_proof
    ) {
      ctx.addIssue({
        code: "custom",
        message:
          `Form 4136 line ${claim.line} requires retained proof of exportation`,
        path: ["claims", index, "export_proof"],
      });
    }
    const expectedKeroseneRate = claim.line === "4e"
      ? 0.044
      : claim.line === "4f" || claim.line === "5b" || claim.line === "5d"
      ? 0.219
      : claim.line === "5a" || claim.line === "5c"
      ? 0.244
      : undefined;
    if (
      expectedKeroseneRate !== undefined &&
      claim.excise_tax_rate_per_gallon !== expectedKeroseneRate
    ) {
      ctx.addIssue({
        code: "custom",
        message: `Form 4136 line ${claim.line} requires kerosene taxed at $${
          expectedKeroseneRate.toFixed(3)
        } per gallon`,
        path: ["claims", index, "excise_tax_rate_per_gallon"],
      });
    }
    const key = `${claim.line}:${claim.type_of_use ?? ""}:${
      claim.line === "16a" ? claim.exported_fuel_kind ?? "" : ""
    }`;
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
  const line6aRegistrations = new Set(
    activities.flatMap((activity) => activity.claims)
      .filter((claim) => claim.line === "6a")
      .map((claim) => claim.vendor_registration_number),
  );
  if (line6aRegistrations.size > 1) {
    ctx.addIssue({
      code: "custom",
      message: "Form 4136 line 6 has one registration-number field",
      path: ["claims"],
    });
  }
  const line15aRegistrations = new Set(
    activities.flatMap((activity) => activity.claims)
      .filter((claim) => claim.line === "15a")
      .map((claim) => claim.blender_registration_number),
  );
  if (line15aRegistrations.size > 1) {
    ctx.addIssue({
      code: "custom",
      message: "Form 4136 line 15 has one registration-number field",
      path: ["claims"],
    });
  }
  const line6Registrations = new Set(
    activities.flatMap((activity) => activity.claims)
      .filter((claim) => claim.line === "6a" || claim.line === "6b")
      .map((claim) => claim.vendor_registration_number),
  );
  if (line6Registrations.size > 1) {
    ctx.addIssue({
      code: "custom",
      message: "Form 4136 line 6 has one registration-number field",
      path: ["claims"],
    });
  }
});

export type Form4136Input = z.infer<typeof inputSchema>;

export function allForm4136Claims(input: Form4136Input) {
  return input.claimant_context === "home_kerosene" ? input.claims : [
    ...input.claims,
    ...input.additional_activities.flatMap((activity) => activity.claims),
  ];
}

export function form4136BlenderCertification(
  claim: Form4136Input["claims"][number],
): string {
  if (
    claim.line !== "15a" || claim.emulsion_water_percentage === undefined ||
    !claim.emulsion_epa_additive_record_reference ||
    !claim.blender_input_diesel_gallons ||
    !claim.blender_trade_or_business_disposition
  ) {
    throw new Error("Form 4136 line 15a blending certification is incomplete");
  }
  const disposition =
    claim.blender_trade_or_business_disposition === "used_in_business"
      ? "used in the blender's trade or business"
      : "sold for use in the blender's trade or business";
  return `The blender produced a diesel-water fuel emulsion containing at least ${claim.emulsion_water_percentage}% water. The emulsion additive was registered by a U.S. manufacturer with the EPA under Clean Air Act section 211 (record ${claim.emulsion_epa_additive_record_reference}). Undyed diesel fuel taxed at $0.244 per gallon was used to produce the emulsion. The emulsion was ${disposition}. Input diesel gallons: ${claim.blender_input_diesel_gallons}.`;
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
