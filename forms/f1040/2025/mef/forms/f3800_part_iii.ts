import type { Form3800PassiveXmlRow } from "./f3800_passive_rows.ts";
import {
  type Form3800CreditLine,
  form3800PassiveXmlTags,
} from "./f3800_passive_tags.ts";

export type Form3800PartIIIInput = {
  readonly rows: readonly Form3800PassiveXmlRow[];
  readonly standardSubtotal: string;
  readonly specifiedSubtotal: string;
  readonly total: string;
};

/** Place one current-year group per credit line in TY2025 IRS3800.xsd order. */
export function buildForm3800PartIIIXml(
  input: Form3800PartIIIInput,
): string[] {
  const orderedLines = (Object.keys(
    form3800PassiveXmlTags,
  ) as Form3800CreditLine[]).filter((line) =>
    form3800PassiveXmlTags[line].current
  );
  const rowByLine = new Map(input.rows.map((row) => [row.line, row.xml]));
  if (
    rowByLine.size !== input.rows.length ||
    input.rows.some((row) => !orderedLines.includes(row.line) || !row.xml) ||
    !input.total ||
    (input.rows.some((row) => row.line.startsWith("1")) &&
      !input.standardSubtotal) ||
    (input.rows.some((row) => row.line.startsWith("4")) &&
      !input.specifiedSubtotal)
  ) {
    throw new Error("Form 3800 Part III rows or subtotals do not reconcile");
  }
  const standard = orderedLines.filter((line) => line.startsWith("1"));
  const specified = orderedLines.filter((line) => line.startsWith("4"));
  return [
    ...standard.flatMap((line) => {
      const xml = rowByLine.get(line);
      return xml ? [xml] : [];
    }),
    input.standardSubtotal,
    rowByLine.get("3") ?? "",
    ...specified.flatMap((line) => {
      const xml = rowByLine.get(line);
      return xml ? [xml] : [];
    }),
    input.specifiedSubtotal,
    input.total,
  ].filter(Boolean);
}
