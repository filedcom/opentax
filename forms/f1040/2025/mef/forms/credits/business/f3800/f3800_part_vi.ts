import type { Form3800PassiveXmlRow } from "./f3800_passive_rows.ts";
import { form3800CarryoverDetailXmlTags } from "./f3800_passive_tags.ts";

/** Keep Part VI vintage details in the source-line order of IRS3800.xsd. */
export function buildForm3800PartVIXml(
  rows: readonly Form3800PassiveXmlRow[],
): string[] {
  const lineOrder = Object.keys(form3800CarryoverDetailXmlTags);
  for (const row of rows) {
    if (!form3800CarryoverDetailXmlTags[row.line] || !row.xml) {
      throw new Error("Form 3800 Part VI row needs a supported line and XML");
    }
  }
  return [...rows].sort((a, b) =>
    lineOrder.indexOf(a.line) - lineOrder.indexOf(b.line)
  ).map((row) => row.xml);
}
