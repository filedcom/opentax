import { afterAll, beforeAll, expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import { join } from "node:path";
import * as sys from "../../scripts/support/sys.ts";
import { unzipEntries } from "../../forms/f1040/2025/mef/submissions/zip.ts";
import { stageAtsReturns } from "../../forms/f1040/e2e/ats/ty2025-stage.ts";
import { MefAcceptanceStatus } from "../mef/attachments.ts";
import { MEF_ENV, MefConfigError } from "../mef/config.ts";
import {
  generateTestCredentials,
  MockIrs,
  type TestCredentials,
} from "../mef/mock-irs.ts";
import {
  ALLOWED_HOSTS,
  NetworkPolicyError,
  restrictedFetch,
} from "../network.ts";
import {
  mefAtsRunCommand,
  type MefCommandDeps,
  mefLoginCheckCommand,
} from "./mef.ts";

const ETIN = "12345";
const APP_SYS_ID = "98765432";
let dir: string;
let credentials: TestCredentials;

beforeAll(async () => {
  dir = await sys.makeTempDir();
  credentials = await generateTestCredentials(dir);
});

afterAll(async () => {
  await sys.remove(dir, { recursive: true });
});

function env(): Record<string, string> {
  return {
    [MEF_ENV.etin]: ETIN,
    [MEF_ENV.efin]: "123456",
    [MEF_ENV.softwareId]: "25000000",
    [MEF_ENV.appSysId]: APP_SYS_ID,
    [MEF_ENV.certificate]: credentials.certificatePath,
    [MEF_ENV.privateKey]: credentials.privateKeyPath,
    [MEF_ENV.passphrase]: credentials.passphrase,
  };
}

/** The binary's policy, with the allowed ATS host routed to the local mock. */
function routedTo(irs: MockIrs): typeof fetch {
  const local = irs.url.replace(/\/a2a\/mef$/, "");
  return restrictedFetch(
    ALLOWED_HOSTS,
    Object.assign(
      (input: string | URL | Request, init?: RequestInit) =>
        globalThis.fetch(
          String(input).replace(/^https:\/\/la(\.alt)?\.www4\.irs\.gov/, local),
          init,
        ),
      globalThis.fetch,
    ),
  );
}

function deps(
  irs: MockIrs,
  baseDir: string,
  overrides: Partial<MefCommandDeps> = {},
): MefCommandDeps {
  return {
    baseDir,
    env: env(),
    home: dir,
    fetch: routedTo(irs),
    confirm: () => Promise.reject(new Error("no prompt expected")),
    sleep: () => Promise.resolve(),
    ...overrides,
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

test(
  "ats-run sends every staged ATS return in one transmission, polls, and stores each ack",
  async () => {
    const baseDir = join(dir, "ats-store", "returns");
    await fs.mkdir(baseDir, { recursive: true });
    const staged = await stageAtsReturns(baseDir, ["1040-01", "1040-08"]);
    const rejectedSsn = /"taxpayer_ssn":\s*"([\d-]+)"/.exec(
      await fs.readFile(
        join(baseDir, staged[1].returnId, "return.json"),
        "utf8",
      ),
    )![1].replace(/-/g, "");
    const irs = mock({
      ackDelayPolls: 1,
      decide: (_, xml) =>
        xml.includes(`<PrimarySSN>${rejectedSsn}</PrimarySSN>`)
          ? [{
            ruleNumber: "IND-181-01",
            message:
              "The Primary Taxpayer's prior-year AGI or Self-Select PIN must match the e-File database.",
            xpath:
              "/efile:Return/efile:ReturnHeader/efile:Filer/efile:PrimarySSN",
            category: "Data Mismatch",
            severity: "Reject and Stop",
          }]
          : [],
    });
    const sleeps: number[] = [];
    try {
      const result = await mefAtsRunCommand(
        { pollSeconds: 30, maxPolls: 5 },
        deps(irs, baseDir, {
          sleep: (ms) => (sleeps.push(ms), Promise.resolve()),
        }),
      );
      expect(irs.problems).toEqual([]);
      expect(irs.responseProblems).toEqual([]);
      expect(sleeps).toEqual([30_000, 30_000]);
      const byReturn = new Map(result.submissions.map((s) => [s.returnId, s]));
      expect(byReturn.get(staged[0].returnId)?.status).toBe(
        MefAcceptanceStatus.Accepted,
      );
      expect(byReturn.get(staged[1].returnId)).toMatchObject({
        status: MefAcceptanceStatus.Rejected,
        rejections: ["IND-181-01"],
      });
      // One SendSubmissions carried both, each exactly as the exporter wrote it.
      expect(irs.containers).toHaveLength(1);
      const entries = unzipEntries(irs.containers[0]);
      for (const { returnId, submissionId } of result.submissions) {
        const written = await fs.readFile(
          join(baseDir, returnId, "submissions", `${submissionId}.zip`),
        );
        expect(Buffer.from(entries[`${submissionId}.zip`]).equals(written))
          .toBe(true);
        const ack = JSON.parse(
          await fs.readFile(
            join(baseDir, returnId, "mef", "acks", `${submissionId}.json`),
            "utf8",
          ),
        );
        expect(ack.returnId).toBe(returnId);
        expect(
          await fs.readFile(
            join(baseDir, returnId, "mef", "acks", `${submissionId}.xml`),
            "utf8",
          ),
        )
          .toContain(`<SubmissionId>${submissionId}</SubmissionId>`);
        const record = JSON.parse(
          await fs.readFile(
            join(
              baseDir,
              returnId,
              "mef",
              "submissions",
              `${submissionId}.json`,
            ),
            "utf8",
          ),
        );
        expect(record).toMatchObject({
          environment: "ats",
          testCd: "T",
          messageId: result.messageId,
        });
      }
      // A second run resends only the rejected return.
      const again = await mefAtsRunCommand(
        { pollSeconds: 0, maxPolls: 5 },
        deps(irs, baseDir),
      );
      expect(again.skipped.map((s) => s.returnId)).toEqual([
        staged[0].returnId,
      ]);
      expect(again.submissions.map((s) => s.returnId)).toEqual([
        staged[1].returnId,
      ]);
    } finally {
      irs.stop();
    }
  },
  600_000,
);

test("production needs productionEnabled in the config and the ETIN typed back", async () => {
  const irs = mock();
  const home = join(dir, "home-production");
  await fs.mkdir(join(home, ".opentax"), { recursive: true });
  const config = join(home, ".opentax", "mef.json");
  const run = (answer: string) =>
    mefLoginCheckCommand(
      { production: true },
      deps(irs, dir, { home, confirm: () => Promise.resolve(answer) }),
    ).catch((e) => e);
  try {
    await fs.writeFile(config, JSON.stringify({}), { mode: 0o600 });
    expect((await run(ETIN)).message).toContain('"productionEnabled": true');
    await fs.writeFile(config, JSON.stringify({ productionEnabled: true }), {
      mode: 0o600,
    });
    expect((await run("00000")).message).toBe(
      "Production transmission not confirmed",
    );
    // Confirmed, it reaches la.www4.irs.gov (routed to the ATS mock, which refuses TestCd P).
    expect(irs.requests).toEqual([]);
    expect((await run(ETIN)).message).toContain("only TestCd T");
    expect(irs.requests[0].xml).toContain("<TestCd>P</TestCd>");
    await fs.chmod(config, 0o644);
    expect(await run(ETIN)).toBeInstanceOf(MefConfigError);
    expect((await run(ETIN)).message).toContain("chmod 600");
  } finally {
    irs.stop();
  }
});

test("the network policy admits only the IRS A2A hosts over HTTPS", async () => {
  const irs = mock();
  try {
    await fs.mkdir(join(dir, "home-endpoint", ".opentax"), { recursive: true });
    await fs.writeFile(
      join(dir, "home-endpoint", ".opentax", "mef.json"),
      JSON.stringify({ endpoints: { ats: irs.url } }),
      { mode: 0o600 },
    );
    const error = await mefLoginCheckCommand(
      {},
      deps(irs, dir, { home: join(dir, "home-endpoint") }),
    )
      .catch((e) => e);
    expect(error).toBeInstanceOf(NetworkPolicyError);
    expect(irs.requests).toEqual([]);
    expect(await mefLoginCheckCommand({}, deps(irs, dir))).toMatchObject({
      environment: "ats",
      login: "ok",
    });
  } finally {
    irs.stop();
  }
});

test("a missing credential names its environment variable and config key", async () => {
  const irs = mock();
  try {
    const { [MEF_ENV.appSysId]: _, ...rest } = env();
    const error = await mefLoginCheckCommand({}, deps(irs, dir, { env: rest }))
      .catch((e) => e);
    expect(error).toBeInstanceOf(MefConfigError);
    expect(error.message).toContain(
      `appSysId (${MEF_ENV.appSysId} or "appSysId" in`,
    );
    const wrongPassphrase = await mefLoginCheckCommand(
      {},
      deps(irs, dir, { env: { ...env(), [MEF_ENV.passphrase]: "nope" } }),
    )
      .catch((e) => e);
    expect(wrongPassphrase.message).toContain(MEF_ENV.passphrase);
    expect(wrongPassphrase.message).not.toContain("nope");
  } finally {
    irs.stop();
  }
});
