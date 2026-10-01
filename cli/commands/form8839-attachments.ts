import { join } from "@std/path";
import type { MefPdfAttachment } from "../../forms/f1040/2025/mef/form-descriptor.ts";
import { parsePublicForm8839Source } from "../../forms/f1040/nodes/intermediate/forms/form8839/public_source.ts";

/** Load the existing Form 8839 manifest from this return's attachment folder. */
export async function loadForm8839Attachments(
  returnPath: string,
  pending: Readonly<Record<string, unknown>>,
): Promise<ReadonlyArray<MefPdfAttachment>> {
  const route = pending.form8839_route as
    | { readonly public_source?: unknown }
    | undefined;
  if (!route) return [];
  const { publicSource } = parsePublicForm8839Source(route.public_source);
  const directory = join(returnPath, "attachments");
  const directoryStat = await Deno.lstat(directory);
  if (!directoryStat.isDirectory || directoryStat.isSymlink) {
    throw new Error(
      "Form 8839 attachments path must be a return-owned directory",
    );
  }
  const attachments: MefPdfAttachment[] = [];
  for (const document of publicSource.documents) {
    const name = document.file_name;
    if (name.includes("..") || name === "." || name === "..") {
      throw new Error(`Form 8839 attachment filename is unsafe: ${name}`);
    }
    const path = join(directory, name);
    const fileStat = await Deno.lstat(path);
    if (!fileStat.isFile || fileStat.isSymlink || fileStat.size > 60_000_000) {
      throw new Error(`Form 8839 attachment must be a regular PDF: ${name}`);
    }
    attachments.push({
      fileName: name,
      description: document.description,
      bytes: await Deno.readFile(path),
    });
  }
  return attachments;
}
