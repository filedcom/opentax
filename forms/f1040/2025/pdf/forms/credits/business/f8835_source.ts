import {
  assertCurrentProductionAllocationSource,
  reconcileCurrentProductionAllocation,
} from "../../../../../nodes/inputs/credits/business/f3800/production-allocation.ts";
import type { FilerIdentity } from "../../../../../mef/header.ts";
import { f1040 } from "../../../../../nodes/outputs/general/return-assembly/f1040/index.ts";
import {
  calculateForm8835,
  EnergyType,
  type F8835Item,
  type F8835Lines,
  inputSchema,
} from "../../../../../nodes/inputs/credits/business/f8835/index.ts";
import { inputSchema as form3800InputSchema } from "../../../../../nodes/inputs/credits/business/f3800/index.ts";
import type { Form3800DocumentParts } from "../../../../mef/forms/credits/business/f3800/f3800_document.ts";

export interface Form8835PdfSource {
  readonly item: F8835Item;
  readonly lines: F8835Lines;
  readonly filerName: string;
  readonly filerTin: string;
  readonly addressLine1: string;
  readonly addressLine2: string;
}

function addressLines(item: F8835Item): readonly [string, string] {
  const address = item.facility_us_address;
  if (!address) throw new Error("Form 8835 PDF needs a facility address");
  const line1 = [address.line1, address.line2].filter(Boolean).join(", ");
  const line2 = `${address.city}, ${address.state} ${address.zip}`;
  if (line1.length > 70 || line2.length > 70) {
    throw new Error("Form 8835 PDF facility address exceeds its printed lines");
  }
  return [line1, line2];
}

export function form8835PdfSources(
  allPending: Record<string, Record<string, unknown>>,
  filer: FilerIdentity | undefined,
  prepared: Form3800DocumentParts,
): readonly Form8835PdfSource[] {
  const raw = allPending.f8835;
  if (!raw) return [];
  const source = inputSchema.parse(raw);
  const rows = source.f8835s.map((item) => {
    const lines = calculateForm8835(item);
    const nonownerLessee = item.energy_type === EnergyType.BiomassOpen &&
      (item.open_loop_cellulosic_source !== undefined ||
        item.open_loop_livestock_source !== undefined) &&
      item.open_loop_nonowner_lessee_source !== undefined &&
      item.facility_owned_by_filer === false &&
      item.facility_owner_business !== undefined &&
      item.facility_owner_person === undefined;
    if (lines.line15 <= 0) {
      throw new Error(
        "Form 8835 PDF zero-credit facility needs a separately reviewed native filing decision",
      );
    }
    if (
      (item.energy_type !== EnergyType.Geothermal &&
        item.energy_type !== EnergyType.Wind &&
        item.energy_type !== EnergyType.BiomassClosed &&
        item.energy_type !== EnergyType.Solar &&
        item.energy_type !== EnergyType.BiomassOpen &&
        item.energy_type !== EnergyType.Landfill &&
        item.energy_type !== EnergyType.Trash) ||
      item.facility_placed_in_service_date < "2022-01-01" ||
      item.is_fiscal_year || item.increased_credit_reason !== "none" ||
      item.domestic_content_bonus || item.energy_community_bonus ||
      (item.tax_exempt_bond_proceeds ?? 0) !== 0 ||
      (item.transfer_election_amount ?? 0) !== 0 ||
      item.subject_to_passive_activity_limit ||
      (item.facility_owned_by_filer !== true && !nonownerLessee) ||
      (item.facility_owned_by_filer === true &&
        (item.facility_owner_person !== undefined ||
          item.facility_owner_business !== undefined)) ||
      item.existing_facility_expansion === true ||
      item.facility_us_address === undefined ||
      item.facility_latitude === undefined ||
      item.facility_longitude === undefined ||
      item.ac_nameplate_kw === undefined || item.ac_nameplate_kw <= 0 ||
      (item.energy_type === EnergyType.Solar &&
        (item.solar_dc_nameplate_kw ?? 0) <= 0) ||
      !item.facility_description ||
      item.facility_description.length > 70 ||
      item.registration_number !== undefined ||
      lines.form3800Line !== "4e"
    ) {
      throw new Error(
        "Form 8835 PDF currently supports filer-owned nonpassive wind, geothermal, sourced biomass, solar, landfill gas, or trash-combustion facilities with first-four-year production and no increase, bonus, bond, transfer, or fiscal-year branch",
      );
    }
    if (
      item.facility_construction_start_date >
        item.facility_placed_in_service_date
    ) {
      throw new Error("Form 8835 PDF construction must begin before service");
    }
    if (
      !Number.isInteger(item.facility_latitude * 1_000_000) ||
      !Number.isInteger(item.facility_longitude * 1_000_000)
    ) {
      throw new Error("Form 8835 PDF coordinates need six-decimal precision");
    }
    const [addressLine1, addressLine2] = addressLines(item);
    return { item, lines, addressLine1, addressLine2 };
  });
  const form3800 = form3800InputSchema.parse(allPending.f3800);
  const entries = form3800.f8835_credit_entries ?? [];
  const totalCredit = rows.reduce((sum, row) => sum + row.lines.line15, 0);
  const return1040 = f1040.inputSchema.parse(allPending.f1040);
  const credits = return1040.form3800_source_credits;
  const finalized3800 = allPending.f3800 ?? {};
  const schedule3 = allPending.schedule3 ?? {};
  // One facility is unambiguous only when it is the entire specified-credit
  // inventory. Multiple partially used facilities still need a reviewed split.
  const singleFacilityApplied = rows.length === 1 &&
      prepared.carryoverRows.length === 0 &&
      credits?.specifiedCredit === totalCredit
    ? finalized3800.specified_credit_allowed
    : totalCredit;
  if (
    typeof singleFacilityApplied !== "number" ||
    !Number.isFinite(singleFacilityApplied) || singleFacilityApplied < 0 ||
    singleFacilityApplied > totalCredit
  ) {
    throw new Error(
      "Form 8835 PDF has invalid finalized production-credit use",
    );
  }
  assertCurrentProductionAllocationSource(
    form3800.current_production_allocation_review,
    allPending.form3800_current_production_allocation,
  );
  const reviewedTaxUse = form3800.current_production_allocation_review
    ? reconcileCurrentProductionAllocation(
      form3800.current_production_allocation_review,
      rows.map((row, index) => ({ ...row.item, ...entries[index] })),
      {
        primarySSN: filer?.primarySSN ?? "",
        appliedByLine: {
          "1f": 0,
          "4e": Number(finalized3800.specified_credit_allowed),
        },
      },
    )
    : undefined;
  if (
    reviewedTaxUse &&
    (prepared.carryoverRows.length !== 0 ||
      credits?.specifiedCredit !== totalCredit ||
      (form3800.form8835_applied_credits_by_facility !== undefined &&
        JSON.stringify(form3800.form8835_applied_credits_by_facility) !==
          JSON.stringify(reviewedTaxUse)))
  ) {
    throw new Error(
      "Form 8835 PDF reviewed allocation conflicts with another credit inventory or allocation",
    );
  }
  const appliedCredit = reviewedTaxUse
    ? reviewedTaxUse.reduce((sum, amount) => sum + amount, 0)
    : rows.length === 1
    ? singleFacilityApplied
    : totalCredit;
  const currentRows = prepared.currentRows.filter((row) => row.line === "4e");
  const currentAmounts = prepared.currentAmounts.filter((row) =>
    row.line === "4e"
  );
  const sourceDetails = prepared.currentDetails.filter((row) =>
    row.line === "4e"
  );
  const filedDocumentIds = prepared.form8835DocumentIds;
  if (
    entries.length !== rows.length ||
    entries.some((entry, index) =>
      entry.form3800_line !== "4e" ||
      entry.credit_amount !== rows[index].lines.line15 ||
      entry.transfer_out_amount !== 0 ||
      entry.subject_to_passive_activity_limit !== false
    ) ||
    !credits ||
    credits.specifiedCredit < totalCredit ||
    credits.passiveLines.line2 !== 0 ||
    credits.passiveLines.line23 !== 0 ||
    credits.passiveLines.line32 !== 0 ||
    currentRows.length !== 1 ||
    currentRows[0].metadata.sourceCount !== rows.length ||
    currentAmounts.length !== 1 ||
    currentAmounts[0].nonpassiveCredit !== totalCredit ||
    currentAmounts[0].transferOutCredit !== 0 ||
    currentAmounts[0].appliedCredit !== appliedCredit ||
    sourceDetails.length !== rows.length ||
    filedDocumentIds?.length !== rows.length ||
    sourceDetails.some((detail, index) =>
      detail.credit !== rows[index].lines.line15 ||
      detail.appliedCredit !==
        (reviewedTaxUse?.[index] ??
          (rows.length === 1 ? appliedCredit : rows[index].lines.line15)) ||
      (detail.transferOutCredit ?? 0) !== 0 ||
      detail.sourceDocumentId !== filedDocumentIds?.[index]
    ) ||
    new Set(filedDocumentIds).size !== rows.length ||
    currentRows[0].metadata.referenceDocumentId !==
      sourceDetails.map((detail) => detail.sourceDocumentId).join(" ") ||
    prepared.lines.line37 < appliedCredit ||
    finalized3800.allowed_credit !== prepared.lines.line38 ||
    finalized3800.specified_credit_allowed !== prepared.lines.line37 ||
    schedule3.line6a_total !== prepared.lines.line38 ||
    schedule3.line8_total !== return1040.line20_nonrefundable_credits
  ) {
    throw new Error(
      "Form 8835 PDF production credit disagrees with native Form 3800, Schedule 3, or finalized Form 1040",
    );
  }
  const filerName = filer?.nameLine1?.trim();
  const filerTin = filer?.primarySSN?.replaceAll("-", "");
  if (!filerName || !filerTin || !/^\d{9}$/.test(filerTin)) {
    throw new Error("Form 8835 PDF needs the return name and TIN");
  }
  return rows.map((row) => ({ ...row, filerName, filerTin }));
}
