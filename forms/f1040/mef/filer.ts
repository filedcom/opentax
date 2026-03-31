import {
  AccountType,
  FilingStatus,
  PINEnteredBy,
  type BankAccount,
  type FilerIdentity,
  type OnlineFilerInfo,
  type SpouseIdentity,
} from "./header.ts";

/**
 * Derives a 4-character name control from a last name.
 * IRS rules: first 4 characters of the last name, uppercased, padded with spaces.
 */
function nameControl(lastName: string): string {
  return lastName.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4);
}

/**
 * Builds NameLine1Txt: "LAST FIRST M" (IRS format).
 */
function nameLine1(
  firstName?: string,
  lastName?: string,
  middleInitial?: string,
): string {
  const parts = [lastName?.toUpperCase(), firstName?.toUpperCase()];
  if (middleInitial) parts.push(middleInitial.toUpperCase());
  return parts.filter(Boolean).join(" ");
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

function bool(v: unknown): boolean | undefined {
  return typeof v === "boolean" ? v : undefined;
}

function num(v: unknown): number | undefined {
  return typeof v === "number" ? v : undefined;
}

function extractSpouse(
  f1040: Record<string, unknown>,
): SpouseIdentity | undefined {
  const ssn = str(f1040["spouse_ssn"]);
  const firstName = str(f1040["spouse_first_name"]);
  const lastName = str(f1040["spouse_last_name"]);
  if (!ssn || !lastName) return undefined;

  return {
    ssn,
    firstName: firstName ?? "",
    lastName,
    middleInitial: str(f1040["spouse_middle_initial"]),
    nameControl: nameControl(lastName),
    ipPin: str(f1040["spouse_ip_pin"]),
    signaturePin: str(f1040["spouse_signature_pin"]),
    deceased: bool(f1040["spouse_deceased"]),
    deathDate: str(f1040["spouse_death_date"]),
    occupation: str(f1040["spouse_occupation"]),
  };
}

function extractBankAccount(
  f1040: Record<string, unknown>,
): BankAccount | undefined {
  const routing = str(f1040["bank_routing_number"]);
  const account = str(f1040["bank_account_number"]);
  const type = str(f1040["bank_account_type"]);
  if (!routing || !account || !type) return undefined;

  return {
    routingNumber: routing,
    accountNumber: account,
    accountType: type === "savings" ? AccountType.Savings : AccountType.Checking,
  };
}

function extractOnlineFiler(
  f1040: Record<string, unknown>,
): OnlineFilerInfo | undefined {
  const ip = str(f1040["ip_address"]);
  const device = str(f1040["device_id"]);
  if (!ip && !device) return undefined;
  return { ipAddress: ip, deviceId: device };
}

/**
 * Extracts a FilerIdentity from the computed f1040 pending dict.
 * Returns undefined if minimal required fields (SSN, last name) are missing.
 */
export function extractFilerIdentity(
  f1040: Record<string, unknown>,
): FilerIdentity | undefined {
  const primarySSN = str(f1040["taxpayer_ssn"]);
  const lastName = str(f1040["taxpayer_last_name"]);
  if (!primarySSN || !lastName) return undefined;

  const firstName = str(f1040["taxpayer_first_name"]);
  const middleInitial = str(f1040["taxpayer_middle_initial"]);
  const filingStatusRaw = f1040["filing_status"];
  const filingStatus =
    typeof filingStatusRaw === "number"
      ? (filingStatusRaw as FilingStatus)
      : FilingStatus.Single;

  return {
    primarySSN,
    nameLine1: nameLine1(firstName, lastName, middleInitial),
    nameControl: nameControl(lastName),
    firstName,
    lastName,
    middleInitial,
    suffix: str(f1040["taxpayer_suffix"]),
    address: {
      line1: str(f1040["address_line1"]) ?? "",
      line2: str(f1040["address_line2"]),
      city: str(f1040["address_city"]) ?? "",
      state: str(f1040["address_state"]) ?? "",
      zip: str(f1040["address_zip"]) ?? "",
      foreignCountry: str(f1040["address_foreign_country"]),
      foreignProvinceState: str(f1040["address_foreign_province_state"]),
      foreignPostalCode: str(f1040["address_foreign_postal_code"]),
    },
    filingStatus,
    phone: str(f1040["taxpayer_daytime_phone"]),
    email: str(f1040["taxpayer_email"]),
    deceased: bool(f1040["taxpayer_deceased"]),
    deathDate: str(f1040["taxpayer_death_date"]),
    occupation: str(f1040["taxpayer_occupation"]),
    ipPin: str(f1040["taxpayer_ip_pin"]),
    signaturePin: str(f1040["taxpayer_signature_pin"]),
    priorYearAgi: num(f1040["taxpayer_prior_year_agi"]),
    spouse: extractSpouse(f1040),
    pinEnteredBy: PINEnteredBy.Taxpayer,
    bankAccount: extractBankAccount(f1040),
    onlineFiler: extractOnlineFiler(f1040),
    timestamp: new Date().toISOString(),
  };
}
