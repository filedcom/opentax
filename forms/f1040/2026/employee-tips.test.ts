import { assertEquals, assertThrows } from "@std/assert";
import { FilingStatus } from "../nodes/types.ts";
import { reconcileEmployeeTips2026 } from "./employee-tips.ts";

const filer = {
  filingStatus: FilingStatus.Single,
  taxpayerSsn: "111223333",
};

Deno.test("2026 employee tips use larger W-2 or Form 4137 amount per employer", () => {
  const result = reconcileEmployeeTips2026({
    ...filer,
    sources: [
      {
        source: "w2",
        employer_ein: "12-3456789",
        employer_name: "Cafe One",
        employee_ssn: "111223333",
        amount: 3_000,
        occupation_codes: ["102"],
      },
      {
        source: "form4137",
        employer_ein: "123456789",
        employer_name: "Cafe One",
        recipient: "taxpayer",
        amount: 5_000,
      },
      {
        source: "w2",
        employer_ein: "98-7654321",
        employer_name: "Cafe Two",
        employee_ssn: "111223333",
        amount: 2_000,
        occupation_codes: ["103"],
      },
    ],
  });
  assertEquals(result.rows.map((row) => row.amountUsed), [5_000, 2_000]);
  assertEquals(result.totalBeforeCap, 7_000);
});

Deno.test("2026 Form 4137 APPLIED FOR matches an unambiguous W-2 name", () => {
  const result = reconcileEmployeeTips2026({
    ...filer,
    sources: [
      {
        source: "w2",
        employer_ein: "12-3456789",
        employer_name: "Cafe One",
        employee_ssn: "111223333",
        amount: 3_000,
        occupation_codes: ["102"],
      },
      {
        source: "form4137",
        employer_name: " CAFE   ONE ",
        recipient: "taxpayer",
        amount: 4_000,
      },
    ],
  });
  assertEquals(result.rows.length, 1);
  assertEquals(result.rows[0].amountUsed, 4_000);
});

Deno.test("2026 mixed-occupation tips require a qualified breakdown", () => {
  const source = {
    source: "w2" as const,
    employer_ein: "12-3456789",
    employer_name: "Cafe One",
    employee_ssn: "111223333",
    amount: 3_000,
    occupation_codes: ["102", "000"],
  };
  assertThrows(
    () =>
      reconcileEmployeeTips2026({
        ...filer,
        sources: [source],
      }),
    Error,
    "breakdown",
  );
  const result = reconcileEmployeeTips2026({
    ...filer,
    sources: [{ ...source, qualified_amount: 2_000 }],
  });
  assertEquals(result.totalBeforeCap, 2_000);
});

Deno.test("2026 employee tips reject unrelated filer and ambiguous employer", () => {
  assertThrows(
    () =>
      reconcileEmployeeTips2026({
        ...filer,
        sources: [{
          source: "w2",
          employer_name: "Cafe One",
          employee_ssn: "999887777",
          amount: 100,
          occupation_codes: ["102"],
        }],
      }),
    Error,
    "does not match",
  );
  assertThrows(
    () =>
      reconcileEmployeeTips2026({
        ...filer,
        sources: [
          {
            source: "w2",
            employer_ein: "12-3456789",
            employer_name: "Cafe One",
            employee_ssn: "111223333",
            amount: 100,
            occupation_codes: ["102"],
          },
          {
            source: "w2",
            employer_ein: "98-7654321",
            employer_name: "Cafe One",
            employee_ssn: "111223333",
            amount: 100,
            occupation_codes: ["102"],
          },
          {
            source: "form4137",
            employer_name: "Cafe One",
            recipient: "taxpayer",
            amount: 200,
          },
        ],
      }),
    Error,
    "multiple W-2 EINs",
  );
});

Deno.test("2026 Form 4137 mixed or unmatched occupations need explicit qualification", () => {
  const w2 = {
    source: "w2" as const,
    employer_ein: "12-3456789",
    employer_name: "Cafe One",
    employee_ssn: "111223333",
    amount: 3_000,
    occupation_codes: ["102", "000"],
    qualified_amount: 2_000,
  };
  const form4137 = {
    source: "form4137" as const,
    employer_ein: "12-3456789",
    employer_name: "Cafe One",
    recipient: "taxpayer" as const,
    amount: 5_000,
  };
  assertThrows(
    () =>
      reconcileEmployeeTips2026({
        ...filer,
        sources: [w2, form4137],
      }),
    Error,
    "occupation codes or a qualified-tip breakdown",
  );
  assertEquals(
    reconcileEmployeeTips2026({
      ...filer,
      sources: [w2, { ...form4137, qualified_amount: 4_000 }],
    }).totalBeforeCap,
    4_000,
  );
  assertThrows(
    () =>
      reconcileEmployeeTips2026({
        ...filer,
        sources: [form4137],
      }),
    Error,
    "occupation codes or a qualified-tip breakdown",
  );
});
