import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { extractFilerIdentity } from "../mef/filer.ts";
import { sha256Hex } from "./prepared-source.ts";
import { f1040_2025 } from "./index.ts";
import { buildMefBundle, buildMefXml } from "./mef/builder.ts";
import { buildPending } from "./mef/pending.ts";
import { buildPdfBytes } from "./pdf/builder.ts";

const general = {
  filing_status: "single" as const,
  taxpayer_first_name: "Alex",
  taxpayer_last_name: "Example",
  taxpayer_ssn: "111-22-3333",
  taxpayer_dob: "1985-06-15",
  address_line1: "1 Main St",
  address_city: "Austin",
  address_state: "TX",
  address_zip: "78701",
  digital_assets: false,
};

async function reviewedSource() {
  const ids = ["decree-1", "birth-1", "invoice-1", "payment-1"];
  const attachments = await Promise.all(ids.map(async (id) => {
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([200, 200]);
    page.drawText(id, {
      x: 20,
      y: 150,
      font: await pdf.embedFont(StandardFonts.Helvetica),
    });
    return {
      fileName: `${id}.pdf`,
      description: `Form 8839 reviewed ${id}`,
      bytes: await pdf.save(),
    };
  }));
  const hashes = Object.fromEntries(
    await Promise.all(attachments.map(async (attachment, index) =>
      [
        ids[index],
        await sha256Hex(attachment.bytes),
      ] as const
    )),
  );
  const source = {
    filing_status: "single" as const,
    adoption_benefits: 0,
    children: [{
      first_name: "Ada",
      last_name: "Example",
      birth_year: 2020,
      ssn: "111223334",
      final_decree: {
        source_document_id: "decree-1",
        finalization_date: "2025-07-15",
        issuing_jurisdiction: "TX",
        child_origin: "US" as const,
      },
      expenses: [{
        source_document_id: "invoice-1",
        paid_date: "2025-03-12",
        category: "attorney_fee" as const,
        payee: "Adoption Counsel",
        amount: 11_000,
        reimbursed_amount: 0,
      }],
    }],
    reviewed_source: {
      reviewed_by: "Adoption Reviewer",
      reviewed_on: "2026-04-01",
      adoption_case_reference: "case-TX-2025-1",
      decree: {
        source_document_id: "decree-1",
        document_sha256: hashes["decree-1"],
        child_first_name: "Ada",
        child_last_name: "Example",
        child_ssn: "111223334",
        finalization_date: "2025-07-15",
        issuing_jurisdiction: "TX",
        child_origin: "US" as const,
        taxpayer_named_as_adoptive_parent_confirmed: true as const,
      },
      birth_record: {
        source_document_id: "birth-1",
        document_sha256: hashes["birth-1"],
        child_first_name: "Ada",
        child_last_name: "Example",
        date_of_birth: "2020-02-01",
      },
      reviewed_facts: {
        child_us_citizen_or_resident_when_effort_began_confirmed: true as const,
        child_under_18_on_2025_12_31_confirmed: true as const,
        child_not_taxpayers_spouses_child_confirmed: true as const,
        no_other_nonspouse_taxpayer_claim_confirmed: true as const,
        no_prior_form8839_claim_for_child_confirmed: true as const,
        no_employer_adoption_benefits_confirmed: true as const,
        all_reimbursements_disclosed_confirmed: true as const,
        no_other_federal_credit_or_deduction_for_expenses_confirmed:
          true as const,
        no_surrogacy_or_illegal_expenses_confirmed: true as const,
      },
      expenses: [{
        source_document_id: "invoice-1",
        receipt_sha256: hashes["invoice-1"],
        payment_proof_document_id: "payment-1",
        payment_proof_sha256: hashes["payment-1"],
        paid_date: "2025-03-12",
        category: "attorney_fee" as const,
        payee: "Adoption Counsel",
        amount: 11_000,
        directly_related_to_legal_adoption_confirmed: true as const,
      }],
    },
    magi_review: {
      reviewed_by: "Return Reviewer",
      reviewed_on: "2026-04-01",
      section933: {
        no_puerto_rico_excluded_income_confirmed: true as const,
        return_wide_review_reference: "territory-review",
      },
      form2555: {
        no_form2555_filing_or_exclusion_confirmed: true as const,
        return_wide_review_reference: "foreign-income-review",
      },
      form4563: {
        no_form4563_filing_or_exclusion_confirmed: true as const,
        return_wide_review_reference: "territory-return-review",
      },
    },
    documents: ids.map((id) => ({
      source_document_id: id,
      file_name: `${id}.pdf`,
      description: `Form 8839 reviewed ${id}`,
      sha256: hashes[id],
    })),
  };
  const result = f1040_2025.executeReturn({
    general,
    w2: [{
      employee_ssn: "111-22-3333",
      employer_ein: "12-3456789",
      employer_name: "Example Employer",
      employer_address_line1: "2 Main St",
      employer_address_city: "Austin",
      employer_address_state: "TX",
      employer_address_zip: "78701",
      box1_wages: 100_000,
      box2_fed_withheld: 15_000,
      box3_ss_wages: 100_000,
      box4_ss_withheld: 6_200,
      box5_medicare_wages: 100_000,
      box6_medicare_withheld: 1_450,
    }],
    form8839: source,
  });
  return {
    source,
    attachments,
    result,
    pending: buildPending(result.pending),
    filer: extractFilerIdentity(general),
  };
}

Deno.test("Form 8839 direct reviewed child settles Schedule 3/1040 and prepares native attachment bundle", async () => {
  const { result, pending, filer, attachments } = await reviewedSource();
  assertEquals(result.diagnostics, []);
  assertEquals(pending.schedule3?.line6c_adoption_credit, 6_000);
  assertEquals(pending.f1040?.line30_refundable_adoption, 5_000);
  assertThrows(() => buildMefXml(pending, filer), Error, "attachment bytes");
  const bundle = await buildMefBundle(pending, { filer, attachments });
  assertStringIncludes(bundle.xml, "<IRS8839");
  assertStringIncludes(bundle.xml, "<BinaryAttachment");
  await buildPdfBytes(pending, filer, ".pdf-cache", bundle);
});

Deno.test("Form 8839 direct route rejects changed evidence, orphan credit, and standalone PDF", async () => {
  const { pending, filer, attachments } = await reviewedSource();
  await assertRejects(
    () => buildMefBundle(pending, { filer, attachments: [] }),
    Error,
    "reviewed PDF attachment",
  );
  const changedBytes = attachments.map((attachment, index) =>
    index === 0 ? { ...attachment, bytes: attachments[1].bytes } : attachment
  );
  await assertRejects(
    () => buildMefBundle(pending, { filer, attachments: changedBytes }),
    Error,
    "bytes differ",
  );
  await assertRejects(() => buildPdfBytes(pending, filer), Error, "prepared");
  await assertRejects(
    () =>
      buildMefBundle({
        ...pending,
        f1040: { ...pending.f1040, line30_refundable_adoption: 4_999 },
      }, { filer, attachments }),
    Error,
    "Form 8839",
  );
  await assertRejects(
    () =>
      buildMefBundle({
        ...pending,
        f1040: { ...pending.f1040, line21_credits_total: 5_999 },
      }, { filer, attachments }),
    Error,
    "Form 8839",
  );
  await assertRejects(
    () =>
      buildMefBundle({
        ...pending,
        schedule3: { ...pending.schedule3, line7_total: 5_999 },
      }, { filer, attachments }),
    Error,
    "Form 8839",
  );
  await assertRejects(
    () =>
      buildMefBundle({
        ...pending,
        form8839_route: undefined,
      }, { filer, attachments }),
    Error,
    "reviewed executor route",
  );
});
