import { element, elements } from "../../../mef/xml.ts";
import {
  calculateForm5884,
  inputSchema,
} from "../../../nodes/inputs/f5884/index.ts";
import {
  inputSchema as scheduleCInputSchema,
  wotcReductionsByBusiness,
} from "../../../nodes/inputs/schedule_c/model.ts";
import {
  inputSchema as scheduleFInputSchema,
  wotcReductionsByFarm,
} from "../../../nodes/intermediate/forms/schedule_f/index.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

export const form5884: MefFormDescriptor<"f5884", unknown> = {
  pendingKey: "f5884",
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f5884.pdf",
  build(raw, context) {
    if (!raw || typeof raw !== "object" || !("f5884s" in raw)) return "";
    const source = inputSchema.parse(raw);
    const lines = calculateForm5884(source);
    if (lines.line2 <= 0) return "";
    if (context?.pending) {
      const expectedC = new Map<string, number>();
      const expectedF = new Map<string, number>();
      const payrollC = new Map<string, number>();
      const payrollF = new Map<string, number>();
      for (const allocation of lines.wageDeductionAllocations) {
        if (allocation.location.kind === "schedule_c") {
          expectedC.set(
            allocation.location.business_reference,
            allocation.credit_amount,
          );
        } else if (allocation.location.kind === "schedule_f") {
          expectedF.set(allocation.location.farm_id, allocation.credit_amount);
        }
      }
      for (const item of source.f5884s) {
        if (
          source.controlled_group &&
          item.employer_ein !== source.controlled_group.taxpayer_member_ein
        ) continue;
        for (const record of item.wage_records) {
          if (record.deduction_location.kind === "schedule_c") {
            const id = record.deduction_location.business_reference;
            payrollC.set(
              id,
              (payrollC.get(id) ?? 0) + record.qualified_wages,
            );
          } else if (record.deduction_location.kind === "schedule_f") {
            const id = record.deduction_location.farm_id;
            payrollF.set(
              id,
              (payrollF.get(id) ?? 0) + record.qualified_wages,
            );
          }
        }
      }
      const scheduleC = context.pending.schedule_c === undefined
        ? undefined
        : scheduleCInputSchema.parse(context.pending.schedule_c);
      const scheduleF = context.pending.schedule_f === undefined
        ? undefined
        : scheduleFInputSchema.parse(context.pending.schedule_f);
      const actualC = scheduleC === undefined
        ? new Map<string, number>()
        : wotcReductionsByBusiness(scheduleC);
      const actualF = scheduleF === undefined
        ? new Map<string, number>()
        : wotcReductionsByFarm(scheduleF);
      for (
        const [expected, actual, schedule] of [
          [expectedC, actualC, "Schedule C"],
          [expectedF, actualF, "Schedule F"],
        ] as const
      ) {
        if (
          expected.size !== actual.size ||
          [...expected].some(([key, amount]) => actual.get(key) !== amount)
        ) {
          throw new Error(
            `Form 5884 line 2 does not reconcile to ${schedule} wages`,
          );
        }
      }
      for (const [id, wages] of payrollC) {
        const business = scheduleC?.schedule_cs.find((item) =>
          item.business_reference === id
        );
        if (!business || (business.line_26_wages ?? 0) < wages) {
          throw new Error(
            "Form 5884 payroll exceeds linked Schedule C gross wages",
          );
        }
      }
      for (const [id, wages] of payrollF) {
        const farm = scheduleF?.schedule_fs.find((item) => item.farm_id === id);
        if (!farm || (farm.line22_labor_hired ?? 0) < wages) {
          throw new Error(
            "Form 5884 payroll exceeds linked Schedule F gross labor hired",
          );
        }
      }
    }
    if (
      source.subject_to_passive_activity_limit ||
      (source.pass_through_credits ?? []).some((entry) =>
        entry.credit_amount > 0 && entry.subject_to_passive_activity_limit
      )
    ) {
      throw new Error(
        "Form 5884 passive credit needs Form 8582-CR before Form 3800",
      );
    }
    if (
      context?.documentIdsByPendingKey &&
      context.documentIdsByPendingKey.f3800?.length !== 1
    ) {
      throw new Error("Form 5884 source credit needs attached Form 3800");
    }
    const memberStatementIds = context?.documentIdsByPendingKey
      ?.f5884_controlled_group_statement;
    const deductionStatementIds = context?.documentIdsByPendingKey
      ?.f5884_deduction_differentiation_stmt;
    if (
      source.controlled_group && context?.documentIdsByPendingKey &&
      (memberStatementIds?.length !== 1 ||
        deductionStatementIds?.length !== 1)
    ) {
      throw new Error(
        "Form 5884 controlled group needs both linked statements",
      );
    }
    const line2Attributes = source.controlled_group &&
        memberStatementIds?.length === 1 &&
        deductionStatementIds?.length === 1
      ? {
        referenceDocumentId: `${memberStatementIds[0]} ${
          deductionStatementIds[0]
        }`,
        referenceDocumentName:
          "ControlledGroupMemberStatement DeductionDifferentiationStmt",
      }
      : undefined;
    return elements("IRS5884", [
      lines.line1aWages > 0
        ? element("WagesBetween120And399HrsAmt", lines.line1aWages)
        : "",
      lines.line1aCredit > 0
        ? element("TotWagesBetween120And399HrsAmt", lines.line1aCredit)
        : "",
      lines.line1bWages > 0
        ? element("Wages400OrMoreHoursAmt", lines.line1bWages)
        : "",
      lines.line1bCredit > 0
        ? element("Wages400OrMoreHoursCreditAmt", lines.line1bCredit)
        : "",
      lines.line1cWages > 0
        ? element("SecondYearWagesAmt", lines.line1cWages)
        : "",
      lines.line1cCredit > 0
        ? element("TotalSecondYearWagesAmt", lines.line1cCredit)
        : "",
      element("TotalWagesAmt", lines.line2, line2Attributes),
      lines.line3 > 0
        ? element("PassThruWorkOpportunityCrAmt", lines.line3)
        : "",
      element("TotalCreditsAmt", lines.line4),
    ]);
  },
};
