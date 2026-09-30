import { assertEquals, assertThrows } from "@std/assert";
import { scheduleDPdf } from "./schedule_d.ts";

Deno.test("Schedule D PDF groups computed Form 8949 sales by printed reporting row", () => {
  const rows = [
    { part: "B", proceeds: 2_000, cost_basis: 1_000, gain_loss: 1_000 },
    { part: "H", proceeds: 3_000, cost_basis: 2_000, gain_loss: 1_000 },
    { part: "E", proceeds: 5_000, cost_basis: 2_000, gain_loss: 3_000 },
    { part: "K", proceeds: 4_000, cost_basis: 3_000, gain_loss: 1_000 },
    { part: "D", proceeds: 2_000, cost_basis: 1_000, gain_loss: 1_000 },
    {
      part: "D",
      proceeds: 2_000,
      cost_basis: 1_000,
      adjustment_codes: "W",
      adjustment_amount: 100,
      gain_loss: 1_100,
    },
  ];
  const projected = scheduleDPdf.projectFields?.({}, {
    form8949: { transaction: rows },
  });
  assertEquals(projected?.print_line2_proceeds, 5_000);
  assertEquals(projected?.print_line2_gain, 2_000);
  assertEquals(projected?.print_line9_proceeds, 9_000);
  assertEquals(projected?.print_line9_gain, 4_000);
  assertEquals(projected?.print_line8b_gain, 1_100);
  assertEquals(projected?.print_line8b_adjustment, 100);
  assertEquals(projected?.print_line8b_proceeds, 2_000);
});

Deno.test("Schedule D PDF rejects a sale with missing computed gain", () => {
  assertThrows(
    () =>
      scheduleDPdf.projectFields?.({}, {
        form8949: {
          transaction: [{ part: "F", proceeds: 2_000, cost_basis: 1_000 }],
        },
      }),
    Error,
    "numeric Form 8949 gain_loss",
  );
});
