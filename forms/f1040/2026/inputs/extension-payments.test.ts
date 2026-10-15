import { assertEquals, assertThrows } from "@std/assert";
import { calculateExtensionPayments2026 } from "./extension-payments.ts";
import { form1062ExtensionReceipt2026 } from "./form1062-graph.fixture.ts";
import { executeDraftSources2026 } from "../execute.ts";
import { landGraphFixture2026 } from "./land-graph.fixture.ts";

Deno.test("2026 extension receipts reuse payment routing and reach settlement without a farmland election", async () => {
  const claim = form1062ExtensionReceipt2026();
  const r = calculateExtensionPayments2026({
    ...claim,
    taxpayer_ssn: "123-45-6789",
  });
  assertEquals(r.line10_amount_paid_extension, 1000);
  const graph = await executeDraftSources2026({
    ...landGraphFixture2026(45000, [], 40000),
    extension_payments: claim,
  });
  assertEquals(graph.diagnostics, []);
  assertEquals(graph.pending.f1040.line24b_form1062, 0);
  assertEquals(graph.pending.f1040.line31_other_payments, 1000);
  assertEquals(graph.pending.f1040.line37_amount_owed, 4771);
});

Deno.test("2026 extension receipts reject wrong owners, duplicate confirmations and unsupported years or dates", () => {
  const claim = form1062ExtensionReceipt2026(),
    source = { ...claim, taxpayer_ssn: "123456789" };
  assertThrows(
    () =>
      calculateExtensionPayments2026({ ...source, taxpayer_ssn: "987654321" }),
    Error,
    "another return",
  );
  assertThrows(
    () =>
      calculateExtensionPayments2026({ ...source, spouse_ssn: "987654321" }),
    Error,
    "another return",
  );
  claim.claim.payments.push(structuredClone(claim.claim.payments[0]));
  assertThrows(
    () => calculateExtensionPayments2026(source),
    Error,
    "Duplicate",
  );
  claim.claim.payments.pop();
  claim.claim.payments[0].evidence.payment_date = "2027-04-16";
  assertThrows(() => calculateExtensionPayments2026(source));
  claim.claim.payments[0].evidence.payment_date = "2027-02-30";
  assertThrows(() => calculateExtensionPayments2026(source));
  claim.claim.payments[0].evidence.payment_date = "2026-04-15";
  assertThrows(() => calculateExtensionPayments2026(source));
  claim.claim.payments[0].evidence.payment_date = "2027-04-15";
  claim.claim.payments[0].evidence.amount = .25;
  assertThrows(() => calculateExtensionPayments2026(source));
});
