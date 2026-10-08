import { isDeepStrictEqual } from "node:util";
import type { ExecuteResult } from "../../../../../../../core/runtime/executor.ts";
import { f1040 } from "../../../../../nodes/outputs/general/return-assembly/f1040/index.ts";
import { buildPending } from "../../../../mef/execution/pending.ts";
import { executePreQefSourceReturn } from "../../../../return-processing/staged_source_return.ts";

const context = { taxYear: 2025, formType: "f1040" } as const;

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function deferredHoldings(inputs: Record<string, unknown>) {
  const holdings = inputs.f8621;
  if (holdings === undefined) return [];
  if (!Array.isArray(holdings)) {
    throw new Error("Form 8621 Election B needs actual holding source inputs");
  }
  return holdings.filter((value) => record(value)?.qef_1294_election);
}

/** Re-execute the entire return without only the undistributed QEF earnings. */
export function applyForm8621QefRefigure(
  inputs: Record<string, unknown>,
  full: ExecuteResult,
): ExecuteResult {
  const elected = deferredHoldings(inputs);
  if (elected.length === 0) return full;
  if (inputs.form8839 !== undefined && inputs.f8863 !== undefined) {
    throw new Error(
      "Form 8621 Election B needs a combined education and adoption counterfactual",
    );
  }
  if (inputs.form8990 !== undefined) {
    throw new Error(
      "Form 8621 Election B needs a settled full-return counterfactual before Form 8990",
    );
  }
  if (full.diagnostics.length > 0) return full;
  const identifiers = elected.map((value) =>
    String(record(value)?.company_ein_or_ref)
  );
  if (new Set(identifiers).size !== identifiers.length) {
    throw new Error(
      "Form 8621 Election B needs distinct QEF source identities",
    );
  }
  const full1040 = record(buildPending(full.pending).f1040);
  const line9a = Number(full1040?.line22_tax_after_credits) +
    Number(full1040?.line23_other_taxes ?? 0);
  const fullOtherTaxes = Number(full1040?.line23_other_taxes ?? 0);
  if (!Number.isFinite(line9a)) {
    throw new Error("Form 8621 Election B needs computed full-return tax");
  }
  function withoutTax(removedIdentifiers: ReadonlySet<string>): number {
    const withoutInputs = structuredClone(inputs);
    let removedUnearned = 0;
    withoutInputs.f8621 = (withoutInputs.f8621 as Record<string, unknown>[])
      .map((item) => {
        const election = record(item.qef_1294_election);
        if (!election) return item;
        const { qef_1294_election: _election, ...rest } = item;
        if (!removedIdentifiers.has(String(item.company_ein_or_ref))) {
          return rest;
        }
        const undistributedOrdinary = Number(
          election.undistributed_ordinary_earnings_usd,
        );
        const undistributedCapital = Number(
          election.undistributed_capital_gain_usd,
        );
        const ordinary = Number(item.qef_ordinary_income ?? 0) -
          undistributedOrdinary;
        const capital = Number(item.qef_capital_gain ?? 0) -
          undistributedCapital;
        if (
          !Number.isFinite(ordinary) || !Number.isFinite(capital) ||
          ordinary < 0 || capital < 0
        ) {
          throw new Error(
            "Form 8621 Election B counterfactual exceeds actual QEF earnings",
          );
        }
        removedUnearned += undistributedOrdinary + undistributedCapital;
        return {
          ...rest,
          qef_ordinary_income: ordinary,
          qef_capital_gain: capital,
        };
      });
    const childSource = record(withoutInputs.f8615);
    if (childSource) {
      const childUnearned = Number(childSource.child_unearned_income);
      if (!Number.isFinite(childUnearned) || childUnearned < removedUnearned) {
        throw new Error(
          "Form 8621 Election B child unearned income cannot exclude the QEF earnings",
        );
      }
      withoutInputs.f8615 = {
        ...childSource,
        child_unearned_income: childUnearned - removedUnearned,
      };
    }
    const without = executePreQefSourceReturn(withoutInputs, true);
    if (without.diagnostics.length > 0) {
      throw new Error(
        "Form 8621 Election B needs a settled without-QEF return: " +
          without.diagnostics.map((row) => row.message).join("; "),
      );
    }
    const without1040 = record(buildPending(without.pending).f1040);
    const tax = Number(without1040?.line24_total_tax);
    const withoutOtherTaxes = Number(without1040?.line23_other_taxes ?? 0);
    if (
      !Number.isFinite(fullOtherTaxes) ||
      !Number.isFinite(withoutOtherTaxes) ||
      fullOtherTaxes !== withoutOtherTaxes
    ) {
      throw new Error(
        "Form 8621 Election B cannot defer a change in Form 1040 line 23 non-Chapter-1 taxes",
      );
    }
    if (!Number.isFinite(tax) || tax > line9a) {
      throw new Error(
        "Form 8621 Election B cannot defer more than the full-return tax from undistributed earnings",
      );
    }
    return tax;
  }
  const line9b = withoutTax(new Set(identifiers));
  const allocations: Record<string, {
    line9a: number;
    line9b: number;
    line9c: number;
  }> = {};
  if (identifiers.length > 1) {
    for (const identifier of identifiers) {
      const individual9b = withoutTax(new Set([identifier]));
      allocations[identifier] = {
        line9a,
        line9b: individual9b,
        line9c: line9a - individual9b,
      };
    }
    const allocated = Object.values(allocations).reduce(
      (sum, row) => sum + row.line9c,
      0,
    );
    if (allocated !== line9a - line9b) {
      throw new Error(
        "Form 8621 multiple Election B tax differences are nonadditive; per-QEF allocation needs independent support",
      );
    }
  }
  const rawSinkInput = record(full.pending.f1040);
  const businessCredit = rawSinkInput?.form3800_source_credits === undefined
    ? 0
    : Number(record(buildPending(full.pending).schedule3)?.line6a_total ?? 0);
  const priorNonrefundable = Number(
    rawSinkInput?.line20_nonrefundable_credits ?? 0,
  ) - businessCredit;
  if (
    !Number.isFinite(businessCredit) || businessCredit < 0 ||
    !Number.isFinite(priorNonrefundable) || priorNonrefundable < 0
  ) {
    throw new Error(
      "Form 8621 Election B needs reconciled preceding and business credits",
    );
  }
  const sourceSinkInput = {
    ...rawSinkInput,
    ...(rawSinkInput?.form3800_source_credits === undefined ? {} : {
      // The settled graph deposited the allowed Form 3800 amount on line 20.
      // Reapplying the sink must start with only the preceding credits.
      line20_nonrefundable_credits: priorNonrefundable,
    }),
  };
  const sinkInput = {
    ...sourceSinkInput,
    form8621_1294_counterfactual_total_tax: line9b,
  };
  const oldSink = f1040.compute(
    context,
    f1040.inputSchema.parse(sourceSinkInput),
  );
  const oldFiled = record(
    oldSink.outputs.find((output) => output.nodeType === "f1040")?.fields,
  );
  const sink = f1040.compute(context, f1040.inputSchema.parse(sinkInput));
  const filed = record(
    sink.outputs.find((output) => output.nodeType === "f1040")
      ?.fields,
  );
  if (!filed || !oldFiled) {
    throw new Error("Form 8621 Election B needs a recomputed Form 1040");
  }
  const retainedSinkInputs = Object.fromEntries(
    Object.entries(record(full.pending.f1040) ?? {}).filter(([key]) =>
      !(key in oldFiled)
    ),
  );
  return {
    ...full,
    replayInputs: {
      ...full.replayInputs,
      f1040: f1040.inputSchema.parse(sinkInput),
    },
    pending: {
      ...full.pending,
      f1040: {
        ...retainedSinkInputs,
        ...filed,
        form8621_1294_counterfactual_total_tax: line9b,
      },
      form8621_1294_refigure: {
        source_inputs: structuredClone(inputs),
        ...(identifiers.length > 1 ? { allocations } : {}),
      },
    },
  };
}

/** Both exporters independently rerun the retained full and counterfactual returns. */
export function assertForm8621QefRefigureSource(
  pending: Readonly<Record<string, unknown>>,
): void {
  const marker = record(pending.form8621_1294_refigure);
  if (!marker) {
    throw new Error("Form 8621 Election B needs full-return source replay");
  }
  const inputs = record(marker.source_inputs);
  if (!inputs) {
    throw new Error("Form 8621 Election B needs actual source inputs");
  }
  const full = executePreQefSourceReturn(inputs);
  if (full.diagnostics.length > 0) {
    throw new Error(
      "Form 8621 section 1294 source return has graph diagnostics",
    );
  }
  const expected = applyForm8621QefRefigure(inputs, full);
  if (
    !isDeepStrictEqual(
      buildPending(expected.pending),
      buildPending(pending as Record<string, unknown>),
    )
  ) {
    throw new Error(
      "Form 8621 section 1294 filed return differs from full source and without-QEF refigure",
    );
  }
}
