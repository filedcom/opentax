import { assertEquals, assertThrows } from "@std/assert";
import { form8949Pdf } from "./f8949.ts";

const ordinary = {
  part: "D",
  description: "Stock sale",
  date_acquired: "2008-01-01",
  date_sold: "2025-06-20",
  proceeds: 10_000,
  cost_basis: 2_000,
  gain_loss: 8_000,
  is_long_term: true,
};

Deno.test("Form 8949 PDF rejects section 1202 from canonical and raw sources", () => {
  for (const marked of [
    { ...ordinary, adjustment_codes: "Q", adjustment_amount: -4_000 },
    { ...ordinary, qsbs_code: "Q1" },
    { ...ordinary, qsbs_amount: 4_000 },
  ]) {
    assertThrows(
      () => form8949Pdf.projectFields?.({ transaction: marked }, {}),
      Error,
      "Form 6251 line 2h preference",
    );
    assertThrows(
      () => form8949Pdf.instances?.({ transaction: [ordinary, marked] }),
      Error,
      "Form 6251 line 2h preference",
    );
    assertThrows(
      () => form8949Pdf.projectFields?.({}, {
        f8949: { f8949s: [marked] },
      }),
      Error,
      "Form 6251 line 2h preference",
    );
  }
});

Deno.test("Form 8949 PDF rejects raw row shapes that bypass canonical calculation", () => {
  assertThrows(
    () => form8949Pdf.projectFields?.({}, {
      f8949: { f8949s: [ordinary] },
    }),
    Error,
    "computed canonical transaction rows",
  );
  assertThrows(
    () => form8949Pdf.projectFields?.({
      transactions: [{ adjustmentCode: "Q" }],
    }, {}),
    Error,
    "computed canonical transaction rows",
  );
  assertThrows(
    () => form8949Pdf.instances?.({
      transactions: [{ adjustmentCode: "W" }],
    }),
    Error,
    "computed canonical transaction rows",
  );
  const safe = { transaction: { ...ordinary, adjustment_codes: "W" } };
  assertEquals(form8949Pdf.projectFields?.(safe, {}), safe);
  assertEquals(form8949Pdf.instances?.(safe)?.length, 1);
});
