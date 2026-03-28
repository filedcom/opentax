import mammoth from "mammoth";
import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";

const td = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced" });
td.use(gfm);

/**
 * Converts a DOCX file to one Markdown string per page.
 * Word page breaks (`<w:br w:type="page"/>`) become `<hr>` separators via mammoth,
 * then each section is converted to Markdown independently.
 * Documents with no page breaks return a single-element array.
 */
export async function docxToPages(filePath: string): Promise<string[]> {
  const arrayBuffer = (await Deno.readFile(filePath)).buffer;
  const { value: html } = await mammoth.convertToHtml(
    { arrayBuffer },
    { styleMap: ["br[type='page'] => hr"] },
  );

  return html
    .split(/<hr\s*\/?>/gi)
    .map((part) => td.turndown(part.trim()))
    .filter((content) => content.length > 0);
}
