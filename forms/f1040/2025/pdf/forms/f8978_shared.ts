import type { FilerIdentity } from "../../../mef/header.ts";
import { reconcileForm8978Source } from "../../form8978_source.ts";
export function form8978PdfSource(
  allPending: Record<string, Record<string, unknown>>,
  filer: FilerIdentity | undefined,
) {
  const { filings } = reconcileForm8978Source(allPending, filer);
  const name = filer?.nameLine1?.trim(),
    tin = filer?.primarySSN?.replaceAll("-", "");
  if (!name || !tin || !/^\d{9}$/.test(tin)) {
    throw new Error("Form8978 PDF needs filing partner identity");
  }
  return { filings, name, tin };
}
