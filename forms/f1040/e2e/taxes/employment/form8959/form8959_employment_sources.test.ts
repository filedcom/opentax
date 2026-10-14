import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { f1040_2025 } from "../../../../2025/index.ts";
import { buildMefXml } from "../../../../2025/mef/builder.ts";
import { buildPending } from "../../../../2025/mef/execution/pending.ts";
import { buildPdfBytes } from "../../../../2025/pdf/builder.ts";
import { FilingStatus } from "../../../../mef/header.ts";

// Ordinary tax uses the TY2025 IRS MFJ brackets: 23,850 / 96,950 / 206,700.
// https://www.irs.gov/irb/2024-45_IRB
const cases = [
  {
    id: "joint-tips",
    wages: 125000,
    tips: true,
    reclassified: [0, 0],
    medicare: 54,
    tipTax: 458,
    wageTax: 0,
    incomeTax: 39574,
    totalTax: 40086,
  },
  {
    id: "joint-reclassified",
    wages: 50000,
    tips: false,
    reclassified: [200000, 30000],
    medicare: 720,
    tipTax: 0,
    wageTax: 13013,
    incomeTax: 57334,
    totalTax: 71067,
  },
  {
    id: "joint-mixed",
    wages: 100000,
    tips: true,
    reclassified: [20000, 30000],
    medicare: 54,
    tipTax: 458,
    wageTax: 3825,
    incomeTax: 39574,
    totalTax: 43911,
  },
] as const;
const schema =
  ".state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd";
const evidenceDir = Deno.args.find((arg) => arg.startsWith("--evidence-dir="))
  ?.slice("--evidence-dir=".length);
const owners = [
  { recipient: "taxpayer", ssn: "111223333", name: "Cafe", ein: "123456789" },
  {
    recipient: "spouse",
    ssn: "222334444",
    name: "Restaurant",
    ein: "234567890",
  },
] as const;
const general = {
  filing_status: "mfj",
  taxpayer_first_name: "Alex",
  taxpayer_last_name: "Worker",
  taxpayer_ssn: "111223333",
  taxpayer_dob: "1985-06-15",
  spouse_first_name: "Sam",
  spouse_last_name: "Worker",
  spouse_ssn: "222334444",
  spouse_dob: "1986-02-01",
  digital_assets: false,
  address_line1: "1 Main St",
  address_city: "Austin",
  address_state: "TX",
  address_zip: "78701",
};
const filer = {
  primarySSN: "111223333",
  firstName: "Alex",
  firstNameWithInitial: "Alex",
  lastName: "Worker",
  fullName: "Alex Worker",
  nameLine1: "ALEX & SAM WORKER",
  nameControl: "WORK",
  spouse: {
    ssn: "222334444",
    firstName: "Sam",
    lastName: "Worker",
    nameControl: "WORK",
  },
  address: { line1: "1 Main St", city: "Austin", state: "TX", zip: "78701" },
  filingStatus: FilingStatus.MarriedFilingJointly,
  softwareId: "12345678",
  originator: { efin: "123456", originatorType: "ERO" as const },
};
for (const c of cases) {
  Deno.test(`Form8959 complete joint employment sources: ${c.id}`, async () => {
    const w2 = owners.map((owner) => ({
      employer_name: owner.name,
      employer_ein: owner.ein,
      employee_ssn: owner.ssn,
      employer_address_line1: "10 Employer St",
      employer_address_city: "Austin",
      employer_address_state: "TX",
      employer_address_zip: "78701",
      box1_wages: c.wages,
      box2_fed_withheld: 20000,
      box3_ss_wages: c.wages,
      box4_ss_withheld: c.wages * 0.062,
      box5_medicare_wages: c.wages,
      box6_medicare_withheld: c.wages * 0.0145,
    }));
    const inputs = {
      general,
      w2,
      ...(c.tips
        ? {
          form4137: {
            forms: owners.map((owner, i) => ({
              recipient: owner.recipient,
              ss_wages_from_w2: c.wages,
              employers: [{
                name: owner.name,
                ein: owner.ein,
                tips_received: i ? 2000 : 4000,
                tips_reported: 0,
              }],
              ...(i ? {} : {
                below_20_tip_months: [{
                  employer_index: 1,
                  month: 1,
                  tips_received: 15,
                  tips_reported: 0,
                }],
              }),
            })),
          },
        }
        : {}),
      ...(c.reclassified[0]
        ? {
          form8919: {
            forms: owners.map((owner, i) => ({
              recipient: owner.recipient,
              employers: [{
                name: "Other employer",
                tin_type: "ein",
                tin: "345678901",
                wages: c.reclassified[i],
                reason_code: "G",
                ss8_filed_date: "2025-04-01",
                ss8_filing_reference: `Synthetic SS8 ${owner.recipient}`,
                form1099_received: false,
              }],
            })),
          },
        }
        : {}),
    };
    const result = f1040_2025.executeReturn(inputs);
    assertEquals(result.diagnostics, []);
    const pending = buildPending(result.pending);
    const tax = pending.f1040!;
    const medicare = result.pending.form8959;
    assertEquals(tax.line1c_unreported_tips ?? 0, c.tips ? 6000 : 0);
    assertEquals(
      tax.line1g_wages_8919 ?? 0,
      c.reclassified[0] + c.reclassified[1],
    );
    assertEquals(medicare.line2_unreported_tips ?? 0, c.tips ? 5985 : 0);
    assertEquals(
      medicare.line3_wages_8919 ?? 0,
      c.reclassified[0] + c.reclassified[1],
    );
    assertEquals(medicare.line18_total_tax, c.medicare);
    assertEquals(pending.schedule2?.line5_unreported_tip_tax ?? 0, c.tipTax);
    assertEquals(
      pending.schedule2?.line6_uncollected_8919 ?? 0,
      c.wageTax,
    );
    assertEquals(tax.line16_income_tax, c.incomeTax);
    assertEquals(tax.line24_total_tax, c.totalTax);
    assertEquals(tax.line25d_total_withholding, 40000);
    assertEquals(tax.line37_amount_owed, c.totalTax - 40000);
    const xml = buildMefXml(pending, filer);
    assertStringIncludes(xml, "<IRS8959");
    for (
      const [tag, required] of [["IRS4137", c.tips], [
        "IRS8919",
        c.reclassified[0] > 0,
      ]] as const
    ) {
      const documents = [
        ...xml.matchAll(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "g")),
      ].map((match) => match[1]);
      assertEquals(documents.length, required ? 2 : 0);
      if (required) {
        for (const owner of owners) {
          assertEquals(
            documents.filter((document) =>
              document.includes(`<SSN>${owner.ssn}</SSN>`)
            ).length,
            1,
          );
        }
      }
    }
    const validator = new Deno.Command("xmllint", {
      args: ["--noout", "--schema", schema, "-"],
      stdin: "piped",
      stdout: "piped",
      stderr: "piped",
    }).spawn();
    const writer = validator.stdin.getWriter();
    await writer.write(new TextEncoder().encode(xml));
    await writer.close();
    const checked = await validator.output();
    assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
    const pdf = await buildPdfBytes(pending, filer);
    if (evidenceDir) {
      await Deno.mkdir(evidenceDir, { recursive: true });
      await Deno.writeTextFile(
        `${evidenceDir}/${c.id}.json`,
        JSON.stringify(
          { inputs, filer, expected: c, pending: result.pending },
          null,
          2,
        ),
      );
      await Deno.writeTextFile(`${evidenceDir}/${c.id}.xml`, xml);
      await Deno.writeFile(`${evidenceDir}/${c.id}.pdf`, pdf);
    }
    for (const key of ["unreported_tips", "wages_8919"] as const) {
      if (
        (key === "unreported_tips" && !c.tips) ||
        (key === "wages_8919" && !c.reclassified[0])
      ) continue;
      const changed = {
        ...pending,
        form8959: { ...medicare, [key]: Number(medicare[key]) + 0.01 },
      };
      assertThrows(
        () => buildMefXml(changed, filer),
        Error,
        `${key} differs from original source records`,
      );
      await assertRejects(
        () => buildPdfBytes(changed, filer),
        Error,
        `${key} differs from original source records`,
      );
    }
  });
}
