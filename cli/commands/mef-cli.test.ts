/**
 * The shipped CLI, unmodified, against the mock IRS: the process keeps its
 * network policy and dials https://la.alt.www4.irs.gov, which a local
 * CONNECT proxy (HTTPS_PROXY) hands to the mock's TLS listener; the mock's
 * throwaway certificate is trusted through NODE_EXTRA_CA_CERTS.
 */
import { afterAll, beforeAll, expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as net from "node:net";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import * as sys from "../../scripts/support/sys.ts";
import { signed } from "../../scripts/testing/mef.ts";
import { unzipEntries } from "../../forms/f1040/2025/mef/submissions/zip.ts";
import { ATS_SCENARIO_INPUTS } from "../../forms/f1040/e2e/ats/ty2025-check-replay.ts";
import { atsResidencyReview } from "../../forms/f1040/e2e/ats/ty2025-submission.ts";
import { MefAction } from "../../forms/f1040/2025/mef/submissions/a2a-header.ts";
import {
  generateTestCredentials,
  MockIrs,
  type TestCredentials,
} from "../mef/mock-irs.ts";
import { MefErrorClassification } from "../mef/protocol.ts";

const ETIN = "12345";
const APP_SYS_ID = "98765432";
const main = fileURLToPath(new URL("../main.ts", import.meta.url));
let dir: string;
let credentials: TestCredentials;
let irs: MockIrs;
let proxy: net.Server;
let proxied: string[];

beforeAll(async () => {
  dir = await sys.makeTempDir();
  credentials = await generateTestCredentials(dir);
  irs = new MockIrs({
    etin: ETIN,
    appSysId: APP_SYS_ID,
    certificate: credentials.certificate,
    tls: {
      cert: await fs.readFile(credentials.tlsCertPath, "utf8"),
      key: await fs.readFile(credentials.tlsKeyPath, "utf8"),
    },
  }).start();
  proxied = [];
  proxy = net.createServer((client) => {
    client.once("data", (chunk) => {
      const target = /^CONNECT ([^ ]+) HTTP/.exec(chunk.toString("latin1"))
        ?.[1];
      proxied.push(target ?? "?");
      // Only the IRS ATS host reaches the mock; anything else is refused.
      if (target !== "la.alt.www4.irs.gov:443") {
        client.end("HTTP/1.1 403 Forbidden\r\n\r\n");
        return;
      }
      const upstream = net.connect(irs.port, "127.0.0.1", () => {
        client.write("HTTP/1.1 200 Connection Established\r\n\r\n");
        upstream.pipe(client);
        client.pipe(upstream);
      });
      upstream.on("error", () => client.destroy());
      client.on("error", () => upstream.destroy());
    });
  });
  await new Promise<void>((resolve) => proxy.listen(0, "127.0.0.1", resolve));
  const home = join(dir, "home");
  await fs.mkdir(join(home, ".opentax"), { recursive: true });
  // A fresh update check keeps `opentax` from calling GitHub.
  await fs.writeFile(
    join(home, ".opentax", "update-check.json"),
    JSON.stringify({ checkedAt: Date.now(), latestVersion: "0.0.0" }),
  );
  await fs.writeFile(
    join(home, ".opentax", "mef.json"),
    JSON.stringify({
      etin: ETIN,
      efin: "123456",
      softwareId: "25000000",
      appSysId: APP_SYS_ID,
      certificate: credentials.certificatePath,
      privateKey: credentials.privateKeyPath,
    }),
    { mode: 0o600 },
  );
  await fs.mkdir(join(dir, "work"));
});

afterAll(async () => {
  irs.stop();
  proxy.close();
  await sys.remove(dir, { recursive: true });
});

async function opentax(...args: string[]) {
  const port = (proxy.address() as net.AddressInfo).port;
  const output = await new sys.Command(process.execPath, {
    args: [main, ...args],
    cwd: join(dir, "work"),
    env: {
      PATH: process.env.PATH ?? "",
      HOME: join(dir, "home"),
      HTTPS_PROXY: `http://127.0.0.1:${port}`,
      https_proxy: `http://127.0.0.1:${port}`,
      NODE_EXTRA_CA_CERTS: credentials.tlsCertPath,
      OPENTAX_MEF_KEY_PASSPHRASE: credentials.passphrase,
    },
    clearEnv: true,
    stdout: "piped",
    stderr: "piped",
  }).output();
  const stdout = new TextDecoder().decode(output.stdout);
  const stderr = new TextDecoder().decode(output.stderr);
  return { code: output.code, stdout, stderr, json: () => JSON.parse(stdout) };
}

test(
  "create a return through the CLI, mef send it to ATS, read its status and store its ack",
  async () => {
    const created = await opentax("return", "create", "--year", "2025");
    expect(created.code).toBe(0);
    const { returnId } = created.json();
    const inputs = await ATS_SCENARIO_INPUTS["1040-01"]() as Record<
      string,
      unknown
    >;
    for (const [nodeType, value] of Object.entries(signed(inputs))) {
      for (const fields of Array.isArray(value) ? value : [value]) {
        const added = await opentax(
          "form",
          "add",
          "--returnId",
          returnId,
          "--node_type",
          nodeType,
          JSON.stringify(fields),
        );
        expect(added.stderr).toBe("");
        expect(added.code).toBe(0);
      }
    }
    const returnPath = join(dir, "work", ".state", "returns", returnId);
    await fs.writeFile(
      join(returnPath, "residency-review.json"),
      JSON.stringify(atsResidencyReview(inputs)),
    );

    const check = await opentax("mef", "login-check");
    expect(check.stderr).toBe("");
    expect(check.json()).toMatchObject({
      environment: "ats",
      endpoint: "https://la.alt.www4.irs.gov/a2a/mef",
      login: "ok",
    });

    // The exporter's own ZIP for the same Submission ID, made independently.
    const exported = await opentax(
      "return",
      "export",
      "--returnId",
      returnId,
      "--type",
      "mef-submission",
      "--efin",
      "123456",
      "--software-id",
      "25000000",
      "--sequence",
      "e2e0001",
      "--output",
      join(dir, "exported"),
    );
    expect(exported.code).toBe(0);
    const { submissionId, path } = exported.json();

    const sent = await opentax(
      "mef",
      "send",
      "--returnId",
      returnId,
      "--sequence",
      "e2e0001",
    );
    expect(sent.stderr).toBe("");
    expect(sent.code).toBe(0);
    expect(sent.json()).toMatchObject({
      submissionId,
      returnId,
      environment: "ats",
      testCd: "T",
    });
    expect(sent.json().depositId).toMatch(/^[0-9A-F]+$/);
    expect(irs.problems).toEqual([]);
    expect(irs.containers).toHaveLength(1);
    const delivered = unzipEntries(irs.containers[0]);
    expect(Object.keys(delivered)).toEqual([`${submissionId}.zip`]);
    // Byte for byte the ZIP the exporter wrote for this send...
    const sentZip = delivered[`${submissionId}.zip`];
    expect(
      Buffer.from(sentZip).equals(
        await fs.readFile(
          join(returnPath, "submissions", `${submissionId}.zip`),
        ),
      ),
    )
      .toBe(true);
    // ...and, but for ReturnTs (stamped at preparation), the independent export.
    const decode = (zip: Uint8Array) =>
      Object.entries(unzipEntries(zip)).map(([name, bytes]) => [
        name,
        name.endsWith(".xml")
          ? new TextDecoder().decode(bytes).replace(
            /<ReturnTs>[^<]+<\/ReturnTs>/,
            "<ReturnTs/>",
          )
          : Buffer.from(bytes).toString("base64"),
      ]);
    expect(decode(sentZip)).toEqual(
      decode(new Uint8Array(await fs.readFile(path))),
    );

    const status = await opentax(
      "mef",
      "status",
      "--submissionId",
      submissionId,
    );
    expect(status.code).toBe(0);
    expect(status.json().records[0]).toMatchObject({
      submissionId,
      status: "ACK_A_CREATED",
    });

    const acks = await opentax("mef", "acks", "--submissionId", submissionId);
    expect(acks.stderr).toBe("");
    expect(acks.json().acknowledgements).toEqual([
      expect.objectContaining({ submissionId, returnId, status: "Accepted" }),
    ]);
    const stored = JSON.parse(
      await fs.readFile(
        join(returnPath, "mef", "acks", `${submissionId}.json`),
        "utf8",
      ),
    );
    expect(stored).toMatchObject({
      submissionId,
      returnId,
      status: "Accepted",
      taxYear: "2025",
    });
    expect(
      await fs.readFile(
        join(returnPath, "mef", "acks", `${submissionId}.xml`),
        "utf8",
      ),
    )
      .toContain("<AcceptanceStatusTxt>Accepted</AcceptanceStatusTxt>");

    const resend = await opentax("mef", "send", "--returnId", returnId);
    expect(resend.code).toBe(1);
    expect(resend.stderr).toContain(
      `already transmitted as ${submissionId} (Accepted)`,
    );

    // Every connection went to the IRS ATS host, through the binary's own fetch.
    expect(new Set(proxied)).toEqual(new Set(["la.alt.www4.irs.gov:443"]));
    expect(irs.requests.filter((r) => r.action === MefAction.Login))
      .toHaveLength(4);
  },
  600_000,
);

test(
  "CLI errors carry the IRS fault and never the session secrets",
  async () => {
    irs.failNext({
      action: MefAction.GetAck,
      classification: MefErrorClassification.RequestError,
      message: "MEF00006 ObjectNotFound",
      code: "MEF00006",
    });
    const failed = await opentax(
      "mef",
      "acks",
      "--submissionId",
      "1234562026001abcdefg",
    );
    expect(failed.code).toBe(1);
    expect(failed.stderr).toContain("MeF GetAck fault REQUEST_ERROR MEF00006");
    const login = irs.requests.filter((r) => r.action === MefAction.GetAck).at(
      -1,
    )!;
    const jsession = /JSESSIONID=([0-9a-f]+)/.exec(login.cookie ?? "")![1];
    expect(failed.stderr + failed.stdout).not.toContain(jsession);
    const production = await opentax(
      "mef",
      "send",
      "--returnId",
      "x",
      "--production",
    );
    expect(production.code).toBe(1);
    expect(production.stderr).toContain('"productionEnabled": true');
    const help = await opentax("mef", "--help");
    for (
      const command of ["login-check", "send", "status", "acks", "ats-run"]
    ) {
      expect(help.stdout + help.stderr).toContain(`opentax mef ${command}`);
    }
  },
  120_000,
);
