import { element, elements } from "../../../../mef/xml.ts";
import {
  computeScheduleHAmounts,
  inputSchema,
  type ScheduleHInput,
} from "../../../../nodes/intermediate/forms/schedule_h/index.ts";
import type { MefBuildContext, MefFormDescriptor } from "../../form-descriptor.ts";
import { FilingStatus } from "../../types.ts";
import {
  inputSchema as schedule2InputSchema,
  schedule2,
} from "../../../../nodes/intermediate/aggregation/schedule2/index.ts";

function sourcedOtherTaxes(context: MefBuildContext): unknown {
  return schedule2.compute(
    { taxYear: 2025, formType: "f1040" },
    schedule2InputSchema.parse(context.pending?.schedule2 ?? {}),
  ).outputs.find((entry) => entry.nodeType === "f1040")
    ?.fields.line23_other_taxes ?? 0;
}

export interface Fields {
  employer_ein?: string;
  cash_wages_over_2025_limit?: boolean;
  cash_wages_over_quarter_limit?: boolean;
  ss_wages?: number | null;
  medicare_wages?: number | null;
  additional_medicare_wages?: number | null;
  federal_income_tax_withheld?: number | null;
  family_withholding_only_payroll?: unknown;
  family_employer_ssn?: string;
  federal_unemployment?: ScheduleHInput["federal_unemployment"];
}

type Input = Partial<Fields> & Record<string, unknown>;

export const FIELD_MAP: ReadonlyArray<readonly [keyof Fields, string]> = [
  ["ss_wages", "SocialSecurityTaxCashWagesAmt"],
  ["medicare_wages", "MedicareTaxCashWagesAmt"],
  ["additional_medicare_wages", "TotMedcrTaxCashWagesAddnlWhAmt"],
  ["federal_income_tax_withheld", "FederalIncomeTaxWithheldAmt"],
];

function buildIRS1040ScheduleH(
  fields: Input,
  context: MefBuildContext,
): string {
  if (Object.keys(fields).length === 0) return "";
  const filer = context.filer;
  if (!filer?.fullName) throw new Error("Schedule H needs filer identity");
  if (!fields.employer_ein || !/^\d{9}$/.test(fields.employer_ein)) {
    throw new Error("Schedule H needs a nine-digit employer EIN");
  }
  if (typeof fields.cash_wages_over_2025_limit !== "boolean") {
    throw new Error("Schedule H needs the explicit line A cash-wage answer");
  }
  if (typeof fields.cash_wages_over_quarter_limit !== "boolean") {
    throw new Error(
      "Schedule H needs the explicit line 9 quarterly-wage answer",
    );
  }
  if (
    fields.cash_wages_over_2025_limit === false &&
    ((fields.ss_wages ?? 0) > 0 || (fields.medicare_wages ?? 0) > 0)
  ) {
    throw new Error(
      "Schedule H taxable FICA wages conflict with a false line A answer",
    );
  }
  const source = inputSchema.parse(fields);
  if (
    source.federal_unemployment === undefined &&
    ((source.ss_wages ?? 0) > 0 || (source.medicare_wages ?? 0) > 0 ||
      (source.federal_income_tax_withheld ?? 0) > 0) &&
    source.fica_only_payroll === undefined &&
    source.family_withholding_only_payroll === undefined
  ) {
    throw new Error(
      "Schedule H FICA-only export needs employee payroll source",
    );
  }
  const amounts = computeScheduleHAmounts(source, 2025);
  if (source.fica_only_payroll) {
    const retained = inputSchema.parse(context.pending?.schedule_h ?? {});
    if (
      JSON.stringify(retained.fica_only_payroll) !==
        JSON.stringify(source.fica_only_payroll) ||
      (context.pending?.schedule2 as Record<string, unknown> | undefined)
          ?.line9_household_employment !== amounts.totalTax
    ) {
      throw new Error(
        "Schedule H FICA-only source and tax must reconcile to Schedule 2 line 9 and retained payroll",
      );
    }
  }
  if (source.family_withholding_only_payroll) {
    const retained = inputSchema.parse(context.pending?.schedule_h ?? {});
    const family = source.family_withholding_only_payroll;
    const spouseW2s = (context.pending?.w2 as {
      w2s?: Array<Record<string, unknown>>;
    } | undefined)?.w2s;
    const spouseMatches = spouseW2s?.filter((w2) =>
      typeof w2.employee_ssn === "string" &&
      w2.employee_ssn.replace(/\D/g, "") === family.employee.employee_ssn &&
      typeof w2.employer_ein === "string" &&
      w2.employer_ein.replace(/\D/g, "") === fields.employer_ein
    ) ?? [];
    const spouseW2 = spouseMatches.length === 1 ? spouseMatches[0] : undefined;
    const return1040 = context.pending?.f1040 as
      | Record<string, unknown>
      | undefined;
    const digits = (value: unknown): string | undefined =>
      typeof value === "string" ? value.replace(/\D/g, "") : undefined;
    if (
      filer.primarySSN.replace(/\D/g, "") !==
        family.employer_ssn ||
      (family.employee.relationship === "spouse" &&
        (filer.filingStatus !== FilingStatus.MarriedFilingJointly ||
          filer.spouse?.ssn.replace(/\D/g, "") !==
            family.employee.employee_ssn ||
          digits(spouseW2?.employee_ssn) !==
            family.employee.employee_ssn ||
          digits(spouseW2?.employer_ein) !==
            fields.employer_ein ||
          spouseW2?.box1_wages !== family.employee.w2.box1_wages ||
          spouseW2?.box2_fed_withheld !==
            family.employee.w2.box2_federal_income_tax_withheld ||
          spouseW2?.box3_ss_wages !== 0 ||
          spouseW2?.box4_ss_withheld !== 0 ||
          spouseW2?.box5_medicare_wages !== 0 ||
          spouseW2?.box6_medicare_withheld !== 0 ||
          return1040?.line23_other_taxes !== sourcedOtherTaxes(context) ||
          return1040?.line1a_wages !== spouseW2s?.reduce(
              (sum, w2) =>
                sum + Number(w2.box1_wages ?? 0),
              0,
            ) ||
          return1040?.line25a_w2_withheld !== spouseW2s?.reduce(
              (sum, w2) => sum + Number(w2.box2_fed_withheld ?? 0),
              0,
            ))) ||
      JSON.stringify(retained.family_withholding_only_payroll) !==
        JSON.stringify(family) ||
      (context.pending?.schedule2 as Record<string, unknown> | undefined)
          ?.line9_household_employment !== amounts.totalTax
    ) {
      throw new Error(
        "Schedule H family withholding source must match the filer, spouse W-2 and Form 1040 if applicable, retained payroll, and Schedule 2 line 9",
      );
    }
  }
  const payroll = source.federal_unemployment ?? source.fica_only_payroll;
  const familyWorkers = payroll?.employee_wages.filter(
    (employee) => employee.relationship !== "unrelated",
  ) ?? [];
  if (familyWorkers.length) {
    const retained = inputSchema.parse(context.pending?.schedule_h ?? {});
    const retainedPayroll = retained.federal_unemployment ??
      retained.fica_only_payroll;
    const w2s = (context.pending?.w2 as {
      w2s?: Array<Record<string, unknown>>;
    } | undefined)?.w2s ?? [];
    const digits = (value: unknown) =>
      typeof value === "string" ? value.replace(/\D/g, "") : undefined;
    if (
      digits(filer.primarySSN) !== source.family_employer_ssn ||
      retained.family_employer_ssn !== source.family_employer_ssn ||
      (context.pending?.f1040 as Record<string, unknown> | undefined)
          ?.line23_other_taxes !== sourcedOtherTaxes(context) ||
      JSON.stringify(retainedPayroll) !== JSON.stringify(payroll) ||
      (context.pending?.schedule2 as Record<string, unknown> | undefined)
          ?.line9_household_employment !== amounts.totalTax
    ) {
      throw new Error(
        "Schedule H mixed family payroll must match filer, retained sources and Schedule 2",
      );
    }
    for (const employee of familyWorkers) {
      if (
        employee.relationship === "parent" &&
        employee.parent_fica_review.classification === "quarterly_circumstances"
      ) {
        const quarter4 = employee.parent_fica_review.quarterly_circumstances
          .find((q) => q.quarter === 4)!;
        const status = quarter4.employer_circumstances;
        const return1040 = context.pending?.f1040 as
          | Record<string, unknown>
          | undefined;
        if (
          (status.kind === "spouse_incapable" ||
            status.kind === "married_capable_spouse") &&
          (digits(filer.spouse?.ssn ?? return1040?.spouse_ssn) !==
              status.spouse_ssn ||
            status.spouse_ssn === source.family_employer_ssn ||
            status.spouse_ssn === employee.employee_ssn)
        ) {
          throw new Error(
            "Schedule H parent year-end spouse circumstances must join the return spouse identity",
          );
        }
        if (
          (status.kind === "never_married" ||
            status.kind === "divorced_not_remarried") &&
          filer.filingStatus === FilingStatus.MarriedFilingJointly
        ) {
          throw new Error(
            "Schedule H parent year-end marital source conflicts with joint filing status",
          );
        }
        if (
          status.kind === "widowed_not_remarried" &&
          filer.filingStatus === FilingStatus.MarriedFilingJointly &&
          (return1040?.spouse_deceased !== true ||
            return1040?.spouse_death_date !== status.spouse_death_date ||
            status.spouse_death_date < "2025-01-01")
        ) {
          throw new Error(
            "Schedule H parent year-of-death joint filing needs matching spouse death facts",
          );
        }
      }
      if (employee.relationship !== "spouse") continue;
      const matches = w2s.filter((w2) =>
        digits(w2.employee_ssn) === employee.employee_ssn &&
        digits(w2.employer_ein) === fields.employer_ein
      );
      const w2 = matches.length === 1 ? matches[0] : undefined;
      if (
        filer.filingStatus !== FilingStatus.MarriedFilingJointly ||
        digits(filer.spouse?.ssn) !== employee.employee_ssn ||
        !employee.w2 || !w2 ||
        w2.box1_wages !== employee.annual_cash_wages ||
        w2.box2_fed_withheld !== employee.w2.box2_federal_income_tax_withheld ||
        w2.box3_ss_wages !== 0 || w2.box4_ss_withheld !== 0 ||
        w2.box5_medicare_wages !== 0 || w2.box6_medicare_withheld !== 0
      ) {
        throw new Error(
          "Schedule H mixed spouse payroll needs its unique owned household W-2 on the joint return",
        );
      }
    }
  }
  if (
    source.federal_unemployment?.employee_wages.some((employee) =>
      employee.relationship === "unrelated" &&
      employee.nonstudent_minor_fica_inclusion !== undefined
    ) &&
    (context.pending?.schedule2 as Record<string, unknown> | undefined)
        ?.line9_household_employment !== amounts.totalTax
  ) {
    throw new Error(
      "Schedule H nonstudent minor tax must reconcile to Schedule 2 line 9",
    );
  }
  const unemployment = fields.federal_unemployment;
  const ssTax = fields.ss_wages == null ? undefined : amounts.socialSecurityTax;
  const medicareTax = fields.medicare_wages == null
    ? undefined
    : amounts.medicareTax;
  const amount = (tag: string, value: number | null | undefined): string =>
    value == null ? "" : element(tag, value);
  const boolean = (tag: string, value: boolean | undefined): string =>
    value === undefined ? "" : element(tag, String(value));

  return elements("IRS1040ScheduleH", [
    element("HouseholdEmployerNm", filer.fullName),
    element("SSN", filer.primarySSN.replace(/\D/g, "")),
    element("EmployerEIN", fields.employer_ein),
    boolean(
      "HsldEmplPdCashWageOverLmtCYInd",
      fields.cash_wages_over_2025_limit,
    ),
    fields.cash_wages_over_2025_limit === false &&
      (fields.federal_income_tax_withheld ?? 0) > 0
      ? element("HsldEmplFedIncmTaxWithheldInd", "true")
      : "",
    amount("SocialSecurityTaxCashWagesAmt", fields.ss_wages),
    amount("SocialSecurityTaxAmt", ssTax),
    amount("MedicareTaxCashWagesAmt", fields.medicare_wages),
    amount("MedicareTaxWithheldAmt", medicareTax),
    amount("TotMedcrTaxCashWagesAddnlWhAmt", fields.additional_medicare_wages),
    amount(
      "AddnlMedicareTaxWithholdingAmt",
      fields.additional_medicare_wages == null
        ? undefined
        : amounts.additionalMedicareTax,
    ),
    amount("FederalIncomeTaxWithheldAmt", fields.federal_income_tax_withheld),
    amount("TotSocSecMedcrAndFedIncmTaxAmt", amounts.ficaAndWithholding),
    boolean(
      "HsldEmplPdTotCashWageAnyQtrInd",
      fields.cash_wages_over_quarter_limit,
    ),
    unemployment === undefined ? "" : [
      boolean("UnemplPaidOnlyOneStateInd", unemployment.paid_only_one_state),
      boolean(
        "PayAllStateUnemplContriInd",
        unemployment.all_contributions_paid_on_time,
      ),
      boolean(
        "TxblFUTAWagesAlsoTxblUnemplInd",
        unemployment.all_futa_wages_state_taxable,
      ),
      "state_rows" in unemployment
        ? elements("UnemplFundMultiStateGroup", [
          ...amounts.sectionB!.rows.map((row) =>
            elements("UnemploymentStateTaxGroup", [
              element("StateCd", row.state),
              element("TxblWagesPaidStUnemplFundAmt", row.taxable_state_wages),
              row.rate_period_from === undefined
                ? ""
                : element("UnemplStateExprncRateFromDt", row.rate_period_from),
              row.rate_period_to === undefined
                ? ""
                : element("UnemplStateExprncRateToDt", row.rate_period_to),
              row.experience_rate === undefined ? "" : element(
                "UnemploymentStateExperienceRt",
                String(row.experience_rate),
              ),
              amount("UnemploymentTaxCrAt54RateAmt", row.creditAt54),
              amount("UnemploymentTaxCrAtStateRtAmt", row.creditAtStateRate),
              amount(
                "UnemploymentAdditionalTaxCrAmt",
                row.creditAt54 === undefined ? undefined : row.additionalCredit,
              ),
              element(
                "ContriPaidToStateUnemplFundAmt",
                row.contributions_paid_by_due_date,
              ),
            ])
          ),
          element(
            "TotalUnemplAdditionalTaxCrAmt",
            amounts.sectionB!.additionalCredit,
          ),
          element(
            "TotalContriStateUnemplFundAmt",
            amounts.sectionB!.contributions,
          ),
          element("TentativeFUTACreditAmt", amounts.sectionB!.tentativeCredit),
          element(
            "TotalCashWagesSubjFUTATaxAmt",
            amounts.sectionB!.filedFutaWages,
          ),
          element("GrossFUTATaxCreditAmt", amounts.sectionB!.grossTax),
          element(
            "FUTATaxCreditMaxAllowedAmt",
            amounts.sectionB!.maximumCredit,
          ),
          element(
            "UnemplSmallerTaxAdjustmentAmt",
            amounts.sectionB!.allowedCredit,
          ),
          amounts.sectionB!.needsWorksheet
            ? element("CreditReductionStateWrkshtInd", "X")
            : "",
          element("FUTATaxAmt", amounts.futaTax),
        ])
        : elements("UnemplFundSingleStateGroup", [
          element("StateCd", unemployment.state),
          unemployment.zero_experience_rate
            ? element("UnemploymentFundZeroRateCd", "0% RATE")
            : element(
              "ContriPaidToStateUnemplFundAmt",
              unemployment.contributions_paid,
            ),
          element("TotalCashWagesSubjFUTATaxAmt", unemployment.taxable_wages),
          element("FUTATaxAmt", amounts.futaTax),
        ]),
    ].join(""),
    amount("TotalTaxHouseholdEmplCalcAmt", amounts.ficaAndWithholding),
    amount("CombinedFUTATaxPlusNetTaxesAmt", amounts.totalTax),
    element("RequiredToFileForm1040Ind", "true"),
  ]);
}

export const scheduleH: MefFormDescriptor<"schedule_h", Input> = {
  pendingKey: "schedule_h",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f1040sh.pdf",
  build(fields, context = {}) {
    return buildIRS1040ScheduleH(fields, context);
  },
};
