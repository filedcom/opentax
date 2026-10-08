import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import {
  form172NativePartILineMap,
  stageForm172LossYearNativeDocument,
} from "./form172_loss_year_native.ts";

const schema = new URL(
  "../../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/Shared/IRS172/IRS172.xsd",
  import.meta.url,
).pathname;
let schemaAvailable = false;
try {
  Deno.statSync(schema);
  schemaAvailable = true;
} catch { /* Private IRS bundle. */ }

function item(item_id: string, amount: number, business: boolean) {
  return {
    item_id,
    reference: `source:${item_id}`,
    owner_ssn: "111223333",
    business,
    amount,
  };
}
function facts() {
  return {
    tax_year: 2025,
    taxpayer_ssn: "111223333",
    spouse_ssn: undefined as string | undefined,
    reference: "2025-loss-review",
    filing_status: "single",
    reviewed_form1040: {
      reference: "2025-return-review",
      tax_year: 2025,
      taxpayer_ssn: "111223333",
      spouse_ssn: undefined as string | undefined,
      filing_status: "single",
      line11_agi: -50_000,
      line12_standard_or_itemized_deduction: 15_750,
    },
    limitations_review: {
      reference: "allowed-loss-review",
      at_risk_and_passive_limits_applied: true,
      excess_business_loss_limit_applied: true,
    },
    noncapital_income: [item("gross", 10_000, true)],
    noncapital_deductions: [
      { ...item("expenses", 60_000, true), location: "agi" },
      { ...item("standard", 15_750, false), location: "line12" },
    ],
    capital_gains:
      [] as (ReturnType<typeof item> & { section1202_excluded: number })[],
    capital_losses: [] as ReturnType<typeof item>[],
    prior_nol_deductions: [] as {
      item_id: string;
      reference: string;
      owner_ssn: string;
      amount: number;
    }[],
  };
}
async function bound(v = facts(), text = JSON.stringify(v)) {
  const bytes = new TextEncoder().encode(text);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  const sha256 = Array.from(digest, (n) => n.toString(16).padStart(2, "0"))
    .join("");
  return {
    binding: {
      reference: v.reference,
      sha256,
      tax_year: 2025,
      taxpayer_ssn: v.taxpayer_ssn,
      spouse_ssn: v.spouse_ssn,
    },
    documents: [{ reference: v.reference, bytes }],
  };
}
async function validate(xml: string) {
  const dir = await Deno.makeTempDir({ prefix: "172-native-" });
  try {
    const file = `${dir}/document.xml`;
    await Deno.writeTextFile(
      file,
      xml.replace(
        "<IRS172>",
        '<IRS172 xmlns="http://www.irs.gov/efile" documentId="Staged172">',
      ),
    );
    const r = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", schema, file],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(r.code, 0, new TextDecoder().decode(r.stderr));
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
}

Deno.test({
  name:
    "Form 172 native Part I map matches all 24 IRS schema lines in exact order",
  ignore: !schemaAvailable,
}, async () => {
  const xsd = await Deno.readTextFile(schema);
  const partI = xsd.slice(
    xsd.indexOf('<xsd:complexType name="IRS172Type">'),
    xsd.indexOf("<!-- =============== Part II"),
  );
  const rows = [
    ...partI.matchAll(
      /<xsd:element name="([^"]+)"[^>]*>[\s\S]*?<LineNumber>Part I, Line (\d+)<\/LineNumber>[\s\S]*?<\/xsd:element>/g,
    ),
  ].map((m) => [Number(m[2]), m[1]]);
  assertEquals(rows.length, 24);
  assertEquals<unknown>(form172NativePartILineMap, rows);
});

Deno.test({
  name:
    "Form 172 native ordinary loss retains negative NOL and required skipped-line zero",
  ignore: !schemaAvailable,
}, async () => {
  const f = await bound();
  const r = await stageForm172LossYearNativeDocument(f.binding, f.documents);
  assertStringIncludes(r.native_xml!, "<IncomeAmt>-65750</IncomeAmt>");
  assertStringIncludes(
    r.native_xml!,
    "<NetOperatingLossAmt>-50000</NetOperatingLossAmt>",
  );
  assertStringIncludes(
    r.native_xml!,
    "<DiffSmllrCombNetSchDLossFSAmt>0</DiffSmllrCombNetSchDLossFSAmt>",
  );
  assertEquals(r.lines[21], undefined);
  assertEquals(r.native_xml!.includes("<CombNetSchDLossAmt>"), false);
  assertEquals(r.native_xml!.includes("NOLCarryoverPrecYrGrp"), false);
  assertEquals(r.reviewPackageBytesVerified, true);
  assertEquals(r.packetAdmissionVerified, false);
  assertEquals(r.issuerAuthenticityVerified, false);
  assertEquals(r.filingReady, false);
  await validate(r.native_xml!);
});

for (
  const [status, limit] of [["single", 3000], [
    "married_filing_separately",
    1500,
  ]] as const
) {
  Deno.test({
    name:
      `Form 172 native ${status} capital-loss limit reconciles to original loss`,
    ignore: !schemaAvailable,
  }, async () => {
    const v = facts();
    v.filing_status = status;
    v.reviewed_form1040.filing_status = status;
    v.capital_losses.push(item("investment-loss", 5000, false));
    v.reviewed_form1040.line11_agi = -50_000 - limit;
    const f = await bound(v),
      r = await stageForm172LossYearNativeDocument(f.binding, f.documents);
    assertStringIncludes(
      r.native_xml!,
      `<SmllrCombNetSchDLossOrFSAmt>${limit}</SmllrCombNetSchDLossOrFSAmt>`,
    );
    assertEquals(r.regularNol, 50_000);
    await validate(r.native_xml!);
  });
}

Deno.test({
  name:
    "Form 172 native section 1202 restoration includes positive capital difference",
  ignore: !schemaAvailable,
}, async () => {
  const v = facts();
  v.capital_gains.push({
    ...item("qsbs", 1000, false),
    section1202_excluded: 1000,
  });
  v.capital_losses.push(item("business-capital-loss", 3000, true));
  v.reviewed_form1040.line11_agi = -53_000;
  const f = await bound(v),
    r = await stageForm172LossYearNativeDocument(f.binding, f.documents);
  assertStringIncludes(
    r.native_xml!,
    "<Section1202ExclusionAmt>1000</Section1202ExclusionAmt>",
  );
  assertStringIncludes(
    r.native_xml!,
    "<DiffSmllrCombNetSchDLossFSAmt>1000</DiffSmllrCombNetSchDLossFSAmt>",
  );
  assertEquals(r.regularNol, 49_000);
  assertEquals(
    [...r.native_xml!.matchAll(/<([A-Za-z0-9]+)>-?\d+<\//g)].length,
    24,
  );
  await validate(r.native_xml!);
});

Deno.test({
  name:
    "Form 172 native joint and prior NOL review retains only computed origin loss",
  ignore: !schemaAvailable,
}, async () => {
  const v = facts();
  v.filing_status = "married_filing_jointly";
  v.spouse_ssn = "999887777";
  v.reviewed_form1040.filing_status = v.filing_status;
  v.reviewed_form1040.spouse_ssn = v.spouse_ssn;
  v.noncapital_income.push({
    ...item("spouse-wages", 15_000, true),
    owner_ssn: v.spouse_ssn,
  });
  v.noncapital_deductions[1].amount = 31_500;
  v.prior_nol_deductions.push({
    item_id: "old-nol",
    reference: "old-nol-record",
    owner_ssn: v.spouse_ssn,
    amount: 20_000,
  });
  v.reviewed_form1040.line11_agi = -55_000;
  v.reviewed_form1040.line12_standard_or_itemized_deduction = 31_500;
  const f = await bound(v),
    r = await stageForm172LossYearNativeDocument(f.binding, f.documents);
  assertStringIncludes(
    r.native_xml!,
    "<NOLDeductionLossOtherYearsAmt>20000</NOLDeductionLossOtherYearsAmt>",
  );
  assertEquals(r.regularNol, 35_000);
  await validate(r.native_xml!);
  await assertRejects(() =>
    stageForm172LossYearNativeDocument({
      ...f.binding,
      spouse_ssn: "222334444",
    }, f.documents)
  );
});

Deno.test("Form 172 native non-loss stops and historic workpapers cannot use the TY2025 projection", async () => {
  const v = facts();
  v.noncapital_income[0].amount = 80_000;
  v.reviewed_form1040.line11_agi = 20_000;
  const f = await bound(v),
    r = await stageForm172LossYearNativeDocument(f.binding, f.documents);
  assertEquals(r.native_xml, undefined);
  const old = facts();
  old.tax_year = 2024;
  old.reviewed_form1040.tax_year = 2024;
  const g = await bound(old);
  await assertRejects(() =>
    stageForm172LossYearNativeDocument(g.binding, g.documents)
  );
  await assertRejects(() =>
    stageForm172LossYearNativeDocument(
      { ...f.binding, tax_year: 2024 },
      f.documents,
    )
  );
});

Deno.test("Form 172 native rejects modified, detached, duplicate and noncanonical review records", async () => {
  const v = facts(), f = await bound(v);
  await assertRejects(() =>
    stageForm172LossYearNativeDocument(
      { ...f.binding, lines: { "24": -1 } },
      f.documents,
    )
  );
  await assertRejects(() =>
    stageForm172LossYearNativeDocument({
      ...f.binding,
      taxpayer_ssn: "999887777",
    }, f.documents)
  );
  await assertRejects(() => stageForm172LossYearNativeDocument(f.binding, []));
  await assertRejects(() =>
    stageForm172LossYearNativeDocument(f.binding, [
      ...f.documents,
      ...f.documents,
    ])
  );
  await assertRejects(() =>
    stageForm172LossYearNativeDocument(f.binding, [{
      ...f.documents[0],
      bytes: new TextEncoder().encode("{}"),
    }])
  );
  for (
    const text of [
      JSON.stringify(v, null, 2),
      `\ufeff${JSON.stringify(v)}`,
      JSON.stringify(v).replace(
        '"tax_year":2025',
        '"tax_year":2024,"tax_year":2025',
      ),
    ]
  ) {
    const bad = await bound(v, text);
    await assertRejects(() =>
      stageForm172LossYearNativeDocument(bad.binding, bad.documents)
    );
  }
  const changed = facts();
  changed.noncapital_income[0].amount++;
  const bad = await bound(changed);
  await assertRejects(() =>
    stageForm172LossYearNativeDocument(bad.binding, bad.documents)
  );
});

Deno.test("Form 172 native owns binding and review bytes before asynchronous verification", async () => {
  const f = await bound();
  const pending = stageForm172LossYearNativeDocument(f.binding, f.documents);
  f.binding.taxpayer_ssn = "999887777";
  f.binding.sha256 = "0".repeat(64);
  f.documents[0].bytes.fill(0);
  const r = await pending;
  assertEquals(r.taxpayerSsn, "111223333");
  assertEquals(r.regularNol, 50_000);
});
