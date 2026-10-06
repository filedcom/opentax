import { isDeepStrictEqual } from "node:util";
import { PDFCheckBox, PDFDocument, PDFTextField } from "pdf-lib";
import type { FilerIdentity } from "../mef/header.ts";
import { roundWholeDollars } from "../whole-dollars.ts";
import {
  effectiveTaxable,
  form4852CalculationSources,
} from "../nodes/inputs/f4852/index.ts";
import { form4852RetainedPdf } from "./pdf/forms/f4852_retained.ts";
import {
  assertForm4852RetainedBytes,
  type Form4852RetainedDocument,
} from "./form4852_source.ts";

/** ERO-retained evidence, separate from transmitted binary attachments. */
export async function assertForm4852RetainedEvidence(
  pending: Readonly<Record<string, unknown>>,
  filer: FilerIdentity | undefined,
  documents: readonly Form4852RetainedDocument[],
): Promise<void> {
  if (!pending.f4852) return;
  if (!filer) {
    throw new Error("Form 4852 retained evidence requires filer identity");
  }
  const source = assertForm4852RetainedBytes(pending, filer, documents);
  const expectedDocuments = source.reviewed_source!.records.flatMap((
    record,
  ) => [
    record.source_workpaper,
    record.completed_form,
    ...(record.incorrect_original ? [record.incorrect_original] : []),
    ...(record.treatment_documents ?? []),
  ]);
  if (
    documents.length !==
      new Set(expectedDocuments.map((document) => document.document_reference))
        .size
  ) {
    throw new Error(
      "Form 4852 retained evidence must match the complete document inventory",
    );
  }
  const sources = form4852CalculationSources(source.f4852s);
  for (
    const [key, field, expected] of [["w2", "substitute_w2s", sources.w2s], [
      "f1099r",
      "substitute_f1099rs",
      sources.f1099rs,
    ]] as const
  ) {
    const actual =
      (pending[key] as Record<string, unknown> | undefined)?.[field] ?? [];
    if (!isDeepStrictEqual(actual, expected)) {
      throw new Error(
        "Form 4852 shared calculation sources differ from retained reviewed substitutes",
      );
    }
  }
  const instances = form4852RetainedPdf.instances!(source, filer);
  const bytesFor = (reference: string) =>
    documents.find((d) => d.document_reference === reference)!.bytes;
  const payrollPeriods = new Set<string>();
  for (const [index, record] of source.reviewed_source!.records.entries()) {
    const item = source.f4852s[index];
    if (
      !item.source_copy_lineage ||
      (item.form_type === "R_1099" &&
        (!item.account_number || !item.distribution_reference))
    ) {
      throw new Error(
        "Form 4852 filing needs actual source-copy and retirement account/distribution lineage",
      );
    }
    const workpaper = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(
        bytesFor(record.source_workpaper.document_reference),
      ),
    );
    if (
      !isDeepStrictEqual(
        workpaper.substitute,
        JSON.parse(JSON.stringify(item)),
      ) ||
      !isDeepStrictEqual(
        workpaper.other_current_copy_references ?? [],
        record.other_current_copy_references ?? [],
      ) ||
      !isDeepStrictEqual(
        workpaper.other_current_copy_sources ?? [],
        record.other_current_copy_sources ?? [],
      )
    ) {
      throw new Error(
        "Form 4852 workpaper parsed facts differ from reviewed substitute",
      );
    }
    if (
      item.form_type === "R_1099" && /[JT]/.test(item.distribution_code ?? "")
    ) {
      throw new Error(
        "Form 4852 nonqualified Roth IRA needs supported Form8606 PartIII ordering and five-year source evidence before filing",
      );
    }
    const qcd = item.retirement_source?.qcd_full
      ? item.gross_distribution!
      : item.retirement_source?.qcd_partial_amount ?? 0;
    if (qcd > 0) {
      const transfer = item.qcd_transfer_review;
      const general = pending.general as Record<string, unknown> | undefined;
      const dob = general
        ?.[item.subject_ts === "S" ? "spouse_dob" : "taxpayer_dob"];
      const eligibleOn = transfer
        ? new Date(`${transfer.date_of_birth}T00:00:00Z`)
        : undefined;
      if (eligibleOn) {
        eligibleOn.setUTCFullYear(eligibleOn.getUTCFullYear() + 70);
        eligibleOn.setUTCMonth(eligibleOn.getUTCMonth() + 6);
      }
      if (
        !transfer ||
        transfer.owner_ssn !== item.recipient_ssn?.replace(/\D/g, "") ||
        dob !== transfer.date_of_birth || transfer.amount !== qcd ||
        !transfer.transferred_on.startsWith("2025-") ||
        new Date(`${transfer.transferred_on}T00:00:00Z`) < eligibleOn!
      ) {
        throw new Error(
          "Form 4852 QCD requires actual owned, age-eligible direct charity transfer source",
        );
      }
    } else if (item.qcd_transfer_review) {
      throw new Error(
        "Form 4852 QCD transfer source has no matching distribution exclusion",
      );
    }
    const requiredTreatmentRecords: {
      reference: string;
      facts: unknown;
      prior8606?: true;
    }[] = [];
    const amounts = [
      "wages",
      "federal_withheld",
      "social_security_wages",
      "social_security_withheld",
      "social_security_tips",
      "medicare_wages",
      "medicare_withheld",
      "state_tax_withheld",
      "local_tax_withheld",
    ] as const;
    if (item.form_type === "W2") {
      if (!item.payroll_allocations?.length || item.distribution_source) {
        throw new Error(
          "Form 4852 W2 needs its actual retained payroll-account/period allocation inventory",
        );
      }
      for (const payroll of item.payroll_allocations) {
        const identity = JSON.stringify([
          payroll.payer_tin,
          payroll.owner_ssn,
          payroll.payroll_account_reference,
          payroll.period_identifier,
        ]);
        if (
          payrollPeriods.has(identity) ||
          payroll.payer_tin !== item.payer_tin?.replace(/\D/g, "") ||
          payroll.owner_ssn !== item.recipient_ssn?.replace(/\D/g, "") ||
          !payroll.paid_on.startsWith("2025-")
        ) {
          throw new Error(
            "Form 4852 payroll period is repeated or differs from actual owner/employer/year",
          );
        }
        if (
          (payroll.state_tax_withheld > 0 &&
            payroll.state_name !== item.state_name) ||
          (payroll.local_tax_withheld > 0 &&
            payroll.locality_name !== item.locality_name)
        ) {
          throw new Error(
            "Form4852 actual payroll tax jurisdiction differs from completed boxes",
          );
        }
        payrollPeriods.add(identity);
        requiredTreatmentRecords.push({
          reference: payroll.source_document_reference,
          facts: payroll,
        });
      }
      for (const key of amounts) {
        const sum = item.payroll_allocations.reduce(
          (total, row) => total + row[key],
          0,
        );
        if (Math.abs(sum - (item[key] ?? 0)) > .0000001) {
          throw new Error(
            "Form 4852 payroll source allocation differs from completed boxes",
          );
        }
      }
    } else {
      const distribution = item.distribution_source;
      if (
        !distribution || item.payroll_allocations ||
        distribution.payer_tin !== item.payer_tin?.replace(/\D/g, "") ||
        distribution.owner_ssn !== item.recipient_ssn?.replace(/\D/g, "") ||
        distribution.account_number !== item.account_number ||
        distribution.distribution_reference !== item.distribution_reference ||
        !distribution.paid_on.startsWith("2025-")
      ) {
        throw new Error(
          "Form 4852 retirement needs its actual owned custodian/account/distribution source",
        );
      }
      for (
        const key of [
          "gross_distribution",
          "taxable_amount",
          "employee_contributions",
          "capital_gain",
          "federal_withheld",
          "state_tax_withheld",
          "local_tax_withheld",
          "distribution_code",
          "is_ira",
        ] as const
      ) {
        const amount = key === "taxable_amount"
          ? effectiveTaxable(item)
          : item[key] ??
            (key === "is_ira" ? false : key === "distribution_code" ? "" : 0);
        if (distribution[key] !== amount) {
          throw new Error(
            "Form 4852 custodian distribution source differs from completed boxes/type",
          );
        }
      }
      if (
        (distribution.state_tax_withheld > 0 &&
          distribution.state_name !== item.state_name) ||
        (distribution.local_tax_withheld > 0 &&
          distribution.locality_name !== item.locality_name)
      ) {
        throw new Error(
          "Form4852 actual custodian tax jurisdiction differs from completed boxes",
        );
      }
      requiredTreatmentRecords.push({
        reference: distribution.source_document_reference,
        facts: distribution,
      });
    }
    for (const lineage of record.other_current_copy_sources ?? []) {
      if (lineage.distribution_source) {
        requiredTreatmentRecords.push({
          reference: lineage.distribution_source.source_document_reference,
          facts: lineage.distribution_source,
        });
      }
      for (const payroll of lineage.payroll_allocations ?? []) {
        requiredTreatmentRecords.push({
          reference: payroll.source_document_reference,
          facts: payroll,
        });
      }
    }
    const basisEvidence = item.retirement_source
      ?.form8606_distribution_evidence;
    if (basisEvidence) {
      requiredTreatmentRecords.push({
        reference: basisEvidence.prior_form8606.source_document_reference,
        facts: basisEvidence.prior_form8606,
        prior8606: true,
      }, {
        reference: basisEvidence.year_end_statement.source_document_reference,
        facts: basisEvidence.year_end_statement,
      });
    }
    const plan = item.retirement_source?.form4972_plan;
    if (plan) {
      requiredTreatmentRecords.push({
        reference: plan.plan_reference,
        facts: plan,
      }, { reference: plan.full_balance_statement_reference, facts: plan });
    }
    if (item.qcd_transfer_review) {
      requiredTreatmentRecords.push({
        reference: item.qcd_transfer_review.source_document_reference,
        facts: item.qcd_transfer_review,
      });
    }
    if (
      (record.treatment_documents ?? []).length !==
        requiredTreatmentRecords.length
    ) {
      throw new Error(
        "Form 4852 treatment evidence must retain its complete source-document inventory",
      );
    }
    for (const treatment of requiredTreatmentRecords) {
      if (
        !(record.treatment_documents ?? []).some((d) =>
          d.document_reference === treatment.reference
        )
      ) {
        throw new Error(
          "Form 4852 retirement treatment needs actual retained source bytes",
        );
      }
      const bytes = bytesFor(treatment.reference);
      if (treatment.prior8606) {
        const prior = treatment.facts as NonNullable<
          typeof basisEvidence
        >["prior_form8606"];
        const form = (await PDFDocument.load(bytes)).getForm();
        if (
          form.getTextField("topmostSubform[0].Page1[0].f1_2[0]").getText()
              ?.replace(/\D/g, "") !== prior.owner_ssn ||
          Number(
              form.getTextField("topmostSubform[0].Page1[0].f1_23[0]").getText()
                ?.replaceAll(",", ""),
            ) !== prior.filed_line14_basis
        ) {
          throw new Error(
            "Form 4852 prior filed Form8606 parsed owner/basis differs from actual retained source",
          );
        }
      } else if (
        !isDeepStrictEqual(
          JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)),
          JSON.parse(JSON.stringify(treatment.facts)),
        )
      ) {
        throw new Error(
          "Form 4852 retirement treatment parsed source facts differ from review",
        );
      }
    }
    const completed = await PDFDocument.load(
      bytesFor(record.completed_form.document_reference),
    );
    if (completed.getPageCount() !== 2) {
      throw new Error(
        "Retained completed Form 4852 must include the official form and instructions pages",
      );
    }
    const form = completed.getForm();
    for (const entry of form4852RetainedPdf.fields) {
      const expected = instances[index][entry.domainKey];
      if (entry.kind === "text") {
        const field = form.getField(entry.pdfField);
        if (!(field instanceof PDFTextField)) {
          throw new Error(
            "Retained Form 4852 has a missing official text field",
          );
        }
        const actual = field.getText() ?? "";
        const wanted = typeof expected === "number"
          ? (expected === 0 ? "" : String(roundWholeDollars(expected)))
          : String(expected ?? "");
        if (
          actual.replaceAll(",", "").trim() !==
            wanted.replaceAll(",", "").trim()
        ) {
          throw new Error(
            `Retained completed Form 4852 field differs: ${entry.domainKey}`,
          );
        }
      } else {
        const field = form.getField(entry.pdfField);
        if (!(field instanceof PDFCheckBox)) {
          throw new Error("Retained Form 4852 has a missing official checkbox");
        }
        const wanted = entry.kind === "checkboxWhen"
          ? expected === entry.whenValue
          : expected === true;
        if (field.isChecked() !== wanted) {
          throw new Error(
            `Retained completed Form 4852 checkbox differs: ${entry.domainKey}`,
          );
        }
      }
    }
    if (record.incorrect_original) {
      const original = await PDFDocument.load(
        bytesFor(record.incorrect_original.document_reference),
      );
      const fields = original.getForm().getFields();
      const actualFields = Object.fromEntries(fields.flatMap((field) => {
        const value = field instanceof PDFTextField
          ? field.getText()
          : field instanceof PDFCheckBox
          ? field.isChecked()
          : undefined;
        return value === undefined || value === "" || value === false
          ? []
          : [[field.getName(), value]];
      }));
      if (!isDeepStrictEqual(actualFields, workpaper.original_pdf_fields)) {
        throw new Error(
          "Form 4852 incorrect original parsed fields differ from workpaper provenance",
        );
      }
      const find = (suffix: string) => {
        const matches = Object.entries(actualFields).filter(([key]) =>
          key.endsWith(suffix)
        );
        if (matches.length !== 1 || typeof matches[0][1] !== "string") {
          throw new Error(
            "Form 4852 incorrect original needs the official recipient copy identity",
          );
        }
        return (matches[0][1] as string).replace(/\D/g, "");
      };
      const w2 = item.form_type === "W2";
      const tin = find(
        w2
          ? "CopyB_Top[0].Col_Left[0].f2_02[0]"
          : "CopyB[0].LeftCol[0].PayersTIN[0].f2_9[0]",
      );
      const ssn = find(
        w2
          ? "CopyB_Top[0].BoxA_ReadOrder[0].f2_01[0]"
          : "CopyB[0].LeftCol[0].f2_10[0]",
      );
      if (
        tin !== item.payer_tin?.replace(/\D/g, "") ||
        ssn !== item.recipient_ssn?.replace(/\D/g, "")
      ) {
        throw new Error(
          "Form 4852 incorrect original owner/payer differs from replacement",
        );
      }
    } else if (workpaper.original_pdf_fields !== undefined) {
      throw new Error(
        "Missing Form 4852 cannot claim an incorrect-original provenance record",
      );
    }
  }
}
