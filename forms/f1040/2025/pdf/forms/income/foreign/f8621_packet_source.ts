import type { FilerIdentity } from "../../../../../mef/header.ts";
import {
  type Form8621Lines,
  PficRegime,
} from "../../../../../nodes/inputs/income/foreign/f8621/index.ts";
import {
  assertForm8621PrintableSource,
  reconcileForm8621PriorDistributionRecords,
} from "../../../../domains/income/foreign/form8621/form8621_parent_source.ts";
import { projectForm8621ParentPages } from "./f8621_parent_source.ts";
import { section1294DueFromCalculatedForm } from "../../../../../nodes/inputs/income/foreign/f8621/section1294.ts";
import { form8621ElectionBTaxForHolding } from "../../../../domains/income/foreign/form8621/form8621_1294_allocation.ts";

function object(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function amount(value: unknown): number {
  if (value === undefined || value === null) return 0;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error("Form 8621 return amount is not numeric");
  }
  return value;
}

/** Prepared-return projection, deliberately outside the printable form registry. */
export function projectForm8621Section1291Packet(
  pending: Record<string, unknown>,
  filer: FilerIdentity,
) {
  const form = object(pending.form8621);
  const items = form?.items;
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Form 8621 PDF needs calculated Form 8621 items");
  }
  const lines = items as Form8621Lines[];
  if (
    lines.some((line) => line.item?.regime !== PficRegime.EXCESS_DISTRIBUTION)
  ) {
    throw new Error("Form 8621 packet has an unprojected QEF or MTM holding");
  }
  for (const line of lines) {
    reconcileForm8621PriorDistributionRecords(line.item);
  }
  const forms = lines.map((line) => projectForm8621ParentPages(line, filer));
  const events = lines.flatMap((line) => line.excessEvents);
  const income = events.reduce(
    (sum, event) => sum + event.line16b_current_and_pre_pfic_income,
    0,
  );
  const tax = events.reduce(
    (sum, event) => sum + event.line16e_additional_tax,
    0,
  );
  const interest = events.reduce(
    (sum, event) => sum + event.line16f_interest,
    0,
  );
  const schedule1 = object(pending.schedule1);
  const schedule2 = object(pending.schedule2);
  const f1040 = object(pending.f1040);
  if (!f1040) throw new Error("Form 8621 PDF needs finalized Form 1040");
  if (amount(schedule1?.line8z_form8621_section1291) !== income) {
    throw new Error("Form 8621 Part V income differs from Schedule 1");
  }
  if (amount(schedule2?.line17p_form8621_interest) !== interest) {
    throw new Error("Form 8621 Part V interest differs from Schedule 2");
  }
  if (amount(f1040.form8621_tax) !== tax) {
    throw new Error("Form 8621 Part V additional tax differs from Form 1040");
  }
  if (amount(f1040.line16_income_tax) < tax) {
    throw new Error("Form 8621 additional tax exceeds Form 1040 line 16");
  }
  return { forms, income, tax, interest };
}

/** Reconcile every printable holding with the finalized return before copies expand. */
export function projectForm8621Packet(
  pending: Record<string, unknown>,
  filer: FilerIdentity,
) {
  const form = object(pending.form8621);
  const items = form?.items;
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Form 8621 PDF needs calculated holding rows");
  }
  const lines = items as Form8621Lines[];
  const f1040 = object(pending.f1040);
  if (!f1040) throw new Error("Form 8621 PDF needs finalized Form 1040");
  const electionCount =
    lines.filter((line) => line.item.qef_1294_election !== undefined).length;
  const forms = lines.map((line) => {
    assertForm8621PrintableSource(line.item);
    const tax = line.item.qef_1294_election
      ? form8621ElectionBTaxForHolding(pending, line.item)
      : undefined;
    return projectForm8621ParentPages(
      line,
      filer,
      tax ? { current: tax.line9b, deferred: tax.line9c } : undefined,
    );
  });
  const events = lines.flatMap((line) => line.excessEvents);
  const income = events.reduce(
    (sum, event) => sum + event.line16b_current_and_pre_pfic_income,
    0,
  );
  const tax = events.reduce(
    (sum, event) => sum + event.line16e_additional_tax,
    0,
  );
  const interest = events.reduce(
    (sum, event) => sum + event.line16f_interest,
    0,
  );
  const schedule1 = object(pending.schedule1);
  const schedule2 = object(pending.schedule2);
  const partVI = section1294DueFromCalculatedForm(form);
  if (
    amount(schedule1?.line8z_form8621_section1291) !== income ||
    amount(schedule2?.line17p_form8621_interest) !== interest ||
    amount(f1040.form8621_tax) !== tax ||
    amount(schedule2?.line17z_form8621_1294_deferred_tax) !== partVI.tax ||
    amount(schedule2?.line17q_form8621_1294_interest) !== partVI.interest
  ) {
    throw new Error("Form 8621 Part V differs from finalized return");
  }
  const qefCapital = lines.reduce(
    (sum, line) =>
      sum + (line.item.qef_capital_gain ?? 0) -
      (line.item.qef_capital_951_or_1293g_reduction ?? 0),
    0,
  );
  if (amount(object(pending.schedule_d)?.line_11_qef_lt) !== qefCapital) {
    throw new Error("Form 8621 QEF capital gain differs from Schedule D");
  }
  if (
    electionCount === 0 &&
    amount(f1040.form8621_1294_deferred_tax) !== 0
  ) {
    throw new Error("Form 8621 deferred tax lacks Election B");
  }
  return { forms, lines, income, tax, interest };
}
