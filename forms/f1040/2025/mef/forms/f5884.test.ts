import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { TargetGroup } from "../../../nodes/inputs/f5884/index.ts";
import { form5884 } from "./f5884.ts";

export const workOpportunitySource = {
  subject_to_passive_activity_limit: false,
  f5884s: [{
    employee_reference: "EMP-001",
    target_group: TargetGroup.TanfRecipient,
    hired_on: "2025-01-15",
    swa_certification_reference: "SWA-001",
    qualified_wages_confirmed: true,
    not_prior_employee_confirmed: true,
    not_related_or_dependent_confirmed: true,
    more_than_half_wages_for_trade_or_business_confirmed: true,
    excluded_wages_removed_confirmed: true,
    first_year_wages: 6_000,
    hours_worked: 400,
  }],
};

Deno.test("Form 5884 emits source wages and credit only when bundled with Form 3800", () => {
  assertEquals(form5884.build({}), "");
  const xml = form5884.build(workOpportunitySource, {
    documentIdsByPendingKey: { f3800: ["IRS3800_1"] },
  });
  assertStringIncludes(
    xml,
    "<Wages400OrMoreHoursAmt>6000</Wages400OrMoreHoursAmt>",
  );
  assertStringIncludes(
    xml,
    "<Wages400OrMoreHoursCreditAmt>2400</Wages400OrMoreHoursCreditAmt>",
  );
  assertStringIncludes(xml, "<TotalCreditsAmt>2400</TotalCreditsAmt>");
  assertThrows(
    () =>
      form5884.build(workOpportunitySource, {
        documentIdsByPendingKey: { f3800: [] },
      }),
    Error,
    "needs attached Form 3800",
  );
  assertThrows(
    () =>
      form5884.build({
        ...workOpportunitySource,
        subject_to_passive_activity_limit: true,
      }),
    Error,
    "needs Form 8582-CR",
  );
});
