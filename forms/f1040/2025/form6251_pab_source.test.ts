import { assertThrows } from "@std/assert";
import { assertForm6251PrivateActivityBondSource } from "./form6251_pab_source.ts";

const payer = { payer_name: "Bond Payer", box8: 500, box9: 400 };

Deno.test("Form 6251 line 2g replays retained private-activity-bond source", () => {
  const fields = {
    line2g_pab_interest: 400,
    private_activity_bond_interest: 400,
  };
  const pending = { f1099int: { f1099ints: [payer] } };
  assertForm6251PrivateActivityBondSource(fields, pending);
  assertThrows(
    () => assertForm6251PrivateActivityBondSource(fields, undefined),
    Error,
    "retained 1099-INT/OID/DIV",
  );
  assertThrows(
    () => assertForm6251PrivateActivityBondSource({}, pending),
    Error,
    "retained 1099-INT/OID/DIV",
  );
  assertThrows(
    () =>
      assertForm6251PrivateActivityBondSource(fields, {
        f1099int: { f1099ints: [{ ...payer, box9: 450 }] },
      }),
    Error,
    "retained 1099-INT/OID/DIV",
  );
  assertThrows(
    () =>
      assertForm6251PrivateActivityBondSource(fields, {
        f1099int: { f1099ints: [{ ...payer, box8: 300 }] },
      }),
    Error,
    "retained 1099-INT/OID/DIV",
  );
});

Deno.test("Form 6251 line 2g reconciles all four PAB source channels", () => {
  const fields = {
    line2g_pab_interest: 625,
    private_activity_bond_interest: 700,
  };
  const pending = {
    f1099int: { f1099ints: [payer] },
    f1099oid: {
      f1099oids: [{
        payer_name: "OID Payer",
        box11_tax_exempt_oid: 250,
        box10_bond_premium: 25,
        box10_applies_to: "tax_exempt_oid",
        box11_pab_oid: 150,
      }],
    },
    f1099div: {
      f1099divs: [{
        payerName: "Bond Fund",
        isNominee: false,
        box11: false,
        box1a: 0,
        box12: 100,
        box13: 75,
      }],
    },
    f8814: {
      f8814s: [{
        child_name: "Test Child",
        child_name_control: "CHIL",
        child_ssn: "111223333",
        child_age_eligible: true,
        child_required_to_file: true,
        child_income_only_permitted_types: true,
        child_no_joint_return: true,
        child_no_estimated_payments: true,
        child_no_withholding: true,
        parent_eligible_to_elect: true,
        tax_exempt_interest: 100,
        private_activity_bond_interest: 75,
      }],
    },
  };
  assertForm6251PrivateActivityBondSource(fields, pending);
  assertThrows(
    () =>
      assertForm6251PrivateActivityBondSource(fields, {
        ...pending,
        f1099oid: {
          f1099oids: [{
            ...pending.f1099oid.f1099oids[0],
            box11_pab_oid: 230,
          }],
        },
      }),
    Error,
    "retained 1099-INT/OID/DIV",
  );
  assertThrows(
    () =>
      assertForm6251PrivateActivityBondSource(fields, {
        ...pending,
        f1099oid: {
          f1099oids: [{
            payer_name: "OID Payer",
            box11_tax_exempt_oid: 250,
          }],
        },
      }),
    Error,
    "retained 1099-INT/OID/DIV",
  );
});
