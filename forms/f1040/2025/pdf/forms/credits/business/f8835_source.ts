import { assertForm8835EnergyCommunitySource } from "../../../../../nodes/inputs/credits/business/f8835/energy-community-source.ts";
import { assertForm8835DomesticSource } from "../../../../../nodes/inputs/credits/business/f8835/domestic-source.ts";
import { assertForm8835EarlyConstructionSource } from "../../../../../nodes/inputs/credits/business/f8835/early-construction-source.ts";
import { assertForm8835SmallFacilitySource } from "../../../../../nodes/inputs/credits/business/f8835/increase-source.ts";
import { assertForm8835BondSource } from "../../../../../nodes/inputs/credits/business/f8835/bond-source.ts";
import {
  allocateForm3800CreditUse,
  form3800NonpassiveCreditUseRows,
} from "../../../../../nodes/inputs/credits/business/f3800/calculation.ts";
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
  readonly appliedCredit: number;
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
    assertForm8835EnergyCommunitySource(item, true);
    if (
      item.energy_community_source && (
        item.energy_community_source.taxpayer_tin !==
          filer?.primarySSN?.replaceAll("-", "") ||
        item.energy_community_source.taxpayer_name !== filer?.fullName
      )
    ) {
      throw new Error(
        "Form 8835 energy-community source differs from PDF filer",
      );
    }
    assertForm8835DomesticSource(item, true);
    assertForm8835BondSource(item, true);
    assertForm8835SmallFacilitySource(item, true);
    assertForm8835EarlyConstructionSource(item, true);
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
      item.is_fiscal_year ||
      !["none", "under_one_mw", "construction_before_2023_01_29"].includes(
        item.increased_credit_reason,
      ) ||
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
      item.registration_number !== undefined
    ) {
      throw new Error(
        "Form 8835 PDF currently supports filer-owned nonpassive wind, geothermal, sourced biomass, solar, landfill gas, or trash-combustion facilities with in-period production and reviewed bond financing and reviewed small-facility or early-construction increases, with reviewed actual-cost domestic content and annual energy-community locations, without other increases, transfer, or fiscal-year branches",
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
  const byLine = (line: "1f" | "4e") =>
    rows.map((row, index) => ({ ...row, index }))
      .filter((row) => row.lines.form3800Line === line);
  const generated = (line: "1f" | "4e") =>
    byLine(line).reduce((sum, row) => sum + row.lines.line15, 0);
  const appliedByLine = { "1f": 0, "4e": generated("4e") };
  if (generated("1f") > 0) {
    // Later-year production precedes orphan-drug credits within the ordinary
    // credit limit. Replay both classes from source amounts, not Part V use.
    const orphanCredit = (form3800.f8820_credit?.credit_amount ?? 0) +
      (form3800.f8820_k1_credit_entries ?? []).reduce(
        (sum, entry) => sum + entry.credit_amount,
        0,
      );
    if (
      prepared.carryoverRows.length || !credits ||
      credits.standardCredit !== generated("1f") + orphanCredit ||
      credits.specifiedCredit !== generated("4e") ||
      (credits.empowermentCredit ?? 0) !== 0
    ) {
      throw new Error(
        "Form 8835 PDF later-year credit needs a reconciled current production/orphan inventory",
      );
    }
    const uses = allocateForm3800CreditUse(
      form3800NonpassiveCreditUseRows({
        form8820Credit: orphanCredit,
        facilities: entries,
      }),
      prepared.lines,
    );
    for (const line of ["1f", "4e"] as const) {
      appliedByLine[line] = uses.find((row) =>
        row.sourceKey === `nonpassive:8835:${line}`
      )?.appliedAgainstTax ?? 0;
    }
  } else if (
    prepared.carryoverRows.length === 0 &&
    credits?.specifiedCredit === totalCredit
  ) {
    appliedByLine["4e"] = Number(finalized3800.specified_credit_allowed);
  }
  assertCurrentProductionAllocationSource(
    form3800.current_production_allocation_review,
    allPending.form3800_current_production_allocation,
  );
  const reviewedTaxUse = form3800.current_production_allocation_review
    ? reconcileCurrentProductionAllocation(
      form3800.current_production_allocation_review,
      rows.map((row, index) => ({ ...row.item, ...entries[index] })),
      { primarySSN: filer?.primarySSN ?? "", appliedByLine },
    )
    : undefined;
  if (
    reviewedTaxUse && (prepared.carryoverRows.length !== 0 ||
      credits?.specifiedCredit !== generated("4e") ||
      (form3800.form8835_applied_credits_by_facility !== undefined &&
        JSON.stringify(form3800.form8835_applied_credits_by_facility) !==
          JSON.stringify(reviewedTaxUse)))
  ) {
    throw new Error(
      "Form 8835 PDF reviewed allocation conflicts with another credit inventory or allocation",
    );
  }
  const facilityUse = rows.map((row, index) => {
    const line = row.lines.form3800Line;
    const count = byLine(line).length;
    if (reviewedTaxUse) return reviewedTaxUse[index];
    if (count === 1) return appliedByLine[line];
    if (appliedByLine[line] === 0) return 0;
    if (appliedByLine[line] !== generated(line)) {
      throw new Error(
        "Form 8835 PDF partially used facilities need a reviewed allocation",
      );
    }
    return row.lines.line15;
  });
  const filedDocumentIds = prepared.form8835DocumentIds;
  const groupsValid = (["1f", "4e"] as const).every((line) => {
    const facilities = byLine(line);
    const summaries = prepared.currentRows.filter((row) => row.line === line);
    const amounts = prepared.currentAmounts.filter((row) => row.line === line);
    const details = prepared.currentDetails.filter((row) => row.line === line);
    if (!facilities.length) {
      return summaries.length === 0 && amounts.length === 0 &&
        details.length === 0;
    }
    const [summary] = summaries, [amount] = amounts;
    return summaries.length === 1 && amounts.length === 1 &&
      summary.metadata.sourceCount === facilities.length &&
      amount.nonpassiveCredit === generated(line) &&
      amount.transferOutCredit === 0 &&
      amount.appliedCredit === appliedByLine[line] &&
      details.length === facilities.length &&
      facilities.every((row, index) => {
        const detail = details[index];
        return detail.credit === row.lines.line15 &&
          detail.appliedCredit === facilityUse[row.index] &&
          (detail.transferOutCredit ?? 0) === 0 &&
          detail.sourceDocumentId === filedDocumentIds?.[row.index];
      }) && summary.metadata.referenceDocumentId === details.map((detail) =>
          detail.sourceDocumentId
        ).join(" ");
  });
  if (
    entries.length !== rows.length ||
    entries.some((entry, index) =>
      entry.form3800_line !== rows[index].lines.form3800Line ||
      entry.credit_amount !== rows[index].lines.line15 ||
      entry.transfer_out_amount !== 0 ||
      entry.subject_to_passive_activity_limit !== false
    ) ||
    !credits || credits.specifiedCredit < generated("4e") ||
    credits.standardCredit < generated("1f") ||
    credits.passiveLines.line2 !== 0 || credits.passiveLines.line23 !== 0 ||
    credits.passiveLines.line32 !== 0 ||
    !groupsValid || filedDocumentIds?.length !== rows.length ||
    new Set(filedDocumentIds).size !== rows.length ||
    facilityUse.some((used, index) =>
      !Number.isFinite(used) || used < 0 || used > rows[index].lines.line15
    ) ||
    prepared.lines.line17 < appliedByLine["1f"] ||
    prepared.lines.line37 < appliedByLine["4e"] ||
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
  return rows.map((row, index) => ({
    ...row,
    appliedCredit: facilityUse[index],
    filerName,
    filerTin,
  }));
}
