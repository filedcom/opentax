import {
  calculateForm4952,
  inputSchema as form4952Schema,
} from "../nodes/intermediate/forms/form4952/index.ts";
import { reconcileForm4952Itemization } from "./form4952_itemization.ts";

const lineKeys = [
  "line1",
  "line2",
  "line3",
  "line4a",
  "line4b",
  "line4c",
  "line4d",
  "line4e",
  "line4f",
  "line4g",
  "line4h",
  "line5",
  "line6",
  "line7",
  "line8",
] as const;

export function hasForm4952PriorCarryforward(
  fields: Readonly<Record<string, unknown>>,
  pending: Readonly<Record<string, unknown>>,
): boolean {
  const retained = pending.form4952;
  const saved = retained && typeof retained === "object" &&
      !Array.isArray(retained)
    ? retained as Record<string, unknown>
    : {};
  return (typeof fields.prior_year_carryforward === "number" &&
    fields.prior_year_carryforward > 0) ||
    fields.prior_year_carryforward_source !== undefined ||
    (typeof saved.prior_year_carryforward === "number" &&
      saved.prior_year_carryforward > 0) ||
    saved.prior_year_carryforward_source !== undefined;
}

/** Replay the reviewed 2024 line 7 import against 2025's retained source. */
export function reconcileForm4952PriorCarryforward(
  fields: Readonly<Record<string, unknown>>,
  pending: Readonly<Record<string, unknown>>,
  finalFilerSsn?: string,
): void {
  const printed = form4952Schema.safeParse(fields);
  const retained = form4952Schema.safeParse(pending.form4952);
  if (!printed.success || !retained.success) {
    throw new Error(
      "Form 4952 prior carryforward needs complete retained source",
    );
  }
  const source = printed.data.prior_year_carryforward_source;
  const saved = retained.data.prior_year_carryforward_source;
  const lines = calculateForm4952(retained.data);
  if (
    !source || !saved ||
    JSON.stringify(source) !== JSON.stringify(saved) ||
    retained.data.prior_year_carryforward !==
      source.filed_2024_form4952.line7 ||
    printed.data.prior_year_carryforward !== source.filed_2024_form4952.line7 ||
    retained.data.amt_refigure?.prior_year_disallowed_interest !==
      source.reviewed_2024_amt_form4952_line7 ||
    printed.data.amt_refigure?.prior_year_disallowed_interest !==
      source.reviewed_2024_amt_form4952_line7 ||
    (finalFilerSsn !== undefined &&
      finalFilerSsn.replaceAll("-", "") !== source.filed_primary_ssn) ||
    fields.line2 !== source.filed_2024_form4952.line7 ||
    lineKeys.some((line) => fields[line] !== lines[line])
  ) {
    throw new Error(
      "Form 4952 prior carryforward differs from reviewed 2024 line 7, current lines, AMT import, or final filer",
    );
  }
}

/** Staged full-return review; export remains closed without authenticated
 * accepted prior-year documents. */
export function reviewForm4952PriorCarryforwardReturn(
  fields: Readonly<Record<string, unknown>>,
  pending: Readonly<Record<string, unknown>>,
  finalFilerSsn: string,
): void {
  reconcileForm4952PriorCarryforward(fields, pending, finalFilerSsn);
  const scheduleA = pending.schedule_a as Record<string, unknown> | undefined;
  if (
    !scheduleA ||
    scheduleA.line_9_investment_interest !== fields.line8
  ) {
    throw new Error(
      "Form 4952 prior carryforward deduction differs from Schedule A line 9",
    );
  }
  reconcileForm4952Itemization(pending, fields.line8 as number);
}
