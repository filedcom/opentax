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
  readonly signatureDate?: string;
  readonly birthDate?: string;
  readonly priorYearAgi?: number;
  readonly priorYearPin?: string;
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
  readonly personName?: string;
  readonly selfEmployed?: boolean;
  readonly signatureDate?: string;
  readonly phone?: string;
  readonly firmName?: string;
  readonly firmEin?: string;
  readonly firmAddressLine1?: string;
  readonly firmCity?: string;
  readonly firmState?: string;
  readonly firmZip?: string;
  // A self-prepared return files no preparer group in the header.
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
  /** "First M" — for PDF fields that combine first name and middle initial. */
  readonly firstNameWithInitial?: string;
  /** "First M Last" — for schedule headers ("Name(s) shown on Form 1040"). */
  readonly fullName?: string;
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
  readonly signatureDate?: string;
  readonly priorYearAgi?: number;
  readonly priorYearPin?: string;
  readonly birthDate?: string;
  readonly inCareOf?: string;

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

interface NameParts {
  readonly first: string;
  readonly middle?: string;
  readonly last: string;
  readonly suffix?: string;
  readonly deceased?: boolean;
}

const MAX_NAME_LINE = 35;

/** Pub 4164 §12.5 keeps only letters, hyphens and single spaces. */
function nameToken(value: string | undefined): string | undefined {
  const cleaned = value?.toUpperCase().replace(/[^A-Z -]/g, "")
    .replace(/\s+/g, " ").trim();
  return cleaned || undefined;
}

function given(person: NameParts): string {
  return person.middle ? `${person.first} ${person.middle}` : person.first;
}

/**
 * Pub 4164 §12.5 Table 12-1: "JOHN A<SMITH<III", joint "JOHN A & JANE B<SMITH",
 * and a spouse with another last name "CARL A<JONES<& ANGIE MYER". A deceased
 * taxpayer's DECD follows the first name on a same-surname joint line
 * ("JOHN A & JANE B DECD<DOE") and the surname otherwise ("JOHN A<DOE<DECD").
 */
export function irsNameLine1(
  primary: NameParts,
  spouse?: NameParts,
): string {
  const decd = (x: NameParts) => x.deceased ? " DECD" : "";
  // The surname's tail: "<JR", "<JR DECD" or "<DECD".
  const tail = (x: NameParts) =>
    x.suffix ? `<${x.suffix}${decd(x)}` : x.deceased ? "<DECD" : "";
  const build = (p: NameParts, s: NameParts | undefined): string => {
    if (!s) return `${given(p)}<${p.last}${tail(p)}`;
    if (s.last === p.last) {
      const suffix = p.suffix ? `<${p.suffix}` : "";
      return `${given(p)}${decd(p)} & ${given(s)}${decd(s)}<${p.last}${suffix}`;
    }
    const spouseName = `& ${given(s)} ${s.last}${decd(s)}`;
    const primaryTail = tail(p);
    return primaryTail
      ? `${given(p)}<${p.last}${primaryTail} ${spouseName}`
      : `${given(p)}<${p.last}<${spouseName}`;
  };
  // Shorten in the Pub 4164 order until the line fits in 35 characters.
  const steps: Array<[NameParts, NameParts | undefined]> = [
    [primary, spouse],
    [primary, spouse && { ...spouse, middle: spouse.middle?.slice(0, 1) }],
    [{ ...primary, middle: primary.middle?.slice(0, 1) }, spouse && {
      ...spouse,
      middle: spouse.middle?.slice(0, 1),
    }],
    [{ ...primary, middle: primary.middle?.slice(0, 1) }, spouse && {
      ...spouse,
      middle: undefined,
    }],
    [{ ...primary, middle: undefined }, spouse && {
      ...spouse,
      middle: undefined,
    }],
    [{ ...primary, middle: undefined }, spouse && {
      ...spouse,
      first: spouse.first.slice(0, 1),
      middle: undefined,
    }],
    [{ ...primary, first: primary.first.slice(0, 1), middle: undefined },
      spouse && { ...spouse, first: spouse.first.slice(0, 1), middle: undefined }],
  ];
  for (const [p, s] of steps) {
    const line = build(p, s);
    if (line.length <= MAX_NAME_LINE) return line;
  }
  return build(...steps.at(-1)!).slice(0, MAX_NAME_LINE);
}

function nameParts(
  first: string | undefined,
  middle: string | undefined,
  last: string | undefined,
  suffix?: string,
  deceased?: boolean,
): NameParts | undefined {
  const f = nameToken(first), l = nameToken(last);
  return f && l
    ? {
      first: f,
      middle: nameToken(middle),
      last: l,
      suffix: nameToken(suffix),
      deceased,
    }
    : undefined;
}

/** IRS header name per Pub 4164 §12.5; nameLine1 stays readable for PDFs. */
export function returnHeaderNameLine1(filer: FilerIdentity): string {
  const primary = nameParts(
    filer.firstName,
    filer.middleInitial,
    filer.lastName,
    filer.suffix,
    filer.deceased === true || Boolean(filer.deathDate),
  );
  if (primary) {
    const spouse = filer.filingStatus === FilingStatus.MarriedFilingJointly &&
        filer.spouse
      ? nameParts(
        filer.spouse.firstName,
        filer.spouse.middleInitial,
        filer.spouse.lastName,
        undefined,
        filer.spouse.deceased === true || Boolean(filer.spouse.deathDate),
      )
      : undefined;
    return irsNameLine1(primary, spouse);
  }
  // Direct FilerIdentity callers can supply only a display name.
  return filer.nameLine1.trim().replace(/\s+/g, "<");
}

/** One person's NameLine1Type value, e.g. an IRA owner on Form 8606. */
export function personNameLine1(
  first: string | undefined,
  middle: string | undefined,
  last: string | undefined,
): string | undefined {
  const person = nameParts(first, middle, last);
  return person ? irsNameLine1(person) : undefined;
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
    element("NameLine1Txt", returnHeaderNameLine1(filer)),
    element("InCareOfNm", inCareOfName(filer.inCareOf)),
    element("PrimaryNameControlTxt", filer.nameControl),
    element("SpouseNameControlTxt", filer.spouse?.nameControl),
    buildAddress(filer.address),
    element("PhoneNum", filer.phone),
  ];
  return elements("Filer", children);
}

/** InCareOfNameType begins with "% " (ReturnHeader1040x.xsd Filer/InCareOfNm). */
function inCareOfName(name: string | undefined): string | undefined {
  const trimmed = name?.trim();
  if (!trimmed) return undefined;
  return trimmed.startsWith("% ") ? trimmed : `% ${trimmed}`;
}

const digits = (value: string | undefined) => value?.replace(/\D/g, "");

function buildPaidPreparerBlock(filer: FilerIdentity): string {
  const preparer = filer.preparedBy;
  if (!preparer || preparer.selfPrepared === true) return "";
  // ReturnHeader1040x.xsd PaidPreparerInformationGrp sequence.
  return elements("PaidPreparerInformationGrp", [
    element("SignatureDt", preparer.signatureDate),
    element("SelfEmployedInd", preparer.selfEmployed ? "X" : undefined),
    element("PTIN", preparer.ptin),
    element("PreparerFirmEIN", digits(preparer.firmEin)),
    element("PreparerPersonNm", preparer.personName),
    elements("PreparerFirmName", [
      element("BusinessNameLine1Txt", preparer.firmName),
    ]),
    elements("PreparerUSAddress", [
      element("AddressLine1Txt", preparer.firmAddressLine1),
      element("CityNm", preparer.firmCity),
      element("StateAbbreviationCd", preparer.firmState),
      element("ZIPCd", preparer.firmZip),
    ]),
    element("PhoneNum", digits(preparer.phone)),
  ]);
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

// ─── Main builder ─────────────────────────────────────────────────────────────

/**
 * Formats a JS Date (or ISO string) as an IRS TimestampType: "YYYY-MM-DDTHH:MM:SS-05:00".
 * Uses a fixed UTC offset of -05:00 (EST) as a reasonable default for tests/offline use.
 */
/** Pub 4164 §8.9.2: Self-Select PIN signers are authenticated by birth date and prior-year AGI or PIN. */
function selfSelectPinGroup(filer: FilerIdentity): string {
  return elements("SelfSelectPINGrp", [
    element("PrimaryBirthDt", filer.birthDate),
    element("SpouseBirthDt", filer.spouse?.birthDate),
    element("PrimaryPriorYearAGIAmt", filer.priorYearAgi),
    element("SpousePriorYearAGIAmt", filer.spouse?.priorYearAgi),
    element("PrimaryPriorYearPIN", filer.priorYearPin),
    element("SpousePriorYearPIN", filer.spouse?.priorYearPin),
  ]);
}

function irsTimestamp(ts?: string): string {
  const d = ts ? new Date(ts) : new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${
    pad(d.getUTCDate())
  }` +
    `T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${
      pad(d.getUTCSeconds())
    }-05:00`;
}

export function buildReturnHeader(
  filer?: FilerIdentity,
  year = 2025,
  returnType = "1040",
  binaryAttachmentCount = 0,
): string {
  if (!filer) {
    throw new Error("MeF return header requires a real filer identity");
  }
  if (!/^\d{9}$/.test(filer.primarySSN) || filer.primarySSN === "000000000") {
    throw new Error(
      "MeF return header requires a nine-digit filer SSN or ITIN",
    );
  }
  if (!filer.nameLine1.trim() || !filer.nameControl.trim()) {
    throw new Error(
      "MeF return header requires the filer's name and name control",
    );
  }
  const address = filer.address;
  if (
    !address.line1.trim() || !address.city.trim() ||
    (address.foreignCountry
      ? !address.foreignCountry.trim()
      : !address.state.trim() || !address.zip.trim())
  ) {
    throw new Error("MeF return header requires the filer's mailing address");
  }
  if (
    !Number.isSafeInteger(binaryAttachmentCount) || binaryAttachmentCount < 0
  ) {
    throw new Error(
      "MeF binary attachment count must be a nonnegative integer",
    );
  }
  const ts = irsTimestamp(filer?.timestamp);
  const softwareId = filer?.softwareId ?? "00000001";
  const softwareVersionNum = filer?.softwareVersionNum;
  const efin = filer?.originator?.efin ?? "000000";
  const originatorType = filer?.originator?.originatorType ?? "ERO";

  // XSD-required sequence (ReturnHeader1040x.xsd):
  //   ReturnTs → TaxYr → TaxPeriodBeginDt → TaxPeriodEndDt →
  //   SoftwareId → [SoftwareVersionNum] → OriginatorGrp →
  //   [SelfSelectPINGrp] → [IdentityProtectionPIN] → [SpouseIdentityProtectionPIN] →
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
    selfSelectPinGroup(filer),
    element("IdentityProtectionPIN", filer.ipPin),
    element("SpouseIdentityProtectionPIN", filer.spouse?.ipPin),
    element("PINTypeCd", "Self-Select On-Line"),
    element("JuratDisclosureCd", "Online Self Select PIN"),
    element(
      "PrimaryPINEnteredByCd",
      filer.signaturePin ? filer.pinEnteredBy : undefined,
    ),
    element(
      "SpousePINEnteredByCd",
      filer.spouse?.signaturePin ? filer.pinEnteredBy : undefined,
    ),
    element("PrimarySignaturePIN", filer.signaturePin),
    element("SpouseSignaturePIN", filer.spouse?.signaturePin),
    element("PrimarySignatureDt", filer.signatureDate),
    element("SpouseSignatureDt", filer.spouse?.signatureDate),
    element("ReturnTypeCd", returnType),
  ];

  headerChildren.push(
    buildFilerBlock(filer),
    buildPaidPreparerBlock(filer),
    buildOnlineFilerBlock(filer),
  );

  const inner = headerChildren.filter((s) => s !== "").join("");
  // binaryAttachmentCnt is a required attribute per ReturnHeader1040x.xsd §990.
  return `<ReturnHeader binaryAttachmentCnt="${binaryAttachmentCount}">${inner}</ReturnHeader>`;
}
