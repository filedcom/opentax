import { assertEquals, assertThrows } from "@std/assert";
import { pdfReviewFixtures } from "../../../review-fixtures.ts";
import { form5695Pdf } from "./f5695.ts";

const source = pdfReviewFixtures.find((fixture) =>
  fixture.id === "single-form5695-door-and-air-conditioner"
)!.inputs.f5695 as Record<string, unknown>;
const pending = {
  f5695: source,
  schedule3: { line5b_energy_efficient_home: 750 },
};

Deno.test("Form 5695 PDF prints the door and central-air source on Parts II A/B", () => {
  const fields = form5695Pdf.projectFields!(source, pending);
  assertEquals(form5695Pdf.includeWhen!(fields, pending), true);
  assertEquals(form5695Pdf.pageIndices!(fields), [1, 2, 3]);
  assertEquals(fields.door_qmid_first, "A1B2");
  assertEquals(fields.ac_qmid_first, "C3D4");
  assertEquals(fields.total_door_credit, 150);
  assertEquals(fields.ac_credit, 600);
  assertEquals(fields.line32, 750);
  assertEquals(
    form5695Pdf.fields.find((field) => field.domainKey === "ac_qmid_first")
      ?.pdfField,
    "topmostSubform[0].Page3[0].Ln_22a[0].Box1-4[0].f3_22[0]",
  );
});

Deno.test("Form 5695 PDF holds other property and mismatched credit", () => {
  const extra = { ...source, energy_audit_cost: 100 };
  assertThrows(
    () => form5695Pdf.projectFields!(extra, { ...pending, f5695: extra }),
    Error,
    "mapped door and central-air source route",
  );
  assertThrows(
    () =>
      form5695Pdf.projectFields!(source, {
        ...pending,
        schedule3: { line5b_energy_efficient_home: 700 },
      }),
    Error,
    "differs from Schedule 3",
  );
});
