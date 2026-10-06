import { qualifiedRothDocuments } from "../nodes/inputs/f4852/qualified-roth.ts";
import {
  iraRecharacterizationDocuments,
  reviewedIraRecharacterization,
} from "../nodes/intermediate/forms/form8606/recharacterization.ts";
import { form4852IraMarginLabel } from "../nodes/inputs/f4852/retirement-account.ts";
import { assertForm4852IraMargin } from "./form4852_ira_margin.ts";
import {
  reviewedRothOwnerInventory,
  rothOwnerInventoryDocuments,
} from "../nodes/intermediate/forms/form8606/roth-inventory.ts";
import { assertRothHistoryPdf } from "./form8606_roth_history_evidence.ts";
import type { RothDistributionYear } from "../nodes/intermediate/forms/form8606/roth-history.ts";
import {
  reviewedRothActivity,
  rothActivityDocuments,
} from "../nodes/intermediate/forms/form8606/roth-activity.ts";
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
      item.form_type === "R_1099" &&
      /[JT]/.test(item.distribution_code ?? "") &&
      !item.retirement_source?.roth_activity_review &&
      !item.retirement_source?.roth_owner_inventory_review
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
      priorRothConversion?: true;
      priorRothDistribution?: "8606" | "5329";
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
          ? item.taxable_amount_not_determined
            ? undefined
            : effectiveTaxable(item)
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
      if (
        (distribution.taxable_amount_not_determined ?? false) !==
          (item.taxable_amount_not_determined ?? false)
      ) {
        throw new Error(
          "Form4852 custodian unknown taxable checkbox differs from completed source",
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
    if (item.retirement_source?.roth_owner_inventory_review) {
      const facts = reviewedRothOwnerInventory(
        item.retirement_source.roth_owner_inventory_review,
      );
      const payment = facts.review.payments.find((row) =>
        row.form1099r_source_document_reference ===
          item.completed_form_review_reference
      );
      if (
        !payment || facts.review.owner !== item.subject_ts ||
        payment.owner_ssn !== item.recipient_ssn?.replace(/\D/g, "") ||
        payment.custodian_ein !== item.payer_tin?.replace(/\D/g, "") ||
        payment.account_number !== item.account_number ||
        payment.distribution_reference !== item.distribution_reference ||
        payment.distributed_on !== item.distribution_source?.paid_on ||
        payment.gross_distribution !== item.gross_distribution ||
        payment.distribution_code !== item.distribution_code
      ) {
        throw new Error(
          "Form4852 complete Roth inventory payment/account/owner differs from actual completed source",
        );
      }
      if (facts.review.current_conversion) {
        requiredTreatmentRecords.push({
          reference: facts.review.current_conversion.prior_form8606
            .source_document_reference,
          facts: facts.review.current_conversion.prior_form8606,
          prior8606: true,
        });
      }
      for (const year of facts.review.conversions ?? []) {
        requiredTreatmentRecords.push({
          reference: year.prior_form8606.source_document_reference,
          facts: year.prior_form8606,
          priorRothConversion: true,
        });
      }
      for (const year of facts.review.prior_distributions ?? []) {
        requiredTreatmentRecords.push({
          reference: year.prior_form8606.source_document_reference,
          facts: year.prior_form8606,
          priorRothDistribution: "8606",
        });
        if (year.prior_form5329) {
          requiredTreatmentRecords.push({
            reference: year.prior_form5329.source_document_reference,
            facts: year.prior_form5329,
            priorRothDistribution: "5329",
          });
        }
      }
      for (const documentFacts of rothOwnerInventoryDocuments(facts.review)) {
        requiredTreatmentRecords.push({
          reference: documentFacts.source_document_reference,
          facts: documentFacts,
        });
      }
    }
    if (item.retirement_source?.roth_activity_review) {
      const facts = reviewedRothActivity(
        item.retirement_source.roth_activity_review,
      );
      const payment = facts.review.payment;
      const general = pending.general as Record<string, unknown> | undefined;
      if (
        facts.review.owner_identity.date_of_birth !==
          general?.[item.subject_ts === "S" ? "spouse_dob" : "taxpayer_dob"] ||
        payment.owner_ssn !== item.recipient_ssn?.replace(/\D/g, "") ||
        payment.custodian_ein !== item.payer_tin?.replace(/\D/g, "") ||
        payment.account_number !== item.account_number ||
        payment.distribution_reference !== item.distribution_reference ||
        payment.distributed_on !== item.distribution_source?.paid_on ||
        payment.gross_distribution !== item.gross_distribution ||
        payment.distribution_code !== item.distribution_code ||
        facts.review.form1099r_source_document_reference !==
          item.completed_form_review_reference
      ) {
        throw new Error(
          "Form4852 actual Roth owner/account/payment records differ from completed copy and return birth facts",
        );
      }
      for (const documentFacts of rothActivityDocuments(facts.review)) {
        requiredTreatmentRecords.push({
          reference: documentFacts.source_document_reference,
          facts: documentFacts,
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
    if (item.retirement_source?.ira_recharacterization_review) {
      for (
        const facts of iraRecharacterizationDocuments(
          item.retirement_source.ira_recharacterization_review,
        )
      ) {
        requiredTreatmentRecords.push({
          reference: facts.source_document_reference,
          facts,
        });
      }
    }
    if (item.qualified_roth_review) {
      for (const facts of qualifiedRothDocuments(item.qualified_roth_review)) {
        requiredTreatmentRecords.push({
          reference: facts.source_document_reference,
          facts,
        });
      }
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
    const sharedAnnual8606s = requiredTreatmentRecords.filter((t) =>
      t.priorRothConversion || t.priorRothDistribution === "8606" || t.prior8606
    ).map((t) => t.reference);
    const repeatedAnnuals = sharedAnnual8606s.length -
      new Set(sharedAnnual8606s).size;
    if (
      (record.treatment_documents ?? []).length !==
        requiredTreatmentRecords.length - repeatedAnnuals
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
      if (treatment.priorRothDistribution) {
        await assertRothHistoryPdf(
          treatment.facts as
            | RothDistributionYear["prior_form8606"]
            | NonNullable<RothDistributionYear["prior_form5329"]>,
          bytes,
          treatment.priorRothDistribution,
        );
      } else if (treatment.priorRothConversion) {
        const prior = treatment.facts as {
          tax_year: number;
          owner_ssn: string;
          owner_name: string;
          filed_line16_converted: number;
          filed_line17_nontaxable: number;
          filed_line18_taxable: number;
        };
        // These actual prior IRS layouts were inspected against their printed Part II.
        // Earlier revisions require a verified year-specific source parser before filing.
        if (prior.tax_year < 2020 || prior.tax_year > 2024) {
          throw new Error(
            "Roth prior conversion8606 PDF layout needs year-specific retained-source review",
          );
        }
        const pdf = await PDFDocument.load(bytes), form = pdf.getForm();
        if (
          pdf.getTitle() !== `${prior.tax_year} Form 8606` ||
          pdf.getPageCount() !== 2 ||
          form.getTextField("topmostSubform[0].Page1[0].f1_1[0]").getText()
              ?.trim() !== prior.owner_name ||
          form.getTextField("topmostSubform[0].Page1[0].f1_2[0]").getText()
              ?.replace(/\D/g, "") !== prior.owner_ssn ||
          [
            prior.filed_line16_converted,
            prior.filed_line17_nontaxable,
            prior.filed_line18_taxable,
          ].some((amount, index) =>
            Number(
              form.getTextField(
                `topmostSubform[0].Page2[0].f2_${index + 1}[0]`,
              ).getText()?.replaceAll(",", ""),
            ) !== amount
          )
        ) {
          throw new Error(
            "Roth prior filed conversion8606 actual PDF year/owner/PartII facts differ",
          );
        }
      } else if (treatment.prior8606) {
        const prior = treatment.facts as {
          tax_year: number;
          owner_ssn: string;
          owner_name?: string;
          filed_line14_basis: number;
          filed_part_i?: Record<string, number | string>;
        };
        const pdf = await PDFDocument.load(bytes), form = pdf.getForm();
        if (
          prior.owner_name &&
          (pdf.getTitle() !== "2024 Form 8606" || pdf.getPageCount() !== 2 ||
            form.getTextField("topmostSubform[0].Page1[0].f1_1[0]").getText()
                ?.trim() !== prior.owner_name)
        ) {
          throw new Error(
            "Current conversion prior filed8606 actual year/owner differs",
          );
        }
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
        if (prior.filed_part_i) {
          const fields: Record<string, string> = {
            line1: "f1_9",
            line2: "f1_10",
            line3: "f1_11",
            line4: "f1_12",
            line5: "f1_13",
            line6: "f1_14",
            line7: "f1_15",
            line8: "f1_16",
            line9: "f1_17",
            line11: "f1_20",
            line12: "f1_21",
            line13: "f1_22",
          };
          for (const [line, field] of Object.entries(fields)) {
            const text =
              form.getTextField(`topmostSubform[0].Page1[0].${field}[0]`)
                .getText()?.trim() ?? "";
            const actual = text === ""
              ? undefined
              : Number(text.replaceAll(",", ""));
            if (actual !== prior.filed_part_i[line]) {
              throw new Error(
                "Current conversion prior filed8606 parsed PartI operands differ",
              );
            }
          }
          const integral =
            form.getTextField("topmostSubform[0].Page1[0].f1_18[0]").getText()
              ?.trim() ?? "";
          const fractional =
            form.getTextField("topmostSubform[0].Page1[0].f1_19[0]").getText()
              ?.trim() ?? "";
          const ratio = integral === "" && fractional === ""
            ? undefined
            : Number(`${integral}.${fractional}`);
          if (ratio !== prior.filed_part_i.line10) {
            throw new Error(
              "Current conversion prior filed8606 parsed PartI ratio differs",
            );
          }
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
    if (item.retirement_source?.ira_recharacterization_review) {
      if (
        item.distribution_source?.paid_on !==
          item.retirement_source.ira_recharacterization_review.transfer
            .transferred_on ||
        item.distribution_source.account_type !==
          item.retirement_source.ira_recharacterization_review
            .original_contribution.account_type
      ) {
        throw new Error(
          "IRA recharacterization custodian account type/date differs from actual completed payment source",
        );
      }
      const r = reviewedIraRecharacterization({
        ...item.retirement_source,
        recipient_ssn: item.recipient_ssn,
        account_number: item.account_number,
        source_document_reference: item.completed_form_review_reference,
      });
      for (const facts of iraRecharacterizationDocuments(r)) {
        if (
          !isDeepStrictEqual(
            JSON.parse(
              new TextDecoder().decode(
                bytesFor(facts.source_document_reference),
              ),
            ),
            JSON.parse(JSON.stringify(facts)),
          )
        ) {
          throw new Error(
            "IRA recharacterization retained parsed source facts differ from actual annual records",
          );
        }
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
    assertForm4852IraMargin(
      completed,
      item.form_type === "R_1099" ? form4852IraMarginLabel(item) : undefined,
    );
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
