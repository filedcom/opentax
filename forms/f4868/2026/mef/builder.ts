import { element, elements } from "../../../f1040/mef/xml.ts";
import {
  AccountType,
  type FilerIdentity,
  FilingStatus,
  PINEnteredBy,
  returnHeaderNameLine1,
} from "../../../f1040/mef/header.ts";
import {
  BankAccountType,
  type F4868Input,
  inputSchema,
  OriginatorType,
  PinType,
} from "../../nodes/inputs/general/filing/f4868/index.ts";
import {
  type Form4868Lines,
  inputSchema as linesSchema,
} from "../../nodes/outputs/general/filing/form4868/index.ts";
import { F4868_2026_CONFIG } from "../config.ts";

export type Form4868XmlOptions = {
  /** ISO instant for ReturnTs; defaults to now. */
  readonly timestamp?: string;
};

const digits = (ssn: string) => ssn.replace(/\D/g, "");

/** First four letters of the last name, as the Form 1040 header derives it. */
function nameControl(lastName: string): string {
  return lastName.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4);
}

function irsTimestamp(iso: string | undefined): string {
  const d = iso ? new Date(iso) : new Date();
  return `${d.toISOString().slice(0, 19)}-05:00`;
}

/** NameLine1Txt per Pub 4164 §12.5, through the Form 1040 header's name rules. */
export function form4868NameLine1(input: F4868Input): string {
  const { taxpayer, spouse } = input;
  const filer: FilerIdentity = {
    primarySSN: digits(taxpayer.ssn),
    nameLine1: `${taxpayer.first_name} ${taxpayer.last_name}`,
    nameControl: nameControl(taxpayer.last_name),
    firstName: taxpayer.first_name,
    middleInitial: taxpayer.middle_initial,
    lastName: taxpayer.last_name,
    address: { line1: "", city: "", state: "", zip: "" },
    filingStatus: spouse
      ? FilingStatus.MarriedFilingJointly
      : FilingStatus.Single,
    spouse: spouse && {
      ssn: digits(spouse.ssn),
      firstName: spouse.first_name,
      middleInitial: spouse.middle_initial,
      lastName: spouse.last_name,
      nameControl: nameControl(spouse.last_name),
    },
  };
  return returnHeaderNameLine1(filer);
}

function address(input: F4868Input): string {
  const a = input.address;
  if (a.foreign_country_code) {
    return elements("ForeignAddress", [
      element("AddressLine1Txt", a.line1),
      element("AddressLine2Txt", a.line2),
      element("CityNm", a.city),
      element("ProvinceOrStateNm", a.foreign_province_state),
      element("CountryCd", a.foreign_country_code),
      element("ForeignPostalCd", a.foreign_postal_code),
    ]);
  }
  return elements("USAddress", [
    element("AddressLine1Txt", a.line1),
    element("AddressLine2Txt", a.line2),
    element("CityNm", a.city),
    element("StateAbbreviationCd", a.state),
    element("ZIPCd", a.zip),
  ]);
}

function inCareOf(name: string | undefined): string | undefined {
  if (!name) return undefined;
  return name.startsWith("% ") ? name : `% ${name}`;
}

function juratDisclosure(input: F4868Input): string | undefined {
  if (!input.pin_type) return undefined;
  return input.pin_type === PinType.Practitioner && input.payment
    ? "Form 4868 with Practitioner PIN and EFW"
    : "Form 4868";
}

function pinEnteredBy(
  signer: F4868Input["taxpayer"] | undefined,
): string | undefined {
  if (!signer?.signature_pin) return undefined;
  return signer.pin_entered_by ?? PINEnteredBy.Taxpayer;
}

/** ReturnHeader4868.xsd ReturnHeaderType, in schema order. */
export function buildForm4868Header(
  input: F4868Input,
  options: Form4868XmlOptions = {},
): string {
  const year = F4868_2026_CONFIG.taxYear;
  const { taxpayer, spouse, originator } = input;
  const efin = originator?.efin ?? "000000";
  const children = [
    element("ReturnTs", irsTimestamp(options.timestamp)),
    element("TaxYr", String(year)),
    element("TaxPeriodBeginDt", `${year}-01-01`),
    element("TaxPeriodEndDt", `${year}-12-31`),
    element("SoftwareId", input.software_id ?? "00000001"),
    elements("OriginatorGrp", [
      element("EFIN", efin),
      element("OriginatorTypeCd", originator?.type ?? OriginatorType.ERO),
      elements("PractitionerPINGrp", [
        originator?.practitioner_pin ? element("EFIN", efin) : "",
        element("PIN", originator?.practitioner_pin),
      ]),
    ]),
    elements("SelfSelectPINGrp", [
      element("PrimaryBirthDt", taxpayer.birth_date),
      element("SpouseBirthDt", spouse?.birth_date),
      element("PrimaryPriorYearAGIAmt", taxpayer.prior_year_agi),
      element("SpousePriorYearAGIAmt", spouse?.prior_year_agi),
      element("PrimaryPriorYearPIN", taxpayer.prior_year_pin),
      element("SpousePriorYearPIN", spouse?.prior_year_pin),
    ]),
    element("PINTypeCd", input.pin_type),
    element("JuratDisclosureCd", juratDisclosure(input)),
    element("PrimaryPINEnteredByCd", pinEnteredBy(taxpayer)),
    element("SpousePINEnteredByCd", pinEnteredBy(spouse)),
    element("PrimarySignaturePIN", taxpayer.signature_pin),
    element("SpouseSignaturePIN", spouse?.signature_pin),
    element("PrimarySignatureDt", taxpayer.signature_date),
    element("SpouseSignatureDt", spouse?.signature_date),
    element("ReturnTypeCd", "4868"),
    elements("Filer", [
      element("PrimarySSN", digits(taxpayer.ssn)),
      element("SpouseSSN", spouse && digits(spouse.ssn)),
      element("NameLine1Txt", form4868NameLine1(input)),
      element("InCareOfNm", inCareOf(input.in_care_of)),
      element("PrimaryNameControlTxt", nameControl(taxpayer.last_name)),
      element("SpouseNameControlTxt", spouse && nameControl(spouse.last_name)),
      address(input),
    ]),
  ];
  return `<ReturnHeader binaryAttachmentCnt="0">${
    children.join("")
  }</ReturnHeader>`;
}

const checkbox = (checked: boolean) => checked ? "X" : undefined;

/** IRS4868.xsd IRS4868Type: Part II lines 4 through 9. */
export function buildIrs4868(lines: Form4868Lines): string {
  return [
    element("TotalTaxLiabilityAmt", lines.line4_total_tax_liability),
    element("TotalPaymentsAmt", lines.line5_total_payments),
    element("BalanceDueAmt", lines.line6_balance_due),
    element(
      "TaxpayerIsPayingAmt",
      lines.line7_amount_paying > 0 ? lines.line7_amount_paying : undefined,
    ),
    element("TaxpayerAbroadInd", checkbox(lines.line8_out_of_country)),
    element(
      "NonresWithNoWagesSubjToWhInd",
      checkbox(lines.line9_1040nr_no_wages_withheld),
    ),
  ].join("");
}

/** IRSPayment.xsd IRSPaymentType; PaymentAmt keeps cents. */
export function buildIrsPayment(
  payment: NonNullable<F4868Input["payment"]>,
): string {
  return [
    element("RoutingTransitNum", payment.routing_transit_number),
    element("BankAccountNum", payment.bank_account_number),
    element(
      "BankAccountTypeCd",
      payment.bank_account_type === BankAccountType.Savings
        ? AccountType.Savings
        : AccountType.Checking,
    ),
    element("PaymentAmt", payment.amount.toFixed(2)),
    element("RequestedPaymentDt", payment.requested_payment_date),
    element("TaxpayerDaytimePhoneNum", payment.daytime_phone),
  ].join("");
}

/** The Form 4868 source and its computed lines, as the graph left them. */
export function form4868Return(
  pending: Readonly<Record<string, unknown>>,
): { readonly input: F4868Input; readonly lines: Form4868Lines } {
  if (pending.f4868 === undefined || pending.form4868 === undefined) {
    throw new Error("Form 4868 export needs a computed f4868 input");
  }
  return {
    input: inputSchema.parse(pending.f4868),
    lines: linesSchema.parse(pending.form4868),
  };
}

/** Return4868.xsd: one IRS4868 and, with an electronic payment, one IRSPayment. */
export function buildForm4868Xml(
  pending: Readonly<Record<string, unknown>>,
  options: Form4868XmlOptions = {},
): string {
  const { input, lines } = form4868Return(pending);
  const documents = [
    `<IRS4868 documentId="IRS48680" documentName="IRS4868">${
      buildIrs4868(lines)
    }</IRS4868>`,
    input.payment
      ? `<IRSPayment documentId="IRSPayment1" documentName="IRSPayment">${
        buildIrsPayment(input.payment)
      }</IRSPayment>`
      : "",
  ].filter((document) => document !== "");
  const returnData = `<ReturnData documentCnt="${documents.length}">${
    documents.join("")
  }</ReturnData>`;
  return `<Return returnVersion="${F4868_2026_CONFIG.mefSchemaVersion}" xmlns="http://www.irs.gov/efile" xmlns:efile="http://www.irs.gov/efile">${
    buildForm4868Header(input, options)
  }${returnData}</Return>`;
}
