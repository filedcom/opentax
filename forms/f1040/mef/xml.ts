import { roundWholeDollars } from "../whole-dollars.ts";
export function escapeXml(value: string): string {
  for (const char of value) {
    const codePoint = char.codePointAt(0)!;
    if (
      (codePoint < 0x20 && codePoint !== 0x09 && codePoint !== 0x0a &&
        codePoint !== 0x0d) ||
      (codePoint >= 0xd800 && codePoint <= 0xdfff) ||
      codePoint === 0xfffe || codePoint === 0xffff
    ) {
      throw new Error(
        `MeF XML contains invalid character U+${
          codePoint.toString(16).toUpperCase()
        }`,
      );
    }
  }
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function element(
  tag: string,
  value: string | number | undefined,
  attrs?: Record<string, string>,
): string {
  if (value === undefined) return "";
  if (typeof value === "number" && !Number.isFinite(value)) {
    throw new Error(`MeF XML ${tag} has a nonfinite numeric value`);
  }
  const content = typeof value === "number"
    ? String(roundWholeDollars(value))
    : escapeXml(value);
  const attrsStr = attrs
    ? Object.entries(attrs).map(([k, v]) => ` ${k}="${escapeXml(v)}"`).join("")
    : "";
  return `<${tag}${attrsStr}>${content}</${tag}>`;
}

export function elements(
  tag: string,
  children: string[],
  attrs?: Record<string, string>,
): string {
  const filtered = children.filter((c) => c !== "");
  if (filtered.length === 0) return "";
  const attrsStr = attrs
    ? Object.entries(attrs).map(([name, value]) =>
      ` ${name}="${escapeXml(value)}"`
    ).join("")
    : "";
  return `<${tag}${attrsStr}>${filtered.join("")}</${tag}>`;
}
