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

export interface PreparedByInfo {
  // IRS PTIN (P + 8 digits). Absent when self_prepared is true.
  readonly ptin?: string;
  readonly firmName?: string;
  readonly firmEin?: string;
  readonly firmAddressLine1?: string;
  readonly firmCity?: string;
  readonly firmState?: string;
  readonly firmZip?: string;
  // When true the IRS SelfPreparedReturnIndicator is emitted instead of PaidPreparerInfo
  readonly selfPrepared?: boolean;
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

  // Paid preparer / self-prepared indicator
  readonly preparedBy?: PreparedByInfo;

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
  // XSD-required sequence (ReturnHeader1040x.xsd Filer element):
  //   PrimarySSN → [SpouseSSN] → NameLine1Txt → [InCareOfNm] →
  //   PrimaryNameControlTxt → [SpouseNameControlTxt] →
  //   (USAddress | ForeignAddress) → [(PhoneNum | ForeignPhoneNum)]
  // FilingStatusCd and EmailAddressTxt are NOT part of the Filer block in the header.
  const children = [
    element("PrimarySSN", filer.primarySSN),
    element("SpouseSSN", filer.spouse?.ssn),
    element("NameLine1Txt", filer.nameLine1),
    element("PrimaryNameControlTxt", filer.nameControl),
    element("SpouseNameControlTxt", filer.spouse?.nameControl),
    buildAddress(filer.address),
    element("PhoneNum", filer.phone),
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

function buildPaidPreparerBlock(filer: FilerIdentity): string {
  if (!filer.preparedBy) return "";
  if (filer.preparedBy.selfPrepared === true) {
    return element("SelfPreparedReturnIndicator", "X");
  }
  const children = [
    element("PTIN", filer.preparedBy.ptin),
    element("FirmName", filer.preparedBy.firmName),
    element("FirmEIN", filer.preparedBy.firmEin),
    element("FirmAddressLine1", filer.preparedBy.firmAddressLine1),
    element("FirmCityNm", filer.preparedBy.firmCity),
    element("FirmStateAbbreviationCd", filer.preparedBy.firmState),
    element("FirmZIPCd", filer.preparedBy.firmZip),
  ];
  return elements("PaidPreparerInfo", children);
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

/**
 * Formats a JS Date (or ISO string) as an IRS TimestampType: "YYYY-MM-DDTHH:MM:SS-05:00".
 * Uses a fixed UTC offset of -05:00 (EST) as a reasonable default for tests/offline use.
 */
function irsTimestamp(ts?: string): string {
  const d = ts ? new Date(ts) : new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}-05:00`;
}

export function buildReturnHeader(
  filer?: FilerIdentity,
  year = 2025,
  returnType = "1040",
): string {
  const ts = irsTimestamp(filer?.timestamp);
  const softwareId = filer?.softwareId ?? "00000001";
  const softwareVersionNum = filer?.softwareVersionNum;
  const efin = filer?.originator?.efin ?? "000000";
  const originatorType = filer?.originator?.originatorType ?? "ERO";

  // XSD-required sequence (ReturnHeader1040x.xsd):
  //   ReturnTs → TaxYr → TaxPeriodBeginDt → TaxPeriodEndDt →
  //   SoftwareId → [SoftwareVersionNum] → OriginatorGrp →
  //   PINTypeCd → JuratDisclosureCd → ReturnType → Filer →
  //   [PaidPreparerInformationGrp] → [OnlineFilerInformation]
  const headerChildren = [
    element("ReturnTs", ts),
    element("TaxYr", String(year)),
    element("TaxPeriodBeginDt", `${year}-01-01`),
    element("TaxPeriodEndDt", `${year}-12-31`),
    element("SoftwareId", softwareId),
    element("SoftwareVersionNum", softwareVersionNum),
    elements("OriginatorGrp", [
      element("EFIN", efin),
      element("OriginatorTypeCd", originatorType),
      ...(filer?.originator?.practitionerPIN
        ? [elements("PractitionerPINGrp", [
            element("EFIN", efin),
            element("PIN", filer.originator.practitionerPIN),
          ])]
        : []),
    ]),
    element("PINTypeCd", "Self-Select On-Line"),
    element("JuratDisclosureCd", "Online Self Select PIN"),
    element("ReturnTypeCd", returnType),
  ];

  if (filer !== undefined) {
    headerChildren.push(
      buildFilerBlock(filer),
      buildPaidPreparerBlock(filer),
      buildOnlineFilerBlock(filer),
    );
  } else {
    // XSD requires <Filer> with PrimarySSN, NameLine1Txt, PrimaryNameControlTxt,
    // and either USAddress or ForeignAddress (all required per ReturnHeader1040x.xsd §338).
    // Emit a placeholder block so the schema validator accepts the document
    // when no filer identity is provided (test/preview use case).
    const placeholderAddress = elements("USAddress", [
      element("AddressLine1Txt", "123 Main St"),
      element("CityNm", "Anytown"),
      element("StateAbbreviationCd", "CA"),
      element("ZIPCd", "00000"),
    ]);
    headerChildren.push(
      elements("Filer", [
        element("PrimarySSN", "000000000"),
        element("NameLine1Txt", "UNKNOWN FILER"),
        element("PrimaryNameControlTxt", "UNKN"),
        placeholderAddress,
      ]),
    );
  }

  const inner = headerChildren.filter((s) => s !== "").join("");
  // binaryAttachmentCnt is a required attribute per ReturnHeader1040x.xsd §990.
  // Value is 0 for returns with no binary attachments.
  return `<ReturnHeader binaryAttachmentCnt="0">${inner}</ReturnHeader>`;
}
