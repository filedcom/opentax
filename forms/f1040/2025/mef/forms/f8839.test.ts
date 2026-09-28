import { assertEquals, assertThrows } from "@std/assert";
import { form8839 } from "./f8839.ts";
import { FilingStatus } from "../../../nodes/types.ts";

const sourcedChild = {
  first_name: "Ada",
  last_name: "Taxpayer",
  birth_year: 2020,
  ssn: "111223334",
  final_decree: {
    source_document_id: "decree-1",
    finalization_date: "2025-07-15",
    issuing_jurisdiction: "TX",
    child_origin: "US" as const,
  },
  expenses: [{
    source_document_id: "invoice-1",
    paid_date: "2025-03-12",
    category: "attorney_fee" as const,
    payee: "Adoption Counsel",
    amount: 15_000,
    reimbursed_amount: 0,
  }],
};

Deno.test("Form 8839 MeF: absent pending emits no document", () => {
  assertEquals(form8839.build([]), "");
});

Deno.test("Form 8839 MeF: empty pending record rejects", () => {
  assertThrows(() => form8839.build({}), Error, "empty pending record");
});

Deno.test("Form 8839 MeF: receipt and decree identifiers do not bypass return reconciliation", () => {
  assertThrows(
    () =>
      form8839.build({
        children: [sourcedChild],
      }),
    Error,
    "source-verified adoption eligibility",
  );
});

Deno.test("Form 8839 MeF: typed source facts still need reviewed contents and finalized return", () => {
  assertThrows(
    () =>
      form8839.build({
        children: [sourcedChild],
        filing_status: FilingStatus.Single,
      }),
    Error,
    "source-verified adoption eligibility",
  );
});

Deno.test("Form 8839 MeF: employer benefit fails closed", () => {
  assertThrows(
    () => form8839.build({ adoption_benefits: 4_000 }),
    Error,
    "source-verified adoption eligibility",
  );
});
