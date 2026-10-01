import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { annualInputSchema } from "../../../nodes/inputs/f8854/annual.ts";
import { f8854Annual } from "../../../nodes/inputs/f8854/annual_node.ts";
import { ReportedFormCode } from "../../../nodes/inputs/f8854/section-c.ts";
import { form8854AnnualNoEvent } from "../../form8854_annual.fixture.ts";
import { form8992Filer } from "../../form8992.fixture.ts";
import { form8854Annual } from "../../mef/forms/f8854_annual.ts";
import { form8854AnnualPdf } from "./f8854_annual.ts";

const source = form8854AnnualNoEvent;
const pending = { f8854_annual: source };

Deno.test("annual Form 8854 prior-property source reaches native and matching PDF Part III", () => {
  const parsed = annualInputSchema.parse(source);
  assertEquals(
    f8854Annual.compute({ taxYear: 2025, formType: "f1040" }, parsed).outputs,
    [],
  );
  const native = form8854Annual.build(source, { pending });
  assertStringIncludes(native, "<AnnualExptrtStmtBfrSpcfdYrGrp>");
  assertStringIncludes(native, "<PropertyDesc>Stock holding</PropertyDesc>");
  assertStringIncludes(native, "<DeferredTaxAmt>50000</DeferredTaxAmt>");
  const [pdf] = form8854AnnualPdf.instances!(source, form8992Filer, pending);
  assertEquals(form8854AnnualPdf.pageIndices!(pdf), [0, 1, 2, 3, 4]);
  assertEquals(pdf.annual_statement, true);
  assertEquals(pdf.mailing_address, "1 Main St, Wilmington, DE 19801");
  assertEquals(pdf.property1_description, "Stock holding");
  assertEquals(pdf.property1_gain, 111_000);
  assertEquals(pdf.property1_deferred_tax, 50_000);
  assertEquals(pdf.no_eligible_distribution, true);
  assertEquals(pdf.no_trust_distribution, true);
  assertEquals(
    form8854AnnualPdf.fields.find((entry) =>
      entry.domainKey === "property1_deferred_tax"
    )?.pdfField,
    "topmostSubform[0].Page4[0].Table_Part3Ln1[0].BodyRow1[0].f4_7[0]",
  );
});

Deno.test("annual Form 8854 PDF rejects prior-ledger tampering and 2025 events", () => {
  assertThrows(
    () => form8854AnnualPdf.instances!(source, form8992Filer),
    Error,
    "finalized annual return",
  );
  assertThrows(
    () =>
      form8854AnnualPdf.instances!(source, form8992Filer, {
        f8854_annual: {
          ...source,
          part_i: {
            ...source.part_i,
            telephone: { kind: "US", number: "3025550124" },
          },
        },
      }),
    Error,
    "differs from the finalized return",
  );
  assertThrows(
    () =>
      form8854AnnualPdf.instances!(
        {
          ...source,
          prior_form8854_obligation_ledger: {
            ...source.prior_form8854_obligation_ledger,
            deferred_properties: [],
          },
        },
        form8992Filer,
        pending,
      ),
    Error,
  );
  assertThrows(
    () =>
      form8854AnnualPdf.instances!(
        {
          ...source,
          deferred_properties: [{
            ...source.deferred_properties[0],
            prior_deferred_tax_amount: 49_999,
          }],
        },
        form8992Filer,
        pending,
      ),
    Error,
  );
  const disposition = {
    ...source,
    deferred_properties: [{
      ...source.deferred_properties[0],
      disposition: {
        disposed_in_2025: true,
        entire_deferred_property_disposed_confirmed: true,
        disposition_date: "2025-05-20",
        reported_form_code: ReportedFormCode.Form8949,
        reported_transaction_id: "TX-STOCK",
        actual_sale_proceeds: 160_000,
        adjusted_basis_at_disposition: 100_000,
        deferred_tax_paid_amount: 50_000,
        interest_paid_amount: 5_000,
        payment_date: "2025-06-01",
        payment_by_unextended_due_date_confirmed: true,
        payment_confirmation_attachment_file_name: "deferred-tax-payment.pdf",
      },
    }],
  };
  assertThrows(
    () =>
      form8854AnnualPdf.instances!(disposition, form8992Filer, {
        f8854_annual: disposition,
      }),
    Error,
    "no 2025 events",
  );
});
