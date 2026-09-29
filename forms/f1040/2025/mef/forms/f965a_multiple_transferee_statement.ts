import { element, elements } from "../../../mef/xml.ts";
import { inputSchema } from "../../../nodes/inputs/f965/index.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

export const form965aMultipleTransfereeStatement: MefFormDescriptor<
  "f965_multiple_transferee_statement",
  unknown
> = {
  pendingKey: "f965_multiple_transferee_statement",
  sourcePendingKeys: ["f965"],
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f965a.pdf",
  build(_fields, context = {}) {
    const raw = context.pending?.f965;
    if (!raw) return "";
    const input = inputSchema.parse(raw);
    const rows = input.s_corp_deferred_rows.filter((row) =>
      row.multiple_transferees
    );
    if (rows.length === 0) return "";
    return elements(
      "MultipleTransfereeStmt",
      rows.map((row) => {
        const transferees = row.multiple_transferees;
        if (!transferees) {
          throw new Error(
            "Form 965-A multiple-transferee schedule lacks recipients",
          );
        }
        return elements("Net965TaxLiabTransferGrp", [
          element("ElectionTransferYr", row.election_or_transfer_year),
          element("SCorporationEIN", row.corporation_ein),
          element("DeferredNetTaxLiabTrnsfrAmt", row.transferred_liability),
          ...transferees.map((transferee) =>
            elements("TaxLiabilityTransfereeGrp", [
              element(
                transferee.tax_id.kind === "ein" ? "EIN" : "SSN",
                transferee.tax_id.value,
              ),
              element("TransferredAmt", -transferee.transferred_amount),
            ])
          ),
        ]);
      }),
    );
  },
};
