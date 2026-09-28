import { assertStringIncludes } from "@std/assert";
import { schedule1 } from "./schedule1.ts";

Deno.test("Schedule 1 native line 5 prints the Form 7203-adjusted Schedule E loss", () => {
  const xml = schedule1.build({
    line5_schedule_e: -3_000,
    line10_total_additional_income: -3_000,
  });
  assertStringIncludes(xml, "<RentalRealEstateIncomeLossAmt>-3000</RentalRealEstateIncomeLossAmt>");
  assertStringIncludes(xml, "<TotalAdditionalIncomeAmt>-3000</TotalAdditionalIncomeAmt>");
});
