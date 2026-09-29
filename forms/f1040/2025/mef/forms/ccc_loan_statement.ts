import { element, elements } from "../../../mef/xml.ts";
import {
  calculateForm4835Lines,
  inputSchema as form4835InputSchema,
} from "../../../nodes/inputs/f4835/index.ts";
import {
  computeGrossIncome,
  inputSchema as scheduleFInputSchema,
} from "../../../nodes/intermediate/forms/schedule_f/index.ts";
import type { CccLoanDetail } from "../../../nodes/intermediate/forms/farm_elections.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

function loanStatement(loans: readonly CccLoanDetail[]): string {
  return elements(
    "CCCLoanDetailCashMethodStmt",
    loans.map((loan) =>
      elements("CCCLoanDetail", [
        element("LoanDesc", loan.description),
        element("LoanAmt", loan.amount),
      ])
    ),
  );
}

export const cccLoanStatement: MefFormDescriptor<
  "ccc_loan_statement",
  Record<string, unknown>,
  readonly string[]
> = {
  pendingKey: "ccc_loan_statement",
  sourcePendingKeys: ["f4835", "schedule_f"],
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/instructions/i1040sf",
  build(_fields, context) {
    const source = context?.pending?.f4835;
    const f4835s = source === undefined
      ? []
      : form4835InputSchema.parse(source).f4835s;
    const rentalStatements = f4835s.flatMap((item) => {
      calculateForm4835Lines(item);
      if ((item.ccc_loans_reported_election ?? 0) === 0) return [];
      return [loanStatement(item.ccc_loan_details ?? [])];
    });
    const farmSource = context?.pending?.schedule_f;
    const farms = farmSource === undefined
      ? []
      : scheduleFInputSchema.parse(farmSource).schedule_fs;
    const ownerStatements = farms.flatMap((item) => {
      computeGrossIncome(item);
      if ((item.line5a_ccc_loans_election ?? 0) === 0) return [];
      return [loanStatement(item.line5a_ccc_loan_details ?? [])];
    });
    return [...rentalStatements, ...ownerStatements];
  },
};
