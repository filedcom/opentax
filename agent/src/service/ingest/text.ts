/**
 * Reads a plain text or Markdown file and returns its content as-is.
 * No transformation — these are already Markdown-compatible.
 */
export async function textToMarkdown(filePath: string): Promise<string> {
  return await Deno.readTextFile(filePath);
}
