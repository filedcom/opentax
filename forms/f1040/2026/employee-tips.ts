import { z } from "zod";
import { FilingStatus } from "../nodes/types.ts";

/** W-2 box 12 TP and Form 4137 line 1(c), kept separate by employer. */
export const employeeTipSource2026Schema = z.object({
  source: z.enum(["w2", "form4137"]),
  employer_ein: z.string().optional(),
  employer_name: z.string().min(1),
  employee_ssn: z.string().optional(),
  recipient: z.enum(["taxpayer", "spouse"]).optional(),
  amount: z.number().finite().nonnegative(),
  occupation_codes: z.array(z.string().regex(/^\d{3}$/)).max(2).optional(),
  /** Required when a source includes both qualifying and nonqualifying tips. */
  qualified_amount: z.number().finite().nonnegative().optional(),
}).strict().superRefine((source, ctx) => {
  if (source.source === "w2" && !source.employee_ssn) {
    ctx.addIssue({
      code: "custom",
      message: "W-2 tip source needs employee SSN",
    });
  }
  if (source.source === "form4137" && !source.recipient) {
    ctx.addIssue({
      code: "custom",
      message: "Form 4137 tip source needs recipient",
    });
  }
  if (
    source.qualified_amount !== undefined &&
    source.qualified_amount > source.amount
  ) {
    ctx.addIssue({
      code: "custom",
      message: "Qualified tip amount exceeds source amount",
    });
  }
});

export type EmployeeTipSource2026 = z.infer<typeof employeeTipSource2026Schema>;

export interface EmployeeTipRow2026 {
  readonly recipient: "taxpayer" | "spouse";
  readonly employerEin?: string;
  readonly employerName: string;
  readonly w2ReportedCashTips: number;
  readonly form4137CashTips: number;
  readonly amountUsed: number;
}

export interface EmployeeTipResult2026 {
  readonly rows: readonly EmployeeTipRow2026[];
  readonly totalBeforeCap: number;
}

function ssn(value: string | undefined): string | undefined {
  return value?.replaceAll("-", "");
}

function ein(value: string | undefined): string | undefined {
  return value?.replaceAll("-", "");
}

function name(value: string): string {
  return value.trim().replace(/\s+/g, " ").toUpperCase();
}

/** Draft 2026 Schedule 1-A lines 4a–5: larger of TP and 4137 1(c) per employer. */
export function reconcileEmployeeTips2026(input: {
  filingStatus: FilingStatus;
  taxpayerSsn?: string;
  spouseSsn?: string;
  sources: readonly EmployeeTipSource2026[];
}): EmployeeTipResult2026 {
  const sources = input.sources.map((source) =>
    employeeTipSource2026Schema.parse(source)
  );
  const taxpayerSsn = ssn(input.taxpayerSsn);
  const spouseSsn = ssn(input.spouseSsn);
  const recipientOf = (source: EmployeeTipSource2026) => {
    if (source.source === "form4137") return source.recipient!;
    const employee = ssn(source.employee_ssn);
    if (employee === taxpayerSsn && taxpayerSsn) return "taxpayer" as const;
    if (
      employee === spouseSsn && spouseSsn &&
      input.filingStatus === FilingStatus.MFJ
    ) return "spouse" as const;
    throw new Error("W-2 TP employee SSN does not match a filer");
  };

  // Form 4137 can say APPLIED FOR instead of an EIN. Match by recipient and
  // employer name only when that name identifies one W-2 employer unambiguously.
  const w2EinByName = new Map<string, Set<string>>();
  for (const source of sources) {
    if (source.source !== "w2" || !source.employer_ein) continue;
    const key = `${recipientOf(source)}:${name(source.employer_name)}`;
    const candidates = w2EinByName.get(key) ?? new Set<string>();
    candidates.add(ein(source.employer_ein)!);
    w2EinByName.set(key, candidates);
  }

  type Group = {
    recipient: "taxpayer" | "spouse";
    employerEin?: string;
    employerName: string;
    w2: number;
    form4137: number;
    hasQualifyingW2: boolean;
    hasMixedW2: boolean;
    form4137UnknownOccupation: number;
  };
  const groups = new Map<string, Group>();
  for (const source of sources) {
    const recipient = recipientOf(source);
    if (recipient === "spouse" && input.filingStatus !== FilingStatus.MFJ) {
      throw new Error("Spouse tip source requires joint filing status");
    }
    const normalizedName = name(source.employer_name);
    let employerEin = ein(source.employer_ein);
    if (!employerEin && source.source === "form4137") {
      const candidates = w2EinByName.get(`${recipient}:${normalizedName}`);
      if (candidates && candidates.size > 1) {
        throw new Error("Form 4137 employer name matches multiple W-2 EINs");
      }
      employerEin = candidates?.values().next().value;
    }
    const key = `${recipient}:${employerEin ?? `name:${normalizedName}`}`;
    const group: Group = groups.get(key) ?? {
      recipient,
      employerEin,
      employerName: source.employer_name,
      w2: 0,
      form4137: 0,
      hasQualifyingW2: false,
      hasMixedW2: false,
      form4137UnknownOccupation: 0,
    };
    const codes = source.occupation_codes ?? [];
    if (source.source === "w2") {
      if (source.amount > 0 && codes.length === 0) {
        throw new Error("W-2 TP needs box 14b occupation code");
      }
      if (codes.includes("000") && source.qualified_amount === undefined) {
        throw new Error("Mixed W-2 occupations need qualified-tip breakdown");
      }
      if (
        codes.length === 1 && codes[0] === "000" &&
        (source.qualified_amount ?? 0) > 0
      ) {
        throw new Error(
          "Nonqualifying W-2 occupation cannot have qualified tips",
        );
      }
      const qualified = source.qualified_amount ?? source.amount;
      group.w2 += qualified;
      group.hasQualifyingW2 ||= qualified > 0;
      group.hasMixedW2 ||= codes.includes("000");
    } else if (source.qualified_amount !== undefined) {
      group.form4137 += source.qualified_amount;
    } else if (codes.includes("000")) {
      // Nonqualifying occupation: its 4137 income still goes to line 1c,
      // but not to Schedule 1-A.
    } else if (codes.length > 0) {
      group.form4137 += source.amount;
    } else {
      group.form4137UnknownOccupation += source.amount;
    }
    groups.set(key, group);
  }

  const rows = [...groups.values()].map((group): EmployeeTipRow2026 => {
    if (
      group.form4137UnknownOccupation > 0 &&
      (!group.hasQualifyingW2 || group.hasMixedW2)
    ) {
      throw new Error(
        "Form 4137 tips need occupation codes or a qualified-tip breakdown",
      );
    }
    const form4137 = group.form4137 +
      (group.hasQualifyingW2 ? group.form4137UnknownOccupation : 0);
    return {
      recipient: group.recipient,
      employerEin: group.employerEin,
      employerName: group.employerName,
      w2ReportedCashTips: group.w2,
      form4137CashTips: form4137,
      amountUsed: Math.max(group.w2, form4137),
    };
  });
  return {
    rows,
    totalBeforeCap: rows.reduce((sum, row) => sum + row.amountUsed, 0),
  };
}
