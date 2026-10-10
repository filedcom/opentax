import {
  archerDistributionLedgerSchema,
  calculateArcherLedger,
} from "../../../../../nodes/intermediate/forms/adjustments/health/form8853/archer_distributions.ts";
import {
  assertPairedArcherActivity,
  inputSchema,
} from "../../../../../nodes/intermediate/forms/adjustments/health/form8853/index.ts";
import { calculateLtcLedger } from "../../../../../nodes/intermediate/forms/adjustments/health/form8853/ltc.ts";
import { schedule1 as schedule1Node } from "../../../../../nodes/outputs/general/return-assembly/schedule1/index.ts";
import { z } from "zod";
import {
  archerCompensationSources,
  archerContributionLedgerSchema,
  calculateArcherContributions,
  codeREntrySchema,
} from "../../../../../nodes/intermediate/forms/adjustments/health/form8853/archer_contributions.ts";
import type { MefBuildContext } from "../../../../mef/form-descriptor.ts";

export function reconcileArcherContributions(
  raw: unknown,
  context?: MefBuildContext,
) {
  const fields = z.object({
    archer_contribution_ledger: archerContributionLedgerSchema,
    w2_code_r_entries: z.array(codeREntrySchema).optional(),
  }).parse(raw);
  const ledger = fields.archer_contribution_ledger;
  if (ledger.paired_archer_activity_review) {
    const paired = inputSchema.parse(raw);
    assertPairedArcherActivity(paired);
    const source = paired.archer_distribution_ledger!;
    if (source.source.kind !== "normal") {
      throw new Error("Paired Archer holder must be living");
    }
    const birth =
      (context?.pending?.f1040 as Record<string, unknown> | undefined)
        ?.[ledger.owner === "taxpayer" ? "taxpayer_dob" : "spouse_dob"];
    if (birth !== source.source.holder_date_of_birth) {
      throw new Error("Paired Archer holder birth must match return owner");
    }
    const retained = z.object({
      paired_archer_contribution_ledger: archerContributionLedgerSchema,
      paired_archer_distribution_ledger: archerDistributionLedgerSchema,
      line8e_archer_msa_dist: z.number().optional(),
    }).parse(context?.pending?.schedule1 ?? {});
    if (
      JSON.stringify(retained.paired_archer_contribution_ledger) !==
        JSON.stringify(ledger) ||
      JSON.stringify(retained.paired_archer_distribution_ledger) !==
        JSON.stringify(source)
    ) {
      throw new Error(
        "Paired Archer ledgers must match retained Schedule1 sources",
      );
    }
    const dist = calculateArcherLedger(source);
    const otherTax = z.object({ line17e_archer_msa_tax: z.number().optional() })
      .parse(context?.pending?.schedule2 ?? {});
    if (
      (retained.line8e_archer_msa_dist ?? 0) !==
        dist.line8 +
          (paired.ltc_ledger
            ? calculateLtcLedger(paired.ltc_ledger).taxable
            : 0) ||
      (otherTax.line17e_archer_msa_tax ?? 0) !== dist.line9b
    ) {
      throw new Error(
        "Paired Archer distribution income/tax must reconcile to Schedule1/2",
      );
    }
  }
  const filer = context?.filer, pending = context?.pending;
  const statuses = ["", "single", "mfj", "mfs", "hoh", "qss"];
  if (
    !filer || !pending || statuses[filer.filingStatus] !== ledger.filing_status
  ) {
    throw new Error(
      "Archer contribution worksheet filing status must match return",
    );
  }
  const ssn = ledger.owner === "taxpayer"
    ? filer.primarySSN
    : filer.spouse?.ssn;
  if (
    ssn !== ledger.holder_ssn ||
    (ledger.owner === "spouse" && ledger.filing_status !== "mfj")
  ) throw new Error("Archer contribution holder must match return owner SSN");
  const dependency = z.object({
    taxpayer_can_be_claimed_as_dependent: z.boolean().optional(),
    spouse_can_be_claimed_as_dependent: z.boolean().optional(),
  }).parse(pending.f1040 ?? {});
  const isDependent = ledger.owner === "taxpayer"
    ? dependency.taxpayer_can_be_claimed_as_dependent
    : dependency.spouse_can_be_claimed_as_dependent;
  if (
    isDependent !== undefined &&
    ledger.months.some((m) => m.dependent_of_another !== isDependent)
  ) {
    throw new Error(
      "Archer dependent eligibility must reconcile to return owner source",
    );
  }
  const w2s = z.object({
    w2s: z.array(
      z.object({
        employee_ssn: z.string().optional(),
        employer_ein: z.string().optional(),
        source_document_reference: z.string().optional(),
        box1_wages: z.number(),
        box12_entries: z.array(
          z.object({ code: z.string(), amount: z.number() }),
        ).optional(),
        box13_statutory_employee: z.boolean().optional(),
      }).passthrough(),
    ),
  }).parse(pending.w2).w2s;
  const employerPayroll = w2s.filter((w) =>
    w.employee_ssn?.replace(/\D/g, "") === ssn &&
    w.employer_ein?.replace(/\D/g, "") === ledger.employer_ein
  );
  const payroll = archerCompensationSources(ledger);
  if (employerPayroll.length !== payroll.length) {
    throw new Error(
      "Archer compensation inventory must include every HDHP-employer payroll record on return",
    );
  }
  for (const row of payroll) {
    const match = w2s.filter((w) =>
      w.source_document_reference === row.w2_source_reference
    );
    if (
      match.length !== 1 || match[0].employee_ssn?.replace(/\D/g, "") !== ssn ||
      match[0].employer_ein?.replace(/\D/g, "") !== ledger.employer_ein ||
      match[0].box13_statutory_employee ||
      Math.round(match[0].box1_wages * 100) !==
        Math.round(
          (row.service_wages + row.employer_excess_already_in_box1) * 100,
        )
    ) {
      throw new Error(
        "Archer compensation must reconcile to actual owner HDHP employer W-2 services wages",
      );
    }
  }
  const codeR = w2s.flatMap((w) =>
    (w.box12_entries ?? []).filter((e) => e.code === "R" && e.amount > 0).map((
      e,
    ) => ({
      employee_ssn: w.employee_ssn!,
      employer_ein: w.employer_ein!,
      source_document_reference: w.source_document_reference!,
      amount: e.amount,
    }))
  );
  if (
    JSON.stringify(codeR) !== JSON.stringify(fields.w2_code_r_entries ?? [])
  ) {
    throw new Error(
      "Archer contribution code R entries must match retained issued W-2 sources",
    );
  }
  if (
    w2s.some((w) =>
      w.box12_entries?.some((e) => e.code === "W" && e.amount > 0)
    )
  ) {
    throw new Error(
      "Archer no-HSA funding review conflicts with W-2 code W; coordinated HSA limit must be sourced",
    );
  }
  const checkHsa = (value: unknown): boolean => {
    if (!value || typeof value !== "object") return false;
    return Object.entries(value).some(([key, v]) =>
      (typeof v === "number" && v > 0 &&
        /contributions|employer_hsa|line9_employer|line2_taxpayer|^print_line10$/
          .test(key)) ||
      checkHsa(v)
    );
  };
  if (checkHsa(pending.form8889)) {
    throw new Error(
      "Archer no-HSA funding review conflicts with sourced HSA contributions",
    );
  }
  const lines = calculateArcherContributions(ledger, fields.w2_code_r_entries);
  const schedule1 = z.object({
    line23_archer_msa_deduction: z.number().optional(),
    line8z_archer_excess_employer: z.number().optional(),
  }).parse(pending.schedule1 ?? {});
  if (
    (schedule1.line23_archer_msa_deduction ?? 0) !== lines.line5 ||
    (schedule1.line8z_archer_excess_employer ?? 0) !==
      lines.employerExcessIncome
  ) {
    throw new Error(
      "Archer contribution deduction/employer excess must reconcile to Schedule 1",
    );
  }
  const computed = schedule1Node.compute(
    { taxYear: 2025, formType: "f1040" },
    pending.schedule1 ?? {},
  ).outputs[0].fields;
  const claimed = pending.schedule1 as Record<string, unknown> | undefined;
  for (
    const key of ["line10_total_additional_income", "line26_total_adjustments"]
  ) {
    if (
      Math.round(Number(claimed?.[key] ?? 0)) !==
        Math.round(Number(computed[key] ?? 0))
    ) {
      throw new Error(
        "Archer contribution Schedule1 totals must match its retained source lines",
      );
    }
  }
  return { ledger, lines, ssn };
}

export function reconcileArcherPartVI(
  forms: readonly { owner: string; archer_part_vi?: unknown }[],
  raw: unknown,
  context?: MefBuildContext,
) {
  const source = z.object({
    archer_contribution_ledger: archerContributionLedgerSchema.optional(),
  }).passthrough().safeParse(raw);
  const supplied = forms.filter((f) => f.archer_part_vi !== undefined);
  if (!source.success || !source.data.archer_contribution_ledger) {
    if (supplied.length) {
      throw new Error(
        "Form5329 Archer Part VI requires source-owned Form8853 contribution ledger",
      );
    }
    return;
  }
  const { ledger, lines } = reconcileArcherContributions(raw, context);
  const expected = {
    line34_prior_excess: 0,
    line35_unused_contribution_room: Math.max(
      0,
      lines.cap - lines.line1 - lines.line2,
    ),
    line36_taxable_distributions: 0,
    line39_current_year_excess: lines.currentExcess,
    december_31_value: lines.december31Value,
  };
  if (
    lines.currentExcess
      ? supplied.length !== 1 ||
        supplied[0].owner !== (ledger.owner === "taxpayer" ? "T" : "S") ||
        JSON.stringify(supplied[0].archer_part_vi) !== JSON.stringify(expected)
      : supplied.length !== 0
  ) {
    throw new Error(
      "Form5329 Archer owner/worksheet must match Form8853 current excess",
    );
  }
}

export function assertArcherEmployerExcessIncomeSource(
  fields: Record<string, unknown>,
  context?: MefBuildContext,
) {
  if (
    fields.paired_archer_contribution_ledger ||
    fields.paired_archer_distribution_ledger
  ) {
    const source = inputSchema.parse(context?.pending?.form8853 ?? {});
    if (!source.archer_contribution_ledger?.paired_archer_activity_review) {
      throw new Error(
        "Retained paired Archer sources require their complete Form8853",
      );
    }
    reconcileArcherContributions(source, context);
  }
  if (Number(fields.line8z_archer_excess_employer ?? 0) > 0) {
    reconcileArcherContributions(context?.pending?.form8853, context);
  }
}

// CodeR is a filing obligation even when there is no income, deduction or tax.
// Its required contribution form cannot be removed from a finalized packet.
export function assertW2ArcherContributionSources(context?: MefBuildContext) {
  const source = z.object({
    w2s: z.array(
      z.object({
        box12_entries: z.array(
          z.object({ code: z.string(), amount: z.unknown() }),
        ).optional(),
      }).passthrough(),
    ).optional(),
  }).parse(context?.pending?.w2 ?? {});
  if (
    source.w2s?.some((w) =>
      w.box12_entries?.some((e) => e.code === "R" && Number(e.amount) > 0)
    )
  ) reconcileArcherContributions(context?.pending?.form8853, context);
}
