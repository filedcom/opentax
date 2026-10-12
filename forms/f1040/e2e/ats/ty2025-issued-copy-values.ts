import { XMLParser, XMLValidator } from "fast-xml-parser";

export interface IssuedCopyTarget {
  sourcePage: number;
  copyName: string;
  fields: Readonly<Record<string, string | number | boolean>>;
}
const record = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v);
const name = (v: unknown) =>
  typeof v === "string" ? v.trim().replace(/\s+/g, " ").toUpperCase() : null;
const parser = new XMLParser({
  ignoreAttributes: true,
  parseTagValue: false,
  removeNSPrefix: true,
});
type Result =
  | "match"
  | "different"
  | "not-evaluated"
  | "invalid-xml"
  | "missing-copy"
  | "ambiguous-copy"
  | "missing-field"
  | "invalid-value";

/** Match whole copies by reviewed issuer name; never pair fields separately
 * or use order, amounts, recipient identity, or EIN to force a match.
 * Duplicate names are ambiguous, including identical duplicate copies.
 */
export function compareAtsIssuedCopyValues(
  xml: string | null,
  targets: readonly IssuedCopyTarget[],
  mapping: {
    root: string;
    nameField: string;
    stringPatterns: Readonly<Record<string, RegExp>>;
  },
) {
  let copies: unknown[] | undefined;
  if (xml !== null && XMLValidator.validate(xml) === true) {
    const parsed = parser.parse(xml);
    if (record(parsed.Return) && record(parsed.Return.ReturnData)) {
      const raw = parsed.Return.ReturnData[mapping.root];
      copies = raw === undefined ? [] : Array.isArray(raw) ? raw : [raw];
    }
  }
  const rows = targets.flatMap((t) => {
    const found = copies?.filter((copy) => {
      if (!record(copy)) return false;
      const issuer = copy[mapping.nameField];
      if (!record(issuer)) return false;
      const first = issuer.BusinessNameLine1Txt;
      const second = issuer.BusinessNameLine2Txt;
      if (
        typeof first !== "string" ||
        (second !== undefined && typeof second !== "string")
      ) return false;
      return name([first, second].filter((v) => v !== undefined).join(" ")) ===
        name(t.copyName);
    }) ?? [];
    return Object.entries(t.fields).map(([field, expected]) => {
      let result: Result;
      let actual: string | number | boolean | null = null;
      const copy = found[0];
      if (xml === null) result = "not-evaluated";
      else if (!copies) result = "invalid-xml";
      else if (!found.length) result = "missing-copy";
      else if (found.length !== 1) result = "ambiguous-copy";
      else {
        const value = record(copy) ? copy[field] : undefined;
        if (typeof expected === "boolean") {
          // CheckboxType is X when selected; absence on an existing copy is false.
          actual = value === undefined ? false : value === "X" ? true : null;
        } else if (typeof expected === "string") {
          actual = typeof value === "string" &&
              mapping.stringPatterns[field]?.test(value) === true
            ? value
            : null;
        } else if (
          typeof value === "string" && /^-?\d+$/.test(value) &&
          Number.isSafeInteger(Number(value))
        ) {
          actual = Number(value);
        }
        result = value === undefined && typeof expected !== "boolean"
          ? "missing-field"
          : actual === null
          ? "invalid-value"
          : actual === expected
          ? "match"
          : "different";
      }
      return {
        sourcePage: t.sourcePage,
        copyName: t.copyName,
        field,
        expected,
        actual,
        result,
      };
    });
  });
  return rows;
}
