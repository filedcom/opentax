import { assertThrows } from "@std/assert";
import { assertDirectCapitalGainDistributionSource } from "./line7a-source-reconciliation.ts";
import { irs1040 } from "./mef/forms/f1040.ts";
import { irs1040Pdf } from "./pdf/forms/f1040.ts";

Deno.test("direct Form 1040 capital-gain distributions replay retained payer and child rows", () => {
  const pending = {
    f1099div: {
      f1099divs: [
        { isNominee: false, box11: false, box1a: 0, box2a: 700 },
        {
          isNominee: true,
          box11: false,
          box1a: 100,
          box2a: 500,
          nominee_distribution: { box1a: 100, box2a: 200 },
        },
      ],
    },
    form8814: { items: [{ line10: 80 }] },
  };
  assertDirectCapitalGainDistributionSource(
    { line7a_cap_gain_distrib: 1_080 },
    pending,
  );
  assertThrows(
    () =>
      assertDirectCapitalGainDistributionSource(
        { line7a_cap_gain_distrib: 1_081 },
        pending,
      ),
    Error,
    "differs from retained",
  );
  assertThrows(
    () =>
      assertDirectCapitalGainDistributionSource(
        { line7a_cap_gain_distrib: 1_080 },
        { form8814: pending.form8814 },
      ),
    Error,
    "differs from retained",
  );
  assertThrows(
    () =>
      assertDirectCapitalGainDistributionSource(
        { line7a_cap_gain_distrib: 1_080 },
        { f1099div: pending.f1099div, form8814: { items: [{}] } },
      ),
    Error,
    "calculated Form 8814",
  );
});

Deno.test("native and PDF Form 1040 reject a changed direct capital-gain distribution", () => {
  const pending = {
    f1099div: {
      f1099divs: [{ isNominee: false, box11: false, box1a: 0, box2a: 100 }],
    },
  };
  const fields = { line7a_cap_gain_distrib: 100 };
  irs1040.build(fields, { pending });
  irs1040Pdf.projectFields?.(fields, pending);
  assertThrows(
    () => irs1040.build({ line7a_cap_gain_distrib: 101 }, { pending }),
    Error,
    "line 7a differs",
  );
  assertThrows(
    () => irs1040Pdf.projectFields?.({ line7a_cap_gain_distrib: 101 }, pending),
    Error,
    "line 7a differs",
  );
});
