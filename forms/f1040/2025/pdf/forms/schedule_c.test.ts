import { assertEquals, assertThrows } from "@std/assert";
import { FilingStatus } from "../../../nodes/types.ts";
import { scheduleCPdf } from "./schedule_c.ts";

const pending = {
  general: {
    taxpayer_first_name: "Pat",
    taxpayer_last_name: "Example",
    taxpayer_ssn: "400001107",
  },
};

function business(overrides: Record<string, unknown> = {}) {
  return {
    line_a_principal_business: "Retail goods",
    line_b_business_code: "445110",
    line_c_business_name: "Pat's Shop",
    business_reference: "shop",
    proprietor_recipient: "T",
    line_f_accounting_method: "cash",
    line_g_material_participation: true,
    line_i_made_1099_payments: false,
    line_1_gross_receipts: 100_000,
    ...overrides,
  };
}

function copies(
  raw: Record<string, unknown>,
  allPending: Record<string, Record<string, unknown>> = pending,
) {
  const projected = scheduleCPdf.projectFields?.(raw, allPending) ?? {};
  return scheduleCPdf.instances?.(projected) ?? [];
}

Deno.test("Schedule C PDF prints EIN as nine digits in the IRS comb field", () => {
  const [copy] = copies({
    schedule_cs: [business({ line_d_ein: "12-3456789" })],
  });
  assertEquals(copy.line_d_ein, "123456789");
});

Deno.test("Form 3115 adjustments print on the same Schedule C PDF income and Part V rows", () => {
  const [copy] = copies({
    schedule_cs: [business({ line_1_gross_receipts: 20_000 })],
    section481a_adjustments: [
      {
        business_reference: "shop",
        designated_change_number: "222",
        year_of_change: 2025,
        amount: 3_000,
      },
      {
        business_reference: "shop",
        designated_change_number: "333",
        year_of_change: 2025,
        amount: -1_000,
      },
    ],
  }, {
    ...pending,
    f3115: {
      f3115s: [
        {
          business_reference: "shop",
          designated_change_number: "222",
          filing_type: "automatic",
          reporting_schedule: "schedule_c",
          year_of_change: 2025,
          section_481_adjustment: 12_000,
        },
        {
          business_reference: "shop",
          designated_change_number: "333",
          filing_type: "automatic",
          reporting_schedule: "schedule_c",
          year_of_change: 2025,
          section_481_adjustment: -1_000,
        },
      ],
    },
  });
  assertEquals(copy.line6, 3_000);
  assertEquals(copy.line27b, 1_000);
  assertEquals(copy.line31, 22_000);
  assertEquals(
    (copy.part_v_other_expenses as Array<{ amount: number }>)[0].amount,
    1_000,
  );
});

Deno.test("2025 Schedule C PDF creates one two-page copy per taxpayer business and maps actual line amounts", () => {
  const result = copies({
    schedule_cs: [
      business({
        line_2_returns_allowances: 5_000,
        line_33_inventory_method: "cost",
        line_34_inventory_change: false,
        line_35_cogs_beginning_inventory: 10_000,
        line_36_purchases: 20_000,
        line_41_cogs_ending_inventory: 8_000,
        line_8_advertising: 1_000,
        line_24b_meals: 1_000,
        line_26_wages: 10_000,
        part_v_other_expenses: [{ description: "Bank charges", amount: 300 }],
      }),
      business({
        business_reference: "design",
        line_c_business_name: "Pat's Design",
        line_1_gross_receipts: 20_000,
      }),
    ],
  });
  assertEquals(result.length, 2);
  assertEquals(result[0].proprietor_name, "Pat Example");
  assertEquals(result[0].proprietor_ssn, "400001107");
  assertEquals(result[0].line3, 95_000);
  assertEquals(result[0].line4, 22_000);
  assertEquals(result[0].line5, 73_000);
  assertEquals(result[0].line_24b_meals, 500);
  assertEquals(result[0].line_26_wages, 10_000);
  assertEquals(result[0].line27b, 300);
  assertEquals(result[0].line28, 11_800);
  assertEquals(result[0].line29, 61_200);
  assertEquals(result[0].line30, 0);
  assertEquals(result[0].line31, 61_200);
  assertEquals(result[0].line40, 30_000);
  assertEquals(result[0].line42, 22_000);
  assertEquals(result[1].line31, 20_000);
  assertEquals(scheduleCPdf.pageIndices, undefined);
});

Deno.test("Schedule C PDF resolves an omitted owner only on a known nonjoint return", () => {
  const raw = { schedule_cs: [business({ proprietor_recipient: undefined })] };
  const single = scheduleCPdf.projectFields?.(raw, {
    general: { ...pending.general, filing_status: FilingStatus.Single },
  }) ?? {};
  assertEquals(scheduleCPdf.instances?.(single)?.length, 1);
  assertThrows(
    () =>
      scheduleCPdf.projectFields?.(raw, {
        general: { ...pending.general, filing_status: FilingStatus.MFJ },
      }),
    Error,
    "known nonjoint status or explicit proprietor",
  );
});

Deno.test("2025 Schedule C PDF places home-office Form 8829 deduction on the linked business", () => {
  const [result] = copies({
    schedule_cs: [business()],
    form8829_line30: {
      business_reference: "shop",
      home_identifier: "home-1",
      recipient: "T",
      schedule_c_line29_tentative_profit: 100_000,
      line36: 3_000,
    },
  });
  assertEquals(result.line29, 100_000);
  assertEquals(result.line30, 3_000);
  assertEquals(result.line31, 97_000);
});

Deno.test("2025 Schedule C PDF maps required business and vehicle boxes to printed fields", () => {
  const field = (key: string) =>
    scheduleCPdf.fields.find((entry) => entry.domainKey === key);
  assertEquals(
    field("line_b_business_code")?.pdfField,
    "topmostSubform[0].Page1[0].BComb[0].f1_4[0]",
  );
  assertEquals(
    field("line_27a_energy_efficient")?.pdfField,
    "topmostSubform[0].Page1[0].Lines18-27[0].f1_40[0]",
  );
  assertEquals(
    field("line27b")?.pdfField,
    "topmostSubform[0].Page1[0].Lines18-27[0].f1_39[0]",
  );
  assertEquals(
    field("vehicle_business_miles")?.pdfField,
    "topmostSubform[0].Page2[0].f2_12[0]",
  );
  assertEquals(scheduleCPdf.rows?.maxRows, 9);
  const [result] = copies({
    schedule_cs: [business({
      line_9_car_truck_expenses: 2_000,
      line_43_date_in_service: "2025-01-15",
      line_44a_total_miles: 12_000,
      line_44b_business_miles: 8_000,
      line_44c_commuting_miles: 3_000,
      line_44d_other_miles: 1_000,
      line_45_personal_use: true,
      line_46_another_vehicle: false,
      line_47a_evidence: true,
      line_47b_written_evidence: true,
    })],
  });
  assertEquals(result.vehicle_month, "01");
  assertEquals(result.vehicle_day, "15");
  assertEquals(result.vehicle_year, "2025");
  assertEquals(result.vehicle_business_miles, 8_000);
});

Deno.test("2025 Schedule C PDF refuses source details that cannot be printed faithfully", () => {
  const unsupported = [
    business({ proprietor_recipient: "S" }),
    business({ line_f_accounting_method: "other" }),
    business({ line_33_inventory_method: "other" }),
    business({ line_34_inventory_change: true }),
    business({ line_27b_other_expenses: 100 }),
    business({ part_v_other_expenses: [{ description: "", amount: 100 }] }),
    business({ home_office_method: "simplified", home_office_sq_ft: 200 }),
    business({ line_9_car_truck_expenses: 100 }),
  ];
  for (const item of unsupported) {
    assertThrows(
      () => copies({ schedule_cs: [item] }),
      Error,
      "Schedule C PDF",
    );
  }
  assertThrows(
    () => copies({ schedule_cs: [business()], line1_gross_receipts: 10 }),
    Error,
    "business-specific top-level adjustments",
  );
  assertThrows(
    () => copies({ schedule_cs: [business({ line_30_home_office: 100 })] }),
    Error,
    "linked Form 8829",
  );
  assertThrows(
    () =>
      copies({
        schedule_cs: [business({ line_26_wages: 10_000 })],
        wotc_wage_reductions: [{
          business_reference: "shop",
          credit_amount: 1_000,
        }],
      }),
    Error,
    "matching Form 5884 source",
  );
  assertThrows(
    () => copies({ schedule_cs: [business({ line_16b_interest_other: 100 })] }),
    Error,
    "section 163(j) exemption",
  );
  assertEquals(copies({}), []);
  assertEquals(copies({ schedule_cs: [] }), []);
  assertThrows(
    () => copies({ schedule_cs: [], line1_gross_receipts: 10 }),
    Error,
    "source amounts without a business item",
  );
});
