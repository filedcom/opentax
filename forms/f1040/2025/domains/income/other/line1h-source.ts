import { nativeFecInputSchema } from "../../../../nodes/inputs/income/foreign/fec/index.ts";
import {
  correctivePlanItems,
  disabilityPensionEarnedIncome,
  disabilityWagesItems,
  inputSchema as f1099rInputSchema,
} from "../../../../nodes/inputs/income/retirement/f1099r/index.ts";
import { CONFIG_BY_YEAR } from "../../../../nodes/config/index.ts";
import {
  codeDExcessDeferral,
  inputSchema as w2InputSchema,
} from "../../../../nodes/inputs/income/wages/w2/index.ts";
import { physicalPresenceFilingSchema } from "../../../../nodes/intermediate/forms/income/foreign/form2555/calculation.ts";
import { type FilerIdentity, FilingStatus } from "../../../../mef/header.ts";
import {
  clergyAmounts,
  inputSchema as clergyInputSchema,
} from "../../../../nodes/inputs/income/wages/clergy/index.ts";

/**
 * Retained clergy excess housing allowance, which Pub 517 puts on Form 1040
 * line 1h as "Excess allowance". Zero when no clergy row is retained.
 */
export function retainedClergyExcessAllowance(
  pending: Readonly<Record<string, unknown>> | undefined,
): number {
  if (pending?.clergy === undefined) return 0;
  return clergyInputSchema.parse(pending.clergy).clergys.reduce(
    (sum, item) => sum + clergyAmounts(item).excess_allowance,
    0,
  );
}

/**
 * Retained Form 1099-R disability pensions received before minimum retirement
 * age, which the Instructions for Form 1040 (2025), line 1h (page 25), put on
 * line 1h. Zero when no such copy is retained.
 */
export function retainedDisabilityPension(
  pending: Readonly<Record<string, unknown>> | undefined,
  taxYear: number,
): number {
  if (pending?.f1099r === undefined) return 0;
  const items = f1099rInputSchema.parse(pending.f1099r).f1099rs;
  if (disabilityWagesItems(items).length === 0) return 0;
  const cfg = CONFIG_BY_YEAR[taxYear];
  if (!cfg) throw new Error(`No f1040 config for year ${taxYear}`);
  return disabilityPensionEarnedIncome(
    items,
    cfg.qcdAnnualLimit,
    cfg.psoExclusionLimit,
  );
}

/** Replay retained 2025 line 1h routes without counting FEC/2555 wages twice. */
export function assertLine1hSupportedSource(
  fields: Readonly<Record<string, unknown>>,
  taxYear: number,
  pending?: Readonly<Record<string, unknown>>,
  filer?: FilerIdentity,
): void {
  const sources: number[] = [];
  const owners = new Set<string>();
  if (pending?.fec !== undefined) {
    const employerRows = nativeFecInputSchema.parse(pending.fec).fecs;
    const allowed = filer
      ? new Set([
        filer.primarySSN.replace(/\D/g, ""),
        ...(filer.filingStatus === FilingStatus.MarriedFilingJointly &&
            filer.spouse
          ? [filer.spouse.ssn.replace(/\D/g, "")]
          : []),
      ])
      : undefined;
    if (
      new Set(employerRows.map((row) =>
        row.compensation_source_document_reference
      )).size !== employerRows.length ||
      (allowed !== undefined && employerRows.some((row) =>
        !allowed.has(row.compensation_owner_ssn.replace(/\D/g, ""))
      ))
    ) {
      throw new Error(
        "Standalone FEC needs distinct employer sources owned by the filer or joint spouse",
      );
    }
    sources.push(
      employerRows.reduce(
        (sum, item) => sum + item.compensation_usd,
        0,
      ),
    );
  }
  const filing = (pending?.form2555 as Record<string, unknown> | undefined)
    ?.filing_details;
  let correctiveAmount = 0;
  if (filing !== undefined) {
    sources.push(physicalPresenceFilingSchema.parse(filing).foreign_wages);
  }
  if (pending?.w2 !== undefined) {
    const excess = codeDExcessDeferral(
      w2InputSchema.parse(pending.w2).w2s,
      taxYear,
    );
    if (excess.amount > 0) {
      sources.push(excess.amount);
      excess.owners.forEach((owner) => owners.add(owner));
    }
  }
  if (pending?.f1099r !== undefined) {
    const corrections = correctivePlanItems(
      f1099rInputSchema.parse(pending.f1099r).f1099rs,
    );
    if (corrections.length > 0) {
      correctiveAmount = corrections.reduce(
        (sum, item) => sum + (item.box2a_taxable_amount ?? 0),
        0,
      );
      sources.push(correctiveAmount);
    }
  }
  const disability = retainedDisabilityPension(pending, taxYear);
  if (disability > 0) sources.push(disability);
  const clergyExcess = retainedClergyExcessAllowance(pending);
  if (clergyExcess > 0) sources.push(clergyExcess);
  const filed = fields.line1h_other_earned;
  if (
    sources.length === 0 &&
    (filed === undefined || filed === null || filed === 0)
  ) {
    return;
  }
  if (pending?.fec !== undefined && filing !== undefined) {
    throw new Error(
      "Form 1040 line 1h standalone FEC and Form 2555 wages need overlap reconciliation",
    );
  }
  if (owners.size > 0 && filer !== undefined) {
    const allowed = new Set([filer.primarySSN.replace(/\D/g, "")]);
    if (
      filer.filingStatus === FilingStatus.MarriedFilingJointly && filer.spouse
    ) {
      allowed.add(filer.spouse.ssn.replace(/\D/g, ""));
    }
    if ([...owners].some((owner) => !allowed.has(owner))) {
      throw new Error(
        "Form 1040 line 1h W-2 excess owner must match taxpayer or joint spouse",
      );
    }
  }
  const supportedMix = sources.length === 1 ||
    (sources.length === 2 && pending?.fec !== undefined &&
      pending?.w2 !== undefined && filing === undefined &&
      correctiveAmount === 0 && disability === 0 && clergyExcess === 0);
  const total = sources.reduce((sum, amount) => sum + amount, 0);
  if (
    !supportedMix ||
    sources.some((amount) => !Number.isSafeInteger(amount) || amount <= 0) ||
    !Number.isSafeInteger(total) || filed !== total
  ) {
    throw new Error(
      "Form 1040 line 1h needs exactly one supported retained source or reviewed FEC plus W-2 excess matching its filed amount",
    );
  }
  const agiRaw = (pending?.agi_aggregator as
    | Record<string, unknown>
    | undefined)?.line1h_other_earned;
  const agi = typeof agiRaw === "number" ? agiRaw : Array.isArray(agiRaw) &&
      agiRaw.every((value) => typeof value === "number")
    ? agiRaw.reduce((sum, value) => sum + value, 0)
    : undefined;
  if (agi !== total) {
    throw new Error(
      "Form 1040 line 1h retained source must match the finalized AGI amount",
    );
  }
}
