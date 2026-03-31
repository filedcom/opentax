import { element, elements } from "./xml.ts";

export enum FilingStatus {
  Single = 1,
  MarriedFilingJointly = 2,
  MarriedFilingSeparately = 3,
  HeadOfHousehold = 4,
  QualifyingSurvivingSpouse = 5,
}

export enum PINEnteredBy {
  Taxpayer = "Taxpayer",
  ERO = "ERO",
}

export enum AccountType {
  Checking = "1",
  Savings = "2",
}

export interface FilerAddress {
  readonly line1: string;
  readonly line2?: string;
  readonly city: string;
  readonly state: string;
  readonly zip: string;
  readonly foreignCountry?: string;
  readonly foreignProvinceState?: string;
  readonly foreignPostalCode?: string;
}

export interface SpouseIdentity {
  readonly ssn: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly middleInitial?: string;
  readonly suffix?: string;
  readonly nameControl: string;
  readonly ipPin?: string;
  readonly signaturePin?: string;
  readonly deceased?: boolean;
  readonly deathDate?: string;
  readonly occupation?: string;
}

export interface BankAccount {
  readonly routingNumber: string;
  readonly accountNumber: string;
  readonly accountType: AccountType;
}

export interface OriginatorInfo {
  readonly efin: string;
  readonly originatorType: string;
  readonly practitionerPIN?: string;
}

export interface OnlineFilerInfo {
  readonly ipAddress?: string;
  readonly deviceId?: string;
  readonly routingTransitNumber?: string;
}

export interface FilerIdentity {
  readonly primarySSN: string;
  readonly nameLine1: string;
  readonly nameControl: string;
  readonly firstName?: string;
  readonly lastName?: string;
  readonly middleInitial?: string;
  readonly suffix?: string;
  readonly address: FilerAddress;
  readonly filingStatus: FilingStatus;
  readonly phone?: string;
  readonly email?: string;
  readonly deceased?: boolean;
  readonly deathDate?: string;
  readonly occupation?: string;
  readonly ipPin?: string;
  readonly signaturePin?: string;
  readonly priorYearAgi?: number;

  // Spouse (MFJ / MFS)
  readonly spouse?: SpouseIdentity;

  // Software & originator
  readonly softwareId?: string;
  readonly softwareVersionNum?: string;
  readonly originator?: OriginatorInfo;

  // PIN signing
  readonly pinEnteredBy?: PINEnteredBy;

  // Online filer
  readonly onlineFiler?: OnlineFilerInfo;

  // Refund direct deposit
  readonly bankAccount?: BankAccount;

  // Timestamp
  readonly timestamp?: string;
}

// ─── Address builders ─────────────────────────────────────────────────────────

function buildUSAddress(addr: FilerAddress): string {
  const children = [
    element("AddressLine1Txt", addr.line1),
    element("AddressLine2Txt", addr.line2),
    element("CityNm", addr.city),
    element("StateAbbreviationCd", addr.state),
    element("ZIPCd", addr.zip),
  ];
  return elements("USAddress", children);
}

function buildForeignAddress(addr: FilerAddress): string {
  const children = [
    element("AddressLine1Txt", addr.line1),
    element("AddressLine2Txt", addr.line2),
    element("CityNm", addr.city),
    element("ProvinceOrStateNm", addr.foreignProvinceState),
    element("CountryCd", addr.foreignCountry),
    element("ForeignPostalCd", addr.foreignPostalCode),
  ];
  return elements("ForeignAddress", children);
}

function buildAddress(addr: FilerAddress): string {
  if (addr.foreignCountry) {
    return buildForeignAddress(addr);
  }
  return buildUSAddress(addr);
}

// ─── Sub-block builders ───────────────────────────────────────────────────────

function buildFilerBlock(filer: FilerIdentity): string {
  const children = [
    element("PrimarySSN", filer.primarySSN),
    element("SpouseSSN", filer.spouse?.ssn),
    element("NameLine1Txt", filer.nameLine1),
    element("PrimaryNameControlTxt", filer.nameControl),
    element("SpouseNameControlTxt", filer.spouse?.nameControl),
    buildAddress(filer.address),
    element("PhoneNum", filer.phone),
    element("EmailAddressTxt", filer.email),
  ];
  return elements("Filer", children);
}

function buildSoftwareBlock(filer: FilerIdentity): string {
  return [
    element("SoftwareId", filer.softwareId),
    element("SoftwareVersionNum", filer.softwareVersionNum),
  ].filter((s) => s !== "").join("");
}

function buildOriginatorBlock(filer: FilerIdentity): string {
  if (!filer.originator) return "";
  const children = [
    element("EFIN", filer.originator.efin),
    element("OriginatorTypeCd", filer.originator.originatorType),
    element("PractitionerPINGrp", filer.originator.practitionerPIN
      ? element("PIN", filer.originator.practitionerPIN)
      : undefined),
  ];
  return elements("OriginatorGrp", children);
}

function buildOnlineFilerBlock(filer: FilerIdentity): string {
  if (!filer.onlineFiler) return "";
  const children = [
    element("IPAddr", filer.onlineFiler.ipAddress),
    element("DeviceId", filer.onlineFiler.deviceId),
    element("RoutingTransitNum", filer.onlineFiler.routingTransitNumber),
  ];
  return elements("OnlineFilerInformation", children);
}

function buildPINBlock(filer: FilerIdentity): string {
  return [
    element("PINEnteredByCd", filer.pinEnteredBy),
    element("PrimaryPINEnteredByCd", filer.pinEnteredBy),
    element("TaxpayerPIN", filer.signaturePin),
    element("SpousePIN", filer.spouse?.signaturePin),
    element("PrimaryIPPIN", filer.ipPin),
    element("SpouseIPPIN", filer.spouse?.ipPin),
  ].filter((s) => s !== "").join("");
}

function buildBankAccountBlock(filer: FilerIdentity): string {
  if (!filer.bankAccount) return "";
  const children = [
    element("RoutingTransitNum", filer.bankAccount.routingNumber),
    element("DepositorAccountNum", filer.bankAccount.accountNumber),
    element("BankAccountTypeCd", filer.bankAccount.accountType),
  ];
  return elements("BankAccountGrp", children);
}

// ─── Main builder ─────────────────────────────────────────────────────────────

export function buildReturnHeader(
  filer?: FilerIdentity,
  year = 2025,
  returnType = "1040",
): string {
  const headerChildren = [
    element("ReturnType", returnType),
    element("TaxPeriodBeginDate", `${year}-01-01`),
    element("TaxPeriodEndDate", `${year}-12-31`),
  ];

  if (filer === undefined) {
    return elements("ReturnHeader", headerChildren);
  }

  headerChildren.push(
    element("Timestamp", filer.timestamp),
    buildSoftwareBlock(filer),
    buildOriginatorBlock(filer),
    buildOnlineFilerBlock(filer),
    buildFilerBlock(filer),
    element("FilingStatusCd", String(filer.filingStatus)),
    buildPINBlock(filer),
    buildBankAccountBlock(filer),
  );

  return elements("ReturnHeader", headerChildren);
}
