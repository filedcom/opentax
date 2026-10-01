import type { FilerIdentity } from "../../../mef/header.ts";
import {
  type Form8621Lines,
  PficRegime,
} from "../../../nodes/inputs/f8621/index.ts";
import { projectForm8621ParentPages } from "./f8621_parent_source.ts";

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
