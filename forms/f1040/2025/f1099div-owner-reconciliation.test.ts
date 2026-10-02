import { assertThrows } from "@std/assert";
import { irs1040 } from "./mef/forms/f1040.ts";
import { irs1040Pdf } from "./pdf/forms/f1040.ts";

const filed = {
  filing_status: "single",
  taxpayer_ssn: "111223333",
  line3b_ordinary_dividends: 100,
};

function retained(recipient_tin?: string) {
  return {
    f1099div: {
      f1099divs: [{
        payerName: "Fund",
        payerTin: "123456789",
        source_document_reference: "div-copy-1",
        recipient_tin,
        isNominee: false,
        box11: false,
        box1a: 100,
      }],
    },
  };
}

Deno.test("positive 1099-DIV owner is checked by native and PDF Form 1040", () => {
  const source = retained("111223333");
  irs1040.build(filed, { pending: source });
  irs1040Pdf.projectFields?.(filed, source);
  for (const pending of [retained(), retained("999887777")]) {
    const expected = pending.f1099div.f1099divs[0].recipient_tin
      ? "recipient TIN must match"
      : "needs a recipient TIN";
    assertThrows(() => irs1040.build(filed, { pending }), Error, expected);
    assertThrows(
      () => irs1040Pdf.projectFields?.(filed, pending),
      Error,
      expected,
    );
  }
});

Deno.test("joint spouse 1099-DIV belongs on MFJ return only", () => {
  const source = retained("444556666");
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
    "recipient TIN must match",
  );
  assertThrows(
    () =>
      irs1040Pdf.projectFields?.({ ...joint, filing_status: "mfs" }, source),
    Error,
    "recipient TIN must match",
  );
});

Deno.test("capital-gain-only and tax-exempt 1099-DIV copies require owners", () => {
  for (const box of [{ box2a: 75 }, { box12: 50 }]) {
    const pending = {
      f1099div: {
        f1099divs: [{ isNominee: false, box11: false, box1a: 0, ...box }],
      },
    };
    assertThrows(
      () => irs1040.build(filed, { pending }),
      Error,
      "needs a recipient TIN",
    );
    assertThrows(
      () => irs1040Pdf.projectFields?.(filed, pending),
      Error,
      "needs a recipient TIN",
    );
  }
});
