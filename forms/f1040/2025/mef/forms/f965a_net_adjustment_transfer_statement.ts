import { element, elements } from "../../../mef/xml.ts";
import { inputSchema } from "../../../nodes/inputs/f965/index.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

export const form965aNetAdjustmentTransferStatement: MefFormDescriptor<
  "f965_net_adjustment_transfer_statement",
  unknown
> = {
  pendingKey: "f965_net_adjustment_transfer_statement",
  sourcePendingKeys: ["f965"],
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f965a.pdf",
  build(_fields, context = {}) {
    const raw = context.pending?.f965;
    if (!raw) return "";
    const input = inputSchema.parse(raw);
    const rows = input.f965s.filter((row) =>
      row.net_tax_adjustment_kind === "netted_adjustment_and_transfer"
    );
    if (rows.length === 0) return "";
    return elements(
      "NetAdjustmentTransferStmt",
      rows.map((row) => {
        const details = row.netted_adjustment_and_transfer;
        if (!details) {
          throw new Error(
            "Form 965-A netted transaction lacks statement facts",
          );
        }
        const description =
          `Form 965-A liability year ${row.tax_year_of_inclusion}: adjustment ${details.adjustment_amount}; transferred out ${details.transferred_out_amount}; net Part I column j ${row.net_tax_adjustment}. ${details.explanation} Source: ${details.source_document_reference}.`;
        if (description.length > 9000) {
          throw new Error(
            "Form 965-A net adjustment statement explanation is too long",
          );
        }
        return element("NetAdjustmentTransferDesc", description);
      }),
    );
  },
};
