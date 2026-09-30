import { assertEquals, assertThrows } from "@std/assert";
import { f5471, FilingCategory } from "./index.ts";

const minimalItem = {
  foreign_corp_name: "Example Foreign Corp",
  country_of_incorporation: "Ireland",
  filing_category: FilingCategory.Category5,
};

Deno.test("Form 5471 intake requires a corporation and filing category", () => {
  assertEquals(f5471.inputSchema.safeParse({ f5471s: [] }).success, false);
  assertEquals(
    f5471.inputSchema.safeParse({
      f5471s: [{ ...minimalItem, filing_category: "9" }],
    }).success,
    false,
  );
  assertEquals(
    f5471.inputSchema.safeParse({ f5471s: [minimalItem] }).success,
    true,
  );
});

Deno.test("Form 5471 rejects sparse information-only input before calculation", () => {
  assertThrows(
    () =>
      f5471.compute(
        { taxYear: 2025, formType: "f1040" },
        { f5471s: [minimalItem] },
      ),
    Error,
    "native Form 5471 schedules before calculation",
  );
});

Deno.test("Form 5471 never deposits section 951(a) or asserted GILTI into line 8z", () => {
  assertThrows(
    () =>
      f5471.compute(
        { taxYear: 2025, formType: "f1040" },
        {
          f5471s: [{
            ...minimalItem,
            subpart_f_income: 10_000,
            gilti_inclusion: 5_000,
          }],
        },
      ),
    Error,
    "Form 8992 when applicable",
  );
});
