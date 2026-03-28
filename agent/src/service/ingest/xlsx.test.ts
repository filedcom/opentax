import { assertEquals, assertStringIncludes } from "@std/assert";
import * as XLSX from "xlsx";
import { xlsxBytesToSheets } from "./xlsx.ts";

function makeXlsx(sheets: Record<string, string[][]>): Uint8Array {
  const wb = XLSX.utils.book_new();
  for (const [name, rows] of Object.entries(sheets)) {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, name);
  }
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Uint8Array;
}

Deno.test("xlsxBytesToSheets - single sheet returns one page", () => {
  const data = makeXlsx({ Sheet1: [["Name", "Amount"], ["Wages", "85000"]] });
  const pages = xlsxBytesToSheets(data);
  assertEquals(pages.length, 1);
  assertStringIncludes(pages[0], "## Sheet1");
  assertStringIncludes(pages[0], "| Name | Amount |");
  assertStringIncludes(pages[0], "| --- | --- |");
  assertStringIncludes(pages[0], "| Wages | 85000 |");
});

Deno.test("xlsxBytesToSheets - multiple sheets returns one page per sheet", () => {
  const data = makeXlsx({
    W2s: [["Employer", "Box1"], ["Acme", "85000"]],
    "1099s": [["Payer", "Amount"], ["Chase", "320"]],
  });
  const pages = xlsxBytesToSheets(data);
  assertEquals(pages.length, 2);
  assertStringIncludes(pages[0], "## W2s");
  assertStringIncludes(pages[0], "Acme");
  assertStringIncludes(pages[1], "## 1099s");
  assertStringIncludes(pages[1], "Chase");
});

Deno.test("xlsxBytesToSheets - skips empty sheets", () => {
  const data = makeXlsx({ Empty: [], Data: [["A", "B"], ["1", "2"]] });
  const pages = xlsxBytesToSheets(data);
  assertEquals(pages.length, 1);
  assertStringIncludes(pages[0], "## Data");
});

Deno.test("xlsxBytesToSheets - pads short rows", () => {
  const data = makeXlsx({ Sheet1: [["A", "B", "C"], ["only_one"]] });
  const pages = xlsxBytesToSheets(data);
  assertStringIncludes(pages[0], "| only_one |  |  |");
});
