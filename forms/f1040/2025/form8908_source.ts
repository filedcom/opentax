import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value;
});
const date2025 = isoDate.refine((value) => value.startsWith("2025-"));

export const form8908HomeSourceSchema = z.object({
  street: z.string().trim().min(1),
  unit: z.string().trim().min(1).optional(),
  city: z.string().trim().min(1),
  state: z.string().regex(/^[A-Z]{2}$/),
  zip: z.string().regex(/^\d{5}(?:-\d{4})?$/),
  acquired_on: date2025,
  acquired_by_other_person_for_residence_verified: z.literal(true),
  acquisition_record_reference: z.string().trim().min(1),
  contractor_basis_record_reference: z.string().trim().min(1),
  program: z.enum(["residential", "manufactured", "multifamily"]),
  zero_energy_ready: z.boolean(),
  prevailing_wage_met: z.boolean().optional(),
  form7220_review_reference: z.string().trim().min(1).optional(),
  certifier: z.discriminatedUnion("kind", [
    z.object({
      kind: z.literal("person"),
      name: z.string().trim().min(1),
      state: z.string().regex(/^[A-Z]{2}$/),
    }).strict(),
    z.object({
      kind: z.literal("business"),
      name: z.string().trim().min(1),
      state: z.string().regex(/^[A-Z]{2}$/),
    }).strict(),
  ]),
  certification_reference: z.string().trim().min(1),
  certified_on: isoDate,
  certification_modified: z.boolean(),
}).strict();

export const form8908SourceSchema = z.object({
  contractor_ssn: z.string().regex(/^\d{9}$/),
  eligible_contractor_and_program_participation_verified: z.literal(true),
  basis_during_construction_verified: z.literal(true),
  no_duplicate_rehabilitation_or_energy_credit_verified: z.literal(true),
  homes: z.array(form8908HomeSourceSchema).min(1),
}).strict();

export type Form8908Source = z.infer<typeof form8908SourceSchema>;

export interface Form8908SourceLines {
  counts: readonly [number, number, number, number, number, number];
  credits: readonly [number, number, number, number, number, number];
  line7: 0;
  line8: number;
  itemD_distinct_certifiers: number;
  itemE_certifications: number;
  certifiers: readonly {
    kind: "person" | "business";
    name: string;
    state: string;
    homes_certified: number;
    modified_certifications: number;
  }[];
  first20HomeAddresses: readonly {
    street: string;
    unit?: string;
    city: string;
    state: string;
    zip: string;
  }[];
}

/** Rebuild TY2025 Form 8908 Part I and its certifier/address inventories. */
export function calculateForm8908Source(raw: unknown): Form8908SourceLines {
  const source = form8908SourceSchema.parse(raw);
  const counts = [0, 0, 0, 0, 0, 0];
  const seenHomes = new Set<string>();
  const certifiers = new Map<
    string,
    Form8908SourceLines["certifiers"][number]
  >();
  for (const home of source.homes) {
    if (home.certified_on >= home.acquired_on) {
      throw new Error("Form 8908 certification must precede acquisition");
    }
    const homeKey = [
      home.street,
      home.unit ?? "",
      home.city,
      home.state,
      home.zip,
    ]
      .map((part) => part.trim().toUpperCase()).join("|");
    if (seenHomes.has(homeKey)) {
      throw new Error("Form 8908 cannot claim the same home twice");
    }
    seenHomes.add(homeKey);
    if (
      home.program !== "multifamily" && home.prevailing_wage_met !== undefined
    ) {
      throw new Error(
        "Form 8908 single-family home cannot use multifamily wages",
      );
    }
    if (home.program !== "multifamily" && home.form7220_review_reference) {
      throw new Error("Form 8908 single-family home cannot require Form 7220");
    }
    if (
      home.program === "multifamily" && home.prevailing_wage_met === undefined
    ) {
      throw new Error("Form 8908 multifamily home needs wage classification");
    }
    if (home.prevailing_wage_met && !home.form7220_review_reference) {
      throw new Error("Form 8908 increased credit needs Form 7220 evidence");
    }
    if (!home.prevailing_wage_met && home.form7220_review_reference) {
      throw new Error("Form 8908 Form 7220 evidence conflicts with wage class");
    }
    const category = home.program !== "multifamily"
      ? home.zero_energy_ready ? 1 : 0
      : home.prevailing_wage_met
      ? home.zero_energy_ready ? 3 : 2
      : home.zero_energy_ready
      ? 5
      : 4;
    counts[category]++;
    const certifierKey =
      `${home.certifier.kind}|${home.certifier.name.trim().toUpperCase()}|${home.certifier.state}`;
    const prior = certifiers.get(certifierKey);
    certifiers.set(certifierKey, {
      kind: home.certifier.kind,
      name: prior?.name ?? home.certifier.name,
      state: home.certifier.state,
      homes_certified: (prior?.homes_certified ?? 0) + 1,
      modified_certifications: (prior?.modified_certifications ?? 0) +
        Number(home.certification_modified),
    });
  }
  const rates = [2500, 5000, 2500, 5000, 500, 1000] as const;
  const credits = rates.map((rate, index) => rate * counts[index]);
  return {
    counts: [counts[0], counts[1], counts[2], counts[3], counts[4], counts[5]],
    credits: [
      credits[0],
      credits[1],
      credits[2],
      credits[3],
      credits[4],
      credits[5],
    ],
    line7: 0,
    line8: credits.reduce((total, credit) => total + credit, 0),
    itemD_distinct_certifiers: certifiers.size,
    itemE_certifications: source.homes.length,
    certifiers: [...certifiers.values()],
    first20HomeAddresses: source.homes.slice(0, 20).map((home) => ({
      street: home.street,
      unit: home.unit,
      city: home.city,
      state: home.state,
      zip: home.zip,
    })),
  };
}
