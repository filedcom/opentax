import { test } from "bun:test";
import { assertStringIncludes, assertThrows } from "@std/assert";
import { FilingStatus } from "../../../../../mef/header.ts";
import type { F8862Input } from "../../../../../nodes/inputs/credits/individual/f8862/index.ts";
import { form8862Pdf } from "../../../../pdf/forms/credits/individual/f8862.ts";
import { form8862 } from "./f8862.ts";

const filer = {
  primarySSN: "123456789",
  nameLine1: "JANE DOE",
  nameControl: "DOE",
  firstName: "Jane",
  lastName: "Doe",
  address: { line1: "1 Main St", city: "Austin", state: "TX", zip: "78701" },
  filingStatus: FilingStatus.Single,
};
const general = {
  filing_status: "single",
  taxpayer_ssn: "123456789",
  prior_eic_disallowance_review: {
    status: "requires_8862",
    disallowed_year: 2023,
    disallowance_notice_reference: "Reviewed 2023 IRS EITC notice",
  },
};
const fields = {
  claim_eitc: true,
  credit_disallowance_ban_active: false,
  eitc_disallowed_year: 2023,
  eitc_disallowance_notice_reference: "Reviewed 2023 IRS EITC notice",
  eitc_income_reporting_only: false,
  eitc_qualifying_child_of_other: false,
  eitc_without_child: {
    primary: {
      main_home_us_days: 365,
      age: 35,
      claimed_as_dependent: false,
    },
  },
};
const pending = {
  general,
  f1040: { taxpayer_ssn: "123456789", line27_eitc: 500 },
  eitc: { credit_amount: 500, qualifying_children: 0 },
};
const authenticationError =
  "retained prior IRS notice copy with matching SHA-256";

function rejectsBoth(
  source: F8862Input,
  final: typeof pending,
  message: string,
) {
  assertThrows(
    () => form8862.build(source, { pending: final }),
    Error,
    message,
  );
  assertThrows(
    () => form8862Pdf.instances!(source, filer, final),
    Error,
    message,
  );
}

test("Form 8862 EITC-only childless and income-only claims retain calculation joins but cannot export an unauthenticated notice", () => {
  rejectsBoth(fields, pending, authenticationError);
  rejectsBoth(
    {
      ...fields,
      eitc_income_reporting_only: true,
      eitc_qualifying_child_of_other: undefined,
      eitc_without_child: undefined,
    },
    pending,
    authenticationError,
  );
});

test("Form 8862 EITC notice and final-credit tampering fails before the authentication gate", () => {
  for (
    const final of [
      {
        ...pending,
        general: {
          ...general,
          prior_eic_disallowance_review: {
            ...general.prior_eic_disallowance_review,
            disallowed_year: 2022,
          },
        },
      },
      {
        ...pending,
        general: { ...general, taxpayer_ssn: "999887777" },
      },
      { ...pending, eitc: { ...pending.eitc, credit_amount: 499 } },
    ]
  ) {
    rejectsBoth(fields, final, "matching reviewed prior IRS notice");
  }
  rejectsBoth(
    { ...fields, credit_disallowance_ban_active: true },
    pending,
    "matching reviewed prior IRS notice",
  );
  assertThrows(
    () =>
      form8862Pdf.instances!(fields, {
        ...filer,
        primarySSN: "999887777",
      }, pending),
    Error,
    "matching reviewed prior IRS notice",
  );
  assertThrows(
    () =>
      form8862.build(fields, {
        pending,
        filer: { ...filer, primarySSN: "999887777" },
      }),
    Error,
    "matching reviewed prior IRS notice",
  );
  rejectsBoth(fields, {
    ...pending,
    f1040: { ...pending.f1040, line27_eitc: 0 },
  }, "positive finalized Form 1040 line 27");
});

test("Form 8862 exports only with the retained notice copy whose bytes match its recorded SHA-256", () => {
  const digest = "b".repeat(64);
  const reviewed = {
    ...pending,
    general: {
      ...general,
      prior_eic_disallowance_review: {
        ...general.prior_eic_disallowance_review,
        notice_copy_reference: "2023-eic-notice-copy",
        notice_copy_sha256: digest,
      },
    },
  };
  const retained = { "2023-eic-notice-copy": digest };
  assertStringIncludes(
    form8862.build(fields, {
      pending: reviewed,
      filer,
      retainedSourceSha256ByReference: retained,
    }),
    "<EICClaimedInd>X</EICClaimedInd>",
  );
  for (
    const [final, hashes] of [
      [pending, retained],
      [reviewed, {}],
      [reviewed, { "2023-eic-notice-copy": "c".repeat(64) }],
      [reviewed, { "other-copy": digest }],
    ] as const
  ) {
    assertThrows(
      () =>
        form8862.build(fields, {
          pending: final,
          filer,
          retainedSourceSha256ByReference: hashes,
        }),
      Error,
      authenticationError,
    );
  }
});
