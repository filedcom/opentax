import { parse } from "@std/csv";

/**
 * Converts a CSV file to a Markdown table.
 * First row is treated as the header.
 */
export async function csvToMarkdown(filePath: string): Promise<string> {
  const content = await Deno.readTextFile(filePath);
  return csvContentToMarkdown(content);
}

/** Exported for unit testing without the filesystem. */
export function csvContentToMarkdown(content: string): string {
  const rows = parse(content) as string[][];
  if (rows.length === 0) return "";

  const [header, ...body] = rows;
  const separator = header.map(() => "---");

  return [
    `| ${header.join(" | ")} |`,
    `| ${separator.join(" | ")} |`,
    ...body.map((row) => `| ${row.join(" | ")} |`),
  ].join("\n");
}
