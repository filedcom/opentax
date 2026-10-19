import type { NodeContext } from "../../../../../../../core/types/node-context.ts";
import {
  filedStandardAmount,
  inputSchema as standardDeductionInputSchema,
} from "../../../../../nodes/intermediate/worksheets/deductions/standard/standard_deduction/index.ts";
import { scheduleALine16Rows } from "./schedule_a_line16_estate_source.ts";

export type ScheduleALine16Row = {
  readonly description: string;
  readonly printedDescription: string;
  readonly amount: number;
};

export type ScheduleADisasterLine16 = {
  // Schedule A filed only to claim the increased standard deduction.
  readonly increasedStandard: boolean;
  readonly rows: readonly ScheduleALine16Row[];
};

function record(value: unknown): Readonly<Record<string, unknown>> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

/** Schedule A line 16 rows for a net qualified disaster loss (Form 4684
 * line 15). An itemizer lists the loss; a non-itemizer also lists the
 * standard deduction and files Schedule A for that sum (2025 Instructions
 * for Form 4684, Increased standard deduction reporting). */
export function scheduleADisasterLine16(
  pending: Readonly<Record<string, unknown>> | undefined,
): ScheduleADisasterLine16 | undefined {
  const standardSource = record(pending?.standard_deduction);
  const loss = standardSource?.net_qualified_disaster_loss;
  if (loss === undefined) return undefined;
  const scheduleA = record(pending?.schedule_a);
  const filed = record(pending?.f1040);
  if (
    typeof loss !== "number" || !Number.isInteger(loss) || loss <= 0 ||
    scheduleA?.net_qualified_disaster_loss !== loss || !filed
  ) {
    throw new Error(
      "Schedule A net qualified disaster loss differs from Form 4684 line 15",
    );
  }
  const lossRow = {
    description: "NET QUALIFIED DISASTER LOSS",
    printedDescription: "Net Qualified Disaster Loss",
    amount: loss,
  };
  if (filed.line12e_itemized_deductions !== undefined) {
    return { increasedStandard: false, rows: [lossRow] };
  }
  const standard = filedStandardAmount(
    standardDeductionInputSchema.parse(standardSource),
  );
  if (filed.line12a_standard_deduction !== standard + loss) {
    throw new Error(
      "Form 1040 line 12e differs from the standard deduction plus the net qualified disaster loss",
    );
  }
  return {
    increasedStandard: true,
    rows: [lossRow, {
      description: "STANDARD DEDUCTION CLAIMED WITH QUALIFIED DISASTER LOSS",
      printedDescription: "Standard Deduction Claimed With Qualified Disaster Loss",
      amount: standard,
    }],
  };
}

/** Every Schedule A line 16 row: the itemized sources, or only the disaster
 * rows when Schedule A is filed for the increased standard deduction. */
export function scheduleALine16AllRows(
  pending: Readonly<Record<string, unknown>> | undefined,
  filedOtherLine16: unknown,
  context: NodeContext,
): readonly ScheduleALine16Row[] {
  const disaster = scheduleADisasterLine16(pending);
  if (disaster?.increasedStandard) return disaster.rows;
  return [
    ...scheduleALine16Rows(pending, filedOtherLine16, context),
    ...(disaster?.rows ?? []),
  ];
}
