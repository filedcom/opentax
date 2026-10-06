import {
  f8283,
  type F8283Input,
  inputSchema as form8283InputSchema,
  type SectionAItem,
  SectionBPropertyType,
} from "../../../nodes/inputs/f8283/index.ts";
import {
  inputSchema as scheduleAInputSchema,
  scheduleA,
} from "../../../nodes/inputs/schedule_a/index.ts";
import type { FilerIdentity } from "../../../mef/header.ts";
import type { MefBuildContext } from "../form-descriptor.ts";

function hasCompleteSectionAColumns(item: SectionAItem): boolean {
  const address = item.donee_organization_us_address;
  if (
    !item.donee_organization_name?.trim() || !address?.line1.trim() ||
    !address.city.trim() || !address.state.trim() || !address.zip.trim() ||
    !item.property_description?.trim() || !item.date_contributed ||
    (!item.fmv_method && !item.fmv_method_description?.trim())
  ) return false;
  if ((item.deduction_claimed ?? item.fmv ?? 0) <= 500) return true;
  return !!item.date_acquired &&
    !!item.donor_acquisition_description?.trim() &&
    item.cost_or_adjusted_basis !== undefined;
}

export function isSingleSectionAVehicleSale(form: F8283Input): boolean {
  const sectionA = form.section_a_items ?? [];
  const item = sectionA[0];
  return sectionA.length === 1 && (form.section_b_items ?? []).length === 0 &&
    item.is_vehicle === true &&
    item.vehicle_sale_acknowledgment !== undefined &&
    !!item.vehicle_acknowledgment_attachment_file_name?.trim() &&
    item.capital_gain_reduction_election_confirmed !== true &&
    item.short_term_ordinary_income_reduction_confirmed !== true &&
    item.fmv !== undefined && item.deduction_claimed !== undefined &&
    Math.round((item.fmv - item.deduction_claimed) * 100) > 0;
}

export function isSingleSectionAExceptionVehicleUnreduced(
  form: F8283Input,
): boolean {
  const sectionA = form.section_a_items ?? [];
  const item = sectionA[0];
  return sectionA.length === 1 && (form.section_b_items ?? []).length === 0 &&
    item.is_vehicle === true &&
    (item.vehicle_needy_transfer_acknowledgment !== undefined ||
      item.vehicle_significant_use_acknowledgment !== undefined ||
      item.vehicle_material_improvement_acknowledgment !== undefined) &&
    item.fmv !== undefined && item.deduction_claimed === item.fmv;
}

export function assertExceptionVehicleUnreducedSource(form: F8283Input): void {
  if (!isSingleSectionAExceptionVehicleUnreduced(form)) {
    throw new Error(
      "Form 8283 exception Section A route needs one vehicle claimed at original FMV",
    );
  }
  const item = form.section_a_items![0];
  const acknowledgment = item.vehicle_needy_transfer_acknowledgment ??
    item.vehicle_significant_use_acknowledgment ??
    item.vehicle_material_improvement_acknowledgment!;
  const address = item.donee_organization_us_address;
  const certifiedAddress = acknowledgment.donee_us_address;
  const description = item.property_description?.toLowerCase() ?? "";
  const compactDescription = description.replace(/[,\s]/g, "");
  if (
    !hasCompleteSectionAColumns(item) ||
    !item.vehicle_vin?.trim() ||
    !item.vehicle_acknowledgment_attachment_file_name?.trim() ||
    !item.date_acquired || !item.date_contributed?.startsWith("2025-") ||
    item.date_acquired > item.date_contributed ||
    item.donor_acquisition_description?.trim().toLowerCase() !== "purchase" ||
    item.fmv === undefined || item.fmv <= 500 || item.fmv > 5_000 ||
    item.cost_or_adjusted_basis === undefined ||
    item.cost_or_adjusted_basis < item.fmv ||
    item.is_capital_gain_property !== false ||
    item.charitable_limit_category !== "noncash_50" ||
    item.short_term_ordinary_income_reduction_confirmed === true ||
    item.capital_gain_reduction_election_confirmed === true ||
    !description.includes(String(acknowledgment.vehicle_year)) ||
    !description.includes(acknowledgment.vehicle_make.toLowerCase()) ||
    !description.includes(acknowledgment.vehicle_model.toLowerCase()) ||
    !description.includes(acknowledgment.vehicle_condition.toLowerCase()) ||
    !compactDescription.includes(String(acknowledgment.odometer_miles)) ||
    !item.donee_organization_name?.trim() || !address ||
    item.donee_organization_name.trim() !== acknowledgment.donee_name.trim() ||
    address.line1.trim() !== certifiedAddress.line1.trim() ||
    (address.line2?.trim() ?? "") !==
      (certifiedAddress.line2?.trim() ?? "") ||
    address.city.trim() !== certifiedAddress.city.trim() ||
    address.state.trim() !== certifiedAddress.state.trim() ||
    address.zip.trim() !== certifiedAddress.zip.trim()
  ) {
    throw new Error(
      "Form 8283 exception Section A route needs complete purchased vehicle and matching donee facts",
    );
  }
}

export function hasSectionAShortTermReduction(form: F8283Input): boolean {
  const sectionA = form.section_a_items ?? [];
  return sectionA.length > 0 && (form.section_b_items ?? []).length === 0 &&
    sectionA.every((item) => item.is_vehicle !== true) &&
    sectionA.some((item) =>
      item.short_term_ordinary_income_reduction_confirmed === true &&
      item.fmv !== undefined && item.deduction_claimed !== undefined &&
      Math.round((item.fmv - item.deduction_claimed) * 100) > 0
    );
}

/** Reconcile up to twelve current Section A gifts without a capital-gain election. */
export function assertOrdinarySectionAReconciled(
  context: MefBuildContext | undefined,
  filedScheduleA?: Readonly<Record<string, unknown>>,
): void {
  const pending = context?.pending;
  const returnFields = pending?.f1040 as Record<string, unknown> | undefined;
  const scheduleFields = pending?.schedule_a as
    | Record<string, unknown>
    | undefined;
  if (
    !pending?.f8283 || !scheduleFields || !returnFields ||
    returnFields.line12e_itemized_deductions === undefined ||
    returnFields.line12a_standard_deduction !== undefined
  ) {
    throw new Error(
      "Form 8283 ordinary Section A needs a complete Schedule A source and itemized Form 1040",
    );
  }
  const form = form8283InputSchema.parse(pending.f8283);
  const sectionA = form.section_a_items ?? [];
  const repeatedPageReviewedGifts = sectionA.length > 4 &&
    sectionA.every((item) =>
      hasCompleteSectionAColumns(item) && item.is_vehicle !== true &&
      item.capital_gain_reduction_election_confirmed !== true &&
      !!item.similar_item_group?.trim() &&
      item.date_contributed?.startsWith("2025-") &&
      item.cost_or_adjusted_basis !== undefined &&
      item.deduction_claimed !== undefined
    );
  const repeatedPagePlainGifts = sectionA.length > 4 &&
    sectionA.every((item) =>
      item.is_vehicle !== true && item.is_capital_gain_property === false &&
      item.charitable_limit_category === "noncash_50" &&
      item.donor_acquisition_description?.trim().toLowerCase() ===
        "purchase" &&
      item.date_contributed?.startsWith("2025-") &&
      !!item.date_acquired &&
      item.date_acquired <= item.date_contributed &&
      item.fmv !== undefined && item.fmv > 500 && item.fmv <= 5_000 &&
      item.deduction_claimed === item.fmv &&
      item.cost_or_adjusted_basis !== undefined &&
      item.cost_or_adjusted_basis >= item.fmv &&
      !!item.similar_item_group?.trim()
    ) &&
    new Set(
        sectionA.map((item) => item.similar_item_group!.trim().toLowerCase()),
      ).size === sectionA.length;
  if (
    sectionA.length < 1 || sectionA.length > 12 ||
    ((form.section_b_items ?? []).length !== 0 &&
      !isReviewedSectionBReductionInventory(form)) ||
    sectionA.some((item) => !hasCompleteSectionAColumns(item)) ||
    (sectionA.length > 4 && !repeatedPagePlainGifts &&
      !repeatedPageReviewedGifts)
  ) {
    throw new Error(
      "Form 8283 ordinary Section A needs one to four sourced gifts, or five to twelve distinct unreduced nonvehicle gifts",
    );
  }
  if (
    scheduleFields.charitable_limits_finalized !== true ||
    scheduleFields.current_noncash_gift_inventory_complete_confirmed !== true ||
    scheduleFields.other_prior_charitable_carryovers_absent_confirmed !==
      true ||
    !Array.isArray(scheduleFields.capital_gain_property_carryovers) ||
    scheduleFields.capital_gain_property_carryovers.length !== 0 ||
    scheduleFields.line_13_contribution_carryover !== 0
  ) {
    throw new Error(
      "Form 8283 ordinary Section A needs a complete current-gift inventory and empty carryover ledger",
    );
  }
  const {
    line_11_cash_contributions: _line11,
    line_12_noncash_contributions: _line12,
    line_13_contribution_carryover: _line13,
    charitable_limits_finalized: _limits,
    capital_gain_election_finalized: _election,
    ...source
  } = scheduleFields;
  const parsedScheduleA = scheduleAInputSchema.parse(source);
  const expectedItems = f8283.compute(
    { taxYear: 2025, formType: "f1040" },
    form,
  ).outputs.flatMap((output) =>
    output.nodeType === "schedule_a"
      ? (output.fields.noncash_contribution_items as readonly unknown[] ?? [])
      : []
  );
  const actualItems = (parsedScheduleA.noncash_contribution_items ?? [])
    .filter((item) => item.contribution_id?.startsWith("f8283:"));
  if (
    JSON.stringify(expectedItems) !== JSON.stringify(actualItems) ||
    parsedScheduleA.agi !== returnFields.line11_agi
  ) {
    throw new Error(
      "Form 8283 ordinary Section A differs from Schedule A's gift inventory or Form 1040 AGI",
    );
  }
  const recomputed = scheduleA.compute(
    { taxYear: 2025, formType: "f1040" },
    parsedScheduleA,
  );
  const computed = recomputed.finalizations?.find((output) =>
    output.nodeType === "schedule_a"
  )?.fields;
  const itemizedTotal = recomputed.outputs.find((output) =>
    output.nodeType === "standard_deduction"
  )?.fields.itemized_deductions;
  if (
    !computed ||
    itemizedTotal !== returnFields.line12e_itemized_deductions ||
    computed.line_11_cash_contributions !==
      scheduleFields.line_11_cash_contributions ||
    computed.line_12_noncash_contributions !==
      scheduleFields.line_12_noncash_contributions ||
    computed.line_13_contribution_carryover !==
      scheduleFields.line_13_contribution_carryover ||
    (filedScheduleA && (
      filedScheduleA.line_11_cash_contributions !==
        computed.line_11_cash_contributions ||
      filedScheduleA.line_12_noncash_contributions !==
        computed.line_12_noncash_contributions ||
      filedScheduleA.line_13_contribution_carryover !==
        computed.line_13_contribution_carryover
    ))
  ) {
    throw new Error(
      "Form 8283 ordinary Section A differs from recomputed Schedule A or Form 1040 itemized deductions",
    );
  }
}

/** Prove the bounded current-year Section A election against the source graph. */
export function assertElectedSectionAReconciled(
  context: MefBuildContext | undefined,
  filedScheduleA?: Readonly<Record<string, unknown>>,
): void {
  const pending = context?.pending;
  const source8283 = pending?.f8283;
  const sourceScheduleA = pending?.schedule_a;
  const returnFields = pending?.f1040 as Record<string, unknown> | undefined;
  if (
    !source8283 || !sourceScheduleA || !returnFields ||
    typeof sourceScheduleA !== "object"
  ) {
    throw new Error(
      "Form 8283 election needs filed Form 8283, complete Schedule A source, and itemized Form 1040",
    );
  }
  if (
    returnFields.line12e_itemized_deductions === undefined ||
    returnFields.line12a_standard_deduction !== undefined
  ) {
    throw new Error("Form 8283 election needs an itemized Form 1040");
  }
  const form = form8283InputSchema.parse(source8283);
  if (
    (form.section_a_items ?? []).every((item) =>
      item.capital_gain_reduction_election_confirmed !== true
    ) || (form.section_b_items ?? []).length > 0
  ) {
    throw new Error(
      "Form 8283 election is bounded to current Section A gifts without Section B",
    );
  }
  if (
    (form.section_a_items ?? []).some((item) =>
      !hasCompleteSectionAColumns(item)
    )
  ) {
    throw new Error(
      "Form 8283 elected Section A needs complete donee, property, dates, basis, and valuation-method facts",
    );
  }
  const reductionCount =
    (form.section_a_items ?? []).filter((item) =>
      item.fmv !== undefined && item.deduction_claimed !== undefined &&
      Math.round((item.fmv - item.deduction_claimed) * 100) > 0
    ).length;
  const statementIds = context?.documentIdsByPendingKey
    ?.form8283_fmv_reduction_statement;
  if (
    context?.documentIdsByPendingKey &&
    (!statementIds || statementIds.length !== reductionCount ||
      statementIds.some((id) => !id.trim()) ||
      new Set(statementIds).size !== statementIds.length)
  ) {
    throw new Error(
      "Form 8283 elected Section A needs distinct native FMV-reduction statement IDs",
    );
  }
  const scheduleFields = sourceScheduleA as Record<string, unknown>;
  if (
    scheduleFields.capital_gain_election_finalized !== true ||
    scheduleFields.charitable_limits_finalized !== true ||
    scheduleFields.current_noncash_gift_inventory_complete_confirmed !== true ||
    scheduleFields.other_prior_charitable_carryovers_absent_confirmed !==
      true ||
    !Array.isArray(scheduleFields.capital_gain_property_carryovers) ||
    scheduleFields.capital_gain_property_carryovers.length !== 0 ||
    scheduleFields.line_13_contribution_carryover !== 0
  ) {
    throw new Error(
      "Form 8283 election needs a finalized complete current-gift inventory and an empty prior-carryover ledger",
    );
  }
  const {
    line_11_cash_contributions: _line11,
    line_12_noncash_contributions: _line12,
    line_13_contribution_carryover: _line13,
    charitable_limits_finalized: _limits,
    capital_gain_election_finalized: _election,
    ...source
  } = scheduleFields;
  const parsedScheduleA = scheduleAInputSchema.parse(source);
  const expectedItems = f8283.compute(
    { taxYear: 2025, formType: "f1040" },
    form,
  ).outputs.flatMap((output) =>
    output.nodeType === "schedule_a"
      ? (output.fields.noncash_contribution_items as readonly unknown[] ?? [])
      : []
  );
  const actualItems = (parsedScheduleA.noncash_contribution_items ?? [])
    .filter((item) => item.contribution_id?.startsWith("f8283:"));
  if (JSON.stringify(expectedItems) !== JSON.stringify(actualItems)) {
    throw new Error(
      "Form 8283 current gifts differ from Schedule A's complete source inventory",
    );
  }
  if (parsedScheduleA.agi !== returnFields.line11_agi) {
    throw new Error("Schedule A election AGI differs from Form 1040 line 11");
  }
  const recomputed = scheduleA.compute(
    { taxYear: 2025, formType: "f1040" },
    parsedScheduleA,
  );
  const computed = recomputed.finalizations?.find((output) =>
    output.nodeType === "schedule_a"
  )?.fields;
  const itemizedTotal = recomputed.outputs.find((output) =>
    output.nodeType === "standard_deduction"
  )?.fields.itemized_deductions;
  if (
    !computed || computed.capital_gain_election_finalized !== true ||
    itemizedTotal !== returnFields.line12e_itemized_deductions ||
    computed.line_11_cash_contributions !==
      scheduleFields.line_11_cash_contributions ||
    computed.line_12_noncash_contributions !==
      scheduleFields.line_12_noncash_contributions ||
    computed.line_13_contribution_carryover !==
      scheduleFields.line_13_contribution_carryover ||
    (filedScheduleA && (
      filedScheduleA.line_11_cash_contributions !==
        computed.line_11_cash_contributions ||
      filedScheduleA.line_12_noncash_contributions !==
        computed.line_12_noncash_contributions ||
      filedScheduleA.line_13_contribution_carryover !==
        computed.line_13_contribution_carryover
    ))
  ) {
    throw new Error(
      "Form 8283 election differs from recomputed Schedule A lines 11–13 or Form 1040 itemized total",
    );
  }
}

/** Reconcile one current-year Section B investment-land election. */
export function assertElectedSectionBReconciled(
  context: MefBuildContext | undefined,
  filedScheduleA?: Readonly<Record<string, unknown>>,
): void {
  assertSectionBReconciled(context, filedScheduleA);
}

/** Reconcile a current-year Section B gift or a bounded two-gift group. */
export function assertOrdinarySectionBReconciled(
  context: MefBuildContext | undefined,
  propertyType: SectionBPropertyType,
  filedScheduleA?: Readonly<Record<string, unknown>>,
): void {
  if (propertyType === SectionBPropertyType.OtherRealEstate) {
    const item = form8283InputSchema.parse(context?.pending?.f8283)
      .section_b_items?.[0];
    if (
      item?.ordinary_income_reduction?.reason !==
        "purchased_short_term_capital_asset" ||
      item.investment_land_unimproved_confirmed !== true
    ) {
      throw new Error(
        "Form 8283 ordinary Section B real estate needs purchased short-term unimproved investment land",
      );
    }
  }
  if (
    !new Set<SectionBPropertyType>([
      SectionBPropertyType.ArtUnder20000,
      SectionBPropertyType.ArtAtLeast20000,
      SectionBPropertyType.Vehicle,
      SectionBPropertyType.Equipment,
      SectionBPropertyType.Securities,
      SectionBPropertyType.Collectibles,
      SectionBPropertyType.ClothingHousehold,
      SectionBPropertyType.OtherRealEstate,
      SectionBPropertyType.Other,
    ]).has(propertyType)
  ) {
    throw new Error(
      "Form 8283 ordinary Section B property type is unsupported",
    );
  }
  assertSectionBReconciled(context, filedScheduleA, propertyType);
}

/** Two separate Section B copies for one sourced similar-art group. */
export function isTwoSectionBSimilarArtGroup(form: F8283Input): boolean {
  const items = form.section_b_items ?? [];
  if ((form.section_a_items ?? []).length !== 0 || items.length !== 2) {
    return false;
  }
  const group = items[0]?.similar_item_group?.trim().toLowerCase();
  const documents = items.flatMap((item) => [
    item.signed_form_attachment_file_name,
    item.qualified_appraisal?.attachment_file_name,
    item.qualified_appraisal?.signature_attachment_file_name,
    item.donee_acknowledgment?.signature_attachment_file_name,
    ...(item.ordinary_income_reduction
      ? [
        item.ordinary_income_reduction.purchase_record_attachment_file_name,
        item.ordinary_income_reduction
          .reduction_statement_attachment_file_name,
      ]
      : []),
  ]);
  const reduced = items.filter((item) =>
    item.ordinary_income_reduction !== undefined
  );
  return !!group &&
    reduced.length <= 1 &&
    items.every((item) =>
      item.similar_item_group?.trim().toLowerCase() === group &&
      item.property_type === SectionBPropertyType.ArtAtLeast20000 &&
      item.fmv >= 20_000 && item.fmv <= 500_000 &&
      (item.ordinary_income_reduction
        ? item.ordinary_income_reduction.reason ===
            "purchased_short_term_capital_asset" &&
          item.deduction_claimed >= 20_000 &&
          item.deduction_claimed === item.cost_or_adjusted_basis &&
          item.ordinary_income_reduction.gain_removed ===
            item.fmv - item.deduction_claimed
        : item.deduction_claimed === item.fmv &&
          item.cost_or_adjusted_basis === item.fmv) &&
      item.charitable_limit_category === "noncash_50" &&
      item.is_capital_gain_property === false &&
      item.donor_acquisition_description?.trim().toLowerCase() ===
        "purchase" &&
      item.date_acquired?.startsWith("2025-") &&
      item.date_contributed?.startsWith("2025-") &&
      item.date_acquired < item.date_contributed &&
      item.capital_gain_reduction_election_confirmed !== true &&
      item.reduction_statement_attachment_file_name === undefined &&
      item.qualified_appraisal?.full_appraisal_source_review !== undefined &&
      item.signed_form_source_review !== undefined &&
      item.donee_acknowledgment?.signed_by_donee === true &&
      item.donee_acknowledgment.unrelated_use === false
    ) &&
    items[0]!.donee_acknowledgment!.ein !==
      items[1]!.donee_acknowledgment!.ein &&
    documents.length === 8 + 2 * reduced.length &&
    documents.every(Boolean) &&
    new Set(documents).size === documents.length;
}

/** Two fully reviewed short-term equipment gifts with sourced group identities. */
export function isTwoSectionBReducedEquipmentGifts(form: F8283Input): boolean {
  const items = form.section_b_items ?? [];
  if ((form.section_a_items ?? []).length !== 0 || items.length !== 2) {
    return false;
  }
  const groups = items.map((item) =>
    item.similar_item_group?.trim().toLowerCase()
  );
  const documents = items.flatMap((item) => [
    item.signed_form_attachment_file_name,
    item.qualified_appraisal?.attachment_file_name,
    item.qualified_appraisal?.signature_attachment_file_name,
    item.donee_acknowledgment?.signature_attachment_file_name,
    item.ordinary_income_reduction?.purchase_record_attachment_file_name,
    item.ordinary_income_reduction?.reduction_statement_attachment_file_name,
  ]);
  return groups.every(Boolean) &&
    items.every((item) =>
      item.property_type === SectionBPropertyType.Equipment &&
      item.fmv > 5_000 && item.fmv <= 500_000 &&
      item.deduction_claimed > 5_000 &&
      item.deduction_claimed === item.cost_or_adjusted_basis &&
      item.deduction_claimed < item.fmv &&
      item.ordinary_income_reduction?.reason ===
        "purchased_short_term_capital_asset" &&
      item.ordinary_income_reduction.gain_removed ===
        item.fmv - item.deduction_claimed &&
      item.ordinary_income_reduction.purchase_record_review !== undefined &&
      item.ordinary_income_reduction.reduction_statement_review !== undefined &&
      item.charitable_limit_category === "noncash_50" &&
      item.is_capital_gain_property === false &&
      item.donor_acquisition_description?.trim().toLowerCase() ===
        "purchase" &&
      item.date_acquired?.startsWith("2025-") &&
      item.date_contributed?.startsWith("2025-") &&
      item.date_acquired < item.date_contributed &&
      item.capital_gain_reduction_election_confirmed !== true &&
      item.qualified_appraisal?.full_appraisal_source_review !== undefined &&
      item.signed_form_source_review !== undefined &&
      item.donee_acknowledgment?.signed_by_donee === true &&
      item.donee_acknowledgment.unrelated_use === false
    ) &&
    items[0]!.donee_acknowledgment!.ein !==
      items[1]!.donee_acknowledgment!.ein &&
    documents.length === 12 && documents.every(Boolean) &&
    new Set(documents).size === documents.length;
}

/** Complete reviewed current-year reduction inventory, one signed copy per gift.
 * Source parsing enforces each property's specific tax treatment; this gate
 * reconciles all copies and permits distinct gifts to the same donee.
 */
export function isReviewedSectionBReductionInventory(
  form: F8283Input,
): boolean {
  const items = form.section_b_items ?? [];
  if (
    items.length < 1 ||
    (form.section_a_items ?? []).some((item) =>
      !hasCompleteSectionAColumns(item) || item.is_vehicle === true ||
      item.capital_gain_reduction_election_confirmed === true
    )
  ) {
    return false;
  }
  const supported = new Set([
    SectionBPropertyType.Equipment,
    SectionBPropertyType.ArtUnder20000,
    SectionBPropertyType.ArtAtLeast20000,
    SectionBPropertyType.Collectibles,
    SectionBPropertyType.Securities,
    SectionBPropertyType.OtherRealEstate,
    SectionBPropertyType.Other,
  ]);
  const references = new Set<string>();
  const gifts = new Set<string>();
  return items.every((item) => {
    const special = item.special_fmv_reduction;
    const reduction = item.ordinary_income_reduction ??
      item.unrelated_use_capital_gain_reduction;
    if (
      !item.property_type || !supported.has(item.property_type) ||
      !item.similar_item_group?.trim() || !item.property_description?.trim() ||
      (!reduction && !special && !item.unreduced_purchased_property) ||
      !item.signed_form_source_review ||
      !item.donor_ownership_review ||
      !item.qualified_appraisal?.full_appraisal_source_review ||
      !item.qualified_appraisal.signed_by_appraiser ||
      !item.donee_acknowledgment?.signed_by_donee ||
      item.donee_acknowledgment.received_date !== item.date_contributed ||
      !item.date_contributed?.startsWith("2025-") ||
      item.capital_gain_reduction_election_confirmed === true
    ) return false;
    const facts = item.signed_form_source_review.reviewed_form_fields;
    if (
      !facts || !facts.donor_name || !facts.donor_ssn ||
      !facts.donee_us_address ||
      !facts.appraiser_name || !facts.appraiser_identifying_number ||
      !facts.appraiser_us_address || !facts.appraiser_signed_date ||
      facts.property_description !== item.property_description ||
      facts.property_type !== item.property_type ||
      facts.date_acquired !== item.date_acquired ||
      facts.date_contributed !== item.date_contributed ||
      facts.fmv !== item.fmv ||
      facts.deduction_claimed !== item.deduction_claimed ||
      facts.cost_or_adjusted_basis !== item.cost_or_adjusted_basis ||
      facts.donee_name !== item.donee_acknowledgment.organization_name ||
      facts.donee_ein !== item.donee_acknowledgment.ein ||
      facts.donee_received_date !== item.donee_acknowledgment.received_date
    ) return false;
    const identity = JSON.stringify([
      item.donee_acknowledgment.ein,
      item.property_description.trim().toLowerCase(),
      item.date_acquired,
      item.date_contributed,
    ]);
    if (gifts.has(identity)) return false;
    gifts.add(identity);
    const documents = [
      item.signed_form_attachment_file_name,
      item.qualified_appraisal.attachment_file_name,
      item.qualified_appraisal.signature_attachment_file_name,
      item.donee_acknowledgment.signature_attachment_file_name,
      ...(item.unreduced_purchased_property
        ? [
          item.unreduced_purchased_property
            .purchase_record_attachment_file_name,
        ]
        : special
        ? [
          ...special.source_documents.map((row) => row.attachment_file_name),
          special.reduction_statement_attachment_file_name,
        ]
        : [
          reduction!.purchase_record_attachment_file_name,
          reduction!.reduction_statement_attachment_file_name,
        ]),
      ...(item.unrelated_use_capital_gain_reduction
        ? [
          item.unrelated_use_capital_gain_reduction
            .donee_use_attachment_file_name,
        ]
        : []),
    ];
    return documents.every((name) => {
      if (
        !name ||
        references.has(name) &&
          !((name === item.qualified_appraisal?.attachment_file_name &&
            item.qualified_appraisal.covers_similar_item_group_confirmed ===
              true &&
            item.qualified_appraisal.reviewed_property_inventory) ||
            (item.signed_form_row_identifier && items.some((other) =>
              other !== item &&
              other.signed_form_attachment_file_name ===
                item.signed_form_attachment_file_name
            ) &&
              [
                item.signed_form_attachment_file_name,
                item.qualified_appraisal?.signature_attachment_file_name,
                item.donee_acknowledgment?.signature_attachment_file_name,
              ].includes(name)))
      ) {
        return false;
      }
      references.add(name);
      return true;
    });
  });
}

function assertSectionBReconciled(
  context: MefBuildContext | undefined,
  filedScheduleA: Readonly<Record<string, unknown>> | undefined,
  ordinaryPropertyType?: SectionBPropertyType,
): void {
  const ordinary = ordinaryPropertyType !== undefined;
  const route = ordinaryPropertyType?.replaceAll("_", " ") ?? "election";
  const pending = context?.pending;
  const source8283 = pending?.f8283;
  const sourceScheduleA = pending?.schedule_a;
  const returnFields = pending?.f1040 as Record<string, unknown> | undefined;
  if (
    !source8283 || !sourceScheduleA || !returnFields ||
    typeof sourceScheduleA !== "object"
  ) {
    throw new Error(
      `Form 8283 Section B ${route} needs filed Form 8283, complete Schedule A source, and itemized Form 1040`,
    );
  }
  if (
    returnFields.line12e_itemized_deductions === undefined ||
    returnFields.line12a_standard_deduction !== undefined
  ) {
    throw new Error(
      `Form 8283 Section B ${route} needs an itemized Form 1040`,
    );
  }
  const form = form8283InputSchema.parse(source8283);
  const reviewedInventory = ordinary &&
    isReviewedSectionBReductionInventory(form);
  const pairedArt = ordinary &&
    ordinaryPropertyType === SectionBPropertyType.ArtAtLeast20000 &&
    isTwoSectionBSimilarArtGroup(form);
  const pairedEquipment = ordinary &&
    ordinaryPropertyType === SectionBPropertyType.Equipment &&
    isTwoSectionBReducedEquipmentGifts(form);
  if (
    ((form.section_a_items ?? []).length !== 0 && !reviewedInventory) ||
    (!reviewedInventory && !pairedArt && !pairedEquipment &&
      (form.section_b_items ?? []).length !== 1) ||
    (ordinary
      ? form.section_b_items?.some((item) =>
        (!reviewedInventory && item.property_type !== ordinaryPropertyType) ||
        item.capital_gain_reduction_election_confirmed === true
      )
      : form.section_b_items?.[0]?.capital_gain_reduction_election_confirmed !==
        true)
  ) {
    throw new Error(
      ordinary
        ? `Form 8283 Section B ${route} needs one current-year gift or two separately sourced Section B gifts or a complete reviewed inventory`
        : "Form 8283 Section B election is bounded to one current-year investment-land gift",
    );
  }
  const scheduleFields = sourceScheduleA as Record<string, unknown>;
  if (
    (ordinary && scheduleFields.capital_gain_election_finalized === true) ||
    (!ordinary && scheduleFields.capital_gain_election_finalized !== true) ||
    scheduleFields.charitable_limits_finalized !== true ||
    scheduleFields.current_noncash_gift_inventory_complete_confirmed !== true ||
    scheduleFields.other_prior_charitable_carryovers_absent_confirmed !==
      true ||
    !Array.isArray(scheduleFields.capital_gain_property_carryovers) ||
    scheduleFields.capital_gain_property_carryovers.length !== 0 ||
    scheduleFields.line_13_contribution_carryover !== 0
  ) {
    throw new Error(
      `Form 8283 Section B ${route} needs a finalized complete current-gift inventory and an empty prior-carryover ledger`,
    );
  }
  const {
    line_11_cash_contributions: _line11,
    line_12_noncash_contributions: _line12,
    line_13_contribution_carryover: _line13,
    charitable_limits_finalized: _limits,
    capital_gain_election_finalized: _election,
    ...source
  } = scheduleFields;
  const parsedScheduleA = scheduleAInputSchema.parse(source);
  const expectedItems = f8283.compute(
    { taxYear: 2025, formType: "f1040" },
    form,
  ).outputs.flatMap((output) =>
    output.nodeType === "schedule_a"
      ? (output.fields.noncash_contribution_items as readonly unknown[] ?? [])
      : []
  );
  const actualItems = (parsedScheduleA.noncash_contribution_items ?? [])
    .filter((item) => item.contribution_id?.startsWith("f8283:"));
  if (JSON.stringify(expectedItems) !== JSON.stringify(actualItems)) {
    throw new Error(
      "Form 8283 Section B gift differs from Schedule A's complete source inventory",
    );
  }
  if (parsedScheduleA.agi !== returnFields.line11_agi) {
    throw new Error("Schedule A AGI differs from Form 1040 line 11");
  }
  const recomputed = scheduleA.compute(
    { taxYear: 2025, formType: "f1040" },
    parsedScheduleA,
  );
  const computed = recomputed.finalizations?.find((output) =>
    output.nodeType === "schedule_a"
  )?.fields;
  const itemizedTotal = recomputed.outputs.find((output) =>
    output.nodeType === "standard_deduction"
  )?.fields.itemized_deductions;
  if (
    !computed ||
    (ordinary && computed.capital_gain_election_finalized === true) ||
    (!ordinary && computed.capital_gain_election_finalized !== true) ||
    itemizedTotal !== returnFields.line12e_itemized_deductions ||
    computed.line_11_cash_contributions !==
      scheduleFields.line_11_cash_contributions ||
    computed.line_12_noncash_contributions !==
      scheduleFields.line_12_noncash_contributions ||
    computed.line_13_contribution_carryover !==
      scheduleFields.line_13_contribution_carryover ||
    (filedScheduleA && (
      filedScheduleA.line_11_cash_contributions !==
        computed.line_11_cash_contributions ||
      filedScheduleA.line_12_noncash_contributions !==
        computed.line_12_noncash_contributions ||
      filedScheduleA.line_13_contribution_carryover !==
        computed.line_13_contribution_carryover
    ))
  ) {
    throw new Error(
      `Form 8283 Section B ${route} differs from recomputed Schedule A lines 11–13 or Form 1040 itemized total`,
    );
  }
}

/** A reviewed gift's owner must be one of the actual filers; child/third-party
 * sources cannot acquire a deduction merely by changing the return identity. */
export function assertReviewedForm8283Owners(
  form: F8283Input,
  filer: FilerIdentity | undefined,
): void {
  for (
    const item of [...form.section_a_items ?? [], ...form.section_b_items ?? []]
  ) {
    const facts = "signed_form_source_review" in item
      ? item.signed_form_source_review?.reviewed_form_fields
      : undefined;
    if (
      facts?.return_filer_ssn !== undefined &&
        facts.return_filer_ssn !== filer?.primarySSN ||
      facts?.return_filer_name !== undefined &&
        facts.return_filer_name.trim().toLowerCase() !==
          (filer?.nameLine1 ?? filer?.fullName ?? "").trim().toLowerCase()
    ) {
      throw new Error(
        "Reviewed signed Form8283 return identity differs from actual filer",
      );
    }
    const owner = item.donor_ownership_review;
    if (!owner) continue;
    const person = owner.donor_ssn === filer?.primarySSN
      ? filer
      : owner.donor_ssn === filer?.spouse?.ssn
      ? filer.spouse
      : undefined;
    const normalizedName = (value: string) =>
      value.trim().toLowerCase().replaceAll(".", "").replace(/\s+/g, " ");
    const names = person
      ? [
        `${person.firstName} ${person.lastName}`,
        [person.firstName, person.middleInitial, person.lastName, person.suffix]
          .filter(Boolean).join(" "),
      ]
      : [];
    if (
      !names.some((name) =>
        normalizedName(name) === normalizedName(owner.donor_name)
      )
    ) {
      throw new Error(
        "Form8283 reviewed donated property owner differs from actual return filers",
      );
    }
  }
}
