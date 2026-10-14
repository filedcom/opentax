import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { scheduleDPdf } from "./schedule_d.ts";
import { buildPdfBytes } from "../../../builder.ts";

Deno.test("Schedule D PDF finalized K-1 capital amounts cannot change or disappear", () => {
  const pending = {
    f1040: {},
    k1_partnership: {
      k1_partnerships: [{
        partnership_name: "Example Partnership",
        partnership_ein: "123456789",
        source_document_reference: "2025 issued K-1",
        box8_net_st_cap_gain: 100,
        box9a_net_lt_cap_gain: 200,
      }],
    },
  };
  for (
    const fields of [
      { line_5_k1_st: 99, line_12_k1_lt: 200 },
      { line_5_k1_st: 100 },
    ]
  ) {
    assertThrows(
      () => scheduleDPdf.projectFields?.(fields, pending),
      Error,
      "issued K-1 capital source",
    );
  }
});

Deno.test("PDF bundle rejects partnership K-1 capital when Schedule D is omitted", async () => {
  await assertRejects(
    () =>
      buildPdfBytes({
        k1_partnership: {
          k1_partnerships: [{
            partnership_name: "Capital Partnership",
            partnership_ein: "123456789",
            source_document_reference: "2025 issued Capital Partnership K-1",
            box8_net_st_cap_gain: 100,
          }],
        },
      }, undefined),
    Error,
    "issued K-1 capital source",
  );
});

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
