import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { bindForm8886PacketToNativeDocuments } from "./handoff.ts";
import { buildForm8886Documents } from "./document.ts";
import { validateForm8886NativeBinding } from "./native-binding.ts";
import { disclosureFixture } from "./source.fixture.ts";
function fixture() {
  const original = buildForm8886Documents(
    {
      ...disclosureFixture,
      transaction_steps: "Reviewed purchase and disposition steps. ".repeat(60),
      parties: [{
        ...disclosureFixture.parties[0],
        involvement_description: "The adviser provided financing advice. "
          .repeat(60),
      }],
    },
    "111223333",
    1,
    1,
  );
  const replacements = new Map([
    [original.continuationId!, "FinalExpected8"] as const,
    ...original.generalContinuations.map((
      row,
      index,
    ) => [row.documentId, `FinalGeneral${10 + index}`] as const),
  ]);
  function linked(xml: string, id: string) {
    return xml.replace(
      /^<([A-Za-z0-9]+)([^>]*)>/,
      (_match, tag: string, attrs: string) =>
        `<${tag} documentId="${id}"${
          attrs.replace(/\sdocumentId="[^"]*"/, "")
        }>`,
    ).replace(
      /referenceDocumentId="([^"]+)"/g,
      (_match, values: string) =>
        `referenceDocumentId="${
          values.split(" ").map((value) => replacements.get(value)).join(" ")
        }"`,
    );
  }
  const final = {
    formXml: linked(original.formXml, "FinalForm4"),
    continuationId: "FinalExpected8",
    continuationXml: linked(original.continuationXml!, "FinalExpected8"),
    generalContinuations: original.generalContinuations.map((row, index) => ({
      documentId: `FinalGeneral${10 + index}`,
      xml: linked(row.xml, `FinalGeneral${10 + index}`),
    })),
  };
  return { original, final };
}

Deno.test("Form 8886 finalization refuses a structurally copied or fabricated preparation packet", async () => {
  const { original, final } = fixture();
  const fabricated = {
    documents: original,
    xml: original.formXml,
    getPdf: () => new Uint8Array(),
    metadata: {
      disclosure_id: "synthetic-disclosure",
      taxpayer_name: "Example Alex",
      initial_year_filer: true,
      source_sha256: "a".repeat(64),
      xml_sha256: "b".repeat(64),
      pdf_sha256: "c".repeat(64),
      page_count: 2,
    },
  };
  await assertRejects(
    () => bindForm8886PacketToNativeDocuments(fabricated, final),
    Error,
    "authentic prepared packet",
  );
});
Deno.test("Form 8886 final native binding permits only allocated IDs and retains every exact disclosure byte", () => {
  const { original, final } = fixture(),
    before = JSON.stringify({ original, final }),
    bound = validateForm8886NativeBinding(original, final);
  assertEquals(
    bound.xml,
    [
      final.formXml,
      final.continuationXml,
      ...final.generalContinuations.map((row) => row.xml),
    ].join(""),
  );
  assertEquals(bound.documentIds, [
    "FinalForm4",
    "FinalExpected8",
    "FinalGeneral10",
  ]);
  assertEquals(JSON.stringify({ original, final }), before);
  assertEquals(
    Object.isFrozen(bound) && Object.isFrozen(bound.documents) &&
      Object.isFrozen(bound.documents.generalContinuations) &&
      bound.documents.generalContinuations.every(Object.isFrozen) &&
      Object.isFrozen(bound.documentIds),
    true,
  );
  final.generalContinuations[0].xml = "Changed caller";
  assertEquals(
    bound.documents.generalContinuations[0].xml === "Changed caller",
    false,
  );
});
Deno.test("Form 8886 final binding rejects changed text, amounts and continuation associations", () => {
  const { original, final } = fixture();
  for (
    const formXml of [
      final.formXml.replace("2000000", "2000001"),
      final.formXml.replace(
        "Disclosure taxpayer SSN 111223333.",
        "Disclosure taxpayer SSN 444556666.",
      ),
      final.formXml.replace("Disclosure taxpayer SSN 111223333. ", ""),
      final.formXml.replace("FinalExpected8", "FinalGeneral10"),
      final.formXml.replace("Reviewed", "Altered"),
    ]
  ) {
    assertThrows(
      () => validateForm8886NativeBinding(original, { ...final, formXml }),
      Error,
      "differs from the prepared source",
    );
  }
  assertThrows(
    () =>
      validateForm8886NativeBinding(original, {
        ...final,
        continuationXml: final.continuationXml.replace("Reviewed", "Altered"),
      }),
    Error,
    "differs from the prepared source",
  );
  const general = final.generalContinuations.map((row) => ({
    ...row,
    xml: row.xml.replace("adviser", "stranger"),
  }));
  assertThrows(
    () =>
      validateForm8886NativeBinding(original, {
        ...final,
        generalContinuations: general,
      }),
    Error,
    "differs from the prepared source",
  );
});
Deno.test("Form 8886 final binding rejects missing documents and contradictory or duplicate root IDs", () => {
  const { original, final } = fixture();
  assertThrows(
    () =>
      validateForm8886NativeBinding(original, {
        ...final,
        continuationXml: undefined,
        continuationId: undefined,
      }),
    Error,
    "document set differs",
  );
  assertThrows(
    () =>
      validateForm8886NativeBinding(original, {
        ...final,
        generalContinuations: [],
      }),
    Error,
    "document set differs",
  );
  assertThrows(
    () =>
      validateForm8886NativeBinding(original, {
        ...final,
        continuationId: "Another",
      }),
    Error,
    "continuation ID differs",
  );
  assertThrows(
    () =>
      validateForm8886NativeBinding(original, {
        ...final,
        formXml: final.formXml.replace("FinalForm4", "FinalExpected8"),
      }),
    Error,
    "IDs collide",
  );
  assertThrows(
    () =>
      validateForm8886NativeBinding(original, {
        ...final,
        formXml: final.formXml.replace(' documentId="FinalForm4"', ""),
      }),
    Error,
    "exactly one document ID",
  );
  assertThrows(
    () =>
      validateForm8886NativeBinding(original, {
        ...final,
        formXml: final.formXml.replace(
          ' documentId="FinalForm4"',
          ' documentId="FinalForm4" documentId="Other"',
        ),
      }),
    Error,
    "exactly one document ID",
  );
});
Deno.test("Form 8886 final binding handles a disclosure with no continuations without inventing documents", () => {
  const original = buildForm8886Documents(disclosureFixture, "111223333", 1, 1);
  const final = {
    formXml: original.formXml.replace(
      "<IRS8886>",
      '<IRS8886 documentId="FinalSimple3">',
    ),
    generalContinuations: [],
  };
  const result = validateForm8886NativeBinding(original, final);
  assertEquals(result.documentIds, ["FinalSimple3"]);
  assertEquals(result.documents.continuationId, undefined);
});
