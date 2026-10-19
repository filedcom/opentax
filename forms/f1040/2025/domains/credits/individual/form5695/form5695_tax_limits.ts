import type { ExecuteResult } from "../../../../../../../core/runtime/executor.ts";
import {
  computeForm5695PartIAmounts,
  computeForm5695PartIIAmounts,
  type Form5695Input,
  inputSchema as form5695InputSchema,
} from "../../../../../nodes/intermediate/forms/credits/individual/form5695/index.ts";
import { buildPending } from "../../../../mef/execution/pending.ts";

export type Form5695GraphExecutor = (
  inputs: Record<string, unknown>,
) => ExecuteResult;

export interface Form5695TaxLimits {
  readonly partI: number;
  readonly partII: number;
}

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function amount(value: unknown): number {
  const values = Array.isArray(value) ? value : [value];
  return values.reduce<number>((sum, item) => {
    if (item === undefined || item === null) return sum;
    if (typeof item !== "number" || !Number.isFinite(item) || item < 0) {
      throw new Error(
        "Form 5695 credit limit worksheets need settled return amounts",
      );
    }
    return sum + item;
  }, 0);
}

function availableCredits(
  raw: unknown,
): { source: Form5695Input; partI: number; partII: number } | undefined {
  if (raw === undefined) return undefined;
  const parsed = form5695InputSchema.safeParse(raw);
  if (!parsed.success) return undefined;
  const unlimited = { ...parsed.data, part_i_tax_limit: 0, part_ii_tax_limit: 0 };
  try {
    return {
      source: parsed.data,
      partI: computeForm5695PartIAmounts(unlimited).available,
      partII: computeForm5695PartIIAmounts(unlimited).available,
    };
  } catch {
    // The form5695 node reports the same refusal from the graph.
    return undefined;
  }
}

function scheduleLine(
  schedule3: Record<string, unknown>,
  total: string,
  source: string,
): number {
  return schedule3[total] === undefined
    ? amount(schedule3[source])
    : amount(schedule3[total]);
}

// Line 14 worksheet footnote: Schedule 8812 Credit Limit Worksheet B line 14
// replaces Form 1040 line 19 when that worksheet applies.
function childTaxCredit(f1040: Record<string, unknown>): number {
  return f1040.form8859_worksheet_b_applies === true
    ? amount(f1040.form8859_worksheet_b_line14)
    : amount(f1040.line19_child_tax_credit);
}

function partIPrecedingCredits(
  f1040: Record<string, unknown>,
  schedule3: Record<string, unknown>,
): number {
  return childTaxCredit(f1040) +
    amount(schedule3.line6c_adoption_credit) +
    scheduleLine(schedule3, "line6f_total", "line6f_clean_vehicle_credit") +
    amount(schedule3.line6g_mortgage_interest_credit) +
    amount(schedule3.line6h_dc_homebuyer_credit) +
    scheduleLine(
      schedule3,
      "line6m_total",
      "line6m_prev_owned_clean_vehicle_credit",
    );
}

function hasPartIPrecedingCredits(executed: ExecuteResult): boolean {
  const pending = buildPending(executed.pending);
  const schedule3 = record(pending.schedule3);
  return partIPrecedingCredits(record(pending.f1040), schedule3) > 0 ||
    [
      "form8396_source_credit_pending",
      "form8839_source_credit_pending",
      "form8859_source_credit_pending",
    ].some((key) => schedule3[key] === true);
}

/**
 * Instructions for Form 5695, Line 31 and Line 14 worksheets: Form 1040 line
 * 18 less Schedule 3 lines 1, 2, 3, 4, 6d and 6l; Part I also less line 32,
 * Schedule 3 lines 6c, 6f, 6g, 6h and 6m, and Form 1040 line 19 (or Schedule
 * 8812 Credit Limit Worksheet B line 14).
 */
export function form5695TaxLimits(
  executed: ExecuteResult,
  partIICredit: (partIILimit: number) => number,
): Form5695TaxLimits {
  const pending = buildPending(executed.pending);
  const f1040 = record(pending.f1040);
  const schedule3 = record(pending.schedule3);
  const line18 = f1040.line18_total_tax_before_credits;
  if (typeof line18 !== "number" || !Number.isFinite(line18)) {
    throw new Error(
      "Form 5695 credit limit worksheets need settled return amounts",
    );
  }
  const partII = Math.max(
    0,
    line18 - amount(schedule3.line1_foreign_tax_credit) -
      amount(schedule3.line1_foreign_tax_1099) -
      amount(schedule3.line2_childcare_credit) -
      amount(schedule3.line3_education_credit) -
      amount(schedule3.line4_retirement_savings_credit) -
      amount(schedule3.line6d_elderly_disabled_credit) -
      amount(schedule3.line6l_form8978_credit),
  );
  return {
    partI: Math.max(
      0,
      partII - partIICredit(partII) -
        partIPrecedingCredits(f1040, schedule3),
    ),
    partII,
  };
}

function withLimits(
  inputs: Record<string, unknown>,
  used: { partI?: number; partII?: number },
): Record<string, unknown> {
  return {
    ...inputs,
    f5695: {
      ...record(inputs.f5695),
      ...(used.partI === undefined ? {} : { part_i_tax_limit: used.partI }),
      ...(used.partII === undefined ? {} : { part_ii_tax_limit: used.partII }),
    },
  };
}

/**
 * Derive Form 5695 tax-liability limits the preparer left out from the return
 * without Form 5695, then confirm every limit used against the final return.
 */
export function executeForm5695TaxLimits(
  inputs: Record<string, unknown>,
  counterfactual: boolean,
  executeGraph: Form5695GraphExecutor,
): ExecuteResult {
  const credits = availableCredits(inputs.f5695);
  if (!credits || (credits.partI === 0 && credits.partII === 0)) {
    return executeGraph(inputs);
  }
  const { source } = credits;
  const derivePartI = credits.partI > 0 &&
    source.part_i_tax_limit === undefined;
  const derivePartII = credits.partII > 0 &&
    source.part_ii_tax_limit === undefined;
  let used: { partI?: number; partII?: number } = {
    partI: source.part_i_tax_limit,
    partII: source.part_ii_tax_limit,
  };
  if (derivePartI || derivePartII) {
    const { f5695: _f5695, ...withoutCredit } = inputs;
    const pre = executeGraph(withoutCredit);
    if (pre.diagnostics.length > 0) return executeGraph(inputs);
    const partIICredit = (limit: number) =>
      computeForm5695PartIIAmounts({
        ...source,
        part_ii_tax_limit: source.part_ii_tax_limit ?? limit,
      }).allowed;
    const limits = form5695TaxLimits(pre, partIICredit);
    const partII = derivePartII ? limits.partII : used.partII;
    let partI = derivePartI ? limits.partI : used.partI;
    if (derivePartI && hasPartIPrecedingCredits(pre)) {
      // The preceding credits follow line 32, so settle them with no Part I
      // credit; none of them is limited by Schedule 3 line 5a.
      const settled = executeGraph(withLimits(inputs, { partI: 0, partII }));
      if (settled.diagnostics.length > 0) return executeGraph(inputs);
      partI = form5695TaxLimits(settled, partIICredit).partI;
    }
    used = { partI, partII };
  }
  const result = executeGraph(
    used.partI === source.part_i_tax_limit &&
      used.partII === source.part_ii_tax_limit
      ? inputs
      : withLimits(inputs, used),
  );
  if (result.diagnostics.length > 0) return result;
  const checkPartI = credits.partI > 0 && (!counterfactual || derivePartI);
  const checkPartII = credits.partII > 0 && (!counterfactual || derivePartII);
  if (!checkPartI && !checkPartII) return result;
  const final = form5695TaxLimits(result, () =>
    amount(
      record(buildPending(result.pending).schedule3)
        .line5b_energy_efficient_home,
    ));
  if (checkPartII && used.partII !== final.partII) {
    throw new Error(
      "Form 5695 Part II tax-liability limit must equal its credit limit worksheet from the return",
    );
  }
  if (checkPartI && used.partI !== final.partI) {
    throw new Error(
      "Form 5695 Part I tax-liability limit must equal its credit limit worksheet from the return",
    );
  }
  return result;
}
