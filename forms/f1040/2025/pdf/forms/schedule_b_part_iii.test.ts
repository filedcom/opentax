import { assertEquals } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { FilingStatus } from "../../mef/types.ts";
import { scheduleBPdf } from "./schedule_b.ts";

Deno.test("Schedule B PDF maps both answers for every Part III question", () => {
  const find = (key: string, value: string) =>
    scheduleBPdf.fields.find((entry) =>
      entry.kind === "checkboxWhen" && entry.domainKey === key &&
      entry.whenValue === value
    )?.pdfField;
  assertEquals(
    find("foreign_accounts_question", "true"),
    "topmostSubform[0].Page1[0].TagcorrectingSubform[0].c1_1[0]",
  );
  assertEquals(
    find("foreign_accounts_question", "false"),
    "topmostSubform[0].Page1[0].TagcorrectingSubform[0].c1_1[1]",
  );
  assertEquals(
    find("fincen_form114_required", "true"),
    "topmostSubform[0].Page1[0].c1_2[0]",
  );
  assertEquals(
    find("fincen_form114_required", "false"),
    "topmostSubform[0].Page1[0].c1_2[1]",
  );
  assertEquals(
    find("foreign_trust_question", "true"),
    "topmostSubform[0].Page1[0].c1_3[0]",
  );
  assertEquals(
    find("foreign_trust_question", "false"),
    "topmostSubform[0].Page1[0].c1_3[1]",
  );
});

Deno.test("Schedule B PDF includes a Part III-only filing", () => {
  assertEquals(
    scheduleBPdf.includeWhen?.({ foreign_accounts_question: true }),
    true,
  );
  assertEquals(
    scheduleBPdf.includeWhen?.({ foreign_trust_question: true }),
    true,
  );
  assertEquals(
    scheduleBPdf.includeWhen?.({ foreign_accounts_question: false }),
    false,
  );
});

Deno.test("Schedule B PDF includes seller-financed and adjustment filings below $1,500", () => {
  assertEquals(
    scheduleBPdf.includeWhen?.({
      seller_financed_rows: [{ buyer: {}, amount: 900 }],
    }),
    true,
  );
  assertEquals(scheduleBPdf.includeWhen?.({ interest_nominee: 100 }), true);
  assertEquals(scheduleBPdf.includeWhen?.({ dividend_nominee: 100 }), true);
});

Deno.test("Schedule B PDF uses separate strict $1,500 thresholds", () => {
  assertEquals(
    scheduleBPdf.includeWhen?.({
      print_line4_total: 800,
      print_line6_total: 900,
    }),
    false,
  );
  assertEquals(scheduleBPdf.includeWhen?.({ print_line4_total: 1_500 }), false);
  assertEquals(scheduleBPdf.includeWhen?.({ print_line6_total: 1_500 }), false);
  assertEquals(scheduleBPdf.includeWhen?.({ print_line4_total: 1_501 }), true);
  assertEquals(scheduleBPdf.includeWhen?.({ print_line6_total: 1_501 }), true);
  assertEquals(scheduleBPdf.includeWhen?.({ ee_bond_exclusion: 500 }), true);
});

Deno.test("Schedule B PDF prints two countries or appends a longer list", async () => {
  const short = scheduleBPdf.projectFields?.({
    foreign_country_names: ["Canada", "France"],
  }, {});
  assertEquals(short?.print_foreign_country_line1, "Canada");
  assertEquals(short?.print_foreign_country_line2, "France");
  const long = scheduleBPdf.projectFields?.({
    foreign_country_names: ["Canada", "France", "Germany"],
  }, {});
  assertEquals(
    long?.print_foreign_country_line1,
    "See attached country statement",
  );
  const pdf = await PDFDocument.create();
  pdf.addPage([612, 792]);
  await scheduleBPdf.appendSupplementalPages?.(
    pdf,
    { foreign_country_names: ["Canada", "France", "Germany"] },
    {
      primarySSN: "123456789",
      nameLine1: "TAXPAYER TEST",
      nameControl: "TAXP",
      address: {
        line1: "1 Test Way",
        city: "Austin",
        state: "TX",
        zip: "78701",
      },
      filingStatus: FilingStatus.Single,
      softwareId: "12345678",
      originator: { efin: "123456", originatorType: "ERO" },
    },
  );
  assertEquals(pdf.getPageCount(), 2);
});
