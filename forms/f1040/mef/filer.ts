import {
  AccountType,
  FilingStatus,
  PINEnteredBy,
  type BankAccount,
  type FilerIdentity,
  type OnlineFilerInfo,
  type OriginatorInfo,
  type PreparedByInfo,
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

function extractPreparedBy(
  f1040: Record<string, unknown>,
): PreparedByInfo | undefined {
  const selfPrepared = bool(f1040["preparer_self_prepared"]);
  const ptin = str(f1040["preparer_ptin"]);
  const firmName = str(f1040["preparer_firm_name"]);
  const firmEin = str(f1040["preparer_firm_ein"]);

  if (selfPrepared === undefined && ptin === undefined && firmName === undefined && firmEin === undefined) {
    return undefined;
  }

  return {
    selfPrepared: selfPrepared,
    ptin,
    firmName,
    firmEin,
    firmAddressLine1: str(f1040["preparer_firm_address_line1"]),
    firmCity: str(f1040["preparer_firm_city"]),
    firmState: str(f1040["preparer_firm_state"]),
    firmZip: str(f1040["preparer_firm_zip"]),
  };
}

function extractOriginator(
  f1040: Record<string, unknown>,
): OriginatorInfo | undefined {
  const efin = str(f1040["preparer_efin"]);
  const originatorType = str(f1040["preparer_originator_type"]);
  if (!efin || !originatorType) return undefined;
  return { efin, originatorType };
}

/**
 * Extracts a FilerIdentity from the computed f1040 pending dict.
 * Returns undefined if minimal required fields (SSN, last name) are missing.
 */
export function extractFilerIdentity(
  f1040: Record<string, unknown>,
): FilerIdentity | undefined {
  const primarySSN = str(f1040["taxpayer_ssn"])?.replace(/-/g, "") ?? "";
  const lastName = str(f1040["taxpayer_last_name"]);
  const firstName = str(f1040["taxpayer_first_name"]);
  if (!lastName && !firstName) return undefined;

  const middleInitial = str(f1040["taxpayer_middle_initial"]);
  const filingStatusRaw = f1040["filing_status"];
  // filing_status is stored as a string enum ("single", "mfj", etc.); map to MEF numeric enum.
  const STATUS_MAP: Record<string, FilingStatus> = {
    single: FilingStatus.Single,
    mfj: FilingStatus.MarriedFilingJointly,
    mfs: FilingStatus.MarriedFilingSeparately,
    hoh: FilingStatus.HeadOfHousehold,
    qss: FilingStatus.QualifyingSurvivingSpouse,
  };
  const filingStatus =
    typeof filingStatusRaw === "string" && filingStatusRaw in STATUS_MAP
      ? STATUS_MAP[filingStatusRaw]
      : typeof filingStatusRaw === "number"
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
    originator: extractOriginator(f1040),
    preparedBy: extractPreparedBy(f1040),
    timestamp: new Date().toISOString(),
  };
}
