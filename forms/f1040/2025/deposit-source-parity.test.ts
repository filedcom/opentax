import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { extractFilerIdentity } from "../mef/filer.ts";
import { f1040_2025 } from "./index.ts";
import { buildMefXml } from "./mef/builder.ts";
import { buildPending } from "./mef/pending.ts";
import { buildPdfBytes } from "./pdf/builder.ts";
import { pdfReviewFixtures } from "./pdf/review-fixtures.ts";

const fixture = pdfReviewFixtures.find((item) =>
  item.id === "single-w2-refund"
)!;
const xsdPath = new URL(
  "../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;

async function validateReturn(xml: string): Promise<void> {
  const path = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(path, xml);
    const checked = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsdPath, path],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
  } finally {
    await Deno.remove(path);
  }
}

Deno.test("Form 1040 refund bank source reaches native return and filled PDF; orphan filed details fail closed", async () => {
  const general = {
    ...(fixture.inputs.general as Record<string, unknown>),
    bank_routing_number: "021000021",
    bank_account_number: "123456789",
    bank_account_type: "checking",
  };
  const result = f1040_2025.executeReturn({
    ...fixture.inputs,
    general,
    w2: (fixture.inputs.w2 as Record<string, unknown>[]).map((wage) => ({
      ...wage,
      employee_ssn: (fixture.inputs.general as { taxpayer_ssn: string })
        .taxpayer_ssn,
    })),
  });
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  const filer = extractFilerIdentity(result.pending.f1040)!;
  assertEquals(filer.bankAccount?.routingNumber, "021000021");
  const xml = buildMefXml(pending, filer);
  assertEquals(
    xml.includes("<RoutingTransitNum>021000021</RoutingTransitNum>"),
    true,
  );
  assertEquals(
    xml.includes("<DepositorAccountNum>123456789</DepositorAccountNum>"),
    true,
  );
  await validateReturn(xml);
  const filled = await buildPdfBytes(pending, filer, ".pdf-cache");
  assertEquals((await PDFDocument.load(filled)).getPageCount(), 2);
  const path = await Deno.makeTempFile({ suffix: ".pdf" });
  try {
    await Deno.writeFile(path, filled);
    const extracted = await new Deno.Command("pdftotext", {
      args: ["-layout", path, "-"],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(extracted.code, 0, new TextDecoder().decode(extracted.stderr));
    const rendered = new TextDecoder().decode(extracted.stdout);
    assertEquals(rendered.replace(/\s/g, "").includes("021000021"), true);
    assertEquals(rendered.replace(/\s/g, "").includes("123456789"), true);
  } finally {
    await Deno.remove(path);
  }

  const orphan = {
    ...pending,
    general: {
      ...pending.general,
      bank_routing_number: undefined,
      bank_account_number: undefined,
      bank_account_type: undefined,
    },
  } as typeof pending;
  const filerWithoutBank = { ...filer, bankAccount: undefined };
  assertThrows(
    () => buildMefXml(orphan, filerWithoutBank),
    Error,
    "filed direct-deposit details need the retained general bank source",
  );
  await assertRejects(
    () => buildPdfBytes(orphan, filerWithoutBank, ".pdf-cache"),
    Error,
    "filed direct-deposit details need the retained general bank source",
  );
});

Deno.test("Form 1040 Form 8888 attachment is linked in native XML and marked on filled PDF", async () => {
  const allocation = pdfReviewFixtures.find((item) =>
    item.id === "single-form8888-two-account-refund"
  )!;
  const result = f1040_2025.executeReturn({
    ...allocation.inputs,
    w2: (allocation.inputs.w2 as Record<string, unknown>[]).map((wage) => ({
      ...wage,
      employee_ssn: (allocation.inputs.general as { taxpayer_ssn: string })
        .taxpayer_ssn,
    })),
  });
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  const filer = extractFilerIdentity(result.pending.f1040)!;
  const xml = buildMefXml(pending, filer);
  assertEquals(
    /<Form8888Ind referenceDocumentId="IRS8888\d+" referenceDocumentName="IRS8888">X<\/Form8888Ind>/
      .test(xml),
    true,
  );
  await validateReturn(xml);
  const filled = await buildPdfBytes(pending, filer, ".pdf-cache");
  assertEquals((await PDFDocument.load(filled)).getPageCount(), 3);
  const path = await Deno.makeTempFile({ suffix: ".pdf" });
  try {
    await Deno.writeFile(path, filled);
    const extracted = await new Deno.Command("pdftotext", {
      args: ["-layout", path, "-"],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(extracted.code, 0, new TextDecoder().decode(extracted.stderr));
    const rendered = new TextDecoder().decode(extracted.stdout);
    const indicatorLine = rendered.split("\n").find((line) =>
      line.includes("If Form 8888 is attached")
    );
    assertEquals(indicatorLine?.includes("✔"), true);
    assertEquals(rendered.replace(/\s/g, "").includes("111222333"), true);
    assertEquals(rendered.replace(/\s/g, "").includes("444555666"), true);
  } finally {
    await Deno.remove(path);
  }
});
