import { element, elements } from "../../../mef/xml.ts";
import { CONFIG_BY_YEAR } from "../../../nodes/config/index.ts";
import {
  calculateForm8919,
  inputSchema,
} from "../../../nodes/intermediate/forms/form8919/index.ts";
import {
  inputSchema as necInputSchema,
} from "../../../nodes/inputs/f1099nec/index.ts";
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
          recipient_ssn: item.recipient_ssn,
          payer_tin: item.payer_tin,
          amount: item.box1_nec,
        }))
      : [];
    if (
      JSON.stringify(necSources) !== JSON.stringify(input.nec_sources ?? [])
    ) {
      throw new Error(
        "Form 8919 routed 1099-NEC sources disagree with filed forms",
      );
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
