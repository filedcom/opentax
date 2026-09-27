import { assertEquals } from "@std/assert";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { execute } from "../../../core/runtime/executor.ts";
import { registry } from "../2025/registry.ts";
import { FilingStatus } from "../nodes/types.ts";

const plan = buildExecutionPlan(registry);
const ctx = { taxYear: 2025, formType: "f1040" };

Deno.test("W-2 allocated tips are reconciled to Form 4137 and actual tip income enters AGI once", () => {
  const result = execute(plan, registry, {
    general: {
      filing_status: "single",
      taxpayer_first_name: "Sam",
      taxpayer_last_name: "Tipper",
      taxpayer_ssn: "123-45-6789",
    },
    w2: [{
      employee_ssn: "123-45-6789",
      employer_name: "CAFE",
      employer_ein: "123456789",
      box1_wages: 30_000,
      box2_fed_withheld: 2_000,
      box3_ss_wages: 30_000,
      box7_ss_tips: 2_000,
      box8_allocated_tips: 1_000,
    }],
    form4137: {
      forms: [{
        recipient: "taxpayer",
        employers: [{
          name: "CAFE",
          ein: "123456789",
          tips_received: 5_000,
          tips_reported: 2_000,
        }],
      }],
    },
  }, ctx);
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form4137?.w2_tip_sources, [{
    employee_ssn: "123-45-6789",
    employer_name: "CAFE",
    employer_ein: "123456789",
    allocated_tips: 1_000,
    ss_wages_and_tips: 32_000,
  }]);
  assertEquals(result.pending.f1040?.line1c_unreported_tips, 3_000);
  assertEquals(result.pending.f1040?.line11_agi, 33_000);
  assertEquals(result.pending.schedule2?.line5_unreported_tip_tax, 230);
});

Deno.test("daily tip records support less unreported income than W-2 box 8", () => {
  const input = {
    general: {
      filing_status: FilingStatus.Single,
      taxpayer_first_name: "Sam",
      taxpayer_last_name: "Tipper",
      taxpayer_ssn: "123-45-6789",
    },
    w2: [{
      employee_ssn: "123-45-6789",
      employer_name: "CAFE",
      employer_ein: "123456789",
      box1_wages: 30_000,
      box2_fed_withheld: 2_000,
      box3_ss_wages: 30_000,
      box7_ss_tips: 2_000,
      box8_allocated_tips: 1_000,
    }],
    form4137: {
      forms: [{
        recipient: "taxpayer",
        employers: [{
          name: "CAFE",
          ein: "123456789",
          tips_received: 2_500,
          tips_reported: 2_000,
        }],
        allocated_tip_records: [{
          employer_index: 1,
          daily_records: [
            {
              date: "2025-01-03",
              cash_charge_tips_received: 1_500,
              tips_reported_to_employer: 1_200,
              report_date: "2025-02-10",
              evidence_type: "daily_tip_diary",
              evidence_reference: "diary-jan-page-1",
            },
            {
              date: "2025-01-04",
              cash_charge_tips_received: 1_000,
              tips_reported_to_employer: 800,
              report_date: "2025-02-10",
              evidence_type: "receipt_or_charge_slip",
              evidence_reference: "receipt-set-jan-4",
            },
          ],
        }],
      }],
    },
  };
  const result = execute(plan, registry, input, ctx);
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040?.line1c_unreported_tips, 500);
  assertEquals(result.pending.f1040?.line11_agi, 30_500);
  assertEquals(result.pending.schedule2?.line5_unreported_tip_tax, 38);
});

Deno.test("W-2 allocated tips without Form 4137 employer records fail calculation", () => {
  const result = execute(plan, registry, {
    general: {
      filing_status: "single",
      taxpayer_first_name: "Sam",
      taxpayer_last_name: "Tipper",
      taxpayer_ssn: "123-45-6789",
    },
    w2: [{
      box1_wages: 30_000,
      box2_fed_withheld: 2_000,
      box3_ss_wages: 30_000,
      box8_allocated_tips: 1_000,
    }],
  }, ctx);
  assertEquals(
    result.diagnostics.some((entry) =>
      entry.nodeType === "form4137" &&
      entry.message.includes("need employer tip records")
    ),
    true,
  );
});

Deno.test("Joint return keeps taxpayer and spouse Form 4137 wage bases separate", () => {
  const result = execute(plan, registry, {
    general: {
      filing_status: FilingStatus.MFJ,
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Tipper",
      taxpayer_ssn: "123-45-6789",
      spouse_first_name: "Sam",
      spouse_last_name: "Tipper",
      spouse_ssn: "987-65-4321",
    },
    w2: [
      {
        employee_ssn: "123-45-6789",
        employer_name: "CAFE",
        employer_ein: "123456789",
        box1_wages: 30_000,
        box2_fed_withheld: 2_000,
        box3_ss_wages: 30_000,
        box7_ss_tips: 2_000,
        box8_allocated_tips: 1_000,
      },
      {
        employee_ssn: "987-65-4321",
        employer_name: "DINER",
        employer_ein: "987654321",
        box1_wages: 176_100,
        box2_fed_withheld: 15_000,
        box3_ss_wages: 176_100,
        box8_allocated_tips: 500,
      },
    ],
    form4137: {
      forms: [
        {
          recipient: "taxpayer",
          employers: [{
            name: "CAFE",
            ein: "123456789",
            tips_received: 5_000,
            tips_reported: 2_000,
          }],
        },
        {
          recipient: "spouse",
          employers: [{
            name: "DINER",
            ein: "987654321",
            tips_received: 1_000,
            tips_reported: 0,
          }],
        },
      ],
    },
  }, ctx);
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040?.line1c_unreported_tips, 4_000);
  assertEquals(result.pending.schedule2?.line5_unreported_tip_tax, 245);
  assertEquals(result.pending.form4137?.taxpayer_ssn, "123-45-6789");
  assertEquals(result.pending.form4137?.spouse_ssn, "987-65-4321");
  assertEquals(result.pending.form4137?.w2_tip_sources, [
    {
      employee_ssn: "123-45-6789",
      employer_name: "CAFE",
      employer_ein: "123456789",
      allocated_tips: 1_000,
      ss_wages_and_tips: 32_000,
    },
    {
      employee_ssn: "987-65-4321",
      employer_name: "DINER",
      employer_ein: "987654321",
      allocated_tips: 500,
      ss_wages_and_tips: 176_100,
    },
  ]);
});

Deno.test("Form 4137 rejects a W-2 employee SSN outside the filed return", () => {
  const result = execute(plan, registry, {
    general: {
      filing_status: FilingStatus.Single,
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Tipper",
      taxpayer_ssn: "123-45-6789",
    },
    w2: [{
      employee_ssn: "111-22-3333",
      employer_name: "CAFE",
      employer_ein: "123456789",
      box1_wages: 30_000,
      box2_fed_withheld: 2_000,
      box3_ss_wages: 30_000,
      box8_allocated_tips: 1_000,
    }],
    form4137: {
      forms: [{
        recipient: "taxpayer",
        employers: [{
          name: "CAFE",
          ein: "123456789",
          tips_received: 1_000,
          tips_reported: 0,
        }],
      }],
    },
  }, ctx);
  assertEquals(
    result.diagnostics.some((entry) =>
      entry.nodeType === "form4137" &&
      entry.message.includes("does not match a filer")
    ),
    true,
  );
});

Deno.test("Form 4137 rejects an allocated-tip employer absent from line 1", () => {
  const result = execute(plan, registry, {
    general: {
      filing_status: FilingStatus.Single,
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Tipper",
      taxpayer_ssn: "123-45-6789",
    },
    w2: [{
      employee_ssn: "123-45-6789",
      employer_name: "CAFE",
      employer_ein: "123456789",
      box1_wages: 30_000,
      box2_fed_withheld: 2_000,
      box3_ss_wages: 30_000,
      box8_allocated_tips: 1_000,
    }],
    form4137: {
      forms: [{
        recipient: "taxpayer",
        employers: [{
          name: "DINER",
          ein: "123456789",
          tips_received: 1_000,
          tips_reported: 0,
        }],
      }],
    },
  }, ctx);
  assertEquals(
    result.diagnostics.some((entry) =>
      entry.nodeType === "form4137" &&
      entry.message.includes("employer does not match line 1")
    ),
    true,
  );
});

Deno.test("Form 4137 line 1 matches a W-2 employer when box 8 is blank", () => {
  const general = {
    filing_status: FilingStatus.Single,
    taxpayer_first_name: "Alex",
    taxpayer_last_name: "Tipper",
    taxpayer_ssn: "123-45-6789",
  };
  const w2 = {
    employee_ssn: "123-45-6789",
    employer_name: "CAFE",
    employer_ein: "123456789",
    box1_wages: 30_000,
    box2_fed_withheld: 2_000,
    box3_ss_wages: 30_000,
  };
  const form4137 = {
    forms: [{
      recipient: "taxpayer",
      employers: [{
        name: "CAFE",
        ein: "123456789",
        tips_received: 3_000,
        tips_reported: 0,
      }],
    }],
  };
  const matched = execute(plan, registry, {
    general,
    w2: [w2],
    form4137,
  }, ctx);
  assertEquals(matched.diagnostics, []);
  assertEquals(matched.pending.f1040?.line1c_unreported_tips, 3_000);

  const missing = execute(plan, registry, {
    general,
    w2: [{ ...w2, employer_name: "DINER" }],
    form4137,
  }, ctx);
  assertEquals(
    missing.diagnostics.some((entry) =>
      entry.nodeType === "form4137" &&
      entry.message.includes("line 1 employer does not match a filed W-2")
    ),
    true,
  );
});

Deno.test("Form 4137 line 6 reaches Form 8959 line 2 and Additional Medicare Tax", () => {
  const result = execute(plan, registry, {
    general: {
      filing_status: FilingStatus.Single,
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Tipper",
      taxpayer_ssn: "123-45-6789",
    },
    w2: [{
      employer_name: "CAFE",
      employer_ein: "123456789",
      box1_wages: 198_000,
      box2_fed_withheld: 30_000,
      box3_ss_wages: 176_100,
      box5_medicare_wages: 198_000,
      box6_medicare_withheld: 2_871,
      box8_allocated_tips: 4_000,
    }],
    form4137: {
      forms: [{
        recipient: "taxpayer",
        employers: [{
          name: "CAFE",
          ein: "123456789",
          tips_received: 4_000,
          tips_reported: 0,
        }],
      }],
    },
  }, ctx);
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form4137?.w2_tip_sources, [{
    employer_name: "CAFE",
    employer_ein: "123456789",
    allocated_tips: 4_000,
    ss_wages_and_tips: 176_100,
  }]);
  assertEquals(result.pending.form8959?.line2_unreported_tips, 4_000);
  assertEquals(result.pending.form8959?.line4_total_medicare_wages, 202_000);
  assertEquals(result.pending.form8959?.line7_wage_tax, 18);
  assertEquals(result.pending.schedule2?.line5_unreported_tip_tax, 58);
  assertEquals(result.pending.schedule2?.line11_additional_medicare, 18);
});

Deno.test("RRTA compensation caps Form 4137 line 8 but remains uncapped on Form 8959", () => {
  const result = execute(plan, registry, {
    general: {
      filing_status: FilingStatus.Single,
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Tipper",
      taxpayer_ssn: "123-45-6789",
    },
    w2: [
      {
        employee_ssn: "123-45-6789",
        employer_name: "CAFE",
        employer_ein: "123456789",
        box1_wages: 50_000,
        box2_fed_withheld: 5_000,
        box3_ss_wages: 50_000,
        box5_medicare_wages: 50_000,
        box6_medicare_withheld: 725,
        box8_allocated_tips: 3_000,
      },
      {
        employee_ssn: "123-45-6789",
        employer_name: "RAIL",
        employer_ein: "987654321",
        box1_wages: 220_000,
        box2_fed_withheld: 30_000,
        box14_entries: [
          {
            description: "RRTA compensation",
            amount: 220_000,
            is_state_sdi_pfml: false,
          },
          {
            description: "Additional Medicare Tax",
            amount: 180,
            is_state_sdi_pfml: false,
          },
        ],
      },
    ],
    form4137: {
      forms: [{
        recipient: "taxpayer",
        employers: [{
          name: "CAFE",
          ein: "123456789",
          tips_received: 3_000,
          tips_reported: 0,
        }],
      }],
    },
  }, ctx);
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule2?.line5_unreported_tip_tax, 44);
  assertEquals(result.pending.form8959?.line1_medicare_wages, 50_000);
  assertEquals(result.pending.form8959?.line2_unreported_tips, 3_000);
  assertEquals(result.pending.form8959?.line14_rrta_wages, 220_000);
  assertEquals(result.pending.form8959?.line17_rrta_tax, 180);
  assertEquals(result.pending.schedule2?.line11_additional_medicare, 180);
  assertEquals(result.pending.f1040?.line25c_additional_medicare_withheld, 180);
});
