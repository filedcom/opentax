import { afterAll, beforeAll, expect, test } from "bun:test";
import { createPrivateKey, X509Certificate } from "node:crypto";
import { readFileSync } from "node:fs";
import * as fs from "node:fs/promises";
import { join } from "node:path";
import * as sys from "../../scripts/support/sys.ts";
import {
  buildMefHeaderXml,
  MefAction,
  MefSessionKeyCd,
} from "../../forms/f1040/2025/mef/submissions/a2a-header.ts";
import { MefTestCd } from "../../forms/f1040/2025/mef/submissions/submission-manifest.ts";
import { generateTestCredentials, type TestCredentials } from "./mock-irs.ts";
import { bodies } from "./protocol.ts";
import {
  SignatureError,
  signedEnvelope,
  verifyEnvelopeSignature,
} from "./wssecurity.ts";
import { elementsById, exclusiveCanonical, parseXml } from "./xml.ts";

let dir: string;
let credentials: TestCredentials;

beforeAll(async () => {
  dir = await sys.makeTempDir();
  credentials = await generateTestCredentials(dir);
});

afterAll(async () => {
  await sys.remove(dir, { recursive: true });
});

const python = await new sys.Command("python3", {
  args: ["-I", "-c", "import lxml"],
  stdout: "null",
  stderr: "null",
}).output().then((o) => o.code === 0, () => false);

/** lxml's (libxml2) exclusive C14N of the element with this Id, as an independent oracle. */
async function libxmlCanonical(xml: string, id: string): Promise<string> {
  const path = join(dir, "c14n.xml");
  await fs.writeFile(path, xml);
  const script = [
    "import sys",
    "from lxml import etree",
    "doc = etree.parse(sys.argv[1])",
    "el = doc.xpath('//*[@*[local-name()=\"Id\"]=$i]', i=sys.argv[2])[0]",
    "sys.stdout.buffer.write(etree.tostring(el, method='c14n', exclusive=True, with_comments=False))",
  ].join("\n");
  const output = await new sys.Command("python3", {
    args: ["-I", "-c", script, path, id],
    stdout: "piped",
    stderr: "piped",
  }).output();
  return new TextDecoder().decode(output.stdout);
}

const C14N_CASES = `<?xml version="1.0" encoding="UTF-8"?>
<e:Envelope xmlns:e="urn:env" xmlns:unused="urn:unused" xmlns="urn:default">
  <e:Body xmlns:wsu="urn:wsu" wsu:Id="b" z="2" a='1 &amp; &lt;&#9;"'>
    <Child xmlns:p="urn:p" p:attr="x" plain="y">text &amp; &gt; &#13;
      <Inner xmlns="">unqualified</Inner><p:Empty/>
    </Child>
  </e:Body>
</e:Envelope>`;

test("exclusive C14N renders only visibly used namespaces, sorted, with C14N escaping", async () => {
  const body = elementsById(parseXml(C14N_CASES).root, "b")[0];
  const expected =
    '<e:Body xmlns:e="urn:env" xmlns:wsu="urn:wsu" a="1 &amp; &lt;&#x9;&quot;" z="2" wsu:Id="b">\n    <Child xmlns="urn:default" xmlns:p="urn:p" plain="y" p:attr="x">text &amp; &gt; &#xD;\n      <Inner xmlns="">unqualified</Inner><p:Empty></p:Empty>\n    </Child>\n  </e:Body>';
  expect(exclusiveCanonical(body)).toBe(expected);
  if (python) expect(await libxmlCanonical(C14N_CASES, "b")).toBe(expected);
});

function credential() {
  return {
    certificate: new X509Certificate(readFileSync(credentials.certificatePath)),
    privateKey: createPrivateKey({
      key: readFileSync(credentials.privateKeyPath, "utf8"),
      passphrase: credentials.passphrase,
    }),
  };
}

function signedLogin(): string {
  const now = new Date();
  return signedEnvelope({
    mefHeader: buildMefHeaderXml({
      etin: "12345",
      appSysId: "98765432",
      messageTs: now,
      messageSequence: "abcd0001",
      testCd: MefTestCd.Test,
      action: MefAction.Login,
      sessionKeyCd: MefSessionKeyCd.Open,
      wsuId: "id-hdr",
    }),
    headerId: "id-hdr",
    body: bodies.login(),
    now,
    credential: credential(),
    timestamp: true,
  });
}

test("a signed Login references the MeFHeader, Body and Timestamp and verifies", async () => {
  const xml = signedLogin();
  expect(
    xml.startsWith(
      '<?xml version="1.0" encoding="UTF-8"?>\n<SOAP-ENV:Envelope',
    ),
  ).toBe(true);
  const verified = verifyEnvelopeSignature(xml);
  const names = [...verified.signed.values()].map((e) => e.name);
  expect(names).toEqual(["MeFHeader", "SOAP-ENV:Body", "wsu:Timestamp"]);
  expect(verified.certificate.raw.equals(credential().certificate.raw)).toBe(
    true,
  );
  if (python) {
    // Every digest also holds under libxml2's canonicalization.
    for (const [id, element] of verified.signed) {
      expect(await libxmlCanonical(xml, id)).toBe(exclusiveCanonical(element));
    }
  }
});

test("verification rejects a changed header, body or signature value", () => {
  const xml = signedLogin();
  const cases = [
    xml.replace(
      "<AppSysID>98765432</AppSysID>",
      "<AppSysID>98765433</AppSysID>",
    ),
    xml.replace("</LoginRequest>", "<x/></LoginRequest>"),
    xml.replace(
      /<ds:SignatureValue>(.)/,
      (_, c) => `<ds:SignatureValue>${c === "A" ? "B" : "A"}`,
    ),
    xml.replace(/#rsa-sha256/, "#rsa-sha1"),
  ];
  for (const changed of cases) {
    expect(() => verifyEnvelopeSignature(changed)).toThrow(SignatureError);
  }
});
