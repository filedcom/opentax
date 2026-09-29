import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { FMVMethod } from "../../../nodes/inputs/f8283/index.ts";
import {
  inputSchema as scheduleAInputSchema,
  scheduleA as scheduleANode,
} from "../../../nodes/inputs/schedule_a/index.ts";
import { buildMefBundle, buildMefXml } from "../builder.ts";
import { testFiler } from "../test-filer.ts";
import { form8283 } from "./f8283.ts";
import { scheduleA as scheduleAMef } from "./schedule_a.ts";
import { form8283Pdf } from "../../pdf/forms/f8283.ts";
import { scheduleAPdf } from "../../pdf/forms/schedule_a.ts";
import { form8283CarryoverAttachmentDescription } from "./f8283_carryover_evidence.ts";

const attachmentFile = "filed-2024-form-8283.pdf";
const attachmentDescription = form8283CarryoverAttachmentDescription(
  attachmentFile,
);

async function reviewedSource() {
  const pdf = await PDFDocument.create();
  pdf.addPage([612, 792]);
  const bytes = await pdf.save();
  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", Uint8Array.from(bytes)),
  );
  const pdfSha256 = Array.from(
    digest,
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
  const evidence = {
    contribution_id: "stock-gift-2023-1",
    contribution_year: 2023,
    property_kind: "publicly_traded_securities" as const,
    original_section_a_similar_items_total: 4_000,
    prior_form_8283: {
      source_tax_year: 2024 as const,
      completed_section: "A" as const,
      attachment_file_name: attachmentFile,
      pdf_sha256: pdfSha256,
      reviewed_by: "Reviewer One",
      reviewed_on: "2025-03-01",
      filed_return_reference: "accepted-2024-return",
      filed_taxpayer_ssn: "123456789",
      original_donation_date: "2023-11-15",
      donor_acquired_date: "2020-04-01",
      donor_acquisition_description: "Purchase" as const,
      donee_name: "Qualified Charity",
      donee_us_address: {
        line1: "100 Main Street",
        city: "Wilmington",
        state: "DE",
        zip: "19801",
      },
      property_description: "Publicly traded common stock",
      original_fmv: 4_000,
      adjusted_basis: 2_000,
      fmv_method: FMVMethod.ComparableSales,
    },
    prior_deduction_workpaper: {
      reviewed_source_reference: "filed-2024-charity-workpaper",
      total_previously_deducted_through_2024: 500,
    },
    appraisal_required_with_2024_return: false as const,
  };
  const scheduleSource = {
    agi: 100_000,
    capital_gain_50_percent_election_confirmed: true as const,
    current_noncash_gift_inventory_complete_confirmed: true as const,
    other_prior_charitable_carryovers_absent_confirmed: true as const,
    capital_gain_property_carryovers: [{
      contribution_id: evidence.contribution_id,
      contribution_year: evidence.contribution_year,
      original_category: "capital_gain_30" as const,
      original_fmv: 4_000,
      adjusted_basis: 2_000,
      previously_deducted: 500,
      ordinary_carryover_rules_confirmed: true as const,
    }],
    noncash_contribution_items: [],
  };
  const result = scheduleANode.compute(
    { taxYear: 2025, formType: "f1040" },
    scheduleAInputSchema.parse(scheduleSource),
  );
  const schedule = {
    ...scheduleSource,
    ...result.finalizations![0].fields,
  };
  return {
    pending: {
      f8283: { carryover_evidence: [evidence] },
      schedule_a: schedule,
      f1040: {
        line11_agi: 100_000,
        line12e_itemized_deductions: 1_500,
      },
    },
    attachment: {
      fileName: attachmentFile,
      description: attachmentDescription,
      bytes,
    },
    pdfSha256,
  };
}

Deno.test("Form 8283 carryover binds native Section A, FMV statement, prior PDF and Schedule A", async () => {
  const { pending, attachment } = await reviewedSource();
  const bundle = await buildMefBundle(pending, {
    filer: testFiler(),
    attachments: [attachment],
  });
  assertStringIncludes(
    bundle.xml,
    "<CarryoverFromPriorYearAmt>1500</CarryoverFromPriorYearAmt>",
  );
  assertStringIncludes(
    bundle.xml,
    "<DonatedPropertyDesc>Publicly traded common stock</DonatedPropertyDesc>",
  );
  assertStringIncludes(
    bundle.xml,
    "<ContributionDt>2023-11-15</ContributionDt>",
  );
  assertStringIncludes(bundle.xml, "<FairMarketValueStatement documentId=");
  assertStringIncludes(bundle.xml, "<FairMarketValueAmt referenceDocumentId=");
  assertStringIncludes(bundle.xml, "<IRS8283 documentId=");
  assertStringIncludes(
    bundle.xml,
    'referenceDocumentName="BinaryAttachment DeductionsTakenUnderSection170Stmt DoneesSignatureUnavailableStmt"',
  );
  assertEquals((bundle.xml.match(/<IRS8283 documentId=/g) ?? []).length, 1);
  assertEquals(
    bundle.xml.indexOf("<IRS8283 documentId=") <
      bundle.xml.indexOf("<FairMarketValueStatement documentId="),
    true,
  );
  assertEquals(bundle.attachments.length, 1);
});

Deno.test("Form 8283 multiple carried gifts each have a native form, statement, prior PDF, and preview", async () => {
  const { pending, attachment } = await reviewedSource();
  const secondPdf = await PDFDocument.create();
  secondPdf.addPage([612, 792]);
  secondPdf.addPage([612, 792]);
  const secondBytes = await secondPdf.save();
  const secondDigest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", Uint8Array.from(secondBytes)),
  );
  const secondSha256 = Array.from(
    secondDigest,
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
  const first = pending.f8283.carryover_evidence[0];
  const second = {
    ...first,
    contribution_id: "stock-gift-2023-2",
    prior_form_8283: {
      ...first.prior_form_8283,
      attachment_file_name: "filed-2024-form-8283-second.pdf",
      pdf_sha256: secondSha256,
      property_description: "Second publicly traded common stock gift",
      original_fmv: 3_000,
      adjusted_basis: 2_500,
    },
    original_section_a_similar_items_total: 3_000,
    prior_deduction_workpaper: {
      ...first.prior_deduction_workpaper,
      total_previously_deducted_through_2024: 500,
    },
  };
  const scheduleSource = {
    agi: 100_000,
    capital_gain_50_percent_election_confirmed: true as const,
    current_noncash_gift_inventory_complete_confirmed: true as const,
    other_prior_charitable_carryovers_absent_confirmed: true as const,
    capital_gain_property_carryovers: [
      pending.schedule_a.capital_gain_property_carryovers[0],
      {
        contribution_id: second.contribution_id,
        contribution_year: second.contribution_year,
        original_category: "capital_gain_30" as const,
        original_fmv: 3_000,
        adjusted_basis: 2_500,
        previously_deducted: 500,
        ordinary_carryover_rules_confirmed: true as const,
      },
    ],
    noncash_contribution_items: [],
  };
  const computed = scheduleANode.compute(
    { taxYear: 2025, formType: "f1040" },
    scheduleAInputSchema.parse(scheduleSource),
  );
  const multiple = {
    f8283: { carryover_evidence: [first, second] },
    schedule_a: { ...scheduleSource, ...computed.finalizations![0].fields },
    f1040: {
      line11_agi: 100_000,
      line12e_itemized_deductions: 3_500,
    },
  };
  const attachments = [attachment, {
    fileName: "filed-2024-form-8283-second.pdf",
    description: form8283CarryoverAttachmentDescription(
      "filed-2024-form-8283-second.pdf",
    ),
    bytes: secondBytes,
  }];
  const bundle = await buildMefBundle(multiple, {
    filer: testFiler(),
    attachments,
  });
  assertStringIncludes(
    bundle.xml,
    "<CarryoverFromPriorYearAmt>3500</CarryoverFromPriorYearAmt>",
  );
  assertEquals((bundle.xml.match(/<IRS8283 documentId=/g) ?? []).length, 2);
  assertEquals(
    (bundle.xml.match(/<FairMarketValueStatement documentId=/g) ?? []).length,
    2,
  );
  assertEquals(bundle.attachments.length, 2);
  assertEquals(
    form8283Pdf.instances!(multiple.f8283, testFiler(), multiple).length,
    2,
  );
  assertEquals(
    scheduleAPdf.instances!(multiple.schedule_a, testFiler(), multiple).length,
    1,
  );
  await assertRejects(() =>
    buildMefBundle({
      ...multiple,
      f8283: {
        carryover_evidence: [first, {
          ...second,
          contribution_id: first.contribution_id,
        }],
      },
    }, { filer: testFiler(), attachments })
  );
  await assertRejects(() =>
    buildMefBundle({
      ...multiple,
      f8283: {
        carryover_evidence: [first, {
          ...second,
          prior_form_8283: {
            ...second.prior_form_8283,
            attachment_file_name: first.prior_form_8283.attachment_file_name,
          },
        }],
      },
    }, { filer: testFiler(), attachments })
  );
  await assertRejects(() =>
    buildMefBundle(multiple, {
      filer: testFiler(),
      attachments: [attachment],
    })
  );
});

Deno.test("Form 8283 carryover refuses an unsupplied or modified prior-year PDF", async () => {
  const { pending, attachment } = await reviewedSource();
  assertThrows(
    () => buildMefXml(pending, testFiler()),
    Error,
    "completed PDF bytes or description",
  );
  await assertRejects(
    () =>
      buildMefBundle(pending, {
        filer: testFiler(),
        attachments: [{ ...attachment, description: "Unrelated attachment" }],
      }),
    Error,
    "completed PDF bytes or description",
  );
  const changed = await PDFDocument.create();
  changed.addPage([612, 792]);
  changed.addPage([612, 792]);
  const changedBytes = await changed.save();
  await assertRejects(
    () =>
      buildMefBundle(pending, {
        filer: testFiler(),
        attachments: [{ ...attachment, bytes: changedBytes }],
      }),
    Error,
    "completed PDF bytes or description",
  );
});

Deno.test("Form 8283 carryover rejects a divergent ledger or line 13", async () => {
  const { pending } = await reviewedSource();
  const context = { filer: testFiler(), pending };
  assertThrows(
    () =>
      form8283.build(pending.f8283, {
        ...context,
        pending: {
          ...pending,
          schedule_a: {
            ...pending.schedule_a,
            capital_gain_property_carryovers: [{
              ...pending.schedule_a.capital_gain_property_carryovers[0],
              previously_deducted: 600,
            }],
          },
        },
      }),
    Error,
    "differs from the prior filed source",
  );
  assertThrows(
    () =>
      scheduleAMef.build({
        ...pending.schedule_a,
        line_13_contribution_carryover: 1_400,
      }, context),
    Error,
    "differs from recomputed Schedule A lines 11-13",
  );
});

Deno.test("Form 8283 and Schedule A PDF descriptors project the same carried gift", async () => {
  const { pending } = await reviewedSource();
  const [form] = form8283Pdf.instances?.(
    pending.f8283,
    testFiler(),
    pending,
  ) ?? [];
  assertEquals(form?.row1_claim, 2_000);
  assertEquals(form?.row1_contribution_date, "11/15/2023");
  assertEquals((form?.reduction_statements as string[]).length, 1);
  const [schedule] = scheduleAPdf.instances?.(
    pending.schedule_a,
    testFiler(),
    pending,
  ) ?? [];
  assertEquals(schedule?.line_13_contribution_carryover, 1_500);
  assertEquals(scheduleAPdf.includeWhen?.(schedule!, pending), true);
});
