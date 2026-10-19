import { z } from "zod";
import { w2gPayerCopyFixture } from "../../../../domains/income/other/w2g_payer_copy.fixture.ts";
import type { FilerIdentity } from "../../../../../mef/header.ts";
import type { MefPdfAttachment } from "../../../../mef/form-descriptor.ts";
import { sha256Hex } from "../../../../return-processing/prepared-source.ts";
import { itemSchema } from "../../../../../nodes/inputs/income/gambling/w2g/index.ts";
import { withheldW2GCopies } from "../../../forms/income/gambling/w2g.ts";
import { w2gCopyBLayout } from "../../../forms/income/gambling/w2g_copy_b.ts";

type W2GItem = z.input<typeof itemSchema>;

/** Synthetic payer Copy B on the official template, byte-bound to one sample W-2G; no payer authentication. */
export async function withSyntheticW2GCopy<T extends W2GItem>(
  caseId: string,
  item: T,
  filer: FilerIdentity,
  calendarYear = 2025,
): Promise<{
  item: T & {
    issued_copy_attachment_file_name: string;
    issued_copy_pdf_sha256: string;
  };
  attachment: MefPdfAttachment;
}> {
  const [projected] = withheldW2GCopies(
    { w2gs: [item] },
    filer,
    { f1040: { line25c_total: item.box4_federal_withheld } },
    calendarYear,
  );
  if (!projected) throw new Error("Synthetic W-2G copy needs its projection");
  const bytes = await w2gPayerCopyFixture(
    projected,
    w2gCopyBLayout(calendarYear),
  );
  const fileName = `${caseId}-W2G-CopyB.pdf`;
  return {
    item: {
      ...item,
      issued_copy_attachment_file_name: fileName,
      issued_copy_pdf_sha256: await sha256Hex(bytes),
    },
    attachment: {
      fileName,
      description: "Synthetic sample payer-issued Form W-2G Copy B",
      bytes,
    },
  };
}
