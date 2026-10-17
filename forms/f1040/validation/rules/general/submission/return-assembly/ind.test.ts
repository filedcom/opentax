import { test } from "bun:test";
import { assertEquals } from "@std/assert";
import { emittedRulePasses } from "../../../../../../../core/test-utils/emitted-rule.ts";
import { IND_RULES } from "./ind.ts";

const dependent = (ssn: string, relationship: string, ctc: boolean) =>
  `<DependentDetail><DependentSSN>${ssn}</DependentSSN><DependentRelationshipCd>${relationship}</DependentRelationshipCd>` +
  (ctc ? "<EligibleForChildTaxCreditInd>X</EligibleForChildTaxCreditInd>" : "") + "</DependentDetail>";
const f1040 = (body: string) => `<IRS1040 documentId="a">${body}</IRS1040>`;

test("IND-154-02 rejects an ITIN only on the dependent claimed for the child tax credit", () => {
  const credit = "<CTCODCAmt>2200</CTCODCAmt>";
  assertEquals(
    emittedRulePasses(IND_RULES, "IND-154-02", {
      documents: f1040(dependent("400001057", "SON", true) + dependent("912701234", "PARENT", false) + credit),
    }),
    true,
  );
  assertEquals(
    emittedRulePasses(IND_RULES, "IND-154-02", {
      documents: f1040(dependent("912701234", "SON", true) + credit),
    }),
    false,
  );
});

test("IND-088 reads each dependent's own relationship code", () => {
  const passes = (documents: string) => emittedRulePasses(IND_RULES, "IND-088", { documents });
  assertEquals(passes(f1040(dependent("400001057", "SON", true) + dependent("400001058", "PARENT", false))), true);
  assertEquals(passes(f1040(dependent("400001058", "PARENT", true) + dependent("400001057", "SON", false))), false);
});

test("IND-298-01 counts Forms 1310 and court certificates for two deceased filers", () => {
  const ret = f1040("<PrimaryDeathDt>2025-05-01</PrimaryDeathDt><SpouseDeathDt>2025-07-01</SpouseDeathDt><RefundAmt>500</RefundAmt>");
  const certificate = '<BinaryAttachment documentId="b"><Desc>Personal Representative Court Certificate</Desc></BinaryAttachment>';
  const passes = (documents: string, form1310: number) =>
    emittedRulePasses(IND_RULES, "IND-298-01", { documents, filingStatus: 2, forms: { form1310 } });
  assertEquals(passes(ret + certificate, 1), true);
  assertEquals(passes(ret, 2), true);
  assertEquals(passes(ret + certificate, 0), false);
});

// The engine skips database and duplicate rules; these tests run their checks.
const CHECKED = IND_RULES.map((r) => ({ ...r, category: "incorrect_data" as const }));
const ts = (date: string) => `<ReturnTs>${date}T10:00:00-05:00</ReturnTs>`;
const check = (id: string, c: Parameters<typeof emittedRulePasses>[2]) =>
  emittedRulePasses(CHECKED, id, { primarySSN: "400011234", ...c });

test("IND-901 and IND-907 reject a TIN the SSA or IRS cannot have issued", () => {
  assertEquals(check("IND-901", { documents: f1040("") }), true);
  assertEquals(check("IND-901", { documents: f1040(""), primarySSN: "666011234" }), false);
  assertEquals(check("IND-901", { documents: f1040(""), primarySSN: "400001234" }), false);
  assertEquals(check("IND-907", { documents: f1040(dependent("912701234", "PARENT", false)) }), true);
  assertEquals(check("IND-907", { documents: f1040(dependent("912451234", "PARENT", false)) }), false);
});

test("IND-507-01 and IND-510-02 refuse a TIN used twice in the return", () => {
  const two = dependent("400021111", "SON", false) + dependent("400021111", "DAUGHTER", false);
  assertEquals(check("IND-507-01", { documents: f1040(dependent("400021111", "SON", false)) }), true);
  assertEquals(check("IND-507-01", { documents: f1040(two) }), false);
  const spouse = { spouseSSN: "400031111", filingStatus: 2 };
  assertEquals(check("IND-510-02", { documents: f1040(dependent("400021111", "SON", false)), ...spouse }), true);
  assertEquals(check("IND-510-02", { documents: f1040(dependent("400031111", "SON", false)), ...spouse }), false);
});

test("IND-180-01 needs a six-digit IP PIN that is not all zeros", () => {
  const pin = (p: string) => `<IdentityProtectionPIN>${p}</IdentityProtectionPIN>`;
  assertEquals(check("IND-180-01", { header: pin("123456"), documents: f1040("") }), true);
  assertEquals(check("IND-180-01", { header: pin("000000"), documents: f1040("") }), false);
  assertEquals(check("IND-180-01", { header: pin("12345"), documents: f1040("") }), false);
});

test("IND-031-04 needs one well-formed prior-year PIN or AGI, or an IP PIN", () => {
  const signed = (grp: string, extra = "") =>
    `<SelfSelectPINGrp>${grp}</SelfSelectPINGrp>${extra}<PINTypeCd>Self-Select On-Line</PINTypeCd>` +
    "<PrimarySignaturePIN>12345</PrimarySignaturePIN>";
  const passes = (header: string) => check("IND-031-04", { header, documents: f1040("") });
  assertEquals(passes(signed("<PrimaryPriorYearAGIAmt>0</PrimaryPriorYearAGIAmt>")), true);
  assertEquals(passes(signed("<PrimaryPriorYearPIN>54321</PrimaryPriorYearPIN>")), true);
  assertEquals(passes(signed("", "<IdentityProtectionPIN>123456</IdentityProtectionPIN>")), true);
  assertEquals(passes(signed("<PrimaryPriorYearPIN>00000</PrimaryPriorYearPIN>")), false);
  assertEquals(passes(signed("<PrimaryPriorYearAGIAmt>10.50</PrimaryPriorYearAGIAmt>")), false);
  assertEquals(
    passes(signed("<PrimaryPriorYearAGIAmt>0</PrimaryPriorYearAGIAmt><PrimaryPriorYearPIN>54321</PrimaryPriorYearPIN>")),
    false,
  );
  assertEquals(passes(signed("")), false);
});

test("IND-002 and IND-035-01 compare dates with ReturnTs", () => {
  const end = "<TaxPeriodEndDt>2025-12-31</TaxPeriodEndDt>";
  assertEquals(check("IND-002", { header: ts("2026-02-01") + end, documents: f1040("") }), true);
  assertEquals(check("IND-002", { header: ts("2025-12-31") + end, documents: f1040("") }), false);
  const died = (d: string) => f1040(`<PrimaryDeathDt>${d}</PrimaryDeathDt>`);
  assertEquals(check("IND-035-01", { header: ts("2026-02-01"), documents: died("2025-05-01") }), true);
  assertEquals(check("IND-035-01", { header: ts("2026-02-01"), documents: died("2026-03-01") }), false);
  assertEquals(check("IND-035-01", { header: ts("2026-02-01"), documents: died("2024-12-31") }), false);
});

test("IND-689-01 and IND-100 read the processing year from ReturnTs", () => {
  const signed = (d: string) => `<PrimarySignatureDt>${d}</PrimarySignatureDt>`;
  assertEquals(check("IND-689-01", { header: ts("2026-03-01") + signed("2026-02-01"), documents: f1040("") }), true);
  assertEquals(check("IND-689-01", { header: ts("2026-03-01") + signed("2025-12-30"), documents: f1040("") }), false);
  assertEquals(check("IND-100", { header: ts("2028-03-01"), documents: f1040("") }), true);
  assertEquals(check("IND-100", { header: ts("2029-03-01"), documents: f1040("") }), false);
});

test("IND-184 needs IP PINs on a prior-year online original return", () => {
  const online = ts("2027-03-01") + "<OriginatorGrp><EFIN>123456</EFIN><OriginatorTypeCd>OnlineFiler</OriginatorTypeCd></OriginatorGrp>";
  assertEquals(check("IND-184", { header: online + "<IdentityProtectionPIN>123456</IdentityProtectionPIN>", documents: f1040("") }), true);
  assertEquals(check("IND-184", { header: online, documents: f1040("") }), false);
  assertEquals(check("IND-184", { header: ts("2026-03-01"), documents: f1040("") }), true);
});

test("IND-116-01 reads a child tax credit dependent's Schedule EIC birth year", () => {
  const eic = (year: number) =>
    `<IRS1040ScheduleEIC documentId="e"><QualifyingChildInformation><QualifyingChildSSN>400021111</QualifyingChildSSN>` +
    `<ChildBirthYr>${year}</ChildBirthYr></QualifyingChildInformation></IRS1040ScheduleEIC>`;
  const ret = (year: number) => f1040(dependent("400021111", "SON", true)) + eic(year);
  assertEquals(check("IND-116-01", { documents: ret(2010) }), true);
  assertEquals(check("IND-116-01", { documents: ret(2008) }), false);
});

test("IND-674-01 asks a Self-Select signer under 16 for a prior-year PIN or AGI", () => {
  const header = (grp: string) =>
    `<SelfSelectPINGrp><PrimaryBirthDt>2012-05-01</PrimaryBirthDt>${grp}</SelfSelectPINGrp><PINTypeCd>Self-Select On-Line</PINTypeCd>`;
  assertEquals(check("IND-674-01", { header: header("<PrimaryPriorYearPIN>54321</PrimaryPriorYearPIN>"), documents: f1040("") }), true);
  assertEquals(check("IND-674-01", { header: header("<PrimaryPriorYearAGIAmt>0</PrimaryPriorYearAGIAmt>"), documents: f1040("") }), false);
});

test("IND-451 refuses a late post-original return filed separately", () => {
  const amended = f1040("<AmendedReturnInd>X</AmendedReturnInd>");
  assertEquals(check("IND-451", { header: ts("2026-04-10"), documents: amended, filingStatus: 3 }), true);
  assertEquals(check("IND-451", { header: ts("2026-05-01"), documents: amended, filingStatus: 3 }), false);
  assertEquals(check("IND-451", { header: ts("2026-05-01"), documents: f1040(""), filingStatus: 3 }), true);
});
