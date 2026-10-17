/**
 * MeF Business Rules: X0000
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 18 rules (18 implemented, 0 stubs)
 *
 * Checked on the submission and transmission ZIPs a transmission-time context
 * carries (EnvelopeFact); a return-only context checks the attachment
 * references that become ZIP entry names.
 */

import type {
  ReturnContext,
  RuleCheck,
  RuleDef,
} from "../../../../../../core/validation/types.ts";
import { rule } from "../../../../../../core/validation/mod.ts";
import {
  EnvelopeFact,
  factText,
  factTexts,
} from "../../../../../../core/validation/predicates.ts";
import { isValidMefPdfFilename } from "../../../../2025/mef/attachments/pdf-attachment-filename.ts";
import {
  ATTACHMENT_ENTRY,
  MANIFEST_ENTRY,
  manifestText,
  readZip,
  type SubmissionEnvelope,
  submissionEnvelope,
  transmissionEntries,
  XML_ENTRY,
} from "./envelope.ts";

const EFILE_NAMESPACE = "http://www.irs.gov/efile";
// Pub 4164 caps one PDF at 60MB; the decimal reading is the stricter one.
const MAX_PDF_BYTES = 60_000_000;
const encoder = new TextEncoder();

/** The attachment file names the return references (AttachmentLocationTxt). */
const referencedFiles = (ctx: ReturnContext): readonly string[] =>
  ctx.fieldArray("BinaryAttachment/AttachmentLocationTxt").map(String);

/** Passes with no ZIP fact; fails on a ZIP fact that is not an archive. */
const onSubmission = (
  check: (envelope: SubmissionEnvelope) => boolean,
): RuleCheck =>
(ctx) => {
  const envelope = submissionEnvelope(ctx);
  return envelope === undefined || (envelope !== null && check(envelope));
};

const xmlEntries = (e: SubmissionEnvelope) =>
  e.entries.filter((entry) => XML_ENTRY.test(entry.name));

const isPdf = (fileName: string) => /\.pdf$/i.test(fileName);

/** Pub 4164 entry names: the manifest, one printable xml file name, or a valid attachment file name. */
const conformingName = (name: string): boolean => {
  if (MANIFEST_ENTRY.test(name)) return true;
  if (XML_ENTRY.test(name)) return /^\/?xml\/[\x21-\x7e]+$/.test(name);
  const fileName = ATTACHMENT_ENTRY.exec(name)?.[1];
  return fileName !== undefined && isValidMefPdfFilename(fileName);
};

const declaredEncoding = (xml: string): string =>
  /^<\?xml[^>]*\bencoding="([^"]+)"/.exec(xml)?.[1] ?? "UTF-8";

export const X0000_RULES: readonly RuleDef[] = [
  rule(
    "X0000-005",
    "reject_and_stop",
    "xml_error",
    // The structure every schema-valid return has; full XSD validation of the
    // emitted XML is the xmllint schema test's, then MeF's.
    (ctx) => {
      const envelope = submissionEnvelope(ctx);
      if (envelope === undefined) {
        const count = ctx.emittedDocumentCount?.();
        return count === undefined ||
          (count.actual === 0 && count.declared === undefined) ||
          count.actual > 0;
      }
      const xml = envelope?.xml;
      return xml !== undefined && /<Return\b[^>]*>/.test(xml) &&
        /<ReturnHeader\b/.test(xml) && /<ReturnData\b/.test(xml) &&
        /<\/Return>\s*$/.test(xml);
    },
    "The XML data has failed schema validation.",
  ),
  rule(
    "X0000-008",
    "reject_and_stop",
    "xml_error",
    onSubmission((e) => {
      const root = /<Return\b[^>]*>/.exec(e.xml ?? "")?.[0] ?? "";
      return root.includes(`xmlns="${EFILE_NAMESPACE}"`) &&
        root.includes(`xmlns:efile="${EFILE_NAMESPACE}"`);
    }),
    "The namespace declarations in the root element of the return ('Return' element) must be as follows:The default namespace shall be set to \"http://www.irs.gov/efile\" (xmlns= \"http://www.irs.gov/efile\").The namespace prefix \"efile\" shall be bound to the namespace \"http://www.irs.gov\" (xmlns:efile=\"http://www.irs.gov/efile\").",
  ),
  rule(
    "X0000-010",
    "reject_and_stop",
    "incorrect_data",
    (ctx) => {
      const ids = factTexts(ctx, EnvelopeFact.TransmissionSubmissionIds);
      if (ids.length === 0) return true;
      const names = new Set(
        (transmissionEntries(ctx) ?? []).map((entry) => entry.name),
      );
      return ids.every((id) => names.has(`${id}.zip`));
    },
    "For each SubmissionID provided in the transmission manifest there must be a submission zip archive entry present in the Attachment Zip file whose name (without the \".zip\" extension) matches the SubmissionID.",
  ),
  rule(
    "X0000-011",
    "reject_and_stop",
    "incorrect_data",
    onSubmission((e) =>
      e.entries.every((entry) =>
        /^\/?(?:manifest|xml|attachment)\//.test(entry.name)
      )
    ),
    "All entries in the submission zip archive (zip file that is the submission) must begin with \"manifest/\" or \"/manifest/\" or \"xml/\" or \"/xml/\" or \"attachment/\" or  \"/attachment/\" (all lower case characters).",
  ),
  rule(
    "X0000-012",
    "reject_and_stop",
    "incorrect_data",
    (ctx) =>
      referencedFiles(ctx).every((name) => encoder.encode(name).length <= 64) &&
      onSubmission((e) =>
        e.attachments.every((a) => encoder.encode(a.fileName).length <= 64)
      )(ctx),
    "The name of a binary attachment file must be less than or equal to 64 bytes.",
  ),
  rule(
    "X0000-015",
    "reject_and_stop",
    "data_mismatch",
    (ctx) => {
      const entries = transmissionEntries(ctx);
      return entries === undefined ||
        (entries !== null &&
          entries.every((entry) => entry.name.endsWith(".zip")));
    },
    "Each zip entry in the Attachment Zip file must end with \".zip\" extension.",
  ),
  rule(
    "X0000-018",
    "reject_and_stop",
    "incorrect_data",
    onSubmission((e) =>
      e.entries.filter((entry) => /^\/?manifest[/\\]/i.test(entry.name))
          .length === 1 &&
      e.entries.filter((entry) => MANIFEST_ENTRY.test(entry.name)).length === 1
    ),
    "A submission zip archive (zip file that is the submission) must contain exactly one entry that begins with  \"manifest/\" or \"/manifest/\" and is followed by the file name \"manifest.xml\".  The entry name must use lower case characters ('a' through 'z') only and the separator must be the forward slash character.",
  ),
  rule(
    "X0000-019",
    "reject_and_stop",
    "incorrect_data",
    onSubmission((e) =>
      xmlEntries(e).length === 1 &&
      e.entries.filter((entry) => /^\/?xml[/\\]/i.test(entry.name)).length === 1
    ),
    "A submission zip archive (zip file that is the submission) must contain exactly one entry that consists of \"xml/\" or \"/xml/\" (all lower case characters) followed by a file name.",
  ),
  rule(
    "X0000-020",
    "reject_and_stop",
    "incorrect_data",
    (ctx) =>
      // A referenced file becomes the entry "attachment/<name>": a bare file name.
      referencedFiles(ctx).every((name) => name !== "" && !/[/\\]/.test(name)) &&
      onSubmission((e) =>
        e.entries
          .filter((entry) => /^\/?attachment[/\\]/i.test(entry.name))
          .every((entry) => ATTACHMENT_ENTRY.test(entry.name))
      )(ctx),
    "A submission zip archive (zip file that is the submission) may contain zero or more entries that begin with \"attachment/\" or \"/attachment/\" and each is followed by a file name.  The entry name must use lower case characters ('a' through 'z') only and the separator must be the forward slash character.",
  ),
  rule(
    "X0000-024",
    "reject_and_stop",
    "incorrect_data",
    onSubmission((e) => e.attachments.every((a) => a.bytes !== undefined)),
    "Unable to read a binary attachment in the Submission Zip Archive.",
  ),
  rule(
    "X0000-025",
    "reject_and_stop",
    "incorrect_data",
    onSubmission((e) => e.xml !== undefined),
    "Unable to read XML data from the Submission Zip Archive.",
  ),
  rule(
    "X0000-027",
    "reject",
    "incorrect_data",
    (ctx) => {
      const id = manifestText(submissionEnvelope(ctx), "SubmissionId");
      const processed = factText(ctx, EnvelopeFact.ProcessingDate);
      // The transmit date stands in for MeF's receipt date, which only MeF records.
      return id === undefined || processed === undefined ||
        id.slice(6, 10) === processed.slice(0, 4);
    },
    "Year (YYYY) in the SubmissionID must be processing year.",
  ),
  rule(
    "X0000-028",
    "reject",
    "incorrect_data",
    onSubmission((e) =>
      e.attachments.filter((a) => isPdf(a.fileName))
        .every((a) => a.size <= MAX_PDF_BYTES)
    ),
    "A single PDF file must not exceed 60MB in size.",
  ),
  rule(
    "X0000-029",
    "reject_and_stop",
    "incorrect_data",
    (ctx) => {
      const pdfNames = new Set(
        (ctx.groupInstances?.("BinaryAttachment", [
          "DocumentTypeCd",
          "AttachmentLocationTxt",
        ]) ?? [])
          .filter((g) => String(g.field("DocumentTypeCd") ?? "") === "PDF")
          .map((g) => String(g.field("AttachmentLocationTxt") ?? "")),
      );
      return onSubmission((e) =>
        e.attachments
          .filter((a) => isPdf(a.fileName) || pdfNames.has(a.fileName))
          .every((a) =>
            a.bytes !== undefined &&
            String.fromCharCode(...a.bytes.subarray(0, 5)) === "%PDF-"
          )
      )(ctx);
    },
    "A binary attachment submitted in the PDF format must begin with the file header \"%PDF-\".",
  ),
  rule(
    "X0000-030",
    "reject_and_stop",
    "incorrect_data",
    // readZip keeps an entry's bytes only when its declared size and CRC-32 match.
    onSubmission((e) => xmlEntries(e).every((entry) => entry.bytes !== undefined)),
    "The size and CRC32 checksum value must be provided for the submission XML file (i.e. xml data file that starts with \"xml/\" or \"/xml/\").",
  ),
  rule(
    "X0000-031",
    "reject_and_stop",
    "incorrect_data",
    (ctx) =>
      referencedFiles(ctx).every(isValidMefPdfFilename) &&
      onSubmission((e) => e.entries.every((entry) => conformingName(entry.name)))(
        ctx,
      ),
    "Zip Entry names must conform to the guidelines in Publication 4164.",
  ),
  rule(
    "X0000-032",
    "reject_and_stop",
    "incorrect_data",
    (ctx) => {
      const entries = transmissionEntries(ctx);
      return entries === undefined ||
        (entries !== null &&
          entries.every((entry) =>
            entry.bytes !== undefined && readZip(entry.bytes) !== undefined
          ));
    },
    "Unable to extract submission Zip Archive from the Message Attachment zip file.",
  ),
  rule(
    "X0000-033",
    "reject_and_stop",
    "incorrect_data",
    // The envelope keeps the manifest and XML text only when they decode as UTF-8.
    onSubmission((e) =>
      [e.xml, e.manifest].every((text) =>
        text !== undefined && declaredEncoding(text).toUpperCase() === "UTF-8"
      )
    ),
    "Modernized e-File (MeF) accepts submissions only in the Unicode Transformation Format-8 (UTF-8) format.",
  ),
];
