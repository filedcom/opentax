import { element, elements } from "../../../mef/xml.ts";
import {
  computeGrossIncome,
  inputSchema,
} from "../../../nodes/intermediate/forms/schedule_f/index.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

export const cccLoanAccrualStatement: MefFormDescriptor<
  "ccc_loan_accrual_statement",
  Record<string, unknown>,
  readonly string[]
> = {
  pendingKey: "ccc_loan_accrual_statement",
  sourcePendingKeys: ["schedule_f"],
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/instructions/i1040sf",
  build(_fields, context) {
    const source = context?.pending?.schedule_f;
    const farms = source === undefined
      ? []
      : inputSchema.parse(source).schedule_fs;
    return farms.flatMap((farm) => {
      if (farm.accounting_method !== "accrual") return [];
      computeGrossIncome(farm);
      const part = farm.part_iii;
      if (!part || (part.line40a_ccc_loans_election ?? 0) === 0) return [];
      return [elements(
        "CCCLoanDetailAccrualMethodStmt",
        (part.line40a_ccc_loan_details ?? []).map((loan) =>
          elements("CCCLoanDetail", [
            element("LoanDesc", loan.description),
            element("LoanAmt", loan.amount),
          ])
        ),
      )];
    });
  },
};
