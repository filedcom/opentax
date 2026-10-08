import {
  form7220ReviewedFixture,
  form7220StatementFixture,
} from "../../../domains/credits/form8908/form8908_form7220_fixture.ts";
import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { form8908 } from "./f8908.ts";
import { form8908Pdf } from "../../../pdf/forms/credits/f8908.ts";

function sixClassSource() {
  const classes = [
    ["residential", false, undefined],
    ["manufactured", true, undefined],
    ["multifamily", false, true],
    ["multifamily", true, true],
    ["multifamily", false, false],
    ["multifamily", true, false],
  ] as const;
  return {
    f8908s: classes.map((
      [program, zero_energy_ready, prevailing_wage_met],
      index,
    ) => ({
      contractor_ssn: "111223333",
      eligible_contractor_and_program_participation_verified: true,
      basis_during_construction_verified: true,
      no_duplicate_rehabilitation_or_energy_credit_verified: true,
      street: `${index + 1} Main Street`,
      city: "Albany",
      state: "NY",
      zip: "12207",
      acquired_on: "2025-06-01",
      acquired_by_other_person_for_residence_verified: true,
      acquisition_record_reference: `sale-${index + 1}`,
      contractor_basis_record_reference: `basis-${index + 1}`,
      program,
      zero_energy_ready,
      prevailing_wage_met,
      form7220: prevailing_wage_met
        ? {
          review_reference: `Form7220-review-${index + 1}`,
          acquisition_record_reference: `sale-${index + 1}`,
          residence: {
            street: `${index + 1} Main Street`,
            city: "Albany",
            state: "NY",
            zip: "12207",
            acquired_on: "2025-06-01",
          },
          pdf_file_name: `Form7220-${index + 1}.pdf`,
          pdf_sha256: String(index + 1).repeat(64),
          completed_for_residence_confirmed: true as const,
          reviewed_record: form7220ReviewedFixture(),
          signed_no_alterations_statement: form7220StatementFixture(
            index + 1,
            `${index + 1} Main Street`,
            `sale-${index + 1}`,
            `Form7220-review-${index + 1}`,
          ),
        }
        : undefined,
      certifier: {
        kind: "business" as const,
        name: index < 3 ? "North Certification LLC" : "South Certification LLC",
        state: "NY",
      },
      certification_reference: `certificate-${index + 1}`,
      certified_on: "2025-05-01",
      certification_modified: index === 5,
    })),
  };
}

const credit = {
  f8908_credit: {
    credit_amount: 16_500,
    subject_to_passive_activity_limit: false,
  },
};

function pwaContext(source: {
  f8908s: readonly {
    acquisition_record_reference: string;
    form7220?: {
      pdf_file_name: string;
      pdf_sha256: string;
      review_reference: string;
      signed_no_alterations_statement: {
        pdf_file_name: string;
        pdf_sha256: string;
        review_reference: string;
      };
    };
  }[];
}) {
  const homes = source.f8908s.filter((home) => home.form7220 !== undefined);
  return {
    binaryAttachmentFileNames: homes.flatMap((home) => [
      home.form7220!.pdf_file_name,
      home.form7220!.signed_no_alterations_statement.pdf_file_name,
    ]),
    attachmentDescriptionsByFileName: Object.fromEntries(
      homes.flatMap((home) => [
        [
          home.form7220!.pdf_file_name,
          `Form 7220 ${
            home.form7220!.review_reference
          } for Form 8908 home ${home.acquisition_record_reference}`,
        ],
        [
          home.form7220!.signed_no_alterations_statement.pdf_file_name,
          `Form 7220 no-alterations statement ${
            home.form7220!.signed_no_alterations_statement.review_reference
          } for home ${home.acquisition_record_reference}`,
        ],
      ]),
    ),
    attachmentSha256ByFileName: Object.fromEntries(homes.flatMap((home) => [
      [home.form7220!.pdf_file_name, home.form7220!.pdf_sha256],
      [
        home.form7220!.signed_no_alterations_statement.pdf_file_name,
        home.form7220!.signed_no_alterations_statement.pdf_sha256,
      ],
    ])),
    documentIdsByAttachmentFileName: Object.fromEntries(
      homes.flatMap((home, index) => [
        [home.form7220!.pdf_file_name, `BinaryAttachment${index * 2 + 1}`],
        [
          home.form7220!.signed_no_alterations_statement.pdf_file_name,
          `BinaryAttachment${index * 2 + 2}`,
        ],
      ]),
    ),
  };
}

Deno.test("staged IRS8908 and official PDF project all six classes, certifiers, and addresses", () => {
  const source = sixClassSource();
  const xml = form8908.build(source, {
    pending: { f8908: source, f3800: credit },
    ...pwaContext(source),
  });
  assertStringIncludes(
    xml,
    "<EligibleContractorInd>true</EligibleContractorInd>",
  );
  assertStringIncludes(xml, "<TotCertifierCnt>2</TotCertifierCnt>");
  assertStringIncludes(xml, "<TotHomesCertifiedCnt>6</TotHomesCertifiedCnt>");
  assertStringIncludes(
    xml,
    "<TotQlfyEgyStarProgCertAmt>5000</TotQlfyEgyStarProgCertAmt>",
  );
  assertStringIncludes(xml, "<TotalCreditAmt>16500</TotalCreditAmt>");
  assertEquals((xml.match(/<CertifierInformationGrp>/g) ?? []).length, 2);
  assertEquals((xml.match(/<QualifiedHomesAddresses>/g) ?? []).length, 6);

  const printed = form8908Pdf.projectFields!(source, {
    f8908: source,
    f3800: credit,
  });
  assertEquals(printed.itemD, 2);
  assertEquals(printed.itemE, 6);
  assertEquals(printed.line4b, 5_000);
  assertEquals(printed.line6b, 1_000);
  assertEquals(printed.line8, 16_500);
  assertEquals(printed.certifier_2_modified, 1);
  assertEquals(printed.home_6_street, "6 Main Street");
  assertEquals(form8908Pdf.pageIndices!(printed), [0, 1, 2]);
  assertEquals(
    form8908Pdf.fields.find((field) => field.domainKey === "home_20_zip")
      ?.pdfField,
    "topmostSubform[0].Page3[0].Table_PartIII[0].Row20[0].f3_80[0]",
  );
});

Deno.test("staged IRS8908 preserves an individual certifier in native and PDF output", () => {
  const original = sixClassSource();
  const source = {
    f8908s: original.f8908s.map((home, index) =>
      index === 0
        ? {
          ...home,
          certifier: {
            kind: "person" as const,
            name: "Jane Certifier",
            state: "NY",
          },
        }
        : home
    ),
  };
  const pending = { f8908: source, f3800: credit };
  const xml = form8908.build(source, { pending, ...pwaContext(original) });
  assertStringIncludes(xml, "<PersonNm>Jane Certifier</PersonNm>");
  assertStringIncludes(
    xml,
    "<BusinessNameLine1Txt>North Certification LLC</BusinessNameLine1Txt>",
  );
  const fields = form8908Pdf.projectFields!(source, pending);
  assertEquals(fields.certifier_1_name, "Jane Certifier");
  assertEquals(fields.certifier_2_name, "North Certification LLC");
  const overlong = {
    f8908s: source.f8908s.map((home, index) =>
      index === 0
        ? {
          ...home,
          certifier: {
            kind: "person" as const,
            name: "A".repeat(36),
            state: "NY",
          },
        }
        : home
    ),
  };
  assertThrows(
    () =>
      form8908.build(overlong, {
        pending: { f8908: overlong, f3800: credit },
      }),
    Error,
    "identity field",
  );
});

Deno.test("staged Form 8908 projections reject missing or altered Form 3800 credit", () => {
  const source = sixClassSource();
  assertThrows(
    () => form8908.build(source, { pending: { f8908: source } }),
    Error,
    "needs a Form 3800 line 1p source",
  );
  const changedCredit = {
    f8908_credit: { ...credit.f8908_credit, credit_amount: 16_501 },
  };
  assertThrows(
    () =>
      form8908.build(source, {
        pending: { f8908: source, f3800: changedCredit },
      }),
    Error,
    "does not reconcile",
  );
  assertThrows(
    () =>
      form8908Pdf.projectFields!(source, {
        f8908: source,
        f3800: changedCredit,
      }),
    Error,
    "does not reconcile",
  );
  const changedHome = sixClassSource();
  changedHome.f8908s[0].street = changedHome.f8908s[1].street;
  assertThrows(
    () =>
      form8908Pdf.projectFields!(changedHome, {
        f8908: changedHome,
        f3800: credit,
      }),
    Error,
    "same home",
  );
});

Deno.test("staged Form 8908 rejects certifiers beyond the 38-row paper inventory", () => {
  const base = sixClassSource().f8908s[0];
  const many = {
    f8908s: Array.from({ length: 39 }, (_, index) => ({
      ...base,
      street: `${index + 1} Main Street`,
      acquisition_record_reference: `sale-${index + 1}`,
      contractor_basis_record_reference: `basis-${index + 1}`,
      certification_reference: `certificate-${index + 1}`,
      certifier: {
        ...base.certifier,
        name: `Certification Company ${index + 1}`,
      },
    })),
  };
  assertThrows(
    () =>
      form8908Pdf.projectFields!(many, {
        f8908: many,
        f3800: {
          f8908_credit: {
            credit_amount: 97_500,
            subject_to_passive_activity_limit: false,
          },
        },
      }),
    Error,
    "38 certifier rows",
  );
});

Deno.test("staged Form 8908 lists only the first twenty qualified-home addresses", () => {
  const base = sixClassSource().f8908s[0];
  const many = {
    f8908s: Array.from({ length: 21 }, (_, index) => ({
      ...base,
      street: `${index + 1} Main Street`,
      acquisition_record_reference: `sale-${index + 1}`,
      contractor_basis_record_reference: `basis-${index + 1}`,
      certification_reference: `certificate-${index + 1}`,
    })),
  };
  const claim = {
    f8908_credit: {
      credit_amount: 52_500,
      subject_to_passive_activity_limit: false,
    },
  };
  const xml = form8908.build(many, {
    pending: { f8908: many, f3800: claim },
  });
  assertEquals((xml.match(/<QualifiedHomesAddresses>/g) ?? []).length, 20);
  assertStringIncludes(xml, "<TotHomesCertifiedCnt>21</TotHomesCertifiedCnt>");
  const printed = form8908Pdf.projectFields!(many, {
    f8908: many,
    f3800: claim,
  });
  assertEquals(printed.home_20_street, "20 Main Street");
  assertEquals(printed.home_21_street, undefined);
  assertEquals(printed.line8, 52_500);
});
