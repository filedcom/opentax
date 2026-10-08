import {
  form7220ReviewedFixture,
  form7220StatementFixture,
} from "../../../domains/credits/form8908/form8908_form7220_fixture.ts";
import { assertEquals, assertThrows } from "@std/assert";
import {
  form8908NoAlterationsStatementDescription,
  form8908PwaAttachmentDescription,
  form8908SourceSchema,
} from "../../../domains/credits/form8908/form8908_source.ts";
import { reconcileForm8908PwaAttachments } from "./f8908_pwa.ts";

function home(index: number) {
  const street = `${index} Main Street`;
  const acquisition = `SALE-${index}`;
  return {
    street,
    city: "Albany",
    state: "NY",
    zip: "12207",
    acquired_on: "2025-06-01",
    acquired_by_other_person_for_residence_verified: true,
    acquisition_record_reference: acquisition,
    contractor_basis_record_reference: `BASIS-${index}`,
    program: "multifamily",
    zero_energy_ready: false,
    prevailing_wage_met: true,
    form7220: {
      review_reference: `PWA-REVIEW-${index}`,
      acquisition_record_reference: acquisition,
      residence: {
        street,
        city: "Albany",
        state: "NY",
        zip: "12207",
        acquired_on: "2025-06-01",
      },
      pdf_file_name: `Form7220-${index}.pdf`,
      pdf_sha256: String(index).repeat(64),
      completed_for_residence_confirmed: true,
      reviewed_record: form7220ReviewedFixture(),
      signed_no_alterations_statement: form7220StatementFixture(
        index,
        street,
        acquisition,
        `PWA-REVIEW-${index}`,
      ),
    },
    certifier: {
      kind: "business",
      name: "North Certification LLC",
      state: "NY",
    },
    certification_reference: `CERT-${index}`,
    certified_on: "2025-05-01",
    certification_modified: false,
  };
}

function source() {
  return form8908SourceSchema.parse({
    contractor_ssn: "111223333",
    eligible_contractor_and_program_participation_verified: true,
    basis_during_construction_verified: true,
    no_duplicate_rehabilitation_or_energy_credit_verified: true,
    homes: [home(1), home(2)],
  });
}

function context() {
  const homes = source().homes;
  return {
    binaryAttachmentFileNames: homes.flatMap((home) => [
      home.form7220!.pdf_file_name,
      home.form7220!.signed_no_alterations_statement.pdf_file_name,
    ]),
    attachmentDescriptionsByFileName: Object.fromEntries(
      homes.flatMap((home) => [
        [home.form7220!.pdf_file_name, form8908PwaAttachmentDescription(home)],
        [
          home.form7220!.signed_no_alterations_statement.pdf_file_name,
          form8908NoAlterationsStatementDescription(home),
        ],
      ]),
    ),
    attachmentSha256ByFileName: Object.fromEntries(homes.flatMap((home) => [
      [home.form7220!.pdf_file_name, home.form7220!.pdf_sha256],
      [
        home.form7220!.signed_no_alterations_statement.pdf_file_name,
        home.form7220!.signed_no_alterations_statement.pdf_sha256,
      ],
    ])),
    documentIdsByAttachmentFileName: {
      "Form7220-1.pdf": "BinaryAttachment1",
      "Form7220-2.pdf": "BinaryAttachment2",
      "Form7220Statement-1.pdf": "BinaryAttachment3",
      "Form7220Statement-2.pdf": "BinaryAttachment4",
    },
  };
}

Deno.test("Form 8908 binds distinct completed Form 7220 PDFs to two residences", () => {
  const links = reconcileForm8908PwaAttachments(source(), context());
  assertEquals(links.map((link) => link.acquisitionRecordReference), [
    "SALE-1",
    "SALE-2",
  ]);
  assertEquals(links.map((link) => link.reviewReference), [
    "PWA-REVIEW-1",
    "PWA-REVIEW-2",
  ]);
  assertEquals(links.map((link) => link.documentId), [
    "BinaryAttachment1",
    "BinaryAttachment2",
  ]);
  assertEquals(links.map((link) => link.statementDocumentId), [
    "BinaryAttachment3",
    "BinaryAttachment4",
  ]);
});

Deno.test("Form 8908 rejects statement document reuse and home mismatch", () => {
  const base = context();
  assertThrows(
    () =>
      reconcileForm8908PwaAttachments(source(), {
        ...base,
        documentIdsByAttachmentFileName: {
          ...base.documentIdsByAttachmentFileName,
          "Form7220Statement-2.pdf": "BinaryAttachment3",
        },
      }),
    Error,
    "distinct signed statement binary document ID",
  );
  const moved = structuredClone(source());
  moved.homes[1].form7220!.signed_no_alterations_statement.residence.street =
    "9 Other Street";
  assertThrows(
    () => reconcileForm8908PwaAttachments(moved, base),
    Error,
    "signed statement differs from Form 7220",
  );
  const reused = structuredClone(source());
  reused.homes[1].form7220!.signed_no_alterations_statement.pdf_file_name =
    reused.homes[0].form7220!.signed_no_alterations_statement.pdf_file_name;
  assertThrows(
    () => reconcileForm8908PwaAttachments(reused, base),
    Error,
    "distinct signed statement PDF",
  );
});

Deno.test("Form 8908 Form 7220 rejects missing, altered, or reused binary attachments", () => {
  const base = context();
  assertThrows(
    () =>
      reconcileForm8908PwaAttachments(source(), {
        ...base,
        binaryAttachmentFileNames: [
          "Form7220-1.pdf",
          "Form7220Statement-1.pdf",
          "Form7220Statement-2.pdf",
        ],
      }),
    Error,
    "reviewed completed Form 7220 PDF bytes",
  );
  assertThrows(
    () =>
      reconcileForm8908PwaAttachments(source(), {
        ...base,
        attachmentSha256ByFileName: {
          ...base.attachmentSha256ByFileName,
          "Form7220-2.pdf": "f".repeat(64),
        },
      }),
    Error,
    "reviewed completed Form 7220 PDF bytes",
  );
  assertThrows(
    () =>
      reconcileForm8908PwaAttachments(source(), {
        ...base,
        attachmentDescriptionsByFileName: {
          ...base.attachmentDescriptionsByFileName,
          "Form7220-2.pdf": "Form 7220 for another home",
        },
      }),
    Error,
    "reviewed completed Form 7220 PDF bytes",
  );
  assertThrows(
    () =>
      reconcileForm8908PwaAttachments(source(), {
        ...base,
        documentIdsByAttachmentFileName: {
          ...base.documentIdsByAttachmentFileName,
          "Form7220-2.pdf": "BinaryAttachment1",
        },
      }),
    Error,
    "distinct linked Form 7220 binary document ID",
  );
  assertThrows(
    () =>
      reconcileForm8908PwaAttachments(source(), {
        ...base,
        documentIdsByAttachmentFileName: {
          "Form7220-1.pdf": "BinaryAttachment1",
          "Form7220Statement-1.pdf": "BinaryAttachment3",
          "Form7220Statement-2.pdf": "BinaryAttachment4",
        },
      }),
    Error,
    "distinct linked Form 7220 binary document ID",
  );
});

Deno.test("Form 8908 Form 7220 source rejects a changed residence and reused review/PDF", () => {
  const moved = structuredClone(source());
  moved.homes[1].form7220!.residence.street = "99 Other Street";
  assertThrows(
    () => reconcileForm8908PwaAttachments(moved, context()),
    Error,
    "residence identity differs",
  );
  const reused = structuredClone(source());
  reused.homes[1].form7220!.pdf_file_name =
    reused.homes[0].form7220!.pdf_file_name;
  assertThrows(
    () => reconcileForm8908PwaAttachments(reused, context()),
    Error,
    "distinct Form 7220 PDF and review",
  );
  const repeatedBytes = structuredClone(source());
  repeatedBytes.homes[1].form7220!.pdf_sha256 =
    repeatedBytes.homes[0].form7220!.pdf_sha256;
  assertThrows(
    () => reconcileForm8908PwaAttachments(repeatedBytes, context()),
    Error,
    "distinct Form 7220 PDF and review",
  );
  const repeatedReview = structuredClone(source());
  repeatedReview.homes[1].form7220!.review_reference =
    repeatedReview.homes[0].form7220!.review_reference;
  repeatedReview.homes[1].form7220!.signed_no_alterations_statement
    .form7220_review_reference = repeatedReview.homes[0].form7220!
      .review_reference;
  assertThrows(
    () => reconcileForm8908PwaAttachments(repeatedReview, context()),
    Error,
    "distinct Form 7220 PDF and review",
  );
});
