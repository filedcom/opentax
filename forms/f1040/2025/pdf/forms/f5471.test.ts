import { assertEquals, assertThrows } from "@std/assert";
import {
  form8992Cfc,
  form8992Filer,
  form8992Pending,
} from "../../form8992.fixture.ts";
import { form5471Pdf } from "./f5471.ts";

Deno.test("Form 5471 PDF maps Category 4/5a, A, B, C, F, G, and I", () => {
  const [fields] = form5471Pdf.instances?.(
    {},
    form8992Filer,
    form8992Pending,
  ) ?? [];
  assertEquals(form5471Pdf.pageIndices?.(fields ?? {}), [0, 1, 2, 3, 4, 5]);
  assertEquals(fields?.category5a, true);
  assertEquals(fields?.category4, true);
  assertEquals(fields?.total_shares_end, 100);
  assertEquals(fields?.pro_rata_subpart_f_percent, 100);
  assertEquals(fields?.c_net_income, 60_000);
  assertEquals(fields?.f_total_assets_end, 170_000);
  assertEquals(fields?.shares_end, 100);
  assertEquals(fields?.line1f, 10_000);
  assertEquals(fields?.line2, 1_000);
  assertEquals(fields?.q7_cost_sharing, false);
  assertEquals(fields?.q21a_section304_ep, false);
  assertEquals(
    form5471Pdf.fields.some((entry) =>
      entry.domainKey === "q22a_section951a2b_distributions" ||
      entry.domainKey === "q22b_transition_rule_dividends"
    ),
    false,
  );
  assertEquals(
    form5471Pdf.fields.find((entry) => entry.domainKey === "q7_cost_sharing")
      ?.pdfField,
    "topmostSubform[0].Page5[0].c5_3[1]",
  );
  assertEquals(
    form5471Pdf.fields.filter((entry) => entry.domainKey === "shares_end")
      .map((entry) => entry.pdfField),
    [
      "topmostSubform[0].Page2[0].Table_SchB_PartI[0].Row1[0].Row1d[0].f2_10[0]",
      "topmostSubform[0].Page2[0].Table_SchB_PartII[0].Row1[0].Row1d[0].f2_81[0]",
    ],
  );
  assertThrows(() =>
    form5471Pdf.instances?.(
      {},
      form8992Filer,
      {
        ...form8992Pending,
        f5471: {
          f5471s: [{
            ...form8992Cfc,
            form5471_identity: {
              ...form8992Cfc.form5471_identity,
              no_stock_acquisition_disposition_or_reorganization: false,
            },
          }],
        },
      },
    ), Error);
  assertThrows(() =>
    form5471Pdf.instances?.(
      {},
      form8992Filer,
      {
        ...form8992Pending,
        f5471: {
          f5471s: [{
            ...form8992Cfc,
            schedule_g: {
              ...form8992Cfc.schedule_g,
              q22b_transition_rule_dividends: true,
            },
          }],
        },
      },
    ), Error);
  assertThrows(() =>
    form5471Pdf.instances?.(
      {},
      form8992Filer,
      {
        ...form8992Pending,
        schedule1: {
          ...form8992Pending.schedule1,
          line8n_section951a_inclusion: 10_999,
        },
      },
    ), Error);
});
