import { assertEquals, assertThrows } from "@std/assert";
import { type FilerIdentity, FilingStatus } from "../../mef/types.ts";
import { form7217Pdf } from "./f7217.ts";
import { Form7217PropertyTreatment } from "../../../nodes/inputs/f7217/index.ts";

const filer: FilerIdentity = {
  primarySSN: "123-45-6789",
  nameLine1: "Sam Gardenia",
  fullName: "Sam Gardenia",
  nameControl: "GARD",
  address: {
    line1: "123 Main Street",
    city: "New York",
    state: "NY",
    zip: "10001",
  },
  filingStatus: FilingStatus.Single,
};

const item = {
  partnership_name: "Orchid Partners",
  partnership_ein: "12-3456789",
  distribution_date: "2025-03-01",
  complete_liquidation: false,
  section_751b_sale_or_exchange: false,
  partner_adjusted_basis_before_distribution: 10_000,
  cash_received: 4_000,
  distributed_properties: [{
    description: "Equipment",
    property_treatment: Form7217PropertyTreatment.Section732Property,
    partnership_basis_before_distribution: 7_000,
    section_734b_basis_adjustment: true,
    fair_market_value: 9_000,
    partner_basis_after_section_732: 6_000,
  }],
};

function mapped(key: string): string | undefined {
  return form7217Pdf.fields.find((entry) => entry.domainKey === key)
    ?.pdfField;
}

Deno.test("Form 7217 PDF maps verified identity, Part I, Part II, and total widgets", () => {
  assertEquals(mapped("partner_name"), "topmostSubform[0].Page1[0].f1_1[0]");
  assertEquals(
    mapped("distribution_date_printed"),
    "topmostSubform[0].Page1[0].f1_5[0]",
  );
  assertEquals(mapped("line3"), "topmostSubform[0].Page1[0].f1_6[0]");
  assertEquals(mapped("line10"), "topmostSubform[0].Page1[0].f1_14[0]");
  assertEquals(
    mapped("row1_description"),
    "topmostSubform[0].Page2[0].Page2Table[0].Row1[0].f2_1[0]",
  );
  assertEquals(
    mapped("row1_section_734b_basis_adjustment"),
    "topmostSubform[0].Page2[0].Page2Table[0].Row1[0].c2_3[0]",
  );
  assertEquals(
    mapped("row30_partner_basis"),
    "topmostSubform[0].Page2[0].Page2Table[0].Row30[0].f2_120[0]",
  );
  assertEquals(
    mapped("total_partner_basis"),
    "topmostSubform[0].Page2[0].f2_126[0]",
  );
});

Deno.test("Form 7217 PDF produces a reconciled two-page instance per partnership date", () => {
  const instances = form7217Pdf.instances?.({
    form7217s: [item, { ...item, distribution_date: "2025-04-01" }],
  }, filer);
  assertEquals(instances?.length, 2);
  assertEquals(instances?.[0].partner_name, "Sam Gardenia");
  assertEquals(instances?.[0].partner_tin, "123456789");
  assertEquals(instances?.[0].distribution_date_printed, "03/01/2025");
  assertEquals(instances?.[0].line3, 7_000);
  assertEquals(instances?.[0].line5c, 4_000);
  assertEquals(instances?.[0].line7, 0);
  assertEquals(instances?.[0].line10, 6_000);
  assertEquals(instances?.[0].row1_section_734b_basis_adjustment, true);
  assertEquals(instances?.[0].total_partner_basis, 6_000);
  assertEquals(instances?.[1].distribution_date_printed, "04/01/2025");
});

Deno.test("Form 7217 PDF shows classified section 731(c) securities on line 5b and Part II", () => {
  const security = {
    ...item,
    marketable_securities_fmv: 2_000,
    distributed_properties: [
      {
        ...item.distributed_properties[0],
        partner_basis_after_section_732: 5_000,
      },
      {
        description: "Listed shares",
        property_treatment:
          Form7217PropertyTreatment.Section731cMarketableSecurityTreatedAsMoney,
        section_731c_reduction_amount: 0,
        partnership_basis_before_distribution: 1_000,
        fair_market_value: 2_000,
        partner_basis_after_section_732: 1_000,
      },
    ],
  };
  const [instance] =
    form7217Pdf.instances?.({ form7217s: [security] }, filer) ?? [];
  assertEquals(instance?.line5b, 2_000);
  assertEquals(instance?.row2_fmv, 2_000);
});

Deno.test("Form 7217 PDF does not print unreconciled or misclassified source", () => {
  assertThrows(
    () => form7217Pdf.instances?.({ form7217s: [item] }),
    Error,
    "partner filer identity",
  );
  assertThrows(
    () => form7217Pdf.instances?.({ form7217s: [item, item] }, filer),
    Error,
    "one aggregate filing record",
  );
  assertThrows(
    () =>
      form7217Pdf.instances?.({
        form7217s: [{
          ...item,
          distributed_properties: [{
            ...item.distributed_properties[0],
            property_treatment: undefined,
          }],
        }],
      }, filer),
    Error,
    "classified property",
  );
  assertThrows(
    () =>
      form7217Pdf.instances?.({
        form7217s: [{
          ...item,
          distributed_properties: [{
            ...item.distributed_properties[0],
            partner_basis_after_section_732: 5_000,
          }],
        }],
      }, filer),
    Error,
    "must equal Part I line 10",
  );
});

Deno.test("Form 7217 PDF rejects a 31st property row pending continuation support", () => {
  assertThrows(
    () =>
      form7217Pdf.instances?.({
        form7217s: [{
          ...item,
          distributed_properties: Array.from({ length: 31 }, (_, index) => ({
            description: `Property ${index + 1}`,
            property_treatment: Form7217PropertyTreatment.Section732Property,
            partnership_basis_before_distribution: index === 0 ? 7_000 : 0,
            fair_market_value: index === 0 ? 9_000 : 0,
            partner_basis_after_section_732: index === 0 ? 6_000 : 0,
          })),
        }],
      }, filer),
    Error,
    "attached Part II continuation",
  );
});
