import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode, output } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule3 } from "../schedule3/index.ts";

// ─── TY2025 Constants (IRC §25C, §25D) ───────────────────────────────────────

// Part I — Residential Clean Energy Credit (IRC §25D)
// 30% credit, no annual cap
const PART_I_RATE = 0.30;

// Part II — Energy Efficient Home Improvement Credit (IRC §25C)
// Annual cap: $1,200 total
const PART_II_RATE = 0.30;
const PART_II_ANNUAL_CAP = 1_200;

// Part II sub-limits
const WINDOWS_DOORS_INSULATION_LIMIT = 600; // windows
const EXTERIOR_DOOR_PER_DOOR_LIMIT = 250;    // per door
const EXTERIOR_DOOR_TOTAL_LIMIT = 500;       // total exterior doors
const ENERGY_AUDIT_LIMIT = 150;              // home energy audits
const HVAC_WATER_HEATER_LIMIT = 600;         // heat pumps, central A/C, water heaters
const BIOMASS_LIMIT = 2_000;                 // biomass stoves/boilers (separate higher limit)

// ─── Schema ───────────────────────────────────────────────────────────────────

export const inputSchema = z.object({
  // ── Part I — Residential Clean Energy (IRC §25D) ──────────────────────────
  // Solar electric property (§25D(a)(1))
  solar_electric_cost: z.number().nonnegative().optional(),
  // Solar water heating property (§25D(a)(2))
  solar_water_heater_cost: z.number().nonnegative().optional(),
  // Fuel cell property (§25D(a)(3))
  fuel_cell_cost: z.number().nonnegative().optional(),
  // Small wind energy property (§25D(a)(4))
  small_wind_cost: z.number().nonnegative().optional(),
  // Geothermal heat pump property (§25D(a)(5))
  geothermal_cost: z.number().nonnegative().optional(),
  // Battery storage technology (§25D(a)(7))
  battery_storage_cost: z.number().nonnegative().optional(),

  // ── Part II — Energy Efficient Home Improvement (IRC §25C) ────────────────
  // Windows (§25C(a)(1)(A); $600 cap per year)
  windows_cost: z.number().nonnegative().optional(),
  // Exterior doors (§25C(a)(1)(B); $250/door, $500 total)
  exterior_doors_cost: z.number().nonnegative().optional(),
  // Number of exterior doors (for per-door $250 cap)
  exterior_doors_count: z.number().int().nonnegative().optional(),
  // Insulation materials (§25C(a)(1)(C))
  insulation_cost: z.number().nonnegative().optional(),
  // HVAC — central A/C, heat pumps (§25C(a)(2); $600 cap)
  hvac_cost: z.number().nonnegative().optional(),
  // Water heaters (§25C(a)(2); included in $600 HVAC cap)
  water_heater_cost: z.number().nonnegative().optional(),
  // Biomass stoves/boilers (§25C(a)(2); $2,000 separate cap)
  biomass_cost: z.number().nonnegative().optional(),
  // Home energy audits (§25C(a)(3); $150 cap)
  energy_audit_cost: z.number().nonnegative().optional(),
});

type Form5695Input = z.infer<typeof inputSchema>;

// ─── Pure Helpers ─────────────────────────────────────────────────────────────

// Part I: Residential Clean Energy Credit — 30%, no cap
function partICredit(input: Form5695Input): number {
  const totalCost =
    (input.solar_electric_cost ?? 0) +
    (input.solar_water_heater_cost ?? 0) +
    (input.fuel_cell_cost ?? 0) +
    (input.small_wind_cost ?? 0) +
    (input.geothermal_cost ?? 0) +
    (input.battery_storage_cost ?? 0);

  return Math.round(totalCost * PART_I_RATE);
}

// Windows/skylights: $600 annual cap
function windowsCredit(cost: number): number {
  return Math.min(Math.round(cost * PART_II_RATE), WINDOWS_DOORS_INSULATION_LIMIT);
}

// Exterior doors: $250 per door, $500 total
function doorsCredit(cost: number, count: number): number {
  const perDoorCap = count > 0 ? count * EXTERIOR_DOOR_PER_DOOR_LIMIT : EXTERIOR_DOOR_TOTAL_LIMIT;
  const doorsCap = Math.min(perDoorCap, EXTERIOR_DOOR_TOTAL_LIMIT);
  return Math.min(Math.round(cost * PART_II_RATE), doorsCap);
}

// HVAC + water heaters combined: $600 cap
function hvacWaterHeaterCredit(hvacCost: number, waterHeaterCost: number): number {
  const combined = (hvacCost + waterHeaterCost) * PART_II_RATE;
  return Math.min(Math.round(combined), HVAC_WATER_HEATER_LIMIT);
}

// Biomass: $2,000 cap (separate from the $1,200 annual cap)
function biomassCredit(cost: number): number {
  return Math.min(Math.round(cost * PART_II_RATE), BIOMASS_LIMIT);
}

// Energy audit: $150 cap
function energyAuditCredit(cost: number): number {
  return Math.min(Math.round(cost * PART_II_RATE), ENERGY_AUDIT_LIMIT);
}

// Part II: Energy Efficient Home Improvement Credit
// $1,200 annual cap on the sum of all qualifying improvements (excluding biomass)
// Biomass has its own $2,000 cap and does NOT count toward the $1,200 cap
function partIICredit(input: Form5695Input): number {
  const winCredit = windowsCredit(input.windows_cost ?? 0);
  const doorCredit = doorsCredit(
    input.exterior_doors_cost ?? 0,
    input.exterior_doors_count ?? 0,
  );
  const insCredit = Math.round((input.insulation_cost ?? 0) * PART_II_RATE);
  const hvacCredit = hvacWaterHeaterCredit(input.hvac_cost ?? 0, input.water_heater_cost ?? 0);
  const auditCredit = energyAuditCredit(input.energy_audit_cost ?? 0);
  const biomassAmt = biomassCredit(input.biomass_cost ?? 0);

  // $1,200 annual cap applies to: windows + doors + insulation + HVAC/water heater + audit
  const cappedSubtotal = Math.min(
    winCredit + doorCredit + insCredit + hvacCredit + auditCredit,
    PART_II_ANNUAL_CAP,
  );

  // Biomass is separate from the $1,200 cap — it has its own $2,000 cap
  return cappedSubtotal + biomassAmt;
}

function buildOutputs(partI: number, partII: number): NodeOutput[] {
  const outputs: NodeOutput[] = [];

  // Schedule 3 line 5 — residential energy credits
  // Form 5695 line 15 (Part I) + line 30 (Part II) → Schedule 3 line 5
  const total = partI + partII;
  if (total > 0) {
    outputs.push(output(schedule3, { line5_residential_energy: total }));
  }

  return outputs;
}

// ─── Node Class ───────────────────────────────────────────────────────────────

class Form5695Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form5695";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule3]);

  compute(rawInput: Form5695Input): NodeResult {
    const input = inputSchema.parse(rawInput);

    const partI = partICredit(input);
    const partII = partIICredit(input);

    return { outputs: buildOutputs(partI, partII) };
  }
}

// ─── Singleton Export ─────────────────────────────────────────────────────────

export const form5695 = new Form5695Node();
