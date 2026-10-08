import { assertRejects, assertThrows } from "@std/assert";
import { irs1040 } from "../../../mef/forms/identity/f1040.ts";
import { irs1040Pdf } from "../../../pdf/forms/identity/f1040.ts";
import { buildMefXml } from "../../../mef/builder.ts";
import { buildPdfBytes } from "../../../pdf/builder.ts";
import { testFiler } from "../../../mef/execution/test-filer.ts";

const filed = {
  filing_status: "single",
  taxpayer_ssn: "111-22-3333",
};

function retained(recipient_ssn?: string) {
  return {
    f1099nec: {
      f1099necs: [{
        payer_name: "Payer",
        payer_tin: "123456789",
        recipient_ssn,
        box1_nec: 100,
        for_routing: "form_8919",
      }],
    },
  };
}

Deno.test("positive 1099-NEC income owner is checked by native and PDF Form 1040", () => {
  const source = retained("111223333");
  irs1040.build(filed, { pending: source });
  irs1040Pdf.projectFields?.(filed, source);
  for (const pending of [retained(), retained("999887777")]) {
    const expected = pending.f1099nec.f1099necs[0].recipient_ssn
      ? "recipient SSN must match"
      : "needs a recipient SSN";
    assertThrows(() => irs1040.build(filed, { pending }), Error, expected);
    assertThrows(
      () => irs1040Pdf.projectFields?.(filed, pending),
      Error,
      expected,
    );
  }
});

Deno.test("joint spouse 1099-NEC belongs on MFJ return only", () => {
  const source = retained("444-55-6666");
  const joint = {
    ...filed,
    filing_status: "mfj",
    spouse_ssn: "444556666",
  };
  irs1040.build(joint, { pending: source });
  irs1040Pdf.projectFields?.(joint, source);
  assertThrows(
    () =>
      irs1040.build({ ...joint, filing_status: "mfs" }, { pending: source }),
    Error,
    "recipient SSN must match",
  );
  assertThrows(
    () =>
      irs1040Pdf.projectFields?.({ ...joint, filing_status: "mfs" }, source),
    Error,
    "recipient SSN must match",
  );
});

Deno.test("positive 1099-NEC withholding cannot belong to another recipient", () => {
  const source = {
    f1099nec: {
      f1099necs: [{
        payer_name: "Payer",
        payer_tin: "123456789",
        recipient_ssn: "999887777",
        box4_federal_withheld: 20,
      }],
    },
  };
  assertThrows(
    () => irs1040.build(filed, { pending: source }),
    Error,
    "recipient SSN must match",
  );
  assertThrows(
    () => irs1040Pdf.projectFields?.(filed, source),
    Error,
    "recipient SSN must match",
  );
});

Deno.test("1099-NEC box 4 needs an identified issued payer in both Form 1040 exports", () => {
  const issued = {
    payer_name: "Payer",
    payer_tin: "123456789",
    recipient_ssn: "111223333",
    box4_federal_withheld: 20,
  };
  for (
    const changed of [
      { ...issued, payer_name: " " },
      { ...issued, payer_tin: "unknown" },
    ]
  ) {
    const pending = { f1099nec: { f1099necs: [changed] } };
    assertThrows(
      () => irs1040.build(filed, { pending }),
      Error,
      "1099-NEC positive amounts need an identified payer",
    );
    assertThrows(
      () => irs1040Pdf.projectFields?.(filed, pending),
      Error,
      "1099-NEC positive amounts need an identified payer",
    );
  }
});

Deno.test("one identified 1099-NEC issued copy cannot replay changed income at native or PDF export", () => {
  const issued = {
    payer_name: "Payer",
    payer_tin: "123456789",
    recipient_ssn: "111223333",
    source_document_reference: "2025 issuer copy 1",
    box1_nec: 100,
    for_routing: "form_8919" as const,
  };
  const pending = {
    f1099nec: {
      f1099necs: [issued, { ...issued, box1_nec: 150 }],
    },
  };
  assertThrows(
    () => irs1040.build(filed, { pending }),
    Error,
    "1099-NEC repeats the same issued-copy source reference",
  );
  assertThrows(
    () => irs1040Pdf.projectFields?.(filed, pending),
    Error,
    "1099-NEC repeats the same issued-copy source reference",
  );
  const secondPayer = {
    f1099nec: {
      f1099necs: [issued, {
        ...issued,
        payer_name: "Second Payer",
        payer_tin: "987654321",
        account_number: "SECOND-ACCOUNT",
      }],
    },
  };
  assertThrows(
    () => irs1040.build(filed, { pending: secondPayer }),
    Error,
    "1099-NEC repeats the same issued-copy source reference",
  );
  assertThrows(
    () => irs1040Pdf.projectFields?.(filed, secondPayer),
    Error,
    "1099-NEC repeats the same issued-copy source reference",
  );
});

Deno.test("ambiguous repeated 1099-NEC copies reject full native and PDF export", async () => {
  const issued = {
    payer_name: "Payer",
    payer_tin: "123456789",
    recipient_ssn: testFiler().primarySSN,
    box1_nec: 100,
    for_routing: "form_8919" as const,
  };
  const pending = {
    f1099nec: { f1099necs: [issued, { ...issued, box1_nec: 150 }] },
  };
  const message =
    "multiple positive payer copies without account or issued source reference";
  assertThrows(() => buildMefXml(pending, testFiler()), Error, message);
  await assertRejects(
    () => buildPdfBytes(pending, testFiler()),
    Error,
    message,
  );
});
