import { z } from "zod";
import { careProviderSchema } from "../../nodes/intermediate/forms/credits/individual/form2441/calculation.ts";
import type { w2Item2026Schema } from "./w2.ts";

const ref = z.string().trim().min(1);
const whole = z.number().int().nonnegative();
const usAddress = careProviderSchema.options[0].shape.us_address;
const knownTin = z.object({
  kind: z.enum(["ssn", "itin", "ein"]),
  value: z.string().regex(/^\d{9}$/),
}).strict();
const special = {
  provider_reference: ref,
  review_reference: ref,
  household_employee: z.boolean(),
  amount_paid: whole,
};
export const careProvider2026Schema = z.discriminatedUnion("kind", [
  ...careProviderSchema.options,
  z.object({
    kind: z.literal("tax_exempt"),
    ...special,
    name: ref,
    us_address: usAddress,
    tax_exempt_status_verified: z.literal(true),
    household_employee: z.literal(false),
  }).strict(),
  z.object({
    kind: z.literal("foreign"),
    ...special,
    name: ref,
    foreign_address: z.object({
      line1: ref,
      line2: ref.optional(),
      city: ref,
      province: ref.optional(),
      postal_code: ref.optional(),
      country_code: z.string().regex(/^[A-Z]{2}$/).refine((v) => v !== "US"),
    }).strict(),
    identification: z.discriminatedUnion("kind", [
      z.object({ kind: z.literal("us_tin"), tin: knownTin }).strict(),
      z.object({
        kind: z.literal("lafcp"),
        taxpayer_us_citizen_or_resident_living_abroad: z.literal(true),
        provider_not_required_to_have_us_tin: z.literal(true),
        residency_and_tin_review_reference: ref,
      }).strict(),
    ]),
  }).strict(),
  z.object({
    kind: z.literal("incomplete"),
    ...special,
    known_name: ref.optional(),
    known_us_address: usAddress.partial().optional(),
    known_tin: knownTin.optional(),
    due_diligence: z.object({
      all_available_information_reported: z.literal(true),
      requests: z.array(
        z.object({
          date: z.string().date(),
          method: z.enum(["written", "telephone", "in_person", "electronic"]),
          record_reference: ref,
        }).strict(),
      ).min(1).max(25),
      provider_did_not_supply_requested_information: z.literal(true),
      explanation: ref.max(6000),
    }).strict(),
  }).strict(),
  z.object({
    kind: z.literal("employer_furnished"),
    ...special,
    source_document_reference: ref,
    employer_furnished_or_hired_provider: z.literal(true),
    care_value_in_w2_box10: whole.positive(),
    household_employee: z.literal(false),
    amount_paid: z.literal(0),
  }).strict(),
]);
export type CareProvider2026 = z.input<typeof careProvider2026Schema>;
export interface ResolvedCareProvider2026 {
  name: string;
  address_lines: [string, string, string, string, string];
  tin: string;
  household_employee: boolean;
  amount_paid: number;
  expense_capacity: number;
  due_diligence?: Extract<
    CareProvider2026,
    { kind: "incomplete" }
  >["due_diligence"];
}
const addressLines = (
  a: z.infer<typeof usAddress>,
): ResolvedCareProvider2026["address_lines"] => [
  a.line1,
  a.line2 ?? "",
  a.city,
  a.state,
  a.zip,
];
const normalize = (s: string) => s.replaceAll("-", "");
const identityText = (s: string) => s.trim().replace(/\s+/g, " ").toUpperCase();

/** IRS 2026 i2441 p.3: preserve special printed identities without fabricated
 * SSNs, EINs, payments or addresses. Calculations only consume expense amounts. */
export function resolveCareProviders2026(
  raw: CareProvider2026[],
  context: {
    family_tins: string[];
    wage_sources: z.input<typeof w2Item2026Schema>[];
  },
): ResolvedCareProvider2026[] {
  const seen = new Set<string>();
  const family = new Set(context.family_tins.map(normalize));
  const addIdentity = (key: string) => {
    if (seen.has(key)) {
      throw new Error("Duplicate care provider identity or source reference");
    }
    seen.add(key);
  };
  return raw.map((rawProvider) => {
    const p = careProvider2026Schema.parse(rawProvider);
    const r: ResolvedCareProvider2026 = {
      name: "",
      address_lines: ["", "", "", "", ""],
      tin: "",
      household_employee: p.household_employee,
      amount_paid: p.amount_paid,
      expense_capacity: p.amount_paid,
    };
    let numericTin: z.infer<typeof knownTin> | undefined;
    if ("provider_reference" in p) addIdentity(`ref:${p.provider_reference}`);
    if (p.kind === "person" || p.kind === "business") {
      r.name = p.kind === "person" ? `${p.first_name} ${p.last_name}` : p.name;
      numericTin = {
        kind: p.kind === "person" ? "ssn" : "ein",
        value: p.kind === "person" ? p.ssn : p.ein,
      };
      r.address_lines = addressLines(p.us_address);
    } else if (p.kind === "tax_exempt") {
      r.name = p.name;
      r.address_lines = addressLines(p.us_address);
      r.tin = "Tax-Exempt";
    } else if (p.kind === "foreign") {
      r.name = p.name;
      const a = p.foreign_address;
      r.address_lines = [
        a.line1,
        a.line2 ?? "",
        a.city,
        a.province ?? "",
        `${a.postal_code ? `${a.postal_code} ` : ""}${a.country_code}`,
      ];
      if (p.identification.kind === "us_tin") numericTin = p.identification.tin;
      else r.tin = "LAFCP";
    } else if (p.kind === "incomplete") {
      const a = p.known_us_address;
      if (
        p.known_name && a?.line1 && a.city && a.state && a.zip && p.known_tin
      ) {
        throw new Error(
          "Complete care provider information does not need a missing-information statement",
        );
      }
      r.name = p.known_name ?? "See Attached Statement";
      r.address_lines = [
        a?.line1 ?? "See Attached Statement",
        a?.line2 ?? "",
        a?.city ?? "See Attached Statement",
        a?.state ?? "See Attached Statement",
        a?.zip ?? "See Attached Statement",
      ];
      numericTin = p.known_tin;
      r.tin = "See Attached Statement";
      r.due_diligence = p.due_diligence;
    } else {
      const copies = context.wage_sources.filter((w) =>
        w.source_document_reference === p.source_document_reference
      );
      if (
        copies.length !== 1 ||
        p.care_value_in_w2_box10 > (copies[0].box10_dep_care ?? 0)
      ) {
        throw new Error(
          "Employer-furnished care must reconcile to one issued W-2's box 10",
        );
      }
      const w = copies[0];
      addIdentity(`employer:${normalize(w.employer_ein)}`);
      addIdentity(`w2:${w.source_document_reference}`);
      r.name = w.employer_name;
      r.address_lines = ["See W-2", "", "", "", ""];
      r.expense_capacity = p.care_value_in_w2_box10;
    }
    if (numericTin) {
      addIdentity(
        `${
          numericTin.kind === "ein" ? "ein" : "individual"
        }:${numericTin.value}`,
      );
      if (numericTin.kind !== "ein" && family.has(numericTin.value)) {
        throw new Error(
          "Care provider cannot be the filer, spouse or a listed dependent",
        );
      }
      r.tin = numericTin.value;
    }
    if (r.name !== "See Attached Statement") {
      addIdentity(
        `name-address:${identityText(r.name)}:${
          r.address_lines.map(identityText).join("|")
        }`,
      );
    }
    return r;
  });
}

export function careProviderStatement2026(p: ResolvedCareProvider2026): string {
  const [street, unit, city, region, postal] = p.address_lines;
  const locality = [city, [region, postal].filter(Boolean).join(" ")]
    .filter(Boolean).join(", ");
  const address = [street, unit, locality].filter(Boolean).join(", ");
  return `${p.name} | ${address} | ID ${
    p.tin || "(blank - employer-furnished care)"
  } | Household employee: ${p.household_employee ? "Yes" : "No"}`;
}
