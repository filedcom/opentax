import {
  reconcileArcherContributions,
  reconcileArcherPartVI,
} from "../../form8853_contributions_reconciliation.ts";
import { schedule1 as nativeSchedule1 } from "./schedule1.ts";
import { schedule2 as nativeSchedule2 } from "./schedule2.ts";
import { z } from "zod";
import { element, elements } from "../../../mef/xml.ts";
import { FilingStatus } from "../../../mef/header.ts";
import {
  calculateArcherMsaDistribution,
  type Form8853Input,
  inputSchema,
  MsaOwner,
  normalizeArcherContributionSource,
  normalizeArcherSource,
  normalizeMedicareSource,
} from "../../../nodes/intermediate/forms/form8853/index.ts";
import {
  calculateMedicareJointLedgers,
  calculateMedicareLedger,
  type MedicareHolderLedger,
} from "../../../nodes/intermediate/forms/form8853/medicare_distributions.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";

type Input = Form8853Input | readonly [];

export const FIELD_MAP: ReadonlyArray<readonly [string, string]> = [];

function validateBoundedArcherDistribution(fields: Form8853Input) {
  const details = fields.archer_distribution_filing_details;
  if (!details && !fields.archer_distribution_ledger) {
    throw new Error(
      "Form 8853 MeF needs Archer MSA owner and source confirmations",
    );
  }
  if (details && details.owner !== MsaOwner.Taxpayer) {
    throw new Error(
      "Form 8853 spouse-owned MSA needs a separate owner-specific filing route",
    );
  }
  if (
    (fields.employer_archer_msa ?? 0) > 0 ||
    (fields.taxpayer_archer_msa_contributions ?? 0) > 0 ||
    (fields.line3_limitation_amount ?? 0) > 0 ||
    (fields.compensation ?? 0) > 0 ||
    (fields.medicare_advantage_distributions ?? 0) > 0 ||
    (fields.medicare_advantage_qualified_expenses ?? 0) > 0 ||
    fields.medicare_advantage_exception === true ||
    (fields.ltc_gross_payments ?? 0) > 0 ||
    (fields.ltc_qualified_contract_amount ?? 0) > 0 ||
    (fields.ltc_accelerated_death_benefits ?? 0) > 0 ||
    (fields.ltc_period_days ?? 0) > 0 ||
    (fields.ltc_actual_costs ?? 0) > 0 ||
    (fields.ltc_reimbursements ?? 0) > 0
  ) {
    throw new Error(
      "Form 8853 MeF only supports an Archer MSA distribution without contributions, Medicare MSA, or LTC activity",
    );
  }
  const lines = calculateArcherMsaDistribution(fields);
  if (
    ![lines.line6a, lines.line6b, lines.line6c, lines.line7].every(
      fields.archer_distribution_ledger ? Number.isFinite : Number.isInteger,
    ) ||
    lines.line6a <= 0 || fields.archer_msa_qualified_expenses === undefined ||
    fields.archer_msa_rollover !== 0 ||
    (!fields.archer_distribution_ledger &&
      fields.archer_msa_exception !== false) ||
    lines.line7 > lines.line6a ||
    lines.line6c !== lines.line6a
  ) {
    throw new Error(
      "Form 8853 MeF needs a whole-dollar Archer distribution with unreimbursed qualified expenses no greater than the distribution, with no rollover or tax exception",
    );
  }
  if (
    !fields.archer_distribution_ledger && lines.line8 > 0 &&
    details?.normal_distribution_code_1_confirmed !== true
  ) {
    throw new Error(
      "Form 8853 taxable Archer route needs Form 1099-SA normal distribution code 1 confirmation",
    );
  }
  return lines;
}

function validateReturnContext(
  context: MefBuildContext | undefined,
  lines: { line8: number; line9b: number },
  medicareTax = 0,
  allowSoleJointHolder = false,
): string {
  const filer = context?.filer;
  if (!filer || !/^\d{9}$/.test(filer.primarySSN)) {
    throw new Error(
      "Form 8853 MeF needs MSA holder SSN from the return header",
    );
  }
  if (
    !allowSoleJointHolder &&
    (filer.spouse || filer.filingStatus === FilingStatus.MarriedFilingJointly)
  ) {
    throw new Error(
      "Form 8853 MeF does not yet support joint returns with spouse MSA ambiguity",
    );
  }
  if (!context?.pending) {
    throw new Error(
      "Form 8853 MeF needs pending return reconciliation context",
    );
  }
  const schedule1 = z.object({
    line8e_archer_msa_dist: z.number().optional(),
    line23_archer_msa_deduction: z.number().optional(),
  }).safeParse(context.pending.schedule1 ?? {});
  const schedule2 = z.object({
    line17e_archer_msa_tax: z.number().optional(),
    line17f_medicare_advantage_msa_tax: z.number().optional(),
  }).safeParse(context.pending.schedule2 ?? {});
  if (
    (context.pending.schedule1 !== undefined && !schedule1.success) ||
    (context.pending.schedule2 !== undefined && !schedule2.success)
  ) {
    throw new Error(
      "Form 8853 MeF cannot reconcile malformed Schedule 1 or 2 credit fields",
    );
  }
  if (
    (schedule1.success &&
      ((schedule1.data.line8e_archer_msa_dist ?? 0) !== lines.line8 ||
        (schedule1.data.line23_archer_msa_deduction ?? 0) !== 0)) ||
    (schedule2.success &&
      ((schedule2.data.line17e_archer_msa_tax ?? 0) !== lines.line9b ||
        (schedule2.data.line17f_medicare_advantage_msa_tax ?? 0) !==
          medicareTax))
  ) {
    throw new Error(
      "Form 8853 distribution route conflicts with Schedule 1 or 2",
    );
  }
  return filer.primarySSN;
}

function validateMedicareOtherActivity(fields: Form8853Input) {
  if (
    fields.archer_distribution_ledger ||
    fields.archer_distribution_filing_details ||
    fields.archer_msa_exception === true ||
    [
      fields.employer_archer_msa,
      fields.taxpayer_archer_msa_contributions,
      fields.line3_limitation_amount,
      fields.compensation,
      fields.archer_msa_distributions,
      fields.archer_msa_rollover,
      fields.archer_msa_qualified_expenses,
      fields.ltc_gross_payments,
      fields.ltc_qualified_contract_amount,
      fields.ltc_accelerated_death_benefits,
      fields.ltc_period_days,
      fields.ltc_actual_costs,
      fields.ltc_reimbursements,
    ].some((value) => (value ?? 0) > 0)
  ) {
    throw new Error(
      "Form8853 Medicare ledger conflicts with reviewed absence of other Archer/LTC activity",
    );
  }
}

function bindMedicareHolder(
  ledger: MedicareHolderLedger,
  primarySSN: string,
  context?: MefBuildContext,
) {
  const holderSSN = ledger.owner === "taxpayer"
    ? primarySSN
    : context?.filer?.spouse?.ssn;
  if (
    !holderSSN ||
    (ledger.owner === "spouse" &&
      context?.filer?.filingStatus !== FilingStatus.MarriedFilingJointly)
  ) {
    throw new Error(
      "Form8853 spouse Medicare holder requires joint return spouse identity",
    );
  }
  const source = ledger.source;
  const reportedSSN = source.kind === "normal"
    ? source.holder_ssn
    : source.recipient_ssn;
  if (reportedSSN !== holderSSN) {
    throw new Error(
      "Form8853 Medicare source holder/recipient SSN must match declared return owner",
    );
  }
  if (
    source.kind === "death_transfer" &&
    source.beneficiary_kind === "estate_final_return"
  ) {
    const owner = ledger.owner === "taxpayer"
      ? context?.filer
      : context?.filer?.spouse;
    if (owner?.deceased !== true || owner.deathDate !== source.death_date) {
      throw new Error(
        "Form8853 Medicare estate transfer needs matching deceased final-return owner",
      );
    }
  }
  return holderSSN;
}

export function medicareNativeLines(
  lines: Pick<
    ReturnType<typeof calculateMedicareLedger>,
    "line10" | "line11" | "line12" | "line13a" | "line13b"
  >,
): string[] {
  return [
    element("TotalMedicareMSADistriAmt", lines.line10),
    element("MedicareMSAUnrmbQualMedExpAmt", lines.line11),
    element("TaxableMedicareMSADistriAmt", lines.line12),
    ...(lines.line13a ? [element("MedicareMSADistriMeetTaxExcInd", "X")] : []),
    element("MedicareMSAAddnlDistriTaxAmt", lines.line13b),
  ];
}

export function buildMedicareJointDocumentParts(
  raw: Form8853Input,
  context?: MefBuildContext,
) {
  const fields = normalizeMedicareSource(
    normalizeArcherSource(inputSchema.parse(raw)),
  );
  const ledgers = fields.medicare_joint_distribution_ledgers;
  if (!ledgers) {
    throw new Error("Form8853 joint Medicare source ledgers required");
  }
  validateMedicareOtherActivity(fields);
  if (
    context?.filer?.filingStatus !== FilingStatus.MarriedFilingJointly ||
    !context.filer.spouse
  ) {
    throw new Error(
      "Form8853 joint Medicare holders require MFJ with spouse identity",
    );
  }
  const computed = calculateMedicareJointLedgers(ledgers);
  const primarySSN = validateReturnContext(
    context,
    { line8: computed.line12, line9b: 0 },
    computed.line13b,
    true,
  );
  const f1040 = z.object({
    line8_additional_income: z.number().optional(),
    line23_other_taxes: z.number().optional(),
  }).parse(context.pending?.f1040 ?? {});
  const readTotal = (xml: string, tag: string) =>
    Number(new RegExp(`<${tag}>([0-9]+)</${tag}>`).exec(xml)?.[1] ?? 0);
  const additionalIncome = readTotal(
    nativeSchedule1.build((context.pending?.schedule1 ?? {}) as never, context),
    "TotalAdditionalIncomeAmt",
  );
  const otherTaxes = readTotal(
    nativeSchedule2.build((context.pending?.schedule2 ?? {}) as never, context),
    "TotalOtherTaxesAmt",
  );
  if (
    Math.round(f1040.line8_additional_income ?? 0) !== additionalIncome ||
    Math.round(f1040.line23_other_taxes ?? 0) !== otherTaxes
  ) {
    throw new Error(
      "Form8853 joint Medicare Schedule totals conflict with Form1040",
    );
  }
  const owners = computed.holders.map((holder) => ({
    ...holder,
    ssn: bindMedicareHolder(holder.ledger, primarySSN, context),
  }));
  // The v5.4 schema requires one controlling IRS8853 and separate owner-specific statement roots.
  const control = elements("IRS8853", [
    elements("ArcherMSAAndMedcrAdvntgMSAGrp", [
      element("MSAHolderSSN", primarySSN),
      ...medicareNativeLines(computed),
    ]),
  ]);
  const statements = owners.map((holder) =>
    elements(
      holder.ledger.owner === "taxpayer"
        ? "PrimaryTaxpayerMedicareMSAStmt"
        : "SpouseTaxpayerMedicareMSAStmt",
      medicareNativeLines(holder.lines),
    )
  );
  return { computed, owners, control, statements };
}

function buildMedicareIRS8853(
  fields: Form8853Input,
  context?: MefBuildContext,
): string {
  const ledger = fields.medicare_distribution_ledger!;
  validateMedicareOtherActivity(fields);
  const lines = calculateMedicareLedger(ledger);
  const primarySSN = validateReturnContext(
    context,
    { line8: lines.line12, line9b: 0 },
    lines.line13b,
    true,
  );
  const { sole_medicare_msa_holder_on_return_confirmed: _sole, ...holder } =
    ledger;
  const holderSSN = bindMedicareHolder(holder, primarySSN, context);
  return elements("IRS8853", [elements("ArcherMSAAndMedcrAdvntgMSAGrp", [
    element("MSAHolderSSN", holderSSN),
    ...(lines.deathTransfer ? [element("MSAHolderDeathInd", "X")] : []),
    ...medicareNativeLines(lines),
  ])]);
}

function buildIRS8853(rawFields: Input, context?: MefBuildContext): string {
  if (Array.isArray(rawFields) && rawFields.length === 0) return "";
  if (Object.keys(rawFields).length === 0) {
    throw new Error("Form 8853 MeF cannot file an empty pending record");
  }
  const fields = normalizeArcherContributionSource(normalizeMedicareSource(
    normalizeArcherSource(inputSchema.parse(rawFields)),
  ));
  if (fields.archer_contribution_ledger) {
    return buildArcherContributionIRS8853(fields, context);
  }
  if (fields.medicare_joint_distribution_ledgers) {
    return buildMedicareJointDocumentParts(fields, context).control;
  }
  if (fields.medicare_distribution_ledger) {
    return buildMedicareIRS8853(fields, context);
  }
  const lines = validateBoundedArcherDistribution(fields);
  const holderSSN = validateReturnContext(context, lines);
  const ledgerSource = fields.archer_distribution_ledger?.source;
  if (ledgerSource) {
    const recipient = ledgerSource.kind === "normal"
      ? ledgerSource.holder_ssn
      : ledgerSource.recipient_ssn;
    const birth = z.object({ taxpayer_dob: z.string().optional() }).safeParse(
      context?.pending?.f1040 ?? {},
    );
    if (
      ledgerSource.kind === "normal" && birth.success &&
      birth.data.taxpayer_dob !== undefined &&
      birth.data.taxpayer_dob !== ledgerSource.holder_date_of_birth
    ) {
      throw new Error(
        "Form 8853 holder birth date must match return taxpayer source",
      );
    }
    if (recipient !== holderSSN) {
      throw new Error(
        "Form 8853 source recipient must match return taxpayer SSN",
      );
    }
    if (
      ledgerSource.kind === "death_transfer" &&
      ledgerSource.beneficiary_kind === "estate_final_return" &&
      (context?.filer?.deceased !== true ||
        context.filer.deathDate !== ledgerSource.death_date)
    ) {
      throw new Error(
        "Form 8853 estate death transfer needs matching deceased final-return header",
      );
    }
    if (
      ledgerSource.kind === "death_transfer" &&
      ledgerSource.beneficiary_kind === "estate_final_return" &&
      context?.filer?.fullName &&
      ledgerSource.deceased_holder_name.toUpperCase() !==
        context.filer.fullName.toUpperCase()
    ) {
      throw new Error(
        "Form 8853 estate deceased holder name must match final return",
      );
    }
  }
  return elements("IRS8853", [
    elements("ArcherMSAAndMedcrAdvntgMSAGrp", [
      element("MSAHolderSSN", holderSSN),
      ...(lines.deathTransfer ? [element("MSAHolderDeathInd", "X")] : []),
      element("TotalArcherMSADistributionAmt", lines.line6a),
      element("ArcherMSADistriRollOverAmt", lines.line6b),
      element("ArcherMSANetDistributionAmt", lines.line6c),
      element("ArcherMSAUnreimbQualMedExpAmt", lines.line7),
      element("TaxableArcherMSADistriAmt", lines.line8),
      ...(lines.line9a ? [element("ArcherMSADistriMeetTaxExcInd", "X")] : []),
      ...(lines.line9b > 0
        ? [element("ArcherMSAAddnlDistriTaxAmt", Math.round(lines.line9b))]
        : []),
    ]),
  ]);
}

export const form8853: MefFormDescriptor<"form8853", Input> = {
  pendingKey: "form8853",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8853.pdf",
  build(fields, context) {
    return buildIRS8853(fields, context);
  },
};

function buildArcherContributionIRS8853(
  fields: Form8853Input,
  context?: MefBuildContext,
): string {
  const { lines, ssn } = reconcileArcherContributions(fields, context);
  const entries = z.object({
    owner_entries: z.array(
      z.object({ owner: z.string(), archer_part_vi: z.unknown().optional() })
        .passthrough(),
    ).optional(),
  }).parse(context?.pending?.form5329 ?? {});
  reconcileArcherPartVI(entries.owner_entries ?? [], fields, context);
  const read = (xml: string, tag: string) =>
    Number(new RegExp(`<${tag}>(-?[0-9]+)</${tag}>`).exec(xml)?.[1] ?? 0);
  const s1 = nativeSchedule1.build(
    (context?.pending?.schedule1 ?? {}) as never,
    context,
  );
  const s2 = nativeSchedule2.build(
    (context?.pending?.schedule2 ?? {}) as never,
    context,
  );
  const f1040 = z.object({
    line8_additional_income: z.number().optional(),
    line10_adjustments: z.number().optional(),
    line23_other_taxes: z.number().optional(),
  }).parse(context?.pending?.f1040 ?? {});
  if (
    Math.round(f1040.line8_additional_income ?? 0) !==
      read(s1, "TotalAdditionalIncomeAmt") ||
    Math.round(f1040.line10_adjustments ?? 0) !==
      read(s1, "TotalAdjustmentsAmt") ||
    Math.round(f1040.line23_other_taxes ?? 0) !== read(s2, "TotalOtherTaxesAmt")
  ) {
    throw new Error(
      "Archer contribution Schedule1/2 totals conflict with Form1040",
    );
  }
  return elements("IRS8853", [
    elements("ArcherMSAAndMedcrAdvntgMSAGrp", [
      element("MSAHolderSSN", ssn),
      element("ArcherMSAEmployerContriAmt", lines.line1),
      element("ArcherMSAContributionAmt", lines.line2),
      ...(lines.rawEmployer > 0 ? [] : [
        element("ArcherMSAContriLimitationAmt", lines.line3),
        element("HDHPEmployerCompensationAmt", lines.line4),
      ]),
      element("ArcherMSADeductionAmt", lines.line5),
    ]),
  ]);
}
