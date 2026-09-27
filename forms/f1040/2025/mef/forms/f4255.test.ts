import { assertStringIncludes, assertThrows } from "@std/assert";
import { form4255 } from "./f4255.ts";

export const form4255Row = {
  source_document_reference: "2024 Form 3800 and recapture workpaper",
  credit_line: "2a" as const,
  prior_credit_claimed: 10_000,
  gross_epe: 8_000,
  gross_epe_applied_regular_tax: 3_000,
  non_epe_applied_regular_tax: 1_000,
  recaptured_total: 2_000,
  recaptured_carryover: 500,
  recaptured_non_epe_applied: 0 as const,
  recaptured_gross_epe_applied: 0 as const,
  recaptured_net_epe: 1_500,
  excessive_payment_net_epe: 300,
  excessive_payment_other: 0 as const,
  excessive_payment_20_percent: 60,
};

Deno.test("Form 4255 native MeF retains row 2a and its Part I totals", () => {
  const xml = form4255.build({ rows: [form4255Row] }, {
    pending: {
      schedule2: {
        line1d_form4255_net_epe: 1_500,
        line1e_form4255_excessive_payment: 300,
        line1f_form4255_20_percent_ep: 60,
      },
    },
  });
  assertStringIncludes(xml, "<IRS4255>");
  assertStringIncludes(xml, "<Form8933PYCreditsGrp>");
  assertStringIncludes(xml, "<PYNetEPEAmt>5000</PYNetEPEAmt>");
  assertStringIncludes(
    xml,
    "<RcptrPrtnNetEPECrAmt>1500</RcptrPrtnNetEPECrAmt>",
  );
  assertStringIncludes(xml, "<NetEPEPortionAmt>300</NetEPEPortionAmt>");
  assertStringIncludes(xml, "<EP20PctOweAmt>60</EP20PctOweAmt>");
  assertStringIncludes(xml, "<TotalAmountsPYCreditsGrp>");
});

Deno.test("Form 4255 native MeF rejects Schedule 2 totals that differ from source", () => {
  assertThrows(
    () =>
      form4255.build({ rows: [form4255Row] }, {
        pending: { schedule2: { line1d_form4255_net_epe: 1_499 } },
      }),
    Error,
    "differs from Schedule 2",
  );
});
