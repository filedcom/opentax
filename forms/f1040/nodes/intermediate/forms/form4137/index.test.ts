import { assertEquals, assertThrows } from "@std/assert";
import { fieldsOf } from "../../../../../../core/test-utils/output.ts";
import { f1040 } from "../../../outputs/f1040/index.ts";
import { agi_aggregator } from "../../aggregation/agi_aggregator/index.ts";
import { schedule2 } from "../../aggregation/schedule2/index.ts";
import { calculateForm4137, form4137, inputSchema } from "./index.ts";

const employer = {
  name: "CAFE",
  ein: "12-3456789",
  tips_received: 5_000,
  tips_reported: 2_000,
};

function compute(input: Record<string, unknown>) {
  return form4137.compute(
    { taxYear: 2025, formType: "f1040" },
    inputSchema.parse(input),
  );
}

Deno.test("Form 4137 requires employer rows when W-2 has allocated tips", () => {
  assertThrows(
    () =>
      compute({
        w2_tip_sources: [{
          recipient: "taxpayer",
          allocated_tips: 500,
          ss_wages_and_tips: 30_000,
        }],
      }),
    Error,
    "need employer tip records",
  );
});

Deno.test("Form 4137 calculates unreported income, SS tax and Medicare tax from rows", () => {
  const result = compute({
    forms: [{
      recipient: "taxpayer",
      employers: [employer],
      ss_wages_from_w2: 30_000,
    }],
    w2_tip_sources: [{
      recipient: "taxpayer",
      allocated_tips: 2_500,
      ss_wages_and_tips: 30_000,
    }],
  });
  assertEquals(fieldsOf(result.outputs, f1040)?.line1c_unreported_tips, 3_000);
  assertEquals(
    fieldsOf(result.outputs, agi_aggregator)?.line1c_unreported_tips,
    3_000,
  );
  assertEquals(
    fieldsOf(result.outputs, schedule2)?.line5_unreported_tip_tax,
    230,
  );
});

Deno.test("Form 4137 line 5 tips remain income but are excluded from FICA", () => {
  const result = compute({
    forms: [{
      recipient: "taxpayer",
      employers: [employer],
      sub_20_tips: 500,
      ss_wages_from_w2: 0,
    }],
  });
  assertEquals(fieldsOf(result.outputs, f1040)?.line1c_unreported_tips, 3_000);
  assertEquals(
    fieldsOf(result.outputs, schedule2)?.line5_unreported_tip_tax,
    191,
  );
});

Deno.test("Form 4137 SS wage base caps only SS tax, not Medicare tax", () => {
  const result = compute({
    forms: [{
      recipient: "taxpayer",
      employers: [employer],
      ss_wages_from_w2: 175_100,
    }],
  });
  assertEquals(
    fieldsOf(result.outputs, schedule2)?.line5_unreported_tip_tax,
    106,
  );
});

Deno.test("Form 4137 government employee tips are Medicare-only", () => {
  const input = inputSchema.parse({
    forms: [{
      recipient: "taxpayer",
      employers: [employer],
      government_employee_tips: 1_000,
      ss_wages_from_w2: 0,
    }],
  });
  const [calculated] = calculateForm4137(input, 176_100);
  assertEquals(calculated.medicareTips, 3_000);
  assertEquals(calculated.ssTips, 2_000);
  assertEquals(calculated.totalTax, 168);
});

Deno.test("Form 4137 keeps taxpayer and spouse computations separate", () => {
  const result = compute({
    forms: [
      { recipient: "taxpayer", employers: [employer], ss_wages_from_w2: 0 },
      {
        recipient: "spouse",
        employers: [{ ...employer, tips_received: 1_000, tips_reported: 0 }],
        ss_wages_from_w2: 176_100,
      },
    ],
  });
  assertEquals(fieldsOf(result.outputs, f1040)?.line1c_unreported_tips, 4_000);
  assertEquals(
    fieldsOf(result.outputs, schedule2)?.line5_unreported_tip_tax,
    245,
  );
});

Deno.test("Form 4137 refuses duplicate recipients and inconsistent W-2 wages", () => {
  assertThrows(
    () =>
      compute({
        forms: [
          { recipient: "taxpayer", employers: [employer], ss_wages_from_w2: 0 },
          { recipient: "taxpayer", employers: [employer], ss_wages_from_w2: 0 },
        ],
      }),
    Error,
    "one form per tip recipient",
  );
  assertThrows(
    () =>
      compute({
        forms: [{
          recipient: "taxpayer",
          employers: [employer],
          ss_wages_from_w2: 20_000,
        }],
        w2_tip_sources: [{
          recipient: "taxpayer",
          allocated_tips: 500,
          ss_wages_and_tips: 30_000,
        }],
      }),
    Error,
    "disagrees with W-2",
  );
});

Deno.test("Form 4137 lower reported tips require supporting records", () => {
  const raw = {
    forms: [{
      recipient: "taxpayer",
      employers: [{ ...employer, tips_received: 2_500 }],
      ss_wages_from_w2: 0,
    }],
    w2_tip_sources: [{ recipient: "taxpayer", allocated_tips: 1_000 }],
  };
  assertThrows(() => compute(raw), Error, "without supporting records");
  const result = compute({
    ...raw,
    forms: [{ ...raw.forms[0], records_support_lower_tips: true }],
  });
  assertEquals(fieldsOf(result.outputs, f1040)?.line1c_unreported_tips, 500);
});

Deno.test("Form 4137 rejects impossible employer and incidental facts", () => {
  assertEquals(
    inputSchema.safeParse({
      forms: [{
        recipient: "taxpayer",
        employers: [{ ...employer, tips_reported: 6_000 }],
      }],
    }).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse({
      forms: [{
        recipient: "taxpayer",
        employers: [{ ...employer, ein: undefined }],
      }],
    }).success,
    false,
  );
  assertThrows(
    () =>
      compute({
        forms: [{
          recipient: "taxpayer",
          employers: [employer],
          sub_20_tips: 3_001,
          ss_wages_from_w2: 0,
        }],
      }),
    Error,
    "line 5 exceeds",
  );
});

Deno.test("Form 4137 with no tip activity has no outputs", () => {
  assertEquals(compute({}).outputs, []);
  assertEquals(
    compute({ w2_tip_sources: [{ recipient: "taxpayer", allocated_tips: 0 }] })
      .outputs,
    [],
  );
});
