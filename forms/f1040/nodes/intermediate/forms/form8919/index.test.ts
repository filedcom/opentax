import { assertEquals, assertThrows } from "@std/assert";
import { fieldsOf } from "../../../../../../core/test-utils/output.ts";
import { f1040 } from "../../../outputs/f1040/index.ts";
import { schedule2 } from "../../aggregation/schedule2/index.ts";
import { form8959 } from "../form8959/index.ts";
import { schedule_se } from "../schedule_se/index.ts";
import { calculateForm8919, form8919, inputSchema } from "./index.ts";

const firm = {
  name: "Employer Inc",
  tin_type: "ein",
  tin: "12-3456789",
  reason_code: "G",
  form1099_received: true,
  wages: 50_000,
} as const;

function input(overrides: Record<string, unknown> = {}) {
  return {
    taxpayer_ssn: "123-45-6789",
    forms: [{
      recipient: "taxpayer",
      employers: [firm],
      line8_prior_ss_wages_and_tips: 0,
    }],
    ...overrides,
  };
}

function compute(overrides: Record<string, unknown> = {}) {
  return form8919.compute(
    { taxYear: 2025, formType: "f1040" },
    inputSchema.parse(input(overrides)),
  );
}

Deno.test("Form 8919 sends line 6 to 1040 and 8959, line 10 to Schedule SE, line 13 to Schedule 2", () => {
  const result = compute();
  assertEquals(fieldsOf(result.outputs, f1040)?.line1g_wages_8919, 50_000);
  assertEquals(fieldsOf(result.outputs, form8959)?.wages_8919, 50_000);
  assertEquals(fieldsOf(result.outputs, schedule_se)?.wages_8919, 50_000);
  assertEquals(
    fieldsOf(result.outputs, schedule2)?.line6_uncollected_8919,
    3_825,
  );
});

Deno.test("Form 8919 line 10, not line 6, offsets Schedule SE after wage cap", () => {
  const result = compute({
    forms: [{
      recipient: "taxpayer",
      employers: [firm],
      line8_prior_ss_wages_and_tips: 150_000,
    }],
  });
  assertEquals(fieldsOf(result.outputs, schedule_se)?.wages_8919, 26_100);
  assertEquals(fieldsOf(result.outputs, form8959)?.wages_8919, 50_000);
  assertEquals(
    fieldsOf(result.outputs, schedule2)?.line6_uncollected_8919,
    2_343,
  );
});

Deno.test("Form 8919 separates taxpayer and spouse wage bases", () => {
  const forms = calculateForm8919(
    inputSchema.parse(input({
      spouse_ssn: "987-65-4321",
      forms: [
        {
          recipient: "taxpayer",
          employers: [firm],
          line8_prior_ss_wages_and_tips: 176_100,
        },
        {
          recipient: "spouse",
          employers: [{ ...firm, wages: 20_000 }],
          line8_prior_ss_wages_and_tips: 0,
        },
      ],
    })),
    176_100,
  );
  assertEquals(forms.map((form) => form.line10), [0, 20_000]);
  assertEquals(forms.map((form) => form.line6), [50_000, 20_000]);
});

Deno.test("Form 8919 only accepts 2025 reason codes A, C, G, H", () => {
  for (const code of ["A", "C", "G", "H"]) {
    const employer = {
      ...firm,
      reason_code: code,
      ...(code === "A" || code === "C"
        ? { correspondence_received_date: "2025-05-01" }
        : {}),
    };
    inputSchema.parse(input({
      forms: [{
        recipient: "taxpayer",
        employers: [employer],
        line8_prior_ss_wages_and_tips: 0,
      }],
    }));
  }
  for (const code of ["B", "D", "E", "F"]) {
    assertThrows(() =>
      inputSchema.parse(input({
        forms: [{
          recipient: "taxpayer",
          employers: [{ ...firm, reason_code: code }],
          line8_prior_ss_wages_and_tips: 0,
        }],
      }))
    );
  }
});

Deno.test("Form 8919 A/C requires a valid correspondence date", () => {
  for (const date of [undefined, "2025-02-30"]) {
    assertThrows(() =>
      inputSchema.parse(input({
        forms: [{
          recipient: "taxpayer",
          employers: [{
            ...firm,
            reason_code: "A",
            correspondence_received_date: date,
          }],
          line8_prior_ss_wages_and_tips: 0,
        }],
      }))
    );
  }
});

Deno.test("Form 8919 matches routed 1099-NEC to one firm without adding it twice", () => {
  const withSource = inputSchema.parse(input({
    forms: [{
      recipient: "taxpayer",
      employers: [{ ...firm, nec_payer_tin: "12-3456789" }],
      line8_prior_ss_wages_and_tips: 0,
    }],
    nec_sources: [{
      recipient_ssn: "123-45-6789",
      payer_tin: "12-3456789",
      amount: 50_000,
    }],
  }));
  assertEquals(calculateForm8919(withSource, 176_100)[0].line6, 50_000);
  assertThrows(() =>
    calculateForm8919({
      ...withSource,
      nec_sources: [{ ...withSource.nec_sources![0], amount: 49_999 }],
    }, 176_100)
  );
  assertThrows(() => calculateForm8919({ ...withSource, forms: [] }, 176_100));
});

Deno.test("Form 8919 rejects duplicate recipient forms and duplicate firms", () => {
  const parsed = inputSchema.parse(input());
  assertThrows(() =>
    calculateForm8919({
      ...parsed,
      forms: [parsed.forms![0], parsed.forms![0]],
    }, 176_100)
  );
  assertThrows(() =>
    calculateForm8919({
      ...parsed,
      forms: [{ ...parsed.forms![0], employers: [firm, firm] }],
    }, 176_100)
  );
});
