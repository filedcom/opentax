import { z } from "zod";
import { element, elements } from "../../../../../mef/xml.ts";
import { FilingStatus } from "../../../../../mef/header.ts";
import { FilingStatus as SourceFilingStatus } from "../../../../../nodes/types.ts";
import {
  assertLtcOnlySource,
  inputSchema,
} from "../../../../../nodes/intermediate/forms/adjustments/health/form8853/index.ts";
import {
  assertLtcOwners,
  calculateLtcLedger,
  LtcOwner,
} from "../../../../../nodes/intermediate/forms/adjustments/health/form8853/ltc.ts";
import { schedule1 } from "../../general/return-assembly/schedule1/schedule1.ts";
import type { MefBuildContext } from "../../../form-descriptor.ts";
import { ltcLedgerSchema } from "../../../../../nodes/intermediate/forms/adjustments/health/form8853/ltc.ts";

export function assertRequiredLtcSource(context: MefBuildContext): void {
  const retained =
    z.object({ ltc_source_ledger: ltcLedgerSchema.optional() }).parse(
      context.pending?.schedule1 ?? {},
    ).ltc_source_ledger;
  const raw = context.pending?.form8853;
  if (
    !retained && (!raw || typeof raw !== "object" || !("ltc_ledger" in raw))
  ) return;
  const current = inputSchema.parse(context.pending?.form8853 ?? {}).ltc_ledger;
  if (!retained && !current) return;
  if (
    !retained || !current ||
    JSON.stringify(retained) !== JSON.stringify(current)
  ) {
    throw new Error(
      "LTC retained Schedule 1 source requires its unchanged Form 8853 ledger",
    );
  }
  reconcileLtcReturn(context.pending?.form8853, context);
}

export const LTC_LINE_TAGS = [
  ["line18", "LTCInsuranceQualifiedAmt"],
  ["line19", "AcceleratedDeathBenefitRcvdAmt"],
  ["line20", "TotalLTCAndDeathBenefitRcvdAmt"],
  ["line21", "LTCDaysMultiplyByPerDiemAmt"],
  ["line22", "LTCCostIncurredAmt"],
  ["line23", "LargerCalcOrActualLTCCostsAmt"],
  ["line24", "LTCReimbursementAmt"],
  ["line25", "LTCPerDiemLimitationAmt"],
  ["line26", "LTCTaxablePaymentsAmt"],
] as const;

export function reconcileLtcReturn(raw: unknown, context?: MefBuildContext) {
  const source = inputSchema.parse(raw);
  assertLtcOnlySource(source);
  if (!source.ltc_ledger) {
    throw new Error("LTC filing needs its complete reviewed ledger");
  }
  const result = calculateLtcLedger(source.ltc_ledger);
  // TY2025 ReturnData permits one IRS8853 and one Section C group. Additional
  // insured/policyholder copies need the IRS-approved attachment representation.
  if (result.forms.length !== 1) {
    throw new Error(
      "LTC multiple Section C copies need their native attachment representation before filing",
    );
  }
  const filer = context?.filer;
  if (!filer) throw new Error("LTC filing needs the identified current return");
  assertLtcOwners(source.ltc_ledger, {
    taxpayer_ssn: filer.primarySSN,
    spouse_ssn: filer.spouse?.ssn,
    filing_status: filer.filingStatus === FilingStatus.MarriedFilingJointly
      ? SourceFilingStatus.MFJ
      : SourceFilingStatus.Single,
  });
  const form = result.forms[0];
  const holderName = form.owner.owner === LtcOwner.Taxpayer
    ? filer.fullName ?? filer.nameLine1
    : [
      filer.spouse?.firstName,
      filer.spouse?.middleInitial,
      filer.spouse?.lastName,
      filer.spouse?.suffix,
    ].filter(Boolean).join(" ");
  const normalized = (name: string) =>
    name.trim().replace(/\s+/g, " ").toUpperCase();
  if (normalized(holderName) !== normalized(form.policyholder.name)) {
    throw new Error("LTC policyholder name conflicts with the current return");
  }
  const s1 = z.object({ line8e_archer_msa_dist: z.number().optional() }).parse(
    context?.pending?.schedule1 ?? {},
  );
  if ((s1.line8e_archer_msa_dist ?? 0) !== result.taxable) {
    throw new Error("LTC taxable payments conflict with Schedule 1 line 8e");
  }
  const nativeS1 = schedule1.build(
    z.record(z.string(), z.unknown()).parse(context?.pending?.schedule1 ?? {}),
    context,
  );
  const additional = Number(
    /<TotalAdditionalIncomeAmt>(-?\d+)<\/TotalAdditionalIncomeAmt>/.exec(
      nativeS1,
    )?.[1] ?? 0,
  );
  const f1040 = z.object({ line8_additional_income: z.number().optional() })
    .parse(context?.pending?.f1040 ?? {});
  if (Math.round(f1040.line8_additional_income ?? 0) !== additional) {
    throw new Error("LTC Schedule 1 income conflicts with Form 1040 line 8");
  }
  return { ...result, form, insured: result.insureds[0], source };
}

export function buildLtcDocument(
  raw: unknown,
  context?: MefBuildContext,
): string {
  const { form } = reconcileLtcReturn(raw, context);
  const needsStatement = form.multiplePayees && !form.terminalOnly;
  const ids = context?.documentIdsByTag?.MultiplePayeesStatement;
  if (
    needsStatement &&
    (context?.phase === "final" || context?.documentIdsByTag) &&
    ids?.length !== 1
  ) {
    throw new Error(
      "LTC multiple-payee form needs its linked aggregate statement",
    );
  }
  const attrs = needsStatement && ids?.[0]
    ? {
      referenceDocumentId: ids[0],
      referenceDocumentName: "MultiplePayeesStatement",
    }
    : undefined;
  return elements("IRS8853", [elements("SectCLTCInsuranceCntrctGrp", [
    element("LTCInsurancePolicyHolderNm", form.policyholder.name.toUpperCase()),
    element("LTCInsurancePolicyHolderSSN", form.policyholder.ssn),
    element("LTCInsuredNameControlTxt", form.insured.name_control),
    element("LTCInsuredNm", form.insured.name.toUpperCase()),
    element("LTCInsuredSSN", form.insured.ssn),
    element("LTCInsuranceOtherPaymentInd", String(form.multiplePayees), attrs),
    element("LTCInsuredTerminallyIllInd", String(form.terminallyIll)),
    ...(form.terminalOnly
      ? []
      : [element("LTCGrossPaymentsReceivedAmt", form.line17)]),
    ...LTC_LINE_TAGS.filter(([key]) =>
      form.terminalOnly ? key === "line26" : !form.multiplePayees ||
        !["line21", "line22", "line23", "line24"].includes(key)
    ).map(([key, tag]) => element(tag, form[key])),
  ])]);
}

export function buildLtcStatements(
  raw: unknown,
  context?: MefBuildContext,
): readonly string[] {
  const { form, insured } = reconcileLtcReturn(raw, context);
  if (!form.multiplePayees || form.terminalOnly) return [];
  return [
    elements("MultiplePayeesStatement", [
      elements(
        "MultiplePayeesStmt",
        LTC_LINE_TAGS.map(([key, tag]) => element(tag, insured.aggregate[key])),
      ),
    ]),
  ];
}
