/**
 * MeF Business Rules: X0000
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 18 rules (18 implemented, 0 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, alwaysPass, } from "../../../../core/validation/mod.ts";

export const X0000_RULES: readonly RuleDef[] = [
  rule(
    "X0000-005",
    "reject_and_stop",
    "xml_error",
    alwaysPass,
    "The XML data has failed schema validation.",
  ),
  rule(
    "X0000-008",
    "reject_and_stop",
    "xml_error",
    alwaysPass,
    "The namespace declarations in the root element of the return ('Return' element) must be as follows:The default namespace shall be set to \"http://www.irs.gov/efile\" (xmlns= \"http://www.irs.gov/efile\").The namespace prefix \"efile\" shall be bound to the namespace \"http://www.irs.gov\" (xmlns:efile=\"http://www.irs.gov/efile\").",
  ),
  rule(
    "X0000-010",
    "reject_and_stop",
    "incorrect_data",
    alwaysPass,
    "For each SubmissionID provided in the transmission manifest there must be a submission zip archive entry present in the Attachment Zip file whose name (without the \".zip\" extension) matches the SubmissionID.",
  ),
  rule(
    "X0000-011",
    "reject_and_stop",
    "incorrect_data",
    alwaysPass,
    "All entries in the submission zip archive (zip file that is the submission) must begin with \"manifest/\" or \"/manifest/\" or \"xml/\" or \"/xml/\" or \"attachment/\" or  \"/attachment/\" (all lower case characters).",
  ),
  rule(
    "X0000-012",
    "reject_and_stop",
    "incorrect_data",
    alwaysPass,
    "The name of a binary attachment file must be less than or equal to 64 bytes.",
  ),
  rule(
    "X0000-015",
    "reject_and_stop",
    "data_mismatch",
    alwaysPass,
    "Each zip entry in the Attachment Zip file must end with \".zip\" extension.",
  ),
  rule(
    "X0000-018",
    "reject_and_stop",
    "incorrect_data",
    alwaysPass,
    "A submission zip archive (zip file that is the submission) must contain exactly one entry that begins with  \"manifest/\" or \"/manifest/\" and is followed by the file name \"manifest.xml\".  The entry name must use lower case characters ('a' through 'z') only and the separator must be the forward slash character.",
  ),
  rule(
    "X0000-019",
    "reject_and_stop",
    "incorrect_data",
    alwaysPass,
    "A submission zip archive (zip file that is the submission) must contain exactly one entry that consists of \"xml/\" or \"/xml/\" (all lower case characters) followed by a file name.",
  ),
  rule(
    "X0000-020",
    "reject_and_stop",
    "incorrect_data",
    alwaysPass,
    "A submission zip archive (zip file that is the submission) may contain zero or more entries that begin with \"attachment/\" or \"/attachment/\" and each is followed by a file name.  The entry name must use lower case characters ('a' through 'z') only and the separator must be the forward slash character.",
  ),
  rule(
    "X0000-024",
    "reject_and_stop",
    "incorrect_data",
    alwaysPass,
    "Unable to read a binary attachment in the Submission Zip Archive.",
  ),
  rule(
    "X0000-025",
    "reject_and_stop",
    "incorrect_data",
    alwaysPass,
    "Unable to read XML data from the Submission Zip Archive.",
  ),
  rule(
    "X0000-027",
    "reject",
    "incorrect_data",
    alwaysPass,
    "Year (YYYY) in the SubmissionID must be processing year.",
  ),
  rule(
    "X0000-028",
    "reject",
    "incorrect_data",
    alwaysPass,
    "A single PDF file must not exceed 60MB in size.",
  ),
  rule(
    "X0000-029",
    "reject_and_stop",
    "incorrect_data",
    alwaysPass,
    "A binary attachment submitted in the PDF format must begin with the file header \"%PDF-\".",
  ),
  rule(
    "X0000-030",
    "reject_and_stop",
    "incorrect_data",
    alwaysPass,
    "The size and CRC32 checksum value must be provided for the submission XML file (i.e. xml data file that starts with \"xml/\" or \"/xml/\").",
  ),
  rule(
    "X0000-031",
    "reject_and_stop",
    "incorrect_data",
    alwaysPass,
    "Zip Entry names must conform to the guidelines in Publication 4164.",
  ),
  rule(
    "X0000-032",
    "reject_and_stop",
    "incorrect_data",
    alwaysPass,
    "Unable to extract submission Zip Archive from the Message Attachment zip file.",
  ),
  rule(
    "X0000-033",
    "reject_and_stop",
    "incorrect_data",
    alwaysPass,
    "Modernized e-File (MeF) accepts submissions only in the Unicode Transformation Format-8 (UTF-8) format.",
  ),
];
