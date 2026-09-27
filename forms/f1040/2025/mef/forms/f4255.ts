import { element, elements } from "../../../mef/xml.ts";
import {
  calculateForm4255Routes,
  type F4255Input,
  type F4255Row,
  inputSchema,
} from "../../../nodes/inputs/f4255/index.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";

function rowFields(row: F4255Row): string[] {
  return [
    element("PYCrClmAmt", row.prior_credit_claimed),
    element("PYGroEPEPrtnCrClmAmt", row.gross_epe),
    element("PYGroEPEPrtnAppRegTaxAmt", row.gross_epe_applied_regular_tax),
    element("PYNetEPEAmt", row.gross_epe - row.gross_epe_applied_regular_tax),
    element("PYNonEPECrExAppRegTaxAmt", row.non_epe_applied_regular_tax),
    element(
      "PYCarryoverAmt",
      row.prior_credit_claimed - row.gross_epe -
        row.non_epe_applied_regular_tax,
    ),
    element("RcptrTotCrRedCyovAmt", row.recaptured_total),
    element("RcptrPrtnRdcngCrCyovAmt", row.recaptured_carryover),
    element("RcptrPrtnNonEPECrAppRegTaxAmt", row.recaptured_non_epe_applied),
    element("RcptrPrtnEPEAppRegTaxAmt", row.recaptured_gross_epe_applied),
    element("RcptrPrtnNetEPECrAmt", row.recaptured_net_epe),
    element("NetEPEPortionAmt", row.excessive_payment_net_epe),
    element("EP20PctOweAmt", row.excessive_payment_20_percent),
  ];
}

function totalRows(rows: readonly F4255Row[]): F4255Row {
  const sum = (key: keyof F4255Row): number =>
    rows.reduce(
      (total, row) =>
        total + (typeof row[key] === "number" ? row[key] as number : 0),
      0,
    );
  return {
    source_document_reference: "Form 4255 Part I line 3",
    credit_line: "1d",
    prior_credit_claimed: sum("prior_credit_claimed"),
    gross_epe: sum("gross_epe"),
    gross_epe_applied_regular_tax: sum("gross_epe_applied_regular_tax"),
    non_epe_applied_regular_tax: sum("non_epe_applied_regular_tax"),
    recaptured_total: sum("recaptured_total"),
    recaptured_carryover: sum("recaptured_carryover"),
    recaptured_non_epe_applied: 0,
    recaptured_gross_epe_applied: 0,
    recaptured_net_epe: sum("recaptured_net_epe"),
    excessive_payment_net_epe: sum("excessive_payment_net_epe"),
    excessive_payment_other: 0,
    excessive_payment_20_percent: sum("excessive_payment_20_percent"),
  };
}

export const form4255: MefFormDescriptor<"f4255", unknown> = {
  pendingKey: "f4255",
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f4255--2025.pdf",
  build(raw, context?: MefBuildContext) {
    if (!raw || typeof raw !== "object" || !("rows" in raw)) return "";
    const input = inputSchema.parse(raw) as F4255Input;
    const lines = calculateForm4255Routes(input);
    if (context?.pending) {
      const schedule2 = context.pending.schedule2 as
        | Record<string, unknown>
        | undefined;
      const expected: ReadonlyArray<readonly [string, number]> = [
        ["line1d_form4255_net_epe", lines.line1d],
        [
          "line1e_form4255_excessive_payment",
          lines.line1e_1d + lines.line1e_2a,
        ],
        ["line1f_form4255_20_percent_ep", lines.line1f_1d + lines.line1f_2a],
        ["line19_form4255_net_epe", lines.line19],
      ];
      for (const [key, amount] of expected) {
        if ((schedule2?.[key] ?? 0) !== amount) {
          throw new Error(`Form 4255 ${key} differs from Schedule 2`);
        }
      }
    }
    return elements("IRS4255", [
      ...input.rows.filter((row) => row.credit_line === "1d").map((row) =>
        elements("Form3468PartIVPYCreditsGrp", rowFields(row))
      ),
      ...input.rows.filter((row) => row.credit_line === "2a").map((row) =>
        elements("Form8933PYCreditsGrp", rowFields(row))
      ),
      elements("TotalAmountsPYCreditsGrp", rowFields(totalRows(input.rows))),
    ]);
  },
};
