import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import {
  noncashContributionCategorySchema,
  scheduleA as schedule_a,
} from "../schedule_a/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";
import { form8283CarryoverEvidenceSchema } from "./carryover-source.ts";
import { FMVMethod } from "./fmv-method.ts";
export { FMVMethod } from "./fmv-method.ts";


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

const SUPPORTED_HIGH_VALUE_TYPES = new Set<SectionBPropertyType>([
  SectionBPropertyType.Equipment,
  SectionBPropertyType.Securities,
  SectionBPropertyType.Collectibles,
  SectionBPropertyType.Vehicle,
]);

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

// Form 1098-C box 5b: the donee certifies a below-FMV transfer to a needy
// person in direct furtherance of its charitable transportation purpose.
const vehicleNeedyTransferAcknowledgmentSchema = z.object({
  copy_received_from_donee: z.literal(true),
  donee_certified: z.literal(true),
  donee_name: z.string().min(1),
  donee_ein: z.string().regex(/^\d{9}$/),
  donee_us_address: usAddressSchema,
  acknowledgment_furnished_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  vehicle_to_be_transferred_to_needy_confirmed: z.literal(true),
  transfer_for_significantly_below_fmv_confirmed: z.literal(true),
  direct_charitable_transportation_purpose_confirmed: z.literal(true),
  vehicle_year: z.number().int().min(1900).max(2100),
  vehicle_make: z.string().min(1),
  vehicle_model: z.string().min(1),
  vehicle_condition: z.string().min(1),
  odometer_miles: z.number().int().nonnegative(),
  goods_or_services_received: z.literal(false),
});

// Form 1098-C boxes 5a and 5c. These are the donee's prospective
// certifications, not a donor's unsupported assertion of completed use.
const vehicleBox5aAcknowledgmentFields = {
  copy_received_from_donee: z.literal(true),
  donee_certified: z.literal(true),
  donee_name: z.string().min(1),
  donee_ein: z.string().regex(/^\d{9}$/),
  donee_us_address: usAddressSchema,
  acknowledgment_furnished_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  no_transfer_before_completion_confirmed: z.literal(true),
  vehicle_year: z.number().int().min(1900).max(2100),
  vehicle_make: z.string().min(1),
  vehicle_model: z.string().min(1),
  vehicle_condition: z.string().min(1),
  odometer_miles: z.number().int().nonnegative(),
  goods_or_services_received: z.literal(false),
};

const vehicleSignificantUseAcknowledgmentSchema = z.object({
  ...vehicleBox5aAcknowledgmentFields,
  intended_use_description: z.string().trim().min(1),
  intended_use_duration: z.string().trim().min(1),
  regularly_conducted_charitable_activity_confirmed: z.literal(true),
  substantial_nonincidental_use_confirmed: z.literal(true),
});

const vehicleMaterialImprovementAcknowledgmentSchema = z.object({
  ...vehicleBox5aAcknowledgmentFields,
  intended_improvement_description: z.string().trim().min(1),
  major_repair_or_addition_confirmed: z.literal(true),
  significant_value_increase_confirmed: z.literal(true),
  no_additional_donor_payment_confirmed: z.literal(true),
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
  // Narrow non-sale reduction route: purchased property held no more than one
  // year whose appreciation would be short-term gain under section 170(e)(1)(A).
  short_term_ordinary_income_reduction_confirmed: z.literal(true).optional(),
  // Taxpayer-supplied general property category (for example "books"). The
  // same category must be used for similar gifts to every donee this year.
  similar_item_group: z.string().trim().min(1).optional(),
  // Pub. 526 Worksheet 2 category of this actual donee/property combination.
  charitable_limit_category: noncashContributionCategorySchema.optional(),
  is_capital_gain_property: z.boolean().optional(),
  capital_gain_reduction_election_confirmed: z.literal(true).optional(),
  fmv_method: z.nativeEnum(FMVMethod).optional(),
  fmv_method_description: z.string().optional(),
  cost_or_adjusted_basis: z.number().nonnegative().optional(),
  // Vehicles — need Form 1098-C acknowledgment
  is_vehicle: z.boolean().optional(),
  vehicle_vin: z.string().regex(/^[A-Z0-9]{1,17}$|^[A-Z0-9]{19}$/).optional(),
  vehicle_sale_acknowledgment: vehicleSaleAcknowledgmentSchema.optional(),
  vehicle_needy_transfer_acknowledgment:
    vehicleNeedyTransferAcknowledgmentSchema.optional(),
  vehicle_significant_use_acknowledgment:
    vehicleSignificantUseAcknowledgmentSchema.optional(),
  vehicle_material_improvement_acknowledgment:
    vehicleMaterialImprovementAcknowledgmentSchema.optional(),
  // Name of the actual donee-issued Form 1098-C or contemporaneous written
  // acknowledgment PDF supplied to the MeF bundle. The native statement is
  // not a substitute for this binary attachment under F8283-029/031/032/033.
  vehicle_acknowledgment_attachment_file_name: z.string().min(1).optional(),
  // Clothing/household — must be in good used condition or better
  is_clothing_household: z.boolean().optional(),
}).superRefine((item, ctx) => {
  validateCharitableLimitCategory(item, ctx);
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
  if (
    item.short_term_ordinary_income_reduction_confirmed &&
    (item.fmv === undefined || item.deduction_claimed === undefined)
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["short_term_ordinary_income_reduction_confirmed"],
      message:
        "Form 8283 short-term reduction needs both FMV and claimed deduction",
    });
  }
  if (
    item.capital_gain_reduction_election_confirmed === true &&
    (item.fmv === undefined || item.deduction_claimed === undefined ||
      Math.round((item.fmv - item.deduction_claimed) * 100) <= 0)
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["capital_gain_reduction_election_confirmed"],
      message:
        "Form 8283 capital-gain election statement needs FMV and a claimed contribution reduced below FMV",
    });
  }
  if (item.fmv !== undefined && item.deduction_claimed !== undefined) {
    const reductionCents = Math.round(
      (item.fmv - item.deduction_claimed) * 100,
    );
    const saleCapCents = item.vehicle_sale_acknowledgment
      ? Math.round(
        Math.min(item.fmv, item.vehicle_sale_acknowledgment.gross_proceeds) *
          100,
      )
      : undefined;
    const certifiedSaleReduction = reductionCents > 0 &&
      saleCapCents === Math.round(item.deduction_claimed * 100);
    if (
      item.vehicle_sale_acknowledgment && reductionCents > 0 &&
      !certifiedSaleReduction
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["deduction_claimed"],
        message:
          "Form 8283 sale-proceeds route needs claim equal to the lesser of FMV and certified proceeds; combined reductions are not yet supported",
      });
    }
    if (
      certifiedSaleReduction &&
      (item.cost_or_adjusted_basis === undefined ||
        Math.round(item.cost_or_adjusted_basis * 100) <
          Math.round(item.fmv * 100))
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["cost_or_adjusted_basis"],
        message:
          "Form 8283 certified sale-proceeds reduction needs sourced basis at least FMV; appreciated property needs its additional reduction route",
      });
    }
    const shortTerm = item.short_term_ordinary_income_reduction_confirmed ===
      true;
    const capitalGainElection =
      item.capital_gain_reduction_election_confirmed === true;
    if (
      reductionCents > 0 && !certifiedSaleReduction && !shortTerm &&
      !capitalGainElection
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["short_term_ordinary_income_reduction_confirmed"],
        message:
          "Form 8283 reduced Section A claim needs certified sale proceeds, a sourced short-term ordinary-income reduction, or a sourced capital-gain reduction election",
      });
    }
    if (capitalGainElection && reductionCents > 0) {
      const acquired = item.date_acquired
        ? Date.parse(`${item.date_acquired}T00:00:00Z`)
        : NaN;
      const contributed = item.date_contributed
        ? Date.parse(`${item.date_contributed}T00:00:00Z`)
        : NaN;
      const acquiredDate = Number.isFinite(acquired)
        ? new Date(acquired)
        : undefined;
      const anniversary = acquiredDate
        ? Date.UTC(
          acquiredDate.getUTCFullYear() + 1,
          acquiredDate.getUTCMonth(),
          acquiredDate.getUTCDate(),
        )
        : NaN;
      const datesValid = item.date_acquired && item.date_contributed &&
        item.date_contributed.startsWith("2025-") &&
        Number.isFinite(contributed) &&
        acquiredDate?.toISOString().slice(0, 10) === item.date_acquired &&
        new Date(contributed).toISOString().slice(0, 10) ===
          item.date_contributed &&
        contributed > anniversary;
      if (
        !datesValid ||
        item.donor_acquisition_description?.trim().toLowerCase() !==
          "purchase" ||
        item.is_vehicle === true ||
        item.is_capital_gain_property !== true ||
        item.charitable_limit_category !== "noncash_50" ||
        item.cost_or_adjusted_basis === undefined ||
        Math.round(item.cost_or_adjusted_basis * 100) !==
          Math.round(item.deduction_claimed * 100) ||
        item.cost_or_adjusted_basis >= item.fmv ||
        shortTerm || certifiedSaleReduction
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["capital_gain_reduction_election_confirmed"],
          message:
            "Form 8283 capital-gain election reduction needs nonvehicle purchased capital property held more than one year, a 50% limit organization, and a claim equal to basis below FMV",
        });
      }
    }
    if (shortTerm) {
      const acquired = item.date_acquired
        ? Date.parse(`${item.date_acquired}T00:00:00Z`)
        : NaN;
      const contributed = item.date_contributed
        ? Date.parse(`${item.date_contributed}T00:00:00Z`)
        : NaN;
      const acquiredDate = Number.isFinite(acquired)
        ? new Date(acquired)
        : undefined;
      const anniversary = acquiredDate
        ? Date.UTC(
          acquiredDate.getUTCFullYear() + 1,
          acquiredDate.getUTCMonth(),
          acquiredDate.getUTCDate(),
        )
        : NaN;
      const datesValid = item.date_acquired && item.date_contributed &&
        item.date_contributed.startsWith("2025-") &&
        Number.isFinite(contributed) &&
        acquiredDate?.toISOString().slice(0, 10) === item.date_acquired &&
        new Date(contributed).toISOString().slice(0, 10) ===
          item.date_contributed &&
        contributed > acquired && contributed <= anniversary;
      if (
        !datesValid ||
        item.donor_acquisition_description?.trim().toLowerCase() !==
          "purchase" ||
        item.is_capital_gain_property !== false ||
        item.cost_or_adjusted_basis === undefined ||
        Math.round(item.cost_or_adjusted_basis * 100) !==
          Math.round(item.deduction_claimed * 100) ||
        item.cost_or_adjusted_basis >= item.fmv ||
        certifiedSaleReduction
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["short_term_ordinary_income_reduction_confirmed"],
          message:
            "Form 8283 short-term reduction needs purchased property held no more than one year, ordinary-income classification, and a claim equal to basis below FMV",
        });
      }
    }
  }
  if (item.vehicle_sale_acknowledgment && item.is_vehicle !== true) {
    ctx.addIssue({
      code: "custom",
      path: ["is_vehicle"],
      message: "Form 8283 vehicle sale acknowledgment needs vehicle property",
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
  const saleAck = item.vehicle_sale_acknowledgment;
  const needyAck = item.vehicle_needy_transfer_acknowledgment;
  const useAck = item.vehicle_significant_use_acknowledgment;
  const improvementAck = item.vehicle_material_improvement_acknowledgment;
  const exceptionAck = needyAck ?? useAck ?? improvementAck;
  const acknowledgmentCount = [saleAck, needyAck, useAck, improvementAck]
    .filter(Boolean).length;
  if (acknowledgmentCount !== 1) {
    ctx.addIssue({
      code: "custom",
      message:
        "Form 8283 vehicle above $500 needs exactly one donee sale, needy-transfer, significant-use, or material-improvement acknowledgment",
    });
    return;
  }
  if (exceptionAck && claimed > 5_000) {
    ctx.addIssue({
      code: "custom",
      message:
        "Form 8283 exception vehicle deduction above $5,000 needs Section B and a qualified appraisal",
    });
  }
  if (saleAck && claimed > saleAck.gross_proceeds) {
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
  const sale = saleAck ? Date.parse(`${saleAck.sale_date}T00:00:00Z`) : NaN;
  const furnished = Date.parse(
    `${
      saleAck?.acknowledgment_received_date ??
        exceptionAck?.acknowledgment_furnished_date
    }T00:00:00Z`,
  );
  const contributed = item.date_contributed
    ? Date.parse(`${item.date_contributed}T00:00:00Z`)
    : NaN;
  if (saleAck && (!Number.isFinite(contributed) || sale < contributed)) {
    ctx.addIssue({
      code: "custom",
      message: "Form 8283 vehicle sale must follow its contribution",
    });
  }
  if (
    saleAck && (
      !Number.isFinite(sale) || !Number.isFinite(furnished) ||
      furnished < sale || furnished - sale > 30 * 86_400_000
    )
  ) {
    ctx.addIssue({
      code: "custom",
      message:
        "Form 8283 vehicle acknowledgment must arrive within 30 days of sale",
    });
  }
  if (
    exceptionAck &&
    (!Number.isFinite(contributed) || !Number.isFinite(furnished) ||
      furnished < contributed || furnished - contributed > 30 * 86_400_000)
  ) {
    ctx.addIssue({
      code: "custom",
      message:
        "Form 8283 exception acknowledgment must be furnished within 30 days of contribution",
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
  similar_item_group: z.string().trim().min(1).optional(),
  charitable_limit_category: noncashContributionCategorySchema.optional(),
  capital_gain_reduction_election_confirmed: z.literal(true).optional(),
  // The supported Section B election is limited to purchased, unimproved
  // investment land. Developed real estate can involve recapture.
  investment_land_unimproved_confirmed: z.literal(true).optional(),
  reduction_statement_attachment_file_name: z.string().min(1).optional(),
  // A reviewer must verify the actual reduction computation in the PDF whose
  // bytes are submitted. Merely naming an attachment does not substantiate it.
  reduction_statement_source_review: z.object({
    reviewed_by: z.string().trim().min(1),
    reviewed_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    pdf_sha256: z.string().regex(/^[a-f0-9]{64}$/),
    original_fmv_matches_pdf_confirmed: z.literal(true),
    adjusted_basis_matches_pdf_confirmed: z.literal(true),
    appreciation_reduction_matches_pdf_confirmed: z.literal(true),
    election_reason_matches_pdf_confirmed: z.literal(true),
  }).optional(),
  // The actual completed and signed Form 8283 is a separate filing artifact.
  // Names of appraiser/donee signature excerpts do not substitute for it.
  signed_form_attachment_file_name: z.string().min(1).optional(),
  signed_form_source_review: z.object({
    reviewed_by: z.string().trim().min(1),
    reviewed_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    pdf_sha256: z.string().regex(/^[a-f0-9]{64}$/),
    appraiser_signature_present: z.literal(true),
    donee_signature_present: z.literal(true),
    matches_electronic_form_confirmed: z.literal(true),
  }).optional(),
  cost_or_adjusted_basis: z.number().nonnegative().optional(),
  // An exception vehicle above $5,000 belongs in Section B, with its own
  // appraiser and donee signatures in addition to Form 1098-C evidence.
  vehicle_vin: z.string().regex(/^[A-Z0-9]{1,17}$|^[A-Z0-9]{19}$/).optional(),
  vehicle_needy_transfer_acknowledgment:
    vehicleNeedyTransferAcknowledgmentSchema.optional(),
  vehicle_significant_use_acknowledgment:
    vehicleSignificantUseAcknowledgmentSchema.optional(),
  vehicle_material_improvement_acknowledgment:
    vehicleMaterialImprovementAcknowledgmentSchema.optional(),
  vehicle_acknowledgment_attachment_file_name: z.string().min(1).optional(),
  qualified_appraisal: z.object({
    appraiser_first_name: z.string().min(1),
    appraiser_last_name: z.string().min(1),
    signed_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    appraiser_ein: z.string().regex(/^\d{9}$/).optional(),
    appraiser_ssn: z.string().regex(/^\d{9}$/).optional(),
    us_address: usAddressSchema,
    signed_by_appraiser: z.literal(true),
    signature_attachment_file_name: z.string().min(1).optional(),
    // Full appraisal PDF, distinct from the Form 8283 signature PDF, is
    // required when the claimed deduction for this item exceeds $500,000.
    attachment_file_name: z.string().min(1).optional(),
    covers_similar_item_group_confirmed: z.literal(true).optional(),
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
    signature_attachment_file_name: z.string().min(1).optional(),
  }).optional(),
  // Used to select the correct charitable contribution limit downstream; it
  // does not by itself cap the deduction at basis.
  is_capital_gain_property: z.boolean().optional(),
}).superRefine((item, ctx) => {
  validateCharitableLimitCategory(item, ctx);
  if (item.capital_gain_reduction_election_confirmed === true) {
    const acquired = item.date_acquired &&
        /^\d{4}-\d{2}-\d{2}$/.test(item.date_acquired)
      ? Date.parse(`${item.date_acquired}T00:00:00Z`)
      : NaN;
    const contributed = item.date_contributed &&
        /^\d{4}-\d{2}-\d{2}$/.test(item.date_contributed)
      ? Date.parse(`${item.date_contributed}T00:00:00Z`)
      : NaN;
    const anniversary = item.date_acquired &&
        /^\d{4}-\d{2}-\d{2}$/.test(item.date_acquired)
      ? Date.parse(
        `${Number(item.date_acquired.slice(0, 4)) + 1}${
          item.date_acquired.slice(4)
        }T00:00:00Z`,
      )
      : NaN;
    if (
      item.property_type !== SectionBPropertyType.OtherRealEstate ||
      item.investment_land_unimproved_confirmed !== true ||
      item.donor_acquisition_description?.toLowerCase() !== "purchase" ||
      !Number.isFinite(acquired) || !Number.isFinite(contributed) ||
      !Number.isFinite(anniversary) ||
      new Date(acquired).toISOString().slice(0, 10) !== item.date_acquired ||
      new Date(contributed).toISOString().slice(0, 10) !==
        item.date_contributed ||
      !item.date_contributed?.startsWith("2025-") ||
      contributed <= anniversary ||
      item.is_capital_gain_property !== true ||
      item.charitable_limit_category !== "noncash_50" ||
      item.cost_or_adjusted_basis === undefined ||
      item.cost_or_adjusted_basis >= item.fmv ||
      Math.round(item.deduction_claimed * 100) !==
        Math.round(item.cost_or_adjusted_basis * 100) ||
      !item.reduction_statement_attachment_file_name ||
      !item.reduction_statement_source_review
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["capital_gain_reduction_election_confirmed"],
        message:
          "Form 8283 Section B election needs purchased unimproved investment land held more than one year, basis below appraised FMV, a claim equal to basis, and its reviewed FMV-reduction statement PDF",
      });
    }
  } else if (
    item.reduction_statement_attachment_file_name ||
    item.reduction_statement_source_review
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["reduction_statement_attachment_file_name"],
      message:
        "Form 8283 Section B reduction statement PDF needs a supported election route",
    });
  }
  if (item.deduction_claimed > item.fmv) {
    ctx.addIssue({
      code: "custom",
      message: "Form 8283 Section B deduction claimed exceeds appraised FMV",
    });
  }
  if (item.deduction_claimed > 500_000) {
    if (
      !item.property_type || !SUPPORTED_HIGH_VALUE_TYPES.has(item.property_type)
    ) {
      ctx.addIssue({
        code: "custom",
        message:
          "Form 8283 high-value property type needs its separate special-substantiation route",
      });
    }
    if (!item.qualified_appraisal?.attachment_file_name) {
      ctx.addIssue({
        code: "custom",
        message:
          "Form 8283 deduction above $500,000 needs the full qualified-appraisal PDF",
      });
    }
    if (!item.qualified_appraisal || !item.donee_acknowledgment) {
      ctx.addIssue({
        code: "custom",
        message:
          "Form 8283 high-value gift needs qualified appraisal and signed donee facts",
      });
    }
  }
  const acknowledgments = [
    item.vehicle_needy_transfer_acknowledgment,
    item.vehicle_significant_use_acknowledgment,
    item.vehicle_material_improvement_acknowledgment,
  ];
  if (item.property_type !== SectionBPropertyType.Vehicle) {
    if (
      item.vehicle_vin || item.vehicle_acknowledgment_attachment_file_name ||
      acknowledgments.some(Boolean)
    ) {
      ctx.addIssue({
        code: "custom",
        message:
          "Form 8283 Section B vehicle evidence needs vehicle property type",
      });
    }
    return;
  }
  if (!item.vehicle_vin) {
    ctx.addIssue({
      code: "custom",
      message: "Form 8283 Section B vehicle needs VIN",
    });
  }
  if (!item.qualified_appraisal || !item.donee_acknowledgment) {
    ctx.addIssue({
      code: "custom",
      message:
        "Form 8283 Section B vehicle needs qualified appraisal and signed donee facts",
    });
  }
  if (
    !item.qualified_appraisal?.signature_attachment_file_name ||
    !item.donee_acknowledgment?.signature_attachment_file_name
  ) {
    ctx.addIssue({
      code: "custom",
      message:
        "Form 8283 Section B vehicle needs appraiser and donee signature PDFs",
    });
  }
  if (!item.vehicle_acknowledgment_attachment_file_name) {
    ctx.addIssue({
      code: "custom",
      message:
        "Form 8283 vehicle needs its donee-issued Form 1098-C or written acknowledgment PDF",
    });
  }
  if (!item.physical_condition?.trim()) {
    ctx.addIssue({
      code: "custom",
      message: "Form 8283 Section B vehicle needs physical condition",
    });
  }
  if (acknowledgments.filter(Boolean).length !== 1) {
    ctx.addIssue({
      code: "custom",
      message:
        "Form 8283 Section B vehicle needs exactly one donee needy-transfer, significant-use, or material-improvement acknowledgment",
    });
    return;
  }
  const ack = acknowledgments.find((value) => value !== undefined)!;
  if (!item.date_contributed) {
    ctx.addIssue({
      code: "custom",
      message: "Form 8283 Section B vehicle needs contribution date",
    });
    return;
  }
  const contributed = Date.parse(`${item.date_contributed}T00:00:00Z`);
  const furnished = Date.parse(
    `${ack.acknowledgment_furnished_date}T00:00:00Z`,
  );
  if (
    !Number.isFinite(contributed) || !Number.isFinite(furnished) ||
    furnished < contributed || furnished - contributed > 30 * 86_400_000
  ) {
    ctx.addIssue({
      code: "custom",
      message:
        "Form 8283 Section B vehicle acknowledgment must be furnished within 30 days of contribution",
    });
  }
  if (
    item.donee_acknowledgment &&
    (item.donee_acknowledgment.organization_name !== ack.donee_name ||
      item.donee_acknowledgment.ein !== ack.donee_ein)
  ) {
    ctx.addIssue({
      code: "custom",
      message:
        "Form 8283 Section B signed donee and vehicle acknowledgment must identify the same organization",
    });
  }
});

// Singleton — one Form 8283 per return covering all noncash contributions
export const inputSchema = z.object({
  section_a_items: z.array(sectionAItemSchema).optional(),
  section_b_items: z.array(sectionBItemSchema).optional(),
  carryover_evidence: z.array(form8283CarryoverEvidenceSchema).min(1)
    .optional(),
}).superRefine((input, ctx) => {
  const sectionA = input.section_a_items ?? [];
  const sectionB = input.section_b_items ?? [];
  const hasCapitalGainElection = [...sectionA, ...sectionB].some((item) =>
    item.capital_gain_reduction_election_confirmed === true
  );
  if (hasCapitalGainElection) {
    for (
      const [section, items] of [
        ["section_a_items", sectionA],
        ["section_b_items", sectionB],
      ] as const
    ) {
      for (const [index, item] of items.entries()) {
        if (item.charitable_limit_category === "capital_gain_30") {
          ctx.addIssue({
            code: "custom",
            path: [section, index, "charitable_limit_category"],
            message:
              "Form 8283 capital-gain election applies to all current-year capital-gain property gifts to 50% limit organizations",
          });
        }
      }
    }
  }
  const positive = [
    ...sectionA.map((item, index) => ({
      item,
      section: "section_a_items",
      index,
    })),
    ...sectionB.map((item, index) => ({
      item,
      section: "section_b_items",
      index,
    })),
  ].filter(({ item }) => (item.deduction_claimed ?? item.fmv ?? 0) > 0);
  if (positive.length > 1) {
    for (const { item, section, index } of positive) {
      if (!item.similar_item_group) {
        ctx.addIssue({
          code: "custom",
          path: [section, index, "similar_item_group"],
          message:
            "Multiple Form 8283 gifts need an explicit similar-property category for cross-donee threshold aggregation",
        });
      }
    }
  }
  const groupTotals = similarItemGroupTotals(input);
  for (const [index, item] of sectionA.entries()) {
    const amount = item.deduction_claimed ?? item.fmv ?? 0;
    if (amount <= 0) continue;
    const groupTotal = item.similar_item_group
      ? groupTotals.get(normalizeSimilarItemGroup(item.similar_item_group)) ??
        amount
      : amount;
    if (groupTotal > 5_000 && !item.vehicle_sale_acknowledgment) {
      ctx.addIssue({
        code: "custom",
        path: ["section_a_items", index, "similar_item_group"],
        message:
          "Similar property claimed above $5,000 across all donees needs Section B and qualified-appraisal facts for each non-exempt gift",
      });
    }
  }
  for (const [index, item] of sectionB.entries()) {
    const groupTotal = item.similar_item_group
      ? groupTotals.get(normalizeSimilarItemGroup(item.similar_item_group)) ??
        item.deduction_claimed
      : item.deduction_claimed;
    if (groupTotal <= 5_000) {
      ctx.addIssue({
        code: "custom",
        path: ["section_b_items", index],
        message:
          "Section B ordinary gift needs more than $5,000 claimed for the item or its similar-item group",
      });
    }
    if (groupTotal > 500_000) {
      if (
        !item.property_type ||
        !SUPPORTED_HIGH_VALUE_TYPES.has(item.property_type)
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["section_b_items", index, "property_type"],
          message:
            "High-value similar-item group property type needs its separate special-substantiation route",
        });
      }
      if (!item.qualified_appraisal?.attachment_file_name) {
        ctx.addIssue({
          code: "custom",
          path: [
            "section_b_items",
            index,
            "qualified_appraisal",
            "attachment_file_name",
          ],
          message:
            "Similar-item group claimed above $500,000 needs a full qualified-appraisal PDF covering the group",
        });
      }
      if (
        item.similar_item_group &&
        positive.filter(({ item: candidate }) =>
            candidate.similar_item_group &&
            normalizeSimilarItemGroup(candidate.similar_item_group) ===
              normalizeSimilarItemGroup(item.similar_item_group!)
          ).length > 1 &&
        item.qualified_appraisal?.covers_similar_item_group_confirmed !== true
      ) {
        ctx.addIssue({
          code: "custom",
          path: [
            "section_b_items",
            index,
            "qualified_appraisal",
            "covers_similar_item_group_confirmed",
          ],
          message:
            "High-value similar-item appraisal must cover every item in the declared group",
        });
      }
    }
  }
  for (const [group, total] of groupTotals) {
    if (total <= 500_000) continue;
    const membersA = sectionA.filter((item) =>
      item.similar_item_group &&
      normalizeSimilarItemGroup(item.similar_item_group) === group
    );
    const membersB = sectionB.filter((item) =>
      item.similar_item_group &&
      normalizeSimilarItemGroup(item.similar_item_group) === group
    );
    if (membersA.length > 0 && membersB.length > 0) {
      ctx.addIssue({
        code: "custom",
        message:
          "High-value similar-item group mixes Section A exception and Section B gifts; appraisal exception allocation is not implemented",
      });
    }
    const appraisalFiles = new Set(
      membersB.map((item) => item.qualified_appraisal?.attachment_file_name)
        .filter(Boolean),
    );
    if (appraisalFiles.size > 1) {
      ctx.addIssue({
        code: "custom",
        message:
          "High-value similar-item group needs one shared full qualified appraisal covering every item and donee",
      });
    }
  }
});

export type SectionAItem = z.infer<typeof sectionAItemSchema>;
export type SectionBItem = z.infer<typeof sectionBItemSchema>;
export type F8283Input = z.infer<typeof inputSchema>;

export function normalizeSimilarItemGroup(group: string): string {
  return group.trim().toLocaleLowerCase("en-US");
}

export function similarItemGroupTotals(input: {
  section_a_items?: readonly {
    similar_item_group?: string;
    deduction_claimed?: number;
    fmv?: number;
  }[];
  section_b_items?: readonly {
    similar_item_group?: string;
    deduction_claimed?: number;
    fmv?: number;
  }[];
}): Map<string, number> {
  const totals = new Map<string, number>();
  for (
    const item of [
      ...(input.section_a_items ?? []),
      ...(input.section_b_items ?? []),
    ]
  ) {
    if (!item.similar_item_group) continue;
    const key = normalizeSimilarItemGroup(item.similar_item_group);
    const amount = item.deduction_claimed ?? item.fmv ?? 0;
    totals.set(key, (totals.get(key) ?? 0) + amount);
  }
  return totals;
}

type ClassifiedItem = {
  property_description?: string;
  deduction_claimed?: number;
  fmv?: number;
  charitable_limit_category?: z.infer<
    typeof noncashContributionCategorySchema
  >;
  is_capital_gain_property?: boolean;
  capital_gain_reduction_election_confirmed?: true;
  cost_or_adjusted_basis?: number;
};

function validateCharitableLimitCategory(
  item: ClassifiedItem,
  ctx: z.RefinementCtx,
): void {
  const claimed = item.deduction_claimed ?? item.fmv ?? 0;
  if (claimed <= 0) return;
  const category = item.charitable_limit_category;
  if (!category) {
    ctx.addIssue({
      code: "custom",
      path: ["charitable_limit_category"],
      message:
        "Form 8283 claimed gift needs its Pub. 526 donee/property AGI-limit category",
    });
    return;
  }
  if (item.is_capital_gain_property === undefined) {
    ctx.addIssue({
      code: "custom",
      path: ["is_capital_gain_property"],
      message:
        "Form 8283 AGI-limit classification needs an explicit capital-gain-property determination",
    });
  }
  const capitalCategory = category === "capital_gain_30" ||
    category === "capital_gain_20";
  if (capitalCategory && item.is_capital_gain_property !== true) {
    ctx.addIssue({
      code: "custom",
      path: ["is_capital_gain_property"],
      message:
        "Capital-gain charitable limit needs confirmed capital-gain property",
    });
  }
  if (item.is_capital_gain_property === true && category === "other_30") {
    ctx.addIssue({
      code: "custom",
      path: ["charitable_limit_category"],
      message: "Capital-gain property cannot use the ordinary 30% category",
    });
  }
  if (item.is_capital_gain_property === true && category === "noncash_50") {
    const noAppreciation = item.fmv !== undefined &&
      item.cost_or_adjusted_basis === item.fmv && claimed === item.fmv;
    if (
      (!item.capital_gain_reduction_election_confirmed && !noAppreciation) ||
      item.cost_or_adjusted_basis === undefined ||
      claimed > item.cost_or_adjusted_basis
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["capital_gain_reduction_election_confirmed"],
        message:
          "50% category for capital-gain property needs confirmed FMV-reduction election and a deduction no greater than basis",
      });
    }
  }
}

function scheduleAOutput(input: F8283Input): NodeOutput[] {
  const items = [
    ...(input.section_a_items ?? []),
    ...(input.section_b_items ?? []),
  ].flatMap((item, index) => {
    const amount = item.deduction_claimed ?? item.fmv ?? 0;
    if (amount === 0) return [];
    if (!item.charitable_limit_category) {
      throw new Error("Form 8283 contribution lacks AGI-limit category");
    }
    return [{
      source: `Form 8283 item ${index + 1}: ${
        item.property_description ?? "property"
      }`,
      amount,
      category: item.charitable_limit_category,
      contribution_id: `f8283:${index + 1}`,
      is_capital_gain_property: item.is_capital_gain_property,
      original_fmv: item.fmv,
      adjusted_basis: item.cost_or_adjusted_basis,
      capital_gain_reduction_election_confirmed:
        item.capital_gain_reduction_election_confirmed,
    }];
  });
  if (items.length === 0) return [];
  return [output(schedule_a, { noncash_contribution_items: items })];
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
