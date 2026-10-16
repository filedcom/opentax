import { test } from "bun:test";
import { assertEquals, assertThrows } from "@std/assert";
import { element, elements, escapeXml } from "./xml.ts";

// ---------------------------------------------------------------------------
// 1. escapeXml — special character escaping
// ---------------------------------------------------------------------------

test("escapeXml: escapes ampersand", () => {
  assertEquals(escapeXml("&"), "&amp;");
});

test("escapeXml: escapes less-than", () => {
  assertEquals(escapeXml("<"), "&lt;");
});

test("escapeXml: escapes greater-than", () => {
  assertEquals(escapeXml(">"), "&gt;");
});

test("escapeXml: escapes double quote", () => {
  assertEquals(escapeXml('"'), "&quot;");
});

test("escapeXml: escapes single quote", () => {
  assertEquals(escapeXml("'"), "&apos;");
});

test("escapeXml: no-op on plain string", () => {
  assertEquals(escapeXml("no specials"), "no specials");
});

// ---------------------------------------------------------------------------
// 2. escapeXml — edge cases
// ---------------------------------------------------------------------------

test("escapeXml: empty string in, empty string out", () => {
  assertEquals(escapeXml(""), "");
});

test("escapeXml: multi-char: ampersand mid-word", () => {
  assertEquals(escapeXml("AT&T"), "AT&amp;T");
});

test("escapeXml: multi-char: tag-like string", () => {
  assertEquals(escapeXml("<script>"), "&lt;script&gt;");
});

test("escapeXml: multi-char: double quotes in sentence", () => {
  assertEquals(escapeXml('Say "hello"'), "Say &quot;hello&quot;");
});

test("escapeXml: multi-char: apostrophe in word", () => {
  assertEquals(escapeXml("it's"), "it&apos;s");
});

test("escapeXml: multi-char: multiple different specials", () => {
  assertEquals(escapeXml("O'Brien & Sons"), "O&apos;Brien &amp; Sons");
});

test("escapeXml rejects XML 1.0 control characters and unpaired surrogates", () => {
  for (
    const invalid of [
      "\u0000",
      "\u0001",
      "\u001f",
      "\ud800",
      "\udfff",
      "\ufffe",
      "\uffff",
    ]
  ) {
    assertThrows(() => escapeXml(`A${invalid}B`), Error, "invalid character");
    assertThrows(
      () => element("Nm", "A", { note: invalid }),
      Error,
      "invalid character",
    );
  }
  assertEquals(escapeXml("A\tB\nC\rD 😀"), "A\tB\nC\rD 😀");
});

// ---------------------------------------------------------------------------
// 3. element — undefined value
// ---------------------------------------------------------------------------

test("element: returns empty string when value is undefined", () => {
  assertEquals(element("Amt", undefined), "");
});

// ---------------------------------------------------------------------------
// 4. element — number values
// ---------------------------------------------------------------------------

test("element: zero renders as 0", () => {
  assertEquals(element("Amt", 0), "<Amt>0</Amt>");
});

test("element: positive integer renders without decimal", () => {
  assertEquals(element("Amt", 50000), "<Amt>50000</Amt>");
});

test("element rejects nonfinite amounts", () => {
  for (
    const invalid of [
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
    ]
  ) {
    assertThrows(
      () => element("WagesAmt", invalid),
      Error,
      "nonfinite numeric value",
    );
  }
});

// ---------------------------------------------------------------------------
// 5. element — string values
// ---------------------------------------------------------------------------

test("element: plain string is wrapped in tags", () => {
  assertEquals(element("Nm", "Alice"), "<Nm>Alice</Nm>");
});

test("element: string with special chars is escaped", () => {
  assertEquals(
    element("Nm", "O'Brien & Sons"),
    "<Nm>O&apos;Brien &amp; Sons</Nm>",
  );
});

// ---------------------------------------------------------------------------
// 6. element — with attrs
// ---------------------------------------------------------------------------

test("element: single attr is rendered on opening tag", () => {
  assertEquals(
    element("Id", "doc1", { type: "IRS1040" }),
    '<Id type="IRS1040">doc1</Id>',
  );
});

test("element: multiple attrs are all rendered", () => {
  assertEquals(
    element("El", "v", { a: "1", b: "2" }),
    '<El a="1" b="2">v</El>',
  );
});

test("element: attribute values escape source punctuation", () => {
  assertEquals(
    element("El", "v", { note: 'A&B "copy" <signed>' }),
    '<El note="A&amp;B &quot;copy&quot; &lt;signed&gt;">v</El>',
  );
});

// ---------------------------------------------------------------------------
// 7. elements — empty / all-empty children
// ---------------------------------------------------------------------------

test("elements: empty array returns empty string", () => {
  assertEquals(elements("Parent", []), "");
});

test("elements: array of all empty strings returns empty string", () => {
  assertEquals(elements("Parent", ["", ""]), "");
});

// ---------------------------------------------------------------------------
// 8. elements — filtering
// ---------------------------------------------------------------------------

test("elements: empty strings among children are filtered out", () => {
  assertEquals(
    elements("Parent", ["<A>1</A>", ""]),
    "<Parent><A>1</A></Parent>",
  );
});

test("elements: leading empty strings are filtered", () => {
  assertEquals(
    elements("Parent", ["", "<A>1</A>"]),
    "<Parent><A>1</A></Parent>",
  );
});

// ---------------------------------------------------------------------------
// 9. elements — valid children
// ---------------------------------------------------------------------------

test("elements: single child is wrapped", () => {
  assertEquals(elements("Parent", ["<A>1</A>"]), "<Parent><A>1</A></Parent>");
});

test("elements: multiple children are concatenated with no whitespace", () => {
  assertEquals(
    elements("Parent", ["<A>1</A>", "<B>2</B>"]),
    "<Parent><A>1</A><B>2</B></Parent>",
  );
});

test("native signed amounts preserve half-dollar losses and zero boundaries", () => {
  for (
    const [source, expected] of [
      [-10000.49, -10000],
      [-10000.5, -10001],
      [-10000.51, -10001],
      [-.49, 0],
      [-.5, -1],
      [.49, 0],
      [.5, 1],
      [10000.5, 10001],
    ]
  ) {
    assertEquals(element("LossAmt", source), `<LossAmt>${expected}</LossAmt>`);
  }
});
