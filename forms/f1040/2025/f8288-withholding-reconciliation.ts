import { inputSchema as f8288InputSchema } from "../nodes/inputs/f8288/index.ts";
import { inputSchema as w2gInputSchema } from "../nodes/inputs/w2g/index.ts";
import {
  inputSchema as f8805InputSchema,
  totalCreditAmount,
} from "../nodes/inputs/f8805/index.ts";
import { printFieldsSchema as form8959PrintSchema } from "../nodes/intermediate/forms/form8959/index.ts";

/** Replay modeled other-form withholding into Form 1040 line 25c. */
export function assertOtherFormsWithholding(
  fields: Readonly<Record<string, unknown>>,
  pending: Readonly<Record<string, unknown>> | undefined,
  requireExact = false,
): void {
  const propertyWithheld = pending?.f8288 === undefined
    ? 0
    : f8288InputSchema.parse(pending.f8288).f8288s.reduce(
      (total, row) => total + row.amount_withheld,
      0,
    );
  const gamblingWithheld = pending?.w2g === undefined
    ? 0
    : w2gInputSchema.parse(pending.w2g).w2gs.reduce(
      (total, row) => total + (row.box4_federal_withheld ?? 0),
      0,
    );
  const partnershipWithheld = pending?.f8805 === undefined
    ? 0
    : totalCreditAmount(f8805InputSchema.parse(pending.f8805).f8805s);
  const form8959 = pending?.form8959;
  if (
    form8959 !== undefined &&
    (form8959 === null || typeof form8959 !== "object" ||
      Array.isArray(form8959))
  ) {
    throw new Error("Form 8959 withholding needs its finalized print fields");
  }
  const line24 = (form8959 as Record<string, unknown> | undefined)
    ?.line24_total_withheld;
  const medicareWithheld = line24 === undefined
    ? 0
    : form8959PrintSchema.shape.line24_total_withheld.parse(
      line24,
    );
  const total = propertyWithheld + gamblingWithheld + partnershipWithheld +
    medicareWithheld;
  if (total === 0 && !requireExact) return;
  const filed = fields.line25c_total;
  if (
    total > 0 &&
    (typeof filed !== "number" || !Number.isFinite(filed) ||
      filed + 0.01 < total)
  ) {
    throw new Error(
      partnershipWithheld + medicareWithheld > 0 || propertyWithheld === 0
        ? "Form 1040 line 25c is less than combined sourced other-form withholding"
        : gamblingWithheld > 0
        ? "Form 1040 line 25c is less than combined sourced Form 8288-A and W-2G withholding"
        : "Form 1040 line 25c is less than sourced Form 8288-A withholding",
    );
  }
  const actual = filed ?? 0;
  if (
    requireExact &&
    (typeof actual !== "number" || !Number.isFinite(actual) ||
      Math.abs(actual - total) >= 0.01)
  ) {
    throw new Error(
      "Form 1040 line 25c differs from retained other-form withholding",
    );
  }
}
