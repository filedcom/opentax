import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { FilingStatus as MefFilingStatus } from "../../../../mef/header.ts";
import { fillFormPdf } from "../../builder.ts";
import { scheduleFPdf } from "../business/schedule_f.ts";
import { scheduleSePdf } from "./schedule_se.ts";

const byKey = new Map(
  scheduleSePdf.fields.map((field) => [field.domainKey, field.pdfField]),
);

Deno.test("2025 Schedule SE PDF uses printed AcroForm line positions", () => {
  assertEquals(
    byKey.get("net_profit_schedule_f"),
    "topmostSubform[0].Page1[0].f1_3[0]",
  );
  assertEquals(
    byKey.get("net_profit_schedule_c"),
    "topmostSubform[0].Page1[0].f1_5[0]",
  );
  assertEquals(byKey.get("line4b"), "topmostSubform[0].Page1[0].f1_8[0]");
  assertEquals(byKey.get("line6"), "topmostSubform[0].Page1[0].f1_12[0]");
  assertEquals(
    byKey.get("w2_ss_wages"),
    "topmostSubform[0].Page1[0].Line8a_ReadOrder[0].f1_14[0]",
  );
  assertEquals(
    byKey.get("unreported_tips_4137"),
    "topmostSubform[0].Page1[0].f1_15[0]",
  );
  assertEquals(byKey.get("wages_8919"), "topmostSubform[0].Page1[0].f1_16[0]");
  assertEquals(byKey.get("line15"), "topmostSubform[0].Page2[0].f2_2[0]");
  assertEquals(byKey.get("line12"), "topmostSubform[0].Page1[0].f1_21[0]");
  assertEquals(byKey.get("line13"), "topmostSubform[0].Page1[0].f1_22[0]");
  assertEquals(byKey.get("owner_name"), "topmostSubform[0].Page1[0].f1_1[0]");
  assertEquals(byKey.get("owner_ssn"), "topmostSubform[0].Page1[0].f1_2[0]");
});

const taxpayerIdentity = {
  general: {
    taxpayer_first_name: "Test",
    taxpayer_last_name: "Filer",
    taxpayer_ssn: "123456789",
  },
  f1040: {
    taxpayer_first_name: "Test",
    taxpayer_last_name: "Filer",
    taxpayer_ssn: "123456789",
  },
};

Deno.test("2025 Schedule SE PDF projects regular tax and deduction", () => {
  const projected = scheduleSePdf.projectFields?.({
    net_profit_schedule_c: 50_000,
  }, taxpayerIdentity);
  assertEquals(projected?.owner_name, "Test Filer");
  assertEquals(projected?.owner_ssn, "123456789");
  assertEquals(projected?.line3, 50_000);
  assertEquals(projected?.line4a, 46_175);
  assertEquals(projected?.line10, 5_726);
  assertEquals(projected?.line11, 1_339);
  assertEquals(projected?.line12, 7_065);
  assertEquals(projected?.line13, 3_533);
});

Deno.test("2025 Schedule SE PDF projects elected farm method without Part I line 1a", () => {
  const projected = scheduleSePdf.projectFields?.({
    farm_optional_method_elected: true,
    gross_farm_income: 9_000,
    net_profit_schedule_f: -2_000,
    net_profit_schedule_c: 1_000,
  }, taxpayerIdentity);
  assertEquals(projected?.net_profit_schedule_f, undefined);
  assertEquals(projected?.line3, 1_000);
  assertEquals(projected?.line4a, 923.5);
  assertEquals(projected?.line4b, 6_000);
  assertEquals(projected?.line4c, 6_923.5);
  assertEquals(projected?.line6, 6_923.5);
  assertEquals(projected?.line15, 6_000);
});

Deno.test("2025 Schedule SE PDF refuses an unsupported farm election", () => {
  assertThrows(
    () =>
      scheduleSePdf.projectFields?.({
        farm_optional_method_elected: true,
        gross_farm_income: 12_000,
        net_profit_schedule_f: 8_000,
      }, taxpayerIdentity),
    Error,
    "unavailable",
  );
});

Deno.test("Schedule SE filled PDF prints the sole spouse farm proprietor", async () => {
  const farmSource = {
    schedule_fs: [{
      farm_id: "farm-spouse",
      proprietor_recipient: "S" as const,
      line_a_principal_crop_activity: "GRAIN FARMING",
      line_b_agricultural_activity_code: "111100" as const,
      line_e_material_participation: true,
      line_f_made_1099_payments: false,
      accounting_method: "cash" as const,
      line1_sales_livestock_resale: 0,
      line2_sales_products_raised: 50_000,
    }],
  };
  const jointFiler = {
    primarySSN: "123456789",
    nameLine1: "Test Filer",
    nameControl: "FILE",
    filingStatus: MefFilingStatus.MarriedFilingJointly,
    spouse: {
      ssn: "111223333",
      firstName: "Jane",
      lastName: "Farmer",
      nameControl: "FARM",
    },
    address: { line1: "1 Main St", city: "Austin", state: "TX", zip: "78701" },
  };
  const [farm] = scheduleFPdf.instances!(farmSource, jointFiler);
  assertEquals(farm.line34_net_profit, 50_000);
  const pending = {
    schedule_f: farmSource,
    general: {
      taxpayer_first_name: "Test",
      taxpayer_last_name: "Filer",
      taxpayer_ssn: "123456789",
      spouse_first_name: "Jane",
      spouse_last_name: "Farmer",
      spouse_ssn: "111223333",
      filing_status: "mfj",
    },
    f1040: {
      taxpayer_first_name: "Test",
      taxpayer_last_name: "Filer",
      taxpayer_ssn: "123456789",
      spouse_first_name: "Jane",
      spouse_last_name: "Farmer",
      spouse_ssn: "111223333",
      filing_status: "mfj",
    },
    schedule2: { line4_se_tax: 7065 },
  };
  const projected = scheduleSePdf.projectFields!({
    net_profit_schedule_f: farm.line34_net_profit,
  }, pending);
  assertEquals(projected.owner_name, "Jane Farmer");
  assertEquals(projected.owner_ssn, "111223333");
  const bytes = await fillFormPdf(
    scheduleSePdf,
    projected,
    jointFiler,
    ".pdf-cache",
    pending,
  );
  const file = await Deno.makeTempFile({ suffix: ".pdf" });
  try {
    await Deno.writeFile(file, bytes!);
    const result = await new Deno.Command("pdftotext", {
      args: ["-layout", file, "-"],
    }).output();
    assertEquals(result.code, 0);
    const text = new TextDecoder().decode(result.stdout);
    assertStringIncludes(text, "Jane Farmer");
    assertStringIncludes(text, "111223333");
    assertStringIncludes(text, "50000");
  } finally {
    await Deno.remove(file);
  }
});

Deno.test("Schedule SE rejects a spouse farm mixed with another owner's business", () => {
  assertThrows(
    () =>
      scheduleSePdf.projectFields!({
        net_profit_schedule_f: 50_000,
        net_profit_schedule_c: 10_000,
      }, {
        ...taxpayerIdentity,
        schedule_f: { schedule_fs: [{ proprietor_recipient: "S" }] },
        schedule_c: { schedule_cs: [{ proprietor_recipient: "T" }] },
      }),
    Error,
    "mixed proprietors",
  );
});

Deno.test("Schedule SE rejects mixed owners within multiple Schedule C rows", () => {
  assertThrows(
    () =>
      scheduleSePdf.projectFields!({ net_profit_schedule_c: 30_000 }, {
        ...taxpayerIdentity,
        schedule_c: {
          schedule_cs: [
            { proprietor_recipient: "T" },
            { proprietor_recipient: "S" },
          ],
        },
      }),
    Error,
    "mixed proprietors",
  );
});

Deno.test("Schedule SE filled PDF keeps spouse owner across multiple spouse businesses and farms", async () => {
  const pending = {
    general: {
      taxpayer_first_name: "Test",
      taxpayer_last_name: "Filer",
      taxpayer_ssn: "123456789",
      spouse_first_name: "Jane",
      spouse_last_name: "Farmer",
      spouse_ssn: "111223333",
      filing_status: "mfj",
    },
    f1040: {
      taxpayer_first_name: "Test",
      taxpayer_last_name: "Filer",
      taxpayer_ssn: "123456789",
      spouse_first_name: "Jane",
      spouse_last_name: "Farmer",
      spouse_ssn: "111223333",
      filing_status: "mfj",
    },
    schedule_c: {
      schedule_cs: [
        { proprietor_recipient: "S" },
        { proprietor_recipient: "S" },
      ],
    },
    schedule_f: {
      schedule_fs: [
        { proprietor_recipient: "S" },
        { proprietor_recipient: "S" },
      ],
    },
    schedule2: { line4_se_tax: 11_304 },
  };
  const projected = scheduleSePdf.projectFields!({
    net_profit_schedule_c: 30_000,
    net_profit_schedule_f: 50_000,
  }, pending);
  assertEquals(projected.owner_name, "Jane Farmer");
  assertEquals(projected.owner_ssn, "111223333");
  assertEquals(projected.line3, 80_000);
  const bytes = await fillFormPdf(
    scheduleSePdf,
    projected,
    {
      primarySSN: "123456789",
      nameLine1: "Test Filer",
      nameControl: "FILE",
      filingStatus: MefFilingStatus.MarriedFilingJointly,
      spouse: {
        ssn: "111223333",
        firstName: "Jane",
        lastName: "Farmer",
        nameControl: "FARM",
      },
      address: {
        line1: "1 Main St",
        city: "Austin",
        state: "TX",
        zip: "78701",
      },
    },
    ".pdf-cache",
    pending,
  );
  const file = await Deno.makeTempFile({ suffix: ".pdf" });
  try {
    await Deno.writeFile(file, bytes!);
    const result = await new Deno.Command("pdftotext", {
      args: ["-layout", file, "-"],
    }).output();
    assertEquals(result.code, 0);
    const text = new TextDecoder().decode(result.stdout);
    assertStringIncludes(text, "Jane Farmer");
    assertStringIncludes(text, "111223333");
    assertStringIncludes(text, "30000");
    assertStringIncludes(text, "50000");
    assertStringIncludes(text, "80000");
  } finally {
    await Deno.remove(file);
  }
});
