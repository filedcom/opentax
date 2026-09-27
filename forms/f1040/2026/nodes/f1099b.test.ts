import { assertEquals, assertThrows } from "@std/assert";
import { f1099b_2026 } from "./f1099b.ts";

const context = { taxYear: 2026, formType: "f1040" };
const basic = {
  payer_name: "Broker",
  box1a_description: "10 shares XYZ",
  box1b_date_acquired: "2026-01-10",
  box1c_date_sold: "2026-06-10",
  box1d_proceeds: 1_200,
  box1e_reported_basis: 1_000,
  box2_term: "short" as const,
  box12_basis_reported_to_irs: true,
};

function capitalTransaction(extra: Record<string, unknown> = {}) {
  const outputs = f1099b_2026.compute(context, {
    f1099bs: [{ ...basic, ...extra }],
  }).outputs;
  return outputs.find((output) => output.nodeType === "form8949")?.fields
    .transaction as Record<string, unknown>;
}

Deno.test("TY2026 1099-B box 12 selects reported-basis category, not QOF", () => {
  assertEquals(capitalTransaction(), {
    part: "A",
    description: "10 shares XYZ",
    date_acquired: "2026-01-10",
    date_sold: "2026-06-10",
    proceeds: 1_200,
    cost_basis: 1_000,
    gain_loss: 200,
    is_long_term: false,
  });
  assertEquals(
    capitalTransaction({
      box2_term: "long",
      box12_basis_reported_to_irs: false,
      taxpayer_cost_basis: 800,
    }).part,
    "E",
  );
});

Deno.test("TY2026 1099-B preserves reported basis and corrects it in column g", () => {
  assertEquals(capitalTransaction({ taxpayer_cost_basis: 800 }), {
    part: "A",
    description: "10 shares XYZ",
    date_acquired: "2026-01-10",
    date_sold: "2026-06-10",
    proceeds: 1_200,
    cost_basis: 1_000,
    adjustment_codes: "B",
    adjustment_amount: 200,
    gain_loss: 400,
    is_long_term: false,
  });
  const combined = capitalTransaction({
    selling_expenses_not_in_box1d: 50,
    box1g_wash_sale_loss_disallowed: 100,
  });
  assertEquals(combined.adjustment_codes, "EW");
  assertEquals(combined.adjustment_amount, 50);
  assertEquals(combined.gain_loss, 250);
});

Deno.test("TY2026 1099-B withholding reaches Form 1040", () => {
  const outputs = f1099b_2026.compute(context, {
    f1099bs: [{ ...basic, box4_federal_withholding: 75 }],
  }).outputs;
  assertEquals(
    outputs.find((output) => output.nodeType === "f1040")?.fields,
    { line25b_withheld_1099: 75 },
  );
});

Deno.test("TY2026 1099-B rejects unbuilt source branches", () => {
  for (
    const [extra, message] of [
      [{ box3_qof_disposition: true }, "collectibles or QOF"],
      [{ box3_collectibles: true }, "collectibles or QOF"],
      [{ box1f_accrued_market_discount: 50 }, "accrued market discount"],
      [{ box2_term: "ordinary" }, "short- or long-term"],
      [
        { box12_basis_reported_to_irs: true, box1e_reported_basis: undefined },
        "reported basis checkbox",
      ],
    ] as const
  ) {
    assertThrows(
      () => f1099b_2026.compute(context, { f1099bs: [{ ...basic, ...extra }] }),
      Error,
      message,
    );
  }
});
