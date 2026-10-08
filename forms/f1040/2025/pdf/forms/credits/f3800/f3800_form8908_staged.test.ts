import {
  form7220ReviewedFixture,
  form7220StatementFixture,
} from "../../../../domains/credits/form8908/form8908_form7220_fixture.ts";
import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { FilingStatus } from "../../../../../nodes/types.ts";
import { assertAttachmentCoverage } from "../../../../domains/execution/attachment-coverage.ts";
import {
  form3800,
  prepareForm3800DocumentParts,
} from "../../../../mef/forms/credits/f3800/f3800.ts";
import { form8908 } from "../../../../mef/forms/credits/f8908.ts";
import { testFiler } from "../../../../mef/execution/test-filer.ts";
import { form3800PartIIIFields } from "./f3800_fields.ts";
import { form3800Pdf } from "./f3800.ts";

const home = {
  contractor_ssn: "111223333",
  eligible_contractor_and_program_participation_verified: true,
  basis_during_construction_verified: true,
  no_duplicate_rehabilitation_or_energy_credit_verified: true,
  street: "1 Main Street",
  city: "Albany",
  state: "NY",
  zip: "12207",
  acquired_on: "2025-06-01",
  acquired_by_other_person_for_residence_verified: true,
  acquisition_record_reference: "SALE-1",
  contractor_basis_record_reference: "BASIS-1",
  program: "residential",
  zero_energy_ready: false,
  certifier: { kind: "business", name: "North Certification LLC", state: "NY" },
  certification_reference: "CERT-1",
  certified_on: "2025-05-01",
  certification_modified: false,
};
const source = { f8908s: [home] };
const f3800 = {
  f8908_credit: {
    credit_amount: 2_500,
    subject_to_passive_activity_limit: false as const,
  },
  tax_context: {
    filingStatus: FilingStatus.Single,
    regularTax: 40_000,
    alternativeMinimumTax: 0,
    foreignTaxCredit: 0,
    priorAllowableCredits: 0,
    tentativeMinimumTax: 20_000,
    standardCredit: 2_500,
    specifiedCredit: 0,
    standardCarryforward: 0,
    specifiedCarryforward: 0,
  },
  allowed_credit: 2_500,
};
const pending = {
  f8908: source,
  f3800,
  f1040: { line16_income_tax: 40_000, line20_nonrefundable_credits: 2_500 },
  form6251: { line11_amt: 0, net_tmt: 20_000 },
  schedule3: { line6a_total: 2_500, line7_total: 2_500, line8_total: 2_500 },
};
const ids = { f8908: ["IRS8908_1"], form6251: ["IRS6251_1"], f8835: [] };
const pwaHome = {
  ...home,
  program: "multifamily",
  prevailing_wage_met: true,
  form7220: {
    review_reference: "PWA-1",
    acquisition_record_reference: "SALE-1",
    residence: {
      street: "1 Main Street",
      city: "Albany",
      state: "NY",
      zip: "12207",
      acquired_on: "2025-06-01",
    },
    pdf_file_name: "Form7220-1.pdf",
    pdf_sha256: "a".repeat(64),
    completed_for_residence_confirmed: true,
    reviewed_record: form7220ReviewedFixture(),
    signed_no_alterations_statement: form7220StatementFixture(
      1,
      "1 Main Street",
      "SALE-1",
      "PWA-1",
    ),
  },
};
const pwaAttachment = {
  binaryAttachmentFileNames: ["Form7220-1.pdf", "Form7220Statement-1.pdf"],
  attachmentDescriptionsByFileName: {
    "Form7220-1.pdf": "Form 7220 PWA-1 for Form 8908 home SALE-1",
    "Form7220Statement-1.pdf":
      "Form 7220 no-alterations statement STATEMENT-REVIEW-1 for home SALE-1",
  },
  attachmentSha256ByFileName: {
    "Form7220-1.pdf": "a".repeat(64),
    "Form7220Statement-1.pdf": "b".repeat(63) + "1",
  },
  documentIdsByAttachmentFileName: {
    "Form7220-1.pdf": "BinaryAttachment1",
    "Form7220Statement-1.pdf": "BinaryAttachment2",
  },
};

Deno.test("staged Form 8908 credit has a distinct Form 3800 line 1p source", () => {
  const prepared = prepareForm3800DocumentParts(f3800, {
    pending,
    documentIdsByPendingKey: ids,
  });
  if (!prepared) throw new Error("Expected sourced Form 3800");
  const xml = form3800.build(f3800, { pending, documentIdsByPendingKey: ids });
  assertStringIncludes(xml, "<Form8908CYCreditsGrp");
  assertStringIncludes(xml, 'referenceDocumentId="IRS8908_1"');
  const [pdf] = form3800Pdf.instances!(f3800, testFiler(), pending, prepared);
  assertEquals(pdf[form3800PartIIIFields("1p").e], 2_500);
  assertEquals(pdf[form3800PartIIIFields("1p").i], 2_500);
});

Deno.test("staged Form 8908 PWA home binds a completed Form 7220 binary document", () => {
  const filed = { ...pending, f8908: { f8908s: [pwaHome] } };
  const context = {
    pending: filed,
    documentIdsByPendingKey: ids,
    ...pwaAttachment,
  };
  const prepared = prepareForm3800DocumentParts(f3800, context);
  if (!prepared) throw new Error("Expected sourced Form 3800");
  assertStringIncludes(form3800.build(f3800, context), "<Form8908CYCreditsGrp");
  assertStringIncludes(
    form8908.build(filed.f8908, {
      ...context,
      documentIdsByPendingKey: { ...ids, f3800: ["IRS3800_1"] },
    }),
    "<TotalCreditAmt>2500</TotalCreditAmt>",
  );
});

Deno.test("staged Form 8908 line 1p rejects altered source and missing attachment", () => {
  assertThrows(
    () =>
      prepareForm3800DocumentParts(f3800, {
        pending: {
          ...pending,
          f8908: { f8908s: [{ ...home, zero_energy_ready: true }] },
        },
        documentIdsByPendingKey: ids,
      }),
    Error,
    "does not reconcile",
  );
  assertThrows(
    () =>
      prepareForm3800DocumentParts(f3800, {
        pending,
        documentIdsByPendingKey: { ...ids, f8908: [] },
      }),
    Error,
    "document count",
  );
  assertThrows(() =>
    prepareForm3800DocumentParts(f3800, {
      pending: {
        ...pending,
        f8908: {
          f8908s: [{
            ...home,
            program: "multifamily",
            prevailing_wage_met: true,
            form7220: {
              review_reference: "PWA-1",
              acquisition_record_reference: "SALE-1",
              residence: {
                street: "1 Main Street",
                city: "Albany",
                state: "NY",
                zip: "12207",
                acquired_on: "2025-06-01",
              },
              pdf_file_name: "Form7220-1.pdf",
              pdf_sha256: "a".repeat(64),
              completed_for_residence_confirmed: true,
              reviewed_record: form7220ReviewedFixture(),
              signed_no_alterations_statement: form7220StatementFixture(
                1,
                "1 Main Street",
                "SALE-1",
                "PWA-1",
              ),
            },
          }],
        },
      },
      documentIdsByPendingKey: ids,
    }), Error);
});

Deno.test("Form 8908 and its staged Form 3800 claim remain closed to both public exports", () => {
  for (const kind of ["mef", "pdf"] as const) {
    assertThrows(
      () => assertAttachmentCoverage(pending, kind),
      Error,
      "Form 8908",
    );
    assertThrows(
      () => assertAttachmentCoverage({ f3800 }, kind),
      Error,
      "Form 8908 line 1p",
    );
  }
});
