import { assertEquals, assertThrows } from "@std/assert";
import { documentId, validateDocumentReferences } from "./document-identity.ts";
import { assertPreparedDocumentInventory } from "./prepared-attachment-manifest.ts";
import type { MefBundle } from "./builder.ts";

Deno.test("MeF document IDs stay unique for repeated form copies", () => {
  const fragments = Array.from({ length: 12 }, () => ({
    pendingKey: "w2",
    tag: "IRSW2",
    xml: "<IRSW2/>",
  }));
  validateDocumentReferences(fragments);
  assertEquals(documentId("IRSW2", 1), "IRSW21");
  assertEquals(documentId("IRSW2", 11), "IRSW211");
});

Deno.test("MeF document identity rejects distinct roots whose truncated IDs collide", () => {
  const first = `${"A".repeat(28)}1x`;
  const second = `${"A".repeat(28)}x`;
  assertEquals(documentId(first, 1), documentId(second, 11));
  const fragments = Array.from({ length: 12 }, (_, index) => ({
    pendingKey: "synthetic",
    tag: index === 1 ? first : index === 11 ? second : "IRSW2",
    xml: index === 1
      ? `<${first}/>`
      : index === 11
      ? `<${second}/>`
      : "<IRSW2/>",
  }));
  assertThrows(
    () => validateDocumentReferences(fragments),
    Error,
    "document IDs collide",
  );
});

Deno.test("repeated MeF form references keep their declared document name", () => {
  const badReference =
    '<Statement referenceDocumentId="IRS24391 IRS24392" referenceDocumentName="IRS1099G"/>';
  const goodReference =
    '<Statement referenceDocumentId="IRS24391 IRS24392" referenceDocumentName="IRS2439"/>';
  const repeatedReference =
    '<Statement referenceDocumentId="IRS24391 IRS24391" referenceDocumentName="IRS2439"/>';
  const unnamedReference =
    '<Statement referenceDocumentId="IRS24391 IRS24392"/>';
  const fragments = (reference: string) => [{
    pendingKey: "f1040",
    tag: "IRS1040",
    xml: `<IRS1040>${reference}</IRS1040>`,
  }, {
    pendingKey: "f2439",
    tag: "IRS2439",
    xml: "<IRS2439/>",
  }, {
    pendingKey: "f2439",
    tag: "IRS2439",
    xml: "<IRS2439/>",
  }];
  validateDocumentReferences(fragments(goodReference));
  assertThrows(
    () => validateDocumentReferences(fragments(badReference)),
    Error,
    "referenceDocumentName differs",
  );
  assertThrows(
    () => validateDocumentReferences(fragments(repeatedReference)),
    Error,
    "referenceDocumentId list repeats one document",
  );
  assertThrows(
    () => validateDocumentReferences(fragments(unnamedReference)),
    Error,
    "referenceDocumentName differs",
  );

  const bundle = (reference: string): MefBundle => ({
    xml:
      `<Return><ReturnHeader binaryAttachmentCnt="0"/><ReturnData documentCnt="3"><IRS1040 documentId="IRS10400">${reference}</IRS1040><IRS2439 documentId="IRS24391"/><IRS2439 documentId="IRS24392"/></ReturnData></Return>`,
    attachments: [],
    pending: {},
    sourceSha256: "",
    xmlSha256: "",
    attachmentSha256ByFileName: {},
  });
  assertPreparedDocumentInventory(bundle(goodReference));
  assertThrows(
    () => assertPreparedDocumentInventory(bundle(badReference)),
    Error,
    "document count, order, IDs, references",
  );
  assertThrows(
    () => assertPreparedDocumentInventory(bundle(repeatedReference)),
    Error,
    "document count, order, IDs, references",
  );
  assertThrows(
    () => assertPreparedDocumentInventory(bundle(unnamedReference)),
    Error,
    "document count, order, IDs, references",
  );
});

Deno.test("MeF multi-name references identify every referenced document root", () => {
  const fragments = (referenceName: string) => [{
    pendingKey: "f1040",
    tag: "IRS1040",
    xml:
      `<IRS1040><Amount referenceDocumentId="IRS24391 BinaryAttachment2" referenceDocumentName="${referenceName}">10</Amount></IRS1040>`,
  }, {
    pendingKey: "f2439",
    tag: "IRS2439",
    xml: "<IRS2439/>",
  }, {
    pendingKey: "binaryAttachment",
    tag: "BinaryAttachment",
    xml: "<BinaryAttachment/>",
  }];
  validateDocumentReferences(fragments("IRS2439 BinaryAttachment"));
  assertThrows(
    () => validateDocumentReferences(fragments("IRS2439 IRS1099G")),
    Error,
    "referenceDocumentName differs",
  );

  const bundle = (referenceName: string): MefBundle => ({
    xml:
      `<Return><ReturnHeader binaryAttachmentCnt="1"/><ReturnData documentCnt="3"><IRS1040 documentId="IRS10400"><Amount referenceDocumentId="IRS24391 BinaryAttachment2" referenceDocumentName="${referenceName}">10</Amount></IRS1040><IRS2439 documentId="IRS24391"/><BinaryAttachment documentId="BinaryAttachment2"/></ReturnData></Return>`,
    attachments: [{
      fileName: "Statement.pdf",
      description: "Statement",
      bytes: new Uint8Array(),
    }],
    pending: {},
    sourceSha256: "",
    xmlSha256: "",
    attachmentSha256ByFileName: {},
  });
  assertPreparedDocumentInventory(bundle("IRS2439 BinaryAttachment"));
  assertThrows(
    () => assertPreparedDocumentInventory(bundle("IRS2439 IRS1099G")),
    Error,
    "document count, order, IDs, references",
  );
});

Deno.test("Form 8814 child-interest reference uses its exact IRS schema name", () => {
  const childId = documentId("ChildTaxableInterestStmt", 1);
  const fragments = (name: string) => [{
    pendingKey: "form8814",
    tag: "IRS8814",
    xml:
      `<IRS8814><ChildTaxableInterestAmt referenceDocumentId="${childId}" referenceDocumentName="${name}">100</ChildTaxableInterestAmt></IRS8814>`,
  }, {
    pendingKey: "child_taxable_interest_statement",
    tag: "ChildTaxableInterestStmt",
    xml: "<ChildTaxableInterestStmt/>",
  }];
  validateDocumentReferences(fragments("ChildTaxableInterestStatement"));
  for (const wrong of ["ChildTaxableInterestStmt", "ArbitraryStatement"]) {
    assertThrows(
      () => validateDocumentReferences(fragments(wrong)),
      Error,
      "referenceDocumentName differs",
    );
  }
});

Deno.test("Schedule F statement references use exact IRS names despite shortened roots", () => {
  const statements = [
    ["CCCLoanDetailCashMethodStmt", "CCCLoanDetailCashMethodStatement"],
    ["CCCLoanDetailAccrualMethodStmt", "CCCLoanDetailAccrualMethodStatement"],
    [
      "PostponementCropInsDsstrStmt",
      "PostponementOfCropInsuranceAndDisasterPaymentsStatement",
    ],
  ] as const;
  for (const [root, name] of statements) {
    const id = documentId(root, 1);
    const fragments = (referenceName: string) => [{
      pendingKey: "schedule_f",
      tag: "IRS1040ScheduleF",
      xml:
        `<IRS1040ScheduleF><Statement referenceDocumentId="${id}" referenceDocumentName="${referenceName}"/></IRS1040ScheduleF>`,
    }, {
      pendingKey: "statement",
      tag: root,
      xml: `<${root}/>`,
    }];
    validateDocumentReferences(fragments(name));
    assertThrows(
      () => validateDocumentReferences(fragments(root)),
      Error,
      "referenceDocumentName differs",
    );
  }
});

Deno.test("prepared MeF inventory counts only direct ReturnData documents", () => {
  const bundle: MefBundle = {
    xml:
      '<Return><ReturnHeader binaryAttachmentCnt="0"/><ReturnData documentCnt="2"><IRS1040 documentId="IRS10400"><Decoy documentId="Decoy1"/></IRS1040></ReturnData></Return>',
    attachments: [],
    pending: {},
    sourceSha256: "",
    xmlSha256: "",
    attachmentSha256ByFileName: {},
  };
  assertThrows(
    () => assertPreparedDocumentInventory(bundle),
    Error,
    "document count, order, IDs, references",
  );
});
