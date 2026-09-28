import type { FilerIdentity } from "../../../mef/header.ts";
import {
  computePersonalCreditAmounts,
  type F8911Input,
  FuelType,
  inputSchema,
  type PersonalCreditAmounts,
} from "../../../nodes/inputs/f8911/index.ts";

export interface Form8911PdfSource {
  readonly input: F8911Input;
  readonly amounts: PersonalCreditAmounts;
  readonly filerName: string;
  readonly filerTin: string;
  readonly propertyAddress: string;
  readonly constructionDate: string;
  readonly serviceDate: string;
}

function dateFor2025(value: string, label: string): string {
  const date = new Date(value);
  if (
    Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value
  ) {
    throw new Error(`Form 8911 PDF ${label} needs a real calendar date`);
  }
  if (label === "placed-in-service date" && !value.startsWith("2025-")) {
    throw new Error(
      "Form 8911 PDF requires property placed in service in TY2025",
    );
  }
  const [year, month, day] = value.split("-");
  return `${month}/${day}/${year}`;
}

export function form8911PdfSource(
  allPending: Record<string, Record<string, unknown>>,
  filer: FilerIdentity | undefined,
): Form8911PdfSource | undefined {
  const raw = allPending.f8911;
  if (!raw) return undefined;
  const input = inputSchema.parse(raw);
  const amounts = computePersonalCreditAmounts(input);
  if (!amounts || amounts.allowedCredit <= 0) return undefined;
  if (
    input.fuel_type !== FuelType.ElectricCharging ||
    (input.business_use_pct ?? 0) !== 0 ||
    (input.certain_allowable_credits ?? 0) !== 0
  ) {
    throw new Error(
      "Form 8911 PDF currently supports one personal-use electric charger with no business use or other allowable-credit worksheet amounts",
    );
  }
  if (
    !Number.isInteger(input.cost) ||
    !Number.isInteger(input.cost * 0.3) ||
    !Object.values(amounts).every(Number.isInteger)
  ) {
    throw new Error("Form 8911 PDF needs whole-dollar source and credit lines");
  }
  if (
    !input.construction_began || !input.placed_in_service ||
    !input.property_us_address
  ) {
    throw new Error("Form 8911 PDF needs the property dates and address");
  }
  const constructionDate = dateFor2025(
    input.construction_began,
    "construction date",
  );
  const serviceDate = dateFor2025(
    input.placed_in_service,
    "placed-in-service date",
  );
  if (input.construction_began > input.placed_in_service) {
    throw new Error("Form 8911 PDF construction must begin before service");
  }
  const property = input.property_us_address;
  if (
    !property.line1.trim() || !property.city.trim() ||
    !property.state.trim() || !property.zip.trim()
  ) {
    throw new Error("Form 8911 PDF needs a complete US property address");
  }
  const propertyAddress = [
    property.line1,
    property.line2,
    `${property.city}, ${property.state} ${property.zip}`,
  ].filter(Boolean).join(", ");
  if (propertyAddress.length > 80) {
    throw new Error(
      "Form 8911 Schedule A PDF address exceeds its printed line",
    );
  }
  const filerName = filer?.nameLine1?.trim();
  const filerTin = filer?.primarySSN?.replaceAll("-", "");
  if (!filerName || !filerTin || !/^\d{9}$/.test(filerTin)) {
    throw new Error("Form 8911 PDF needs the return name and TIN");
  }
  const return1040 = allPending.f1040 ?? {};
  const schedule3 = allPending.schedule3 ?? {};
  const form6251 = allPending.form6251 ?? {};
  const regularTax = return1040.line16_income_tax;
  const schedule2Line1z = return1040.credit_limit_schedule2_line1z ?? 0;
  if (
    typeof regularTax !== "number" ||
    typeof schedule2Line1z !== "number" ||
    regularTax + schedule2Line1z !== amounts.regularTaxBeforeCredits ||
    return1040.credit_limit_form6251_line9 !== amounts.tentativeMinimumTax ||
    form6251.net_tmt !== amounts.tentativeMinimumTax ||
    (schedule3.line1_foreign_tax_credit ?? 0) !== amounts.foreignTaxCredit ||
    schedule3.line6j_alt_fuel_vehicle_refueling !== amounts.allowedCredit ||
    return1040.line20_nonrefundable_credits !==
      amounts.foreignTaxCredit + amounts.allowedCredit
  ) {
    throw new Error(
      "Form 8911 PDF source tax limit or credit disagrees with finalized Form 1040, Form 6251, or Schedule 3",
    );
  }
  return {
    input,
    amounts,
    filerName,
    filerTin,
    propertyAddress,
    constructionDate,
    serviceDate,
  };
}
