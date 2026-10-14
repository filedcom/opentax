import { inputSchema as dividendSchema } from "../../../../nodes/inputs/income/investments/f1099div/index.ts";

type Pending = Readonly<Record<string, unknown>>;

/** Reconcile the no-Schedule-D line 7a route to retained payer and child rows. */
export function assertDirectCapitalGainDistributionSource(
  fields: Record<string, unknown>,
  pending: Pending | undefined,
): void {
  const filed = fields.line7a_cap_gain_distrib;
  if (pending === undefined) return;

  let dividends = 0;
  if (pending.f1099div !== undefined) {
    const source = dividendSchema.parse(pending.f1099div);
    dividends = source.f1099divs.reduce(
      (total, row) =>
        total + (row.box2a ?? 0) -
        (row.isNominee ? row.nominee_distribution?.box2a ?? 0 : 0),
      0,
    );
  }

  let childGain = 0;
  if (pending.form8814 !== undefined) {
    const form8814 = pending.form8814;
    const rows = form8814 !== null && typeof form8814 === "object"
      ? (form8814 as Record<string, unknown>).items
      : undefined;
    if (!Array.isArray(rows)) {
      throw new Error(
        "Form 1040 line 7a needs calculated Form 8814 child rows",
      );
    }
    for (const row of rows) {
      if (
        row === null || typeof row !== "object" ||
        typeof row.line10 !== "number" || !Number.isFinite(row.line10)
      ) {
        throw new Error("Form 1040 line 7a needs calculated Form 8814 line 10");
      }
      childGain += row.line10;
    }
  }

  const sourced = dividends + childGain;
  if (typeof filed !== "number" || filed <= 0) {
    if (sourced <= 0) return;
    const schedule = pending.schedule_d;
    const finalized = schedule !== null && typeof schedule === "object" &&
      typeof (schedule as Record<string, unknown>).print_line16_combined ===
        "number" &&
      Number.isFinite(
        (schedule as Record<string, unknown>).print_line16_combined,
      ) &&
      (schedule as Record<string, unknown>)
          .active_4797_final_no_schedule_d !== true;
    if (!finalized) {
      throw new Error(
        "Form 1040 omits sourced capital-gain distributions from both Schedule D and direct line 7a",
      );
    }
    const rows = schedule as Record<string, unknown>;
    const reportedDividend = rows.line13_cap_gain_distrib ?? 0;
    const reportedChild = rows.line13_form8814 ?? 0;
    if (
      (dividends > 0 &&
        (typeof reportedDividend !== "number" ||
          !Number.isFinite(reportedDividend) ||
          Math.abs(reportedDividend - dividends) >= 0.01)) ||
      (childGain > 0 &&
        (typeof reportedChild !== "number" ||
          !Number.isFinite(reportedChild) ||
          Math.abs(reportedChild - childGain) >= 0.01))
    ) {
      throw new Error(
        "Schedule D line 13 omits retained 1099-DIV or Form 8814 capital-gain distributions",
      );
    }
    return;
  }

  if (Math.abs(filed - sourced) > 0.000001) {
    throw new Error(
      "Form 1040 line 7a differs from retained 1099-DIV and Form 8814 capital-gain distributions",
    );
  }
}
