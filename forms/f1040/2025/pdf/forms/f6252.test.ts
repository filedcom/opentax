import { assertEquals, assertThrows } from "@std/assert";
import { type FilerIdentity, FilingStatus } from "../../mef/types.ts";
import { form6252Pdf } from "./f6252.ts";

const filer: FilerIdentity = {
  primarySSN: "123-45-6789",
  nameLine1: "Sam Sale",
  nameControl: "SALE",
  address: {
    line1: "123 Main Street",
    city: "Albany",
    state: "NY",
    zip: "12201",
  },
  filingStatus: FilingStatus.Single,
};

const sale = {
  property_description: "Vacant land",
  date_acquired: "2020-01-01",
  date_sold: "2025-06-01",
  sold_to_related_party: false,
  selling_price_determinable: true,
  selling_price: 100_000,
  mortgage_assumed: 0,
  cost_basis: 40_000,
  depreciation_allowed: 0,
  selling_expenses: 0,
  depreciation_recapture: 0,
  excluded_gain: 0,
  payments_received: 20_000,
  payments_received_prior_years: 0,
  is_capital_asset: true,
  is_long_term: true,
};

function mapped(key: string): string | undefined {
  return form6252Pdf.fields.find((entry) => entry.domainKey === key)?.pdfField;
}

Deno.test("2025 Form 6252 PDF maps the canonical identity, dates, and every Part I/II line", () => {
  assertEquals(form6252Pdf.pageIndices?.({}), [0]);
  assertEquals(
    form6252Pdf.filerFields?.map((entry) => entry.pdfField),
    [
      "topmostSubform[0].Page1[0].f1_1[0]",
      "topmostSubform[0].Page1[0].f1_2[0]",
    ],
  );
  assertEquals(
    mapped("property_description"),
    "topmostSubform[0].Page1[0].f1_3[0]",
  );
  assertEquals(
    mapped("date_acquired_printed"),
    "topmostSubform[0].Page1[0].f1_4[0]",
  );
  assertEquals(
    mapped("date_sold_printed"),
    "topmostSubform[0].Page1[0].f1_5[0]",
  );
  assertEquals(
    form6252Pdf.fields.filter((entry) =>
      entry.domainKey === "sold_to_related_party"
    )
      .map((entry) => entry.pdfField),
    [
      "topmostSubform[0].Page1[0].c1_1[0]",
      "topmostSubform[0].Page1[0].c1_1[1]",
    ],
  );
  for (let line = 5; line <= 26; line++) {
    assertEquals(
      mapped(`line${line}`),
      `topmostSubform[0].Page1[0].f1_${line + 1}[0]`,
    );
  }
  assertEquals(
    form6252Pdf.fields.filter((entry) => entry.domainKey === "line27").length,
    0,
  );
});

Deno.test("2025 Form 6252 PDF derives all sale lines and the exact five-decimal ratio", () => {
  const [instance] = form6252Pdf.instances?.(
    { f6252s: [sale] },
    filer,
    { schedule_d: { gain_form6252_lt: 12_000 } },
  ) ?? [];
  assertEquals(instance?.property_description, "Vacant land");
  assertEquals(instance?.date_acquired_printed, "01/01/2020");
  assertEquals(instance?.date_sold_printed, "06/01/2025");
  assertEquals(instance?.sold_to_related_party, false);
  assertEquals(instance?.selling_price_determinable, true);
  assertEquals(instance?.line5, 100_000);
  assertEquals(instance?.line8, 40_000);
  assertEquals(instance?.line16, 60_000);
  assertEquals(instance?.line18, 100_000);
  assertEquals(instance?.line19, "0.60000");
  assertEquals(instance?.line21, 20_000);
  assertEquals(instance?.line24, 12_000);
  assertEquals(instance?.line26, 12_000);
});

Deno.test("2025 Form 6252 PDF emits one page per sale and reconciles aggregate destination", () => {
  const second = {
    ...sale,
    property_description: "Second parcel",
    selling_price: 50_000,
    cost_basis: 20_000,
    payments_received: 10_000,
  };
  const instances = form6252Pdf.instances?.(
    { f6252s: [sale, second] },
    filer,
    { schedule_d: { gain_form6252_lt: 18_000 } },
  );
  assertEquals(instances?.length, 2);
  assertEquals(instances?.[1].property_description, "Second parcel");
  assertEquals(instances?.[1].line26, 6_000);
});

Deno.test("2025 Form 6252 PDF retains later-year zero and business-property destination", () => {
  const [later] = form6252Pdf.instances?.(
    {
      f6252s: [{
        ...sale,
        date_sold: "2024-06-01",
        payments_received_prior_years: 10_000,
      }],
    },
    filer,
    { schedule_d: { gain_form6252_lt: 12_000 } },
  ) ?? [];
  assertEquals(later?.line20, 0);
  assertEquals(later?.line23, 10_000);
  assertEquals(later?.line26, 12_000);

  const [finalPayment] = form6252Pdf.instances?.(
    {
      f6252s: [{
        ...sale,
        date_sold: "2024-06-01",
        payments_received_prior_years: 80_000,
        payments_received: 20_000,
      }],
    },
    filer,
    { schedule_d: { gain_form6252_lt: 12_000 } },
  ) ?? [];
  assertEquals(finalPayment?.line23, 80_000);
  assertEquals(finalPayment?.line21, 20_000);
  assertEquals(finalPayment?.line26, 12_000);

  const [business] = form6252Pdf.instances?.(
    { f6252s: [{ ...sale, is_capital_asset: false }] },
    filer,
    { form4797: { gain_form6252: 12_000 } },
  ) ?? [];
  assertEquals(business?.line26, 12_000);
});

Deno.test("2025 Form 6252 PDF closes incomplete source and unsupported filing paths", () => {
  assertThrows(
    () => form6252Pdf.instances?.({ f6252s: [sale] }),
    Error,
    "filer name and identifying number",
  );
  assertThrows(
    () =>
      form6252Pdf.instances?.(
        { f6252s: [{ ...sale, date_sold: undefined }] },
        filer,
      ),
    Error,
    "property, dates",
  );
  assertThrows(
    () =>
      form6252Pdf.instances?.({
        f6252s: [{ ...sale, sold_to_related_party: true }],
      }, filer),
    Error,
    "unrelated-party",
  );
  assertThrows(
    () =>
      form6252Pdf.instances?.({
        f6252s: [{ ...sale, depreciation_allowed: 5_000 }],
      }, filer),
    Error,
    "section 1245/1250",
  );
  assertThrows(
    () =>
      form6252Pdf.instances?.(
        { f6252s: [{ ...sale, gross_profit: 30_000 }] },
        filer,
      ),
    Error,
    "gross_profit must match",
  );
  assertThrows(
    () =>
      form6252Pdf.instances?.({
        f6252s: [{ ...sale, payments_received_prior_years: 1 }],
      }, filer),
    Error,
    "cannot have prior-year payments",
  );
  assertThrows(
    () =>
      form6252Pdf.instances?.({
        f6252s: [{ ...sale, payments_received: 100_000 }],
      }, filer),
    Error,
    "needs a payment after the sale year",
  );
  assertThrows(
    () =>
      form6252Pdf.instances?.(
        { f6252s: [sale] },
        filer,
        { schedule_d: { gain_form6252_lt: 11_999 } },
      ),
    Error,
    "Schedule D gain source",
  );
});
