import { assertEquals } from "@std/assert";
import { calculateForm8814 } from "../../../nodes/inputs/f8814/index.ts";
import { form8814Pdf } from "./f8814.ts";
import { schedule1Pdf } from "./schedule1.ts";

const election = {
  child_name: "Alex Rivera",
  child_name_control: "RIVE",
  child_ssn: "987654321",
  child_age_eligible: true as const,
  child_required_to_file: true as const,
  child_income_only_permitted_types: true as const,
  child_no_joint_return: true as const,
  child_no_estimated_payments: true as const,
  child_no_withholding: true as const,
  parent_eligible_to_elect: true as const,
  interest_income: 3700,
};

Deno.test("Form 8814 PDF expands one copy for each elected child", () => {
  const first = calculateForm8814(election);
  const second = calculateForm8814({ ...election, child_ssn: "111223333" });
  const instances = form8814Pdf.instances?.({ items: [first, second] }) ?? [];
  assertEquals(instances.length, 2);
  assertEquals(instances[0].line12, 1000);
  assertEquals(instances[0].line15, 135);
  assertEquals(instances[0].multiple_forms, true);
});

Deno.test("Schedule 1 PDF prints Form 8814 on line 8z amount field", () => {
  const instances = schedule1Pdf.instances?.({ line8z_form8814: 1000 }) ?? [];
  assertEquals(instances[0].line8z_description, "Form 8814");
  assertEquals(instances[0].line8z_other, 1000);
  const amount = schedule1Pdf.fields.find((field) =>
    field.domainKey === "line8z_other"
  );
  assertEquals(amount?.pdfField, "topmostSubform[0].Page1[0].f1_36[0]");
});
