import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { inputSchema } from "../../../../nodes/inputs/income/retirement/benefit_1042s/index.ts";
import { f1040_2025 } from "../../../index.ts";
import { buildMefXml } from "../../../mef/builder.ts";
import { buildPending } from "../../../mef/execution/pending.ts";
import { buildPdfBytes } from "../../../pdf/builder.ts";
import { pdfReviewFixtures } from "../../../pdf/review-fixtures.ts";

const fixture = pdfReviewFixtures.find((item) =>
  item.id === "single-w2-refund"
)!;

const copies = [
  {
    kind: "ssa_1042s" as const,
    recipient_tin: "111223333",
    source_document_reference: "issued-SSA-1042S",
    reported_gross_benefits: 5_000,
    reported_federal_withholding: 1_500,
    resident_refund_claim_requested: true,
  },
  {
    kind: "rrb_1042s" as const,
    recipient_tin: "111223333",
    source_document_reference: "issued-RRB-1042S",
    reported_gross_benefits: 3_000,
    reported_federal_withholding: 900,
  },
];

Deno.test("SSA/RRB-1042-S copies stay separate from ordinary benefit income and withholding", async () => {
  const baseline = f1040_2025.executeReturn(fixture.inputs);
  assertEquals(baseline.diagnostics, []);
  const source = { copies };
  const result = f1040_2025.executeReturn({
    ...fixture.inputs,
    benefit_1042s: source,
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040, baseline.pending.f1040);
  const pending = buildPending(result.pending);
  assertEquals(pending.benefit_1042s, source);
  const message = "SSA/RRB-1042-S benefit copy needs recipient status";
  assertThrows(() => buildMefXml(pending, fixture.filer), Error, message);
  await assertRejects(
    () => buildPdfBytes(pending, fixture.filer),
    Error,
    message,
  );
});

Deno.test("SSA/RRB-1042-S intake needs distinct issued copies and valid recipients", () => {
  assertEquals(inputSchema.safeParse({ copies }).success, true);
  assertEquals(
    inputSchema.safeParse({
      copies: [copies[0], {
        ...copies[1],
        source_document_reference: copies[0].source_document_reference,
      }],
    }).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse({
      copies: [{ ...copies[0], recipient_tin: "11122" }],
    }).success,
    false,
  );
});

Deno.test("malformed retained SSA/RRB-1042-S source cannot disappear", async () => {
  const baseline = f1040_2025.executeReturn(fixture.inputs);
  assertEquals(baseline.diagnostics, []);
  const pending = {
    ...buildPending(baseline.pending),
    benefit_1042s: { copies: [] },
  };
  const message = "SSA/RRB-1042-S benefit copy needs recipient status";
  assertThrows(() => buildMefXml(pending, fixture.filer), Error, message);
  await assertRejects(
    () => buildPdfBytes(pending, fixture.filer),
    Error,
    message,
  );
});
