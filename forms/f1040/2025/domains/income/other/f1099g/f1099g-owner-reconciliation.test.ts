import { assertThrows } from "@std/assert";
import { irs1040 } from "../../../../mef/forms/general/return-assembly/f1040.ts";
import { irs1040Pdf } from "../../../../pdf/forms/general/return-assembly/f1040.ts";

const filed = {
  filing_status: "single",
  taxpayer_ssn: "111223333",
  line8_additional_income: 100,
};

function unemployment(recipient_tin?: string) {
  return {
    f1099g: {
      f1099gs: [{
        payer_name: "State Agency",
        payer_tin: "123456789",
        source_document_reference: "g-copy-1",
        recipient_tin,
        box_1_unemployment: 100,
      }],
    },
  };
}

Deno.test("positive 1099-G unemployment owner is checked by native and PDF Form 1040", () => {
  const source = unemployment("111223333");
  irs1040.build(filed, { pending: source });
  irs1040Pdf.projectFields?.(filed, source);
  irs1040.build({ ...filed, taxpayer_ssn: "111-22-3333" }, { pending: source });
  irs1040Pdf.projectFields?.({ ...filed, taxpayer_ssn: "111-22-3333" }, source);
  for (const pending of [unemployment(), unemployment("999887777")]) {
    const expected = pending.f1099g.f1099gs[0].recipient_tin
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

Deno.test("positive 1099-G needs an identified payer in both Form 1040 exports", () => {
  const pending = {
    f1099g: {
      f1099gs: [{
        ...unemployment("111223333").f1099g.f1099gs[0],
        payer_name: "   ",
        payer_tin: undefined,
      }],
    },
  };
  const message = "Positive Form 1099-G needs an identified payer";
  assertThrows(() => irs1040.build(filed, { pending }), Error, message);
  assertThrows(
    () => irs1040Pdf.projectFields?.(filed, pending),
    Error,
    message,
  );
});

Deno.test("one issued 1099-G reference without an account cannot replay changed income in native or PDF", () => {
  const [issued] = unemployment("111223333").f1099g.f1099gs;
  const pending = {
    f1099g: {
      f1099gs: [issued, { ...issued, box_1_unemployment: 200 }],
    },
  };
  for (
    const build of [
      () => irs1040.build(filed, { pending }),
      () => irs1040Pdf.projectFields?.(filed, pending),
    ]
  ) {
    assertThrows(
      build,
      Error,
      "repeats the same issued-copy source reference",
    );
  }
});

Deno.test("one missing payer TIN cannot split duplicate 1099-G income in native or PDF", () => {
  const pending = {
    f1099g: {
      f1099gs: [
        {
          payer_name: "State Agency",
          payer_tin: "123456789",
          recipient_tin: "111223333",
          box_1_unemployment: 500,
        },
        {
          payer_name: " state   AGENCY ",
          recipient_tin: "111223333",
          box_1_unemployment: 600,
        },
      ],
    },
  };
  const reason =
    "1099-G has multiple positive payer copies without account or issued source reference";
  assertThrows(() => irs1040.build(filed, { pending }), Error, reason);
  assertThrows(
    () => irs1040Pdf.projectFields?.(filed, pending),
    Error,
    reason,
  );
});

Deno.test("joint spouse 1099-G belongs on MFJ return only", () => {
  const source = unemployment("444556666");
  const joint = {
    ...filed,
    filing_status: "mfj",
    spouse_ssn: "444556666",
  };
  irs1040.build(joint, { pending: source });
  irs1040Pdf.projectFields?.(joint, source);
  irs1040.build({ ...joint, spouse_ssn: "444-55-6666" }, { pending: source });
  irs1040Pdf.projectFields?.({ ...joint, spouse_ssn: "444-55-6666" }, source);
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

Deno.test("positive state refund 1099-G needs the filed recipient", () => {
  const source = {
    f1099g: {
      f1099gs: [{
        box_2_state_refund: 100,
        box_2_prior_year_itemized: true,
        box_2_taxable_recovery_verified_amount: 100,
        box_2_recovery_workpaper_reference: "refund-workpaper",
      }],
    },
  };
  assertThrows(
    () => irs1040.build(filed, { pending: source }),
    Error,
    "needs a recipient TIN",
  );
  assertThrows(
    () => irs1040Pdf.projectFields?.(filed, source),
    Error,
    "needs a recipient TIN",
  );
});
