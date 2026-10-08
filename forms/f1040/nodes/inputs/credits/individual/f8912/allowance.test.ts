import { assertEquals, assertThrows } from "@std/assert";
import { form8912AllowancePercentage } from "./allowance.ts";

const qecb = {
  bondType: "QECB" as const,
  issueDate: "2017-06-30",
  acquisitionDate: "2025-03-16",
  maturityDate: "2030-12-31",
};

Deno.test("Form 8912 allowance: only quarterly dates held by the taxpayer count", () => {
  assertEquals(
    form8912AllowancePercentage(qecb, {
      allowanceDates: ["2025-06-15", "2025-09-15"],
    }),
    0.5,
  );
  assertThrows(
    () =>
      form8912AllowancePercentage(qecb, {
        allowanceDates: ["2025-03-15"],
      }),
    Error,
    "outside the 2025 holding period",
  );
});

Deno.test("Form 8912 allowance: bond maturity prorates the final quarter", () => {
  assertEquals(
    form8912AllowancePercentage({
      ...qecb,
      acquisitionDate: "2024-01-01",
      maturityDate: "2025-07-23",
    }, {
      allowanceDates: ["2025-03-15", "2025-06-15", "2025-07-23"],
    }),
    0.6,
  );
});

Deno.test("Form 8912 allowance: year-end maturity can add a fifth partial date", () => {
  assertEquals(
    form8912AllowancePercentage({
      ...qecb,
      acquisitionDate: "2024-01-01",
      maturityDate: "2025-12-20",
    }, {
      allowanceDates: [
        "2025-03-15",
        "2025-06-15",
        "2025-09-15",
        "2025-12-15",
        "2025-12-20",
      ],
    }),
    1.01,
  );
});

Deno.test("Form 8912 allowance: sale is not an extra allowance date", () => {
  assertThrows(
    () =>
      form8912AllowancePercentage({
        ...qecb,
        acquisitionDate: "2024-01-01",
        dispositionDate: "2025-07-23",
        dispositionKind: "sale",
      }, { allowanceDates: ["2025-07-23"] }),
    Error,
    "needs bond maturity",
  );
});

Deno.test("Form 8912 allowance: redemption is a prorated final allowance date", () => {
  assertEquals(
    form8912AllowancePercentage({
      ...qecb,
      acquisitionDate: "2024-01-01",
      dispositionDate: "2025-07-23",
      dispositionKind: "redemption",
    }, {
      allowanceDates: ["2025-03-15", "2025-06-15", "2025-07-23"],
    }),
    0.6,
  );
});

Deno.test("Form 8912 allowance: BAB uses its actual interest payment date", () => {
  const bab = {
    bondType: "BAB" as const,
    issueDate: "2010-01-01",
    acquisitionDate: "2024-01-01",
    maturityDate: "2030-12-31",
  };
  assertEquals(
    form8912AllowancePercentage(bab, {
      allowanceDates: ["2025-06-30"],
      interestPaymentDate: "2025-06-30",
    }),
    1,
  );
  assertThrows(
    () =>
      form8912AllowancePercentage(bab, {
        allowanceDates: ["2025-06-15"],
        interestPaymentDate: "2025-06-30",
      }),
    Error,
    "must equal its interest payment date",
  );
});

Deno.test("Form 8912 allowance: pre-October 2008 QZAB has an annual date", () => {
  assertEquals(
    form8912AllowancePercentage({
      bondType: "QZAB",
      issueDate: "2000-05-01",
      acquisitionDate: "2024-01-01",
      maturityDate: "2030-12-31",
    }, { allowanceDates: ["2025-04-30"] }),
    1,
  );
});
