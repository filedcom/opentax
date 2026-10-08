import { element, elements } from "../../../../mef/xml.ts";
import {
  form2210BoxEActualWithholdingLedgerSchema,
  stageForm2210BoxEActualWithholdingReturn,
} from "./form2210_box_e_payment_return.ts";

/** Unregistered regular-method D/E document prerequisite. Re-executes the
 * source chain; it never accepts caller-provided calculated lines. No public
 * export or final Form 1040 mutation is authorized by this projection. */
export async function stageForm2210RegularNativeDocument(
  rawReturnInputs: Readonly<Record<string, unknown>>,
  rawPaymentLedger: unknown,
  priorReturnDocuments: ReadonlyArray<{ reference: string; bytes: Uint8Array }>,
) {
  const ledger = form2210BoxEActualWithholdingLedgerSchema.parse(
    rawPaymentLedger,
  );
  // This new document contract covers estimates and actual withholding only.
  // Return-balance filing-date evidence remains deferred in future 44; the
  // existing payment calculator and its date handler are unchanged.
  if (ledger.payments.some((payment) => payment.kind === "return_balance")) {
    throw new Error(
      "Form 2210 staged native document excludes return-balance payments",
    );
  }
  const result = await stageForm2210BoxEActualWithholdingReturn(
    rawReturnInputs,
    ledger,
    priorReturnDocuments,
  );
  const lines = result.filed_lines;
  const worksheet = result.actual_payment_worksheet;
  // Round the exact rational result directly to whole filing dollars. Rounding
  // first to cents could incorrectly move a value just below $x.50 upward.
  const line19 = Number(
    (BigInt(worksheet.penalty_cents_numerator) + 1825000n) / 3650000n,
  );
  const children = [
    ...[
      "CurrentYearTaxAfterCreditsAmt",
      "OtherTaxesAmt",
      "RefundableCreditsAmt",
      "CurrentYearTaxAmt",
      "CurrentYearTaxCalculatedAmt",
      "WithholdingTaxesAmt",
      "NetTaxDueAmt",
      "AnnualPaymentBasedOnPriorYrAmt",
      "RequiredAnnualPaymentAmt",
    ].map((tag, i) =>
      element(tag, lines[`line${i + 1}` as keyof typeof lines] as number)
    ),
    element("OwePenaltyInd", "true"),
    element("ActuallyWithheldInd", "X"),
    element("JointReturnInd", "X"),
    ...worksheet.columns.map((column, i) =>
      element(`RequiredInstallment${"ABCD"[i]}Amt`, column.line10 / 100)
    ),
    ...worksheet.columns.map((column, i) =>
      element(`EstimatedTaxPdAndWithheld${"ABCD"[i]}Amt`, column.line11 / 100)
    ),
  ];
  // The XSD intentionally omits line 12, A's shaded cells, and D's lines
  // 16/18. Emit every represented regular-method cell in schema order.
  for (const [i, column] of worksheet.columns.entries()) {
    const letter = "ABCD"[i];
    if (i > 0) {
      children.push(
        element(`TaxToBeApplied${letter}Amt`, column.line13 / 100),
        element(`TaxesDueColumn${letter}Amt`, column.line14 / 100),
        element(`AppliedOverpayment${letter}Amt`, column.line15 / 100),
      );
      if (i < 3) {
        children.push(
          element(`AppliedUnderpayment${letter}Amt`, column.line16 / 100),
        );
      }
    }
    children.push(element(`Underpayment${letter}Amt`, column.line17 / 100));
    if (i < 3) {
      children.push(element(`Overpayment${letter}Amt`, column.line18 / 100));
    }
  }
  children.push(element("TotalPenaltyAmt", line19));
  return {
    ...result,
    line19_penalty_dollars: line19,
    native_xml: elements("IRS2210", children),
    filingReady: false as const,
  };
}
