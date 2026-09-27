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
  ss8_filed_date: "2025-04-01",
  ss8_filing_reference: "SS-8 certified mail receipt",
  form1099_received: false,
  wages: 50_000,
} as const;

function input(overrides: Record<string, unknown> = {}) {
  return {
    taxpayer_ssn: "123-45-6789",
    forms: [{ recipient: "taxpayer", employers: [firm] }],
    ...overrides,
  };
}

function compute(overrides: Record<string, unknown> = {}) {
  return form8919.compute(
    { taxYear: 2025, formType: "f1040" },
    inputSchema.parse(input(overrides)),
  );
}

Deno.test("Form 8919 sends lines 6, 10 and 13 to their distinct destinations", () => {
  const result = compute();
  assertEquals(fieldsOf(result.outputs, f1040)?.line1g_wages_8919, 50_000);
  assertEquals(fieldsOf(result.outputs, form8959)?.wages_8919, 50_000);
  assertEquals(fieldsOf(result.outputs, schedule_se)?.wages_8919, 50_000);
  assertEquals(
    fieldsOf(result.outputs, schedule2)?.line6_uncollected_8919,
    3_825,
  );
});

Deno.test("Form 8919 derives line 8 from W-2 and Form 4137, then caps line 10", () => {
  const result = compute({
    w2_sources: [{
      employee_ssn: "123-45-6789",
      employer_name: "Other Employer",
      employer_ein: "22-2222222",
      ss_wages_and_tips: 145_000,
      rrta_compensation: 0,
    }],
    form4137_sources: [{ recipient: "taxpayer", line10_ss_tips: 5_000 }],
  });
  assertEquals(fieldsOf(result.outputs, schedule_se)?.wages_8919, 26_100);
  assertEquals(fieldsOf(result.outputs, form8959)?.wages_8919, 50_000);
  assertEquals(
    fieldsOf(result.outputs, schedule2)?.line6_uncollected_8919,
    2_343,
  );
});

Deno.test("Form 8919 caps combined RRTA line 8 compensation once per recipient", () => {
  const forms = calculateForm8919(
    inputSchema.parse(input({
      w2_sources: [
        {
          employee_ssn: "123-45-6789",
          ss_wages_and_tips: 0,
          rrta_compensation: 100_000,
        },
        {
          employee_ssn: "123-45-6789",
          ss_wages_and_tips: 0,
          rrta_compensation: 100_000,
        },
      ],
    })),
    176_100,
  );
  assertEquals(forms[0].line8, 176_100);
  assertEquals(forms[0].line10, 0);
});

Deno.test("Form 8919 separates taxpayer and spouse wage bases", () => {
  const forms = calculateForm8919(
    inputSchema.parse(input({
      spouse_ssn: "987-65-4321",
      forms: [
        { recipient: "taxpayer", employers: [firm] },
        { recipient: "spouse", employers: [{ ...firm, wages: 20_000 }] },
      ],
      w2_sources: [
        {
          employee_ssn: "123-45-6789",
          ss_wages_and_tips: 176_100,
          rrta_compensation: 0,
        },
        {
          employee_ssn: "987-65-4321",
          ss_wages_and_tips: 0,
          rrta_compensation: 0,
        },
      ],
    })),
    176_100,
  );
  assertEquals(forms.map((form) => form.line10), [0, 20_000]);
  assertEquals(forms.map((form) => form.line6), [50_000, 20_000]);
});

Deno.test("Form 8919 joint return rejects W-2 with no attributed employee SSN", () => {
  assertThrows(() =>
    calculateForm8919(
      inputSchema.parse(input({
        spouse_ssn: "987-65-4321",
        w2_sources: [{ ss_wages_and_tips: 5_000, rrta_compensation: 0 }],
      })),
      176_100,
    )
  );
});

Deno.test("Form 8919 only accepts 2025 reasons A, C, G, H with required evidence", () => {
  const byReason = {
    A: {
      ...firm,
      reason_code: "A",
      correspondence_received_date: "2025-05-01",
      correspondence_reference: "IRS letter 1",
    },
    C: {
      ...firm,
      reason_code: "C",
      ss8_filed_date: undefined,
      ss8_filing_reference: undefined,
      correspondence_received_date: "2025-05-01",
      correspondence_reference: "IRS letter 2",
    },
    G: firm,
    H: {
      ...firm,
      reason_code: "H",
      ss8_filed_date: undefined,
      ss8_filing_reference: undefined,
      form1099_received: true,
      form1099_payer_tin: "12-3456789",
    },
  };
  for (const employer of Object.values(byReason)) {
    inputSchema.parse(
      input({ forms: [{ recipient: "taxpayer", employers: [employer] }] }),
    );
  }
  for (const reason_code of ["B", "D", "E", "F"]) {
    assertThrows(() =>
      inputSchema.parse(input({
        forms: [{
          recipient: "taxpayer",
          employers: [{ ...firm, reason_code }],
        }],
      }))
    );
  }
  assertThrows(() =>
    inputSchema.parse(input({
      forms: [{
        recipient: "taxpayer",
        employers: [{ ...firm, ss8_filing_reference: undefined }],
      }],
    }))
  );
  assertThrows(() =>
    inputSchema.parse(input({
      forms: [{
        recipient: "taxpayer",
        employers: [{
          ...byReason.C,
          correspondence_received_date: "2025-02-30",
        }],
      }],
    }))
  );
});

Deno.test("Form 8919 reason H needs a same-firm W-2", () => {
  const withH = inputSchema.parse(input({
    forms: [{
      recipient: "taxpayer",
      employers: [{
        ...firm,
        reason_code: "H",
        ss8_filed_date: undefined,
        ss8_filing_reference: undefined,
        form1099_received: true,
        form1099_payer_tin: "12-3456789",
      }],
    }],
    form1099_sources: [{
      kind: "1099nec",
      recipient_ssn: "123-45-6789",
      payer_name: "Employer Inc",
      payer_tin: "12-3456789",
      amount: 50_000,
    }],
  }));
  assertThrows(() => calculateForm8919(withH, 176_100));
  assertEquals(
    calculateForm8919({
      ...withH,
      w2_sources: [{
        employer_ein: "12-3456789",
        ss_wages_and_tips: 20_000,
        rrta_compensation: 0,
      }],
    }, 176_100)[0].line8,
    20_000,
  );
});

Deno.test("Form 8919 matches routed 1099-NEC amount and payer name without adding it twice", () => {
  const withSource = inputSchema.parse(input({
    forms: [{
      recipient: "taxpayer",
      employers: [{
        ...firm,
        form1099_received: true,
        form1099_payer_tin: "12-3456789",
      }],
    }],
    form1099_sources: [{
      kind: "1099nec",
      recipient_ssn: "123-45-6789",
      payer_name: "Employer Inc",
      payer_tin: "12-3456789",
      amount: 50_000,
    }],
  }));
  assertEquals(calculateForm8919(withSource, 176_100)[0].line6, 50_000);
  assertEquals(
    calculateForm8919({
      ...withSource,
      form1099_sources: [{
        ...withSource.form1099_sources![0],
        amount: 49_999.51,
      }],
    }, 176_100)[0].line6,
    50_000,
  );
  assertThrows(() =>
    calculateForm8919({
      ...withSource,
      form1099_sources: [{
        ...withSource.form1099_sources![0],
        amount: 49_999,
      }],
    }, 176_100)
  );
  assertThrows(() =>
    calculateForm8919({
      ...withSource,
      form1099_sources: [{
        ...withSource.form1099_sources![0],
        payer_name: "Other Name",
      }],
    }, 176_100)
  );
  assertThrows(() => calculateForm8919({ ...withSource, forms: [] }, 176_100));
});

Deno.test("Form 8919 reason H combines MISC and NEC from the same W-2 firm", () => {
  const parsed = inputSchema.parse(input({
    forms: [{
      recipient: "taxpayer",
      employers: [{
        ...firm,
        reason_code: "H",
        ss8_filed_date: undefined,
        ss8_filing_reference: undefined,
        form1099_received: true,
        form1099_payer_tin: "12-3456789",
      }],
    }],
    w2_sources: [{
      employee_ssn: "123-45-6789",
      employer_name: "Employer Inc",
      employer_ein: "12-3456789",
      ss_wages_and_tips: 20_000,
      rrta_compensation: 0,
    }],
    form1099_sources: [
      {
        kind: "1099misc",
        recipient_ssn: "123-45-6789",
        payer_name: "Employer Inc",
        payer_tin: "12-3456789",
        amount: 10_000,
      },
      {
        kind: "1099nec",
        recipient_ssn: "123-45-6789",
        payer_name: "Employer Inc",
        payer_tin: "12-3456789",
        amount: 40_000,
      },
    ],
  }));
  assertEquals(calculateForm8919(parsed, 176_100)[0].line6, 50_000);
  assertEquals(calculateForm8919(parsed, 176_100)[0].line8, 20_000);
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
