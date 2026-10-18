import { afterAll, beforeAll, expect, test } from "bun:test";
import { createPrivateKey, X509Certificate } from "node:crypto";
import { readFileSync } from "node:fs";
import * as fs from "node:fs/promises";
import * as sys from "../../scripts/support/sys.ts";
import { MefAction } from "../../forms/f1040/2025/mef/submissions/a2a-header.ts";
import { MefTestCd } from "../../forms/f1040/2025/mef/submissions/submission-manifest.ts";
import { zipEntries } from "../../forms/f1040/2025/mef/submissions/zip.ts";
import { MefAcceptanceStatus } from "./attachments.ts";
import { MefClient, type MefClientOptions } from "./client.ts";
import { redact } from "./config.ts";
import {
  generateTestCredentials,
  MockIrs,
  type TestCredentials,
  WSDL_DIR,
} from "./mock-irs.ts";
import {
  MefErrorClassification,
  MefFaultError,
  MefTransportError,
} from "./protocol.ts";

const ETIN = "12345";
const APP_SYS_ID = "98765432";
const EFIN = "123456";
const encoder = new TextEncoder();
const schemas = await fs.stat(WSDL_DIR).then(() => true, () => false);

let dir: string;
let credentials: TestCredentials;

beforeAll(async () => {
  dir = await sys.makeTempDir();
  credentials = await generateTestCredentials(dir);
});

afterAll(async () => {
  await sys.remove(dir, { recursive: true });
});

function signing(
  certPath = credentials.certificatePath,
  keyPath = credentials.privateKeyPath,
) {
  return {
    certificate: new X509Certificate(readFileSync(certPath)),
    privateKey: createPrivateKey({
      key: readFileSync(keyPath, "utf8"),
      passphrase: keyPath === credentials.privateKeyPath
        ? credentials.passphrase
        : undefined,
    }),
  };
}

function mock(options: Partial<ConstructorParameters<typeof MockIrs>[0]> = {}) {
  return new MockIrs({
    etin: ETIN,
    appSysId: APP_SYS_ID,
    certificate: credentials.certificate,
    ...options,
  }).start();
}

function client(irs: MockIrs, options: Partial<MefClientOptions> = {}) {
  return new MefClient({
    baseUrl: irs.url,
    testCd: MefTestCd.Test,
    etin: ETIN,
    appSysId: APP_SYS_ID,
    credential: signing(),
    fetch: globalThis.fetch,
    signTimestamp: true,
    ...options,
  });
}

function submissionId(sequence: string): string {
  const now = new Date();
  const day = Math.floor(
    (now.getTime() - Date.UTC(now.getUTCFullYear(), 0, 1)) / 86_400_000,
  ) + 1;
  return `${EFIN}${now.getUTCFullYear()}${
    String(day).padStart(3, "0")
  }${sequence}`;
}

/** A container shaped like the exporter's: one compressed <id>.zip per submission, stored. */
function container(ids: readonly string[]) {
  const files = Object.fromEntries(ids.map((id) => [
    `${id}.zip`,
    zipEntries({
      "manifest/manifest.xml": encoder.encode(
        `<?xml version="1.0" encoding="UTF-8"?>\n<IRSSubmissionManifest xmlns="http://www.irs.gov/efile"><SubmissionId>${id}</SubmissionId><EFIN>${EFIN}</EFIN></IRSSubmissionManifest>`,
      ),
      "xml/submission.xml": encoder.encode(
        `<?xml version="1.0" encoding="UTF-8"?>\n<Return>${id}</Return>`,
      ),
    }, true),
  ]));
  return {
    list: `<SubmissionDataList>${
      ids.map((id) =>
        `<SubmissionData><SubmissionId>${id}</SubmissionId></SubmissionData>`
      ).join("")
    }</SubmissionDataList>`,
    zip: zipEntries(files, false),
  };
}

test("Login is signed, later calls carry the SAML session and cookie, Logout closes it", async () => {
  const irs = mock();
  try {
    await client(irs).withSession(async (c) => {
      expect((await c.etinStatus(ETIN)).status).toBe("Test");
    });
    expect(irs.problems).toEqual([]);
    expect(irs.requests.map((r) => r.action)).toEqual([
      MefAction.Login,
      MefAction.EtinStatus,
      MefAction.Logout,
    ]);
    const [login, call, logout] = irs.requests;
    expect(login.xml).toContain("<ds:SignatureValue>");
    expect(login.xml).toContain("<wsse:BinarySecurityToken");
    expect(login.contentType).toStartWith("text/xml");
    for (const later of [call, logout]) {
      expect(later.xml).not.toContain("BinarySecurityToken");
      expect(later.xml).toContain("saml:Assertion");
      expect(later.cookie).toMatch(/^JSESSIONID=[0-9a-f]+$/);
    }
    expect(logout.xml).toContain("<SessionKeyCd>N</SessionKeyCd>");
  } finally {
    irs.stop();
  }
});

test(`SendSubmissions delivers the container byte for byte; acks come back accepted and rejected${schemas ? "" : " (no irs/wsdl: XSD checks skipped)"}`, async () => {
  const [accepted, rejected] = [
    submissionId("acc0001"),
    submissionId("rej0001"),
  ];
  const irs = mock({
    decide: (id) =>
      id === rejected
        ? [{
          ruleNumber: "IND-031-04",
          message:
            "If Form 1040, 'PrimaryPriorYearAGIAmt' in the Return Header must match the e-File database.",
          xpath: "/efile:Return/efile:ReturnHeader/efile:FilerSignatureGrp",
          category: "Data Mismatch",
          severity: "Reject and Stop",
          fieldValue: "0",
        }]
        : [],
  });
  try {
    const { list, zip } = container([accepted, rejected]);
    const result = await client(irs).withSession(async (c) => {
      const sent = await c.sendSubmissions(list, zip);
      const acks = await c.getAcks([accepted, rejected]);
      const status = await c.getSubmissionStatus(rejected);
      const fresh = await c.getNewAcks(10);
      return { sent, acks, status, fresh };
    });
    expect(irs.problems).toEqual([]);
    expect(irs.responseProblems).toEqual([]);
    expect(irs.containers).toHaveLength(1);
    expect(Buffer.from(irs.containers[0]).equals(Buffer.from(zip))).toBe(true);
    expect(result.sent.depositId).toMatch(/^[0-9A-F]{40}$/);
    expect(result.sent.receipts.map((r) => r.submissionId)).toEqual([
      accepted,
      rejected,
    ]);
    const byId = new Map(
      result.acks.acknowledgements.map((a) => [a.submissionId, a]),
    );
    expect(byId.get(accepted)?.status).toBe(MefAcceptanceStatus.Accepted);
    expect(byId.get(accepted)?.errors).toEqual([]);
    expect(byId.get(rejected)?.status).toBe(MefAcceptanceStatus.Rejected);
    expect(byId.get(rejected)?.errors[0]).toMatchObject({
      ruleNumber: "IND-031-04",
      severity: "Reject and Stop",
      errorId: "1",
    });
    expect(byId.get(rejected)?.xml).toStartWith(
      '<Acknowledgement xmlns="http://www.irs.gov/efile"',
    );
    expect(result.status.records).toEqual([{
      submissionId: rejected,
      status: "ACK_R_RETRIEVED",
      statusDate: expect.any(String),
      disclaimer: undefined,
    }]);
    // GetAcks already retrieved both, so GetNewAcks has nothing new.
    expect(result.fresh).toMatchObject({
      acknowledgements: [],
      moreAvailable: false,
    });
    const send = irs.requests.find((r) =>
      r.action === MefAction.SendSubmissions
    )!;
    expect(send.contentType).toMatch(
      /^multipart\/related; .*type="application\/xop\+xml"/,
    );
    expect(send.xml).toContain(
      '<xop:Include xmlns:xop="http://www.w3.org/2004/08/xop/include" href="cid:',
    );
  } finally {
    irs.stop();
  }
});

test("GetAcks reports submissions without an ack yet in SubmissionErrorList", async () => {
  const id = submissionId("pen0001");
  const irs = mock({ ackDelayPolls: 1 });
  try {
    const { list, zip } = container([id]);
    const [first, second] = await client(irs).withSession(async (c) => {
      await c.sendSubmissions(list, zip);
      return [await c.getAcks([id]), await c.getAcks([id])];
    });
    expect(first.acknowledgements).toEqual([]);
    expect(first.errors).toEqual([{
      submissionId: id,
      message: expect.stringContaining("MEF00006"),
      classification: "REQUEST_ERROR",
      code: "MEF00006",
    }]);
    expect(second.acknowledgements.map((a) => a.status)).toEqual([
      MefAcceptanceStatus.Accepted,
    ]);
  } finally {
    irs.stop();
  }
});

test("an expired session logs in again once, then gives up with SECURITY_ERROR", async () => {
  const irs = mock();
  try {
    await client(irs).withSession(async (c) => {
      irs.expireSessions();
      await c.etinStatus(ETIN);
    });
    expect(irs.logins()).toBe(2);
    irs.rejectAllSessions = true;
    const error = await client(irs).withSession((c) => c.etinStatus(ETIN))
      .catch((e) => e);
    expect(error).toBeInstanceOf(MefFaultError);
    expect((error as MefFaultError).classification).toBe(
      MefErrorClassification.SecurityError,
    );
    expect((error as MefFaultError).message).toContain(
      "SAML assertion is expired",
    );
  } finally {
    irs.stop();
  }
});

test("a certificate the IRS has not enrolled, or a tampered signed Login, is refused", async () => {
  const irs = mock();
  try {
    const stranger = await client(irs, {
      credential: signing(
        credentials.strangerCertificatePath,
        credentials.strangerKeyPath,
      ),
    }).login().catch((e) => e);
    expect(stranger).toBeInstanceOf(MefFaultError);
    expect(stranger.classification).toBe(MefErrorClassification.SecurityError);
    expect(stranger.message).toContain("not enrolled");
    const tampering: typeof fetch = Object.assign(
      (input: string | URL | Request, init?: RequestInit) =>
        globalThis.fetch(input, {
          ...init,
          body: new TextDecoder().decode(init!.body as Uint8Array).replace(
            /<MessageTs>([^<]+)<\/MessageTs>/,
            (_, ts) =>
              `<MessageTs>${
                new Date(Date.parse(ts) - 1000).toISOString()
              }</MessageTs>`,
          ),
        }),
      globalThis.fetch,
    );
    const tampered = await client(irs, { fetch: tampering }).login().catch((
      e,
    ) => e);
    expect(tampered).toBeInstanceOf(MefFaultError);
    expect(tampered.message).toContain("Digest of #id-");
    expect(irs.logins()).toBe(0);
  } finally {
    irs.stop();
  }
});

test("SOAP faults map to MefFaultError with the IRS classification and code", async () => {
  const irs = mock();
  try {
    irs.failNext({
      action: MefAction.GetAck,
      classification: MefErrorClassification.RequestError,
      message:
        "Failed to get acknowledgement. Reason: Could not find acknowledgement",
      code: "MEF00006",
    });
    const error = await client(irs).withSession((c) =>
      c.getAck(submissionId("abc0001"))
    ).catch((e) => e);
    expect(error).toBeInstanceOf(MefFaultError);
    expect(error).toMatchObject({
      action: MefAction.GetAck,
      classification: MefErrorClassification.RequestError,
      errorMessageCd: "MEF00006",
      faultCode: "soapenv:Server",
    });
    // The session still logged out after the fault.
    expect(irs.requests.at(-1)?.action).toBe(MefAction.Logout);
  } finally {
    irs.stop();
  }
});

test("an ETIN not associated with the Application System ID fails at Login", async () => {
  const irs = mock();
  try {
    const error = await client(irs, { etin: "54321" }).login().catch((e) => e);
    expect(error).toBeInstanceOf(MefFaultError);
    expect(error.classification).toBe(MefErrorClassification.RequestError);
    expect(error.message).toContain("ETIN 54321 is not associated");
  } finally {
    irs.stop();
  }
});

test.skipIf(!schemas)(
  "the mock holds requests to the WSDL 10.9 schemas",
  async () => {
    const irs = mock();
    try {
      const invalid = await globalThis.fetch(`${irs.url}/EtinStatus`, {
        method: "POST",
        headers: {
          "Content-Type": "text/xml",
          SOAPAction: '"http://www.irs.gov/a2a/mef/EtinStatus"',
        },
        body:
          `<?xml version="1.0" encoding="UTF-8"?>\n<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/"><SOAP-ENV:Header><MeFHeader xmlns="http://www.irs.gov/a2a/mef/MeFHeader.xsd"><MessageID>123452026290abcd0001</MessageID><Action>EtinStatus</Action><MessageTs>2026-10-17T15:00:00Z</MessageTs><ETIN>12345</ETIN><AppSysID>${APP_SYS_ID}</AppSysID><WSDLVersionNum>10.8</WSDLVersionNum></MeFHeader></SOAP-ENV:Header><SOAP-ENV:Body><ETINStatusRequest xmlns="http://www.irs.gov/a2a/mef/MeFMSIServices.xsd"/></SOAP-ENV:Body></SOAP-ENV:Envelope>`,
      });
      expect(invalid.status).toBe(500);
      const text = await invalid.text();
      expect(text).toContain("MESSAGE_FORMAT_ERROR");
      expect(text).toContain("WSDLVersionNum");
    } finally {
      irs.stop();
    }
  },
);

test("a non-SOAP HTTP error is a MefTransportError with its status", async () => {
  const irs = mock();
  try {
    const error = await client(irs, { baseUrl: `${irs.url}/missing` }).login()
      .catch((e) => e);
    expect(error).toBeInstanceOf(MefTransportError);
    expect(error.status).toBe(404);
  } finally {
    irs.stop();
  }
});

test("redact removes every session secret from a message", () => {
  expect(redact("cookie JSESSIONID=abcd1234 and abcd1234", ["abcd1234", "x"]))
    .toBe(
      "cookie JSESSIONID=[redacted] and [redacted]",
    );
});
