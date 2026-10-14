import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { XMLParser } from "fast-xml-parser";
import { type FilerIdentity, FilingStatus } from "../../../../../mef/header.ts";
import {
  buildFirstYearPassiveSCorp7203,
  projectFirstYearPassiveSCorp7203,
} from "./form7203-passive-loss-projection.ts";
import { passiveSCorpLossRecords } from "../../../credits/earned-income/earned-income/eic_passive_s_corp_loss.fixture.ts";
import { form7203StockLossPdf } from "../../../../pdf/forms/income/business/f7203_stock_loss.ts";

const filer: FilerIdentity = {
  primarySSN: "111223333",
  fullName: "Alex Example",
  nameLine1: "EXAMPLE ALEX",
  nameControl: "EXAM",
  filingStatus: FilingStatus.Single,
  address: { line1: "1 Main St", city: "Austin", state: "TX", zip: "78701" },
};
const joint: FilerIdentity = {
  ...filer,
  filingStatus: FilingStatus.MarriedFilingJointly,
  spouse: {
    ssn: "444556666",
    firstName: "Casey",
    lastName: "Example",
    nameControl: "EXAM",
  },
};

function jointRecords(spouseOwned: boolean) {
  const { source, k1 } = passiveSCorpLossRecords();
  const owner = spouseOwned ? joint.spouse!.ssn : joint.primarySSN;
  for (
    const record of [
      source,
      source.stock_subscription,
      source.participation,
      source.issued_k1,
    ]
  ) {
    record.shareholder_ssn = owner;
  }
  source.stock_subscription.cash_payment.payer_ssn = owner;
  source.issued_k1.shareholder_name_as_on_k1 = spouseOwned
    ? "Casey Example"
    : "Alex Example";
  source.participation.spouse = {
    status: "married_same_spouse_all_year",
    spouse_ssn: spouseOwned ? joint.primarySSN : joint.spouse!.ssn,
    spouse_participation_record_reference:
      "Other spouse complete participation records",
  };
  k1.recipient_tin = owner;
  k1.eic_passive_activity_review.recipient_tin = owner;
  return { source, k1 };
}

for (const cash of [1000, 4000, 6000]) {
  Deno.test(`Passive Form 7203 cash ${cash} projects original stock and basis-limited Part III consistently`, () => {
    const { source, k1 } = passiveSCorpLossRecords(cash);
    const projection = projectFirstYearPassiveSCorp7203(source, k1, filer);
    const p = projection.pdfFields;
    const xml =
      new XMLParser().parse(buildFirstYearPassiveSCorp7203(source, k1, filer))
        .IRS7203;
    const allowed = Math.min(4000, cash), carry = 4000 - allowed;
    assertEquals(xml.ShareholderPersonNm, p.shareholder_name);
    assertEquals(xml.ShareholderSSN, Number(p.shareholder_ssn));
    assertEquals(xml.StockBasisBeginTaxYearAmt, 0);
    assertEquals(
      xml.CapitalContributionBasisAmt,
      p.line2_cash_capital_contribution,
    );
    assertEquals(
      xml.StockBasisBfrDistributionsAmt,
      p.line5_basis_before_distributions,
    );
    assertEquals(
      xml.StockBasisAftrDistributionsAmt,
      p.line7_basis_after_distributions,
    );
    assertEquals(xml.StockBasisBeforeLossDedAmt, p.line10_basis_before_loss);
    assertEquals(xml.TotalDecreaseStockBasisAmt, allowed);
    assertEquals(p.line11_allowable_stock_loss, allowed);
    assertEquals(p.line14_basis_decrease, allowed);
    assertEquals(xml.StockBasisEndTaxYearAmt, p.line15_ending_basis);
    assertEquals(p.line15_ending_basis, Math.max(0, cash - 4000));
    assertEquals(
      xml.ShrCurrentYrLossDeductionsGrp.OrdinaryBusinessLossAmt,
      4000,
    );
    assertEquals(
      xml.ShrAllwblLossFromStockBasisGrp.OrdinaryBusinessLossAmt,
      allowed,
    );
    assertEquals(p.line35_current_loss, 4000);
    assertEquals(p.line47_current_loss, 4000);
    assertEquals(p.line35_allowed_stock, allowed);
    assertEquals(p.line47_allowed_stock, allowed);
    assertEquals(p.line35_carryover ?? 0, carry);
    assertEquals(p.line47_carryover ?? 0, carry);
    assertEquals(
      xml.ShrCarryoverAmountsGrp?.OrdinaryBusinessLossAmt ?? 0,
      carry,
    );
    assertEquals(xml.ShareholderDebtBasisGrp, undefined);
    assertEquals(projection.stages.filingRouteAdmitted, false);
    const widgetKeys = new Set(
      form7203StockLossPdf.fields.map((field) => field.domainKey),
    );
    assertEquals(Object.keys(p).filter((key) => !widgetKeys.has(key)), []);
  });
}

for (const spouseOwned of [false, true]) {
  Deno.test(`Passive Form 7203 retains ${spouseOwned ? "spouse" : "primary"} ownership and the other spouse's participation record`, () => {
    const { source, k1 } = jointRecords(spouseOwned);
    const p = projectFirstYearPassiveSCorp7203(source, k1, joint).pdfFields;
    assertEquals(p.shareholder_ssn, spouseOwned ? "444556666" : "111223333");
    assertEquals(
      p.shareholder_name,
      spouseOwned ? "Casey Example" : "Alex Example",
    );
    assertStringIncludes(
      buildFirstYearPassiveSCorp7203(source, k1, joint),
      `<ShareholderSSN>${p.shareholder_ssn}</ShareholderSSN>`,
    );
    source.participation.spouse.spouse_ssn = p.shareholder_ssn;
    assertThrows(() => projectFirstYearPassiveSCorp7203(source, k1, joint));
  });
}

Deno.test("Passive Form 7203 rejects missing filer, wrong name, marital status, ownership and unsupported status", () => {
  const { source, k1 } = passiveSCorpLossRecords();
  assertThrows(() => projectFirstYearPassiveSCorp7203(source, k1, undefined));
  assertThrows(() =>
    projectFirstYearPassiveSCorp7203(source, k1, {
      ...filer,
      primarySSN: "444556666",
    })
  );
  assertThrows(() =>
    projectFirstYearPassiveSCorp7203(source, k1, {
      ...filer,
      fullName: "Different Owner",
    })
  );
  assertThrows(() => projectFirstYearPassiveSCorp7203(source, k1, joint));
  assertThrows(() =>
    projectFirstYearPassiveSCorp7203(source, k1, {
      ...filer,
      filingStatus: FilingStatus.MarriedFilingSeparately,
    })
  );
  const spouse = jointRecords(true);
  assertThrows(() =>
    projectFirstYearPassiveSCorp7203(spouse.source, spouse.k1, {
      ...joint,
      spouse: undefined,
    })
  );
});

Deno.test("Passive Form 7203 projection replays bank/source joins and rejects illegal IRS names", () => {
  const { source, k1 } = passiveSCorpLossRecords();
  source.stock_subscription.cash_payment.shareholder_bank_debit += 1;
  assertThrows(() => buildFirstYearPassiveSCorp7203(source, k1, filer));
  source.stock_subscription.cash_payment.shareholder_bank_debit -= 1;
  source.corporation_name =
    source.issued_k1.corporation_name =
    k1
      .corporation_name =
      "Bad/Business";
  assertThrows(() => buildFirstYearPassiveSCorp7203(source, k1, filer));
  source.issued_k1.shareholder_name_as_on_k1 = "Alex!Example";
  assertThrows(() => projectFirstYearPassiveSCorp7203(source, k1, filer));
});

const XSD_PATH = new URL(
  "../../../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/Shared/IRS7203/IRS7203.xsd",
  import.meta.url,
).pathname;
for (
  const c of [
    {
      id: "basis_suspended",
      records: () => passiveSCorpLossRecords(1000),
      filer,
    },
    {
      id: "basis_exhausted",
      records: () => passiveSCorpLossRecords(4000),
      filer,
    },
    {
      id: "basis_remaining",
      records: () => passiveSCorpLossRecords(6000),
      filer,
    },
    { id: "joint_primary", records: () => jointRecords(false), filer: joint },
    { id: "joint_spouse", records: () => jointRecords(true), filer: joint },
  ]
) {
  Deno.test(`XSD: standalone passive Form 7203 ${c.id}`, async () => {
    await Deno.stat(XSD_PATH); // Required evidence; missing schema fails rather than ignores this gate.
    const { source, k1 } = c.records();
    const xml = buildFirstYearPassiveSCorp7203(source, k1, c.filer).replace(
      "<IRS7203>",
      '<IRS7203 xmlns="http://www.irs.gov/efile" documentId="IRS7203-1">',
    );
    const path = await Deno.makeTempFile({
      prefix: `opentax-passive7203-${c.id}-`,
      suffix: ".xml",
    });
    await Deno.writeTextFile(path, xml);
    const validation = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", XSD_PATH, path],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(
      validation.code,
      0,
      new TextDecoder().decode(validation.stderr),
    );
    console.log(`Retained standalone XML: ${path}`);
  });
}
