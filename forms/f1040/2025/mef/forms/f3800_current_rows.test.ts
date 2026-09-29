import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import {
  buildForm3800CurrentCreditRowXml,
  combineForm3800CurrentCreditAmounts,
  largestForm3800CurrentEntity,
} from "./f3800_current_rows.ts";

Deno.test("Form 3800 column c combines the same entity across source sets", () => {
  assertEquals(
    largestForm3800CurrentEntity([
      { entity: { ein: "123456789" }, credit: 60 },
      { entity: { ein: "987654321" }, credit: 100 },
      { entity: { ein: "123456789" }, credit: 60 },
    ]),
    { ein: "123456789" },
  );
  assertThrows(
    () =>
      largestForm3800CurrentEntity([{
        entity: { missingEinReason: "APPLD FOR" },
        credit: 10,
      }]),
    Error,
    "pass-through source is invalid",
  );
});

Deno.test("Form 3800 current-year rows combine passive and nonpassive credit on one line", () => {
  assertEquals(
    combineForm3800CurrentCreditAmounts(
      [
        {
          line: "1h",
          grossCredit: 900,
          transferOutCredit: 0,
          appliedCredit: 500,
        },
        {
          line: "4b",
          grossCredit: 200,
          transferOutCredit: 0,
          appliedCredit: 200,
        },
      ],
      [
        {
          line: "1h",
          beforePassiveLimit: 400,
          afterPassiveLimit: 300,
          appliedCredit: 100,
        },
        {
          line: "1e",
          beforePassiveLimit: 150,
          afterPassiveLimit: 120,
          appliedCredit: 120,
        },
      ],
    ),
    [
      {
        line: "1e",
        nonpassiveCredit: 0,
        transferOutCredit: 0,
        passiveBeforeLimit: 150,
        passiveAfterLimit: 120,
        totalCredit: 120,
        appliedCredit: 120,
      },
      {
        line: "1h",
        nonpassiveCredit: 900,
        transferOutCredit: 0,
        passiveBeforeLimit: 400,
        passiveAfterLimit: 300,
        totalCredit: 1_200,
        appliedCredit: 600,
      },
      {
        line: "4b",
        nonpassiveCredit: 200,
        transferOutCredit: 0,
        passiveBeforeLimit: 0,
        passiveAfterLimit: 0,
        totalCredit: 200,
        appliedCredit: 200,
      },
    ],
  );
});

Deno.test("Form 3800 line 1e caps the combined passive and nonpassive access credit", () => {
  const amounts = combineForm3800CurrentCreditAmounts(
    [{
      line: "1e",
      grossCredit: 3_000,
      transferOutCredit: 0,
      appliedCredit: 3_000,
    }],
    [{
      line: "1e",
      beforePassiveLimit: 2_001,
      afterPassiveLimit: 2_001,
      appliedCredit: 2_001,
    }],
  );
  assertThrows(
    () =>
      buildForm3800CurrentCreditRowXml(amounts[0], {
        sourceCount: 2,
      }),
    Error,
    "disabled-access line 1e exceeds $5,000",
  );
});

Deno.test("Form 3800 current-year rows reject duplicate and unreconciled source amounts", () => {
  assertThrows(
    () =>
      combineForm3800CurrentCreditAmounts([
        {
          line: "1h",
          grossCredit: 100,
          transferOutCredit: 0,
          appliedCredit: 50,
        },
        {
          line: "1h",
          grossCredit: 100,
          transferOutCredit: 0,
          appliedCredit: 50,
        },
      ], []),
    Error,
    "nonpassive row is invalid",
  );
  assertThrows(
    () =>
      combineForm3800CurrentCreditAmounts([], [{
        line: "1h",
        beforePassiveLimit: 100,
        afterPassiveLimit: 80,
        appliedCredit: 90,
      }]),
    Error,
    "passive row is invalid",
  );
  assertThrows(
    () =>
      combineForm3800CurrentCreditAmounts([
        {
          line: "1h",
          grossCredit: 100,
          transferOutCredit: 0,
          appliedCredit: 101,
        },
      ], []),
    Error,
    "nonpassive row is invalid",
  );
});

Deno.test("Form 3800 current-year rows keep gross credit separate from a transfer-out", () => {
  assertEquals(
    combineForm3800CurrentCreditAmounts(
      [{
        line: "1f",
        grossCredit: 1_000,
        transferOutCredit: 300,
        appliedCredit: 600,
      }],
      [{
        line: "1f",
        beforePassiveLimit: 250,
        afterPassiveLimit: 200,
        appliedCredit: 100,
      }],
    ),
    [{
      line: "1f",
      nonpassiveCredit: 1_000,
      transferOutCredit: 300,
      passiveBeforeLimit: 250,
      passiveAfterLimit: 200,
      totalCredit: 900,
      appliedCredit: 700,
    }],
  );
  assertThrows(
    () =>
      combineForm3800CurrentCreditAmounts([{
        line: "1f",
        grossCredit: 1_000,
        transferOutCredit: 300,
        appliedCredit: 701,
      }], []),
    Error,
    "nonpassive row is invalid",
  );
});

Deno.test("Form 3800 current-year rows reconcile cent-precision Form 8826 with whole-dollar passive credit", () => {
  const [row] = combineForm3800CurrentCreditAmounts(
    [{
      line: "1e",
      grossCredit: 1_250.25,
      transferOutCredit: 0,
      appliedCredit: 1_000.10,
    }],
    [{
      line: "1e",
      beforePassiveLimit: 150,
      afterPassiveLimit: 100,
      appliedCredit: 50,
    }],
  );
  assertEquals(row, {
    line: "1e",
    nonpassiveCredit: 1_250.25,
    transferOutCredit: 0,
    passiveBeforeLimit: 150,
    passiveAfterLimit: 100,
    totalCredit: 1_350.25,
    appliedCredit: 1_050.10,
  });
  const xml = buildForm3800CurrentCreditRowXml(row, { sourceCount: 2 });
  assertStringIncludes(
    xml,
    "<GeneralBusCrFromNnPssvActyAmt>1250</GeneralBusCrFromNnPssvActyAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalGeneralBusCreditsAmt>1350</TotalGeneralBusCreditsAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalGeneralBusCreditsAppTxAmt>1050</TotalGeneralBusCreditsAppTxAmt>",
  );
});

Deno.test("Form 3800 current-year XML keeps shared passive, nonpassive, and transfer columns on one row", () => {
  const [row] = combineForm3800CurrentCreditAmounts(
    [{
      line: "1f",
      grossCredit: 1_000,
      transferOutCredit: 300,
      appliedCredit: 600,
    }],
    [{
      line: "1f",
      beforePassiveLimit: 250,
      afterPassiveLimit: 200,
      appliedCredit: 100,
    }],
  );
  const xml = buildForm3800CurrentCreditRowXml(row, {
    sourceCount: 2,
    transferRegistrationNumber: "CAABC12ABCDE",
    entity: { ein: "123456789" },
    referenceDocumentId: "IRS8835_1",
    referenceDocumentName: "IRS8835",
  });
  assertStringIncludes(
    xml,
    "<CYGeneralBusinessCrItemCnt>2</CYGeneralBusinessCrItemCnt>",
  );
  assertStringIncludes(
    xml,
    "<CrSubjToPassiveActyLmtAmt>250</CrSubjToPassiveActyLmtAmt>",
  );
  assertStringIncludes(
    xml,
    "<GeneralBusCrFromNnPssvActyAmt>1000</GeneralBusCrFromNnPssvActyAmt>",
  );
  assertStringIncludes(
    xml,
    "<CreditTransferElectionAmt>-300</CreditTransferElectionAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalGeneralBusCreditsAmt>900</TotalGeneralBusCreditsAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalGeneralBusCreditsAppTxAmt>700</TotalGeneralBusCreditsAppTxAmt>",
  );
  assertThrows(
    () =>
      buildForm3800CurrentCreditRowXml(row, {
        sourceCount: 2,
      }),
    Error,
    "does not reconcile",
  );
});

Deno.test("Form 3800 mixed current-year row follows TY2025v5.4 IRS3800 XSD", async () => {
  const xsd = new URL(
    "../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/CorporateIncomeTax/Corp1120/IRS3800/IRS3800.xsd",
    import.meta.url,
  ).pathname;
  try {
    await Deno.stat(xsd);
  } catch {
    return;
  }
  const [row] = combineForm3800CurrentCreditAmounts(
    [{
      line: "1f",
      grossCredit: 1_000,
      transferOutCredit: 300,
      appliedCredit: 600,
    }],
    [{
      line: "1f",
      beforePassiveLimit: 250,
      afterPassiveLimit: 200,
      appliedCredit: 100,
    }],
  );
  const body = buildForm3800CurrentCreditRowXml(row, {
    sourceCount: 2,
    transferRegistrationNumber: "CAABC12ABCDE",
    entity: { ein: "123456789" },
    referenceDocumentId: "IRS8835-1",
    referenceDocumentName: "IRS8835",
  });
  const path = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(
      path,
      `<IRS3800 xmlns="http://www.irs.gov/efile" documentId="IRS3800-1">${body}</IRS3800>`,
    );
    const checked = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, path],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
  } finally {
    await Deno.remove(path);
  }
});
