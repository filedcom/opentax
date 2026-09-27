import { elements } from "../../../mef/xml.ts";
import type { Form3800PassiveXmlRow } from "./f3800_passive_rows.ts";
import { form3800CurrentDetailXmlTags } from "./f3800_passive_tags.ts";

/** One Part V aggregate group, ordered by the TY2025 IRS3800.xsd rows. */
export function buildForm3800PartVXml(
  rows: readonly Form3800PassiveXmlRow[],
): string {
  const lineOrder = Object.keys(form3800CurrentDetailXmlTags);
  for (const row of rows) {
    if (!form3800CurrentDetailXmlTags[row.line] || !row.xml) {
      throw new Error("Form 3800 Part V row needs a supported line and XML");
    }
  }
  const ordered = [...rows].sort((a, b) =>
    lineOrder.indexOf(a.line) - lineOrder.indexOf(b.line)
  );
  return elements(
    "GBCBreakdownCYAggrgtAmtGrp",
    ordered.map((row) => row.xml),
  );
}
