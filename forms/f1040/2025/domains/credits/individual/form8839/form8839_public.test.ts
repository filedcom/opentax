import { Box12Code } from "../../../../../nodes/inputs/income/wages/w2/index.ts";
import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { sha256Hex } from "../../../../return-processing/prepared-source.ts";
import { f1040_2025 } from "../../../../index.ts";
import { buildMefBundle, buildMefXml } from "../../../../mef/builder.ts";
import { buildPending } from "../../../../mef/execution/pending.ts";
import { buildPdfBytes } from "../../../../pdf/builder.ts";

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

async function reviewedSource(
  wages = 100_000,
  withheld = 15_000,
  expense = 11_000,
  retirementDeferrals = 0,
) {
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
        amount: expense,
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
        amount: expense,
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
    general: {
      ...general,
      ...(retirementDeferrals > 0
        ? {
          taxpayer_form8880_student_five_months: false,
          taxpayer_form8880_claimed_as_dependent: false,
        }
        : {}),
    },
    w2: [{
      employee_ssn: "111-22-3333",
      employer_ein: "12-3456789",
      employer_name: "Example Employer",
      employer_address_line1: "2 Main St",
      employer_address_city: "Austin",
      employer_address_state: "TX",
      employer_address_zip: "78701",
      box1_wages: wages,
      box2_fed_withheld: withheld,
      box3_ss_wages: wages + retirementDeferrals,
      box4_ss_withheld: Math.round((wages + retirementDeferrals) * 0.062),
      box5_medicare_wages: wages + retirementDeferrals,
      box6_medicare_withheld: Math.round(
        (wages + retirementDeferrals) * 0.0145,
      ),
      ...(retirementDeferrals > 0
        ? {
          box12_entries: [{ code: Box12Code.D, amount: retirementDeferrals }],
        }
        : {}),
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
  const origins: { pageNumber: number; formKey: string; formCopy: number }[] =
    [];
  const pdf = await buildPdfBytes(
    pending,
    filer,
    ".pdf-cache",
    bundle,
    origins,
  );
  const adoptedPages = origins.filter((origin) =>
    origin.formKey === "form8839"
  );
  assertEquals(adoptedPages.length, 1);
  assertEquals(adoptedPages[0].formCopy, 1);
  assertEquals((await PDFDocument.load(pdf)).getPageCount(), origins.length);
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

Deno.test("Form 8839 unused current credit retains a source-owned five-year balance through both exporters", async () => {
  const { result, pending, filer, attachments } = await reviewedSource(
    10_000,
    0,
  );
  assertEquals(result.diagnostics, []);
  assertEquals(result.carryforwards.adoption_credit_2025, 6_000);
  assertEquals(pending.f1040?.line30_refundable_adoption, 5_000);
  assertEquals(pending.schedule3?.line6c_adoption_credit, 0);
  const ledger = result.pending.form8839_carryforward;
  assertEquals(ledger, {
    version: 1,
    status: "computed_unfiled",
    origin_tax_year: 2025,
    first_carry_year: 2026,
    last_carry_year: 2030,
    taxpayer_ssn: "111223333",
    child_ssn: "111223334",
    decree_document_id: "decree-1",
    expense_document_ids: ["invoice-1"],
    nonrefundable_credit: 6_000,
    used_in_origin_year: 0,
    carryforward_amount: 6_000,
  });
  const bundle = await buildMefBundle(pending, { filer, attachments });
  assertStringIncludes(
    bundle.xml,
    "<RefundableAdoptionCreditAmt>5000</RefundableAdoptionCreditAmt>",
  );
  await buildPdfBytes(pending, filer, ".pdf-cache", bundle);
  for (
    const changed of [
      undefined,
      { ...ledger, carryforward_amount: 5_999 },
      { ...ledger, taxpayer_ssn: "999999999" },
      { ...ledger, child_ssn: "999999999" },
      { ...ledger, last_carry_year: 2031 },
      { ...ledger, expense_document_ids: ["invented"] },
      { ...ledger, status: "accepted" },
    ]
  ) {
    const altered = { ...pending, form8839_carryforward: changed };
    await assertRejects(() => buildMefBundle(altered, { filer, attachments }));
    await assertRejects(() =>
      buildPdfBytes(altered, filer, ".pdf-cache", bundle)
    );
  }
});

Deno.test("Form 8839 partially used current credit survives retained JSON without consuming the carryforward", async () => {
  const { result, pending, filer, attachments } = await reviewedSource(
    50_000,
    4_000,
  );
  // Single 2025 tax-table row $34,250-$34,299: $3,875.
  assertEquals(pending.f1040?.line18_total_tax_before_credits, 3_875);
  assertEquals(pending.schedule3?.line6c_adoption_credit, 3_875);
  assertEquals(pending.f1040?.line30_refundable_adoption, 5_000);
  assertEquals(result.carryforwards.adoption_credit_2025, 2_125);
  assertEquals(result.pending.form8839_carryforward.used_in_origin_year, 3_875);
  const retained = buildPending(JSON.parse(JSON.stringify(result.pending)));
  const bundle = await buildMefBundle(retained, { filer, attachments });
  assertStringIncludes(
    bundle.xml,
    "<NonrefundableAdoptionCreditAmt>3875</NonrefundableAdoptionCreditAmt>",
  );
  await buildPdfBytes(retained, filer, ".pdf-cache", bundle);
});

Deno.test("Form 8839 fully refundable current credit does not invent a carryforward", async () => {
  const { result, pending, filer, attachments } = await reviewedSource(
    10_000,
    0,
    4_000,
  );
  assertEquals(pending.f1040?.line30_refundable_adoption, 4_000);
  assertEquals(pending.schedule3?.line6c_adoption_credit, 0);
  assertEquals(result.pending.form8839_carryforward, undefined);
  assertEquals(result.carryforwards.adoption_credit_2025, undefined);
  const bundle = await buildMefBundle(pending, { filer, attachments });
  await buildPdfBytes(pending, filer, ".pdf-cache", bundle);
});

for (
  const [wages, withheld, tax, retirement, adoption, carry] of [
    [20_000, 500, 428, 428, 0, 6_000],
    [25_000, 1_000, 928, 400, 528, 5_472],
    [30_000, 2_000, 1_475, 200, 1_275, 4_725],
    [40_000, 3_000, 2_675, 0, 2_675, 3_325],
  ] as const
) {
  Deno.test(`Form 8839 saver-credit boundary at wages ${wages}`, async () => {
    if (retirement > 0) {
      // Deferred product-board item 95: retain the observed public-route block.
      // A rejection is not successful credit ordering or an export pass.
      await assertRejects(
        () => reviewedSource(wages, withheld, 11_000, 2_000),
        Error,
        "Form 8839 pre-adoption Schedule 3 lines do not reconcile to Form 1040 line 20",
      );
      return;
    }
    const { result, pending, filer, attachments } = await reviewedSource(
      wages,
      withheld,
      11_000,
      2_000,
    );
    assertEquals(result.diagnostics, []);
    assertEquals(pending.f1040?.line18_total_tax_before_credits, tax);
    assertEquals(
      pending.schedule3?.line4_retirement_savings_credit ?? 0,
      retirement,
    );
    assertEquals(pending.schedule3?.line6c_adoption_credit, adoption);
    assertEquals(pending.schedule3?.line8_total, tax);
    assertEquals(pending.f1040?.line30_refundable_adoption, 5_000);
    assertEquals(pending.f1040?.line35a_refund, withheld + 5_000);
    assertEquals(result.carryforwards.adoption_credit_2025, carry);
    const bundle = await buildMefBundle(pending, { filer, attachments });
    await buildPdfBytes(pending, filer, ".pdf-cache", bundle);
    for (
      const altered of [
        {
          ...pending,
          schedule3: {
            ...pending.schedule3,
            line4_retirement_savings_credit: retirement + 1,
          },
        },
        {
          ...pending,
          form8839_carryforward: {
            ...result.pending.form8839_carryforward,
            carryforward_amount: carry + 1,
          },
        },
      ]
    ) {
      await assertRejects(() =>
        buildMefBundle(altered, { filer, attachments })
      );
      await assertRejects(() =>
        buildPdfBytes(altered, filer, ".pdf-cache", bundle)
      );
    }
  });
}
