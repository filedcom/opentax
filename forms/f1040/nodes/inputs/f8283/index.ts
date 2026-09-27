import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { scheduleA as schedule_a } from "../schedule_a/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Method used to determine FMV
export enum FMVMethod {
  Appraisal = "appraisal",
  ThriftShopValue = "thrift_shop_value",
  CatalogValue = "catalog_value",
  ComparableSales = "comparable_sales",
  Formula = "formula",
  Other = "other",
}

export enum SectionBPropertyType {
  ArtUnder20000 = "art_under_20000",
  ArtAtLeast20000 = "art_at_least_20000",
  OtherRealEstate = "other_real_estate",
  Equipment = "equipment",
  Securities = "securities",
  Collectibles = "collectibles",
  IntellectualProperty = "intellectual_property",
  Vehicle = "vehicle",
  ClothingHousehold = "clothing_household",
  DigitalAssets = "digital_assets",
  Other = "other",
}

const usAddressSchema = z.object({
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().length(2),
  zip: z.string().regex(/^\d{5}(?:-?\d{4})?$/),
});

const vehicleSaleAcknowledgmentSchema = z.object({
  copy_received_from_donee: z.literal(true),
  donee_certified: z.literal(true),
  donee_name: z.string().min(1),
  donee_ein: z.string().regex(/^\d{9}$/),
  donee_us_address: usAddressSchema,
  acknowledgment_received_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sale_to_unrelated_party: z.literal(true),
  sale_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  gross_proceeds: z.number().nonnegative(),
  vehicle_year: z.number().int().min(1900).max(2100),
  vehicle_make: z.string().min(1),
  vehicle_model: z.string().min(1),
  vehicle_condition: z.string().min(1),
  odometer_miles: z.number().int().nonnegative(),
  goods_or_services_received: z.literal(false),
});

// Section A — items ≤$5,000 each (or ≤$10,000 for closely held stock)
const sectionAItemSchema = z.object({
  property_description: z.string().optional(),
  donee_organization_name: z.string().optional(),
  donee_organization_us_address: z.object({
    line1: z.string(),
    line2: z.string().optional(),
    city: z.string(),
    state: z.string(),
    zip: z.string(),
  }).optional(),
  date_acquired: z.string().optional(), // ISO date YYYY-MM-DD
  date_contributed: z.string().optional(), // ISO date YYYY-MM-DD
  donor_acquisition_description: z.string().optional(),
  fmv: z.number().nonnegative().optional(),
  deduction_claimed: z.number().nonnegative().optional(),
  fmv_method: z.nativeEnum(FMVMethod).optional(),
  fmv_method_description: z.string().optional(),
  cost_or_adjusted_basis: z.number().nonnegative().optional(),
  // Vehicles — need Form 1098-C acknowledgment
  is_vehicle: z.boolean().optional(),
  vehicle_vin: z.string().regex(/^[A-Z0-9]{1,17}$|^[A-Z0-9]{19}$/).optional(),
  vehicle_sale_acknowledgment: vehicleSaleAcknowledgmentSchema.optional(),
  // Name of the actual donee-issued Form 1098-C or contemporaneous written
  // acknowledgment PDF supplied to the MeF bundle. The native statement is
  // not a substitute for this binary attachment under F8283-029/031/032/033.
  vehicle_acknowledgment_attachment_file_name: z.string().min(1).optional(),
  // Clothing/household — must be in good used condition or better
  is_clothing_household: z.boolean().optional(),
}).superRefine((item, ctx) => {
  if (item.deduction_claimed !== undefined && item.fmv === undefined) {
    ctx.addIssue({
      code: "custom",
      message: "Form 8283 Section A claimed deduction needs fair market value",
    });
  }
  if (
    item.deduction_claimed !== undefined && item.fmv !== undefined &&
    item.deduction_claimed > item.fmv
  ) {
    ctx.addIssue({
      code: "custom",
      message: "Form 8283 Section A deduction exceeds FMV",
    });
  }
  if (!item.is_vehicle || item.fmv === undefined) return;
  if (!item.vehicle_vin) {
    ctx.addIssue({ code: "custom", message: "Form 8283 vehicle needs VIN" });
  }
  if (item.fmv > 500 && item.deduction_claimed === undefined) {
    ctx.addIssue({
      code: "custom",
      message: "Form 8283 vehicle above $500 needs its claimed deduction",
    });
  }
  const claimed = item.deduction_claimed ?? item.fmv;
  if (claimed <= 500) return;
  const ack = item.vehicle_sale_acknowledgment;
  if (!ack) {
    ctx.addIssue({
      code: "custom",
      message:
        "Form 8283 vehicle above $500 needs the donee sale acknowledgment",
    });
    return;
  }
  if (claimed > ack.gross_proceeds) {
    ctx.addIssue({
      code: "custom",
      message: "Form 8283 vehicle deduction exceeds gross sale proceeds",
    });
  }
  if (!item.date_contributed) {
    ctx.addIssue({
      code: "custom",
      message: "Form 8283 vehicle acknowledgment needs contribution date",
    });
  }
  const sale = Date.parse(`${ack.sale_date}T00:00:00Z`);
  const received = Date.parse(
    `${ack.acknowledgment_received_date}T00:00:00Z`,
  );
  const contributed = item.date_contributed
    ? Date.parse(`${item.date_contributed}T00:00:00Z`)
    : NaN;
  if (!Number.isFinite(contributed) || sale < contributed) {
    ctx.addIssue({
      code: "custom",
      message: "Form 8283 vehicle sale must follow its contribution",
    });
  }
  if (
    !Number.isFinite(sale) || !Number.isFinite(received) ||
    received < sale || received - sale > 30 * 86_400_000
  ) {
    ctx.addIssue({
      code: "custom",
      message:
        "Form 8283 vehicle acknowledgment must arrive within 30 days of sale",
    });
  }
});

// Section B — items >$5,000 each (requires qualified appraisal)
const sectionBItemSchema = z.object({
  property_description: z.string().optional(),
  property_type: z.nativeEnum(SectionBPropertyType).optional(),
  physical_condition: z.string().optional(),
  good_used_condition_confirmed: z.literal(true).optional(),
  date_acquired: z.string().optional(),
  donor_acquisition_description: z.string().optional(),
  date_contributed: z.string().optional(),
  fmv: z.number().nonnegative(),
  // FMV and the Schedule A deduction are distinct, especially for ordinary
  // income property and the specific capital-gain-property reductions.
  deduction_claimed: z.number().nonnegative(),
  cost_or_adjusted_basis: z.number().nonnegative().optional(),
  qualified_appraisal: z.object({
    appraiser_first_name: z.string().min(1),
    appraiser_last_name: z.string().min(1),
    signed_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    appraiser_ein: z.string().regex(/^\d{9}$/).optional(),
    appraiser_ssn: z.string().regex(/^\d{9}$/).optional(),
    us_address: usAddressSchema,
    signed_by_appraiser: z.literal(true),
  }).superRefine((appraisal, ctx) => {
    if (Boolean(appraisal.appraiser_ein) === Boolean(appraisal.appraiser_ssn)) {
      ctx.addIssue({
        code: "custom",
        message: "Form 8283 appraiser needs exactly one EIN or SSN",
      });
    }
  }).optional(),
  donee_acknowledgment: z.object({
    organization_name: z.string().min(1),
    ein: z.string().regex(/^\d{9}$/),
    received_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    us_address: usAddressSchema,
    signed_by_donee: z.literal(true),
    unrelated_use: z.boolean(),
  }).optional(),
  // Used to select the correct charitable contribution limit downstream; it
  // does not by itself cap the deduction at basis.
  is_capital_gain_property: z.boolean().optional(),
}).superRefine((item, ctx) => {
  if (item.deduction_claimed > item.fmv) {
    ctx.addIssue({
      code: "custom",
      message: "Form 8283 Section B deduction claimed exceeds appraised FMV",
    });
  }
});

// Singleton — one Form 8283 per return covering all noncash contributions
export const inputSchema = z.object({
  section_a_items: z.array(sectionAItemSchema).optional(),
  section_b_items: z.array(sectionBItemSchema).optional(),
});

export type SectionAItem = z.infer<typeof sectionAItemSchema>;
export type SectionBItem = z.infer<typeof sectionBItemSchema>;
export type F8283Input = z.infer<typeof inputSchema>;

function totalSectionAContributions(items: SectionAItem[]): number {
  return items.reduce(
    (sum, item) => sum + (item.deduction_claimed ?? item.fmv ?? 0),
    0,
  );
}

function totalSectionBContributions(items: SectionBItem[]): number {
  return items.reduce((sum, item) => sum + item.deduction_claimed, 0);
}

function scheduleAOutput(input: F8283Input): NodeOutput[] {
  const sectionA = totalSectionAContributions(input.section_a_items ?? []);
  const sectionB = totalSectionBContributions(input.section_b_items ?? []);
  const total = sectionA + sectionB;
  if (total === 0) return [];
  return [output(schedule_a, { line_12_noncash_contributions: total })];
}

class F8283Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8283";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule_a]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const parsed = inputSchema.parse(input);

    const outputs: NodeOutput[] = [
      ...scheduleAOutput(parsed),
    ];

    return { outputs };
  }
}

export const f8283 = new F8283Node();
