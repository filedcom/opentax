import { assertEquals, assertStringIncludes } from "@std/assert";
import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";

// Verify the turndown + GFM configuration produces the output we depend on.
const td = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced" });
td.use(gfm);

Deno.test("turndown - ATX headings", () => {
  assertStringIncludes(td.turndown("<h1>Title</h1>"), "# Title");
  assertStringIncludes(td.turndown("<h2>Sub</h2>"), "## Sub");
});

Deno.test("turndown - bold and italic", () => {
  assertStringIncludes(td.turndown("<strong>bold</strong>"), "**bold**");
  assertStringIncludes(td.turndown("<em>italic</em>"), "_italic_");
});

Deno.test("turndown - GFM table", () => {
  const html = `
    <table>
      <thead><tr><th>Box</th><th>Amount</th></tr></thead>
      <tbody><tr><td>Box 1</td><td>85000</td></tr></tbody>
    </table>
  `;
  const md = td.turndown(html);
  assertStringIncludes(md, "Box");
  assertStringIncludes(md, "Amount");
  assertStringIncludes(md, "85000");
  assertStringIncludes(md, "|");
});

Deno.test("turndown - unordered list", () => {
  const md = td.turndown("<ul><li>Alpha</li><li>Beta</li></ul>");
  assertStringIncludes(md, "Alpha");
  assertStringIncludes(md, "Beta");
});

Deno.test("turndown - link", () => {
  const md = td.turndown(`<a href="https://irs.gov">IRS</a>`);
  assertStringIncludes(md, "IRS");
  assertStringIncludes(md, "https://irs.gov");
});

// Integration: requires a real .docx fixture
Deno.test("docxToPages - fixture", async () => {
  const fixturePath = new URL("./fixtures/sample.docx", import.meta.url).pathname;
  try {
    await Deno.stat(fixturePath);
  } catch {
    console.log("  skipped: fixture not found at", fixturePath);
    return;
  }

  const { docxToPages } = await import("./docx.ts");
  const pages = await docxToPages(fixturePath);
  assertEquals(Array.isArray(pages), true);
  assertEquals(pages.length > 0, true);
  assertEquals(typeof pages[0], "string");
});
