import { inputSchema as k1Schema } from "../../../nodes/inputs/k1_partnership/index.ts";
import {
  type F8611Item,
  inputSchema,
} from "../../../nodes/inputs/f8611/index.ts";
import { issuedPartnershipRecaptures } from "../../../nodes/inputs/f8611/partnership-source.ts";
import type { FilerIdentity } from "../../../mef/header.ts";
export function assertForm8611IssuerSources(
  items: readonly F8611Item[],
  pending: Readonly<Record<string, unknown>> | undefined,
  filer: FilerIdentity | undefined,
) {
  if (!items.some((i) => i.issuer_source)) {
    const source = pending?.k1_partnership;
    if (source && k1Schema.parse(source).k1_partnerships.some(k => k.box20_code_f_lihtc_recapture)) {
      throw new Error("Actual issued K1 recapture cannot lose its building source identity");
    }
    return;
  }
  if (!pending || !filer) {
    throw new Error("Issued K1 Form8611 needs finalized source and filer");
  }
  const ks = k1Schema.parse(pending.k1_partnership).k1_partnerships;
  const expected =
    inputSchema.parse({ f8611s: issuedPartnershipRecaptures(ks) }).f8611s;
  const tins = new Set(
    [filer.primarySSN, filer.spouse?.ssn].filter(Boolean).map((t) =>
      t!.replace(/\D/g, "")
    ),
  );
  if (
    items.some((i) =>
      !i.issuer_source || !tins.has(i.issuer_source.recipient_tin)
    )
  ) {
    throw new Error(
      "Issued K1 recapture recipient differs from finalized filer",
    );
  }
  const sorted = (rows: readonly F8611Item[]) =>
    [...rows].sort((a, b) => a.building_bin.localeCompare(b.building_bin));
  if (JSON.stringify(sorted(items)) !== JSON.stringify(sorted(expected))) {
    throw new Error(
      "Form8611 building recapture differs from actual issued K1 sources",
    );
  }
}
