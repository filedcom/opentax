import { assertEquals, assertThrows } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { FilingStatus } from "../../../mef/header.ts";
import { testFiler } from "../../mef/test-filer.ts";
import { fillFormPdf } from "../builder.ts";
import { scheduleFPdf } from "./schedule_f.ts";

const jointFiler = {
  ...testFiler(),
  filingStatus: FilingStatus.MarriedFilingJointly,
  spouse: {
    ssn: "111223333",
    firstName: "Jane",
    lastName: "Farmer",
    nameControl: "FARM",
  },
};

const farm = {
  farm_id: "farm-1",
  proprietor_recipient: "S" as const,
  line_a_principal_crop_activity: "GRAIN FARMING",
  line_b_agricultural_activity_code: "111100" as const,
  line_e_material_participation: true,
  accounting_method: "cash" as const,
  line1_sales_livestock_resale: 0,
  line6a_crop_insurance: 3_000,
  line6b_crop_insurance_taxable: 3_000,
  line8_other_income: 2_000,
  line16_feed: 500,
};

Deno.test("Schedule F PDF prints the spouse proprietor and income on the correct IRS lines", async () => {
  const [fields] = scheduleFPdf.instances!({ schedule_fs: [farm] }, jointFiler);
  const bytes = await fillFormPdf(
    scheduleFPdf,
    fields,
    jointFiler,
    ".pdf-cache",
  );
  const filled = await PDFDocument.load(bytes!);
  assertEquals(filled.getPageCount(), 2);
  const prefix = "topmostSubform[0].Page1[0].";
  const field = (key: string) =>
    scheduleFPdf.fields.find((entry) => entry.domainKey === key)?.pdfField;
  assertEquals(fields.proprietor_name, "Jane Farmer");
  assertEquals(fields.proprietor_ssn, "111223333");
  assertEquals(fields.line9_gross_income, 5_000);
  assertEquals(fields.line33_total_expenses, 500);
  assertEquals(fields.line34_net_profit, 4_500);
  assertEquals(field("line6a_crop_insurance"), `${prefix}f1_17[0]`);
  assertEquals(field("line8_other_income"), `${prefix}f1_21[0]`);
  assertEquals(field("line9_gross_income"), `${prefix}f1_22[0]`);
  assertEquals(field("line16_feed"), `${prefix}Lines10-22[0].f1_29[0]`);
  assertEquals(field("line33_total_expenses"), `${prefix}f1_59[0]`);
  assertEquals(field("line34_net_profit"), `${prefix}f1_60[0]`);
});

Deno.test("Schedule F PDF rejects an unnamed joint proprietor", () => {
  assertThrows(
    () =>
      scheduleFPdf.instances!({
        schedule_fs: [{ ...farm, proprietor_recipient: undefined }],
      }, jointFiler),
    Error,
    "joint return needs an explicit proprietor",
  );
});
