import type {
  PdfFieldEntry,
  PdfFormDescriptor,
} from "../../../review-support/form-descriptor.ts";
import { reconcileForm4952DividendPath } from "../../../../domains/deductions/investments/form4952/form4952_dividend_reconciliation.ts";
import { reconcileForm4952InterestPath } from "../../../../domains/deductions/investments/form4952/form4952_interest_reconciliation.ts";
import { reconcileForm4952CombinedPath } from "../../../../domains/deductions/investments/form4952/form4952_combined_reconciliation.ts";
import { reconcileForm4952PartnershipPath } from "../../../../domains/deductions/investments/form4952/form4952_partnership_reconciliation.ts";
import { reconcileForm4952K1InterestAgainst1099Path } from "../../../../domains/deductions/investments/form4952/form4952_k1_1099int_reconciliation.ts";
import { reconcileForm4952K1InterestAgainst1099DivPath } from "../../../../domains/deductions/investments/form4952/form4952_k1_1099div_reconciliation.ts";
import { reconcileForm4952MiscRoyaltyPath } from "../../../../domains/deductions/investments/form4952/form4952_misc_royalty_reconciliation.ts";
import { assertForm4952K1Recipients } from "../../../../domains/deductions/investments/form4952/form4952_k1_recipient.ts";
import {
  hasForm4952K1CodeB,
  reconcileForm4952K1CodeBRoyaltyPath,
} from "../../../../domains/deductions/investments/form4952/form4952_k1_code_b_reconciliation.ts";
import { reconcileForm4952DirectDebtExport } from "../../../../domains/deductions/investments/form4952/form4952_debt_reconciliation.ts";
import {
  hasForm4952PriorCarryforward,
  reconcileForm4952PriorCarryforward,
} from "../../../../domains/deductions/investments/form4952/form4952_prior_carryforward_reconciliation.ts";
import { FilingStatus } from "../../../../../mef/header.ts";
import { reconcileForm4952ScheduleJChildDividend } from "../../../../domains/deductions/investments/form4952/form4952_schedulej_child_reconciliation.ts";
import { reconcileForm4952PabAmt } from "../../../../domains/deductions/investments/form4952/form4952_pab_amt_reconciliation.ts";
import { rgb, StandardFonts } from "pdf-lib";

// TY2025 AcroForm order: f1_01/f1_02 are taxpayer name and identifying
// number; the numbered form lines start at f1_03.
const page = "topmostSubform[0].Page1[0].";
const fields: ReadonlyArray<PdfFieldEntry> = [
  { kind: "text", domainKey: "line1", pdfField: `${page}f1_03[0]` },
  { kind: "text", domainKey: "line2", pdfField: `${page}f1_04[0]` },
  { kind: "text", domainKey: "line3", pdfField: `${page}f1_05[0]` },
  {
    kind: "text",
    domainKey: "line4a",
    pdfField: `${page}Line4a_ReadOrder[0].f1_06[0]`,
  },
  { kind: "text", domainKey: "line4b", pdfField: `${page}f1_07[0]` },
  { kind: "text", domainKey: "line4c", pdfField: `${page}f1_08[0]` },
  { kind: "text", domainKey: "line4d", pdfField: `${page}f1_09[0]` },
  { kind: "text", domainKey: "line4e", pdfField: `${page}f1_10[0]` },
  { kind: "text", domainKey: "line4f", pdfField: `${page}f1_11[0]` },
  { kind: "text", domainKey: "line4g", pdfField: `${page}f1_12[0]` },
  { kind: "text", domainKey: "line4h", pdfField: `${page}f1_13[0]` },
  { kind: "text", domainKey: "line5", pdfField: `${page}f1_14[0]` },
  {
    kind: "text",
    domainKey: "line6",
    pdfField: `${page}f1_15[0]`,
    printZero: true,
  },
  {
    kind: "text",
    domainKey: "line7",
    pdfField: `${page}f1_16[0]`,
    printZero: true,
  },
  { kind: "text", domainKey: "line8", pdfField: `${page}f1_17[0]` },
];

export const form4952Pdf: PdfFormDescriptor = {
  pendingKey: "form4952",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f4952--2025.pdf",
  // The 2025 source has one form page, followed by a blank page and instructions.
  pageIndices: () => [0],
  filerFields: [
    { kind: "text", domainKey: "nameLine1", pdfField: `${page}f1_01[0]` },
    { kind: "text", domainKey: "primarySSN", pdfField: `${page}f1_02[0]` },
  ],
  fields,
  async decoratePages(document, pages, fields) {
    const page = pages[0];
    const electedCapital = fields.elected_capital_gain_portion;
    const election = fields.line4g;
    const line4e = fields.line4e;
    if (
      !page || typeof electedCapital !== "number" ||
      typeof election !== "number" || typeof line4e !== "number" ||
      election <= 0 || electedCapital >= Math.min(election, line4e)
    ) return;
    // 2025 Form 4952 instructions require "Elec." and the selected portion
    // beside line 4e when the usual capital-first election is reduced.
    const font = await document.embedFont(StandardFonts.Helvetica);
    page.drawRectangle({
      x: 353,
      y: 519,
      width: 30,
      height: 12,
      color: rgb(1, 1, 1),
    });
    page.drawText(`Elec. ${electedCapital}`, {
      x: 355,
      y: 522,
      size: 8,
      font,
    });
  },
  projectFields(fields, allPending) {
    if (hasForm4952K1CodeB(fields, allPending)) {
      reconcileForm4952K1CodeBRoyaltyPath(fields, allPending);
      throw new Error(
        "Form 4952 K-1 code B PDF needs verified issued supplement and deduction-limitation source bytes",
      );
    }
    if (Object.keys(fields).length === 0) return fields;
    if (hasForm4952PriorCarryforward(fields, allPending)) {
      reconcileForm4952PriorCarryforward(fields, allPending);
      throw new Error(
        "Form 4952 prior carryforward PDF needs authenticated accepted 2024 filing and verified source bytes",
      );
    }
    if (
      fields.source_private_activity_bond_interest === undefined &&
      (fields.direct_debt_trace !== undefined ||
        (allPending.form4952 as Record<string, unknown> | undefined)
            ?.direct_debt_trace !== undefined)
    ) {
      reconcileForm4952DirectDebtExport(fields, allPending);
    }
    if (
      fields.source_1099_royalties !== undefined
    ) {
      reconcileForm4952MiscRoyaltyPath(fields, allPending);
    } else if (
      fields.source_1099_dividends !== undefined &&
      fields.source_k1_investment_interest !== undefined
    ) {
      reconcileForm4952K1InterestAgainst1099DivPath(fields, allPending);
    } else if (
      fields.source_1099_dividends !== undefined &&
      fields.source_1099_interest !== undefined
    ) {
      reconcileForm4952CombinedPath(fields, allPending);
    } else if (
      fields.source_1099_dividends !== undefined &&
      allPending.schedule_j !== undefined &&
      allPending.form8814 !== undefined
    ) {
      reconcileForm4952ScheduleJChildDividend(fields, allPending);
    } else if (fields.source_1099_dividends !== undefined) {
      reconcileForm4952DividendPath(fields, allPending);
    } else if (
      fields.source_1099_interest !== undefined &&
      fields.source_k1_investment_interest !== undefined
    ) {
      reconcileForm4952K1InterestAgainst1099Path(fields, allPending);
    } else if (fields.source_private_activity_bond_interest !== undefined) {
      reconcileForm4952PabAmt(fields, allPending);
    } else if (fields.source_1099_interest !== undefined) {
      reconcileForm4952InterestPath(fields, allPending);
    } else if (
      (fields.source_k1_interest !== undefined ||
        fields.source_k1_dividends !== undefined) &&
      fields.source_k1_investment_interest !== undefined
    ) {
      reconcileForm4952PartnershipPath(fields, allPending);
    } else {
      throw new Error(
        "Form 4952 export needs a source-reconciled investment-income route",
      );
    }
    return fields;
  },
  instances(fields, filer, allPending) {
    if (hasForm4952K1CodeB(fields, allPending ?? {})) {
      if (!filer || !allPending) {
        throw new Error("Form 4952 PDF K-1 code B needs final filer identity");
      }
      assertForm4952K1Recipients(allPending, filer);
      reconcileForm4952K1CodeBRoyaltyPath(fields, allPending);
      throw new Error(
        "Form 4952 K-1 code B PDF needs verified issued supplement and deduction-limitation source bytes",
      );
    }
    if (hasForm4952PriorCarryforward(fields, allPending ?? {})) {
      if (!filer || !allPending) {
        throw new Error(
          "Form 4952 PDF prior carryforward needs final filer identity",
        );
      }
      reconcileForm4952PriorCarryforward(fields, allPending, filer.primarySSN);
      throw new Error(
        "Form 4952 prior carryforward PDF needs authenticated accepted 2024 filing and verified source bytes",
      );
    }
    if (
      fields.source_private_activity_bond_interest === undefined &&
      (fields.direct_debt_trace !== undefined ||
        (allPending?.form4952 as Record<string, unknown> | undefined)
            ?.direct_debt_trace !== undefined)
    ) {
      if (!filer || !allPending) {
        throw new Error("Form 4952 PDF direct debt needs final filer identity");
      }
      reconcileForm4952DirectDebtExport(
        fields,
        allPending,
        filer.primarySSN,
        filer.filingStatus === FilingStatus.MarriedFilingJointly
          ? filer.spouse?.ssn
          : undefined,
      );
    }
    if (fields.source_k1_investment_interest !== undefined) {
      if (!filer || !allPending) {
        throw new Error("Form 4952 PDF K-1 source needs final filer identity");
      }
      assertForm4952K1Recipients(allPending, filer);
    }
    if (fields.source_1099_royalties !== undefined) {
      if (!filer || !allPending) {
        throw new Error("Form 4952 PDF linked royalty needs filer identity");
      }
      reconcileForm4952MiscRoyaltyPath(fields, allPending, filer);
    }
    return [fields];
  },
};
