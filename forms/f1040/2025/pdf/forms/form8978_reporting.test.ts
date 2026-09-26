import { assertEquals } from "@std/assert";
import { schedule2Pdf } from "./schedule2.ts";
import { schedule3Pdf } from "./schedule3.ts";

Deno.test("negative Form 8978 worksheet prints the finalized Schedule 3 credit", () => {
  const fields = schedule3Pdf.projectFields?.({}, {
    form8978_reporting_year: { schedule3_line6l: 500 },
  });
  assertEquals(fields?.line6l_form8978_credit, 500);
  assertEquals(
    schedule3Pdf.fields.find((entry) =>
      entry.domainKey === "line6l_form8978_credit"
    )
      ?.pdfField,
    "topmostSubform[0].Page1[0].f1_20[0]",
  );
});

Deno.test("negative Form 8978 worksheet prints the signed Schedule 2 offset", () => {
  const fields = schedule2Pdf.projectFields?.({ line8_form5329_tax: 125 }, {
    form8978_reporting_year: {
      schedule2_line17z_reduction: 100,
      schedule2_line21: 25,
    },
  });
  assertEquals(fields, {
    line8_form5329_tax: 125,
    line17z_description: "Form 8978 ADJ",
    line17z_amount: "(100)",
    line21_total: 25,
  });
  assertEquals(
    schedule2Pdf.fields.find((entry) => entry.domainKey === "line17z_amount")
      ?.pdfField,
    "form1[0].Page2[0].f2_20[0]",
  );
});

Deno.test("Schedule 2 keeps its line 21 when Form 8978 is fully used on Schedule 3", () => {
  const fields = schedule2Pdf.projectFields?.({ line8_form5329_tax: 125 }, {
    form8978_reporting_year: {
      schedule2_line17z_reduction: 0,
      schedule2_line21: 125,
    },
  });
  assertEquals(fields, { line8_form5329_tax: 125, line21_total: 125 });
});
