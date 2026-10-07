import { assertProducingMiningZeroQbi } from "../nodes/intermediate/forms/form8995a/producing-mining.ts";
import type { Form8995AInput } from "../nodes/intermediate/forms/form8995a/index.ts";
import { form8995 } from "../nodes/intermediate/forms/form8995/index.ts";
import { assertCharitableNaturalResourceReturn } from "./mef/forms/f8283_natural_resource_return.ts";

const canonical = (value: unknown): unknown =>
  Array.isArray(value)
    ? value.map(canonical)
    : value && typeof value === "object"
    ? Object.fromEntries(
      Object.entries(value).filter(([, v]) => v !== undefined).sort((
        [a],
        [b],
      ) => a.localeCompare(b)).map(([k, v]) => [k, canonical(v)]),
    )
    : value;

export function assertProducingMiningZeroQbiReturn(
  fields: Form8995AInput,
  pending: Readonly<Record<string, unknown>> | undefined,
) {
  if (!fields.producing_mining_zero_qbi_source) return false;
  assertProducingMiningZeroQbi(fields);
  if (
    !pending?.form8995 || !pending?.f8283 || !pending?.schedule_c ||
    !pending?.schedule_se || !pending?.w2
  ) {
    throw new Error(
      "Producing mine zero QBI needs complete owned operating/employment/gift return sources",
    );
  }
  assertCharitableNaturalResourceReturn({ pending } as never);
  const replay = form8995.compute(
    { taxYear: 2025, formType: "f1040" },
    form8995.inputSchema.parse(pending.form8995),
  );
  const actual = replay.outputs.find((row) => row.nodeType === "form8995a")
    ?.fields;
  const final = pending.f1040 as Record<string, unknown>;
  if (
    JSON.stringify(canonical(actual)) !== JSON.stringify(canonical(fields)) ||
    Number(final.line13_qbi_deduction ?? 0) !== 0 ||
    Math.round(Number(final.line15_taxable_income)) !== fields.taxable_income ||
    fields.producing_mining_zero_qbi_source.owner_ssn !==
      String(final.primarySSN ?? final.taxpayer_ssn ?? "").replaceAll("-", "")
  ) {
    throw new Error(
      "Producing mine zero QBI source/owner/final deduction differs from actual return",
    );
  }
  return true;
}
