import { zipSync } from "fflate";
import type { FilerIdentity } from "../../mef/header.ts";
import { element, elements } from "../../mef/xml.ts";
import type { MefBundle } from "./builder.ts";
import { preparedSourceSha256, sha256Hex } from "../prepared-source.ts";

const XML_DECLARATION = '<?xml version="1.0" encoding="UTF-8"?>\n';
const encoder = new TextEncoder();

export interface MefSubmissionArchiveOptions {
  readonly filer: FilerIdentity;
  readonly submissionId: string;
  readonly processingDate: Date;
}

export interface MefSubmissionArchive {
  readonly submissionId: string;
  readonly fileName: string;
  readonly bytes: Uint8Array;
  readonly manifestXml: string;
  readonly bundle: MefBundle;
}

export interface MefTransmissionSubmission {
  readonly archive: MefSubmissionArchive;
  readonly electronicPostmark: Date;
}

export interface MefTransmissionPackage {
  readonly sendSubmissionsRequestXml: string;
  readonly containerZipBytes: Uint8Array;
}

function dayOfYear(date: Date): number {
  const start = Date.UTC(date.getUTCFullYear(), 0, 1);
  return Math.floor((date.getTime() - start) / 86_400_000) + 1;
}

function validateSubmissionIdentity(options: MefSubmissionArchiveOptions): {
  efin: string;
  tin: string;
} {
  const { filer, submissionId, processingDate } = options;
  const efin = filer.originator?.efin;
  const softwareId = filer.softwareId;
  const tin = filer.primarySSN.replace(/-/g, "");
  if (!efin || !/^[0-9]{6}$/.test(efin)) {
    throw new Error(
      "MeF submission ZIP needs the filer originator's six-digit EFIN",
    );
  }
  if (!softwareId || !/^[0-9]{8}$/.test(softwareId)) {
    throw new Error(
      "MeF submission ZIP needs an explicit eight-digit Software ID",
    );
  }
  if (!/^[0-9]{9}$/.test(tin)) {
    throw new Error("MeF submission ZIP needs the filer's nine-digit TIN");
  }
  if (Number.isNaN(processingDate.getTime())) {
    throw new Error("MeF submission ZIP needs a valid processing date");
  }
  const expectedPrefix = efin + String(processingDate.getUTCFullYear()) +
    String(dayOfYear(processingDate)).padStart(3, "0");
  if (
    !/^[0-9]{13}[a-z0-9]{7}$/.test(submissionId) ||
    !submissionId.startsWith(expectedPrefix)
  ) {
    throw new Error(
      "MeF Submission ID must contain the EFIN, UTC processing year, Julian day, and seven-character sequence",
    );
  }
  return { efin, tin };
}

function buildManifestXml(
  submissionId: string,
  efin: string,
  tin: string,
): string {
  const children = [
    element("SubmissionId", submissionId),
    element("EFIN", efin),
    element("TaxYr", "2025"),
    element("GovernmentCd", "IRS"),
    element("FederalSubmissionTypeCd", "1040"),
    element("TaxPeriodBeginDt", "2025-01-01"),
    element("TaxPeriodEndDt", "2025-12-31"),
    element("TIN", tin),
  ];
  return XML_DECLARATION +
    `<IRSSubmissionManifest xmlns="http://www.irs.gov/efile">${
      children.join("")
    }</IRSSubmissionManifest>`;
}

/** Build one compressed federal TY2025 Form 1040 submission ZIP. No network calls. */
export async function buildMefSubmissionArchive(
  bundle: MefBundle,
  options: MefSubmissionArchiveOptions,
): Promise<MefSubmissionArchive> {
  const { efin, tin } = validateSubmissionIdentity(options);
  if (typeof bundle.pending.f1040?.digital_assets !== "boolean") {
    throw new Error(
      "MeF submission needs an explicit Form 1040 digital-asset Yes or No answer",
    );
  }
  if (
    await preparedSourceSha256(bundle.pending, options.filer) !==
      bundle.sourceSha256 ||
    await sha256Hex(encoder.encode(bundle.xml)) !== bundle.xmlSha256
  ) {
    throw new Error("MeF submission differs from its prepared return");
  }
  const attachmentNames = bundle.attachments.map(({ fileName }) => fileName);
  const digestNames = Object.keys(bundle.attachmentSha256ByFileName);
  if (
    new Set(attachmentNames).size !== attachmentNames.length ||
    attachmentNames.length !== digestNames.length ||
    attachmentNames.some((name) =>
      !Object.hasOwn(bundle.attachmentSha256ByFileName, name)
    )
  ) {
    throw new Error("MeF submission attachment set differs from preparation");
  }
  for (const attachment of bundle.attachments) {
    if (
      await sha256Hex(attachment.bytes) !==
        bundle.attachmentSha256ByFileName[attachment.fileName]
    ) {
      throw new Error(
        `MeF submission attachment differs from preparation: ${attachment.fileName}`,
      );
    }
  }
  const manifestXml = buildManifestXml(options.submissionId, efin, tin);
  const files: Record<string, Uint8Array> = {
    "manifest/manifest.xml": encoder.encode(manifestXml),
    "xml/submission.xml": encoder.encode(XML_DECLARATION + bundle.xml),
  };
  for (const attachment of bundle.attachments) {
    files[`attachment/${attachment.fileName}`] = attachment.bytes;
  }
  return {
    submissionId: options.submissionId,
    fileName: `${options.submissionId}.zip`,
    bytes: zipSync(files, { level: 6 }),
    manifestXml,
    bundle,
  };
}

/** Build the A2A SOAP body element and its uncompressed ZIP attachment. */
export function buildMefTransmissionPackage(
  submissions: ReadonlyArray<MefTransmissionSubmission>,
): MefTransmissionPackage {
  if (submissions.length < 1 || submissions.length > 100) {
    throw new Error("MeF transmission needs 1 to 100 submissions");
  }
  const files: Record<string, Uint8Array> = {};
  const requestEntries: string[] = [];
  for (const { archive: submission, electronicPostmark } of submissions) {
    if (
      !/^[0-9]{13}[a-z0-9]{7}$/.test(submission.submissionId) ||
      submission.fileName !== `${submission.submissionId}.zip` ||
      submission.bytes.length < 4 ||
      submission.bytes[0] !== 0x50 || submission.bytes[1] !== 0x4b
    ) {
      throw new Error("MeF container received an invalid submission ZIP");
    }
    if (files[submission.fileName]) {
      throw new Error(
        `Duplicate MeF Submission ID: ${submission.submissionId}`,
      );
    }
    if (Number.isNaN(electronicPostmark.getTime())) {
      throw new Error("MeF transmission needs a valid electronic postmark");
    }
    files[submission.fileName] = submission.bytes;
    requestEntries.push(elements("SubmissionData", [
      element("SubmissionId", submission.submissionId),
      element("ElectronicPostmarkTs", electronicPostmark.toISOString()),
    ]));
  }
  const list = elements("SubmissionDataList", requestEntries);
  const sendSubmissionsRequestXml = XML_DECLARATION +
    `<SendSubmissionsRequest xmlns="http://www.irs.gov/a2a/mef/MeFTransmitterService.xsd">${list}</SendSubmissionsRequest>`;
  return {
    sendSubmissionsRequestXml,
    containerZipBytes: zipSync(files, { level: 0 }),
  };
}
