import { qualifiedRothDocuments } from "../../../../../nodes/inputs/income/wages/f4852/qualified-roth.ts";
import { iraRecharacterizationDocuments } from "../../../../../nodes/intermediate/forms/income/retirement/form8606/recharacterization.ts";
import { addForm4852IraMargin } from "./form4852_ira_margin.ts";
import { PDFCheckBox, PDFDocument, PDFTextField, StandardFonts } from "pdf-lib";
import { createHash } from "node:crypto";
import {
  effectiveTaxable,
  FormType,
  itemSchema,
} from "../../../../../nodes/inputs/income/wages/f4852/index.ts";
import { type FilerIdentity, FilingStatus } from "../../../../../mef/header.ts";
import { form4852RetainedPdf } from "../../../../pdf/forms/income/wages/f4852_retained.ts";
import { roundWholeDollars } from "../../../../../whole-dollars.ts";
import type { Form4852RetainedDocument } from "./form4852_source.ts";

export const form4852Filer: FilerIdentity = {
  primarySSN: "111223333",
  firstName: "Alex",
  lastName: "Example",
  firstNameWithInitial: "Alex",
  fullName: "Alex Example",
  nameLine1: "ALEX EXAMPLE",
  nameControl: "EXAM",
  address: {
    line1: "1 Example Way",
    city: "Sacramento",
    state: "CA",
    zip: "95814",
  },
  filingStatus: FilingStatus.Single,
};
export function form4852BaseInputs(joint = false) {
  return {
    general: {
      filing_status: joint ? "mfj" : "single",
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Example",
      taxpayer_ssn: "111-22-3333",
      taxpayer_dob: "1985-06-15",
      address_line1: "1 Example Way",
      address_city: "Sacramento",
      address_state: "CA",
      address_zip: "95814",
      digital_assets: false,
      ...(joint
        ? {
          spouse_first_name: "Sam",
          spouse_last_name: "Example",
          spouse_ssn: "444-55-6666",
          spouse_dob: "1987-03-10",
        }
        : {}),
      qbi_no_prior_loss_or_suspended_loss_confirmed: true,
      qbi_not_patron_of_specified_cooperative_confirmed: true,
    },
  };
}
export function substitute(
  type: FormType,
  n: number,
  facts: Record<string, unknown> = {},
) {
  const item = itemSchema.parse({
    form_type: type,
    payer_name: type === FormType.W2
      ? "Reviewed Payroll Employer"
      : "Reviewed Retirement Custodian",
    payer_tin: type === FormType.W2 ? "12-3456789" : "12-3456790",
    payer_address_line1: "2 Source Way",
    payer_address_city: "Sacramento",
    payer_address_state: "CA",
    payer_address_zip: "95814",
    recipient_ssn: "111223333",
    subject_ts: "T",
    form_year: 2025,
    missing_or_incorrect: "missing",
    source_copy_lineage: `2025-actual-source-copy-${n}`,
    ...(type === FormType.R_1099
      ? {
        account_number: `ACCOUNT-${n}`,
        distribution_reference: `DISTRIBUTION-${n}`,
      }
      : {}),
    amount_determination_explanation:
      "Reconciled final payroll or custodian payment records; retained workpaper records the complete copy lineage and applicable treatment.",
    payer_form_efforts_explanation:
      "Taxpayer requested the correct original and contacted the payer and IRS; retained correspondence reviewed.",
    source_workpaper_reference: `4852-workpaper-${n}`,
    completed_form_review_reference: `4852-completed-${n}`,
    ...facts,
  });
  const identity = {
    payer_tin: item.payer_tin!.replace(/\D/g, ""),
    owner_ssn: item.recipient_ssn!.replace(/\D/g, ""),
  };
  const money = (key: keyof typeof item) =>
    typeof item[key] === "number" ? item[key] as number : 0;
  return itemSchema.parse({
    ...item,
    ...(type === FormType.W2
      ? {
        payroll_allocations: [{
          ...identity,
          source_document_reference: `2025-retained-payroll-account-${n}`,
          payroll_account_reference: `EMPLOYEE-PAYROLL-ACCOUNT-${n}`,
          period_identifier: `2025-final-source-period-${n}`,
          paid_on: "2025-12-31",
          wages: money("wages"),
          federal_withheld: money("federal_withheld"),
          social_security_wages: money("social_security_wages"),
          social_security_withheld: money("social_security_withheld"),
          social_security_tips: money("social_security_tips"),
          medicare_wages: money("medicare_wages"),
          medicare_withheld: money("medicare_withheld"),
          state_tax_withheld: money("state_tax_withheld"),
          local_tax_withheld: money("local_tax_withheld"),
          ...(item.state_name !== undefined
            ? { state_name: item.state_name }
            : {}),
          ...(item.locality_name !== undefined
            ? { locality_name: item.locality_name }
            : {}),
        }],
      }
      : {
        distribution_source: {
          ...identity,
          source_document_reference: `2025-retained-owned-distribution-${n}`,
          account_number: item.account_number!,
          distribution_reference: item.distribution_reference!,
          paid_on: "2025-10-01",
          gross_distribution: money("gross_distribution"),
          taxable_amount: effectiveTaxable(item),
          employee_contributions: money("employee_contributions"),
          capital_gain: money("capital_gain"),
          federal_withheld: money("federal_withheld"),
          state_tax_withheld: money("state_tax_withheld"),
          local_tax_withheld: money("local_tax_withheld"),
          ...(item.state_name !== undefined
            ? { state_name: item.state_name }
            : {}),
          ...(item.locality_name !== undefined
            ? { locality_name: item.locality_name }
            : {}),
          ...(facts.retirement_account_type
            ? { account_type: facts.retirement_account_type }
            : {}),
          distribution_code: item.distribution_code!,
          is_ira: item.is_ira ?? false,
        },
      }),
  });
}
export async function retainedForm4852Sources(
  items: ReturnType<typeof itemSchema.parse>[],
  filer: FilerIdentity,
  template: Uint8Array,
) {
  const documents: Form4852RetainedDocument[] = [];
  const records = [];
  const add = (document_reference: string, bytes: Uint8Array) => {
    const prior = documents.find((d) =>
      d.document_reference === document_reference
    );
    if (prior) {
      if (
        createHash("sha256").update(prior.bytes).digest("hex") !==
          createHash("sha256").update(bytes).digest("hex")
      ) {
        throw new Error(
          "Shared retained source reference has conflicting actual bytes",
        );
      }
      return {
        document_reference,
        sha256: createHash("sha256").update(bytes).digest("hex"),
      };
    }
    documents.push({ document_reference, bytes });
    return {
      document_reference,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    };
  };
  const copies = form4852RetainedPdf.instances!({ f4852s: items }, filer);
  for (const [index, item] of items.entries()) {
    const pdf = await PDFDocument.load(template);
    const form = pdf.getForm();
    for (const entry of form4852RetainedPdf.fields) {
      const field = form.getField(entry.pdfField);
      const value = copies[index][entry.domainKey];
      if (field instanceof PDFTextField && entry.kind === "text") {
        if (entry.fontSize !== undefined) field.setFontSize(entry.fontSize);
        field.setText(
          typeof value === "number"
            ? (value === 0 ? "" : String(roundWholeDollars(value)))
            : String(value ?? ""),
        );
      } else if (field instanceof PDFCheckBox) {
        const checked = entry.kind === "checkboxWhen"
          ? value === entry.whenValue
          : value === true;
        if (checked) field.check();
        else field.uncheck();
      }
    }
    form.updateFieldAppearances(await pdf.embedFont(StandardFonts.Helvetica));
    if (copies[index].ira_margin_label) {
      addForm4852IraMargin(
        pdf,
        pdf.getPage(0),
        String(copies[index].ira_margin_label),
      );
    }
    const completed_form = add(
      item.completed_form_review_reference!,
      await pdf.save(),
    );
    const source_workpaper = add(
      item.source_workpaper_reference!,
      new TextEncoder().encode(JSON.stringify({ substitute: item })),
    );
    const treatment_documents = [
      ...(item.payroll_allocations ?? []),
      ...(item.distribution_source ? [item.distribution_source] : []),
    ].map((record) =>
      add(
        record.source_document_reference,
        new TextEncoder().encode(JSON.stringify(record)),
      )
    );
    records.push({
      reviewed_substitute: item,
      completed_form,
      source_workpaper,
      treatment_documents: [
        ...treatment_documents,
        ...(item.qualified_roth_review
          ? qualifiedRothDocuments(item.qualified_roth_review).map((facts) =>
            add(
              facts.source_document_reference,
              new TextEncoder().encode(JSON.stringify(facts)),
            )
          )
          : []),
        ...(item.retirement_source?.ira_recharacterization_review
          ? iraRecharacterizationDocuments(
            item.retirement_source.ira_recharacterization_review,
          ).map((facts) =>
            add(
              facts.source_document_reference,
              new TextEncoder().encode(JSON.stringify(facts)),
            )
          )
          : []),
      ],
      taxpayer_completed_form_confirmed: true as const,
      original_excluded_from_current_income_confirmed: true as const,
    });
  }
  return { documents, reviewed_source: { records } };
}

export async function officialForm4852EvidenceTemplate(
  name: string,
): Promise<Uint8Array> {
  const directory = ".state/research/form4852-source";
  await Deno.mkdir(directory, { recursive: true });
  const path = `${directory}/${name}.pdf`;
  try {
    return await Deno.readFile(path);
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) throw error;
  }
  const response = await fetch(
    `https://www.irs.gov/pub/${name === "f8606-2024" ? "irs-prior" : "irs-pdf"}/${
      name === "f8606-2024" ? "f8606--2024" : name
    }.pdf`,
  );
  if (!response.ok) {
    throw new Error(`Official source template unavailable: ${name}`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  await Deno.writeFile(path, bytes);
  return bytes;
}
