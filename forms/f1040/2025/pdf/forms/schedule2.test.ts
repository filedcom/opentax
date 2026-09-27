import { assertEquals } from "@std/assert";
import { schedule2Pdf } from "./schedule2.ts";

Deno.test("2025 Schedule 2 PDF maps line 17a code and recapture amount", () => {
  const byKey = new Map(schedule2Pdf.fields.map((field) => [
    field.domainKey,
    field.pdfField,
  ]));
  assertEquals(
    byKey.get("line17a_description"),
    "form1[0].Page2[0].Line17a_ReadOrder[0].Line17_ReadOrder[0].f2_01[0]",
  );
  assertEquals(
    byKey.get("line17a_investment_credit_recapture"),
    "form1[0].Page2[0].Line17a_ReadOrder[0].f2_02[0]",
  );
  assertEquals(
    schedule2Pdf.projectFields?.(
      { line17a_investment_credit_recapture: 2_500 },
      {},
    )?.line17a_description,
    "3468",
  );
  const combined = schedule2Pdf.projectFields?.(
    {
      line17a_investment_credit_recapture: 2_500,
      line17a_new_markets_credit_recapture: 3_100,
    },
    {},
  );
  assertEquals(combined?.line17a_description, "3468, NMCR");
  assertEquals(combined?.line17a_investment_credit_recapture, 5_600);
});
