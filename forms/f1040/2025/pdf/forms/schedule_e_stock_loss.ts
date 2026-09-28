import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import { projectReviewedStockLoss7203 } from "../../form7203_stock_loss_projection.ts";

const page = "topmostSubform[0].Page2[0].";
const text = (domainKey: string, pdfField: string): PdfFieldEntry => ({
  kind: "text",
  domainKey,
  pdfField,
});

// The official TY2025 Schedule E page-2 AcroForm field tree was inspected.
// This is one Part II row A, with no Part I, III, IV, or farm-rental activity.
export const scheduleEStockLossPdf: PdfFormDescriptor = {
  pendingKey: "form7203",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f1040se--2025.pdf",
  pageIndices: () => [1],
  fields: [
    text("taxpayer_name", `${page}f2_1[0]`),
    text("taxpayer_ssn", `${page}f2_2[0]`),
    { kind: "checkbox", domainKey: "no_prior_losses", pdfField: `${page}c2_1[1]` },
    text("corporation_name", `${page}Table_Line28a-f[0].RowA[0].f2_3[0]`),
    text("corporation_code", `${page}Table_Line28a-f[0].RowA[0].f2_4[0]`),
    text("corporation_ein", `${page}Table_Line28a-f[0].RowA[0].f2_5[0]`),
    { kind: "checkbox", domainKey: "basis_required", pdfField: `${page}Table_Line28a-f[0].RowA[0].c2_3[0]` },
    text("line28i", `${page}Table_Line28g-k[0].RowA[0].f2_17[0]`),
    text("line29b_i", `${page}f2_42[0]`),
    text("line31", `${page}f2_46[0]`),
    text("line32", `${page}f2_47[0]`),
    text("line41", `${page}f2_78[0]`),
  ],
  instances(raw, filer, allPending) {
    if (Object.keys(raw).length === 0) return [];
    const pending = allPending ?? {};
    if (Object.keys(pending.schedule_e ?? {}).length > 0) {
      throw new Error("Stock-only Schedule E PDF cannot combine with another Schedule E activity");
    }
    const { source, ledger, allowed } = projectReviewedStockLoss7203(
      raw,
      pending,
      filer,
    );
    if (!ledger.materially_participated_in_s_corporation ||
      !ledger.no_other_schedule_e_activity ||
      !ledger.no_prior_year_suspended_losses) {
      throw new Error("Schedule E PDF nonpassive loss needs reviewed activity facts");
    }
    return [{
      taxpayer_name: ledger.shareholder_name_as_on_k1,
      taxpayer_ssn: ledger.shareholder_ssn,
      no_prior_losses: true,
      corporation_name: source.corporation_name,
      corporation_code: "S",
      corporation_ein: ledger.corporation_ein,
      basis_required: true,
      ...(allowed > 0
        ? { line28i: allowed, line29b_i: allowed, line31: allowed }
        : {}),
      line32: -allowed,
      line41: -allowed,
    }];
  },
};
