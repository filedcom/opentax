/**
 * Form 4868 business rules, TY2026 v1.0 (irs/4868/rules/4868_Business_Rules_2026v1.0.pdf),
 * evaluated on the emitted Return4868 XML. Rules that need the received date, the
 * submission manifest or the IRS e-File database are left to transmission.
 */
import { parseEmittedReturn } from "../../../../core/validation/emitted-documents.ts";
import { evaluateRules } from "../../../../core/validation/engine.ts";
import {
  all,
  charAfterIsAlpha,
  charCountAtMost,
  contains,
  dateLteField,
  eqField,
  eqStr,
  hasValue,
  ifThen,
  isAtsTest,
  not,
  notGtNum,
  noValue,
  ssnMiddleDigitsEq,
  ssnNotEqual,
  validRTN,
  validSSN,
} from "../../../../core/validation/predicates.ts";
import { rule } from "../../../../core/validation/rule-builder.ts";
import type {
  DiagnosticsReport,
  ReturnContext,
  RuleCheck,
  RuleDef,
} from "../../../../core/validation/types.ts";
import { F4868_2026_CONFIG } from "../../2026/config.ts";

export type Form4868RuleFacts = {
  /** Pub 1436 test return: SSNs carry "00" in the fourth and fifth digits. */
  readonly atsTestSubmission?: boolean;
};

const DUE_DATE = "DueDt";
const OUT_OF_COUNTRY_DUE_DATE = "OutOfCountryDueDt";
const PAYMENTS = "IRSPaymentCnt";
const DOCUMENTS = "ReturnDataDocumentCnt";
const DECLARED_DOCUMENTS = "documentCnt";
const ATTACHMENTS = "binaryAttachmentCnt";
const NAMESPACES = "ReturnNamespacesValid";

const payment = hasValue("RoutingTransitNum");
const abroad = (ctx: ReturnContext) =>
  ctx.hasValue("TaxpayerAbroadInd") ||
  ctx.hasValue("NonresWithNoWagesSubjToWhInd");
const pinType = (value: string) => eqStr("PINTypeCd", value);
const spouse = hasValue("SpouseSSN");

const notAllZeros = (xml: string): RuleCheck => (ctx) =>
  !ctx.hasValue(xml) || /[^0]/.test(String(ctx.field(xml)));

/** Pub 4164: ZIP digits 4–5 may be "00" only for these codes. */
const ZIP_00_EXCEPTIONS = new Set([
  "00800",
  "20500",
  "34000",
  "00600",
  "96100",
  "96900",
]);
const zipNot00: RuleCheck = (ctx) => {
  const zip = String(ctx.field("ZIPCd") ?? "");
  return !zip || zip.slice(3, 5) !== "00" ||
    ZIP_00_EXCEPTIONS.has(zip.slice(0, 5));
};

const MILITARY_CITIES = new Set(["APO", "DPO", "FPO"]);
const MILITARY_STATES = new Set(["AA", "AE", "AP"]);
const militaryCity: RuleCheck = (ctx) =>
  MILITARY_CITIES.has(String(ctx.field("USAddress/CityNm") ?? ""));
const militaryState: RuleCheck = (ctx) =>
  MILITARY_STATES.has(String(ctx.field("StateAbbreviationCd") ?? ""));

export const FORM4868_RULES: readonly RuleDef[] = [
  rule(
    "X0000-008",
    "reject_and_stop",
    "xml_error",
    (ctx) => ctx.field(NAMESPACES) === true,
    'The namespace declarations in the root element of the return (\'Return\' element) must be as follows: xmlns="http://www.irs.gov/efile" and xmlns:efile="http://www.irs.gov/efile".',
  ),
  rule(
    "R0000-003",
    "reject_and_stop",
    "missing_data",
    hasValue("returnVersion"),
    "The return version (attribute 'returnVersion' of the Return element) must be specified for each return in the return header.",
  ),
  rule(
    "R0000-004-01",
    "reject_and_stop",
    "data_mismatch",
    all(
      eqStr("ReturnTypeCd", "4868"),
      eqStr("returnVersion", F4868_2026_CONFIG.mefSchemaVersion),
    ),
    "'ReturnTypeCd' (specified in the Return Header) and the return version (specified by the 'returnVersion' attribute of the 'Return' element) of the return must match the return type and the version supported by the Modernized e-File system.",
  ),
  rule(
    "R0000-195",
    "reject_and_stop",
    "incorrect_data",
    (ctx) =>
      ctx.num(ATTACHMENTS) === 0 && ctx.formCount("BinaryAttachment") === 0,
    "Submission must not contain a Binary Attachment.",
  ),
  rule(
    "F4868-003-01",
    "reject",
    "incorrect_data",
    ifThen(
      spouse,
      all(hasValue("NameLine1Txt"), contains("NameLine1Txt", "&")),
    ),
    "If 'SpouseSSN' has a value in the Return Header, then Filer Name in the Return Header 'NameLine1Txt' must contain an ampersand.",
  ),
  rule(
    "F4868-007-01",
    "reject",
    "incorrect_data",
    ifThen(
      all(payment, pinType("Self-Select Practitioner")),
      eqStr("JuratDisclosureCd", "Form 4868"),
    ),
    "If IRS Payment Record or IRS ES Payment Record is present, and 'PINTypeCd' has the value \"Self-Select Practitioner\", then 'JuratDisclosureCd' in the Return Header must have the value \"Form 4868\".",
  ),
  rule(
    "F4868-008-01",
    "reject",
    "incorrect_data",
    ifThen(
      all(payment, pinType("Practitioner")),
      eqStr("JuratDisclosureCd", "Form 4868 with Practitioner PIN and EFW"),
    ),
    "If IRS Payment Record or IRS ES Payment Record is present, and 'PINTypeCd' has the value \"Practitioner\" in the Return Header, then 'JuratDisclosureCd' in the Return Header must have the value \"Form 4868 with Practitioner PIN and EFW\".",
  ),
  rule(
    "F4868-009-01",
    "reject",
    "incorrect_data",
    ifThen(
      all(payment, pinType("Self-Select On-Line")),
      eqStr("JuratDisclosureCd", "Form 4868"),
    ),
    "If IRS Payment Record or IRS ES Payment Record is present, and 'PINTypeCd' has the value \"Self-Select On-Line\", then 'JuratDisclosureCd' in the Return Header must have the value \"Form 4868\".",
  ),
  // Offline half: the due date. "Not more than 5 days prior to the received date" is a transmission check.
  rule(
    "FPYMT-050-01",
    "reject",
    "incorrect_data",
    ifThen(
      all(payment, not(abroad)),
      dateLteField("RequestedPaymentDt", DUE_DATE),
    ),
    "If IRS Payment Record is present, then 'RequestedPaymentDt' in the IRS Payment Record must be on or before the due date but not more than 5 days prior to the received date, unless Form 4868 Line 8 checkbox or Line 9 checkbox is checked.",
  ),
  rule(
    "FPYMT-051-01",
    "reject",
    "incorrect_data",
    ifThen(
      all(payment, abroad),
      dateLteField("RequestedPaymentDt", OUT_OF_COUNTRY_DUE_DATE),
    ),
    "If IRS Payment Record is present and Form 4868 Line 8 checkbox or Line 9 checkbox is checked, then 'RequestedPaymentDt' in the IRS Payment Record must be on or before the extended due date but not more than 5 days prior to the received date.",
  ),
  rule(
    "FPYMT-052-02",
    "reject",
    "data_mismatch",
    ifThen(payment, eqField("PaymentAmt", "TaxpayerIsPayingAmt")),
    "If IRS Payment Record is present, then 'PaymentAmt' in the IRS Payment Record must be equal to Form 4868, 'TaxpayerIsPayingAmt'.",
  ),
  rule(
    "FPYMT-057-03",
    "reject",
    "incorrect_data",
    notGtNum("PaymentAmt", 99_999_999),
    "'PaymentAmt' from each of the following payment structures must be less than or equal to 99,999,999: [IRSPayment] and [IRSESPayment] and [IRS965Payment] and [IRS1062Payment].",
  ),
  rule(
    "FPYMT-129",
    "reject",
    "incorrect_data",
    (ctx) => ctx.num(PAYMENTS) <= 1,
    "There must not be more than one instance of [IRSPayment] or [IRSPayment2] present in the return.",
  ),
  rule(
    "IND-006",
    "reject",
    "incorrect_data",
    ssnNotEqual("SpouseSSN", "PrimarySSN"),
    "Spouse SSN in the return must not be the same as the Primary SSN.",
  ),
  rule(
    "IND-699-02",
    "reject",
    "incorrect_data",
    ifThen(
      pinType("Practitioner"),
      all(
        noValue("PrimaryPriorYearAGIAmt"),
        noValue("PrimaryPriorYearPIN"),
        noValue("SpousePriorYearAGIAmt"),
        noValue("SpousePriorYearPIN"),
      ),
    ),
    "If 'PINTypeCd' in the Return Header has the value \"Practitioner\", then the following must not have a value: 'PrimaryPriorYearAGIAmt' and 'PrimaryPriorYearPIN' and 'SpousePriorYearAGIAmt' and 'SpousePriorYearPIN'.",
  ),
  rule(
    "R0000-019",
    "reject",
    "data_mismatch",
    (ctx) => ctx.num(DOCUMENTS) === ctx.num(DECLARED_DOCUMENTS),
    "The number of return documents (forms, schedules, and supporting documents) included in the return must be equal to the value of the 'documentCnt' attribute of the ReturnData.",
  ),
  rule(
    "R0000-030-01",
    "reject",
    "data_mismatch",
    ifThen(
      hasValue("PractitionerPINGrp/EFIN"),
      (ctx) =>
        ctx.field("PractitionerPINGrp/EFIN") ===
          ctx.field("OriginatorGrp/EFIN"),
    ),
    "If 'PractitionerPINGrp' in the Return Header has a value, then 'EFIN' in 'PractitionerPINGrp' must be the same as 'EFIN' in 'OriginatorGrp'.",
  ),
  rule(
    "R0000-046-01",
    "reject",
    "incorrect_data",
    zipNot00,
    "For US Addresses, the fourth and fifth digit of the 'ZipCd' of the Filer's address in the Return Header cannot both be zeros (\"00\"), except when the 'ZipCd' is 00800, 20500, 34000, 00600, 96100, 96900.",
  ),
  rule(
    "R0000-075-03",
    "reject",
    "incorrect_data",
    validRTN("RoutingTransitNum"),
    "'RoutingTransitNum' (RTN) must conform to the banking industry RTN algorithm.",
  ),
  rule(
    "R0000-092-02",
    "reject",
    "incorrect_data",
    validSSN("PrimarySSN"),
    "'PrimarySSN' in the Return Header must be within the valid range of SSN/ITIN and must not be an ATIN.",
  ),
  rule(
    "R0000-093-02",
    "reject",
    "incorrect_data",
    ifThen(spouse, validSSN("SpouseSSN")),
    "If Spouse SSN in the return has a value, then it must be within the valid range of SSN/ITIN and must not be an ATIN.",
  ),
  rule(
    "R0000-095-02",
    "reject",
    "incorrect_data",
    notAllZeros("PrimarySignaturePIN"),
    "'PrimarySignaturePIN' in the Return Header must not equal all zeros.",
  ),
  rule(
    "R0000-096-02",
    "reject",
    "incorrect_data",
    notAllZeros("SpouseSignaturePIN"),
    "'SpouseSignaturePIN' in the Return Header must not equal all zeros.",
  ),
  rule(
    "R0000-098-01",
    "reject",
    "incorrect_data",
    ifThen(
      payment,
      all(hasValue("PINTypeCd"), hasValue("PrimarySignaturePIN")),
    ),
    "If IRS Payment Record or IRS ES Payment Record is present, then 'PINTypeCd' and 'PrimarySignaturePIN' must have a value in the Return Header.",
  ),
  rule(
    "R0000-099-01",
    "reject",
    "missing_data",
    ifThen(
      all(payment, spouse),
      all(hasValue("PINTypeCd"), hasValue("SpouseSignaturePIN")),
    ),
    "If IRS Payment Record or IRS ES Payment Record is present and 'SpouseSSN' has a value in the Return Header, then 'PINTypeCd' and 'SpouseSignaturePIN' must have a value in the Return Header.",
  ),
  rule(
    "R0000-116-02",
    "reject",
    "incorrect_data",
    ifThen(militaryCity, militaryState),
    'If the Filer has a US address in the Return Header and if the value of \'CityNm\' is "APO" or "DPO" or "FPO", then \'StateAbbreviationCd\' must have the value "AA", "AE" or "AP".',
  ),
  rule(
    "R0000-117-01",
    "reject",
    "incorrect_data",
    ifThen(militaryState, militaryCity),
    'If the Filer has a US address in the Return Header and \'StateAbbreviationCd\' has the value "AA", "AE" or "AP" then the \'CityNm\' must be "APO" OR "DPO" OR "FPO".',
  ),
  rule(
    "R0000-123-01",
    "reject",
    "missing_data",
    ifThen(
      (ctx) => String(ctx.field("NameLine1Txt") ?? "").includes("&"),
      spouse,
    ),
    "If 'NameLine1Txt' in the Return Header contains an ampersand, then 'SpouseSSN' in the Return Header must have a value.",
  ),
  rule(
    "R0000-125-01",
    "reject",
    "incorrect_data",
    all(hasValue("NameLine1Txt"), contains("NameLine1Txt", "<")),
    "'NameLine1Txt' in the Return Header must contain a less-than sign (<).",
  ),
  rule(
    "R0000-126-01",
    "reject",
    "incorrect_data",
    charCountAtMost("NameLine1Txt", "<", 2),
    "There can be no more than two less-than signs (<) in 'NameLine1Txt' in the Return Header.",
  ),
  rule(
    "R0000-127-01",
    "reject",
    "incorrect_data",
    charAfterIsAlpha("NameLine1Txt", "<"),
    "The character following the first less-than sign in 'NameLine1Txt' in the Return Header must be an alphabetic character.",
  ),
  rule(
    "R0000-129-01",
    "reject",
    "incorrect_data",
    ifThen(isAtsTest, ssnMiddleDigitsEq("PrimarySSN", "00")),
    "The 4th and 5th digits of the 'PrimarySSN' in the Return Header must be equal to \"00\" for testing.",
  ),
  rule(
    "R0000-130-01",
    "reject",
    "incorrect_data",
    ifThen(all(isAtsTest, spouse), ssnMiddleDigitsEq("SpouseSSN", "00")),
    'The 4th and 5th digits of Spouse SSN in the return must be equal to "00" for testing.',
  ),
  rule(
    "R0000-192-01",
    "reject",
    "incorrect_data",
    notAllZeros("TaxpayerDaytimePhoneNum"),
    "Phone Number provided in the return must not be all zeros.",
  ),
  rule(
    "R0000-193-01",
    "reject",
    "incorrect_data",
    notAllZeros("BankAccountNum"),
    "Bank Account Number provided in the return must not be all zeros.",
  ),
  rule(
    "R0000-670-01",
    "reject",
    "missing_data",
    ifThen(
      all(payment, pinType("Self-Select Practitioner")),
      all(
        hasValue("PractitionerPINGrp/PIN"),
        hasValue("PrimaryBirthDt"),
        (ctx) =>
          ctx.hasValue("PrimaryPriorYearAGIAmt") ||
          ctx.hasValue("PrimaryPriorYearPIN"),
        hasValue("PrimaryPINEnteredByCd"),
        hasValue("PrimarySignaturePIN"),
        hasValue("PrimarySignatureDt"),
        hasValue("JuratDisclosureCd"),
      ),
    ),
    "If IRS Payment Record or IRS ES Payment Record is present, and PIN Type Code in the Return Header has the value \"Self-Select Practitioner\", then 'PractitionerPINGrp', 'PrimaryBirthDt', ['PrimaryPriorYearAGIAmt' or 'PrimaryPriorYearPIN'], 'PrimaryPINEnteredByCd', 'PrimarySignaturePIN', 'PrimarySignatureDt' and 'JuratDisclosureCd' must have a value in the Return Header.",
  ),
  rule(
    "R0000-671-01",
    "reject",
    "missing_data",
    ifThen(
      all(payment, pinType("Self-Select Practitioner"), spouse),
      all(
        hasValue("PractitionerPINGrp/PIN"),
        hasValue("SpouseBirthDt"),
        (ctx) =>
          ctx.hasValue("SpousePriorYearAGIAmt") ||
          ctx.hasValue("SpousePriorYearPIN"),
        hasValue("SpousePINEnteredByCd"),
        hasValue("SpouseSignaturePIN"),
        hasValue("JuratDisclosureCd"),
      ),
    ),
    "If IRS Payment Record or IRS ES Payment Record is present, PIN Type Code in the Return Header has the value \"Self-Select Practitioner\", and Spouse SSN in the Return Header has a value, then 'PractitionerPINGrp', 'SpouseBirthDt', ['SpousePriorYearAGIAmt' or 'SpousePriorYearPIN'], 'SpousePINEnteredByCd', ' SpouseSignaturePIN' and 'JuratDisclosureCd' must have a value in the Return Header.",
  ),
  rule(
    "R0000-681-01",
    "reject",
    "missing_data",
    ifThen(
      all(payment, pinType("Self-Select On-Line")),
      all(
        hasValue("PrimaryBirthDt"),
        (ctx) =>
          ctx.hasValue("PrimaryPriorYearAGIAmt") ||
          ctx.hasValue("PrimaryPriorYearPIN"),
        hasValue("PrimaryPINEnteredByCd"),
        hasValue("PrimarySignaturePIN"),
        hasValue("PrimarySignatureDt"),
        hasValue("JuratDisclosureCd"),
      ),
    ),
    "If IRS Payment Record or IRS ES Payment Record is present, and 'PINTypeCd' in the Return Header has the value \"Self-Select On-Line\", then 'PrimaryBirthDt', ['PrimaryPriorYearAGIAmt' or 'PrimaryPriorYearPIN'], 'PrimaryPINEnteredByCd', 'PrimarySignaturePIN', 'PrimarySignatureDt' and 'JuratDisclosureCd' must have a value in the Return Header.",
  ),
  rule(
    "R0000-682-02",
    "reject",
    "missing_data",
    ifThen(
      all(payment, pinType("Self-Select On-Line"), spouse),
      all(
        hasValue("SpouseBirthDt"),
        (ctx) =>
          ctx.hasValue("SpousePriorYearAGIAmt") ||
          ctx.hasValue("SpousePriorYearPIN"),
        hasValue("SpousePINEnteredByCd"),
        hasValue("SpouseSignaturePIN"),
        hasValue("JuratDisclosureCd"),
      ),
    ),
    "If IRS Payment Record or IRS ES Payment Record is present and 'PINTypeCd' in the Return Header has the value \"Self-Select On-Line\", and 'SpouseSSN' in the Return Header has a value, then 'SpouseBirthDt' and ['SpousePriorYearAGIAmt' or 'SpousePriorYearPIN'] and 'SpousePINEnteredByCd' and 'SpouseSignaturePIN' and 'JuratDisclosureCd' must have a value in the Return Header.",
  ),
  rule(
    "R0000-697-01",
    "reject",
    "missing_data",
    ifThen(
      all(payment, pinType("Practitioner")),
      all(
        hasValue("PractitionerPINGrp/PIN"),
        hasValue("PrimaryPINEnteredByCd"),
        hasValue("PrimarySignaturePIN"),
        hasValue("PrimarySignatureDt"),
        hasValue("JuratDisclosureCd"),
      ),
    ),
    "If IRS Payment Record or IRS ES Payment Record is present, and 'PINTypeCd' in the Return Header has the value \"Practitioner\", then 'PractitionerPINGrp' and 'PrimaryPINEnteredByCd' and 'PrimarySignaturePIN' and 'PrimarySignatureDt' and 'JuratDisclosureCd' must have a value in the Return Header.",
  ),
  rule(
    "R0000-698-01",
    "reject",
    "missing_data",
    ifThen(
      all(payment, pinType("Practitioner"), spouse),
      all(
        hasValue("PractitionerPINGrp/PIN"),
        hasValue("SpousePINEnteredByCd"),
        hasValue("SpouseSignaturePIN"),
        hasValue("JuratDisclosureCd"),
      ),
    ),
    "If IRS Payment Record or IRS ES Payment Record is present, 'PINTypeCd' in the Return Header has the value \"Practitioner\", and 'SpouseSSN' has a value, then 'PractitionerPINGrp' and 'SpousePINEnteredByCd' and 'SpouseSignaturePIN' and 'JuratDisclosureCd' must have a value in the Return Header.",
  ),
];

function attribute(xml: string, tag: string, name: string): string | undefined {
  return new RegExp(`<${tag}\\b[^>]*\\b${name}="([^"]*)"`).exec(xml)?.[1];
}

/** A rule context over the emitted Return4868: header, then document leaves. */
export function form4868Context(
  xml: string,
  facts: Form4868RuleFacts = {},
): ReturnContext {
  const emitted = parseEmittedReturn(xml);
  const tags = [...xml.matchAll(/<([A-Za-z0-9]+) documentId=/g)].map((m) =>
    m[1]
  );
  const root = /<Return\b[^>]*>/.exec(xml)?.[0] ?? "";
  const derived: Readonly<Record<string, unknown>> = {
    returnVersion: attribute(xml, "Return", "returnVersion"),
    [NAMESPACES]: root.includes('xmlns="http://www.irs.gov/efile"') &&
      root.includes('xmlns:efile="http://www.irs.gov/efile"'),
    [ATTACHMENTS]: Number(attribute(xml, "ReturnHeader", ATTACHMENTS) ?? 0),
    [DECLARED_DOCUMENTS]: Number(
      attribute(xml, "ReturnData", DECLARED_DOCUMENTS) ?? 0,
    ),
    [DOCUMENTS]: tags.length,
    [PAYMENTS]: tags.filter((tag) => tag === "IRSPayment").length,
    [DUE_DATE]: F4868_2026_CONFIG.dueDate,
    [OUT_OF_COUNTRY_DUE_DATE]: F4868_2026_CONFIG.outOfCountryDueDate,
    ats_test_submission: facts.atsTestSubmission === true,
  };
  const values = (name: string): readonly string[] => [
    ...emitted.header.values.get(name) ?? [],
    ...emitted.documents.flatMap((d) => d.values.get(name) ?? []),
  ];
  const field = (name: string): unknown =>
    Object.hasOwn(derived, name) ? derived[name] : values(name)[0];
  const num = (name: string): number => {
    const value = Number(field(name));
    return Number.isFinite(value) ? value : 0;
  };
  const hasValue = (name: string): boolean => {
    const value = field(name);
    return value !== undefined && value !== null && value !== "";
  };
  return {
    field,
    num,
    hasValue,
    hasNonZero: (name) => num(name) !== 0,
    hasForm: (formId) => tags.includes(formId),
    presentForms: () => tags,
    filingStatus: () => 0,
    primarySSN: () => String(field("PrimarySSN") ?? ""),
    spouseSSN: () => values("SpouseSSN")[0],
    headerField: (name) => emitted.header.values.get(name)?.[0],
    pendingField: () => undefined,
    formCount: (formId) => tags.filter((tag) => tag === formId).length,
    fieldArray: values,
  };
}

/** Reject-level and alert findings on an emitted Return4868. */
export function form4868RuleReport(
  xml: string,
  facts: Form4868RuleFacts = {},
): DiagnosticsReport {
  return evaluateRules(FORM4868_RULES, form4868Context(xml, facts));
}
