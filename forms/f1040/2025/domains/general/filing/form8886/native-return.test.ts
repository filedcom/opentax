import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import {
  documentId,
  type MefDocumentFragment,
  validateDocumentReferences,
} from "../../../../mef/identity/document-identity.ts";
import { buildForm8886Documents } from "./document.ts";
import {
  form8886NativeReturnFragments,
  Form8886PendingKey,
} from "./native-return.ts";
import { disclosureFixture } from "./source.fixture.ts";
type Prepared = Parameters<typeof form8886NativeReturnFragments>[0];
// Synthetic serializer inputs only; the retained real-template replay covers factory binding.
function fixture(): Prepared {
  return {
    source_sha256: "a".repeat(64),
    return_pending_sha256: "b".repeat(64),
    filer_sha256: "f".repeat(64),
    packets: [1, 2].map((number) => {
      const source = {
        ...disclosureFixture,
        transaction_steps: "Reviewed financing and disposition steps. ".repeat(
          60,
        ),
        parties: disclosureFixture.parties.map((party) => ({
          ...party,
          involvement_description: "The advisor supplied financing advice. "
            .repeat(60),
        })),
      };
      const documents = buildForm8886Documents(
        source,
        source.taxpayer_ssn,
        number,
        2,
      );
      return {
        return_pending_sha256: "b".repeat(64),
        disclosure_source_sha256: "c".repeat(64),
        sourceLinks: [],
        packet: {
          documents,
          xml: documents.formXml,
          getPdf: () => new Uint8Array(),
          metadata: {
            disclosure_id: `synthetic-${number}`,
            taxpayer_name: "Example Alex",
            initial_year_filer: true,
            source_sha256: "c".repeat(64),
            xml_sha256: "d".repeat(64),
            pdf_sha256: "e".repeat(64),
            page_count: 2,
          },
        },
      };
    }),
  };
}
function wholeReturn(fragments: readonly MefDocumentFragment[]) {
  const byTag = (tag: string) => fragments.filter((row) => row.tag === tag);
  return [
    { pendingKey: "f1040", tag: "IRS1040", xml: "<IRS1040/>" },
    ...byTag("IRS8886"),
    { pendingKey: "form8949", tag: "IRS8949", xml: "<IRS8949/>" },
    ...byTag("ContF8886ExpctTaxBnftExpln"),
    {
      pendingKey: "other_details",
      tag: "GeneralDependencySmall",
      xml: "<GeneralDependencySmall/>",
    },
    ...byTag("GeneralDependencySmall"),
  ];
}
function allocation(fragments: readonly MefDocumentFragment[]) {
  const ids = (key: Form8886PendingKey) =>
    fragments.flatMap((row, index) =>
      row.pendingKey === key ? [documentId(row.tag, index)] : []
    );
  return {
    form8886: ids(Form8886PendingKey.Form),
    form8886_expected_benefits: ids(Form8886PendingKey.ExpectedBenefits),
    form8886_additional_details: ids(Form8886PendingKey.AdditionalDetails),
  };
}
Deno.test("Form 8886 separates native roots into ReturnData slots and links whole-return IDs for repeated copies", () => {
  const prepared = fixture(),
    before = JSON.stringify(prepared),
    discovery = form8886NativeReturnFragments(prepared);
  assertEquals(discovery.map((row) => row.tag), [
    "IRS8886",
    "IRS8886",
    "ContF8886ExpctTaxBnftExpln",
    "ContF8886ExpctTaxBnftExpln",
    "GeneralDependencySmall",
    "GeneralDependencySmall",
  ]);
  assertEquals(
    discovery.every((row) => !/^<[^>]*\bdocumentId=/.test(row.xml)),
    true,
  );
  const ids = allocation(wholeReturn(discovery)),
    linked = form8886NativeReturnFragments(prepared, ids);
  validateDocumentReferences(wholeReturn(linked));
  for (const index of [0, 1]) {
    assertStringIncludes(
      linked[index].xml,
      `referenceDocumentId="${ids.form8886_expected_benefits[index]}"`,
    );
    assertStringIncludes(
      linked[index].xml,
      `referenceDocumentId="${ids.form8886_additional_details[index]}"`,
    );
  }
  assertStringIncludes(
    linked[0].xml,
    "ContinuationOfForm8886ExpectedTaxBenefitsExplanation",
  );
  assertEquals(JSON.stringify(prepared), before);
  assertEquals(Object.isFrozen(linked) && linked.every(Object.isFrozen), true);
});
Deno.test("Form 8886 native final linking rejects missing, duplicate or extra allocated IDs", () => {
  const prepared = fixture(),
    ids = allocation(wholeReturn(form8886NativeReturnFragments(prepared)));
  assertThrows(
    () =>
      form8886NativeReturnFragments(prepared, {
        ...ids,
        form8886_expected_benefits: [],
      }),
    Error,
    "document set changed",
  );
  assertThrows(
    () =>
      form8886NativeReturnFragments(prepared, {
        ...ids,
        form8886_additional_details: [
          ...ids.form8886_additional_details,
          "Extra",
        ],
      }),
    Error,
    "document set changed",
  );
  assertThrows(
    () =>
      form8886NativeReturnFragments(prepared, {
        ...ids,
        form8886: ["Same", "Same"],
      }),
    Error,
    "distinct",
  );
  assertThrows(() =>
    form8886NativeReturnFragments(prepared, {
      ...ids,
      form8886: ["Invalid ID", "Valid"],
    })
  );
});
Deno.test("Form 8886 whole-return verification rejects temporary or incorrectly allocated continuation IDs", () => {
  const prepared = fixture(),
    discovery = form8886NativeReturnFragments(prepared);
  assertThrows(
    () => validateDocumentReferences(wholeReturn(discovery)),
    Error,
    "has no document",
  );
  const ids = allocation(wholeReturn(discovery)),
    wrong = form8886NativeReturnFragments(prepared, {
      ...ids,
      form8886_expected_benefits: ["Missing1", "Missing2"],
    });
  assertThrows(
    () => validateDocumentReferences(wholeReturn(wrong)),
    Error,
    "has no document",
  );
});
Deno.test("Form 8886 native integration refuses root substitutions and unknown references", () => {
  const prepared = fixture(), packet = prepared.packets[0].packet;
  const substituted = {
    ...packet,
    documents: { ...packet.documents, formXml: "<IRS1040/>" },
  };
  assertThrows(
    () =>
      form8886NativeReturnFragments({
        ...prepared,
        packets: [{ ...prepared.packets[0], packet: substituted }],
      }),
    Error,
    "unexpected native document root",
  );
  const unknown = {
    ...packet,
    documents: {
      ...packet.documents,
      formXml: packet.documents.formXml.replace(
        /referenceDocumentId="[^"]+"/,
        'referenceDocumentId="Unknown"',
      ),
    },
  };
  assertThrows(
    () =>
      form8886NativeReturnFragments({
        ...prepared,
        packets: [{ ...prepared.packets[0], packet: unknown }],
      }),
    Error,
    "unknown continuation",
  );
});
Deno.test("Form 8886 native integration rejects duplicated packet continuation identities", () => {
  const prepared = fixture();
  assertThrows(
    () =>
      form8886NativeReturnFragments({
        ...prepared,
        packets: [prepared.packets[0], prepared.packets[0]],
      }),
    Error,
    "IDs collide",
  );
});
