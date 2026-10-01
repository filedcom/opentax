import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { FilingStatus } from "../../../mef/header.ts";
import {
  f8283,
  FMVMethod,
  inputSchema as form8283InputSchema,
  SectionBPropertyType,
} from "../../../nodes/inputs/f8283/index.ts";
import {
  inputSchema as scheduleAInputSchema,
  scheduleA,
} from "../../../nodes/inputs/schedule_a/index.ts";
import { form8283Pdf } from "./f8283.ts";
import { scheduleAPdf } from "./schedule_a.ts";
import { form8283 } from "../../mef/forms/f8283.ts";
import { scheduleA as scheduleAMef } from "../../mef/forms/schedule_a.ts";
import { form8283FmvReductionStatement } from "../../mef/forms/f8283_fmv_reduction_statement.ts";

const filer = {
  primarySSN: "123456789",
  nameLine1: "ALEX DONOR",
  nameControl: "DONO",
  address: {
    line1: "1 Main St",
    city: "Albany",
    state: "NY",
    zip: "12201",
  },
  filingStatus: FilingStatus.Single,
};

const gift = {
  property_description: "Purchased collectible coin",
  donee_organization_name: "Community Museum",
  donee_organization_us_address: {
    line1: "1 Museum Way",
    city: "Albany",
    state: "NY",
    zip: "12201",
  },
  date_acquired: "2022-02-01",
  date_contributed: "2025-06-01",
  donor_acquisition_description: "Purchase",
  fmv: 4_500,
  deduction_claimed: 3_000,
  cost_or_adjusted_basis: 3_000,
  fmv_method: FMVMethod.ComparableSales,
  charitable_limit_category: "noncash_50" as const,
  is_capital_gain_property: true,
  capital_gain_reduction_election_confirmed: true as const,
};

const shortTermGift = {
  property_description: "Purchased print",
  donee_organization_name: "Community Arts Center",
  donee_organization_us_address: {
    line1: "12 Arts Road",
    city: "Albany",
    state: "NY",
    zip: "12201",
  },
  date_acquired: "2025-01-01",
  date_contributed: "2025-06-01",
  donor_acquisition_description: "Purchase",
  fmv: 1_000,
  deduction_claimed: 700,
  cost_or_adjusted_basis: 700,
  is_capital_gain_property: false,
  charitable_limit_category: "noncash_50" as const,
  fmv_method: FMVMethod.ComparableSales,
  short_term_ordinary_income_reduction_confirmed: true as const,
};

const inventoryGift = {
  ...shortTermGift,
  property_description: "Purchased books held for retail sale",
  date_acquired: "2023-02-01",
  fmv: 1_000,
  deduction_claimed: 600,
  cost_or_adjusted_basis: 600,
  short_term_ordinary_income_reduction_confirmed: undefined,
  inventory_ordinary_income_reduction: {
    purchase_invoice_reference: "Invoice INV-102",
    inventory_cost_record_reference: "Inventory ledger LOT-102",
    property_held_for_sale_to_customers_verified: true as const,
    fmv_sale_gain_entirely_ordinary_verified: true as const,
    no_other_reduction_reason_verified: true as const,
  },
};

const creatorGift = {
  ...inventoryGift,
  property_description: "Donor-created watercolor painting",
  date_acquired: "2024-09-01",
  donor_acquisition_description: "Created",
  deduction_claimed: 250,
  cost_or_adjusted_basis: 250,
  inventory_ordinary_income_reduction: undefined,
  creator_ordinary_income_reduction: {
    creation_record_reference: "Studio log ART-17",
    capitalized_cost_record_reference: "Undeducted materials ledger ART-17",
    taxpayer_created_artwork_verified: true as const,
    date_acquired_is_substantial_completion_verified: true as const,
    basis_costs_not_previously_deducted_verified: true as const,
    fmv_sale_gain_entirely_ordinary_verified: true as const,
    no_other_reduction_reason_verified: true as const,
  },
};

const manuscriptGift = {
  ...creatorGift,
  property_description: "Donor-prepared historical manuscript",
  date_acquired: "2025-02-01",
  deduction_claimed: 300,
  cost_or_adjusted_basis: 300,
  creator_ordinary_income_reduction: undefined,
  manuscript_ordinary_income_reduction: {
    manuscript_preparation_record_reference: "Draft ledger MS-17",
    capitalized_cost_record_reference: "Undeducted research ledger MS-17",
    taxpayer_prepared_manuscript_verified: true as const,
    date_acquired_is_substantial_completion_verified: true as const,
    basis_costs_not_previously_deducted_verified: true as const,
    fmv_sale_gain_entirely_ordinary_verified: true as const,
    no_other_reduction_reason_verified: true as const,
  },
};

const unrelatedUseGift = {
  ...shortTermGift,
  property_description: "Purchased collectible coin sold by museum",
  date_acquired: "2022-02-01",
  fmv: 4_500,
  deduction_claimed: 3_000,
  cost_or_adjusted_basis: 3_000,
  is_capital_gain_property: true,
  short_term_ordinary_income_reduction_confirmed: undefined,
  unrelated_use_capital_gain_reduction: {
    purchase_record_reference: "Coin purchase receipt COIN-17",
    donee_unrelated_use_statement_reference: "Museum sale-plan letter USE-17",
    tangible_personal_property_verified: true as const,
    donee_use_unrelated_to_exempt_purpose_verified: true as const,
    hypothetical_fmv_sale_gain_entirely_long_term_verified: true as const,
    no_other_reduction_reason_verified: true as const,
  },
};

const privateFoundationGift = {
  ...unrelatedUseGift,
  donee_organization_name: "Albany Private Foundation",
  donee_organization_us_address: {
    line1: "10 Foundation Lane",
    city: "Albany",
    state: "NY",
    zip: "12201",
  },
  charitable_limit_category: "capital_gain_20" as const,
  unrelated_use_capital_gain_reduction: undefined,
  private_foundation_capital_gain_reduction: {
    purchase_record_reference: "Coin purchase record COIN-20",
    foundation_status_record_reference: "Foundation status record PF-20",
    foundation_name: "Albany Private Foundation",
    foundation_ein: "123456789",
    foundation_us_address: {
      line1: "10 Foundation Lane",
      city: "Albany",
      state: "NY",
      zip: "12201",
    },
    private_nonoperating_foundation_not_50_percent_limit_verified:
      true as const,
    not_qualified_appreciated_stock_verified: true as const,
    outright_contribution_verified: true as const,
    hypothetical_fmv_sale_gain_entirely_long_term_verified: true as const,
    no_other_reduction_reason_verified: true as const,
  },
};

Deno.test("Form 8283 PDF prints private-foundation basis claim and explanation", () => {
  const pending = currentSectionAPending({
    section_a_items: [privateFoundationGift],
  });
  const [instance] = form8283Pdf.instances?.(pending.f8283, filer, pending) ??
    [];
  assertEquals(instance?.row1_claim, 3_000);
  assertEquals(instance?.row1_basis, 3_000);
  assertStringIncludes(
    (instance?.reduction_statements as string[])[0],
    "private nonoperating foundation",
  );
  assertThrows(
    () =>
      form8283Pdf.instances?.(pending.f8283, filer, {
        ...pending,
        f1040: { ...pending.f1040, line12e_itemized_deductions: 2_999 },
      }),
    Error,
    "differs from recomputed Schedule A",
  );
});

const soldVehicle = {
  property_description: "2020 Honda Civic, good condition, 60,000 miles",
  donee_organization_name: "City Charity",
  donee_organization_us_address: {
    line1: "1 Main St",
    city: "Austin",
    state: "TX",
    zip: "78701",
  },
  is_vehicle: true,
  vehicle_vin: "1HGBH41JXMN109186",
  vehicle_acknowledgment_attachment_file_name: "Form1098C-Civic.pdf",
  date_acquired: "2020-01-01",
  date_contributed: "2025-06-01",
  donor_acquisition_description: "Purchase",
  fmv: 20_000,
  deduction_claimed: 15_000,
  cost_or_adjusted_basis: 25_000,
  charitable_limit_category: "noncash_50" as const,
  similar_item_group: "vehicles",
  is_capital_gain_property: false,
  fmv_method: FMVMethod.ComparableSales,
  vehicle_sale_acknowledgment: {
    copy_received_from_donee: true as const,
    donee_certified: true as const,
    donee_name: "City Charity",
    donee_ein: "987654321",
    donee_us_address: {
      line1: "1 Main St",
      city: "Austin",
      state: "TX",
      zip: "78701",
    },
    acknowledgment_received_date: "2025-07-15",
    sale_to_unrelated_party: true as const,
    sale_date: "2025-07-01",
    gross_proceeds: 15_000,
    vehicle_year: 2020,
    vehicle_make: "Honda",
    vehicle_model: "Civic",
    vehicle_condition: "Good condition",
    odometer_miles: 60_000,
    goods_or_services_received: false as const,
  },
};

const needyVehicle = {
  ...soldVehicle,
  fmv: 4_000,
  deduction_claimed: 4_000,
  cost_or_adjusted_basis: 5_000,
  vehicle_sale_acknowledgment: undefined,
  vehicle_needy_transfer_acknowledgment: {
    copy_received_from_donee: true as const,
    donee_certified: true as const,
    donee_name: "City Charity",
    donee_ein: "987654321",
    donee_us_address: {
      line1: "1 Main St",
      city: "Austin",
      state: "TX",
      zip: "78701",
    },
    acknowledgment_furnished_date: "2025-06-20",
    vehicle_to_be_transferred_to_needy_confirmed: true as const,
    transfer_for_significantly_below_fmv_confirmed: true as const,
    direct_charitable_transportation_purpose_confirmed: true as const,
    vehicle_year: 2020,
    vehicle_make: "Honda",
    vehicle_model: "Civic",
    vehicle_condition: "Good condition",
    odometer_miles: 60_000,
    goods_or_services_received: false as const,
  },
};

function soldVehiclePending() {
  const form = { section_a_items: [soldVehicle] };
  const items = f8283.compute(
    { taxYear: 2025, formType: "f1040" },
    form8283InputSchema.parse(form),
  ).outputs[0].fields.noncash_contribution_items;
  const source = {
    agi: 100_000,
    current_noncash_gift_inventory_complete_confirmed: true as const,
    other_prior_charitable_carryovers_absent_confirmed: true as const,
    capital_gain_property_carryovers: [],
    noncash_contribution_items: items,
  };
  const finalized = scheduleA.compute(
    { taxYear: 2025, formType: "f1040" },
    scheduleAInputSchema.parse(source),
  ).finalizations![0].fields;
  return {
    f8283: form,
    schedule_a: { ...source, ...finalized },
    f1040: { line11_agi: 100_000, line12e_itemized_deductions: 15_000 },
  };
}

function electedPending() {
  const form = { section_a_items: [gift] };
  const items = f8283.compute(
    { taxYear: 2025, formType: "f1040" },
    form8283InputSchema.parse(form),
  ).outputs[0].fields.noncash_contribution_items;
  const source = {
    agi: 100_000,
    capital_gain_50_percent_election_confirmed: true as const,
    current_noncash_gift_inventory_complete_confirmed: true as const,
    other_prior_charitable_carryovers_absent_confirmed: true as const,
    capital_gain_property_carryovers: [],
    noncash_contribution_items: items,
  };
  const finalized = scheduleA.compute(
    { taxYear: 2025, formType: "f1040" },
    scheduleAInputSchema.parse(source),
  ).finalizations![0].fields;
  return {
    f8283: form,
    schedule_a: { ...source, ...finalized },
    f1040: { line11_agi: 100_000, line12e_itemized_deductions: 3_000 },
  };
}

function ordinaryPending() {
  const item = {
    ...shortTermGift,
    property_description: "Purchased used books",
    fmv: 700,
    deduction_claimed: 700,
    cost_or_adjusted_basis: 900,
    short_term_ordinary_income_reduction_confirmed: undefined,
  };
  const form = { section_a_items: [item] };
  const items = f8283.compute(
    { taxYear: 2025, formType: "f1040" },
    form8283InputSchema.parse(form),
  ).outputs[0].fields.noncash_contribution_items;
  const source = {
    agi: 100_000,
    current_noncash_gift_inventory_complete_confirmed: true as const,
    other_prior_charitable_carryovers_absent_confirmed: true as const,
    capital_gain_property_carryovers: [],
    noncash_contribution_items: items,
  };
  const finalized = scheduleA.compute(
    { taxYear: 2025, formType: "f1040" },
    scheduleAInputSchema.parse(source),
  ).finalizations![0].fields;
  return {
    f8283: form,
    schedule_a: { ...source, ...finalized },
    f1040: { line11_agi: 100_000, line12e_itemized_deductions: 700 },
  };
}

function currentSectionAPending(form: {
  section_a_items: readonly Record<string, unknown>[];
}) {
  const parsedForm = form8283InputSchema.parse(form);
  const items = f8283.compute(
    { taxYear: 2025, formType: "f1040" },
    parsedForm,
  ).outputs[0].fields.noncash_contribution_items;
  const source = {
    agi: 100_000,
    current_noncash_gift_inventory_complete_confirmed: true as const,
    other_prior_charitable_carryovers_absent_confirmed: true as const,
    capital_gain_property_carryovers: [],
    noncash_contribution_items: items,
  };
  const parsedSource = scheduleAInputSchema.parse(source);
  const calculated = scheduleA.compute(
    { taxYear: 2025, formType: "f1040" },
    parsedSource,
  );
  const finalized = calculated.finalizations![0].fields;
  const itemized = calculated.outputs.find((output) =>
    output.nodeType === "standard_deduction"
  )?.fields.itemized_deductions;
  return {
    f8283: parsedForm,
    schedule_a: { ...parsedSource, ...finalized },
    f1040: {
      line11_agi: 100_000,
      line12e_itemized_deductions: itemized,
    },
  };
}

const electedLand = {
  property_description: "Unimproved investment land",
  property_type: SectionBPropertyType.OtherRealEstate,
  physical_condition: "Unimproved parcel, no structures",
  investment_land_unimproved_confirmed: true as const,
  date_acquired: "2022-02-01",
  date_contributed: "2025-06-01",
  donor_acquisition_description: "Purchase",
  fmv: 27_000,
  deduction_claimed: 20_000,
  cost_or_adjusted_basis: 20_000,
  charitable_limit_category: "noncash_50" as const,
  is_capital_gain_property: true,
  capital_gain_reduction_election_confirmed: true as const,
  reduction_statement_attachment_file_name: "LandReduction.pdf",
  reduction_statement_source_review: {
    reviewed_by: "Test reviewer",
    reviewed_on: "2025-06-11",
    pdf_sha256: "b".repeat(64),
    original_fmv_matches_pdf_confirmed: true as const,
    adjusted_basis_matches_pdf_confirmed: true as const,
    appreciation_reduction_matches_pdf_confirmed: true as const,
    election_reason_matches_pdf_confirmed: true as const,
  },
  qualified_appraisal: {
    appraiser_first_name: "Sam",
    appraiser_last_name: "Expert",
    signed_date: "2025-06-10",
    appraiser_ein: "123456789",
    us_address: {
      line1: "1 Appraisal Ave",
      city: "Albany",
      state: "NY",
      zip: "12201",
    },
    signed_by_appraiser: true as const,
    signature_attachment_file_name: "AppraiserSignature.pdf",
  },
  donee_acknowledgment: {
    organization_name: "Community Land Trust",
    ein: "987654321",
    received_date: "2025-06-01",
    us_address: {
      line1: "2 Trust Road",
      city: "Albany",
      state: "NY",
      zip: "12201",
    },
    signed_by_donee: true as const,
    unrelated_use: false,
    signature_attachment_file_name: "DoneeSignature.pdf",
  },
};

function electedLandPending() {
  const form = { section_b_items: [electedLand] };
  const items = f8283.compute(
    { taxYear: 2025, formType: "f1040" },
    form8283InputSchema.parse(form),
  ).outputs[0].fields.noncash_contribution_items;
  const source = {
    agi: 100_000,
    capital_gain_50_percent_election_confirmed: true as const,
    current_noncash_gift_inventory_complete_confirmed: true as const,
    other_prior_charitable_carryovers_absent_confirmed: true as const,
    capital_gain_property_carryovers: [],
    noncash_contribution_items: items,
  };
  const finalized = scheduleA.compute(
    { taxYear: 2025, formType: "f1040" },
    scheduleAInputSchema.parse(source),
  ).finalizations![0].fields;
  return {
    f8283: form,
    schedule_a: { ...source, ...finalized },
    f1040: { line11_agi: 100_000, line12e_itemized_deductions: 20_000 },
  };
}

function materialImprovementVehiclePending() {
  const vehicle = {
    property_description: "2018 Honda Civic, fair condition, 90,000 miles",
    property_type: SectionBPropertyType.Vehicle,
    physical_condition: "Fair condition; engine needs replacement",
    date_acquired: "2018-05-15",
    donor_acquisition_description: "Purchase",
    date_contributed: "2025-06-01",
    fmv: 15_000,
    deduction_claimed: 15_000,
    cost_or_adjusted_basis: 18_000,
    charitable_limit_category: "noncash_50" as const,
    is_capital_gain_property: false,
    vehicle_vin: "1HGBH41JXMN109186",
    vehicle_acknowledgment_attachment_file_name: "Form1098C-Improvement.pdf",
    vehicle_material_improvement_acknowledgment: {
      copy_received_from_donee: true as const,
      donee_certified: true as const,
      donee_name: "City Charity",
      donee_ein: "987654321",
      donee_us_address: {
        line1: "1 Main St",
        city: "Austin",
        state: "TX",
        zip: "78701",
      },
      acknowledgment_furnished_date: "2025-06-20",
      no_transfer_before_completion_confirmed: true as const,
      intended_improvement_description: "Replace failed engine",
      major_repair_or_addition_confirmed: true as const,
      significant_value_increase_confirmed: true as const,
      no_additional_donor_payment_confirmed: true as const,
      vehicle_year: 2018,
      vehicle_make: "Honda",
      vehicle_model: "Civic",
      vehicle_condition: "Fair condition",
      odometer_miles: 90_000,
      goods_or_services_received: false as const,
    },
    signed_form_attachment_file_name: "SignedForm8283.pdf",
    signed_form_source_review: {
      reviewed_by: "Review Clerk",
      reviewed_on: "2025-09-01",
      pdf_sha256: "a".repeat(64),
      appraiser_signature_present: true as const,
      donee_signature_present: true as const,
      matches_electronic_form_confirmed: true as const,
    },
    qualified_appraisal: {
      appraiser_first_name: "Jane",
      appraiser_last_name: "Smith",
      signed_date: "2025-05-28",
      appraiser_ein: "123456789",
      signed_by_appraiser: true as const,
      signature_attachment_file_name: "AppraiserSignature.pdf",
      us_address: {
        line1: "1 Art Way",
        city: "Austin",
        state: "TX",
        zip: "78701",
      },
    },
    donee_acknowledgment: {
      organization_name: "City Charity",
      ein: "987654321",
      received_date: "2025-06-01",
      signed_by_donee: true as const,
      unrelated_use: false,
      signature_attachment_file_name: "DoneeSignature.pdf",
      us_address: {
        line1: "1 Main St",
        city: "Austin",
        state: "TX",
        zip: "78701",
      },
    },
  };
  const form = { section_b_items: [vehicle] };
  const items = f8283.compute(
    { taxYear: 2025, formType: "f1040" },
    form8283InputSchema.parse(form),
  ).outputs[0].fields.noncash_contribution_items;
  const source = {
    agi: 100_000,
    current_noncash_gift_inventory_complete_confirmed: true as const,
    other_prior_charitable_carryovers_absent_confirmed: true as const,
    capital_gain_property_carryovers: [],
    noncash_contribution_items: items,
  };
  const finalized = scheduleA.compute(
    { taxYear: 2025, formType: "f1040" },
    scheduleAInputSchema.parse(source),
  ).finalizations![0].fields;
  return {
    f8283: form,
    schedule_a: { ...source, ...finalized },
    f1040: { line11_agi: 100_000, line12e_itemized_deductions: 15_000 },
  };
}

Deno.test("Form 8283 PDF prints reconciled Section B material-improvement vehicle", () => {
  const pending = materialImprovementVehiclePending();
  const [instance] = form8283Pdf.instances?.(pending.f8283, filer, pending) ??
    [];
  assertEquals(form8283Pdf.pageIndices?.(instance), [0, 1]);
  assertEquals(instance?.section_b_vehicle, true);
  assertEquals(instance?.section_b_other_real_estate, undefined);
  assertEquals(instance?.section_b_appraised_fmv, 15_000);
  assertEquals(instance?.section_b_claim, 15_000);
  assertStringIncludes(
    (instance?.reduction_statements as string[])[0],
    "VIN 1HGBH41JXMN109186",
  );
  const byKey = new Map(
    form8283Pdf.fields.map((field) => [field.domainKey, field.pdfField]),
  );
  assertEquals(
    byKey.get("section_b_vehicle"),
    "Form8283[0].Page1[0].Lines2i-l[0].c1_6[0]",
  );
  scheduleAMef.build(pending.schedule_a, { pending });
  assertThrows(
    () =>
      scheduleAMef.build({
        ...pending.schedule_a,
        line_12_noncash_contributions: 14_999,
      }, { pending }),
    Error,
    "recomputed Schedule A lines 11",
  );
  assertThrows(
    () =>
      form8283Pdf.instances?.(pending.f8283, filer, {
        ...pending,
        f1040: { ...pending.f1040, line12e_itemized_deductions: 14_999 },
      }),
    Error,
    "recomputed Schedule A lines 11",
  );
  const wrongDonee = {
    section_b_items: [{
      ...pending.f8283.section_b_items[0],
      donee_acknowledgment: {
        ...pending.f8283.section_b_items[0].donee_acknowledgment,
        organization_name: "Different Charity",
      },
    }],
  };
  assertThrows(
    () =>
      form8283Pdf.instances?.(wrongDonee, filer, {
        ...pending,
        f8283: wrongDonee,
      }),
    Error,
    "signed donee and vehicle acknowledgment must identify the same organization",
  );
});

function purchasedOrdinaryTangiblePending(
  propertyType: SectionBPropertyType,
  description: string,
  physicalCondition: string,
) {
  const vehicle = materialImprovementVehiclePending().f8283.section_b_items[0];
  const artHigh = propertyType === SectionBPropertyType.ArtAtLeast20000;
  const claim = artHigh ? 25_000 : 12_000;
  const item = {
    ...vehicle,
    property_description: description,
    property_type: propertyType,
    physical_condition: physicalCondition,
    good_used_condition_confirmed:
      propertyType === SectionBPropertyType.ClothingHousehold
        ? true as const
        : undefined,
    fmv: claim,
    deduction_claimed: claim,
    cost_or_adjusted_basis: artHigh ? 35_000 : 18_000,
    qualified_appraisal: {
      ...vehicle.qualified_appraisal,
      attachment_file_name: artHigh ? "FullArtAppraisal.pdf" : undefined,
      full_appraisal_source_review: artHigh
        ? {
          reviewed_by: "Synthetic test reviewer",
          reviewed_on: "2025-09-01",
          pdf_sha256: "a".repeat(64),
          signed_appraisal_confirmed: true as const,
          donated_property_matches_confirmed: true as const,
          appraised_fmv_matches_confirmed: true as const,
        }
        : undefined,
    },
    similar_item_group: propertyType,
    vehicle_vin: undefined,
    vehicle_acknowledgment_attachment_file_name: undefined,
    vehicle_material_improvement_acknowledgment: undefined,
  };
  const form = { section_b_items: [item] };
  const items = f8283.compute(
    { taxYear: 2025, formType: "f1040" },
    form8283InputSchema.parse(form),
  ).outputs[0].fields.noncash_contribution_items;
  const source = {
    agi: 100_000,
    current_noncash_gift_inventory_complete_confirmed: true as const,
    other_prior_charitable_carryovers_absent_confirmed: true as const,
    capital_gain_property_carryovers: [],
    noncash_contribution_items: items,
  };
  const finalized = scheduleA.compute(
    { taxYear: 2025, formType: "f1040" },
    scheduleAInputSchema.parse(source),
  ).finalizations![0].fields;
  return {
    f8283: form,
    schedule_a: { ...source, ...finalized },
    f1040: { line11_agi: 100_000, line12e_itemized_deductions: claim },
  };
}

Deno.test("Form 8283 PDF prints purchased Section B art, equipment, collectible and household gifts", () => {
  const routes = [
    [
      SectionBPropertyType.ArtAtLeast20000,
      "Oil painting, early twentieth century",
      "Good condition; minor frame wear",
      "section_b_art_at_least_20000",
      "Form8283[0].Page1[0].Lines2a-c[0].c1_6[0]",
    ],
    [
      SectionBPropertyType.ArtUnder20000,
      "Oil painting, early twentieth century",
      "Good condition; minor frame wear",
      "section_b_art_under_20000",
      "Form8283[0].Page1[0].Lines2a-c[0].c1_6[2]",
    ],
    [
      SectionBPropertyType.Equipment,
      "Used industrial printing press",
      "Operational, professionally maintained",
      "section_b_equipment",
      "Form8283[0].Page1[0].Lines2d-h[0].c1_6[1]",
    ],
    [
      SectionBPropertyType.Collectibles,
      "Rare coin collection, circulated grade",
      "Circulated, professionally graded",
      "section_b_collectibles",
      "Form8283[0].Page1[0].Lines2d-h[0].c1_6[3]",
    ],
    [
      SectionBPropertyType.ClothingHousehold,
      "Used leather sofa",
      "Good used condition; light wear",
      "section_b_clothing_household",
      "Form8283[0].Page1[0].Lines2i-l[0].c1_6[1]",
    ],
  ] as const;
  for (const [propertyType, description, condition, key, field] of routes) {
    const pending = purchasedOrdinaryTangiblePending(
      propertyType,
      description,
      condition,
    );
    const [instance] = form8283Pdf.instances?.(pending.f8283, filer, pending) ??
      [];
    assertEquals(form8283Pdf.pageIndices?.(instance), [0, 1]);
    assertEquals(instance?.[key], true);
    const amount = propertyType === SectionBPropertyType.ArtAtLeast20000
      ? 25_000
      : 12_000;
    assertEquals(instance?.section_b_appraised_fmv, amount);
    assertEquals(instance?.section_b_claim, amount);
    assertEquals(instance?.section_b_appraiser_name, "Jane Smith");
    assertStringIncludes(
      (instance?.reduction_statements as string[])[0],
      description,
    );
    const byKey = new Map(
      form8283Pdf.fields.map((field) => [field.domainKey, field.pdfField]),
    );
    assertEquals(
      byKey.get(key),
      field,
    );
    scheduleAMef.build(pending.schedule_a, { pending });
    assertThrows(
      () =>
        scheduleAMef.build({
          ...pending.schedule_a,
          line_12_noncash_contributions: amount - 1,
        }, { pending }),
      Error,
      "recomputed Schedule A lines 11",
    );
    const missingReview = {
      section_b_items: [{
        ...pending.f8283.section_b_items[0],
        signed_form_source_review: undefined,
      }],
    };
    assertThrows(
      () =>
        form8283Pdf.instances?.(missingReview, filer, {
          ...pending,
          f8283: missingReview,
        }),
      Error,
      "complete purchased tangible gift",
    );
    if (propertyType === SectionBPropertyType.ClothingHousehold) {
      const poorCondition = {
        section_b_items: [{
          ...pending.f8283.section_b_items[0],
          good_used_condition_confirmed: undefined,
        }],
      };
      assertThrows(
        () =>
          form8283Pdf.instances?.(poorCondition, filer, {
            ...pending,
            f8283: poorCondition,
          }),
        Error,
        "complete purchased tangible gift",
      );
    }
  }
});

Deno.test("Form 8283 PDF maps December 2025 Section A identity and four rows", () => {
  assertEquals(form8283Pdf.pageIndices?.({}), [0]);
  const byKey = new Map(
    form8283Pdf.fields.map((field) => [field.domainKey, field.pdfField]),
  );
  assertEquals(byKey.get("filer_name"), "Form8283[0].Page1[0].f1_1[0]");
  assertEquals(byKey.get("filer_ssn"), "Form8283[0].Page1[0].f1_2[0]");
  assertEquals(
    byKey.get("row1_donee"),
    "Form8283[0].Page1[0].Table_Line1_ColsA-C[0].Row1A[0].f1_5[0]",
  );
  assertEquals(
    byKey.get("row4_claim"),
    "Form8283[0].Page1[0].Table_Line1_ColsD-I[0].Row1D[0].f1_39[0]",
  );
  assertEquals(form8283Pdf.fields.length, 72);
});

Deno.test("Form 8283 PDF prints reconciled Section A and carries the FMV explanation", () => {
  const pending = electedPending();
  const [instance] = form8283Pdf.instances?.(pending.f8283, filer, pending) ??
    [];
  assertEquals(instance?.filer_name, "ALEX DONOR");
  assertEquals(
    instance?.row1_donee,
    "Community Museum\n1 Museum Way, Albany, NY 12201",
  );
  assertEquals(instance?.row1_contribution_date, "06/01/2025");
  assertEquals(instance?.row1_acquired_date, "02/2022");
  assertEquals(instance?.row1_basis, 3_000);
  assertEquals(instance?.row1_claim, 3_000);
  assertEquals(instance?.row1_fmv_method, "Comparable sales");
  assertStringIncludes(
    (instance?.reduction_statements as string[])[0],
    "unreduced FMV $4500.00 minus $1500.00",
  );
});

Deno.test("Form 8283 PDF prints one reconciled ordinary Section A gift", () => {
  const pending = ordinaryPending();
  const [instance] = form8283Pdf.instances?.(pending.f8283, filer, pending) ??
    [];
  assertEquals(instance?.row1_description, "Purchased used books");
  assertEquals(instance?.row1_claim, 700);
  assertEquals(instance?.row1_basis, 900);
  assertEquals(instance?.row1_fmv_method, "Comparable sales");
  assertEquals(instance?.reduction_statements, []);
  assertThrows(
    () =>
      form8283Pdf.instances?.(pending.f8283, filer, {
        ...pending,
        f1040: { ...pending.f1040, line12e_itemized_deductions: 701 },
      }),
    Error,
    "differs from recomputed Schedule A",
  );
  assertThrows(
    () =>
      form8283Pdf.instances?.(pending.f8283, filer, {
        ...pending,
        schedule_a: {
          ...pending.schedule_a,
          current_noncash_gift_inventory_complete_confirmed: undefined,
        },
      }),
    Error,
    "complete current-gift inventory",
  );
});

Deno.test("Form 8283 carries four distinct unreduced Section A gifts through Schedule A, MeF, and PDF", () => {
  const base = ordinaryPending().f8283.section_a_items[0];
  const amounts = [700, 1_200, 1_500, 2_100];
  const form = {
    section_a_items: amounts.map((amount, index) => ({
      ...base,
      property_description: `Purchased used property lot ${index + 1}`,
      donee_organization_name: `Community charity ${index + 1}`,
      donee_organization_us_address: {
        ...base.donee_organization_us_address,
        line1: `${index + 1} Charity Lane`,
      },
      similar_item_group: `distinct property class ${index + 1}`,
      fmv: amount,
      deduction_claimed: amount,
      cost_or_adjusted_basis: amount + 300,
    })),
  };
  const pending = currentSectionAPending(form);
  assertEquals(pending.schedule_a.line_12_noncash_contributions, 5_500);
  const [instance] = form8283Pdf.instances?.(form, filer, pending) ?? [];
  assertEquals(instance?.row1_claim, 700);
  assertEquals(instance?.row2_claim, 1_200);
  assertEquals(instance?.row3_claim, 1_500);
  assertEquals(instance?.row4_claim, 2_100);
  assertEquals(instance?.reduction_statements, []);
  const [xml] = form8283.build(form, { pending });
  for (const propertyId of ["A", "B", "C", "D"]) {
    assertStringIncludes(xml, `<PropertyId>${propertyId}</PropertyId>`);
  }
  assertThrows(
    () =>
      form8283Pdf.instances?.(form, filer, {
        ...pending,
        f1040: {
          ...pending.f1040,
          line12e_itemized_deductions:
            pending.f1040.line12e_itemized_deductions + 1,
        },
      }),
    Error,
    "differs from recomputed Schedule A",
  );
  assertThrows(
    () =>
      form8283.build({
        section_a_items: [
          ...form.section_a_items.slice(0, 3),
          { ...form.section_a_items[3], fmv: 2_000, deduction_claimed: 2_000 },
        ],
      }, { pending }),
    Error,
    "differ from the pending source",
  );
  assertThrows(
    () =>
      form8283Pdf.instances?.(
        {
          section_a_items: [
            ...form.section_a_items.slice(0, 3),
            {
              ...form.section_a_items[3],
              similar_item_group: "distinct property class 1",
            },
          ],
        },
        filer,
        pending,
      ),
    Error,
  );
});

Deno.test("Form 8283 PDF prints every sourced short-term Section A reduction", () => {
  const form = {
    section_a_items: [
      { ...shortTermGift, similar_item_group: "prints" },
      {
        ...shortTermGift,
        property_description: "Second purchased print",
        similar_item_group: "prints",
      },
    ],
  };
  const [instance] = form8283Pdf.instances?.(
    form,
    filer,
    currentSectionAPending(form),
  ) ?? [];
  assertEquals(instance?.row1_claim, 700);
  assertEquals(instance?.row2_claim, 700);
  assertEquals(instance?.row2_description, "Second purchased print");
  assertEquals((instance?.reduction_statements as string[]).length, 2);
  assertStringIncludes(
    (instance?.reduction_statements as string[])[0],
    "short-term appreciation of $300.00",
  );
});

Deno.test("Form 8283 PDF prints purchased inventory basis claim and reason", () => {
  const form = { section_a_items: [inventoryGift] };
  const [instance] = form8283Pdf.instances?.(
    form,
    filer,
    currentSectionAPending(form),
  ) ?? [];
  assertEquals(instance?.row1_claim, 600);
  assertEquals(instance?.row1_basis, 600);
  assertStringIncludes(
    (instance?.reduction_statements as string[])[0],
    "hypothetical sale gain of $400.00",
  );
});

Deno.test("Form 8283 PDF prints donor-created art basis claim and reason", () => {
  const form = { section_a_items: [creatorGift] };
  const [instance] = form8283Pdf.instances?.(
    form,
    filer,
    currentSectionAPending(form),
  ) ?? [];
  assertEquals(instance?.row1_basis, 250);
  assertEquals(instance?.row1_claim, 250);
  assertStringIncludes(
    (instance?.reduction_statements as string[])[0],
    "hypothetical sale gain of $750.00",
  );
});

Deno.test("Form 8283 PDF prints donor-prepared manuscript basis claim and FMV reason", () => {
  const form = { section_a_items: [manuscriptGift] };
  const [instance] = form8283Pdf.instances?.(
    form,
    filer,
    currentSectionAPending(form),
  ) ?? [];
  assertEquals(instance?.row1_basis, 300);
  assertEquals(instance?.row1_claim, 300);
  assertStringIncludes(
    (instance?.reduction_statements as string[])[0],
    "Donor-prepared manuscript substantially completed",
  );
  assertStringIncludes(
    (instance?.reduction_statements as string[])[0],
    "hypothetical sale gain of $700.00",
  );
});

Deno.test("Form 8283 PDF prints unrelated-use tangible property basis and statement", () => {
  const form = { section_a_items: [unrelatedUseGift] };
  const pending = currentSectionAPending(form);
  const [instance] = form8283Pdf.instances?.(
    form,
    filer,
    pending,
  ) ?? [];
  assertEquals(instance?.row1_basis, 3_000);
  assertEquals(instance?.row1_claim, 3_000);
  assertStringIncludes(
    (instance?.reduction_statements as string[])[0],
    "section 170(e)(1)(B)(i) reduction",
  );
  assertEquals(scheduleAPdf.includeWhen?.(pending.schedule_a, pending), true);
  const { f8283: _omitted, ...missingForm } = pending;
  assertThrows(
    () => scheduleAPdf.includeWhen?.(pending.schedule_a, missingForm),
    Error,
    "needs its linked Form 8283 source",
  );
  const changedSchedule = {
    ...pending.schedule_a,
    noncash_contribution_items: pending.schedule_a.noncash_contribution_items!
      .map((item) => ({
        ...item,
        unrelated_use_capital_gain_reduction_confirmed: undefined,
      })),
  };
  assertThrows(
    () =>
      scheduleAPdf.includeWhen?.(changedSchedule, {
        ...pending,
        schedule_a: changedSchedule,
      }),
    Error,
    "Appreciated capital-gain property in the 50% category needs an elected or unrelated-use basis reduction",
  );
});

Deno.test("Form 8283 mixed Section A preview keeps its sole reduction on item B", () => {
  const companion = {
    ...shortTermGift,
    property_description: "Purchased used books",
    similar_item_group: "books",
    date_acquired: "2025-02-01",
    fmv: 600,
    deduction_claimed: 600,
    cost_or_adjusted_basis: 800,
    short_term_ordinary_income_reduction_confirmed: undefined,
  };
  const form = {
    section_a_items: [companion, {
      ...shortTermGift,
      similar_item_group: "prints",
    }],
  };
  const pending = currentSectionAPending(form);
  const [instance] = form8283Pdf.instances?.(form, filer, pending) ?? [];
  assertEquals(instance?.row1_claim, 600);
  assertEquals(instance?.row2_claim, 700);
  assertEquals((instance?.reduction_statements as string[]).length, 1);
  assertStringIncludes(
    (instance?.reduction_statements as string[])[0],
    "Section A item B: unreduced FMV $1000.00 minus $300.00",
  );
  const statements = form8283FmvReductionStatement.build([], {
    pending,
    documentIdsByPendingKey: {
      form8283_fmv_reduction_statement: ["ReductionForB"],
    },
  });
  assertEquals(statements.length, 1);
  assertStringIncludes(statements[0], "Section A item B:");
  const [xml] = form8283.build(form, {
    pending,
    documentIdsByPendingKey: {
      form8283_fmv_reduction_statement: ["ReductionForB"],
    },
  });
  assertStringIncludes(xml, 'referenceDocumentId="ReductionForB"');
  assertStringIncludes(xml, "<FairMarketValueAmt>600</FairMarketValueAmt>");
  assertStringIncludes(xml, "<FairMarketValueAmt");
});

Deno.test("Form 8283 mixed Section A preview rejects an unsourced unreduced companion", () => {
  const companion = {
    ...shortTermGift,
    property_description: "Purchased used books",
    similar_item_group: "books",
    fmv: 600,
    deduction_claimed: 600,
    cost_or_adjusted_basis: 800,
    short_term_ordinary_income_reduction_confirmed: undefined,
  };
  for (
    const incomplete of [
      { ...companion, cost_or_adjusted_basis: 500 },
      { ...companion, donee_organization_us_address: undefined },
      { ...companion, date_contributed: "2024-06-01" },
    ]
  ) {
    const form = {
      section_a_items: [incomplete, {
        ...shortTermGift,
        similar_item_group: "prints",
      }],
    };
    assertThrows(
      () => form8283Pdf.instances?.(form, filer, { f8283: form }),
      Error,
      "unreduced companion needs a complete purchased noncapital Section A gift claimed at FMV",
    );
  }
});

Deno.test("Form 8283 PDF rejects incomplete or divergent short-term reductions", () => {
  const form = { section_a_items: [shortTermGift] };
  assertThrows(
    () =>
      form8283Pdf.instances?.(form, filer, {
        f8283: { section_a_items: [{ ...shortTermGift, fmv: 1_100 }] },
      }),
    Error,
    "source differs from the pending return",
  );
  const incomplete = {
    section_a_items: [{ ...shortTermGift, donee_organization_name: "" }],
  };
  assertThrows(
    () => form8283Pdf.instances?.(incomplete, filer, { f8283: incomplete }),
    Error,
    "complete donee, property, dates, basis, and valuation-method facts",
  );
  const mixed = {
    section_a_items: [
      shortTermGift,
      {
        ...shortTermGift,
        short_term_ordinary_income_reduction_confirmed: undefined,
      },
    ],
  };
  assertThrows(
    () => form8283Pdf.instances?.(mixed, filer, { f8283: mixed }),
    Error,
  );
});

Deno.test("Form 8283 PDF prints one reconciled vehicle capped at certified sale proceeds", () => {
  const pending = soldVehiclePending();
  const native = form8283.build(pending.f8283, {
    pending,
    attachmentDescriptionsByFileName: {
      "Form1098C-Civic.pdf": "Form1098C Civic acknowledgment",
    },
  })[0];
  assertStringIncludes(
    native,
    "<FairMarketValueAmt>15000</FairMarketValueAmt>",
  );
  const [instance] = form8283Pdf.instances?.(pending.f8283, filer, pending) ??
    [];
  assertEquals(instance?.row1_vehicle, true);
  assertEquals(instance?.row1_vin, soldVehicle.vehicle_vin);
  assertEquals(instance?.row1_claim, 15_000);
  assertEquals(instance?.row1_basis, 25_000);
  assertStringIncludes(
    (instance?.reduction_statements as string[])[0],
    "gross proceeds $15000.00",
  );
  assertThrows(
    () =>
      form8283Pdf.instances?.(pending.f8283, filer, {
        ...pending,
        f1040: { ...pending.f1040, line12e_itemized_deductions: 14_000 },
      }),
    Error,
    "recomputed Schedule A or Form 1040",
  );
  assertThrows(
    () =>
      form8283.build(pending.f8283, {
        pending: {
          ...pending,
          f1040: { ...pending.f1040, line12e_itemized_deductions: 14_000 },
        },
      }),
    Error,
    "recomputed Schedule A or Form 1040",
  );
  assertThrows(
    () =>
      scheduleAMef.build({
        ...pending.schedule_a,
        line_12_noncash_contributions: 14_000,
      }, { pending }),
    Error,
    "recomputed Schedule A or Form 1040",
  );
  assertThrows(
    () =>
      form8283Pdf.instances?.(
        {
          section_a_items: [{
            ...soldVehicle,
            vehicle_acknowledgment_attachment_file_name: undefined,
          }],
        },
        filer,
        pending,
      ),
    Error,
    "only one reconciled certified-sale or unreduced needy-transfer",
  );
});

Deno.test("Form 8283 PDF prints one unreduced needy-transfer vehicle with matched certification", () => {
  const form = { section_a_items: [needyVehicle] };
  const pending = currentSectionAPending(form);
  const [instance] = form8283Pdf.instances?.(form, filer, pending) ?? [];
  assertEquals(instance?.row1_vehicle, true);
  assertEquals(instance?.row1_vin, needyVehicle.vehicle_vin);
  assertEquals(instance?.row1_claim, 4_000);
  assertEquals(instance?.row1_basis, 5_000);
  assertEquals(instance?.reduction_statements, []);
  const native = form8283.build(pending.f8283, {
    pending,
    attachmentDescriptionsByFileName: {
      "Form1098C-Civic.pdf": "Form1098C needy transfer certification",
    },
  })[0];
  assertStringIncludes(native, "<FairMarketValueAmt>4000</FairMarketValueAmt>");
  assertThrows(
    () =>
      form8283Pdf.instances?.(
        {
          section_a_items: [{
            ...needyVehicle,
            donee_organization_name: "Different Charity",
          }],
        },
        filer,
        pending,
      ),
    Error,
    "matching donee facts",
  );
  const mismatchedDonee = {
    section_a_items: [{
      ...needyVehicle,
      donee_organization_name: "Different Charity",
    }],
  };
  assertThrows(
    () =>
      form8283.build(mismatchedDonee, {
        pending: { ...pending, f8283: mismatchedDonee },
      }),
    Error,
    "matching donee facts",
  );
  const mismatchedVehicle = {
    section_a_items: [{
      ...needyVehicle,
      property_description: "2019 Honda Civic, good condition, 60,000 miles",
    }],
  };
  assertThrows(
    () =>
      form8283.build(mismatchedVehicle, {
        pending: { ...pending, f8283: mismatchedVehicle },
      }),
    Error,
    "matching donee facts",
  );
  const higherFmv = {
    section_a_items: [{
      ...needyVehicle,
      fmv: 5_100,
      deduction_claimed: 5_100,
      cost_or_adjusted_basis: 6_000,
    }],
  };
  assertThrows(
    () =>
      form8283.build(higherFmv, {
        pending: { ...pending, f8283: higherFmv },
      }),
    Error,
    "needs Section B",
  );
  assertThrows(
    () =>
      scheduleAMef.build({
        ...pending.schedule_a,
        line_12_noncash_contributions: 3_999,
      }, { pending }),
    Error,
    "recomputed Schedule A or Form 1040",
  );
});

Deno.test("Form 8283 PDF prints reconciled Section B land without inventing signatures", () => {
  const pending = electedLandPending();
  const [instance] = form8283Pdf.instances?.(pending.f8283, filer, pending) ??
    [];
  assertEquals(form8283Pdf.pageIndices?.(instance), [0, 1]);
  assertEquals(instance?.section_b_other_real_estate, true);
  assertEquals(instance?.section_b_appraised_fmv, 27_000);
  assertEquals(instance?.section_b_claim, 20_000);
  assertEquals(instance?.section_b_acquired_date, "02/2022");
  assertEquals(instance?.section_b_appraiser_name, "Sam Expert");
  assertEquals(instance?.section_b_appraiser_id, "123456789");
  assertEquals(instance?.section_b_appraiser_street, "1 Appraisal Ave");
  assertEquals(
    instance?.section_b_appraiser_city_state_zip,
    "Albany, NY 12201",
  );
  assertEquals(instance?.section_b_unrelated_use_no, true);
  assertEquals(instance?.section_b_donee_name, "Community Land Trust");
  assertStringIncludes(
    (instance?.reduction_statements as string[])[0],
    "does not reproduce signatures",
  );
  const byKey = new Map(
    form8283Pdf.fields.map((field) => [field.domainKey, field.pdfField]),
  );
  assertEquals(
    byKey.get("section_b_claim"),
    "Form8283[0].Page1[0].Table_Line3_ColsD-I[0].Row3A[0].f1_56[0]",
  );
  assertEquals(
    byKey.get("section_b_donee_name"),
    "Form8283[0].Page2[0].f2_19[0]",
  );
  assertEquals(
    byKey.get("section_b_appraiser_id"),
    "Form8283[0].Page2[0].f2_16[0]",
  );
  assertEquals(
    byKey.get("section_b_appraiser_name"),
    "Form8283[0].Page2[0].f2_13[0]",
  );
  assertEquals(
    byKey.get("section_b_appraiser_street"),
    "Form8283[0].Page2[0].f2_15[0]",
  );
  assertEquals(
    byKey.get("section_b_appraiser_city_state_zip"),
    "Form8283[0].Page2[0].f2_17[0]",
  );
  assertEquals(byKey.has("section_b_appraiser_signature"), false);
  assertEquals(byKey.has("section_b_appraiser_signed_date"), false);
});

Deno.test("Form 8283 PDF blocks mixed, overflow and unreconciled sources", () => {
  const pending = electedPending();
  assertThrows(
    () =>
      form8283Pdf.instances?.(
        {
          section_a_items: [{ ...gift, similar_item_group: "coins" }],
          section_b_items: [{
            ...electedLand,
            similar_item_group: "investment_land",
          }],
        },
        filer,
        pending,
      ),
    Error,
    "one standalone item without Section A",
  );
  assertThrows(
    () =>
      form8283Pdf.instances?.(
        {
          section_a_items: Array(5).fill({
            ...gift,
            similar_item_group: "coins",
          }),
        },
        filer,
        pending,
      ),
    Error,
    "continuation pages remain unsupported",
  );
  assertThrows(
    () =>
      form8283Pdf.instances?.(pending.f8283, filer, { f8283: pending.f8283 }),
    Error,
    "complete Schedule A source",
  );
  assertThrows(
    () =>
      form8283Pdf.instances?.(
        { section_a_items: [{ ...gift, fmv: 5_000 }] },
        filer,
        {
          ...pending,
          f8283: { section_a_items: [{ ...gift, fmv: 5_000 }] },
        },
      ),
    Error,
    "current gifts differ",
  );
  assertThrows(
    () =>
      form8283Pdf.instances?.(
        pending.f8283,
        filer,
        {
          ...pending,
          f1040: { ...pending.f1040, line12e_itemized_deductions: 2_999 },
        },
      ),
    Error,
    "recomputed Schedule A lines 11",
  );
  const landPending = electedLandPending();
  assertThrows(
    () =>
      form8283Pdf.instances?.(landPending.f8283, filer, {
        f8283: landPending.f8283,
      }),
    Error,
    "complete Schedule A source",
  );
  assertThrows(
    () =>
      form8283Pdf.instances?.(
        landPending.f8283,
        filer,
        {
          ...landPending,
          f1040: {
            ...landPending.f1040,
            line12e_itemized_deductions: 19_999,
          },
        },
      ),
    Error,
    "recomputed Schedule A lines 11",
  );
  const unsigned = {
    section_b_items: [{
      ...electedLand,
      qualified_appraisal: {
        ...electedLand.qualified_appraisal,
        signature_attachment_file_name: undefined,
      },
    }],
  };
  assertThrows(
    () =>
      form8283Pdf.instances?.(
        unsigned,
        filer,
        { ...landPending, f8283: unsigned },
      ),
    Error,
    "complete investment-land election source with named signature PDFs",
  );
  const impossibleSignatureDate = {
    section_b_items: [{
      ...electedLand,
      qualified_appraisal: {
        ...electedLand.qualified_appraisal,
        signed_date: "2025-02-30",
      },
    }],
  };
  assertThrows(
    () =>
      form8283Pdf.instances?.(
        impossibleSignatureDate,
        filer,
        { ...landPending, f8283: impossibleSignatureDate },
      ),
    Error,
    "valid ISO calendar date",
  );
});
