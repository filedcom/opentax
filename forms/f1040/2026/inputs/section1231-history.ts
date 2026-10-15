import type { z } from "zod";
import { investmentOwner2026 } from "./investment-source.ts";
import { FilingStatus } from "../../nodes/types.ts";
import {
  calculateSection1231HistoryForYear,
  section1231HistorySchemaForYear,
} from "../../nodes/intermediate/forms/income/business/form4797/prior_history.ts";

/** Internal history contract; net disposition and allowed loss come from their source owners. */
export const section1231History2026Schema = section1231HistorySchemaForYear(
  2026,
);
export type Section1231History2026 = z.input<
  typeof section1231History2026Schema
>;
export function calculateSection1231History2026(
  raw: Section1231History2026,
  net: number,
  rawOwner: z.input<typeof investmentOwner2026>,
) {
  const history = section1231History2026Schema.parse(raw),
    owner = investmentOwner2026.parse(rawOwner);
  const spouse = owner.filing_status === FilingStatus.MFJ
    ? owner.spouse_ssn
    : undefined;
  if (
    history.owner.taxpayer_ssn !== owner.taxpayer_ssn ||
    history.owner.spouse_ssn !== spouse ||
    (owner.filing_status === FilingStatus.MFJ && !spouse)
  ) {
    throw new Error(
      "2026 section 1231 history must match the current filing owners; allocation or changed ownership needs its source route",
    );
  }
  const result = calculateSection1231HistoryForYear(2026, history, net);
  // Historical filed line numbers are for 2021-2025. The current return must
  // not expose the shared helper's old line-8 name as a 2026 printed line.
  const { line8, ...current } = result.current;
  return {
    source_input: history,
    ...result,
    current: { ...current, nonrecaptured_loss_for_return: line8 },
  };
}
