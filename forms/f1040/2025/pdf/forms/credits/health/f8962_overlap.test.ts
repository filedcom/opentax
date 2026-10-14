import { assertThrows } from "@std/assert";
import { form8962Pdf } from "./f8962.ts";

Deno.test("Form 8962 PDF fails closed on simultaneous same-state policies", () => {
  const policies = [
    { policy_number: "POLICY-1", premium: 300, aptc: 100 },
    { policy_number: "POLICY-2", premium: 200, aptc: 100 },
  ].map(({ policy_number, premium, aptc }) => ({
    issuer_name: "Marketplace",
    policy_number,
    coverage_state: "TX",
    monthly_premiums: Array(12).fill(premium),
    monthly_slcsps: Array(12).fill(600),
    monthly_aptcs: Array(12).fill(aptc),
  }));
  assertThrows(
    () =>
      form8962Pdf.projectFields?.({
        monthly_ptc_rows: [{
          month_code: "JANUARY",
          premium: 500,
          slcsp: 600,
          aptc: 200,
        }],
      }, { f1095a: { f1095as: policies } }),
    Error,
    "overlapping policies need enrollee and coverage-family source reconciliation",
  );
});
