import {
  effectiveTaxable,
  FormType,
  itemSchema,
} from "../../../nodes/inputs/f4852/index.ts";
import { type FilerIdentity, FilingStatus } from "../../../mef/header.ts";
import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";

// Taxpayer/ERO packet copy. Final rendering separately verifies the completed
// official source PDF and retained workpaper bytes before producing this copy.
const page = "topmostSubform[0].Page1[0]";
const field = (
  domainKey: string,
  pdfField: string,
): Extract<PdfFieldEntry, { kind: "text" }> => ({
  kind: "text",
  domainKey,
  pdfField: `${page}.${pdfField}`,
});
const line7Left = `${page}.Line7Lft[0]`;
const line7Right = `${page}.Line7Rght[0]`;
const line8Left = `${page}.Line8Lft[0]`;
const line8Right = `${page}.Line8Rght[0]`;
const amount = (domainKey: string, path: string): PdfFieldEntry => ({
  kind: "text",
  domainKey,
  pdfField: path,
});

export const form4852RetainedPdf: PdfFormDescriptor = {
  pendingKey: "f4852",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f4852.pdf",
  pageIndices: () => [0],
  fields: [
    field("return_names", "f1_1[0]"),
    field("recipient_ssn", "f1_2[0]"),
    field("return_address", "f1_3[0]"),
    field("form_year", "f1_4[0]"),
    {
      kind: "checkboxWhen",
      domainKey: "form_type",
      pdfField: `${page}.c1_1[0]`,
      whenValue: FormType.W2,
    },
    {
      kind: "checkboxWhen",
      domainKey: "form_type",
      pdfField: `${page}.c1_1[1]`,
      whenValue: FormType.R_1099,
    },
    { ...field("payer_name_address", "f1_5[0]"), fontSize: 7 },
    field("payer_tin", "f1_6[0]"),
    amount("wages", `${line7Left}.f1_7[0]`),
    amount("social_security_wages", `${line7Left}.f1_8[0]`),
    amount("medicare_wages", `${line7Left}.f1_9[0]`),
    amount("social_security_tips", `${line7Left}.f1_10[0]`),
    amount("w2_federal_withheld", `${line7Left}.f1_11[0]`),
    amount("w2_state_tax_withheld", `${line7Right}.f1_12[0]`),
    amount("w2_state_name", `${line7Right}.f1_13[0]`),
    amount("w2_local_tax_withheld", `${line7Right}.f1_14[0]`),
    amount("w2_locality_name", `${line7Right}.f1_15[0]`),
    amount("social_security_withheld", `${line7Right}.f1_16[0]`),
    amount("medicare_withheld", `${line7Right}.f1_17[0]`),
    amount("gross_distribution", `${line8Left}.f1_18[0]`),
    amount("taxable_amount", `${line8Left}.f1_19[0]`),
    {
      kind: "checkbox",
      domainKey: "taxable_amount_not_determined",
      pdfField: `${line8Left}.c1_2[0]`,
    },
    {
      kind: "checkbox",
      domainKey: "total_distribution",
      pdfField: `${line8Left}.c1_3[0]`,
    },
    amount("capital_gain", `${line8Left}.f1_20[0]`),
    amount("r1099_federal_withheld", `${line8Right}.f1_21[0]`),
    amount("r1099_state_tax_withheld", `${line8Right}.f1_22[0]`),
    amount("r1099_state_name", `${line8Right}.f1_23[0]`),
    amount("r1099_local_tax_withheld", `${line8Right}.f1_24[0]`),
    amount("r1099_locality_name", `${line8Right}.f1_25[0]`),
    amount("employee_contributions", `${line8Right}.f1_26[0]`),
    amount("distribution_code", `${line8Right}.f1_27[0]`),
    field("amount_determination_explanation", "f1_29[0]"),
    field("payer_form_efforts_explanation", "f1_30[0]"),
  ],
  instances(raw, filer) {
    if (!Array.isArray(raw.f4852s)) return [];
    if (!filer) throw new Error("Form 4852 retained PDF needs filed identity");
    if (filer.address.foreignCountry) {
      throw new Error("Form 4852 retained PDF needs a reviewed return address");
    }
    const returnNames = [
      [filer.firstName, filer.middleInitial, filer.lastName].filter(Boolean)
        .join(" "),
      filer.filingStatus === FilingStatus.MarriedFilingJointly
        ? [
          filer.spouse?.firstName,
          filer.spouse?.middleInitial,
          filer.spouse?.lastName,
        ].filter(Boolean).join(" ")
        : "",
    ].filter(Boolean).join(" & ");
    if (!filer.firstName || !filer.lastName || !returnNames) {
      throw new Error("Form 4852 retained PDF needs return names");
    }
    const returnAddress = [
      filer.address.line1,
      filer.address.line2,
      [filer.address.city, filer.address.state, filer.address.zip].filter(
        Boolean,
      ).join(" "),
    ].filter(Boolean).join(", ");
    if (
      !filer.address.line1 || !filer.address.city || !filer.address.state ||
      !filer.address.zip
    ) {
      throw new Error("Form 4852 retained PDF needs a complete return address");
    }
    return raw.f4852s.map((entry) => {
      const item = itemSchema.parse(entry);
      const required = [
        item.subject_ts,
        item.missing_or_incorrect,
        item.payer_address_line1,
        item.payer_address_city,
        item.payer_address_state,
        item.payer_address_zip,
        item.amount_determination_explanation,
        item.payer_form_efforts_explanation,
        item.source_workpaper_reference,
        item.completed_form_review_reference,
      ];
      if (required.some((value) => !value)) {
        throw new Error(
          "Form 4852 retained PDF needs owner, payer address, explanation, and reviewed workpaper/form references",
        );
      }
      if (item.form_type === FormType.R_1099 && !item.distribution_code) {
        throw new Error(
          "Form 4852 retained 1099-R PDF needs a distribution code",
        );
      }
      const recipientSsn = item.subject_ts === "S"
        ? filer.filingStatus === FilingStatus.MarriedFilingJointly
          ? filer.spouse?.ssn
          : undefined
        : filer.primarySSN;
      if (
        !recipientSsn ||
        (item.recipient_ssn &&
          item.recipient_ssn.replaceAll("-", "") !== recipientSsn)
      ) {
        throw new Error(
          "Form 4852 retained PDF recipient must match the filed owner",
        );
      }
      const payerNameAddress = [
        item.payer_name,
        item.payer_address_line1,
        `${item.payer_address_city}, ${item.payer_address_state} ${item.payer_address_zip}`,
      ].join("\n");
      const shared = {
        return_names: returnNames,
        recipient_ssn: recipientSsn,
        return_address: returnAddress,
        form_year: "2025",
        form_type: item.form_type,
        payer_name_address: payerNameAddress,
        payer_tin: item.payer_tin,
        amount_determination_explanation: item.amount_determination_explanation,
        payer_form_efforts_explanation: item.payer_form_efforts_explanation,
      };
      return item.form_type === FormType.W2
        ? {
          ...shared,
          wages: item.wages,
          social_security_wages: item.social_security_wages,
          medicare_wages: item.medicare_wages,
          social_security_tips: item.social_security_tips,
          w2_federal_withheld: item.federal_withheld,
          w2_state_tax_withheld: item.state_tax_withheld,
          w2_state_name: item.state_name,
          w2_local_tax_withheld: item.local_tax_withheld,
          w2_locality_name: item.locality_name,
          social_security_withheld: item.social_security_withheld,
          medicare_withheld: item.medicare_withheld,
        }
        : {
          ...shared,
          gross_distribution: item.gross_distribution,
          taxable_amount: item.taxable_amount_not_determined
            ? undefined
            : effectiveTaxable(item),
          taxable_amount_not_determined: item.taxable_amount_not_determined,
          total_distribution: item.total_distribution,
          capital_gain: item.capital_gain,
          r1099_federal_withheld: item.federal_withheld,
          r1099_state_tax_withheld: item.state_tax_withheld,
          r1099_state_name: item.state_name,
          r1099_local_tax_withheld: item.local_tax_withheld,
          r1099_locality_name: item.locality_name,
          employee_contributions: item.employee_contributions,
          distribution_code: item.distribution_code,
        };
    });
  },
};
