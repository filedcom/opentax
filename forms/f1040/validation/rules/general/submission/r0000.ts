/**
 * MeF Business Rules: R0000
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 62 rules (62 implemented)
 *
 * Submission-envelope rules read the ZIP a transmission-time context carries
 * (EnvelopeFact); e-File database rules check what the return controls.
 */

import type {
  ReturnContext,
  RuleCheck,
  RuleDef,
} from "../../../../../../core/validation/types.ts";
import {
  all,
  allMatch,
  amount,
  amountLte,
  any,
  attachmentDescIs,
  charAfterIsAlpha,
  charCountAtMost,
  contains,
  dateMonthDayEq,
  dateYearEq,
  documentCntMatches,
  eqStr,
  formAbsent,
  formPresent,
  hasNonZero,
  hasValue,
  ifThen,
  isAtsTest,
  noValue,
  not,
  plus,
  rule,
  ssnMiddleDigitsEq,
  total,
  validRTN,
  validSSN,
  zipValidForState,
} from "../../../../../../core/validation/mod.ts";
import {
  eachGroup,
  EnvelopeFact,
  factText,
  isEtin,
  isIssuableTin,
  isPersonNameControl,
  issuableTins,
  processingYear,
  xmlTexts,
} from "../../../../../../core/validation/predicates.ts";
import { MEF_RETURN_VERSION_BY_TAX_YEAR } from "../../../../mef/return-versions.ts";
import { isOnlineFilerEfin } from "../../../../2025/mef/submissions/submission-manifest.ts";
import {
  manifestText,
  type SubmissionEnvelope,
  submissionEnvelope,
  transmissionManifests,
} from "./envelope.ts";

/** ReturnTypeCd values of the Form 1040 return header (ReturnHeader1040x.xsd). */
const RETURN_TYPES = new Set(["1040", "1040SS"]);

/** A Form 1040 return type in the schema version reviewed for its 'TaxYr'. */
const supportedReturn: RuleCheck = (ctx) => {
  const type = ctx.field("ReturnTypeCd");
  const version = ctx.field("returnVersion");
  return (type === undefined || RETURN_TYPES.has(String(type))) &&
    (version === undefined || !ctx.hasValue("TaxYr") ||
      MEF_RETURN_VERSION_BY_TAX_YEAR[ctx.num("TaxYr")] === version);
};

/** A manifest element equals the Return Header's; nothing to compare before a manifest exists. */
const manifestMatchesHeader = (tag: string, headerXml: string): RuleCheck =>
(ctx) => {
  const envelope = submissionEnvelope(ctx);
  return envelope === undefined ||
    (manifestText(envelope, tag) ?? "") === String(ctx.field(headerXml) ?? "");
};

/**
 * `check` read on the manifest's elements; with no manifest, on the Return
 * Header's elements the manifest is built from.
 */
const onManifest = (check: RuleCheck): RuleCheck => (ctx) => {
  const envelope = submissionEnvelope(ctx);
  if (envelope === undefined) return check(ctx);
  const manifest = envelope?.manifest ?? "";
  const field = (xml: string) => xmlTexts(manifest, xml)[0];
  const num = (xml: string) => Number(field(xml) ?? 0) || 0;
  return check({
    ...ctx,
    field,
    num,
    hasValue: (xml) => (field(xml) ?? "") !== "",
    hasNonZero: (xml) => num(xml) !== 0,
    fieldArray: (xml) => xmlTexts(manifest, xml),
  });
};

/** Passes with no ZIP fact; fails on a ZIP fact that is not an archive. */
const onSubmission = (
  check: (envelope: SubmissionEnvelope) => boolean,
): RuleCheck =>
(ctx) => {
  const envelope = submissionEnvelope(ctx);
  return envelope === undefined || (envelope !== null && check(envelope));
};

/** The attachment file names the return references (AttachmentLocationTxt). */
const referencedFiles = (ctx: ReturnContext): readonly string[] =>
  ctx.fieldArray("BinaryAttachment/AttachmentLocationTxt").map(String);

/** Distinct even ignoring case, so no file system can merge two of them. */
const distinctNames = (names: readonly string[]): boolean =>
  new Set(names.map((n) => n.toLowerCase())).size === names.length;

/** The manifest EFIN, or the Return Header's originator EFIN it must match (R0000-054-01). */
const manifestEfin = (ctx: ReturnContext): string =>
  manifestText(submissionEnvelope(ctx), "EFIN") ??
    String(ctx.field("OriginatorGrp/EFIN") ?? ctx.field("EFIN") ?? "");

/** A name control is the start of the last name (Pub 4164 name control rules). */
const nameControlOf = (control: string, lastName: string): boolean => {
  const letters = (v: string) => v.toUpperCase().replace(/[^A-Z]/g, "");
  return letters(lastName).startsWith(letters(control));
};

/** A dependent SSN, when present, is one the SSA or IRS can issue. */
const dependentSSNFormed: RuleCheck = (ctx) =>
  !ctx.hasValue("DependentSSN") ||
  isIssuableTin(ctx.field("DependentSSN"), isAtsTest(ctx));

export const R0000_RULES: readonly RuleDef[] = [
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
    supportedReturn,
    "'ReturnTypeCd' (specified in the Return Header) and the return version (specified by the 'returnVersion' attribute of the 'Return' element) of the return must match the return type and the version supported by the Modernized e-File system.",
  ),
  rule(
    "R0000-007-02",
    "reject",
    "incorrect_data",
    zipValidForState("Filer/ZIPCd", "Filer/StateAbbreviationCd"),
    "For US Addresses, the first five digits of 'ZipCd' of the Filer's address in the Return Header must be within the valid ranges of zip codes for the corresponding 'StateAbbreviationCd'. See Publication 4164.",
  ),
  rule(
    "R0000-019",
    "reject",
    "data_mismatch",
    documentCntMatches,
    "The number of return documents (forms, schedules, and supporting documents) included in the return must be equal to the value of the 'documentCnt' attribute of the ReturnData.",
  ),
  rule(
    "R0000-030-01",
    "reject",
    "data_mismatch",
    ifThen(hasValue("PractitionerPINGrp"), (ctx) =>
      // OriginatorGrp's own EFIN precedes the nested PractitionerPINGrp's.
      String(ctx.field("PractitionerPINGrp/EFIN") ?? "") === String(ctx.field("OriginatorGrp/EFIN") ?? "")),
    "If 'PractitionerPINGrp' in the Return Header has a value, then 'EFIN' in 'PractitionerPINGrp' must be the same as 'EFIN' in 'OriginatorGrp'.",
  ),
  rule(
    "R0000-046-01",
    "reject",
    "incorrect_data",
    (ctx) => {
      const zip = String(ctx.field("Filer/ZIPCd") ?? "").replace(/\D/g, "").slice(0, 5);
      return zip.length < 5 || zip.slice(3) !== "00" ||
        ["00800", "20500", "34000", "00600", "96100", "96900"].includes(zip);
    },
    "For US Addresses, the fourth and fifth digit of the 'ZipCd' of the Filer's address in the Return Header cannot both be zeros (\"00\"), except when the 'ZipCd' is 00800, 20500, 34000, 00600, 96100, 96900.",
  ),
  rule(
    "R0000-051-01",
    "reject_and_stop",
    "data_mismatch",
    manifestMatchesHeader("FederalSubmissionTypeCd", "ReturnTypeCd"),
    "'FederalSubmissionTypeCd' in the IRS Submission Manifest must match 'ReturnTypeCd' indicated in the Return Header.",
  ),
  rule(
    "R0000-052-01",
    "reject_and_stop",
    "data_mismatch",
    manifestMatchesHeader("TaxYr", "TaxYr"),
    "'TaxYr' specified in the IRS Submission Manifest must match 'TaxYr' in the Return Header.",
  ),
  rule(
    "R0000-054-01",
    "reject_and_stop",
    "data_mismatch",
    manifestMatchesHeader("EFIN", "OriginatorGrp/EFIN"),
    "The 'EFIN' in the IRS Submission Manifest must match 'EFIN' in the 'OriginatorGrp' in the Return Header.",
  ),
  rule(
    "R0000-056-01",
    "reject",
    "missing_document",
    ifThen(formPresent("form8838"), attachmentDescIs("8838 Signature Document")),
    "If Form 8838 is present in the return, then a binary attachment document with Description \"8838 Signature Document\" must be present.",
  ),
  rule(
    "R0000-057-01",
    "reject",
    "missing_data",
    // A return-only export has no attached files; each file in the ZIP is checked.
    onSubmission((e) => {
      const referenced = new Set(xmlTexts(e.xml ?? "", "AttachmentLocationTxt"));
      return e.attachments.every((a) => referenced.has(a.fileName));
    }),
    "Every attached file (i.e. binary attachment) must be referenced by the XML document that represents it.",
  ),
  rule(
    "R0000-058-01",
    "reject",
    "missing_data",
    all(
      (ctx) =>
        (ctx.emittedDocuments?.("BinaryAttachment") ?? []).every((d) =>
          d.hasValue("AttachmentLocationTxt")
        ),
      onSubmission((e) => {
        const files = new Set(e.attachments.map((a) => a.fileName));
        return xmlTexts(e.xml ?? "", "AttachmentLocationTxt")
          .every((name) => files.has(name));
      }),
    ),
    "An XML document that represents a binary attachment must have a valid reference to an attached file.",
  ),
  rule(
    "R0000-060",
    "reject_and_stop",
    "incorrect_data",
    (ctx) => {
      const envelope = submissionEnvelope(ctx);
      const id = manifestText(envelope, "SubmissionId");
      return envelope === undefined ||
        (id !== undefined && id.slice(0, 6) === manifestText(envelope, "EFIN"));
    },
    "First six digits in the Submission ID must match the EFIN in the Submission Manifest.",
  ),
  rule(
    "R0000-067",
    "reject_and_stop",
    "incorrect_data",
    (ctx) => {
      const envelope = submissionEnvelope(ctx);
      return distinctNames(referencedFiles(ctx)) &&
        (envelope == null ||
          distinctNames(envelope.attachments.map((a) => a.fileName)));
    },
    "The attached files (i.e. binary attachments) in a submission zip archive must have distinct names.",
  ),
  rule(
    "R0000-075-02",
    "reject",
    "incorrect_data",
    validRTN("RoutingTransitNum"),
    "'RoutingTransitNum' (RTN) must conform to the banking industry RTN algorithm.",
  ),
  rule(
    "R0000-080-01",
    "reject_and_stop",
    "data_mismatch",
    manifestMatchesHeader("TaxPeriodBeginDt", "TaxPeriodBeginDt"),
    "'TaxPeriodBeginDt' present in the IRS Submission Manifest must match 'TaxPeriodBeginDt' provided in the Return Header.",
  ),
  rule(
    "R0000-081-01",
    "reject_and_stop",
    "data_mismatch",
    manifestMatchesHeader("TaxPeriodEndDt", "TaxPeriodEndDt"),
    "'TaxPeriodEndDt' present in the IRS Submission Manifest must match 'TaxPeriodEndDt' provided in the Return Header.",
  ),
  rule(
    "R0000-082",
    "reject_and_stop",
    "missing_data",
    onManifest(all(hasValue("TaxPeriodBeginDt"), hasValue("TaxPeriodEndDt"))),
    "'TaxPeriodBeginDt' and 'TaxPeriodEndDt' must be provided in the IRS Submission Manifest.",
  ),
  rule(
    "R0000-087-02",
    "reject",
    "incorrect_data",
    ifThen(hasValue("PreparerFirmEIN"), all(not(eqStr("PreparerFirmEIN", "000000000")), not(eqStr("PreparerFirmEIN", "999999999")))),
    "'PreparerFirmEIN' in the Return Header must not equal all zeros or all nines.",
  ),
  rule(
    "R0000-088-01",
    "reject",
    "incorrect_data",
    ifThen(hasValue("PTIN"), all(not(eqStr("PTIN", "P00000000")), not(eqStr("PTIN", "P99999999")))),
    "The eight numeric digits of the PTIN (of the Paid Preparer) following the letter P, must not equal all zeros or all nines in the Return Header.",
  ),
  rule(
    "R0000-090",
    "alert",
    "database",
    // The conditions are MeF's record of earlier rejects; the indicator itself must be the checkbox value.
    ifThen(hasValue("ImperfectReturnInd"), (ctx) => ctx.field("ImperfectReturnInd") === "X"),
    "'ImperfectReturnInd' is checked in the Return Header, but the return does not meet the necessary conditions.",
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
    ifThen(hasValue("SpouseSSN"), validSSN("SpouseSSN")),
    "If Spouse SSN in the return has a value, then it must be within the valid range of SSN/ITIN and must not be an ATIN.",
  ),
  rule(
    "R0000-095-02",
    "reject",
    "incorrect_data",
    ifThen(hasValue("PrimarySignaturePIN"), not(eqStr("PrimarySignaturePIN", "00000"))),
    "'PrimarySignaturePIN' in the Return Header must not equal all zeros.",
  ),
  rule(
    "R0000-096-02",
    "reject",
    "incorrect_data",
    ifThen(hasValue("SpouseSignaturePIN"), not(eqStr("SpouseSignaturePIN", "00000"))),
    "'SpouseSignaturePIN' in the Return Header must not equal all zeros.",
  ),
  rule(
    "R0000-113-01",
    "reject",
    "incorrect_data",
    ifThen(hasValue("STIN"), all(not(eqStr("STIN", "S00000000")), not(eqStr("STIN", "S99999999")))),
    "The eight numeric digits of the STIN (of the Paid Preparer) following the letter S, must not equal all zeros or all nines in the Return Header.",
  ),
  rule(
    "R0000-114",
    "reject",
    "incorrect_data",
    onManifest(ifThen(hasValue("TaxPeriodBeginDt"), dateMonthDayEq("TaxPeriodBeginDt", 1, 1))),
    "The Submission Manifest's 'TaxPeriodBeginDt' value for month and day should be January 1.",
  ),
  rule(
    "R0000-115",
    "reject",
    "incorrect_data",
    onManifest(ifThen(hasValue("TaxPeriodEndDt"), dateMonthDayEq("TaxPeriodEndDt", 12, 31))),
    "The Submission Manifest's 'TaxPeriodEndDt' value for month and day should be December 31.",
  ),
  rule(
    "R0000-116-02",
    "reject",
    "incorrect_data",
    ifThen(any(eqStr("CityNm", "APO"), eqStr("CityNm", "DPO"), eqStr("CityNm", "FPO")), any(eqStr("StateAbbreviationCd", "AA"), eqStr("StateAbbreviationCd", "AE"), eqStr("StateAbbreviationCd", "AP"))),
    "If the Filer has a US address in the Return Header and if the value of 'CityNm' is \"APO\" or \"DPO\" or \"FPO\", then 'StateAbbreviationCd' must have the value \"AA\", \"AE\" or \"AP\".",
  ),
  rule(
    "R0000-117-01",
    "reject",
    "incorrect_data",
    ifThen(any(eqStr("StateAbbreviationCd", "AA"), eqStr("StateAbbreviationCd", "AE"), eqStr("StateAbbreviationCd", "AP")), any(eqStr("CityNm", "APO"), eqStr("CityNm", "DPO"), eqStr("CityNm", "FPO"))),
    "If the Filer has a US address in the Return Header and 'StateAbbreviationCd' has the value \"AA\", \"AE\" or \"AP\" then the 'CityNm' must be \"APO\" OR \"DPO\" OR \"FPO\".",
  ),
  rule(
    "R0000-118-01",
    "reject_and_stop",
    "incorrect_data",
    (ctx) => !isOnlineFilerEfin(manifestEfin(ctx)) || eqStr("OriginatorTypeCd", "OnlineFiler")(ctx),
    "If first two digits of the EFIN in the IRS Submission Manifest are 10, 21, 32, 44 or 53, then 'OriginatorTypeCd' in the Return Header must have the value \"OnlineFiler\".",
  ),
  rule(
    "R0000-119-01",
    "reject_and_stop",
    "incorrect_data",
    (ctx) => !eqStr("OriginatorTypeCd", "OnlineFiler")(ctx) || isOnlineFilerEfin(manifestEfin(ctx)),
    "If 'OriginatorTypeCd' in the Return Header has the value \"OnlineFiler\", then the first two digits of the EFIN in the IRS Submission Manifest must be 10 or 21 or 32 or 44 or 53.",
  ),
  rule(
    "R0000-120",
    "reject_and_stop",
    "unsupported",
    // Which submission types MeF takes today is its own schedule; this one must be a 1040 type.
    all(
      supportedReturn,
      (ctx) => {
        const type = manifestText(submissionEnvelope(ctx), "FederalSubmissionTypeCd");
        return type === undefined || RETURN_TYPES.has(type);
      },
    ),
    "The IRS Submission type that was filed is not being accepted by Modernized e-File (MeF) at this time.  Please check the MeF web page under irs.gov for more information.  The submission type filed was <type>.",
  ),
  rule(
    "R0000-121",
    "reject_and_stop",
    "unsupported",
    // Participation is MeF's record; the ETIN sent must be one.
    (ctx) => {
      const etin = factText(ctx, EnvelopeFact.TransmitterEtin);
      return etin === undefined || isEtin(etin);
    },
    "The ETIN associated with the Individual submission is not a participating transmitter.  Please check the Modernized e-File (MeF) web page under irs.gov for more information on participation rules.",
  ),
  rule(
    "R0000-123-01",
    "reject",
    "missing_data",
    ifThen(contains("NameLine1Txt", "&"), hasValue("SpouseSSN")),
    "If 'NameLine1Txt' in the Return Header contains an ampersand, then 'SpouseSSN' in the Return Header must have a value.",
  ),
  rule(
    "R0000-125-01",
    "reject",
    "incorrect_data",
    contains("NameLine1Txt", "<"),
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
    ifThen(
      all(isAtsTest, hasValue("SpouseSSN")),
      ssnMiddleDigitsEq("SpouseSSN", "00"),
    ),
    "The 4th and 5th digits of Spouse SSN in the return must be equal to \"00\" for testing.",
  ),
  rule(
    "R0000-142-01",
    "alert",
    "incorrect_data",
    ifThen(
      hasValue("PaidPreparerInformationGrp"),
      all(noValue("PreparerSSN"), allMatch("PTIN", /^P\d{8}$/)),
    ),
    "If you are a paid tax return preparer, you must use a Preparer Tax Identification Number (PTIN) issued by the Internal Revenue Service (IRS) to identify yourself in the paid preparer section of the tax return. In future years, tax returns may be rejected if an SSN, or any number that is not a valid PTIN, is included in this field.",
  ),
  rule(
    "R0000-143",
    "reject_and_stop",
    "missing_data",
    onManifest(hasValue("TaxYr")),
    "'TaxYr' in the IRS Submission Manifest must have a value.",
  ),
  rule(
    "R0000-180",
    "reject_and_stop",
    "incorrect_data",
    (ctx) => {
      const envelope = submissionEnvelope(ctx);
      const version = envelope
        ? /<Return\b[^>]*\breturnVersion="([^"]+)"/.exec(envelope.xml ?? "")?.[1]
        : String(ctx.field("returnVersion") ?? "");
      const taxYr = envelope
        ? manifestText(envelope, "TaxYr")
        : String(ctx.field("TaxYr") ?? "");
      if (envelope === undefined && (!version || !taxYr)) return true;
      return version !== undefined && version.slice(0, 4) === taxYr;
    },
    "'TaxYr' specified in the Submission Manifest must equal the year of the schema version ('YYYY' digits of the attribute 'returnVersion' of the Return) that is being used to file the return.",
  ),
  rule(
    "R0000-192",
    "reject",
    "incorrect_data",
    ifThen(hasValue("PhoneNum"), not(eqStr("PhoneNum", "0000000000"))),
    "Phone Number provided in the return must not be all zeros.",
  ),
  rule(
    "R0000-193",
    "reject",
    "incorrect_data",
    all(
      allMatch("ReturnHeader/DepositorAccountNum", /[^0]/),
      allMatch("1040/DepositorAccountNum", /[^0]/),
      allMatch("8888/DepositorAccountNum", /[^0]/),
      allMatch("Payment/DepositorAccountNum", /[^0]/),
    ),
    "Bank Account Number provided in the return must not be all zeros.",
  ),
  rule(
    "R0000-194",
    "reject_and_stop",
    "duplicate",
    // MeF's accepted returns are its own; no two submissions sent together may be the same return.
    (ctx) => {
      const keys = transmissionManifests(ctx).map((xml) =>
        ["TIN", "TaxYr", "FederalSubmissionTypeCd"]
          .map((tag) => xmlTexts(xml, tag)[0] ?? "").join("|")
      );
      return new Set(keys).size === keys.length;
    },
    "Submission must not be a duplicate of a previously accepted submission.",
  ),
  rule(
    "R0000-198",
    "reject_and_stop",
    "incorrect_data",
    // MeF accepts the current tax year and the two before it; its other e-file exclusions are its own.
    (ctx) => {
      const taxYr = ctx.num("TaxYr");
      const processed = Number(
        factText(ctx, EnvelopeFact.ProcessingDate)?.slice(0, 4) ??
          processingYear(ctx),
      );
      return !ctx.hasValue("TaxYr") ||
        (MEF_RETURN_VERSION_BY_TAX_YEAR[taxYr] !== undefined &&
          (Number.isNaN(processed) ||
            (taxYr <= processed && taxYr >= processed - 3)));
    },
    "This return is ineligible to be filed electronically.",
  ),
  rule(
    "R0000-204",
    "reject",
    "missing_document",
    ifThen(hasNonZero("QualifiedBusinessIncomeDedAmt"), any(formPresent("form8995"), formPresent("form8995a"))),
    "If 'QualifiedBusinessIncomeDedAmt' in the return (1040, 1040NR, 1041) has a non-zero value, then one and only one Form 8995 or Form 8995A must be present in the return.",
  ),
  rule(
    "R0000-205",
    "reject",
    "math_error",
    ifThen(
      hasNonZero("1040/QualifiedBusinessIncomeDedAmt"),
      any(
        all(formAbsent("form8995"), formAbsent("form8995a")),
        amountLte(
          amount("1040/QualifiedBusinessIncomeDedAmt"),
          plus(
            total("8995A/DPADSect199AgAllocAgricHortAmt"),
            (ctx) => {
              const form = ctx.hasForm("form8995a") ? "8995A" : "8995";
              return Math.min(ctx.num(`${form}/QBIDedBfrIncomeLimitationAmt`), ctx.num(`${form}/IncomeLimitationAmt`));
            },
          ),
        ),
      ),
    ),
    "If 'QualifiedBusinessIncomeDedAmt' in the return (1040, 1040NR, 1041) has a non-zero value, then it cannot be more than the sum of Form 8995-A, 'DPADSect199AGAllocAgricHortAmt' and the lesser of the QBI Limitation or TXI Limitation.",
  ),
  rule(
    "R0000-225",
    "reject_and_stop",
    "unsupported",
    // The forms of the reviewed schema version; which MeF accepts today is its own schedule.
    supportedReturn,
    "This submission contains a form or schedule that is not currently supported for electronic filing.",
  ),
  rule(
    "R0000-228",
    "reject_and_stop",
    "incorrect_data",
    onManifest(dateYearEq("TaxPeriodBeginDt", "TaxYr")),
    "'TaxYr' must equal the year of the 'TaxPeriodBeginDt' (\"YYYY\" digits) in the Submission Manifest.",
  ),
  rule(
    "R0000-229",
    "reject_and_stop",
    "incorrect_data",
    onManifest(dateYearEq("TaxPeriodEndDt", "TaxYr")),
    "'TaxYr' must equal the year of the 'TaxPeriodEndDt' (\"YYYY\" digits) in the Submission Manifest.",
  ),
  rule(
    "R0000-235",
    "reject",
    "missing_document",
    ifThen(formPresent("schedule_a_form8936"), formPresent("form8936")),
    "If Schedule A (Form 8936) is present in the return, then Form 8936 must also be present.",
  ),
  rule(
    "R0000-236",
    "reject_and_stop",
    "unsupported",
    // MeF takes PDF attachments only; its list of forms refused as PDF is its own, and
    // the Form 1040 itself is never one: it is always the XML return.
    eachGroup(
      "BinaryAttachment",
      all(
        eqStr("DocumentTypeCd", "PDF"),
        (ctx) => !/^(?:FORM\s*)?1040(?:-?SR)?$/i.test(String(ctx.field("Desc") ?? "").trim()),
      ),
      "DocumentTypeCd",
      "Desc",
    ),
    "This submission contains a form or schedule which MeF is not accepting as a binary attachment. Please verify whether it is valid for your submission to include the form or schedule. If valid, complete the form or schedule in XML format and resubmit.",
  ),
  rule(
    "R0000-500-01",
    "reject_and_stop",
    "database",
    // The SSA and IRS records are MeF's; the SSN must be valid and the name control the primary's.
    all(
      issuableTins("PrimarySSN"),
      (ctx) => isPersonNameControl(ctx.field("PrimaryNameControlTxt")),
      (ctx) => {
        const last = /<([^<]+)/.exec(String(ctx.field("NameLine1Txt") ?? ""))?.[1];
        return last === undefined ||
          nameControlOf(String(ctx.field("PrimaryNameControlTxt")), last);
      },
    ),
    "'PrimarySSN' and 'PrimaryNameControlTxt' in the Return Header must match the e-File database.",
  ),
  rule(
    "R0000-503-02",
    "reject_and_stop",
    "database",
    // The SSA and IRS records are MeF's; the spouse SSN and name control must be well formed.
    ifThen(
      hasValue("SpouseSSN"),
      all(issuableTins("SpouseSSN"), (ctx) => isPersonNameControl(ctx.field("SpouseNameControlTxt"))),
    ),
    "Spouse SSN and Spouse Name Control in the return must match the e-File database.",
  ),
  rule(
    "R0000-504-02",
    "reject",
    "database",
    // The SSA and IRS records are MeF's; each dependent's name control must be its last name's.
    eachGroup(
      "DependentDetail",
      ifThen(
        hasValue("DependentSSN"),
        all(
          dependentSSNFormed,
          (ctx) => isPersonNameControl(ctx.field("DependentNameControlTxt")),
          (ctx) =>
            !ctx.hasValue("DependentLastNm") ||
            nameControlOf(
              String(ctx.field("DependentNameControlTxt")),
              String(ctx.field("DependentLastNm")),
            ),
        ),
      ),
      "DependentSSN",
      "DependentNameControlTxt",
      "DependentLastNm",
    ),
    "Each 'DependentSSN' and the corresponding 'DependentNameControlTxt' that has a value in 'DependentDetail' in the return must match the SSN and Name Control in the e-File database.",
  ),
  rule(
    "R0000-533-02",
    "reject",
    "incorrect_data",
    // The date of death is MeF's record; the return controls the SSN it is looked up by.
    eachGroup("DependentDetail", dependentSSNFormed, "DependentSSN"),
    "If a Dependent's Date of Death has a value in the e-File database, then it must not be prior to 'TaxYr' in the Return Header.",
  ),
  rule(
    "R0000-571-02",
    "reject",
    "database",
    // The year of birth is MeF's record; the return controls the SSN it is looked up by.
    eachGroup("DependentDetail", dependentSSNFormed, "DependentSSN"),
    "For each DependentSSN in the tax return, the Year of Birth in the e-File database must not be greater than 'TaxYr' in the Return Header.",
  ),
  rule(
    "R0000-904-03",
    "reject_and_stop",
    "database",
    // Passing ATS is MeF's record; the Software ID must be the eight-digit ID it issues.
    (ctx) => /^\d{8}$/.test(String(ctx.field("SoftwareId") ?? "")) && ctx.field("SoftwareId") !== "00000000",
    "Software ID in the Return Header must have passed testing for the form family and 'TaxYr'.",
  ),
  rule(
    "R0000-905-01",
    "reject_and_stop",
    "database",
    // EFIN status is MeF's record; the originator EFIN must be an issued six-digit EFIN.
    (ctx) => {
      const efin = String(ctx.field("OriginatorGrp/EFIN") ?? ctx.field("EFIN") ?? "");
      return /^\d{6}$/.test(efin) && efin !== "000000";
    },
    "Electronic Filing Identification Number (EFIN) in the Return Header must be listed in the e-File database and in accepted status.",
  ),
  rule(
    "R0000-906-02",
    "reject",
    "database",
    // The e-File RTN list is MeF's; each RTN must carry a Pub 4164 prefix (01-12, 21-32).
    allMatch("RoutingTransitNum", /^(?:0[1-9]|1[0-2]|2[1-9]|3[0-2])\d{7}$/),
    "Routing Transit Number (RTN) included in the return must be present in the e-File database.",
  ),
];
