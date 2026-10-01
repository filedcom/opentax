import {
  calculateForm8882,
  inputSchema,
} from "../../../nodes/inputs/f8882/index.ts";
import { inputSchema as scheduleCInputSchema } from "../../../nodes/inputs/schedule_c/model.ts";

/** Bounded direct sole-proprietor source; Form 3800 join is still unavailable. */
export function reconcileForm8882DirectEmployer(
  raw: unknown,
  pending: Readonly<Record<string, unknown>>,
) {
  const source = inputSchema.parse(raw);
  if (
    JSON.stringify(source) !== JSON.stringify(inputSchema.parse(pending.f8882))
  ) {
    throw new Error("Form 8882 source differs from the prepared return");
  }
  const lines = calculateForm8882(source);
  const form1040 = pending.f1040 as Record<string, unknown> | undefined;
  if (
    typeof form1040?.taxpayer_ssn !== "string" ||
    form1040.taxpayer_ssn.replaceAll("-", "") !== source.proprietor_ssn
  ) {
    throw new Error(
      "Form 8882 proprietor SSN differs from finalized Form 1040",
    );
  }
  const scheduleC = scheduleCInputSchema.parse(pending.schedule_c);
  const matches = scheduleC.schedule_cs.filter((business) =>
    business.business_reference === source.schedule_c_business_reference
  );
  if (
    matches.length !== 1 ||
    matches[0].proprietor_recipient !== "T" ||
    matches[0].line_g_material_participation !== true ||
    matches[0].statutory_employee === true ||
    matches[0].disposed_of_business === true
  ) {
    throw new Error(
      "Form 8882 needs one participating taxpayer-owned Schedule C employer",
    );
  }
  const expenses = matches[0].part_v_other_expenses ?? [];
  for (
    const [contract, credit] of [
      [source.facility_contract, lines.line2],
      [source.referral_contract, lines.line4],
    ] as const
  ) {
    if (!contract) continue;
    const rows = expenses.filter((row) =>
      row.description === contract.schedule_c_expense_description
    );
    if (
      rows.length !== 1 ||
      rows[0].amount !== contract.gross_expenditure_usd - credit
    ) {
      throw new Error(
        "Form 8882 credit reduction differs from filed Schedule C Part V expense",
      );
    }
  }
  return { source, lines };
}
