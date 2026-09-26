import { assertEquals, assertThrows } from "@std/assert";
import { form6781Pdf } from "./f6781.ts";

Deno.test("Form 6781 printable projection puts losses and gains in distinct columns", () => {
  const pages = form6781Pdf.instances!({
    accounts: [
      { account_identification: "Broker A", gain_loss: 12_000 },
      { account_identification: "Broker B", gain_loss: -2_000 },
    ],
  });
  assertEquals(pages.length, 1);
  assertEquals(pages[0].totalLoss, 2_000);
  assertEquals(pages[0].totalGain, 12_000);
  assertEquals(pages[0].net, 10_000);
  assertEquals(pages[0].shortTerm, 4_000);
  assertEquals(pages[0].longTerm, 6_000);
  assertEquals(pages[0].accounts, [
    { account_identification: "Broker A", loss: undefined, gain: 12_000 },
    { account_identification: "Broker B", loss: 2_000, gain: undefined },
  ]);
});

Deno.test("Form 6781 printable projection rejects more rows than fit", () => {
  assertThrows(
    () =>
      form6781Pdf.instances!({
        accounts: [
          { account_identification: "A", gain_loss: 1 },
          { account_identification: "B", gain_loss: 2 },
          { account_identification: "C", gain_loss: 3 },
          { account_identification: "D", gain_loss: 4 },
        ],
      }),
    Error,
    "continuation",
  );
});
