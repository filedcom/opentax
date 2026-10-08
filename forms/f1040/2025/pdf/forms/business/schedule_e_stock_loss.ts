import { projectPassiveSCorp7203Copy } from "../../../domains/business/passive-s-corp-loss-copies.ts";
import { FilingStatus } from "../../../../mef/header.ts";
import type { PdfFieldEntry, PdfFormDescriptor } from "../../reviews/execution/form-descriptor.ts";
import {
  projectOwned7203Family,
  projectReviewedStockLoss7203,
} from "../../../domains/business/form7203/form7203_stock_loss_projection.ts";

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
  printedFormKey: "schedule_e",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f1040se--2025.pdf",
  pageIndices: () => [1],
  filerFields: [{
    kind: "text",
    domainKey: "nameShownOnForm1040",
    includeWhen: (f) => f.joint_header === true,
    pdfField: `${page}f2_1[0]`,
  }, {
    kind: "text",
    domainKey: "primarySSN",
    includeWhen: (f) => f.joint_header === true,
    pdfField: `${page}f2_2[0]`,
  }],
  fields: [
    text("taxpayer_name", `${page}f2_1[0]`),
    text("taxpayer_ssn", `${page}f2_2[0]`),
    {
      kind: "checkbox",
      domainKey: "no_prior_losses",
      pdfField: `${page}c2_1[1]`,
    },
    text("corporation_name", `${page}Table_Line28a-f[0].RowA[0].f2_3[0]`),
    text("corporation_code", `${page}Table_Line28a-f[0].RowA[0].f2_4[0]`),
    text("corporation_ein", `${page}Table_Line28a-f[0].RowA[0].f2_5[0]`),
    {
      kind: "checkbox",
      domainKey: "basis_required",
      pdfField: `${page}Table_Line28a-f[0].RowA[0].c2_3[0]`,
    },
    text("line28i", `${page}Table_Line28g-k[0].RowA[0].f2_17[0]`),
    text("corporation_name_b", `${page}Table_Line28a-f[0].RowB[0].f2_6[0]`),
    text("corporation_code_b", `${page}Table_Line28a-f[0].RowB[0].f2_7[0]`),
    text("corporation_ein_b", `${page}Table_Line28a-f[0].RowB[0].f2_8[0]`),
    {
      kind: "checkbox",
      domainKey: "basis_required_b",
      pdfField: `${page}Table_Line28a-f[0].RowB[0].c2_6[0]`,
    },
    text("line28i_b", `${page}Table_Line28g-k[0].RowB[0].f2_22[0]`),
    ...["C", "D"].flatMap((row, i): PdfFieldEntry[] => [
      text(
        `corporation_name_${row.toLowerCase()}`,
        `${page}Table_Line28a-f[0].Row${row}[0].f2_${9 + i * 3}[0]`,
      ),
      text(
        `corporation_code_${row.toLowerCase()}`,
        `${page}Table_Line28a-f[0].Row${row}[0].f2_${10 + i * 3}[0]`,
      ),
      text(
        `corporation_ein_${row.toLowerCase()}`,
        `${page}Table_Line28a-f[0].Row${row}[0].f2_${11 + i * 3}[0]`,
      ),
      {
        kind: "checkbox",
        domainKey: `basis_required_${row.toLowerCase()}`,
        pdfField: `${page}Table_Line28a-f[0].Row${row}[0].c2_${9 + i * 3}[0]`,
      },
      text(
        `line28i_${row.toLowerCase()}`,
        `${page}Table_Line28g-k[0].Row${row}[0].f2_${27 + i * 5}[0]`,
      ),
    ]),
    text("line29b_i", `${page}f2_42[0]`),
    text("line31", `${page}f2_46[0]`),
    text("line32", `${page}f2_47[0]`),
    text("line41", `${page}f2_78[0]`),
  ],
  instances(raw, filer, allPending) {
    if (Object.keys(raw).length === 0) return [];
    if (raw.current_passive_s_corp_loss !== undefined) {
      projectPassiveSCorp7203Copy(raw, allPending, filer);
      return [];
    }
    const pending = allPending ?? {};
    if (Object.keys(pending.schedule_e ?? {}).length > 0) {
      throw new Error(
        "Stock-only Schedule E PDF cannot combine with another Schedule E activity",
      );
    }
    if (raw.owned_debt_loss_sources !== undefined) {
      const rows = projectOwned7203Family(raw, pending, filer),
        total = rows.reduce((n, r) => n + r.allowed, 0);
      return [{
        joint_header: true,
        no_prior_losses: true,
        ...Object.fromEntries(rows.flatMap((r, i) => {
          const suffix = ["", "_b", "_c", "_d"][i];
          return [
            [`corporation_name${suffix}`, r.source.corporation_name],
            [`corporation_code${suffix}`, "S"],
            [`corporation_ein${suffix}`, r.source.corporation_ein],
            [`basis_required${suffix}`, true],
            [`line28i${suffix}`, r.allowed],
          ];
        })),
        line29b_i: total,
        line31: total,
        line32: -total,
        line41: -total,
      }];
    }
    const { source, ledger, allowed } = projectReviewedStockLoss7203(
      raw,
      pending,
      filer,
    );
    if (
      !ledger.materially_participated_in_s_corporation ||
      !ledger.no_other_schedule_e_activity ||
      !ledger.no_prior_year_suspended_losses
    ) {
      throw new Error(
        "Schedule E PDF nonpassive loss needs reviewed activity facts",
      );
    }
    return [{
      joint_header: filer?.filingStatus === FilingStatus.MarriedFilingJointly,
      ...(filer?.filingStatus === FilingStatus.MarriedFilingJointly ? {} : {
        taxpayer_name: ledger.shareholder_name_as_on_k1,
        taxpayer_ssn: ledger.shareholder_ssn,
      }),
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
