import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { inputSchema } from "../../../../nodes/inputs/general/filing/amendment_request/index.ts";
import { f1040_2025 } from "../../../index.ts";
import { buildMefXml } from "../../../mef/builder.ts";
import { buildPending } from "../../../mef/execution/pending.ts";
import { buildPdfBytes } from "../../../pdf/builder.ts";
import { pdfReviewFixtures } from "../../../pdf/review-fixtures.ts";

const fixture = pdfReviewFixtures.find((item) =>
  item.id === "single-w2-refund"
)!;

Deno.test("amendment intent stays separate from the original return graph", async () => {
  const baseline = f1040_2025.executeReturn(fixture.inputs);
  assertEquals(baseline.diagnostics, []);
  const source = {
    requests: [{
      affected_tax_year: 2024,
      correction_summary:
        "Foreign tax redetermination requires prior-year review",
      request_reference: "amend-2024-foreign-tax",
      prior_return_reference: "accepted-2024-return",
      request_confirmed: true as const,
    }],
  };
  const result = f1040_2025.executeReturn({
    ...fixture.inputs,
    amendment_request: source,
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040, baseline.pending.f1040);
  const pending = buildPending(result.pending);
  assertEquals(pending.amendment_request, source);
  const message = "Amendment request needs an accepted prior return";
  assertThrows(() => buildMefXml(pending, fixture.filer), Error, message);
  await assertRejects(
    () => buildPdfBytes(pending, fixture.filer),
    Error,
    message,
  );
});

Deno.test("amendment intake requires one confirmed request per affected year", () => {
  const request = {
    affected_tax_year: 2024,
    correction_summary: "Reviewed correction",
    request_reference: "amend-2024",
    prior_return_reference: "accepted-2024-return",
    request_confirmed: true as const,
  };
  assertEquals(inputSchema.safeParse({ requests: [request] }).success, true);
  assertEquals(
    inputSchema.safeParse({
      requests: [request, { ...request, request_reference: "second-copy" }],
    }).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse({
      requests: [{ ...request, correction_summary: "  " }],
    }).success,
    false,
  );
});

Deno.test("malformed retained amendment intent cannot disappear", async () => {
  const baseline = f1040_2025.executeReturn(fixture.inputs);
  assertEquals(baseline.diagnostics, []);
  const pending = {
    ...buildPending(baseline.pending),
    amendment_request: { requests: [] },
  };
  const message = "Amendment request needs an accepted prior return";
  assertThrows(() => buildMefXml(pending, fixture.filer), Error, message);
  await assertRejects(
    () => buildPdfBytes(pending, fixture.filer),
    Error,
    message,
  );
});
