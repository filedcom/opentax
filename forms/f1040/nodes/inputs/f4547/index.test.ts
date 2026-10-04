import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { f1040_2025 } from "../../../2025/index.ts";
import { buildPending } from "../../../2025/mef/pending.ts";
import { pdfReviewFixtures } from "../../../2025/pdf/review-fixtures.ts";
import { inputSchema } from "./index.ts";

const base = pdfReviewFixtures.find((fixture) =>
  fixture.id === "single-w2-refund"
)!;
const request = {
  child_ssn: "444556666",
  initial_account_requested: true,
  pilot_contribution_requested: true,
  request_confirmed_by_authorized_person: true as const,
  request_record_reference: "Reviewed child election intent",
};

Deno.test("entered Form 4547 intent survives intake and blocks both final exports", async () => {
  const result = f1040_2025.executeReturn({
    ...base.inputs,
    f4547: { requests: [request] },
  });
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  assertEquals(pending.f4547, { requests: [request] });
  assertThrows(
    () => f1040_2025.buildMefXml(pending, base.filer),
    Error,
    "Form 4547 child-account election needs verified responsible-party authority",
  );
  await assertRejects(
    () => f1040_2025.buildPdfBytes(pending, base.filer),
    Error,
    "Form 4547 child-account election needs verified responsible-party authority",
  );
});

Deno.test("Form 4547 intake rejects empty, duplicate, and unconfirmed child requests", () => {
  const invalid = [
    { requests: [] },
    { requests: [request, request] },
    { requests: [{ ...request, child_ssn: "123" }] },
    {
      requests: [{
        ...request,
        initial_account_requested: false,
        pilot_contribution_requested: false,
      }],
    },
    {
      requests: [{ ...request, request_confirmed_by_authorized_person: false }],
    },
    { requests: [{ ...request, request_record_reference: " " }] },
    {
      requests: [{
        ...request,
        initial_account_requested: false,
      }],
    },
    {
      requests: [{
        ...request,
        initial_account_requested: false,
        existing_account_reference: " ",
      }],
    },
  ];
  for (const source of invalid) {
    assertEquals(inputSchema.safeParse(source).success, false);
  }
});

Deno.test("Form 4547 retains an existing account reference for a pilot-only election", () => {
  const pilotOnly = {
    ...request,
    initial_account_requested: false,
    existing_account_reference: "Reviewed existing child account statement",
  };
  assertEquals(inputSchema.parse({ requests: [pilotOnly] }).requests, [
    pilotOnly,
  ]);
  const result = f1040_2025.executeReturn({
    ...base.inputs,
    f4547: { requests: [pilotOnly] },
  });
  assertEquals(result.diagnostics, []);
  assertEquals(buildPending(result.pending).f4547, {
    requests: [pilotOnly],
  });
});
