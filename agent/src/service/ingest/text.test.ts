import { assertEquals } from "@std/assert";
import { textToMarkdown } from "./text.ts";

Deno.test("textToMarkdown - returns file content verbatim", async () => {
  const content = "# Hello\n\nSome **markdown** content.\n";
  const tmpPath = await Deno.makeTempFile({ suffix: ".md" });
  try {
    await Deno.writeTextFile(tmpPath, content);
    const result = await textToMarkdown(tmpPath);
    assertEquals(result, content);
  } finally {
    await Deno.remove(tmpPath);
  }
});

Deno.test("textToMarkdown - plain text passthrough", async () => {
  const content = "Just plain text, no markdown.";
  const tmpPath = await Deno.makeTempFile({ suffix: ".txt" });
  try {
    await Deno.writeTextFile(tmpPath, content);
    const result = await textToMarkdown(tmpPath);
    assertEquals(result, content);
  } finally {
    await Deno.remove(tmpPath);
  }
});
