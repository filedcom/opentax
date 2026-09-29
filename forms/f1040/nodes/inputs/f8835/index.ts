import { z } from "zod";
import type { NodeContext } from "../../../../../core/types/node-context.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../core/types/tax-node.ts";
import { f3800 } from "../f3800/index.ts";

// Form 8835 line 1 base rates and line 9 fivefold increase are separate.
export enum EnergyType {
  Wind = "WIND",
  OffshoreWind = "OFFSHORE_WIND",
  Solar = "SOLAR",
  Geothermal = "GEOTHERMAL",
  BiomassClosed = "BIOMASS_CLOSED",
  BiomassOpen = "BIOMASS_OPEN",
  Hydro = "HYDRO",
  Landfill = "LANDFILL",
  Trash = "TRASH",
  Marine = "MARINE",
}

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const itemSchema = z.object({
  energy_type: z.nativeEnum(EnergyType),
  subject_to_passive_activity_limit: z.boolean(),
  kwh_produced: z.number().int().nonnegative(),
  kwh_sold: z.number().int().nonnegative(),
  facility_description: z.string().min(1).max(50).optional(),
  facility_us_address: z.object({
    line1: z.string().min(1),
    line2: z.string().optional(),
    city: z.string().min(1),
    state: z.string().length(2),
    zip: z.string().regex(/^\d{5}(?:\d{4})?$/),
  }).optional(),
  facility_latitude: z.number().min(-90).max(90).optional(),
  facility_longitude: z.number().min(-180).max(180).optional(),
  facility_owned_by_filer: z.boolean().optional(),
  facility_owner_person: z.object({
    name: z.string().min(1),
    ssn: z.string().regex(/^\d{9}$/),
  }).optional(),
  facility_owner_business: z.object({
    name: z.string().min(1),
    ein: z.string().regex(/^\d{9}$/),
  }).optional(),
  existing_facility_expansion: z.boolean().optional(),
  solar_dc_nameplate_kw: z.number().int().nonnegative().optional(),
  ac_nameplate_kw: z.number().int().nonnegative().optional(),
  increased_credit_statement_file_name: z.string().min(1).optional(),
  domestic_content_statement_file_name: z.string().min(1).optional(),
  pwa_form7220_file_name: z.string().min(1).optional(),
  facility_placed_in_service_date: isoDate,
  facility_construction_start_date: isoDate,
  production_period_start_date: isoDate,
  production_period_end_date: isoDate,
  increased_credit_reason: z.enum([
    "under_one_mw",
    "construction_before_2023_01_29",
    "prevailing_wage_and_apprenticeship",
    "none",
  ]),
  maximum_net_output_mw: z.number().nonnegative().optional(),
  meets_prevailing_wage: z.boolean().optional(),
  meets_apprenticeship: z.boolean().optional(),
  domestic_content_bonus: z.boolean(),
  energy_community_bonus: z.boolean(),
  tax_exempt_bond_proceeds: z.number().nonnegative().optional(),
  aggregate_capital_additions: z.number().positive().optional(),
  is_fiscal_year: z.boolean(),
  phaseout_adjustment: z.number().nonnegative().optional(),
  transfer_election_amount: z.number().nonnegative().optional(),
  transfer_election_statement_file_name: z.string().min(1).optional(),
  registration_number: z.string().regex(
    /^[CPT][A-M][A-Za-z0-9]{3}[0-9]{2}[A-Za-z0-9]{5}$/,
  ).optional(),
});
export const inputSchema = z.object({ f8835s: z.array(itemSchema).min(1) })
  .superRefine((input, ctx) => {
    const seen = new Set<string>();
    input.f8835s.forEach((item, index) => {
      if (
        !item.facility_us_address ||
        item.facility_latitude === undefined ||
        item.facility_longitude === undefined
      ) return;
      const identity = JSON.stringify([
        item.facility_us_address,
        item.facility_latitude,
        item.facility_longitude,
        item.facility_placed_in_service_date,
      ]);
      if (seen.has(identity)) {
        ctx.addIssue({
          code: "custom",
          path: ["f8835s", index],
          message: "Form 8835 repeats the same facility in one return",
        });
      }
      seen.add(identity);
    });
  });
export type F8835Item = z.infer<typeof itemSchema>;
export type F8835Input = z.infer<typeof inputSchema>;

export type F8835Lines = {
  readonly line1: number;
  readonly line2: number;
  readonly line3: number;
  readonly line4: number;
  readonly line5a: number;
  readonly line5b: number;
  readonly line5c: number;
  readonly line5d: number;
  readonly line6: number;
  readonly line7g: number;
  readonly line8: number;
  readonly line9: number;
  readonly line10: number;
  readonly line11: number;
  readonly line12: number;
  readonly line13: number;
  readonly line15: number;
  readonly form3800Line: "1f" | "4e";
};

function parsedDate(value: string): Date {
  const date = new Date(`${value}T00:00:00Z`);
  if (
    Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value
  ) {
    throw new Error(`Form 8835 needs a valid date: ${value}`);
  }
  return date;
}

function baseRate(item: F8835Item): number {
  const service = parsedDate(item.facility_placed_in_service_date);
  const oldFacility = service < parsedDate("2022-01-01");
  if (
    oldFacility && (item.energy_type === EnergyType.Solar ||
      item.energy_type === EnergyType.OffshoreWind)
  ) {
    throw new Error(
      "Form 8835 pre-2022 solar/offshore-wind rate needs qualification review",
    );
  }
  const high = new Set<EnergyType>([
    EnergyType.Wind,
    EnergyType.OffshoreWind,
    EnergyType.Solar,
    EnergyType.Geothermal,
    EnergyType.BiomassClosed,
  ]).has(item.energy_type) ||
    ((item.energy_type === EnergyType.Hydro ||
      item.energy_type === EnergyType.Marine) &&
      service >= parsedDate("2023-01-01"));
  return oldFacility ? (high ? 0.03 : 0.015) : (high ? 0.006 : 0.003);
}

function increaseFactor(item: F8835Item): number {
  const reason = item.increased_credit_reason;
  if (item.facility_placed_in_service_date < "2022-01-01") {
    if (reason !== "none") {
      throw new Error(
        "Form 8835 pre-2022 facilities cannot use line 9's fivefold increase",
      );
    }
    return 1;
  }
  if (reason === "none") return 1;
  if (
    reason === "under_one_mw" &&
    (item.maximum_net_output_mw === undefined ||
      item.maximum_net_output_mw >= 1)
  ) {
    throw new Error(
      "Form 8835 under-one-MW increase needs measured output below 1 MW",
    );
  }
  if (
    reason === "construction_before_2023_01_29" &&
    item.facility_construction_start_date >= "2023-01-29"
  ) {
    throw new Error(
      "Form 8835 early-construction increase needs a start before January 29, 2023",
    );
  }
  if (
    reason === "prevailing_wage_and_apprenticeship" &&
    (item.meets_prevailing_wage !== true || item.meets_apprenticeship !== true)
  ) {
    throw new Error(
      "Form 8835 wage/apprenticeship increase needs both requirements met",
    );
  }
  return 5;
}

function windPhaseout(item: F8835Item, line6: number): number {
  if (
    item.energy_type !== EnergyType.Wind ||
    item.facility_placed_in_service_date >= "2022-01-01"
  ) return 0;
  const year = parsedDate(item.facility_construction_start_date)
    .getUTCFullYear();
  const rate = year === 2017
    ? 0.20
    : year === 2019
    ? 0.60
    : [2018, 2020, 2021].includes(year)
    ? 0.40
    : 0;
  return Math.round(line6 * rate);
}

function form3800Line(item: F8835Item): "1f" | "4e" {
  const service = parsedDate(item.facility_placed_in_service_date);
  const start = parsedDate(item.production_period_start_date);
  const end = parsedDate(item.production_period_end_date);
  if (
    start > end || start < service ||
    start.getUTCFullYear() !== 2025 || end.getUTCFullYear() !== 2025
  ) {
    throw new Error(
      "Form 8835 production period must be a valid 2025 period after service",
    );
  }
  const fourthAnniversary = new Date(service);
  fourthAnniversary.setUTCFullYear(fourthAnniversary.getUTCFullYear() + 4);
  if (start < fourthAnniversary && end >= fourthAnniversary) {
    throw new Error(
      "Form 8835 production crossing the four-year boundary needs separate periods",
    );
  }
  return end < fourthAnniversary ? "4e" : "1f";
}

export function calculateForm8835(item: F8835Item): F8835Lines {
  if (item.kwh_sold > item.kwh_produced) {
    throw new Error("Form 8835 kWh sold cannot exceed kWh produced");
  }
  const line = form3800Line(item);
  const line1 = Math.round(item.kwh_sold * baseRate(item));
  const line3 = item.is_fiscal_year ? item.phaseout_adjustment : 0;
  if (line3 === undefined) {
    throw new Error("Form 8835 fiscal-year phaseout adjustment is required");
  }
  if (!item.is_fiscal_year && (item.phaseout_adjustment ?? 0) > 0) {
    throw new Error(
      "Form 8835 calendar-year 2025 cannot carry a phaseout adjustment",
    );
  }
  if (line3 > line1) {
    throw new Error("Form 8835 phaseout cannot exceed the production credit");
  }
  const line4 = line1 - line3;
  const bonds = item.tax_exempt_bond_proceeds ?? 0;
  if (bonds > 0 && item.aggregate_capital_additions === undefined) {
    throw new Error(
      "Form 8835 bond reduction needs aggregate capital additions",
    );
  }
  const line5a = bonds > 0
    ? Math.round(
      Math.min(1, bonds / (item.aggregate_capital_additions ?? 1)) * 100,
    ) / 100
    : 0;
  const line5b = Math.round(line4 * line5a);
  const line5c = Math.round(line4 * 0.15);
  const line5d = Math.min(line5b, line5c);
  const line6 = line4 - line5d;
  const line7g = windPhaseout(item, line6);
  const line8 = line6 - line7g;
  const line9 = line8 * increaseFactor(item);
  const line10 = item.domestic_content_bonus ? Math.round(line9 * 0.10) : 0;
  const line11 = item.energy_community_bonus ? Math.round(line9 * 0.10) : 0;
  const line12 = line9 + line10 + line11;
  const transfer = item.transfer_election_amount ?? 0;
  if (transfer > line12) {
    throw new Error("Form 8835 transfer amount exceeds the credit");
  }
  if (transfer > 0 && !item.registration_number) {
    throw new Error(
      "Form 8835 transfer needs the IRS-issued registration number",
    );
  }
  return {
    line1,
    line2: line1,
    line3,
    line4,
    line5a,
    line5b,
    line5c,
    line5d,
    line6,
    line7g,
    line8,
    line9,
    line10,
    line11,
    line12,
    line13: line12,
    line15: line12,
    form3800Line: line,
  };
}

class F8835Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8835";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([f3800]);

  compute(_ctx: NodeContext, rawInput: F8835Input): NodeResult {
    const input = inputSchema.parse(rawInput);
    const entries = input.f8835s.map((item) => {
      const lines = calculateForm8835(item);
      return {
        form3800_line: lines.form3800Line,
        credit_amount: lines.line15,
        transfer_out_amount: item.transfer_election_amount ?? 0,
        registration_number: item.registration_number,
        subject_to_passive_activity_limit:
          item.subject_to_passive_activity_limit,
        transfer_election_statement_file_name:
          item.transfer_election_statement_file_name,
      };
    });
    return { outputs: [output(f3800, { f8835_credit_entries: entries })] };
  }
}

export const f8835 = new F8835Node();
