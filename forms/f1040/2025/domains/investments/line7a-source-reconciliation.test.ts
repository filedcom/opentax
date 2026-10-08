import { assertThrows } from "@std/assert";
import { assertDirectCapitalGainDistributionSource } from "./line7a-source-reconciliation.ts";
import { irs1040 } from "../../mef/forms/identity/f1040.ts";
import { irs1040Pdf } from "../../pdf/forms/identity/f1040.ts";

Deno.test("direct Form 1040 capital-gain distributions replay retained payer and child rows", () => {
  const pending = {
    f1099div: {
      f1099divs: [
        {
          isNominee: false,
          box11: false,
          box1a: 0,
          box2a: 700,
          recipient_tin: "111223333",
        },
        {
          isNominee: true,
          box11: false,
          box1a: 100,
          box2a: 500,
          recipient_tin: "111223333",
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
  assertThrows(
    () =>
      assertDirectCapitalGainDistributionSource(
        {},
        { form8814: pending.form8814 },
      ),
    Error,
    "omits sourced capital-gain distributions",
  );
});

Deno.test("native and PDF Form 1040 reject a changed direct capital-gain distribution", () => {
  const pending = {
    f1099div: {
      f1099divs: [{
        isNominee: false,
        box11: false,
        box1a: 0,
        box2a: 100,
        payerName: "Example Dividend Fund",
        recipient_tin: "111223333",
      }],
    },
  };
  const fields = { taxpayer_ssn: "111223333", line7a_cap_gain_distrib: 100 };
  irs1040.build(fields, { pending });
  irs1040Pdf.projectFields?.(fields, pending);
  assertThrows(
    () =>
      irs1040.build({ ...fields, line7a_cap_gain_distrib: 101 }, { pending }),
    Error,
    "line 7a differs",
  );
  assertThrows(
    () =>
      irs1040Pdf.projectFields?.(
        { ...fields, line7a_cap_gain_distrib: 101 },
        pending,
      ),
    Error,
    "line 7a differs",
  );
});

Deno.test("native and PDF Form 1040 reject an omitted sourced capital-gain distribution", () => {
  const pending = {
    f1099div: {
      f1099divs: [{
        isNominee: false,
        box11: false,
        box1a: 0,
        box2a: 100,
        payerName: "Example Dividend Fund",
        recipient_tin: "111223333",
      }],
    },
  };
  const fields = { taxpayer_ssn: "111223333" };
  const message = "omits sourced capital-gain distributions";
  assertThrows(() => irs1040.build(fields, { pending }), Error, message);
  assertThrows(
    () => irs1040Pdf.projectFields?.(fields, pending),
    Error,
    message,
  );
  assertThrows(
    () =>
      assertDirectCapitalGainDistributionSource(
        { line7a_cap_gain_distrib: 0 },
        pending,
      ),
    Error,
    message,
  );
  assertThrows(
    () =>
      assertDirectCapitalGainDistributionSource(
        fields,
        { ...pending, schedule_d: { line13_cap_gain_distrib: 100 } },
      ),
    Error,
    message,
  );
  const finalized = {
    ...pending,
    schedule_d: {
      line13_cap_gain_distrib: 100,
      print_line16_combined: 100,
    },
  };
  assertDirectCapitalGainDistributionSource(fields, finalized);
  const scheduleDFields = { ...fields, line7_capital_gain: 100 };
  irs1040.build(scheduleDFields, { pending: finalized });
  irs1040Pdf.projectFields?.(scheduleDFields, finalized);
  const omittedFromScheduleD = {
    ...finalized,
    schedule_d: { ...finalized.schedule_d, line13_cap_gain_distrib: 0 },
  };
  assertThrows(
    () => irs1040.build(scheduleDFields, { pending: omittedFromScheduleD }),
    Error,
    "Schedule D line 13 omits retained",
  );
  assertThrows(
    () => irs1040Pdf.projectFields?.(scheduleDFields, omittedFromScheduleD),
    Error,
    "Schedule D line 13 omits retained",
  );
  assertThrows(
    () =>
      assertDirectCapitalGainDistributionSource(fields, {
        ...omittedFromScheduleD,
      }),
    Error,
    "Schedule D line 13 omits retained",
  );
  assertThrows(
    () =>
      assertDirectCapitalGainDistributionSource({}, {
        form8814: { items: [{ line10: 80 }] },
        schedule_d: { line13_form8814: 0, print_line16_combined: 0 },
      }),
    Error,
    "Schedule D line 13 omits retained",
  );
});
