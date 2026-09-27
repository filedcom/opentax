import { element, elements } from "../../../mef/xml.ts";
import { CONFIG_BY_YEAR } from "../../../nodes/config/index.ts";
import {
  form8919W2Sources,
  inputSchema as w2InputSchema,
} from "../../../nodes/inputs/w2/index.ts";
import {
  calculateForm4137,
  inputSchema as form4137InputSchema,
} from "../../../nodes/intermediate/forms/form4137/index.ts";
import {
  calculateForm8919,
  inputSchema,
} from "../../../nodes/intermediate/forms/form8919/index.ts";
import {
  inputSchema as necInputSchema,
} from "../../../nodes/inputs/f1099nec/index.ts";
import {
  inputSchema as miscInputSchema,
} from "../../../nodes/inputs/f1099m/index.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

type Fields = Partial<ReturnType<typeof inputSchema.parse>>;
const digits = (value: string) => value.replace(/\D/g, "");

export const form8919: MefFormDescriptor<
  "form8919",
  Fields,
  readonly string[]
> = {
  pendingKey: "form8919",
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8919--2025.pdf",
  build(fields, context) {
    if (Array.isArray(fields) && fields.length === 0) return [];
    const input = inputSchema.parse(fields);
    const necSources = context?.pending?.f1099nec
      ? necInputSchema.parse(context.pending.f1099nec).f1099necs
        .filter((item) =>
          item.for_routing === "form_8919" &&
          (item.box1_nec ?? 0) > 0
        )
        .map((item) => ({
          kind: "1099nec" as const,
          recipient_ssn: item.recipient_ssn,
          payer_name: item.payer_name.trim(),
          payer_tin: item.payer_tin,
          amount: item.box1_nec,
        }))
      : [];
    const miscSources = context?.pending?.f1099m
      ? miscInputSchema.parse(context.pending.f1099m).f1099ms
        .filter((item) =>
          item.box3_other_income_routing === "form_8919" &&
          (item.box3_other_income ?? 0) > 0
        )
        .map((item) => ({
          kind: "1099misc" as const,
          recipient_ssn: item.recipient_tin,
          payer_name: item.payer_name.trim(),
          payer_tin: item.payer_tin,
          amount: item.box3_other_income,
        }))
      : [];
    const sourceKeys = [...necSources, ...miscSources].map((source) =>
      JSON.stringify(source)
    ).sort();
    const inputSourceKeys = (input.form1099_sources ?? []).map((source) =>
      JSON.stringify(source)
    ).sort();
    if (
      JSON.stringify(sourceKeys) !== JSON.stringify(inputSourceKeys)
    ) {
      throw new Error(
        "Form 8919 routed 1099-MISC/NEC sources disagree with filed forms",
      );
    }
    if ((input.forms ?? []).length > 0) {
      const w2Sources = context?.pending?.w2
        ? form8919W2Sources(
          w2InputSchema.parse(context.pending.w2).w2s,
        )
        : [];
      if (
        JSON.stringify(w2Sources) !== JSON.stringify(input.w2_sources ?? [])
      ) {
        throw new Error(
          "Form 8919 line 8 W-2 sources disagree with filed W-2 documents",
        );
      }
      const form4137Sources = context?.pending?.form4137
        ? calculateForm4137(
          form4137InputSchema.parse(context.pending.form4137),
          CONFIG_BY_YEAR[2025].ssWageBase,
        ).map((form) => ({
          recipient: form.recipient,
          line10_ss_tips: form.ssTips,
        }))
        : [];
      if (
        JSON.stringify(form4137Sources) !==
          JSON.stringify(input.form4137_sources ?? [])
      ) {
        throw new Error(
          "Form 8919 line 8 Form 4137 sources disagree with filed forms",
        );
      }
    }
    const calculated = calculateForm8919(
      input,
      CONFIG_BY_YEAR[2025].ssWageBase,
    );
    if (calculated.length === 0) return [];
    const filer = context?.filer;
    if (!filer) throw new Error("Form 8919 MeF needs filer identity");
    return calculated.map((form) => {
      const spouse = form.recipient === "spouse";
      const name = spouse
        ? filer.spouse && `${filer.spouse.firstName} ${filer.spouse.lastName}`
        : filer.fullName ?? filer.nameLine1;
      const ssn = spouse ? filer.spouse?.ssn : filer.primarySSN;
      const inputSsn = spouse ? input.spouse_ssn : input.taxpayer_ssn;
      if (!name || !ssn || !inputSsn || digits(ssn) !== digits(inputSsn)) {
        throw new Error(
          `Form 8919 ${form.recipient} identity disagrees with return header`,
        );
      }
      return elements("IRS8919", [
        element("PersonNm", name),
        element("SSN", digits(ssn)),
        ...form.employers.map((employer) =>
          elements("UncollectedSocSecMedTaxPerFirm", [
            elements("EmployerName", [
              element("BusinessNameLine1Txt", employer.name),
            ]),
            employer.tin
              ? element(
                employer.tin_type === "ssn" ? "SSN" : "EmployerEIN",
                digits(employer.tin),
              )
              : element("UnknownTINCd", "UNKNOWN"),
            element("UncollectedSocSecMedReasonCd", employer.reason_code),
            employer.correspondence_received_date
              ? element(
                "CorrespondenceReceivedDt",
                employer.correspondence_received_date,
              )
              : "",
            employer.form1099_received
              ? element("Form1099ReceivedInd", "X")
              : "",
            element("WagesWithNoWitholdingAmt", employer.wages),
          ])
        ),
        element("TotalWagesWithNoWithholdingAmt", form.line6),
        element("TotalWagesAndUnreportedTipsAmt", form.line8),
        element("NetWagesSubjectToSocSecTaxAmt", form.line9),
        element("WagesSubjectToSSTAmt", form.line10),
        element("UncollectedSocSecTaxAmt", form.line11),
        element("UncollectedMedicareTaxAmt", form.line12),
        element("UncollectedSocSecMedTaxAmt", form.line13),
      ]);
    });
  },
};
