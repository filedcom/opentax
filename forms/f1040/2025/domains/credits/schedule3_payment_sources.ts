import { isDeepStrictEqual } from "node:util";
import { form4852CalculationSources } from "../../../nodes/inputs/f4852/index.ts";
import { inputSchema as extInputSchema } from "../../../nodes/inputs/ext/index.ts";
import {
  FormType,
  inputSchema as f4852InputSchema,
} from "../../../nodes/inputs/f4852/index.ts";
import { inputSchema as w2InputSchema } from "../../../nodes/inputs/w2/index.ts";
import {
  SS_MAX_TAX_PER_EMPLOYER_2025,
  SS_WAGE_BASE_2025,
} from "../../../nodes/config/2025.ts";

const cents = (value: unknown, line: string): number => {
  if (value === undefined || value === null) return 0;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`Schedule 3 ${line} needs a nonnegative source amount`);
  }
  const result = Math.round(value * 100);
  if (
    !Number.isSafeInteger(result) || Math.abs(value * 100 - result) > 0.000001
  ) {
    throw new Error(`Schedule 3 ${line} needs cent precision`);
  }
  return result;
};

/** Replay supported payment deposits from retained source on a finalized return. */
export function assertSchedule3PaymentSources(
  fields: Readonly<Record<string, unknown>>,
  pending: Readonly<Record<string, unknown>> | undefined,
): void {
  if (!pending || !("f1040" in pending)) return;

  const premium = cents(fields.line9_premium_tax_credit, "line 9");
  if (pending.form8962 === undefined) {
    if (premium > 0) {
      throw new Error("Schedule 3 line 9 needs a Form 8962 source");
    }
  } else {
    const source = pending.form8962;
    if (!source || typeof source !== "object" || Array.isArray(source)) {
      throw new Error("Schedule 3 line 9 needs a Form 8962 source");
    }
    const expected = cents(
      (source as Record<string, unknown>).net_premium_tax_credit,
      "Form 8962 net credit",
    );
    if (premium !== expected) {
      throw new Error("Schedule 3 line 9 differs from Form 8962 source");
    }
  }

  const extension = cents(fields.line10_amount_paid_extension, "line 10");
  if (pending.ext === undefined) {
    if (extension > 0) {
      throw new Error("Schedule 3 line 10 needs an extension payment source");
    }
  } else {
    const source = extInputSchema.parse(pending.ext);
    const expected = source.produce_4868 === "X"
      ? cents(source.line_7_amount_paying, "extension payment")
      : 0;
    if (
      extension !== expected ||
      (expected > 0 && source.payment_evidence?.amount !== expected / 100)
    ) {
      throw new Error(
        "Schedule 3 line 10 differs from extension payment source",
      );
    }
  }

  const excessSs = cents(fields.line11_excess_ss, "line 11");
  if (pending.f4852 !== undefined) {
    const substitutes = f4852InputSchema.parse(pending.f4852);
    if (
      substitutes.f4852s.some((row) =>
        row.form_type === FormType.W2 && (row.social_security_withheld ?? 0) > 0
      ) && excessSs > 0 &&
      (!substitutes.reviewed_source || !isDeepStrictEqual(
        (pending.w2 as Record<string, unknown> | undefined)?.substitute_w2s,
        form4852CalculationSources(substitutes.f4852s).w2s,
      ))
    ) {
      throw new Error(
        "Schedule 3 line 11 Form 4852 source needs reviewed excess withholding calculation",
      );
    }
  }
  if (pending.w2 === undefined) {
    if (excessSs > 0) {
      throw new Error("Schedule 3 line 11 needs W-2 source withholding");
    }
    return;
  }
  const owners = new Map<
    string,
    { employers: Set<string>; wages: number; withheld: number }
  >();
  const employerTotals = new Map<string, number>();
  for (const row of w2InputSchema.parse(pending.w2).w2s) {
    if ((row.box4_ss_withheld ?? 0) === 0) continue;
    const ssn = row.employee_ssn?.replaceAll(/\D/g, "");
    const employer = row.employer_ein?.replaceAll(/\D/g, "");
    if (
      !ssn || !/^\d{9}$/.test(ssn) || !employer ||
      !/^\d{9}$/.test(employer)
    ) {
      throw new Error(
        "Schedule 3 line 11 W-2 source needs employee SSN and employer EIN",
      );
    }
    if (
      cents(row.box4_ss_withheld, "W-2 box 4") >
        cents(SS_MAX_TAX_PER_EMPLOYER_2025, "2025 SS maximum")
    ) {
      throw new Error(
        "Schedule 3 line 11 cannot claim a single employer's excess withholding",
      );
    }
    const employerKey = JSON.stringify([ssn, employer]);
    const employerTax = (employerTotals.get(employerKey) ?? 0) +
      cents(row.box4_ss_withheld, "W-2 box 4");
    employerTotals.set(employerKey, employerTax);
    if (employerTax > cents(SS_MAX_TAX_PER_EMPLOYER_2025, "2025 SS maximum")) {
      throw new Error(
        "Schedule 3 line11 cannot claim one employer's excess across multiple source copies",
      );
    }
    const group = owners.get(ssn) ?? {
      employers: new Set<string>(),
      wages: 0,
      withheld: 0,
    };
    group.employers.add(employer);
    group.wages += row.box3_ss_wages ?? 0;
    group.withheld += row.box4_ss_withheld ?? 0;
    owners.set(ssn, group);
  }
  const expectedCents = [...owners.values()].reduce(
    (total, group) =>
      total +
      (group.employers.size > 1 && group.wages > SS_WAGE_BASE_2025
        ? Math.max(
          0,
          cents(group.withheld, "W-2 box 4 total") -
            cents(SS_MAX_TAX_PER_EMPLOYER_2025, "2025 SS maximum"),
        )
        : 0),
    0,
  );
  if (excessSs !== Math.round(expectedCents / 100) * 100) {
    throw new Error("Schedule 3 line 11 differs from W-2 source withholding");
  }
}
