import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { f1040_2025 } from "../../../../2025/index.ts";
import { buildMefXml } from "../../../../2025/mef/builder.ts";
import { buildPending } from "../../../../2025/mef/execution/pending.ts";
import { form8959Pdf } from "../../../../2025/pdf/forms/taxes/employment/f8959.ts";
import { FilingStatus } from "../../../../mef/header.ts";

// Whole-dollar tax/withholding expectations follow the TY2025 Form 8959
// instructions, including Example 5's two-earner joint return.
const cases = [
  {
    id: "single-withholding",
    status: "single",
    wages: [220000],
    medicare: [220000],
    withheld: [3370],
    tax: 180,
    credit: 180,
  },
  {
    id: "joint-two-earners",
    status: "mfj",
    wages: [150000, 175000],
    medicare: [150000, 175000],
    withheld: [2175, 2537.5],
    tax: 675,
    credit: 0,
  },
  {
    id: "joint-zero-tax-trigger",
    status: "mfj",
    wages: [220000],
    medicare: [220000],
    withheld: [3370],
    tax: 0,
    credit: 180,
  },
  {
    id: "separate-threshold",
    status: "mfs",
    wages: [200000],
    medicare: [200000],
    withheld: [2900],
    tax: 675,
    credit: 0,
  },
  {
    id: "box5-exceeds-box1",
    status: "single",
    wages: [190000],
    medicare: [220000],
    withheld: [3370],
    tax: 180,
    credit: 180,
  },
  {
    id: "joint-spouse-only",
    status: "mfj",
    wages: [220000],
    medicare: [220000],
    withheld: [3370],
    tax: 0,
    credit: 180,
    spouseOnly: true,
  },
  {
    id: "joint-threshold-no-employer-trigger",
    status: "mfj",
    wages: [200000, 100000],
    medicare: [200000, 100000],
    withheld: [2900, 1450],
    tax: 450,
    credit: 0,
  },
] as const;
const schema =
  ".state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd";
let schemaAvailable = false;
try {
  schemaAvailable = Deno.statSync(schema).isFile;
} catch { /* local schema */ }

const evidenceDir = Deno.args.find((arg) => arg.startsWith("--evidence-dir="))
  ?.slice("--evidence-dir=".length);

for (const c of cases) {
  Deno.test({
    name: `Form8959 public source/native/PDF projection: ${c.id}`,
    ignore: !schemaAvailable,
    fn: async () => {
      const hasSpouse = c.status !== "single";
      const general = {
        filing_status: c.status,
        taxpayer_first_name: "Alex",
        taxpayer_last_name: "Worker",
        taxpayer_ssn: "111223333",
        taxpayer_dob: "1985-06-15",
        digital_assets: false,
        address_line1: "1 Main St",
        address_city: "Austin",
        address_state: "TX",
        address_zip: "78701",
        ...(hasSpouse
          ? {
            spouse_first_name: "Sam",
            spouse_last_name: "Worker",
            spouse_ssn: "222334444",
            spouse_dob: "1986-02-01",
          }
          : {}),
      };
      const w2 = c.wages.map((wage, i) => ({
        employer_name: `Employer ${i + 1}`,
        employer_ein: i ? "234567890" : "123456789",
        employer_address_line1: "10 Employer St",
        employer_address_city: "Austin",
        employer_address_state: "TX",
        employer_address_zip: "78701",
        employee_ssn: i === 1 || ("spouseOnly" in c && c.spouseOnly)
          ? "222334444"
          : "111223333",
        box1_wages: wage,
        box2_fed_withheld: 30000,
        box3_ss_wages: Math.min(wage, 176100),
        box4_ss_withheld: Math.min(wage, 176100) * 0.062,
        box5_medicare_wages: c.medicare[i],
        box6_medicare_withheld: c.withheld[i],
      }));
      const filer = {
        primarySSN: "111223333",
        firstName: "Alex",
        firstNameWithInitial: "Alex",
        lastName: "Worker",
        nameLine1: hasSpouse && c.status === "mfj"
          ? "ALEX & SAM WORKER"
          : "ALEX WORKER",
        nameControl: "WORK",
        fullName: "Alex Worker",
        address: {
          line1: "1 Main St",
          city: "Austin",
          state: "TX",
          zip: "78701",
        },
        filingStatus: c.status === "single"
          ? FilingStatus.Single
          : c.status === "mfj"
          ? FilingStatus.MarriedFilingJointly
          : FilingStatus.MarriedFilingSeparately,
        softwareId: "12345678",
        originator: { efin: "123456", originatorType: "ERO" as const },
        ...(hasSpouse
          ? {
            spouse: {
              ssn: "222334444",
              firstName: "Sam",
              lastName: "Worker",
              nameControl: "WORK",
            },
          }
          : {}),
      };
      const result = f1040_2025.executeReturn({ general, w2 });
      assertEquals(result.diagnostics, []);
      const p = buildPending(result.pending);
      const fields = result.pending.form8959;
      assertEquals(
        fields.line1_medicare_wages,
        c.medicare.reduce((a: number, b: number) => a + b, 0),
      );
      assertEquals(fields.line18_total_tax, c.tax);
      assertEquals(fields.line24_total_withheld, c.credit);
      assertEquals(p.schedule2?.line11_additional_medicare ?? 0, c.tax);
      assertEquals(
        p.f1040?.line25c_additional_medicare_withheld ?? 0,
        c.credit,
      );
      assertEquals(
        p.f1040?.line24_total_tax,
        Number(p.f1040?.line16_income_tax) + c.tax,
      );
      assertEquals(
        p.f1040?.line25d_total_withholding,
        c.wages.length * 30000 + c.credit,
      );
      const projected = form8959Pdf.projectFields!(fields, result.pending);
      assertEquals(projected.line18_total_tax, c.tax);
      assertEquals(projected.line24_total_withheld, c.credit);
      const xml = buildMefXml(p, filer);
      assertStringIncludes(xml, "<IRS8959");
      const child = new Deno.Command("xmllint", {
        args: ["--noout", "--schema", schema, "-"],
        stdin: "piped",
        stdout: "piped",
        stderr: "piped",
      }).spawn();
      const writer = child.stdin.getWriter();
      await writer.write(new TextEncoder().encode(xml));
      await writer.close();
      const checked = await child.output();
      assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
      if (evidenceDir) {
        await Deno.mkdir(evidenceDir, { recursive: true });
        await Deno.writeTextFile(`${evidenceDir}/${c.id}.xml`, xml);
        await Deno.writeTextFile(
          `${evidenceDir}/${c.id}.json`,
          JSON.stringify(
            {
              inputs: { general, w2 },
              filer,
              expected: c,
              pending: result.pending,
              projected,
            },
            null,
            2,
          ),
        );
      }
      const changed = {
        ...structuredClone(p),
        form8959: {
          ...structuredClone(fields),
          w2_medicare_wages: Number(fields.w2_medicare_wages) + 1,
        },
      };
      assertThrows(() => buildMefXml(changed, filer));
      assertThrows(() =>
        form8959Pdf.projectFields!(changed.form8959, {
          ...result.pending,
          form8959: changed.form8959,
        })
      );
    },
  });
}
