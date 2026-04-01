export function escapeXml(value: string): string {
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
  const content = typeof value === "number" ? String(Math.round(value)) : escapeXml(value);
  const attrsStr = attrs
    ? Object.entries(attrs).map(([k, v]) => ` ${k}="${v}"`).join("")
    : "";
  return `<${tag}${attrsStr}>${content}</${tag}>`;
}

export function elements(tag: string, children: string[]): string {
  const filtered = children.filter((c) => c !== "");
  if (filtered.length === 0) return "";
  return `<${tag}>${filtered.join("")}</${tag}>`;
}
