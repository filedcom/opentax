import { isDeepStrictEqual } from "node:util";
import { createHash } from "node:crypto";
import { reconcileForm4952ScheduleJChildDividend } from "../../deductions/form4952/form4952_schedulej_child_reconciliation.ts";
import { z } from "zod";
import { execute, type ExecuteResult } from "../../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../../core/runtime/planner.ts";
import { publicInputSchema } from "../../../../nodes/inputs/schedule_j/index.ts";
import { scheduleJTaxSourceSchema } from "../../../../nodes/intermediate/forms/schedule_j/tax-source.ts";
import {
  assertForm8814CalculatedLines,
  form8814EicLine4,
  type Form8814Lines,
} from "../../../../nodes/inputs/f8814/index.ts";
import { registry } from "../../../registry.ts";
import { buildPending } from "../../../mef/execution/pending.ts";

const nonfarmEmployerRecordSchema = z.object({
  tax_year: z.literal(2025),
  issued_by: z.string().trim().min(1),
  issued_on: z.string().regex(/^202[5-6]-\d{2}-\d{2}$/),
  employer_ein: z.string().regex(/^\d{9}$/),
  employer_name: z.string().trim().min(1),
  legal_entity_type: z.literal("c_corporation"),
  naics_code: z.string().regex(/^\d{6}$/),
  employee_ssn: z.string().regex(/^\d{9}$/),
  w2_source_document_reference: z.string().trim().min(1),
  w2_box1_wages: z.number().int().positive(),
  w2_box2_withholding: z.number().nonnegative(),
  w2_box3_ss_wages: z.number().nonnegative(),
  w2_box5_medicare_wages: z.number().nonnegative(),
  employment_start: z.string().regex(/^2025-\d{2}-\d{2}$/),
  employment_end: z.string().regex(/^2025-\d{2}-\d{2}$/),
  services: z.string().trim().min(1),
}).strict();

const fishingLedgerSchema = z.object({
  tax_year: z.literal(2025),
  taxpayer_ssn: z.string().regex(/^\d{9}$/),
  business_reference: z.string().trim().min(1),
  catch_sales_record_reference: z.string().trim().min(1),
  vessel_name: z.string().trim().min(1),
  commercial_harvest: z.literal(true),
  scientific_research_vessel: z.literal(false),
  sales: z.array(
    z.object({
      sold_on: z.string().regex(/^2025-\d{2}-\d{2}$/),
      buyer: z.string().trim().min(1),
      buyer_invoice_reference: z.string().trim().min(1),
      catch_description: z.string().trim().min(1),
      amount: z.number().int().positive(),
    }).strict(),
  ).min(1),
  supplies: z.array(
    z.object({
      paid_on: z.string().regex(/^2025-\d{2}-\d{2}$/),
      supplier: z.string().trim().min(1),
      paid_receipt_reference: z.string().trim().min(1),
      amount: z.number().int().positive(),
    }).strict(),
  ),
}).strict();

export function retainedFishingProfit(inputs: Record<string, unknown>): number {
  const schedules = inputs.schedule_c;
  if (!Array.isArray(schedules) || schedules.length !== 1) {
    throw new Error(
      "Schedule J fishing source needs exactly one Schedule C business",
    );
  }
  const business = record(schedules[0]);
  const evidence = record(business.schedule_j_fishing_evidence);
  const proof = record(evidence.retained_catch_ledger);
  const encoded = String(proof.bytes_base64 ?? "");
  const bytes = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
  if (
    btoa(String.fromCharCode(...bytes)) !== encoded ||
    createHash("sha256").update(bytes).digest("hex") !== proof.sha256
  ) {
    throw new Error(
      "Schedule J fishing catch ledger bytes differ from retained digest",
    );
  }
  const ledger = fishingLedgerSchema.parse(
    JSON.parse(new TextDecoder().decode(bytes)),
  );
  const general = record(inputs.general);
  const recipient = business.proprietor_recipient ?? "T";
  if (recipient !== "T" && recipient !== "S") {
    throw new Error("Schedule J fishing business needs a named owner");
  }
  if (recipient === "S" && general.filing_status !== "mfj") {
    throw new Error("Schedule J spouse fishing owner requires a joint return");
  }
  const owner = String(
    recipient === "S" ? general.spouse_ssn ?? "" : general.taxpayer_ssn ?? "",
  ).replaceAll("-", "");
  if (!/^\d{9}$/.test(owner)) {
    throw new Error("Schedule J fishing owner SSN is missing");
  }
  const sales = ledger.sales.reduce((sum, item) => sum + item.amount, 0);
  const supplies = ledger.supplies.reduce((sum, item) => sum + item.amount, 0);
  const saleRefs = ledger.sales.map((row) => row.buyer_invoice_reference);
  const paidRefs = ledger.supplies.map((row) => row.paid_receipt_reference);
  if (
    proof.document_id !== evidence.catch_sales_record_reference ||
    ledger.taxpayer_ssn !== owner ||
    ledger.business_reference !== business.business_reference ||
    ledger.business_reference !== evidence.business_reference ||
    ledger.catch_sales_record_reference !==
      evidence.catch_sales_record_reference ||
    business.line_b_business_code !== "114110" ||
    business.line_f_accounting_method !== "cash" ||
    business.line_g_material_participation !== true ||
    sales !== business.line_1_gross_receipts ||
    supplies !== (business.line_22_supplies ?? 0) ||
    new Set(saleRefs).size !== saleRefs.length ||
    new Set(paidRefs).size !== paidRefs.length ||
    Object.entries(business).some(([key, value]) =>
      /^line_\d/.test(key) &&
      key !== "line_1_gross_receipts" && key !== "line_22_supplies" &&
      typeof value === "number" && value !== 0
    )
  ) {
    throw new Error(
      "Schedule J fishing ledger, owner, and filed Schedule C do not reconcile",
    );
  }
  return sales - supplies;
}

function nonfarmWages(
  inputs: Record<string, unknown>,
  source: z.infer<typeof publicInputSchema>,
): number {
  const w2s = inputs.w2;
  if (w2s === undefined || (Array.isArray(w2s) && w2s.length === 0)) {
    if (source.nonfarm_wage_source) {
      throw new Error("Schedule J nonfarm wage record has no issued W-2");
    }
    return 0;
  }
  if (
    !Array.isArray(w2s) || w2s.length !== 1 ||
    !source.nonfarm_wage_source
  ) {
    throw new Error(
      "Schedule J needs each nonfarm wage attributed to one issued W-2 and employer record",
    );
  }
  const wage = record(w2s[0]);
  const proof = source.nonfarm_wage_source;
  const encoded = proof.bytes_base64;
  const bytes = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
  if (
    btoa(String.fromCharCode(...bytes)) !== encoded ||
    createHash("sha256").update(bytes).digest("hex") !== proof.sha256
  ) {
    throw new Error(
      "Schedule J nonfarm employer record bytes differ from retained digest",
    );
  }
  const employer = nonfarmEmployerRecordSchema.parse(
    JSON.parse(new TextDecoder().decode(bytes)),
  );
  const general = record(inputs.general);
  const farm = record(
    record(inputs.schedule_f).schedule_fs instanceof Array
      ? (record(inputs.schedule_f).schedule_fs as unknown[])[0]
      : undefined,
  );
  const digits = (v: unknown) => String(v ?? "").replaceAll("-", "");
  const amount = Number(wage.box1_wages);
  if (
    !Number.isSafeInteger(amount) || amount <= 0 ||
    employer.naics_code.startsWith("11") ||
    employer.employment_start > employer.employment_end ||
    employer.issued_on < employer.employment_end ||
    employer.employer_ein === digits(farm.line_d_ein) ||
    employer.issued_by !== employer.employer_name ||
    employer.employer_ein !== digits(wage.employer_ein) ||
    employer.employer_name !== wage.employer_name ||
    employer.employee_ssn !== digits(general.taxpayer_ssn) ||
    employer.employee_ssn !== digits(wage.employee_ssn) ||
    employer.w2_source_document_reference !== wage.source_document_reference ||
    proof.document_id !== wage.schedule_j_nonfarm_wage_source_document_id ||
    employer.w2_box1_wages !== amount ||
    employer.w2_box2_withholding !== wage.box2_fed_withheld ||
    employer.w2_box3_ss_wages !== wage.box3_ss_wages ||
    employer.w2_box5_medicare_wages !== wage.box5_medicare_wages ||
    wage.box13_statutory_employee === true
  ) {
    throw new Error(
      "Schedule J W-2 does not match a distinct nonfarm employer and owner source",
    );
  }
  return amount;
}

const context = { taxYear: 2025, formType: "f1040" } as const;
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(
      "Schedule J source replay needs a calculated source record",
    );
  }
  return value as Record<string, unknown>;
}
function total(value: unknown): number {
  if (value === undefined) return 0;
  const result = Array.isArray(value)
    ? value.reduce((sum, v) => sum + total(v), 0)
    : Number(value);
  if (!Number.isFinite(result)) {
    throw new Error("Schedule J source amount must be finite");
  }
  return result;
}
function raw(inputs: Record<string, unknown>): ExecuteResult {
  return execute(buildExecutionPlan(registry), registry, inputs, context);
}

function jointFishingFarmOwners(
  inputs: Record<string, unknown>,
  pending: Readonly<Record<string, unknown>>,
): void {
  const general = record(inputs.general);
  const cs = inputs.schedule_c;
  const fs = record(inputs.schedule_f).schedule_fs;
  if (
    general.filing_status !== "mfj" || !Array.isArray(cs) || cs.length !== 1 ||
    !Array.isArray(fs) || fs.length !== 1
  ) {
    throw new Error(
      "Schedule J joint fishing/farm needs one owned C and F on a joint return",
    );
  }
  const c = record(cs[0]);
  const f = record(fs[0]);
  const cOwner = c.proprietor_recipient;
  const fOwner = f.proprietor_recipient;
  if (
    (cOwner !== "T" && cOwner !== "S") ||
    (fOwner !== "T" && fOwner !== "S") || cOwner === fOwner
  ) {
    throw new Error("Schedule J joint C/F owners must be distinct spouses");
  }
  const se = record(pending.schedule_se);
  const instances = se.owner_instances;
  const businesses = se.owner_business_sources;
  if (
    !Array.isArray(instances) || !Array.isArray(businesses) ||
    instances.length !== 2 || businesses.length !== 2
  ) {
    throw new Error("Schedule J needs both actual owner Schedule SE instances");
  }
  const owners = ["T", "S"];
  const ssns = [general.taxpayer_ssn, general.spouse_ssn].map((v) =>
    String(v ?? "").replaceAll("-", "")
  );
  if (ssns.some((ssn) => !/^\d{9}$/.test(ssn)) || ssns[0] === ssns[1]) {
    throw new Error("Schedule J joint owners need distinct SSNs");
  }
  for (const [index, recipient] of owners.entries()) {
    const instance = instances.find((v) => record(v).recipient === recipient);
    const source = businesses.find((v) => record(v).recipient === recipient);
    if (!instance || !source) {
      throw new Error("Schedule J missing owner business or SE instance");
    }
    const owned = recipient === cOwner ? c : f;
    const kind = recipient === cOwner ? "schedule_c" : "schedule_f";
    const reference = recipient === cOwner ? c.business_reference : f.farm_id;
    if (
      record(instance).owner_ssn !== ssns[index] ||
      record(source).source_reference !== reference ||
      record(source).kind !== kind ||
      record(source).net_profit !==
        (recipient === cOwner
          ? total(record(pending.schedule_j_calculation).schedule_c_net_profit)
          : total(record(pending.schedule_j_calculation).farm_net_profit)) ||
      owned.proprietor_recipient !== recipient
    ) {
      throw new Error(
        "Schedule J owner payroll, profit, and filed business differ",
      );
    }
  }
  if (pending.form8995a !== undefined) {
    const advanced = record(pending.form8995a);
    const source = record(advanced.mixed_fishing_qbi_source);
    if (
      advanced.filing_status !== "mfj" ||
      source.se_tax_deduction !==
        instances.reduce((sum, v) => sum + total(record(v).line13), 0) ||
      total(advanced.qbi) !==
        businesses.reduce((sum, v) => sum + total(record(v).net_profit), 0) -
          total(source.se_tax_deduction) ||
      JSON.stringify(source.joint_se_source) !==
        JSON.stringify(record(pending.form8995).joint_se_source)
    ) {
      throw new Error(
        "Schedule J advanced joint QBI differs from actual owned C/F and half-SE",
      );
    }
    return;
  }
  const qbi = record(pending.form8995);
  const rows = qbi.joint_owner_filing_rows;
  if (
    !Array.isArray(rows) || rows.length !== 2 ||
    total(qbi.se_tax_deduction) !==
      instances.reduce((sum, v) => sum + total(record(v).line13), 0)
  ) {
    throw new Error("Schedule J joint QBI and owner half-SE do not reconcile");
  }
  for (const recipient of owners) {
    const instance = record(
      instances.find((v) => record(v).recipient === recipient),
    );
    const row = rows.find((v) => record(v).recipient === recipient);
    const source = businesses.find((v) => record(v).recipient === recipient);
    if (
      !row || !source ||
      record(row).business_reference !== record(source).source_reference ||
      total(record(row).se_tax_deduction) !== total(instance.line13) ||
      total(record(row).raw_qbi) !==
        total(record(source).net_profit) - total(instance.line13)
    ) {
      throw new Error(
        "Schedule J owner-specific QBI row differs from business and half-SE",
      );
    }
  }
}

/** Innermost graph stage, reusable in credit and QEF counterfactual passes. */
export function executeScheduleJSourceReturn(
  inputs: Record<string, unknown>,
  executeGraph: (inputs: Record<string, unknown>) => ExecuteResult = raw,
): ExecuteResult {
  if (inputs.schedule_j === undefined) return executeGraph(inputs);
  // Private worksheet operands cannot be supplied by a public caller.
  const source = publicInputSchema.parse(inputs.schedule_j);
  const preferential = Object.values(source.tax_treatment).some((facts) =>
    facts.has_qualified_dividends || facts.has_net_capital_gain ||
    facts.has_unrecaptured_section1250_gain || facts.has_28_percent_rate_gain
  );
  const cs = inputs.schedule_c;
  const fs = inputs.schedule_f;
  if (
    Array.isArray(cs) && cs.length === 1 && fs !== undefined &&
    record(cs[0]).schedule_j_fishing_evidence !== undefined
  ) {
    const cOwner = record(cs[0]).proprietor_recipient ?? "T";
    const farms = record(fs).schedule_fs;
    if (
      Array.isArray(farms) && farms.length === 1 &&
      cOwner !== record(farms[0]).proprietor_recipient &&
      record(inputs.general).filing_status !== "mfj"
    ) {
      throw new Error(
        "Schedule J separate fishing/farm owners require a joint return",
      );
    }
  }
  const jointFishing = record(inputs.general).filing_status === "mfj" &&
    Array.isArray(cs) && cs.length === 1 &&
    record(cs[0]).schedule_j_fishing_evidence !== undefined &&
    fs !== undefined;
  if (!preferential && !jointFishing) return executeGraph(inputs);
  const noElection = structuredClone(inputs);
  delete noElection.schedule_j;
  const baseline = executeGraph(noElection);
  if (baseline.diagnostics.length) {
    throw new Error(
      "Schedule J needs a settled actual return without the election: " +
        baseline.diagnostics.map((d) => d.message).join("; "),
    );
  }
  const tax = record(baseline.pending.income_tax_calculation);
  const itemizedInvestmentInterest = tax.taking_standard_deduction === false;
  if (itemizedInvestmentInterest) {
    const form = record(baseline.pending.form4952);
    reconcileForm4952ScheduleJChildDividend(
      form,
      baseline.pending,
      String(record(baseline.pending.f1040).taxpayer_ssn ?? ""),
    );
  }
  const agi = record(baseline.pending.agi_aggregator);
  const farm = record(baseline.pending.schedule_j_calculation);
  const child =
    (baseline.pending.form8814 as { items?: Form8814Lines[] } | undefined)
      ?.items;
  if (child !== undefined) {
    const owner = String(record(inputs.general).taxpayer_ssn ?? "");
    assertForm8814CalculatedLines(child, owner);
    const childTotal = (pick: (line: Form8814Lines) => number) =>
      child.reduce((sum, line) => sum + pick(line), 0);
    if (
      total(agi.line8z_form8814) !== childTotal((line) => line.line12) ||
      total(agi.form8814_eic_line4) !== childTotal(form8814EicLine4) ||
      total(agi.form8814_eic_tax_exempt_interest) !==
        childTotal((line) => line.item.tax_exempt_interest ?? 0) ||
      total(tax.form8814_tax) !== childTotal((line) => line.line15)
    ) {
      throw new Error(
        "Schedule J child income and tax differ from reviewed Form 8814",
      );
    }
  }
  if (jointFishing) {
    const farms = record(fs).schedule_fs;
    if (
      Array.isArray(farms) && farms.length === 1 &&
      record(cs[0]).proprietor_recipient !==
        record(farms[0]).proprietor_recipient
    ) {
      jointFishingFarmOwners(inputs, baseline.pending);
    }
  }
  const wages = nonfarmWages(inputs, source);
  // Establish the separately attributable investment income from actual graph
  // sources. Other business/adjustment allocations still need their own proof.
  const allowed = new Set([
    "filing_status",
    "line6_schedule_f",
    "line3_schedule_c",
    "line15_se_deduction",
    "line8z_form8621_qef",
    "line3b_ordinary_dividends",
    "line1a_wages",
    "line7_capital_gain",
    "line7a_cap_gain_distrib",
    ...(child === undefined ? [] : [
      "line8z_form8814",
      "form8814_eic_line4",
      "form8814_eic_tax_exempt_interest",
    ]),
  ]);
  for (const [key, value] of Object.entries(agi)) {
    if (!allowed.has(key) && key !== "filing_status" && total(value) !== 0) {
      throw new Error(
        `Schedule J needs attributable current-year source allocation for ${key}`,
      );
    }
  }
  const fishing = farm.fishing_net_profit !== undefined;
  if (fishing) {
    const retainedProfit = retainedFishingProfit(inputs);
    if (
      retainedProfit !== total(farm.fishing_net_profit) ||
      retainedProfit !== total(farm.schedule_c_net_profit) ||
      retainedProfit !== total(agi.line3_schedule_c)
    ) {
      throw new Error(
        "Schedule J retained fishing profit differs from actual return sources",
      );
    }
  } else if (total(farm.schedule_c_net_profit) !== 0) {
    throw new Error(
      "Schedule J preferential source replay needs independently allocated other business deductions",
    );
  }
  const worksheet = scheduleJTaxSourceSchema.parse({
    qualified_dividends: Math.round(total(tax.qualified_dividends)),
    net_capital_gain: Math.round(total(tax.net_capital_gain)),
    unrecaptured_1250_gain: Math.round(total(tax.unrecaptured_1250_gain)),
    rate_28_gain: Math.round(total(tax.rate_28_gain)),
    form4952_line4g: Math.round(total(tax.form4952_election)),
    form4952_line4e: Math.round(total(tax.form4952_elected_capital_gain)),
    source_reference: "actual-no-election-return-tax-sources",
  });
  const investment = total(agi.line3b_ordinary_dividends) +
    total(agi.line8z_form8814) + total(agi.line7_capital_gain) +
    total(agi.line7a_cap_gain_distrib);
  if (total(agi.line1a_wages) !== wages) {
    throw new Error(
      "Schedule J nonfarm W-2 wages differ from actual AGI source",
    );
  }
  const finalInputs = structuredClone(inputs);
  finalInputs.schedule_j = {
    ...source,
    _derived_source: {
      current_year_tax_source: worksheet,
      nonfarm_investment_income: investment,
      ...(wages ? { nonfarm_wage_income: wages } : {}),
      ...(itemizedInvestmentInterest
        ? { itemized_investment_interest_source: true }
        : {}),
    },
  };
  const result = executeGraph(finalInputs);
  if (result.diagnostics.length) return result;
  return {
    ...result,
    pending: {
      ...result.pending,
      schedule_j_source_replay: {
        source_inputs: structuredClone(inputs),
        no_election_income_tax: structuredClone(tax),
        no_election_form6251: structuredClone(baseline.pending.form6251),
      },
    },
  };
}

/** Exporters replay actual sources, including each filed prior-year worksheet. */
export function assertScheduleJSourceReturn(
  pending: Readonly<Record<string, unknown>>,
  executeFiledReturn: (
    inputs: Record<string, unknown>,
  ) => ExecuteResult = executeScheduleJSourceReturn,
): void {
  const calculation = pending.schedule_j_calculation as
    | Record<string, unknown>
    | undefined;
  const sourceTax =
    (pending.income_tax_calculation as Record<string, unknown> | undefined)
      ?.schedule_j_current_tax_source;
  const treatment = calculation?.tax_treatment as
    | Record<string, Record<string, unknown>>
    | undefined;
  const filedJ = pending.schedule_j as Record<string, unknown> | undefined;
  const actualTax = pending.income_tax_calculation as
    | Record<string, unknown>
    | undefined;
  const actual1040 = pending.f1040 as Record<string, unknown> | undefined;
  const actualPreferential = filedJ?.line23 !== undefined &&
    (total(actualTax?.qualified_dividends) > 0 ||
      total(actualTax?.net_capital_gain) > 0 ||
      total(actual1040?.line3a_qualified_dividends) > 0);
  const preferential = actualPreferential || sourceTax !== undefined ||
    (treatment &&
      Object.values(treatment).some((f) =>
        f.has_qualified_dividends || f.has_net_capital_gain ||
        f.has_unrecaptured_section1250_gain || f.has_28_percent_rate_gain
      ));
  if (!preferential && pending.schedule_j_source_replay === undefined) return;
  const marker = record(pending.schedule_j_source_replay);
  const qef = pending.form8621_1294_refigure === undefined
    ? undefined
    : record(pending.form8621_1294_refigure);
  const adoption = pending.form8839_route === undefined
    ? undefined
    : record(pending.form8839_route);
  const sourceInputs = qef === undefined
    ? {
      ...record(marker.source_inputs),
      ...(adoption === undefined ? {} : {
        form8839: adoption.public_source,
      }),
    }
    : record(qef.source_inputs);
  const replay = executeFiledReturn(sourceInputs);
  if (
    replay.diagnostics.length ||
    !isDeepStrictEqual(
      buildPending(replay.pending),
      buildPending(pending as Record<string, unknown>),
    )
  ) {
    throw new Error(
      "Schedule J filed return differs from actual source replay",
    );
  }
}
