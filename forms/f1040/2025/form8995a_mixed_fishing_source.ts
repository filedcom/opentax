import { isDeepStrictEqual } from "node:util";
import type { Form8995AInput } from "../nodes/intermediate/forms/form8995a/index.ts";
import { calculateMixedFishingQbi } from "../nodes/intermediate/forms/form8995a/mixed-fishing.ts";
import {
  assertScheduleJSourceReturn,
  retainedFishingProfit,
} from "./schedule_j_source_return.ts";
import { assertMultiBusinessInvestmentSources } from "./mef/forms/f8995-investment.ts";

/** Final source check shared by native and PDF for two distinct Part II rows. */
export function assertMixedFishingQbiReturn(
  input: Form8995AInput,
  pending: Readonly<Record<string, unknown>> | undefined,
) {
  if (!input.mixed_fishing_qbi_source) return undefined;
  if (!pending) throw new Error("Mixed fishing QBI needs its final return");
  const calculated = calculateMixedFishingQbi(input);
  const source = calculated.source;
  const c = (pending.schedule_c as { schedule_cs?: unknown[] } | undefined)
    ?.schedule_cs;
  const f = (pending.schedule_f as { schedule_fs?: unknown[] } | undefined)
    ?.schedule_fs;
  const s1 = pending.schedule1 as Record<string, unknown> | undefined;
  const filed = pending.f1040 as Record<string, unknown> | undefined;
  const owner = String(filed?.taxpayer_ssn ?? "").replace(/\D/g, "");
  if (
    retainedFishingProfit({
      general: { taxpayer_ssn: owner },
      schedule_c: [source.schedule_c],
    }) !== calculated.profits[0]
  ) {
    throw new Error(
      "Mixed fishing QBI needs the retained commercial catch ledger",
    );
  }
  if (
    owner !== source.owner_ssn || c?.length !== 1 || f?.length !== 1 ||
    !isDeepStrictEqual(c[0], source.schedule_c) ||
    !isDeepStrictEqual(f[0], source.schedule_f) ||
    s1?.line3_schedule_c !== calculated.profits[0] ||
    s1?.line6_schedule_f !== calculated.profits[1] ||
    s1?.line15_se_deduction !== source.se_tax_deduction ||
    filed?.line13_qbi_deduction !== calculated.parent.line39 ||
    Number(filed?.line15_taxable_income) + calculated.parent.line39 !==
      input.taxable_income
  ) {
    throw new Error(
      "Mixed fishing Form 8995-A rows differ from filed owned C/F and SE sources",
    );
  }
  const investment = assertMultiBusinessInvestmentSources(
    {
      ...input,
      taxpayer_ssn: source.owner_ssn,
    },
    pending as Record<string, Record<string, unknown>>,
    true,
  );
  if (input.net_capital_gain !== investment.filedQbiCapitalLimit) {
    throw new Error(
      "Mixed fishing QBI capital cap differs from issued investment copies",
    );
  }
  const businessIncome = calculated.profits[0] + calculated.profits[1];
  if (
    investment.interest !== 0 || investment.capital !== 0 ||
    filed?.line9_total_income !== businessIncome + investment.ordinary ||
    filed?.line11_agi !== businessIncome + investment.ordinary -
      source.se_tax_deduction ||
    (filed?.line1a_wages ?? 0) !== 0
  ) {
    throw new Error(
      "Mixed fishing QBI needs only the reviewed C/F and issued dividend income",
    );
  }
  assertScheduleJSourceReturn(pending);
  return calculated;
}
