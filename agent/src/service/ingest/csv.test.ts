import { assertEquals } from "@std/assert";
import { csvContentToMarkdown } from "./csv.ts";

Deno.test("csvContentToMarkdown - basic table", () => {
  const csv = "Name,Amount\nWages,85000\nInterest,320";
  const md = csvContentToMarkdown(csv);
  assertEquals(md, [
    "| Name | Amount |",
    "| --- | --- |",
    "| Wages | 85000 |",
    "| Interest | 320 |",
  ].join("\n"));
});

Deno.test("csvContentToMarkdown - header only", () => {
  const md = csvContentToMarkdown("Col1,Col2");
  assertEquals(md, "| Col1 | Col2 |\n| --- | --- |");
});

Deno.test("csvContentToMarkdown - empty input returns empty string", () => {
  assertEquals(csvContentToMarkdown(""), "");
});

Deno.test("csvContentToMarkdown - single column", () => {
  const md = csvContentToMarkdown("Value\n100\n200");
  assertEquals(md, "| Value |\n| --- |\n| 100 |\n| 200 |");
});

Deno.test("csvToMarkdown - reads from file", async () => {
  const tmpPath = await Deno.makeTempFile({ suffix: ".csv" });
  try {
    await Deno.writeTextFile(tmpPath, "Box,Amount\nBox 1,85000");
    const { csvToMarkdown } = await import("./csv.ts");
    const md = await csvToMarkdown(tmpPath);
    assertEquals(md, "| Box | Amount |\n| --- | --- |\n| Box 1 | 85000 |");
  } finally {
    await Deno.remove(tmpPath);
  }
});
