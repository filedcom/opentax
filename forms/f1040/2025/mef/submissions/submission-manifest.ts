import { XMLParser } from "fast-xml-parser";

/** MeFHeader TestCd (WSDL 10.9 MeFHeader.xsd): ATS submissions go to the test environment. */
export enum MefTestCd {
  Test = "T",
  Production = "P",
}

export interface ManifestFinding {
  readonly ruleNumber: string;
  readonly message: string;
}

// R0000-118-01 / R0000-119-01: EFIN prefixes reserved for Online Filers.
const ONLINE_FILER_EFIN_PREFIXES = new Set(["10", "21", "32", "44", "53"]);
const SEQUENCE_ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";
const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: false });

export function isOnlineFilerEfin(efin: string): boolean {
  return ONLINE_FILER_EFIN_PREFIXES.has(efin.slice(0, 2));
}

export function julianDay(date: Date): number {
  const start = Date.UTC(date.getUTCFullYear(), 0, 1);
  return Math.floor((date.getTime() - start) / 86_400_000) + 1;
}

/** A random seven-character sequence; the transmitter keeps Submission IDs globally unique (T0000-014). */
export function randomSubmissionSequence(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(7));
  return Array.from(bytes, (byte) => SEQUENCE_ALPHABET[byte % 36]).join("");
}

/** Pub 4164: EFIN + ccyyddd (UTC processing date) + seven lower-case alphanumerics. */
export function mefSubmissionId(
  efin: string,
  processingDate: Date,
  sequence: string,
): string {
  if (!/^[0-9]{6}$/.test(efin)) {
    throw new Error("MeF Submission ID needs the originator's six-digit EFIN");
  }
  if (Number.isNaN(processingDate.getTime())) {
    throw new Error("MeF Submission ID needs a valid processing date");
  }
  if (!/^[a-z0-9]{7}$/.test(sequence)) {
    throw new Error(
      "MeF Submission ID sequence must be seven lower-case letters or digits",
    );
  }
  return efin + String(processingDate.getUTCFullYear()) +
    String(julianDay(processingDate)).padStart(3, "0") + sequence;
}

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function text(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

/**
 * The 1040 business rules that compare the IRS Submission Manifest with its
 * Submission ID, processing date and Return Header.
 */
export function submissionManifestFindings(
  manifestXml: string,
  returnXml: string,
  processingDate: Date,
): readonly ManifestFinding[] {
  const manifest = record(parser.parse(manifestXml).IRSSubmissionManifest);
  const returnRoot = record(parser.parse(returnXml).Return);
  const header = record(returnRoot.ReturnHeader);
  const originator = record(header.OriginatorGrp);
  const filer = record(header.Filer);
  const id = text(manifest.SubmissionId) ?? "";
  const efin = text(manifest.EFIN) ?? "";
  const taxYr = text(manifest.TaxYr);
  const begin = text(manifest.TaxPeriodBeginDt);
  const end = text(manifest.TaxPeriodEndDt);
  const onlineFiler = text(originator.OriginatorTypeCd) === "OnlineFiler";
  const checks: ReadonlyArray<readonly [string, boolean, string]> = [
    [
      "T0000-017",
      id.length === 20,
      "The Submission ID must be 20 characters in length.",
    ],
    [
      "R0000-060",
      id.slice(0, 6) === efin,
      "First six digits in the Submission ID must match the EFIN in the Submission Manifest.",
    ],
    [
      "X0000-027",
      id.slice(6, 10) === String(processingDate.getUTCFullYear()),
      "Year (YYYY) in the SubmissionID must be processing year.",
    ],
    [
      "R0000-054-01",
      efin === text(originator.EFIN),
      "The 'EFIN' in the IRS Submission Manifest must match 'EFIN' in the 'OriginatorGrp' in the Return Header.",
    ],
    [
      "R0000-118-01",
      !isOnlineFilerEfin(efin) || onlineFiler,
      "If first two digits of the EFIN in the IRS Submission Manifest are 10, 21, 32, 44 or 53, then 'OriginatorTypeCd' in the Return Header must have the value \"OnlineFiler\".",
    ],
    [
      "R0000-119-01",
      !onlineFiler || isOnlineFilerEfin(efin),
      "If 'OriginatorTypeCd' in the Return Header has the value \"OnlineFiler\", then the first two digits of the EFIN in the IRS Submission Manifest must be 10 or 21 or 32 or 44 or 53.",
    ],
    [
      "IND-052",
      text(manifest.TIN) === text(filer.PrimarySSN),
      "The TIN present in the IRS Submission Manifest must be equal to the Primary SSN in the Return Header.",
    ],
    [
      "R0000-051-01",
      text(manifest.FederalSubmissionTypeCd) === text(header.ReturnTypeCd),
      "'FederalSubmissionTypeCd' in the IRS Submission Manifest must match 'ReturnTypeCd' indicated in the Return Header.",
    ],
    [
      "R0000-143",
      taxYr !== undefined,
      "'TaxYr' in the IRS Submission Manifest must have a value.",
    ],
    [
      "R0000-052-01",
      taxYr === text(header.TaxYr),
      "'TaxYr' specified in the IRS Submission Manifest must match 'TaxYr' in the Return Header.",
    ],
    [
      "R0000-180",
      taxYr === text(returnRoot["@_returnVersion"])?.slice(0, 4),
      "'TaxYr' specified in the Submission Manifest must equal the year of the schema version ('YYYY' digits of the attribute 'returnVersion' of the Return) that is being used to file the return.",
    ],
    [
      "R0000-082",
      begin !== undefined && end !== undefined,
      "'TaxPeriodBeginDt' and 'TaxPeriodEndDt' must be provided in the IRS Submission Manifest.",
    ],
    [
      "R0000-080-01",
      begin === text(header.TaxPeriodBeginDt),
      "'TaxPeriodBeginDt' present in the IRS Submission Manifest must match 'TaxPeriodBeginDt' provided in the Return Header.",
    ],
    [
      "R0000-081-01",
      end === text(header.TaxPeriodEndDt),
      "'TaxPeriodEndDt' present in the IRS Submission Manifest must match 'TaxPeriodEndDt' provided in the Return Header.",
    ],
    [
      "R0000-114",
      begin?.slice(5) === "01-01",
      "The Submission Manifest's 'TaxPeriodBeginDt' value for month and day should be January 1.",
    ],
    [
      "R0000-115",
      end?.slice(5) === "12-31",
      "The Submission Manifest's 'TaxPeriodEndDt' value for month and day should be December 31.",
    ],
    [
      "R0000-228",
      taxYr === begin?.slice(0, 4),
      "'TaxYr' must equal the year of the 'TaxPeriodBeginDt' (\"YYYY\" digits) in the Submission Manifest.",
    ],
    [
      "R0000-229",
      taxYr === end?.slice(0, 4),
      "'TaxYr' must equal the year of the 'TaxPeriodEndDt' (\"YYYY\" digits) in the Submission Manifest.",
    ],
    [
      "IND-002",
      end !== undefined && end < processingDate.toISOString().slice(0, 10),
      "'TaxPeriodEndDt' in the Submission Manifest must be before the date the return was received.",
    ],
  ];
  return checks.filter(([, passes]) => !passes).map((
    [ruleNumber, , message],
  ) => ({
    ruleNumber,
    message,
  }));
}
