import { test } from "bun:test";
import { assertEquals, assertStringIncludes } from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import {
  type PdfReviewFixture,
  pdfReviewFixtures,
} from "../../../../pdf/review-fixtures.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import {
  validateReturn1040Xsd,
  xmlDocuments,
  xmlValues,
  xsdAvailable,
} from "../../../../../e2e/ats/ty2025-export.ts";
import {
  returnFindings,
  signed,
} from "../../../../../../../scripts/testing/mef.ts";
import { otherWithholdingStatement } from "./other_withholding_statement.ts";

function fixture(id: string): PdfReviewFixture {
  const found = pdfReviewFixtures.find((item) => item.id === id);
  if (!found) throw new Error(`missing sample return ${id}`);
  return found;
}

async function exported(
  inputs: Record<string, unknown>,
  documents: Pick<PdfReviewFixture, "retainedSourceDocuments"> = {},
): Promise<string> {
  const result = f1040_2025.executeReturn(signed(inputs));
  assertEquals(result.diagnostics, []);
  const pending = normalizeAllPending(result.pending);
  const prepared = await f1040_2025.prepareReturn(
    pending,
    extractFilerIdentity(pending.f1040 ?? {}),
    [],
    documents.retainedSourceDocuments ?? [],
  );
  return prepared.bundle.xml;
}

const backupWithholding = fixture("single-k-blank-tin-withholding");

test("Form 1099-K backup withholding files a referenced OtherWithholdingStatement", async () => {
  const xml = await exported(backupWithholding.inputs);
  const [statement, ...others] = xmlDocuments(xml, "OtherWithholdingStatement");
  assertEquals(others, []);
  assertEquals(xmlValues(statement, "WithholdingCd"), ["FORM 1099"]);
  assertEquals(xmlValues(statement, "EIN"), ["234567890"]);
  assertEquals(xmlValues(statement, "WithholdingAmt"), ["480"]);
  const id = /documentId="([^"]+)"/.exec(statement)![1];
  assertStringIncludes(
    xml,
    `<Form1099WithheldTaxAmt referenceDocumentId="${id}" referenceDocumentName="OtherWithholdingStatement">480</Form1099WithheldTaxAmt>`,
  );
  if (xsdAvailable()) {
    const { success, stderr } = await validateReturn1040Xsd(xml);
    assertEquals(success, true, stderr);
  }
  assertEquals(
    (await returnFindings(backupWithholding.inputs)).includes(
      "rule F1040-034-08",
    ),
    false,
  );
});

test("each non-1099-R copy is one statement row and the rows sum with Form 1099-R", async () => {
  const inputs = {
    ...backupWithholding.inputs,
    f1099int: [{
      payer_name: "Example Bank",
      payer_tin: "45-6789012",
      recipient_tin: "111223333",
      box1: 1_000,
      box4: 240,
    }],
  };
  const xml = await exported(inputs);
  const [statement] = xmlDocuments(xml, "OtherWithholdingStatement");
  assertEquals(xmlValues(statement, "EIN"), ["456789012", "234567890"]);
  assertEquals(xmlValues(statement, "WithholdingAmt"), ["240", "480"]);
  assertEquals(xmlValues(xml, "Form1099WithheldTaxAmt"), ["720"]);
  if (xsdAvailable()) {
    const { success, stderr } = await validateReturn1040Xsd(xml);
    assertEquals(success, true, stderr);
  }
  assertEquals(
    (await returnFindings(inputs)).includes("rule F1040-034-08"),
    false,
  );
});

test("withholding filed only on Form 1099-R documents emits no statement", async () => {
  const roth = fixture("single-retained-4852-ordinary-roth");
  const xml = await exported(roth.inputs, roth);
  assertEquals(xmlDocuments(xml, "OtherWithholdingStatement"), []);
  assertEquals(
    xml.includes('referenceDocumentName="OtherWithholdingStatement"'),
    false,
  );
  assertEquals(xmlValues(xml, "Form1099WithheldTaxAmt"), ["1000"]);
});

test("no Form 1099 withholding emits no statement", () => {
  assertEquals(
    otherWithholdingStatement.build(undefined, {
      pending: {
        f1099int: {
          f1099ints: [{ payer_name: "Example Bank", box1: 100 }],
        },
      },
    }),
    "",
  );
});

test("an SSN-formatted payer TIN is not filed as an EIN", () => {
  const xml = otherWithholdingStatement.build(undefined, {
    pending: {
      f1099int: {
        f1099ints: [{
          payer_name: "Pat Payer",
          payer_tin: "123-45-6789",
          recipient_tin: "111223333",
          box1: 1_000,
          box4: 240,
        }],
      },
    },
  });
  assertEquals(xmlValues(xml, "EIN"), []);
  assertEquals(xmlValues(xml, "WithholdingAmt"), ["240"]);
});
