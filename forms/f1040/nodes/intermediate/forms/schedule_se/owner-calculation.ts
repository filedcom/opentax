import { z } from "zod";
import { scheduleSELines } from "./calculation.ts";

export const ownerIdentitySchema = z.object({
  primary_ssn: z.string().regex(/^\d{9}$/),
  spouse_ssn: z.string().regex(/^\d{9}$/),
}).strict();
export const ownerBusinessSchema = z.object({
  recipient: z.enum(["T", "S"]),
  source_reference: z.string().trim().min(1),
  net_profit: z.number().finite(),
  kind: z.enum(["schedule_c", "schedule_f"]),
  business_name: z.string().trim().min(1).optional(),
  ein: z.string().regex(/^\d{9}$/).optional(),
  qbi_no_other_adjustments_confirmed: z.boolean().optional(),
  gross_farm_income: z.number().nonnegative().optional(),
  farm_optional_method_elected: z.boolean().optional(),
}).strict();
export const ownerWageSchema = z.object({
  employee_ssn: z.string().regex(/^\d{9}$/),
  source_reference: z.string().trim().min(1),
  ss_wages_and_tips: z.number().nonnegative(),
}).strict();
export const ownerSourcesSchema = z.object({
  identity: ownerIdentitySchema,
  businesses: z.array(ownerBusinessSchema).min(1),
  wages: z.array(ownerWageSchema),
}).strict();
export type OwnerSources = z.infer<typeof ownerSourcesSchema>;
export type OwnerSEFields = {
  recipient: "T" | "S";
  owner_ssn: string;
  net_profit_schedule_c: number;
  net_profit_schedule_f: number;
  w2_ss_wages: number;
  farm_optional_method_elected?: boolean;
  gross_farm_income?: number;
};

/** Net businesses within each proprietor; never net one spouse against the other. */
export function ownedScheduleSE(raw: unknown, ssWageBase: number) {
  const source = ownerSourcesSchema.parse(raw);
  source.businesses.sort((a, b) =>
    a.source_reference < b.source_reference
      ? -1
      : a.source_reference > b.source_reference
      ? 1
      : 0
  );
  source.wages.sort((a, b) =>
    a.source_reference < b.source_reference
      ? -1
      : a.source_reference > b.source_reference
      ? 1
      : 0
  );
  if (
    source.identity.primary_ssn === source.identity.spouse_ssn ||
    source.identity.primary_ssn === "000000000" ||
    source.identity.spouse_ssn === "000000000"
  ) {
    throw new Error("Schedule SE needs distinct actual joint owner identities");
  }
  const references = new Set<string>();
  const distinct = (reference: string) => {
    if (references.has(reference)) {
      throw new Error("Schedule SE owner source reference is reused");
    }
    references.add(reference);
  };
  const owners = new Map<"T" | "S", OwnerSEFields>();
  for (const business of source.businesses) {
    distinct(business.source_reference);
    const owner = owners.get(business.recipient) ?? {
      recipient: business.recipient,
      owner_ssn: business.recipient === "T"
        ? source.identity.primary_ssn
        : source.identity.spouse_ssn,
      net_profit_schedule_c: 0,
      net_profit_schedule_f: 0,
      w2_ss_wages: 0,
    };
    if (business.kind === "schedule_c") {
      if (
        business.farm_optional_method_elected !== undefined ||
        business.gross_farm_income !== undefined
      ) {
        throw new Error("Schedule C owner source cannot elect a farm method");
      }
      owner.net_profit_schedule_c += business.net_profit;
    } else {
      owner.net_profit_schedule_f += business.net_profit;
      if (business.farm_optional_method_elected === true) {
        if (business.gross_farm_income === undefined) {
          throw new Error(
            "Owned farm optional method needs actual gross income",
          );
        }
        owner.farm_optional_method_elected = true;
        owner.gross_farm_income = (owner.gross_farm_income ?? 0) +
          business.gross_farm_income;
      }
    }
    owners.set(business.recipient, owner);
  }
  for (const recipient of ["T", "S"] as const) {
    const farms = source.businesses.filter((row) =>
      row.recipient === recipient && row.kind === "schedule_f"
    );
    if (
      farms.some((row) => row.farm_optional_method_elected === true) &&
      farms.some((row) => row.farm_optional_method_elected !== true)
    ) {
      throw new Error(
        "One proprietor's farm optional method must cover all farms",
      );
    }
  }
  for (const wage of source.wages) {
    distinct(wage.source_reference);
    const recipient = wage.employee_ssn === source.identity.primary_ssn
      ? "T"
      : wage.employee_ssn === source.identity.spouse_ssn
      ? "S"
      : undefined;
    if (!recipient) {
      throw new Error("Schedule SE W2 source belongs to neither spouse");
    }
    const owner = owners.get(recipient);
    if (owner) owner.w2_ss_wages += wage.ss_wages_and_tips;
  }
  const instances = (["T", "S"] as const).flatMap((recipient) => {
    const fields = owners.get(recipient);
    if (!fields) return [];
    const lines = scheduleSELines(fields, ssWageBase);
    return lines ? [{ ...fields, ...lines }] : [];
  });
  return {
    source,
    instances,
    tax: instances.reduce((sum, row) => sum + row.line12, 0),
    deduction: instances.reduce((sum, row) => sum + row.line13, 0),
    medicareEarnings: instances.reduce((sum, row) => sum + row.line6, 0),
  };
}
