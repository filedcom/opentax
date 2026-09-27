import { element, elements } from "../../../mef/xml.ts";
import { CONFIG_BY_YEAR } from "../../../nodes/config/index.ts";
import {
  form4137Sources,
  inputSchema as w2InputSchema,
} from "../../../nodes/inputs/w2/index.ts";
import {
  calculateForm4137,
  inputSchema,
} from "../../../nodes/intermediate/forms/form4137/index.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

type Fields = Partial<ReturnType<typeof inputSchema.parse>>;

export const form4137: MefFormDescriptor<
  "form4137",
  Fields,
  readonly string[]
> = {
  pendingKey: "form4137",
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f4137.pdf",
  build(fields, context) {
    if (Array.isArray(fields) && fields.length === 0) return [];
    const input = inputSchema.parse(fields);
    if ((input.forms ?? []).length > 0) {
      if (!context?.pending?.w2) {
        throw new Error("Form 4137 MeF needs its filed W-2 documents");
      }
      const w2s = w2InputSchema.parse(context.pending.w2).w2s;
      const filedSources = form4137Sources(w2s).map((source) =>
        JSON.stringify(source)
      ).sort();
      const enteredSources = (input.w2_tip_sources ?? []).map((source) =>
        JSON.stringify(source)
      ).sort();
      if (JSON.stringify(filedSources) !== JSON.stringify(enteredSources)) {
        throw new Error(
          "Form 4137 W-2 tip sources disagree with filed W-2 documents",
        );
      }
    }
    const calculated = calculateForm4137(
      input,
      CONFIG_BY_YEAR[2025].ssWageBase,
    );
    if (calculated.length === 0) return [];
    const filer = context?.filer;
    if (!filer) throw new Error("Form 4137 MeF needs filer identity");
    return calculated.map((form) => {
      const spouse = form.recipient === "spouse";
      const name = spouse
        ? filer.spouse && `${filer.spouse.firstName} ${filer.spouse.lastName}`
        : filer.fullName ?? filer.nameLine1;
      const ssn = spouse ? filer.spouse?.ssn : filer.primarySSN;
      if (!name || !ssn) {
        throw new Error(`Form 4137 MeF needs ${form.recipient} name and SSN`);
      }
      return elements("IRS4137", [
        element("PersonNm", name),
        element("SSN", ssn.replace(/\D/g, "")),
        ...form.employers.map((employer) =>
          elements("UnreportedTipIncomePerEmployer", [
            elements("EmployerName", [
              element("BusinessNameLine1Txt", employer.name),
            ]),
            employer.ein
              ? element("EmployerEIN", employer.ein.replace(/\D/g, ""))
              : element("AppliedForEINReasonCd", "APPLIED FOR"),
            element("TotalTipsReceivedAmt", employer.tips_received),
            element("TotalTipsReportedAmt", employer.tips_reported),
          ])
        ),
        element("TotalTipsReceivedAmt", form.totalTipsReceived),
        element("TotalTipsReportedAmt", form.totalTipsReported),
        element("TotalTipsReceivedMinusRptAmt", form.unreportedTips),
        element("IncidentalCashAndTipsAmt", form.incidentalTips),
        element("NetUnreportedMinusIncdntlAmt", form.medicareTips),
        element("SocialSecurityWagesAndTipsAmt", form.ssWagesAndTips),
        element("NetWageSubjectToSocSecTaxAmt", form.ssWageBaseRoom),
        form.governmentEmployeeTips > 0
          ? element("GovernmentEmployeeTipAmt", form.governmentEmployeeTips, {
            governmentEmployeeTipCd: "1.45% TIPS",
          })
          : "",
        element("UnreportedTipsSubjToSocSecAmt", form.ssTips),
        element("SocialSecurityTaxTipAmt", form.ssTax),
        element("MedicareTaxTipsAmt", form.medicareTax),
        element("SocSecMedicareTaxUnrptdTipAmt", form.totalTax),
      ]);
    });
  },
};
