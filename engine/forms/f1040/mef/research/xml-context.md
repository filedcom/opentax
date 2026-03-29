# MeF XML Helpers — Spec

## Purpose
Low-level pure functions for building XML strings. No business logic. No MeF-specific knowledge.

## Functions

### `escapeXml(value: string): string`
Escapes special XML characters in a string value.

| Character | Escape |
|-----------|--------|
| `&`       | `&amp;` |
| `<`       | `&lt;` |
| `>`       | `&gt;` |
| `"`       | `&quot;` |
| `'`       | `&apos;` |

Rules:
- Input is a string. Returns a string.
- Empty string in, empty string out.
- No characters other than the five above are escaped.
- The function is pure (no side effects, same input always produces same output).

### `element(tag: string, value: string | number | undefined, attrs?: Record<string, string>): string`
Builds a single XML element string.

Rules:
- If `value` is `undefined`, returns empty string `""` (element is omitted entirely).
- If `value` is a number, converts to string without decimal (integers only — tax amounts are always whole dollars).
- If `value` is a string, escapes via `escapeXml`.
- If `attrs` is provided, each key-value pair is rendered as ` key="value"` on the opening tag. Attr values are NOT escaped (callers pass safe values like IDs and codes).
- Output format: `<Tag>escapedValue</Tag>` with no extra whitespace.
- Output with attrs: `<Tag attr1="v1" attr2="v2">escapedValue</Tag>`.

### `elements(tag: string, children: string[]): string`
Wraps an array of child strings in a parent element.

Rules:
- Filters out empty strings from `children` before wrapping.
- If all children are empty, returns empty string `""` (no empty wrapper element).
- No indentation — output is flat/minified.
- Output format: `<Tag>child1child2child3</Tag>`.

## Edge Cases

| Scenario | Expected |
|----------|----------|
| `escapeXml("")` | `""` |
| `escapeXml("AT&T")` | `"AT&amp;T"` |
| `escapeXml("<script>")` | `"&lt;script&gt;"` |
| `escapeXml("Say \"hello\"")` | `"Say &quot;hello&quot;"` |
| `escapeXml("it's")` | `"it&apos;s"` |
| `escapeXml("no specials")` | `"no specials"` |
| `element("Amt", undefined)` | `""` |
| `element("Amt", 0)` | `"<Amt>0</Amt>"` |
| `element("Amt", 50000)` | `"<Amt>50000</Amt>"` |
| `element("Nm", "O'Brien & Sons")` | `"<Nm>O&apos;Brien &amp; Sons</Nm>"` |
| `element("Id", "doc1", { type: "IRS1040" })` | `"<Id type=\"IRS1040\">doc1</Id>"` |
| `elements("Parent", [])` | `""` |
| `elements("Parent", ["", ""])` | `""` |
| `elements("Parent", ["<A>1</A>", ""])` | `"<Parent><A>1</A></Parent>"` |
| `elements("Parent", ["<A>1</A>", "<B>2</B>"])` | `"<Parent><A>1</A><B>2</B></Parent>"` |
