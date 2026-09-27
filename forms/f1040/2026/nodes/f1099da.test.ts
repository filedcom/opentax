import { assertEquals, assertThrows } from "@std/assert";
import { f1099da_2026 } from "./f1099da.ts";

const context = { taxYear: 2026, formType: "f1040" };
const basic = {
  filer_name: "Digital Broker",
  box1b_digital_asset_name: "Bitcoin",
  box1c_units: 0.25,
  box1d_date_acquired: "2026-01-01",
  box1e_date_sold: "2026-07-01",
  box1f_proceeds: 12_000,
  box1g_reported_basis: 10_000,
  box2_basis_reported_to_irs: true,
  box6_term: "short" as const,
};

function capitalTransaction(extra: Record<string, unknown> = {}) {
  const outputs = f1099da_2026.compute(context, {
    f1099das: [{ ...basic, ...extra }],
  }).outputs;
  return outputs.find((output) => output.nodeType === "form8949")?.fields
    .transaction as Record<string, unknown>;
}

Deno.test("TY2026 1099-DA reported basis selects Form 8949 G/J", () => {
  assertEquals(capitalTransaction(), {
    part: "G",
    description: "0.25 Bitcoin",
    date_acquired: "2026-01-01",
    date_sold: "2026-07-01",
    proceeds: 12_000,
    cost_basis: 10_000,
    gain_loss: 2_000,
    is_long_term: false,
  });
  assertEquals(
    capitalTransaction({ box6_term: "long" }).part,
    "J",
  );
  assertEquals(
    capitalTransaction({
      box2_basis_reported_to_irs: false,
      box6_term: "long",
      taxpayer_cost_basis: 9_000,
    }).part,
    "K",
  );
});

Deno.test("TY2026 1099-DA keeps broker basis and taxpayer correction separate", () => {
  const transaction = capitalTransaction({
    taxpayer_cost_basis: 8_000,
    transaction_costs_not_in_box1f: 100,
  });
  assertEquals(transaction.cost_basis, 10_000);
  assertEquals(transaction.adjustment_codes, "BE");
  assertEquals(transaction.adjustment_amount, 1_900);
  assertEquals(transaction.gain_loss, 3_900);
});

Deno.test("TY2026 1099-DA federal withholding reaches Form 1040", () => {
  const outputs = f1099da_2026.compute(context, {
    f1099das: [{ ...basic, box4_federal_withholding: 60 }],
  }).outputs;
  assertEquals(
    outputs.find((output) => output.nodeType === "f1040")?.fields,
    { line25b_withheld_1099: 60 },
  );
});

Deno.test("TY2026 1099-DA rejects aggregate, QOF, and missing basis cases", () => {
  for (
    const [extra, message] of [
      [{ box3b_qof_disposition: true }, "QOF disposition"],
      [{ box11a_aggregate_method: "stablecoins" }, "aggregate reporting"],
      [
        { box1g_reported_basis: undefined, taxpayer_cost_basis: undefined },
        "needs tax basis",
      ],
      [{ box6_term: "unknown" }, "short- or long-term"],
    ] as const
  ) {
    assertThrows(
      () =>
        f1099da_2026.compute(context, { f1099das: [{ ...basic, ...extra }] }),
      Error,
      message,
    );
  }
});
