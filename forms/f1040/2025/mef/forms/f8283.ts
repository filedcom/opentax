import { assertReviewedForm8283Return } from "./f8283_return.ts";
import { element, elements } from "../../../mef/xml.ts";
import {
  type F8283Input,
  FMVMethod,
  groupSectionBSourceForms,
  inputSchema,
  normalizeSimilarItemGroup,
  type SectionAItem,
  type SectionBItem,
  SectionBPropertyType,
  similarItemGroupTotals,
} from "../../../nodes/inputs/f8283/index.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";
import {
  assertElectedSectionAReconciled,
  assertElectedSectionBReconciled,
  assertExceptionVehicleUnreducedSource,
  assertOrdinarySectionAReconciled,
  assertOrdinarySectionBReconciled,
  assertReviewedForm8283Owners,
  hasSectionAShortTermReduction,
  isReviewedSectionBReductionInventory,
  isSingleSectionAExceptionVehicleUnreduced,
  isSingleSectionAVehicleSale,
  isTwoSectionBReducedEquipmentGifts,
  isTwoSectionBSimilarArtGroup,
} from "./f8283_election.ts";
import {
  carriedSectionAItem,
  reconcileForm8283Carryover,
} from "./f8283_carryover.ts";

const FMV_METHOD_LABELS: Readonly<Record<FMVMethod, string>> = {
  [FMVMethod.Appraisal]: "Appraisal",
  [FMVMethod.ThriftShopValue]: "Thrift shop value",
  [FMVMethod.CatalogValue]: "Catalog value",
  [FMVMethod.ComparableSales]: "Comparable sales",
  [FMVMethod.Formula]: "Formula",
  [FMVMethod.Other]: "Other",
};

export function sectionAFmvMethodDescription(
  item: SectionAItem,
): string | undefined {
  return item.fmv_method === FMVMethod.Other
    ? item.fmv_method_description
    : item.fmv_method_description ??
      (item.fmv_method && FMV_METHOD_LABELS[item.fmv_method]);
}

function propertyId(index: number): string {
  let value = index + 1;
  let result = "";
  while (value > 0) {
    value--;
    result = String.fromCharCode(65 + value % 26) + result;
    value = Math.floor(value / 26);
  }
  if (result.length > 3) {
    throw new Error("Form 8283 exceeds the three-letter property ID limit");
  }
  return result;
}

function donorLineDetail(item: SectionAItem): string {
  if (
    item.date_acquired !== undefined &&
    !/^\d{4}-\d{2}-\d{2}$/.test(item.date_acquired)
  ) {
    throw new Error("Form 8283 date acquired must be YYYY-MM-DD");
  }
  return elements("DonorLineDetail", [
    element("ContributionDt", item.date_contributed),
    element("DonorAcquiredDt", item.date_acquired?.slice(0, 7)),
    element("DonorAcquisitionDesc", item.donor_acquisition_description),
    element("DonorCostOrAdjustedBasisAmt", item.cost_or_adjusted_basis),
  ]);
}

export function needsVehicleStatement(item: SectionAItem): boolean {
  return item.is_vehicle === true &&
    (item.deduction_claimed ?? item.fmv ?? 0) > 500;
}

export function needsFmvReductionStatement(item: SectionAItem): boolean {
  return item.fmv !== undefined && item.deduction_claimed !== undefined &&
    Math.round((item.fmv - item.deduction_claimed) * 100) > 0;
}

export function assertShortTermReductionSource(item: SectionAItem): void {
  if (
    item.short_term_ordinary_income_reduction_confirmed !== true ||
    item.is_vehicle === true
  ) return;
  const address = item.donee_organization_us_address;
  if (
    !item.donee_organization_name?.trim() || !address?.line1.trim() ||
    !address.city.trim() || !address.state.trim() || !address.zip.trim() ||
    !item.property_description?.trim() || !item.date_acquired ||
    !item.date_contributed ||
    !item.donor_acquisition_description?.trim() ||
    item.cost_or_adjusted_basis === undefined ||
    (!item.fmv_method && !item.fmv_method_description?.trim())
  ) {
    throw new Error(
      "Form 8283 short-term reduction needs complete donee, property, dates, basis, and valuation-method facts",
    );
  }
}

export function assertInventoryReductionSource(item: SectionAItem): void {
  if (item.inventory_ordinary_income_reduction === undefined) return;
  const address = item.donee_organization_us_address;
  if (
    !item.donee_organization_name?.trim() || !address?.line1.trim() ||
    !address.city.trim() || !address.state.trim() || !address.zip.trim() ||
    !item.property_description?.trim() || !item.date_acquired ||
    !item.date_contributed || !item.donor_acquisition_description?.trim() ||
    item.cost_or_adjusted_basis === undefined ||
    (!item.fmv_method && !item.fmv_method_description?.trim()) ||
    !item.inventory_ordinary_income_reduction.purchase_invoice_reference
      .trim() ||
    !item.inventory_ordinary_income_reduction.inventory_cost_record_reference
      .trim()
  ) {
    throw new Error(
      "Form 8283 inventory reduction needs complete donee, property, dates, basis, valuation method, invoice, and cost-ledger source",
    );
  }
}

export function assertCreatorReductionSource(item: SectionAItem): void {
  if (item.creator_ordinary_income_reduction === undefined) return;
  const address = item.donee_organization_us_address;
  if (
    !item.donee_organization_name?.trim() || !address?.line1.trim() ||
    !address.city.trim() || !address.state.trim() || !address.zip.trim() ||
    !item.property_description?.trim() || !item.date_acquired ||
    !item.date_contributed || !item.donor_acquisition_description?.trim() ||
    item.cost_or_adjusted_basis === undefined ||
    (!item.fmv_method && !item.fmv_method_description?.trim()) ||
    !item.creator_ordinary_income_reduction.creation_record_reference.trim() ||
    !item.creator_ordinary_income_reduction.capitalized_cost_record_reference
      .trim()
  ) {
    throw new Error(
      "Form 8283 creator reduction needs complete donee, property, completion date, basis, valuation method, and capitalized-cost records",
    );
  }
}

export function assertManuscriptReductionSource(item: SectionAItem): void {
  const review = item.manuscript_ordinary_income_reduction;
  if (!review) return;
  const address = item.donee_organization_us_address;
  if (
    !item.donee_organization_name?.trim() || !address?.line1.trim() ||
    !address.city.trim() || !address.state.trim() || !address.zip.trim() ||
    !item.property_description?.trim() || !item.date_acquired ||
    !item.date_contributed ||
    item.donor_acquisition_description?.trim().toLowerCase() !== "created" ||
    item.cost_or_adjusted_basis === undefined ||
    (!item.fmv_method && !item.fmv_method_description?.trim()) ||
    !review.manuscript_preparation_record_reference.trim() ||
    !review.capitalized_cost_record_reference.trim()
  ) {
    throw new Error(
      "Form 8283 manuscript reduction needs complete donee, property, completion date, basis, valuation method, and preparation/cost records",
    );
  }
}

export function assertUnrelatedUseReductionSource(item: SectionAItem): void {
  const review = item.unrelated_use_capital_gain_reduction;
  if (!review) return;
  const address = item.donee_organization_us_address;
  if (
    !item.donee_organization_name?.trim() || !address?.line1.trim() ||
    !address.city.trim() || !address.state.trim() || !address.zip.trim() ||
    !item.property_description?.trim() || !item.date_acquired ||
    !item.date_contributed ||
    item.donor_acquisition_description?.trim().toLowerCase() !== "purchase" ||
    item.cost_or_adjusted_basis === undefined ||
    (!item.fmv_method && !item.fmv_method_description?.trim()) ||
    !review.purchase_record_reference.trim() ||
    !review.donee_unrelated_use_statement_reference.trim()
  ) {
    throw new Error(
      "Form 8283 unrelated-use reduction needs complete donee, tangible property, dates, basis, valuation, purchase, and donee-use records",
    );
  }
}

export function assertPrivateFoundationReductionSource(
  item: SectionAItem,
): void {
  const review = item.private_foundation_capital_gain_reduction;
  if (!review) return;
  const address = item.donee_organization_us_address;
  if (
    !item.donee_organization_name?.trim() || !address?.line1.trim() ||
    !address.city.trim() || !address.state.trim() || !address.zip.trim() ||
    !item.property_description?.trim() || !item.date_acquired ||
    !item.date_contributed ||
    item.donor_acquisition_description?.trim().toLowerCase() !== "purchase" ||
    item.cost_or_adjusted_basis === undefined ||
    (!item.fmv_method && !item.fmv_method_description?.trim()) ||
    !review.purchase_record_reference.trim() ||
    !review.foundation_status_record_reference.trim() ||
    review.foundation_name !== item.donee_organization_name ||
    review.foundation_us_address.line1 !== address.line1 ||
    (review.foundation_us_address.line2 ?? "") !== (address.line2 ?? "") ||
    review.foundation_us_address.city !== address.city ||
    review.foundation_us_address.state !== address.state ||
    review.foundation_us_address.zip !== address.zip
  ) {
    throw new Error(
      "Form 8283 private-foundation reduction needs matching donee status, purchase, property, dates, basis, and valuation records",
    );
  }
}

export function assertTaxidermyReductionSource(item: SectionAItem): void {
  const review = item.taxidermy_capital_gain_reduction;
  if (!review) return;
  const address = item.donee_organization_us_address;
  if (
    !item.donee_organization_name?.trim() || !address?.line1.trim() ||
    !address.city.trim() || !address.state.trim() || !address.zip.trim() ||
    !item.property_description?.trim() || !item.date_acquired ||
    !item.date_contributed ||
    item.donor_acquisition_description?.trim().toLowerCase() !== "created" ||
    item.cost_or_adjusted_basis === undefined ||
    (!item.fmv_method && !item.fmv_method_description?.trim()) ||
    !review.preparation_cost_record_reference.trim() ||
    !review.taxidermy_property_description_record_reference.trim() ||
    Math.round(review.eligible_preparation_stuffing_mounting_costs * 100) !==
      Math.round(item.cost_or_adjusted_basis * 100)
  ) {
    throw new Error(
      "Form 8283 taxidermy reduction needs donee, mounted animal, completion, valuation, and preparation-only cost records",
    );
  }
}

export function assertIntellectualPropertyReductionSource(
  item: SectionAItem,
): void {
  const review = item.intellectual_property_capital_gain_reduction;
  if (!review) return;
  const address = item.donee_organization_us_address;
  if (
    !item.donee_organization_name?.trim() || !address?.line1.trim() ||
    !address.city.trim() || !address.state.trim() || !address.zip.trim() ||
    !item.property_description?.trim() || !item.date_acquired ||
    !item.date_contributed ||
    item.donor_acquisition_description?.trim().toLowerCase() !== "purchase" ||
    item.cost_or_adjusted_basis === undefined ||
    (!item.fmv_method && !item.fmv_method_description?.trim()) ||
    !review.patent_number.trim() ||
    !review.patent_registration_record_reference.trim() ||
    !review.purchase_record_reference.trim() ||
    !review.unamortized_basis_schedule_reference.trim() ||
    !review.donee_2025_net_income_statement_reference.trim() ||
    Math.round(review.unamortized_adjusted_basis * 100) !==
      Math.round(item.cost_or_adjusted_basis * 100)
  ) {
    throw new Error(
      "Form 8283 patent reduction needs matching patent ownership, purchase, unamortized basis, donee-income, and valuation records",
    );
  }
}

export function assertVehicleSaleReductionSource(item: SectionAItem): void {
  if (!item.vehicle_sale_acknowledgment || !needsFmvReductionStatement(item)) {
    return;
  }
  const acknowledgment = item.vehicle_sale_acknowledgment;
  const address = item.donee_organization_us_address;
  const certifiedAddress = acknowledgment.donee_us_address;
  if (
    !item.donee_organization_name?.trim() || !address?.line1.trim() ||
    !address.city.trim() || !address.state.trim() || !address.zip.trim() ||
    !item.property_description?.trim() || !item.date_contributed ||
    !item.date_acquired || !item.donor_acquisition_description?.trim() ||
    item.cost_or_adjusted_basis === undefined ||
    (!item.fmv_method && !item.fmv_method_description?.trim())
  ) {
    throw new Error(
      "Form 8283 vehicle-sale reduction needs complete donee, property, dates, basis, and valuation-method facts",
    );
  }
  if (
    item.donee_organization_name.trim() !== acknowledgment.donee_name.trim() ||
    address.line1.trim() !== certifiedAddress.line1.trim() ||
    (address.line2?.trim() ?? "") !== (certifiedAddress.line2?.trim() ?? "") ||
    address.city.trim() !== certifiedAddress.city.trim() ||
    address.state.trim() !== certifiedAddress.state.trim() ||
    address.zip.trim() !== certifiedAddress.zip.trim()
  ) {
    throw new Error(
      "Form 8283 vehicle-sale reduction donee differs from the certified acknowledgment",
    );
  }
}

function usd(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function fmvReductionExplanation(
  item: SectionAItem,
  index: number,
): string {
  if (!needsFmvReductionStatement(item)) {
    throw new Error("Form 8283 FMV-reduction statement needs a reduced claim");
  }
  const fmv = item.fmv!;
  const claimed = item.deduction_claimed!;
  const sale = item.vehicle_sale_acknowledgment;
  const certifiedSaleCap = sale &&
    Math.round(Math.min(fmv, sale.gross_proceeds) * 100) ===
      Math.round(claimed * 100);
  const reason = certifiedSaleCap && sale
    ? `Donee-certified unrelated-party sale on ${sale.sale_date} produced gross proceeds ${
      usd(sale.gross_proceeds)
    }; the vehicle deduction is capped at the lesser of FMV and those proceeds.`
    : item.short_term_ordinary_income_reduction_confirmed === true &&
        item.date_acquired && item.date_contributed &&
        item.cost_or_adjusted_basis !== undefined
    ? `Purchased on ${item.date_acquired} and contributed on ${item.date_contributed}, after no more than one year; short-term appreciation of ${
      usd(fmv - item.cost_or_adjusted_basis)
    } would be ordinary income or short-term gain under section 170(e)(1)(A), so the contribution is reduced to adjusted basis ${
      usd(item.cost_or_adjusted_basis)
    }.`
    : item.inventory_ordinary_income_reduction !== undefined &&
        item.cost_or_adjusted_basis !== undefined
    ? `Purchased inventory held for sale to customers: hypothetical sale gain of ${
      usd(fmv - item.cost_or_adjusted_basis)
    } would be ordinary income under section 170(e)(1)(A). Invoice ${item.inventory_ordinary_income_reduction.purchase_invoice_reference} and cost record ${item.inventory_ordinary_income_reduction.inventory_cost_record_reference} support adjusted basis ${
      usd(item.cost_or_adjusted_basis)
    }.`
    : item.creator_ordinary_income_reduction !== undefined &&
        item.cost_or_adjusted_basis !== undefined
    ? `Donor-created artwork substantially completed on ${item.date_acquired}: hypothetical sale gain of ${
      usd(fmv - item.cost_or_adjusted_basis)
    } would be ordinary income under section 170(e)(1)(A). Creation record ${item.creator_ordinary_income_reduction.creation_record_reference} and capitalized undeducted cost record ${item.creator_ordinary_income_reduction.capitalized_cost_record_reference} support adjusted basis ${
      usd(item.cost_or_adjusted_basis)
    }.`
    : item.manuscript_ordinary_income_reduction !== undefined &&
        item.cost_or_adjusted_basis !== undefined
    ? `Donor-prepared manuscript substantially completed on ${item.date_acquired}: hypothetical sale gain of ${
      usd(fmv - item.cost_or_adjusted_basis)
    } would be ordinary income under section 170(e)(1)(A). Preparation record ${item.manuscript_ordinary_income_reduction.manuscript_preparation_record_reference} and capitalized undeducted cost record ${item.manuscript_ordinary_income_reduction.capitalized_cost_record_reference} support adjusted basis ${
      usd(item.cost_or_adjusted_basis)
    }.`
    : item.unrelated_use_capital_gain_reduction !== undefined &&
        item.cost_or_adjusted_basis !== undefined
    ? `Purchased long-term tangible personal property is put to a use unrelated to the donee's exempt purpose. Purchase record ${item.unrelated_use_capital_gain_reduction.purchase_record_reference} and donee-use statement ${item.unrelated_use_capital_gain_reduction.donee_unrelated_use_statement_reference} support the section 170(e)(1)(B)(i) reduction of long-term appreciation ${
      usd(fmv - item.cost_or_adjusted_basis)
    }, leaving adjusted basis ${usd(item.cost_or_adjusted_basis)}.`
    : item.contribution_year_disposition_reduction !== undefined &&
        item.cost_or_adjusted_basis !== undefined
    ? `Original donee ${item.contribution_year_disposition_reduction.donee_name} (EIN ${item.contribution_year_disposition_reduction.donee_ein}) sold the property on ${item.contribution_year_disposition_reduction.disposition_date}, during the contribution year, for ${
      usd(item.contribution_year_disposition_reduction.gross_proceeds)
    }. Disposition record ${item.contribution_year_disposition_reduction.donee_disposition_record_reference} and certification inventory ${item.contribution_year_disposition_reduction.exempt_use_certification_inventory_reference} retain no exempt-use certification. Section170(e)(1)(B)(i)(II) removes long-term appreciation ${
      usd(fmv - item.cost_or_adjusted_basis)
    }, leaving basis ${
      usd(item.cost_or_adjusted_basis)
    }; actual sale proceeds do not replace the nonvehicle basis reduction.`
    : item.private_foundation_capital_gain_reduction !== undefined &&
        item.cost_or_adjusted_basis !== undefined
    ? `Purchased long-term capital property contributed outright to private nonoperating foundation ${item.private_foundation_capital_gain_reduction.foundation_name} (EIN ${item.private_foundation_capital_gain_reduction.foundation_ein}). Foundation status record ${item.private_foundation_capital_gain_reduction.foundation_status_record_reference} and purchase record ${item.private_foundation_capital_gain_reduction.purchase_record_reference} support the section 170(e)(1)(B)(ii) reduction of long-term appreciation ${
      usd(fmv - item.cost_or_adjusted_basis)
    }, leaving adjusted basis ${usd(item.cost_or_adjusted_basis)}.`
    : item.taxidermy_capital_gain_reduction !== undefined &&
        item.cost_or_adjusted_basis !== undefined
    ? `Donor-prepared taxidermy containing an animal body part is limited under section 170(e)(1)(B)(iv) to eligible preparation, stuffing, and mounting costs. Preparation record ${item.taxidermy_capital_gain_reduction.preparation_cost_record_reference} and property description record ${item.taxidermy_capital_gain_reduction.taxidermy_property_description_record_reference} support eligible costs ${
      usd(item.cost_or_adjusted_basis)
    }; hunting, travel, equipment, and labor value are excluded. FMV appreciation ${
      usd(fmv - item.cost_or_adjusted_basis)
    } is removed.`
    : item.intellectual_property_capital_gain_reduction !== undefined &&
        item.cost_or_adjusted_basis !== undefined
    ? `Purchased patent ${item.intellectual_property_capital_gain_reduction.patent_number} is limited under section 170(e)(1)(B)(iii) to unamortized adjusted basis. Registration ${item.intellectual_property_capital_gain_reduction.patent_registration_record_reference}, purchase ${item.intellectual_property_capital_gain_reduction.purchase_record_reference}, and basis schedule ${item.intellectual_property_capital_gain_reduction.unamortized_basis_schedule_reference} support basis ${
      usd(item.cost_or_adjusted_basis)
    }. Donee statement ${item.intellectual_property_capital_gain_reduction.donee_2025_net_income_statement_reference} reports zero 2025 net income, so no income-based additional deduction is included. FMV appreciation ${
      usd(fmv - item.cost_or_adjusted_basis)
    } is removed.`
    : item.capital_gain_reduction_election_confirmed === true &&
        item.date_acquired && item.date_contributed &&
        item.cost_or_adjusted_basis !== undefined
    ? `Purchased on ${item.date_acquired} and contributed on ${item.date_contributed}, after more than one year; the election to use the 50% AGI limit reduces long-term capital appreciation of ${
      usd(fmv - item.cost_or_adjusted_basis)
    } from FMV, leaving adjusted basis ${usd(item.cost_or_adjusted_basis)}.`
    : "";
  if (!reason) {
    throw new Error(
      "Form 8283 reduced claim needs certified sale proceeds or a sourced ordinary-income or capital-gain reduction",
    );
  }
  const explanation = `Section A item ${propertyId(index)}: unreduced FMV ${
    usd(fmv)
  } minus ${usd(fmv - claimed)} (${reason}) equals claimed contribution ${
    usd(claimed)
  }.`;
  if (explanation.length > 1_000) {
    throw new Error("Form 8283 FMV-reduction explanation exceeds MeF limit");
  }
  return explanation;
}

export function buildFmvReductionStatement(
  item: SectionAItem,
  index: number,
): string {
  assertShortTermReductionSource(item);
  assertInventoryReductionSource(item);
  assertCreatorReductionSource(item);
  assertManuscriptReductionSource(item);
  assertUnrelatedUseReductionSource(item);
  assertPrivateFoundationReductionSource(item);
  assertTaxidermyReductionSource(item);
  assertIntellectualPropertyReductionSource(item);
  assertVehicleSaleReductionSource(item);
  return elements("FairMarketValueStatement", [
    element("ShortExplanationTxt", fmvReductionExplanation(item, index)),
  ]);
}

export function needsSectionBVehicleStatement(item: SectionBItem): boolean {
  return item.property_type === SectionBPropertyType.Vehicle;
}

function buildSectionAItem(
  item: SectionAItem,
  index: number,
  statementId?: string,
  fmvReductionStatementId?: string,
): string {
  if (item.is_vehicle && !item.vehicle_vin) {
    throw new Error(
      "Form 8283 vehicle needs a VIN",
    );
  }
  if (!item.property_description || item.fmv === undefined) {
    throw new Error(
      `Form 8283 Section A item ${
        index + 1
      } needs a description and fair market value`,
    );
  }
  if (item.fmv_method === FMVMethod.Other && !item.fmv_method_description) {
    throw new Error(
      `Form 8283 Section A item ${
        index + 1
      } needs the fair-market-value method description`,
    );
  }
  const method = sectionAFmvMethodDescription(item);
  const address = item.donee_organization_us_address;
  const acknowledgment = item.vehicle_sale_acknowledgment ??
    item.vehicle_needy_transfer_acknowledgment ??
    item.vehicle_significant_use_acknowledgment ??
    item.vehicle_material_improvement_acknowledgment;
  const vehicleDescription = acknowledgment
    ? `${acknowledgment.vehicle_year} ${acknowledgment.vehicle_make} ${acknowledgment.vehicle_model}, ${acknowledgment.vehicle_condition}, ${acknowledgment.odometer_miles} miles`
    : item.property_description;
  return elements("InformationOnDonatedProperty", [
    element("PropertyId", propertyId(index)),
    item.donee_organization_name
      ? elements("DoneeOrganizationName", [
        element("BusinessNameLine1Txt", item.donee_organization_name),
      ])
      : "",
    address
      ? elements("DoneeOrganizationUSAddress", [
        element("AddressLine1Txt", address.line1),
        element("AddressLine2Txt", address.line2),
        element("CityNm", address.city),
        element("StateAbbreviationCd", address.state),
        element("ZIPCd", address.zip),
      ])
      : "",
    item.is_vehicle
      ? element(
        "DonatedPropertyVehicleInd",
        "X",
        statementId
          ? {
            referenceDocumentId: statementId,
            referenceDocumentName:
              "ContributionsOfMotorVehiclesBoatsAndAirplanesStatement ContemporaneousWrittenAcknowledgmentStatement",
          }
          : undefined,
      )
      : "",
    item.is_vehicle ? element("VIN", item.vehicle_vin) : "",
    element("DonatedPropertyDesc", vehicleDescription),
    donorLineDetail(item),
    // Form 8283 Section A column (h) takes the reduced contribution amount
    // when it is lower than FMV. The original FMV remains a separate source
    // fact for vehicle and other substantiation/limit checks.
    element(
      "FairMarketValueAmt",
      item.deduction_claimed ?? item.fmv,
      fmvReductionStatementId
        ? {
          referenceDocumentId: fmvReductionStatementId,
          referenceDocumentName:
            "FairMarketValueStatement QualifiedConservationContributionStmt",
        }
        : undefined,
    ),
    element("FairMarketValueMethodDesc", method),
  ]);
}

function buildCarryoverDocuments(
  form: F8283Input,
  context: MefBuildContext,
): readonly string[] {
  const reconciled = reconcileForm8283Carryover(
    form,
    context,
  );
  const items = reconciled.map(({ evidence }) => carriedSectionAItem(evidence));
  const reducedCount = items.filter(needsFmvReductionStatement).length;
  const statementIds = context.documentIdsByTag?.FairMarketValueStatement ?? [];
  if (
    context.documentIdsByPendingKey &&
    (statementIds.length !== reducedCount ||
      statementIds.some((id) => !id.trim()) ||
      new Set(statementIds).size !== statementIds.length)
  ) {
    throw new Error(
      "Form 8283 carryover FMV reductions need distinct linked native statements",
    );
  }
  let statementIndex = 0;
  return reconciled.map(({ priorFormAttachmentId }, index) => {
    const item = items[index];
    const statementId = needsFmvReductionStatement(item)
      ? statementIds[statementIndex++]
      : undefined;
    return elements(
      "IRS8283",
      [buildSectionAItem(item, 0, undefined, statementId)],
      priorFormAttachmentId
        ? {
          referenceDocumentId: priorFormAttachmentId,
          referenceDocumentName: BINARY_REFERENCE_NAME,
        }
        : undefined,
    );
  });
}

export function buildVehicleStatement(
  item: Pick<
    SectionAItem,
    | "date_contributed"
    | "vehicle_vin"
    | "vehicle_sale_acknowledgment"
    | "vehicle_needy_transfer_acknowledgment"
    | "vehicle_significant_use_acknowledgment"
    | "vehicle_material_improvement_acknowledgment"
  >,
  context: MefBuildContext,
): string {
  const saleAck = item.vehicle_sale_acknowledgment;
  const needyAck = item.vehicle_needy_transfer_acknowledgment;
  const useAck = item.vehicle_significant_use_acknowledgment;
  const improvementAck = item.vehicle_material_improvement_acknowledgment;
  const ack = saleAck ?? needyAck ?? useAck ?? improvementAck;
  if (!ack || !item.vehicle_vin || !item.date_contributed) {
    throw new Error(
      "Form 8283 vehicle needs a contemporaneous donee acknowledgment",
    );
  }
  return elements("ContriVehicleBoatAirplaneStmt", [
    elements("DoneeName", [
      element("BusinessNameLine1Txt", ack.donee_name),
    ]),
    usAddress(ack.donee_us_address, "DoneeUSAddress"),
    element("DoneeEIN", ack.donee_ein),
    element("DonorSSN", context.filer?.primarySSN),
    element("ContributionDt", item.date_contributed),
    element("OdometerMileageQty", ack.odometer_miles),
    elements("VehicleDescriptionGrp", [
      element("VehicleModelYr", ack.vehicle_year),
      element("VehicleMakeNameTxt", ack.vehicle_make),
      element("VehicleModelNameTxt", ack.vehicle_model),
    ]),
    element("VIN", item.vehicle_vin),
    saleAck ? element("CertifiesVehSoldToUnrltPrtyInd", "X") : "",
    saleAck ? element("SaleDt", saleAck.sale_date) : "",
    saleAck
      ? element("GrossProceedsFromSaleOfVehAmt", saleAck.gross_proceeds)
      : "",
    useAck || improvementAck
      ? element("CertifiesVehicleNotTrnsfrInd", "X")
      : "",
    needyAck ? element("CertifiesVehTrnsfrToNeedyInd", "X") : "",
    useAck
      ? element(
        "CertifiesDetailedImprvDesc",
        `${useAck.intended_use_description}; intended duration: ${useAck.intended_use_duration}`,
      )
      : improvementAck
      ? element(
        "CertifiesDetailedImprvDesc",
        improvementAck.intended_improvement_description,
      )
      : "",
    element("GoodsAndServicesInd", "false"),
  ]);
}

const SECTION_B_PROPERTY_TAG: Readonly<Record<SectionBPropertyType, string>> = {
  [SectionBPropertyType.ArtUnder20000]: "ArtWorthLssThan20000DollarsInd",
  [SectionBPropertyType.ArtAtLeast20000]: "ArtWorthAtLeast20000DollarsInd",
  [SectionBPropertyType.OtherRealEstate]: "OtherRealEstateInd",
  [SectionBPropertyType.Equipment]: "EquipmentInd",
  [SectionBPropertyType.Securities]: "SecuritiesInd",
  [SectionBPropertyType.Collectibles]: "CollectiblesInd",
  [SectionBPropertyType.IntellectualProperty]: "IntellectualPropertyInd",
  [SectionBPropertyType.Vehicle]: "VehicleInd",
  [SectionBPropertyType.ClothingHousehold]: "ClothingHouseholdItemsInd",
  [SectionBPropertyType.DigitalAssets]: "DigitalAssetsInd",
  [SectionBPropertyType.Other]: "OtherInd",
};

function usAddress(address: {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  zip: string;
}, tag: string): string {
  return elements(tag, [
    element("AddressLine1Txt", address.line1),
    element("AddressLine2Txt", address.line2),
    element("CityNm", address.city),
    element("StateAbbreviationCd", address.state),
    element("ZIPCd", address.zip),
  ]);
}

const BINARY_REFERENCE_NAME =
  "BinaryAttachment DeductionsTakenUnderSection170Stmt DoneesSignatureUnavailableStmt";

function requiredVehicleAttachment(
  item: {
    vehicle_acknowledgment_attachment_file_name?: string;
    vehicle_sale_acknowledgment?: unknown;
    vehicle_sale_pdf_review?: { pdf_sha256: string };
    vehicle_needy_transfer_acknowledgment?: unknown;
    vehicle_needy_pdf_review?: { pdf_sha256: string };
    vehicle_significant_use_acknowledgment?: unknown;
    vehicle_significant_use_pdf_review?: { pdf_sha256: string };
    vehicle_material_improvement_acknowledgment?: unknown;
    vehicle_material_improvement_pdf_review?: { pdf_sha256: string };
  },
  context: MefBuildContext,
  section: "A" | "B",
): { fileName: string; id?: string } {
  const fileName = item.vehicle_acknowledgment_attachment_file_name;
  if (!fileName) {
    throw new Error(
      "Form 8283 vehicle needs its donee-issued Form 1098-C or written acknowledgment PDF",
    );
  }
  const description = context.attachmentDescriptionsByFileName?.[fileName];
  if (
    description === undefined ||
    !/^(?:Form1098C|DoneeOrganizationContemporaneousWrittenAcknowledgment)/
      .test(description)
  ) {
    throw new Error(
      "Form 8283 vehicle attachment needs an IRS-approved description and matching PDF",
    );
  }
  const id = context.documentIdsByAttachmentFileName?.[fileName];
  if (context.documentIdsByPendingKey && !id) {
    throw new Error(
      "Form 8283 vehicle acknowledgment PDF has no linked MeF document",
    );
  }
  if (
    section === "A" && item.vehicle_sale_acknowledgment &&
    context.documentIdsByPendingKey
  ) {
    if (!item.vehicle_sale_pdf_review) {
      throw new Error(
        "Form 8283 vehicle sale needs an exact-byte donee acknowledgment review",
      );
    }
    if (
      context.attachmentSha256ByFileName?.[fileName] !==
        item.vehicle_sale_pdf_review.pdf_sha256
    ) {
      throw new Error(
        "Form 8283 vehicle sale acknowledgment bytes differ from the reviewed PDF",
      );
    }
  }
  if (
    section === "A" && item.vehicle_needy_transfer_acknowledgment &&
    context.documentIdsByPendingKey
  ) {
    if (!item.vehicle_needy_pdf_review) {
      throw new Error(
        "Form 8283 needy-transfer vehicle needs an exact-byte donee acknowledgment review",
      );
    }
    if (
      context.attachmentSha256ByFileName?.[fileName] !==
        item.vehicle_needy_pdf_review.pdf_sha256
    ) {
      throw new Error(
        "Form 8283 needy-transfer acknowledgment bytes differ from the reviewed PDF",
      );
    }
  }
  if (
    section === "A" && item.vehicle_significant_use_acknowledgment &&
    context.documentIdsByPendingKey
  ) {
    if (!item.vehicle_significant_use_pdf_review) {
      throw new Error(
        "Form 8283 significant-use vehicle needs an exact-byte donee acknowledgment review",
      );
    }
    if (
      context.attachmentSha256ByFileName?.[fileName] !==
        item.vehicle_significant_use_pdf_review.pdf_sha256
    ) {
      throw new Error(
        "Form 8283 significant-use acknowledgment bytes differ from the reviewed PDF",
      );
    }
  }
  if (
    section === "A" && item.vehicle_material_improvement_acknowledgment &&
    context.documentIdsByPendingKey
  ) {
    if (!item.vehicle_material_improvement_pdf_review) {
      throw new Error(
        "Form 8283 material-improvement vehicle needs an exact-byte donee acknowledgment review",
      );
    }
    if (
      context.attachmentSha256ByFileName?.[fileName] !==
        item.vehicle_material_improvement_pdf_review.pdf_sha256
    ) {
      throw new Error(
        "Form 8283 material-improvement acknowledgment bytes differ from the reviewed PDF",
      );
    }
  }
  return { fileName, id };
}

function requiredSignatureAttachment(
  fileName: string | undefined,
  description: string,
  context: MefBuildContext,
): string | undefined {
  if (!fileName) {
    throw new Error(`Form 8283 needs ${description} PDF`);
  }
  if (
    !matchesAttachmentDescription(
      context.attachmentDescriptionsByFileName?.[fileName],
      description,
    )
  ) {
    throw new Error(
      `Form 8283 needs a matching PDF described exactly as ${description}`,
    );
  }
  const id = context.documentIdsByAttachmentFileName?.[fileName];
  if (context.documentIdsByPendingKey && !id) {
    throw new Error(`Form 8283 ${description} PDF has no linked MeF document`);
  }
  return id;
}

function matchesAttachmentDescription(
  actual: string | undefined,
  required: string,
): boolean {
  return actual === required ||
    (actual?.startsWith(`${required}: `) === true &&
      actual.length > required.length + 2);
}

function requiredQualifiedAppraisalAttachment(
  fileName: string | undefined,
  context: MefBuildContext,
  review?: NonNullable<
    SectionBItem["qualified_appraisal"]
  >["full_appraisal_source_review"],
): string | undefined {
  if (!fileName) {
    throw new Error(
      "Form 8283 deduction above $500,000 needs the full qualified-appraisal PDF",
    );
  }
  const description = context.attachmentDescriptionsByFileName?.[fileName];
  if (!description?.startsWith("Qualified Appraisal")) {
    throw new Error(
      "Form 8283 high-value appraisal PDF needs a description beginning Qualified Appraisal",
    );
  }
  if (
    review && context.documentIdsByPendingKey &&
    context.attachmentSha256ByFileName?.[fileName] !== review.pdf_sha256
  ) {
    throw new Error(
      "Form 8283 full qualified-appraisal PDF bytes do not match the reviewed source SHA-256",
    );
  }
  const id = context.documentIdsByAttachmentFileName?.[fileName];
  if (context.documentIdsByPendingKey && !id) {
    throw new Error(
      "Form 8283 high-value appraisal PDF has no linked MeF document",
    );
  }
  return id;
}

function requiredReductionAttachment(
  item: SectionBItem,
  context: MefBuildContext,
): string | undefined {
  const fileName = item.reduction_statement_attachment_file_name;
  if (!fileName) {
    throw new Error(
      "Form 8283 Section B election needs its FMV-reduction statement PDF",
    );
  }
  if (
    !matchesAttachmentDescription(
      context.attachmentDescriptionsByFileName?.[fileName],
      "Form 8283 Section B FMV reduction statement",
    )
  ) {
    throw new Error(
      "Form 8283 Section B election needs its matching FMV-reduction statement PDF",
    );
  }
  const review = item.reduction_statement_source_review;
  if (!review) {
    throw new Error(
      "Form 8283 Section B election needs documented review of its FMV-reduction statement PDF",
    );
  }
  if (context.documentIdsByPendingKey) {
    if (context.attachmentSha256ByFileName?.[fileName] !== review.pdf_sha256) {
      throw new Error(
        "Form 8283 Section B FMV-reduction statement PDF bytes do not match the reviewed source SHA-256",
      );
    }
    if (
      fileName === item.signed_form_attachment_file_name ||
      fileName === item.qualified_appraisal?.signature_attachment_file_name ||
      fileName === item.donee_acknowledgment?.signature_attachment_file_name
    ) {
      throw new Error(
        "Form 8283 Section B FMV-reduction statement must be a separate PDF",
      );
    }
  }
  const id = context.documentIdsByAttachmentFileName?.[fileName];
  if (context.documentIdsByPendingKey && !id) {
    throw new Error(
      "Form 8283 Section B FMV-reduction statement PDF has no linked MeF document",
    );
  }
  return id;
}

function requiredOrdinaryIncomeAttachments(
  item: SectionBItem,
  context: MefBuildContext,
): string[] {
  const evidence = item.ordinary_income_reduction;
  const appraisal = item.qualified_appraisal;
  if (
    !evidence || !appraisal?.attachment_file_name ||
    !appraisal.full_appraisal_source_review ||
    !item.signed_form_attachment_file_name || !item.signed_form_source_review
  ) {
    throw new Error(
      "Form 8283 ordinary-income Section B gift needs reviewed purchase, appraisal, signed form, and reduction PDFs",
    );
  }
  const names = [
    evidence.purchase_record_attachment_file_name,
    appraisal.attachment_file_name,
    item.signed_form_attachment_file_name,
    evidence.reduction_statement_attachment_file_name,
    appraisal.signature_attachment_file_name,
    item.donee_acknowledgment?.signature_attachment_file_name,
  ];
  if (names.some((name) => !name) || new Set(names).size !== names.length) {
    throw new Error(
      "Form 8283 ordinary-income Section B gift evidence must use six distinct PDFs",
    );
  }
  const reviewed = [
    [
      evidence.purchase_record_attachment_file_name,
      "Form 8283 Section B purchase and basis record",
      evidence.purchase_record_review.pdf_sha256,
    ],
    [
      evidence.reduction_statement_attachment_file_name,
      "Form 8283 Section B FMV reduction statement",
      evidence.reduction_statement_review.pdf_sha256,
    ],
  ] as const;
  const ids: string[] = [];
  for (const [name, description, digest] of reviewed) {
    if (
      !matchesAttachmentDescription(
        context.attachmentDescriptionsByFileName?.[name],
        description,
      )
    ) {
      throw new Error(
        `Form 8283 ordinary-income Section B gift needs ${description}`,
      );
    }
    if (context.documentIdsByPendingKey) {
      if (context.attachmentSha256ByFileName?.[name] !== digest) {
        throw new Error(
          `Form 8283 ordinary-income Section B gift ${description} bytes differ from reviewed SHA-256`,
        );
      }
      const id = context.documentIdsByAttachmentFileName?.[name];
      if (!id) {
        throw new Error(
          `Form 8283 ordinary-income Section B gift ${description} has no linked MeF document`,
        );
      }
      ids.push(id);
    }
  }
  const appraisalId = requiredQualifiedAppraisalAttachment(
    appraisal.attachment_file_name,
    context,
    appraisal.full_appraisal_source_review,
  );
  if (appraisalId) ids.push(appraisalId);
  if (new Set(ids).size !== ids.length) {
    throw new Error(
      "Form 8283 ordinary-income Section B gift PDFs need distinct MeF document IDs",
    );
  }
  return ids;
}

function requiredUnrelatedUseAttachments(
  item: SectionBItem,
  context: MefBuildContext,
): string[] {
  const evidence = item.unrelated_use_capital_gain_reduction;
  const appraisal = item.qualified_appraisal;
  if (
    !evidence || !appraisal?.attachment_file_name ||
    !appraisal.full_appraisal_source_review ||
    !item.signed_form_attachment_file_name || !item.signed_form_source_review ||
    !appraisal.signature_attachment_file_name ||
    !item.donee_acknowledgment?.signature_attachment_file_name
  ) {
    throw new Error(
      "Form 8283 unrelated-use Section B art needs reviewed source, appraisal, signed-form, and signature PDFs",
    );
  }
  const files = [
    evidence.purchase_record_attachment_file_name,
    evidence.donee_use_attachment_file_name,
    evidence.reduction_statement_attachment_file_name,
    appraisal.attachment_file_name,
    item.signed_form_attachment_file_name,
    appraisal.signature_attachment_file_name,
    item.donee_acknowledgment.signature_attachment_file_name,
  ];
  if (new Set(files).size !== 7) {
    throw new Error(
      "Form 8283 unrelated-use Section B art needs seven distinct evidence PDFs",
    );
  }
  const reviewed = [
    [
      evidence.purchase_record_attachment_file_name,
      "Form 8283 Section B purchase and basis record",
      evidence.purchase_record_review.pdf_sha256,
    ],
    [
      evidence.donee_use_attachment_file_name,
      "Form 8283 Section B unrelated-use donee statement",
      evidence.donee_use_review.pdf_sha256,
    ],
    [
      evidence.reduction_statement_attachment_file_name,
      "Form 8283 Section B FMV reduction statement",
      evidence.reduction_statement_review.pdf_sha256,
    ],
  ] as const;
  const ids: string[] = [];
  for (const [name, description, digest] of reviewed) {
    if (
      !matchesAttachmentDescription(
        context.attachmentDescriptionsByFileName?.[name],
        description,
      )
    ) {
      throw new Error(
        `Form 8283 unrelated-use Section B art needs ${description}`,
      );
    }
    if (context.documentIdsByPendingKey) {
      if (context.attachmentSha256ByFileName?.[name] !== digest) {
        throw new Error(
          `Form 8283 unrelated-use Section B art ${description} bytes differ from reviewed SHA-256`,
        );
      }
      const id = context.documentIdsByAttachmentFileName?.[name];
      if (!id) {
        throw new Error(
          `Form 8283 unrelated-use Section B art ${description} has no linked MeF document`,
        );
      }
      ids.push(id);
    }
  }
  const appraisalId = requiredQualifiedAppraisalAttachment(
    appraisal.attachment_file_name,
    context,
    appraisal.full_appraisal_source_review,
  );
  if (appraisalId) ids.push(appraisalId);
  return ids;
}

function requiredSignedFormAttachment(
  item: SectionBItem,
  context: MefBuildContext,
): string | undefined {
  // The descriptor is built once to allocate document IDs and again to link
  // validated binary documents. The first pass has no attachment identities.
  if (!context.documentIdsByPendingKey) return undefined;
  const fileName = item.signed_form_attachment_file_name;
  const review = item.signed_form_source_review;
  if (!fileName || !review) {
    throw new Error(
      "Form 8283 Section B needs the completed signed Form 8283 PDF and documented source review; signature excerpts alone are insufficient",
    );
  }
  if (
    !/^Form 8283 completed signed Section B(?:$|: .+$)/.test(
      context.attachmentDescriptionsByFileName?.[fileName] ?? "",
    )
  ) {
    throw new Error(
      "Form 8283 Section B needs its matching completed signed Form 8283 PDF",
    );
  }
  if (
    context.attachmentSha256ByFileName?.[fileName] !== review.pdf_sha256
  ) {
    throw new Error(
      "Form 8283 completed signed Section B PDF bytes do not match the reviewed source SHA-256",
    );
  }
  const id = context.documentIdsByAttachmentFileName?.[fileName];
  if (context.documentIdsByPendingKey && !id) {
    throw new Error(
      "Form 8283 completed signed Section B PDF has no linked MeF document",
    );
  }
  return id;
}

function buildSectionBItem(
  item: SectionBItem,
  index: number,
  similarGroupTotal: number,
  context: MefBuildContext,
  vehicleStatementId?: string,
  vehicleAttachmentId?: string,
  reductionAttachmentId?: string,
): string {
  if (
    !item.property_description || !item.property_type ||
    !item.date_acquired || !/^\d{4}-\d{2}-\d{2}$/.test(item.date_acquired) ||
    !item.donor_acquisition_description ||
    item.cost_or_adjusted_basis === undefined ||
    !item.date_contributed ||
    !/^\d{4}-\d{2}-\d{2}$/.test(item.date_contributed) ||
    !item.qualified_appraisal || !item.donee_acknowledgment
  ) {
    throw new Error(
      `Form 8283 Section B item ${
        index + 1
      } needs property, acquisition, qualified appraisal, and signed donee facts`,
    );
  }
  if (similarGroupTotal <= 5_000) {
    throw new Error(
      "Form 8283 Section B ordinary gift needs a claimed deduction above $5,000 for the item or similar-item group",
    );
  }
  if (
    item.property_type === SectionBPropertyType.ArtUnder20000 &&
    item.deduction_claimed >= 20_000
  ) {
    throw new Error(
      "Form 8283 art valued at $20,000 needs its appraisal attachment",
    );
  }
  if (
    item.property_type === SectionBPropertyType.ClothingHousehold &&
    item.good_used_condition_confirmed !== true
  ) {
    throw new Error(
      "Form 8283 clothing or household property needs verified good condition or an appraisal attachment",
    );
  }
  const tangible = new Set<SectionBPropertyType>([
    SectionBPropertyType.ArtUnder20000,
    SectionBPropertyType.ArtAtLeast20000,
    SectionBPropertyType.OtherRealEstate,
    SectionBPropertyType.Equipment,
    SectionBPropertyType.Collectibles,
    SectionBPropertyType.Vehicle,
    SectionBPropertyType.ClothingHousehold,
    ...(item.special_fmv_reduction ? [SectionBPropertyType.Other] : []),
  ]);
  if (tangible.has(item.property_type) && !item.physical_condition?.trim()) {
    throw new Error("Form 8283 tangible property needs its physical condition");
  }
  if (item.donee_acknowledgment.received_date !== item.date_contributed) {
    throw new Error(
      "Form 8283 Section B donee receipt date differs from contribution date",
    );
  }
  if (
    Math.round((item.fmv - item.deduction_claimed) * 100) > 0 &&
    item.capital_gain_reduction_election_confirmed !== true &&
    item.ordinary_income_reduction === undefined &&
    item.unrelated_use_capital_gain_reduction === undefined &&
    item.special_fmv_reduction === undefined
  ) {
    throw new Error(
      "Form 8283 Section B reduced claim needs a supported reviewed FMV-reduction computation and statement",
    );
  }
  const appraisal = item.qualified_appraisal;
  const donee = item.donee_acknowledgment;
  const appraiserId = requiredSignatureAttachment(
    appraisal.signature_attachment_file_name,
    "Form 8283 appraiser signature document",
    context,
  );
  const doneeId = requiredSignatureAttachment(
    donee.signature_attachment_file_name,
    "Form 8283 Donee signature document",
    context,
  );
  const signatureIds = [appraiserId, doneeId].filter(
    (id): id is string => id !== undefined,
  );
  const signedFormId = requiredSignedFormAttachment(item, context);
  const ordinaryReductionIds = item.ordinary_income_reduction
    ? requiredOrdinaryIncomeAttachments(item, context)
    : [];
  const unrelatedReductionIds = item.unrelated_use_capital_gain_reduction
    ? requiredUnrelatedUseAttachments(item, context)
    : [];
  const unreducedIds: string[] = [];
  if (item.unreduced_purchased_property && context.documentIdsByPendingKey) {
    const review = item.unreduced_purchased_property;
    const name = review.purchase_record_attachment_file_name;
    const id = context.documentIdsByAttachmentFileName?.[name];
    if (
      !id ||
      context.attachmentSha256ByFileName?.[name] !==
        review.purchase_record_review.pdf_sha256 ||
      !context.attachmentDescriptionsByFileName?.[name]?.startsWith(
        "Form 8283 unreduced property purchase record",
      )
    ) {
      throw new Error(
        "Form8283 unreduced purchase source differs from retained bytes",
      );
    }
    unreducedIds.push(id);
    const appraisalId = requiredQualifiedAppraisalAttachment(
      appraisal.attachment_file_name,
      context,
      appraisal.full_appraisal_source_review,
    );
    if (appraisalId) unreducedIds.push(appraisalId);
  }
  const specialReductionIds: string[] = [];
  if (item.special_fmv_reduction && context.documentIdsByPendingKey) {
    const review = item.special_fmv_reduction;
    const records = [...review.source_documents, {
      attachment_file_name: review.reduction_statement_attachment_file_name,
      pdf_sha256: review.reduction_statement_sha256,
    }];
    for (const record of records) {
      const name = record.attachment_file_name;
      if (
        context.attachmentSha256ByFileName?.[name] !== record.pdf_sha256 ||
        !context.attachmentDescriptionsByFileName?.[name]?.startsWith(
          "Form 8283 Section B reduction source record:",
        ) ||
        !context.documentIdsByAttachmentFileName?.[name]
      ) {
        throw new Error(
          "Form8283 special reduction source record missing or differs from reviewed bytes",
        );
      }
      specialReductionIds.push(context.documentIdsByAttachmentFileName[name]);
    }
    const id = requiredQualifiedAppraisalAttachment(
      appraisal.attachment_file_name,
      context,
      appraisal.full_appraisal_source_review,
    );
    if (id) specialReductionIds.push(id);
  }
  const artAtLeast20000 =
    item.property_type === SectionBPropertyType.ArtAtLeast20000;
  if (
    artAtLeast20000 &&
    appraisal.attachment_file_name === item.signed_form_attachment_file_name
  ) {
    throw new Error(
      "Form 8283 art needs its complete signed appraisal PDF separate from the completed signed Form 8283",
    );
  }
  const qualifiedAppraisalId =
    (similarGroupTotal > 500_000 || artAtLeast20000) &&
      item.ordinary_income_reduction === undefined &&
      item.unrelated_use_capital_gain_reduction === undefined &&
      item.special_fmv_reduction === undefined
      ? requiredQualifiedAppraisalAttachment(
        appraisal.attachment_file_name,
        context,
        artAtLeast20000 ? appraisal.full_appraisal_source_review : undefined,
      )
      : undefined;
  const binaryIds = [
    vehicleAttachmentId,
    qualifiedAppraisalId,
    reductionAttachmentId,
    signedFormId,
    ...ordinaryReductionIds,
    ...unreducedIds,
    ...unrelatedReductionIds,
    ...specialReductionIds,
    ...signatureIds,
  ]
    .filter(
      (id): id is string => id !== undefined,
    );
  if (
    item.ordinary_income_reduction && context.documentIdsByPendingKey &&
    (binaryIds.length !== 6 || new Set(binaryIds).size !== 6)
  ) {
    throw new Error(
      "Form 8283 ordinary-income Section B gift needs six distinct linked MeF document IDs",
    );
  }
  if (
    item.unrelated_use_capital_gain_reduction &&
    context.documentIdsByPendingKey &&
    (binaryIds.length !== 7 || new Set(binaryIds).size !== 7)
  ) {
    throw new Error(
      "Form 8283 unrelated-use Section B art needs seven distinct linked MeF document IDs",
    );
  }
  if (
    item.special_fmv_reduction && context.documentIdsByPendingKey &&
    (binaryIds.length !==
        item.special_fmv_reduction.source_documents.length + 5 ||
      new Set(binaryIds).size !== binaryIds.length)
  ) {
    throw new Error(
      "Form8283 special reduction needs distinct signed form, appraisal, signatures, source and computation records",
    );
  }
  return elements(
    "IRS8283",
    [
      element(SECTION_B_PROPERTY_TAG[item.property_type], "X"),
      elements(
        "PropertyInformation",
        [
          element(
            "PropertyId",
            item.signed_form_row_identifier ?? propertyId(0),
          ),
          element("DonatedPropertyDesc", item.property_description),
          element("DonatedPropertyPhysicalCondTxt", item.physical_condition),
          element("AppraisedFairMarketValueAmt", item.fmv),
          element("DonorAcquiredDt", item.date_acquired.slice(0, 7)),
          element("DonorAcquisitionDesc", item.donor_acquisition_description),
          element("DonorCostOrAdjustedBasisAmt", item.cost_or_adjusted_basis),
          element("DeductionClaimedAmt", item.deduction_claimed),
        ],
        vehicleStatementId
          ? {
            referenceDocumentId: vehicleStatementId,
            referenceDocumentName:
              "ContemporaneousWrittenAcknowledgmentStatement ContributionsOfMotorVehiclesBoatsAndAirplanesStatement",
          }
          : undefined,
      ),
      ...(item.donor_statement_source_review
        ? [elements("PropertyIdLetterAndDescGrp", [
          element("PropertyId", item.donor_statement_source_review.property_id),
        ])]
        : []),
      elements("AppraiserName", [
        element("PersonFirstNm", appraisal.appraiser_first_name),
        element("PersonLastNm", appraisal.appraiser_last_name),
      ]),
      element("AppraiserSignedDt", appraisal.signed_date),
      usAddress(appraisal.us_address, "AppraiserUSAddress"),
      element(
        appraisal.appraiser_ein ? "AppraiserEIN" : "AppraiserSSN",
        appraisal.appraiser_ein ?? appraisal.appraiser_ssn,
      ),
      element("ReceivedDt", donee.received_date),
      element(
        "UsePropertyForUnrelatedUseInd",
        donee.unrelated_use ? "true" : "false",
      ),
      elements("DoneeName", [
        element("BusinessNameLine1Txt", donee.organization_name),
      ]),
      element("DoneeEIN", donee.ein),
      usAddress(donee.us_address, "DoneeUSAddress"),
    ],
    binaryIds.length > 0
      ? {
        referenceDocumentId: binaryIds.join(" "),
        referenceDocumentName: BINARY_REFERENCE_NAME,
      }
      : undefined,
  );
}

export const form8283: MefFormDescriptor<
  "f8283",
  F8283Input,
  readonly string[]
> = {
  pendingKey: "f8283",
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8283--2025.pdf",
  build(fields, context = {}) {
    const parsed = inputSchema.parse(fields);
    if (parsed.carryover_evidence !== undefined) {
      if (
        parsed.carryover_evidence.some((row) =>
          row.property_kind === "purchased_artwork"
        )
      ) {
        throw new Error(
          "Form 8283 Section B artwork carryover needs authenticated accepted 2024 filing before native export",
        );
      }
      return buildCarryoverDocuments(parsed, context);
    }
    if (
      ((parsed.section_a_items ?? []).some(needsFmvReductionStatement) ||
        (parsed.section_b_items ?? []).some((item) =>
          item.ordinary_income_reduction !== undefined ||
          item.unrelated_use_capital_gain_reduction !== undefined ||
          item.special_fmv_reduction !== undefined ||
          item.unreduced_purchased_property !== undefined
        )) &&
      context.pending?.f8283 !== undefined &&
      JSON.stringify(parsed) !==
        JSON.stringify(inputSchema.parse(context.pending.f8283))
    ) {
      throw new Error(
        "Form 8283 reduction differs from the pending source used by its statement",
      );
    }
    for (const item of parsed.section_a_items ?? []) {
      assertShortTermReductionSource(item);
      assertInventoryReductionSource(item);
      assertCreatorReductionSource(item);
      assertManuscriptReductionSource(item);
      assertUnrelatedUseReductionSource(item);
      assertPrivateFoundationReductionSource(item);
      assertTaxidermyReductionSource(item);
      assertIntellectualPropertyReductionSource(item);
      assertVehicleSaleReductionSource(item);
    }
    const elected = (parsed.section_a_items ?? []).some((item) =>
      item.capital_gain_reduction_election_confirmed === true
    );
    const electedB = (parsed.section_b_items ?? []).some((item) =>
      item.capital_gain_reduction_election_confirmed === true
    );
    const ordinaryReductionB = (parsed.section_b_items ?? []).some((item) =>
      item.ordinary_income_reduction !== undefined ||
      item.unrelated_use_capital_gain_reduction !== undefined ||
      item.special_fmv_reduction !== undefined ||
      item.unreduced_purchased_property !== undefined
    );
    const sectionB = parsed.section_b_items ?? [];
    assertReviewedForm8283Owners(parsed, context.filer);
    assertReviewedForm8283Return(context);
    if (elected || electedB) {
      if (electedB) {
        assertElectedSectionBReconciled(context);
      } else {
        assertElectedSectionAReconciled(context);
      }
      if (
        JSON.stringify(parsed) !==
          JSON.stringify(inputSchema.parse(context.pending?.f8283))
      ) {
        throw new Error("Form 8283 election differs from the pending source");
      }
    }
    if (ordinaryReductionB) {
      const propertyType = parsed.section_b_items?.[0]?.property_type;
      if (
        propertyType !== SectionBPropertyType.Equipment &&
        propertyType !== SectionBPropertyType.ArtUnder20000 &&
        propertyType !== SectionBPropertyType.ArtAtLeast20000 &&
        propertyType !== SectionBPropertyType.Collectibles &&
        propertyType !== SectionBPropertyType.Securities &&
        propertyType !== SectionBPropertyType.OtherRealEstate &&
        propertyType !== SectionBPropertyType.Other
      ) {
        throw new Error(
          "Form 8283 ordinary-income Section B property type is unsupported",
        );
      }
      assertOrdinarySectionBReconciled(context, propertyType);
    }
    if (sectionB.length > 1) {
      const similarArt = isTwoSectionBSimilarArtGroup(parsed);
      const reducedEquipment = isTwoSectionBReducedEquipmentGifts(parsed);
      if (
        !similarArt && !reducedEquipment &&
        !isReviewedSectionBReductionInventory(parsed)
      ) {
        throw new Error(
          "Form 8283 two Section B gifts need distinct signed/appraised similar-art sources and donees or reduced equipment sources",
        );
      }
      assertOrdinarySectionBReconciled(
        context,
        sectionB[0].property_type!,
      );
    }
    const sectionA = parsed.section_a_items ?? [];
    if (
      sectionA.length > 1 && !elected &&
      sectionA.every((item) => !needsFmvReductionStatement(item)) &&
      context.pending?.f8283 !== undefined
    ) {
      if (
        JSON.stringify(parsed) !==
          JSON.stringify(inputSchema.parse(context.pending.f8283))
      ) {
        throw new Error(
          "Form 8283 multiple ordinary Section A gifts differ from the pending source",
        );
      }
      assertOrdinarySectionAReconciled(context);
    }
    if (isSingleSectionAExceptionVehicleUnreduced(parsed)) {
      assertExceptionVehicleUnreducedSource(parsed);
    }
    if (
      isSingleSectionAVehicleSale(parsed) ||
      hasSectionAShortTermReduction(parsed) ||
      isSingleSectionAExceptionVehicleUnreduced(parsed) ||
      sectionA.some((item) =>
        item.unrelated_use_capital_gain_reduction !== undefined ||
        item.private_foundation_capital_gain_reduction !== undefined ||
        item.taxidermy_capital_gain_reduction !== undefined ||
        item.intellectual_property_capital_gain_reduction !== undefined
      )
    ) {
      assertOrdinarySectionAReconciled(context);
    }
    const similarGroupTotals = similarItemGroupTotals(parsed);
    const sectionAVehicleAttachments = sectionA.filter(needsVehicleStatement)
      .map((item) => requiredVehicleAttachment(item, context, "A"));
    const sectionBVehicleAttachments = sectionB
      .filter(needsSectionBVehicleStatement)
      .map((item) => requiredVehicleAttachment(item, context, "B"));
    const dispositionSourceIds = sectionA.flatMap((item) =>
      item.contribution_year_disposition_reduction?.retained_source_documents
        .map((record) => {
          if (!context.documentIdsByPendingKey) return undefined;
          const id = context.documentIdsByAttachmentFileName
            ?.[record.attachment_file_name];
          if (
            !id ||
            context.attachmentSha256ByFileName
                ?.[record.attachment_file_name] !== record.pdf_sha256
          ) {
            throw new Error(
              "SectionA disposition source bytes differ from reviewed records",
            );
          }
          return id;
        }) ?? []
    );
    const sectionAAttachmentIds = [
      ...dispositionSourceIds,
      ...new Set(
        sectionAVehicleAttachments.map((attachment) => attachment.id),
      ),
    ].filter((id): id is string => id !== undefined);
    const sectionBAttachmentIdsByFileName = Object.fromEntries(
      sectionBVehicleAttachments.map((attachment) => [
        attachment.fileName,
        attachment.id,
      ]),
    );
    const statementIds = context.documentIdsByPendingKey
      ?.form8283_vehicle_statement ?? [];
    const fmvReductionStatementIds = context.documentIdsByPendingKey
      ?.form8283_fmv_reduction_statement ?? [];
    const requiredStatements = sectionAVehicleAttachments.length +
      sectionBVehicleAttachments.length;
    if (
      context.documentIdsByPendingKey &&
      statementIds.length !== requiredStatements
    ) {
      throw new Error(
        "Form 8283 vehicle statement count does not match linked documents",
      );
    }
    const requiredFmvStatements = sectionA.filter(needsFmvReductionStatement)
      .length;
    if (
      context.documentIdsByPendingKey && (
        fmvReductionStatementIds.some((id) => !id.trim()) ||
        new Set(fmvReductionStatementIds).size !==
          fmvReductionStatementIds.length
      )
    ) {
      throw new Error(
        "Form 8283 Section A reductions need distinct native FMV-reduction statement IDs",
      );
    }
    if (
      context.documentIdsByPendingKey &&
      fmvReductionStatementIds.length !== requiredFmvStatements
    ) {
      throw new Error(
        "Form 8283 FMV-reduction statement count does not match linked documents",
      );
    }
    let nextStatement = 0;
    let nextFmvStatement = 0;
    return [
      ...(sectionA.length > 0
        ? [elements(
          "IRS8283",
          sectionA.map((item, index) =>
            buildSectionAItem(
              item,
              index,
              needsVehicleStatement(item)
                ? statementIds[nextStatement++]
                : undefined,
              needsFmvReductionStatement(item)
                ? fmvReductionStatementIds[nextFmvStatement++]
                : undefined,
            )
          ),
          sectionAAttachmentIds.length > 0
            ? {
              referenceDocumentId: sectionAAttachmentIds.join(" "),
              referenceDocumentName: BINARY_REFERENCE_NAME,
            }
            : undefined,
        )]
        : []),
      ...groupSectionBSourceForms(sectionB).map((rows) => {
        const documents = rows.map((item) =>
          buildSectionBItem(
            item,
            sectionB.indexOf(item),
            item.similar_item_group
              ? similarGroupTotals.get(
                normalizeSimilarItemGroup(item.similar_item_group),
              ) ?? item.deduction_claimed
              : item.deduction_claimed,
            context,
            needsSectionBVehicleStatement(item)
              ? statementIds[nextStatement++]
              : undefined,
            item.vehicle_acknowledgment_attachment_file_name
              ? sectionBAttachmentIdsByFileName[
                item.vehicle_acknowledgment_attachment_file_name
              ]
              : undefined,
            item.capital_gain_reduction_election_confirmed === true
              ? requiredReductionAttachment(item, context)
              : undefined,
          )
        );
        if (documents.length === 1) return documents[0];
        const properties = documents.map((xml) =>
          xml.match(
            /<PropertyInformation(?:\s[^>]*)?>[\s\S]*?<\/PropertyInformation>/,
          )?.[0]
        );
        if (properties.some((xml) => !xml)) {
          throw new Error("Shared Form8283 lacks native row data");
        }
        const binaryIds = [
          ...new Set(
            documents.flatMap((xml) =>
              xml.match(/^<IRS8283[^>]*referenceDocumentId="([^"]*)"/)?.[1]
                .split(
                  " ",
                ) ?? []
            ),
          ),
        ];
        let combined = documents[0].replace(
          properties[0]!,
          properties.join(""),
        );
        const statements = documents.flatMap((xml) =>
          xml.match(
            /<PropertyIdLetterAndDescGrp>[\s\S]*?<\/PropertyIdLetterAndDescGrp>/g,
          ) ?? []
        );
        combined = combined.replace(
          /<PropertyIdLetterAndDescGrp>[\s\S]*?<\/PropertyIdLetterAndDescGrp>/g,
          "",
        );
        combined = combined.replace(
          "<AppraiserName>",
          statements.join("") + "<AppraiserName>",
        );
        combined = combined.replace(
          /^(<IRS8283[^>]*referenceDocumentId=")[^"]*(")/,
          `$1${binaryIds.join(" ")}$2`,
        );
        return combined;
      }),
    ];
  },
};
