import {
  scheduleJCurrentYearTax,
  scheduleJTaxSourceSchema,
} from "../../../../../nodes/intermediate/forms/taxes/income-averaging/schedule_j/tax-source.ts";
import type { NodeContext } from "../../../../../../../core/types/node-context.ts";
import { CONFIG_BY_YEAR } from "../../../../../nodes/config/index.ts";
import { scheduleJLinesSchema } from "../../../../../nodes/intermediate/forms/taxes/income-averaging/schedule_j/calculation.ts";
import { ordinaryTaxForYear } from "../../../../../nodes/intermediate/worksheets/taxes/calculation/year_schedule.ts";
import { filingStatusSchema } from "../../../../../nodes/types.ts";
import { scheduleJChildElectionTax } from "../../income-averaging/schedule-j/schedule_j_child_tax_join.ts";

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Form 4972 AMT join needs ${label}`);
  }
  return value as Record<string, unknown>;
}

function dollars(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`Form 4972 AMT join needs ${label}`);
  }
  return value;
}

function optionalDollars(value: unknown, label: string): number {
  return value === undefined ? 0 : dollars(value, label);
}

/**
 * Form 6251 line 10 removes the Form 4972 special tax from Form 1040
 * line 16. With Schedule J, line 10 uses tax refigured without that election;
 * the Form 4972 special tax is excluded from that refigured tax too.
 */
export function assertForm4972AmtJoin(
  specialTax: number,
  pending: Readonly<Record<string, unknown>>,
  context: NodeContext,
): void {
  const cfg = CONFIG_BY_YEAR[context.taxYear];
  if (!cfg) throw new Error(`No f1040 config for year ${context.taxYear}`);
  if (!Number.isInteger(specialTax) || specialTax <= 0) {
    throw new Error("Form 4972 AMT join needs positive computed special tax");
  }
  const form1040 = record(pending.f1040, "finalized Form 1040");
  const line16 = dollars(form1040.line16_income_tax, "Form 1040 line 16");
  if (form1040.form4972_tax !== specialTax || line16 < specialTax) {
    throw new Error("Form 4972 special tax differs from Form 1040 line 16");
  }
  // Form 6251 can be calculated without an attached document. When present,
  // its retained source tax and filed line 10 must both reconcile.
  if (pending.form6251 === undefined) return;
  const form6251 = record(pending.form6251, "calculated Form 6251");
  // The execution graph also retains the Form 6251 input when the node returns
  // no filed document. Only a filed output carries the calculated line 11.
  if (form6251.line11_amt === undefined) return;
  const status = filingStatusSchema.parse(form1040.filing_status);
  if (form6251.filing_status !== status) {
    throw new Error("Form 6251 filing status differs from Form 1040");
  }
  const amti = form6251.amti;
  if (typeof amti !== "number" || !Number.isFinite(amti)) {
    throw new Error("Form 4972 AMT join needs calculated Form 6251 line 4");
  }
  const exemption = Math.max(
    0,
    cfg.amtExemption[status] -
      Math.floor(
        Math.max(0, amti - cfg.amtPhaseOutStart[status]) *
          cfg.amtExemptionPhaseOutRate,
      ),
  );
  if (
    form6251.exemption !== exemption ||
    form6251.taxable_excess !== Math.max(0, amti - exemption)
  ) {
    throw new Error(
      "Form 6251 exemption and taxable excess differ from calculated lines 4–6",
    );
  }
  const line10 = dollars(form6251.regular_tax, "Form 6251 line 10");
  if (form6251.form4972_tax !== specialTax) {
    throw new Error("Form 6251 omits the Form 4972 special tax source");
  }
  let baseTax = line16 - specialTax;
  if (pending.schedule_j !== undefined) {
    const childTax = scheduleJChildElectionTax(pending);
    const rawJ = record(pending.schedule_j, "calculated Schedule J");
    const scheduleJ = scheduleJLinesSchema.parse(Object.fromEntries(
      Object.keys(scheduleJLinesSchema.shape).map((key) => [key, rawJ[key]]),
    ));
    const taxableIncome = dollars(
      form1040.line15_taxable_income,
      "Form 1040 line 15",
    );
    if (
      !Number.isSafeInteger(Math.round(taxableIncome)) ||
      scheduleJ.line1 !== Math.round(taxableIncome) ||
      scheduleJ.line23 !== line16 - specialTax - childTax
    ) {
      throw new Error(
        "Schedule J and Form 4972 differ from finalized Form 1040",
      );
    }
    const source =
      (pending.schedule_j_calculation as Record<string, unknown> | undefined)
        ?.current_year_tax_source;
    baseTax = source === undefined
      ? ordinaryTaxForYear(taxableIncome, status, context.taxYear)
      : scheduleJCurrentYearTax(
        taxableIncome,
        status,
        scheduleJTaxSourceSchema.parse(source),
        context.taxYear,
      );
    baseTax += childTax;
  }
  const expected = Math.max(
    0,
    baseTax +
      optionalDollars(form6251.schedule2_line1z_tax, "Schedule 2 line 1z") -
      optionalDollars(
        form6251.schedule3_line1_foreign_tax_credit,
        "Schedule 3 line 1",
      ) -
      optionalDollars(form6251.form8978_negative_line14, "Form 8978 line 14"),
  );
  if (line10 !== expected) {
    throw new Error(
      `Form 6251 line 10 differs from Form 4972 and Form 1040: filed ${line10}, expected ${expected}, Form 1040 line 16 ${line16}, special tax ${specialTax}`,
    );
  }
}
