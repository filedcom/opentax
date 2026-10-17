import { lstat, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { MefPdfAttachment } from "../../forms/f1040/2025/mef/form-descriptor.ts";
import { inputSchema as f8835InputSchema } from "../../forms/f1040/nodes/inputs/credits/business/f8835/index.ts";
import { FORM8835_PURCHASE_STATEMENT_DESCRIPTION } from "../../forms/f1040/nodes/inputs/credits/business/f8835/purchase-source.ts";
import { inputSchema as generalInputSchema } from "../../forms/f1040/nodes/inputs/general/filing/general/index.ts";

export type RetainedSourceDocument = {
  readonly document_reference: string;
  readonly bytes: Uint8Array;
};

async function readOwnedFile(
  directory: string,
  name: string,
): Promise<Uint8Array> {
  if (name.includes("/") || name.includes("\\") || name.includes("..")) {
    throw new Error(`Return source file name is unsafe: ${name}`);
  }
  const folder = await lstat(directory);
  if (!folder.isDirectory() || folder.isSymbolicLink()) {
    throw new Error(`Return source folder must be return-owned: ${directory}`);
  }
  const path = join(directory, name);
  const file = await lstat(path);
  if (!file.isFile() || file.isSymbolicLink() || file.size > 60_000_000) {
    throw new Error(`Return source file must be a regular file: ${name}`);
  }
  return new Uint8Array(await readFile(path));
}

/** Form 8835 purchased-credit statements named by the return, from attachments/. */
export async function loadForm8835PurchaseAttachments(
  returnPath: string,
  pending: Readonly<Record<string, unknown>>,
): Promise<ReadonlyArray<MefPdfAttachment>> {
  if (!pending.f8835) return [];
  const names = f8835InputSchema.parse(pending.f8835).f8835s.flatMap((item) =>
    item.purchase_source ? [item.purchase_source.statement_file_name] : []
  );
  return Promise.all(names.map(async (fileName) => ({
    fileName,
    description: FORM8835_PURCHASE_STATEMENT_DESCRIPTION,
    bytes: await readOwnedFile(join(returnPath, "attachments"), fileName),
  })));
}

/** Prior IRS notice copies the Form 8862 export verifies, from retained/. */
export async function loadForm8862RetainedNotices(
  returnPath: string,
  pending: Readonly<Record<string, unknown>>,
): Promise<ReadonlyArray<RetainedSourceDocument>> {
  if (!pending.f8862) return [];
  const general = generalInputSchema.safeParse(pending.general ?? {});
  if (!general.success) return [];
  const references = [
    general.data.prior_eic_disallowance_review,
    general.data.prior_ctc_disallowance_review,
    general.data.prior_aotc_disallowance_review,
  ].flatMap((review) =>
    review && "notice_copy_reference" in review && review.notice_copy_reference
      ? [review.notice_copy_reference]
      : []
  );
  return Promise.all(
    [...new Set(references)].map(async (reference) => ({
      document_reference: reference,
      bytes: await readOwnedFile(join(returnPath, "retained"), reference),
    })),
  );
}
