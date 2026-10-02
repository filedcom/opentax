import { assertThrows } from "@std/assert";
import { irs1040 } from "./mef/forms/f1040.ts";
import { irs1040Pdf } from "./pdf/forms/f1040.ts";

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
    "1099-NEC repeats the same payer, recipient, and issued source reference",
  );
  assertThrows(
    () => irs1040Pdf.projectFields?.(filed, pending),
    Error,
    "1099-NEC repeats the same payer, recipient, and issued source reference",
  );
});
