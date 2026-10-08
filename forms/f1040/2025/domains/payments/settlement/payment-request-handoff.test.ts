import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { inputSchema } from "../../../../nodes/inputs/payments/settlement/payment_request/index.ts";
import { f1040_2025 } from "../../../index.ts";
import { buildMefXml } from "../../../mef/builder.ts";
import { buildPending } from "../../../mef/execution/pending.ts";
import { buildPdfBytes } from "../../../pdf/builder.ts";
import { pdfReviewFixtures } from "../../../pdf/review-fixtures.ts";

const fixture = pdfReviewFixtures.find((item) =>
  item.id === "single-w2-refund"
)!;

Deno.test("each payment-request kind stays in pending and stops both final exports", async () => {
  const baseline = f1040_2025.executeReturn(fixture.inputs);
  assertEquals(baseline.diagnostics, []);
  for (
    const kind of [
      "current_return_balance_due",
      "future_estimated_tax",
      "section965_installment",
      "qualified_farmland_installment",
    ] as const
  ) {
    const source = {
      requests: [{
        kind,
        amount: 100,
        tax_year: kind === "future_estimated_tax" ? 2026 : 2025,
        requested_payment_date: "2026-10-15",
        request_reference: `request-${kind}`,
        request_confirmed: true as const,
      }],
    };
    const result = f1040_2025.executeReturn({
      ...fixture.inputs,
      payment_request: source,
    });
    assertEquals(result.diagnostics, []);
    assertEquals(result.pending.f1040, baseline.pending.f1040);
    const pending = buildPending(result.pending);
    assertEquals(pending.payment_request, source);
    const message =
      "Payment request needs a separate authorized withdrawal workflow";
    assertThrows(() => buildMefXml(pending, fixture.filer), Error, message);
    await assertRejects(
      () => buildPdfBytes(pending, fixture.filer),
      Error,
      message,
    );
  }
});

Deno.test("malformed retained payment intent cannot be silently omitted", async () => {
  const baseline = f1040_2025.executeReturn(fixture.inputs);
  assertEquals(baseline.diagnostics, []);
  const pending = {
    ...buildPending(baseline.pending),
    payment_request: { requests: [] },
  };
  const message =
    "Payment request needs a separate authorized withdrawal workflow";
  assertThrows(() => buildMefXml(pending, fixture.filer), Error, message);
  await assertRejects(
    () => buildPdfBytes(pending, fixture.filer),
    Error,
    message,
  );
});

Deno.test("payment-request intake rejects duplicate identity and invalid date", () => {
  const request = {
    kind: "future_estimated_tax" as const,
    amount: 100,
    tax_year: 2026,
    requested_payment_date: "2026-10-15",
    request_reference: "estimate-q1",
    request_confirmed: true as const,
  };
  assertEquals(inputSchema.safeParse({ requests: [request] }).success, true);
  assertEquals(
    inputSchema.safeParse({ requests: [request, request] }).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse({
      requests: [{ ...request, requested_payment_date: "2026-02-30" }],
    }).success,
    false,
  );
});
