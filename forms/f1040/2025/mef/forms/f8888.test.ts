import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import {
  AccountType as HeaderAccountType,
  FilingStatus,
} from "../../../mef/header.ts";
import { AccountType } from "../../../nodes/inputs/f8888/index.ts";
import { form8888 } from "./f8888.ts";

const filer = {
  primarySSN: "999887777",
  nameLine1: "Jane Smith",
  nameControl: "SMIT",
  firstName: "Jane",
  lastName: "Smith",
  fullName: "Jane Smith",
  address: {
    line1: "1 Main St",
    city: "Anyplace",
    state: "NY",
    zip: "10001",
  },
  filingStatus: FilingStatus.Single,
};

const first = {
  routing_number: "021000021",
  account_number: "111222333",
  account_type: AccountType.Checking,
  amount: 300,
  owner_name: "Jane Smith",
};
const second = {
  routing_number: "021000021",
  account_number: "444555666",
  account_type: AccountType.Savings,
  amount: 700,
  owner_name: "Jane Smith",
};
const source = { account_1: first, account_2: second };

const XSD_PATH = new URL(
  "../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Common/IRS8888/IRS8888.xsd",
  import.meta.url,
).pathname;
let xsdAvailable = false;
try {
  Deno.statSync(XSD_PATH);
  xsdAvailable = true;
} catch {
  // The official IRS schema bundle is local-only.
}

function build(
  input: Parameters<typeof form8888.build>[0] = source,
  context: Parameters<typeof form8888.build>[1] = {
    filer,
    pending: {
      f1040: {
        line34_overpayment: 1000,
        line35a_refund: 1000,
        line37_amount_owed: 0,
      },
    },
  },
) {
  return form8888.build(input, context);
}

Deno.test("Form 8888 emits two ordered direct-deposit groups and matching line 5", () => {
  const xml = build();
  assertEquals((xml.match(/<DirectDepositInfoGroup>/g) ?? []).length, 2);
  assertStringIncludes(
    xml,
    "<DirectDepositRefundAmt>300</DirectDepositRefundAmt>",
  );
  assertStringIncludes(xml, "<RoutingTransitNum>021000021</RoutingTransitNum>");
  assertStringIncludes(xml, "<BankAccountTypeCd>1</BankAccountTypeCd>");
  assertStringIncludes(xml, "<BankAccountTypeCd>2</BankAccountTypeCd>");
  assertStringIncludes(
    xml,
    "<TotalAllocationOfRefundAmt>1000</TotalAllocationOfRefundAmt>",
  );
  assertEquals(xml.includes("RefundByCheckAmt"), false);
});

Deno.test({
  name: "XSD: Form 8888 two- and three-account refund allocations",
  ignore: !xsdAvailable,
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  for (
    const [input, refund] of [
      [source, 1000],
      [{
        ...source,
        account_3: {
          routing_number: "021000089",
          account_number: "777888999",
          account_type: AccountType.Checking,
          amount: 250,
          owner_name: "Jane Smith",
        },
      }, 1250],
    ] as const
  ) {
    const xml = build(input, {
      filer,
      pending: {
        f1040: { line34_overpayment: refund, line35a_refund: refund },
      },
    }).replace(
      "<IRS8888>",
      '<IRS8888 xmlns="http://www.irs.gov/efile" documentId="IRS8888-1">',
    );
    const path = await Deno.makeTempFile({ suffix: ".xml" });
    try {
      await Deno.writeTextFile(path, xml);
      const result = await new Deno.Command("xmllint", {
        args: ["--noout", "--schema", XSD_PATH, path],
        stdout: "piped",
        stderr: "piped",
      }).output();
      assertEquals(result.code, 0, new TextDecoder().decode(result.stderr));
    } finally {
      await Deno.remove(path);
    }
  }
});

Deno.test("Form 8888 emits three accounts but no obsolete savings-bond branch", () => {
  const xml = build(
    {
      ...source,
      account_3: {
        routing_number: "021000089",
        account_number: "777888999",
        account_type: AccountType.Checking,
        amount: 250,
        owner_name: "Jane Smith",
      },
    },
    {
      filer,
      pending: { f1040: { line34_overpayment: 1250, line35a_refund: 1250 } },
    },
  );
  assertEquals((xml.match(/<DirectDepositInfoGroup>/g) ?? []).length, 3);
  assertEquals(xml.includes("RefundByCheckAmt"), false);
});

Deno.test("Form 8888 rejects incomplete account fields or a zero allocation", () => {
  assertThrows(
    () =>
      build({ account_1: { ...first, routing_number: "" }, account_2: second }),
    Error,
  );
  assertThrows(
    () => build({ account_1: { ...first, amount: 0 }, account_2: second }),
    Error,
  );
});

Deno.test("Form 8888 rejects duplicate or unowned deposit accounts", () => {
  assertThrows(
    () =>
      build({
        account_1: first,
        account_2: { ...second, account_number: first.account_number },
      }),
    Error,
    "distinct deposit accounts",
  );
  assertThrows(
    () =>
      build({
        account_1: first,
        account_2: { ...second, owner_name: "Preparer" },
      }),
    Error,
    "account owner must match",
  );
});

Deno.test("Form 8888 rejects a refund mismatch or missing final refund", () => {
  assertThrows(
    () =>
      build(source, {
        filer,
        pending: { f1040: { line34_overpayment: 1000, line35a_refund: 999 } },
      }),
    Error,
    "line 35a refund",
  );
  assertThrows(
    () => build(source, { filer, pending: { f1040: {} } }),
    Error,
    "line 35a refund",
  );
  assertThrows(
    () =>
      build(source, {
        filer,
        pending: { f1040: { line34_overpayment: 999, line35a_refund: 1000 } },
      }),
    Error,
    "line 34 overpayment",
  );
});

Deno.test("Form 8888 rejects single-deposit overlap, injured spouse, or tax due", () => {
  assertThrows(
    () =>
      build(source, {
        filer: {
          ...filer,
          bankAccount: {
            routingNumber: "021000021",
            accountNumber: "111222333",
            accountType: HeaderAccountType.Checking,
          },
        },
        pending: { f1040: { line34_overpayment: 1000, line35a_refund: 1000 } },
      }),
    Error,
    "cannot also use Form 1040 direct deposit",
  );
  assertThrows(
    () =>
      build(source, {
        filer,
        pending: {
          f1040: { line34_overpayment: 1000, line35a_refund: 1000 },
          f8379: { spouse: "John Smith" },
        },
      }),
    Error,
    "injured-spouse",
  );
  assertThrows(
    () =>
      build(source, {
        filer,
        pending: {
          f1040: {
            line34_overpayment: 1000,
            line35a_refund: 1000,
            line37_amount_owed: 1,
          },
        },
      }),
    Error,
    "amount-owed",
  );
});
