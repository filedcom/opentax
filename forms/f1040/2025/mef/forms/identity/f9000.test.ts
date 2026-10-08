import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { type FilerIdentity, FilingStatus } from "../../../../mef/header.ts";
import { inputSchema } from "../../../../nodes/inputs/f9000/index.ts";
import { f1040_2025 } from "../../../index.ts";
import { buildPending } from "../../execution/pending.ts";
import { form9000Pdf } from "../../../pdf/forms/identity/f9000.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../pdf/builder.ts";
import { pdfReviewFixtures } from "../../../pdf/review-fixtures.ts";
import { buildForm9000 } from "./f9000.ts";

const base = pdfReviewFixtures.find((fixture) =>
  fixture.id === "single-w2-refund"
)!;
const request = {
  person: "taxpayer" as const,
  alternative_media_code: "01" as const,
  request_confirmed_by_person: true as const,
  request_record_reference: "Taxpayer accessible notice request",
};

Deno.test("Form 9000 request reaches native return and one filled-PDF page", async () => {
  const result = f1040_2025.executeReturn({
    ...base.inputs,
    f9000: { requests: [request] },
  });
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  const xml = f1040_2025.buildMefXml(pending, base.filer);
  assertStringIncludes(
    xml,
    "<PersonNm>Alex Example</PersonNm><SSN>111223333</SSN><AlternativeMediaCd>01</AlternativeMediaCd></IRS9000>",
  );
  const pageOrigins: PdfPageOrigin[] = [];
  const pdf = await buildPdfBytes(
    pending,
    base.filer,
    ".pdf-cache",
    undefined,
    pageOrigins,
  );
  assertEquals(pdf.length > 0, true);
  // The descriptor retains the form page and omits standalone-only address,
  // signature, and three pages of instructions.
  assertEquals(form9000Pdf.pageIndices?.({}), [0]);
  assertEquals(form9000Pdf.instances?.({ requests: [request] }, base.filer), [{
    name: "Alex Example",
    ssn: "111223333",
    selected_code: "01",
  }]);
  assertEquals(pageOrigins.filter((page) => page.formKey === "f9000"), [{
    pageNumber: 3,
    formKey: "f9000",
    formCopy: 1,
  }]);
});

Deno.test("Form 9000 supports distinct joint owners and rejects invalid requests", () => {
  const filer: FilerIdentity = {
    ...base.filer,
    filingStatus: FilingStatus.MarriedFilingJointly,
    spouse: {
      ssn: "444556666",
      firstName: "Sam",
      lastName: "Example",
      nameControl: "EXAM",
    },
  };
  const source = {
    requests: [
      request,
      {
        person: "spouse" as const,
        alternative_media_code: "05" as const,
        request_confirmed_by_person: true as const,
        request_record_reference: "Spouse accessible notice request",
      },
    ],
  };
  assertEquals(buildForm9000(source, { filer }), [
    "<IRS9000><PersonNm>Alex Example</PersonNm><SSN>111223333</SSN><AlternativeMediaCd>01</AlternativeMediaCd></IRS9000>",
    "<IRS9000><PersonNm>Sam Example</PersonNm><SSN>444556666</SSN><AlternativeMediaCd>05</AlternativeMediaCd></IRS9000>",
  ]);
  assertEquals(form9000Pdf.instances?.(source, filer)?.length, 2);
  assertEquals(
    inputSchema.safeParse({ requests: [request, request] }).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse({
      requests: [{ ...request, alternative_media_code: "99" }],
    }).success,
    false,
  );
  assertThrows(
    () =>
      buildForm9000({ requests: [source.requests[1]] }, { filer: base.filer }),
    Error,
    "joint Form 1040",
  );
});

Deno.test("joint Form 9000 fixture retains two native and two printable owner copies", async () => {
  const joint = pdfReviewFixtures.find((fixture) =>
    fixture.id === "joint-two-w2s-form9000"
  )!;
  const result = f1040_2025.executeReturn({ ...joint.inputs });
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  const xml = f1040_2025.buildMefXml(pending, joint.filer);
  assertEquals((xml.match(/<IRS9000 documentId=/g) ?? []).length, 2);
  assertStringIncludes(
    xml,
    "<SSN>111223333</SSN><AlternativeMediaCd>01</AlternativeMediaCd>",
  );
  assertStringIncludes(
    xml,
    "<SSN>444556666</SSN><AlternativeMediaCd>05</AlternativeMediaCd>",
  );
  const origins: PdfPageOrigin[] = [];
  await buildPdfBytes(pending, joint.filer, ".pdf-cache", undefined, origins);
  assertEquals(origins.filter((page) => page.formKey === "f9000"), [{
    pageNumber: 3,
    formKey: "f9000",
    formCopy: 1,
  }, {
    pageNumber: 4,
    formKey: "f9000",
    formCopy: 2,
  }]);
});
