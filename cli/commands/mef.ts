/**
 * `opentax mef …`: transmit through IRS MeF A2A and keep what comes back
 * under each return: returns/<id>/mef/submissions/<submissionId>.json for
 * every send, returns/<id>/mef/acks/<submissionId>.{json,xml} for every ack.
 * ATS is the default; production needs --production, `productionEnabled`
 * in the config, and the ETIN typed back at the prompt.
 */
import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import {
  buildMefTransmissionPackage,
  type MefSubmissionArchive,
} from "../../forms/f1040/2025/mef/submissions/submission-archive.ts";
import { MefTestCd } from "../../forms/f1040/2025/mef/submissions/submission-manifest.ts";
import { loadInputs } from "../store/store.ts";
import {
  MefAcceptanceStatus,
  type MefAcknowledgement,
} from "../mef/attachments.ts";
import { type AckResult, MefClient } from "../mef/client.ts";
import {
  loadMefConfig,
  loadSigningCredential,
  MEF_TEST_CD,
  type MefConfig,
  MefConfigError,
  MefEnvironment,
} from "../mef/config.ts";
import { submissionDataListFrom } from "../mef/protocol.ts";
import {
  prepareMefSubmissionArchive,
  writeMefSubmissionArchive,
} from "./export.ts";

export type MefCommandDeps = {
  readonly baseDir: string;
  readonly env: Readonly<Record<string, string | undefined>>;
  readonly home: string;
  /** The binary's restricted fetch; tests pass one routed to a mock IRS. */
  readonly fetch: typeof fetch;
  /** Ask a question on the terminal and return the typed answer. */
  readonly confirm: (question: string) => Promise<string>;
  readonly now?: () => Date;
  readonly sleep?: (ms: number) => Promise<void>;
  readonly progress?: (line: string) => void;
};

export type MefTarget = { readonly production?: boolean };

const transmissionRecordSchema = z.object({
  submissionId: z.string(),
  returnId: z.string(),
  environment: z.nativeEnum(MefEnvironment),
  testCd: z.nativeEnum(MefTestCd),
  messageId: z.string(),
  depositId: z.string().optional(),
  receiptId: z.string().optional(),
  receivedTs: z.string().optional(),
  sentAt: z.string(),
  submissionSha256: z.string(),
  containerSha256: z.string(),
  status: z.object({
    status: z.string(),
    statusDate: z.string().optional(),
    checkedAt: z.string(),
  }).optional(),
});

export type MefTransmissionRecord = z.infer<typeof transmissionRecordSchema>;

const ackRecordSchema = z.object({
  submissionId: z.string(),
  returnId: z.string().optional(),
  status: z.nativeEnum(MefAcceptanceStatus),
  acceptanceStatusTxt: z.string(),
  statusDate: z.string().optional(),
  taxYear: z.string().optional(),
  errors: z.array(z.object({
    ruleNumber: z.string().optional(),
    severity: z.string().optional(),
    message: z.string().optional(),
    xpath: z.string().optional(),
  })),
  retrievedAt: z.string(),
});

export type MefAckRecord = z.infer<typeof ackRecordSchema>;

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function submissionsDir(baseDir: string, returnId: string): string {
  return join(baseDir, returnId, "mef", "submissions");
}

function acksDir(baseDir: string, returnId: string | undefined): string {
  return returnId === undefined
    ? join(baseDir, "..", "mef", "unmatched-acks")
    : join(baseDir, returnId, "mef", "acks");
}

async function listDir(path: string): Promise<string[]> {
  return await readdir(path).catch(() => []);
}

async function readJson<T>(
  path: string,
  schema: z.ZodType<T>,
): Promise<T | undefined> {
  const raw = await readFile(path, "utf8").catch(() => undefined);
  return raw === undefined ? undefined : schema.parse(JSON.parse(raw));
}

async function transmissionsOf(baseDir: string, returnId: string) {
  const dir = submissionsDir(baseDir, returnId);
  const records = await Promise.all(
    (await listDir(dir)).filter((f) => f.endsWith(".json")).map((f) =>
      readJson(join(dir, f), transmissionRecordSchema)
    ),
  );
  return records.filter((r): r is MefTransmissionRecord => r !== undefined);
}

async function ackOf(baseDir: string, returnId: string, submissionId: string) {
  return await readJson(
    join(acksDir(baseDir, returnId), `${submissionId}.json`),
    ackRecordSchema,
  );
}

/** The return a Submission ID was sent from, by its transmission record. */
async function returnOfSubmission(
  baseDir: string,
  submissionId: string,
): Promise<MefTransmissionRecord | undefined> {
  for (const returnId of await listDir(baseDir)) {
    const record = await readJson(
      join(submissionsDir(baseDir, returnId), `${submissionId}.json`),
      transmissionRecordSchema,
    );
    if (record !== undefined) return record;
  }
  return undefined;
}

async function resolveEnvironment(
  target: MefTarget,
  config: MefConfig,
  deps: MefCommandDeps,
): Promise<MefEnvironment> {
  if (!target.production) return MefEnvironment.Ats;
  if (!config.productionEnabled) {
    throw new MefConfigError(
      `Production transmission is disabled; set "productionEnabled": true in ${config.source} after ATS passes`,
    );
  }
  const answer = await deps.confirm(
    `Transmit to IRS PRODUCTION (${
      config.baseUrls[MefEnvironment.Production]
    }). Type ETIN ${config.etin} to confirm: `,
  );
  if (answer.trim() !== config.etin) {
    throw new MefConfigError("Production transmission not confirmed");
  }
  return MefEnvironment.Production;
}

type Connection = {
  readonly config: MefConfig;
  readonly environment: MefEnvironment;
  readonly client: MefClient;
  readonly now: () => Date;
};

async function connect(
  target: MefTarget,
  deps: MefCommandDeps,
): Promise<Connection> {
  const config = await loadMefConfig({ env: deps.env, home: deps.home });
  const environment = await resolveEnvironment(target, config, deps);
  const now = deps.now ?? (() => new Date());
  const credential = await loadSigningCredential(config, deps.env, now());
  return {
    config,
    environment,
    now,
    client: new MefClient({
      baseUrl: config.baseUrls[environment],
      testCd: MEF_TEST_CD[environment],
      etin: config.etin,
      appSysId: config.appSysId,
      credential,
      fetch: deps.fetch,
      signTimestamp: config.signTimestamp,
      now,
    }),
  };
}

/** Login then Logout: proves the certificate, AppSysID and ETIN are enrolled. */
export async function mefLoginCheckCommand(
  target: MefTarget,
  deps: MefCommandDeps,
) {
  const { config, environment, client } = await connect(target, deps);
  await client.withSession(() => Promise.resolve());
  return {
    environment,
    endpoint: config.baseUrls[environment],
    etin: config.etin,
    appSysId: config.appSysId,
    login: "ok",
    logout: "ok",
  };
}

/** The latest transmission's outcome, or undefined when the return was never sent. */
async function lastOutcome(baseDir: string, returnId: string) {
  const outcomes = await Promise.all(
    (await transmissionsOf(baseDir, returnId)).map(async (record) => ({
      record,
      ack: await ackOf(baseDir, returnId, record.submissionId),
    })),
  );
  return outcomes.find(({ ack }) =>
    ack?.status !== MefAcceptanceStatus.Rejected
  ) ??
    outcomes[0];
}

async function refuseRetransmission(baseDir: string, returnId: string) {
  const outcome = await lastOutcome(baseDir, returnId);
  if (
    outcome !== undefined &&
    outcome.ack?.status !== MefAcceptanceStatus.Rejected
  ) {
    throw new Error(
      `Return ${returnId} was already transmitted as ${outcome.record.submissionId} (${
        outcome.ack?.status ?? "no ack yet"
      }); retrieve its ack with opentax mef acks --submissionId ${outcome.record.submissionId}`,
    );
  }
}

async function prepare(
  returnId: string,
  connection: Connection,
  deps: MefCommandDeps,
  sequence?: string,
): Promise<MefSubmissionArchive> {
  await refuseRetransmission(deps.baseDir, returnId);
  const archive = await prepareMefSubmissionArchive({
    returnId,
    baseDir: deps.baseDir,
    efin: connection.config.efin,
    softwareId: connection.config.softwareId,
    sequence,
    processingDate: connection.now(),
  });
  const expected = MEF_TEST_CD[connection.environment];
  if (archive.testCd !== expected) {
    throw new Error(
      expected === MefTestCd.Test
        ? `Return ${returnId} is not an ATS test return (general.ats_test_submission); ATS takes only test submissions`
        : `Return ${returnId} is an ATS test return and cannot go to production`,
    );
  }
  return archive;
}

type Prepared = {
  readonly returnId: string;
  readonly archive: MefSubmissionArchive;
};

/** One SendSubmissions for up to 100 prepared returns; records each under its return. */
async function transmit(
  prepared: readonly Prepared[],
  connection: Connection,
  deps: MefCommandDeps,
  client: MefClient,
): Promise<MefTransmissionRecord[]> {
  const pkg = buildMefTransmissionPackage(
    prepared.map(({ archive }) => ({ archive })),
  );
  for (const { returnId, archive } of prepared) {
    await writeMefSubmissionArchive(archive, join(deps.baseDir, returnId));
  }
  const sent = await client.sendSubmissions(
    submissionDataListFrom(pkg.sendSubmissionsRequestXml),
    pkg.containerZipBytes,
  );
  const sentAt = connection.now().toISOString();
  return await Promise.all(prepared.map(async ({ returnId, archive }) => {
    const receipt = sent.receipts.find((r) =>
      r.submissionId === archive.submissionId
    );
    const record: MefTransmissionRecord = {
      submissionId: archive.submissionId,
      returnId,
      environment: connection.environment,
      testCd: archive.testCd,
      messageId: sent.messageId,
      depositId: sent.depositId,
      receiptId: receipt?.receiptId,
      receivedTs: receipt?.receivedTs,
      sentAt,
      submissionSha256: sha256(archive.bytes),
      containerSha256: sha256(pkg.containerZipBytes),
    };
    const dir = submissionsDir(deps.baseDir, returnId);
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, `${archive.submissionId}.json`),
      JSON.stringify(record, null, 2),
      {
        flag: "wx",
      },
    );
    return record;
  }));
}

/** Build the return's submission ZIP and send it (ATS unless --production). */
export async function mefSendCommand(
  args: MefTarget & { readonly returnId: string; readonly sequence?: string },
  deps: MefCommandDeps,
) {
  const connection = await connect(args, deps);
  const archive = await prepare(args.returnId, connection, deps, args.sequence);
  const [record] = await connection.client.withSession((client) =>
    transmit([{ returnId: args.returnId, archive }], connection, deps, client)
  );
  return record;
}

async function storeAck(
  ack: MefAcknowledgement,
  deps: MefCommandDeps,
  retrievedAt: string,
): Promise<MefAckRecord> {
  const owner = await returnOfSubmission(deps.baseDir, ack.submissionId);
  const record: MefAckRecord = {
    submissionId: ack.submissionId,
    returnId: owner?.returnId,
    status: ack.status,
    acceptanceStatusTxt: ack.acceptanceStatusTxt,
    statusDate: ack.statusDate,
    taxYear: ack.taxYear,
    errors: ack.errors.map((e) => ({
      ruleNumber: e.ruleNumber,
      severity: e.severity,
      message: e.message,
      xpath: e.xpath,
    })),
    retrievedAt,
  };
  if (!/^[0-9]{13}[a-z0-9]{7}$/.test(ack.submissionId)) {
    throw new Error(
      `Acknowledgement has an invalid Submission ID ${ack.submissionId}`,
    );
  }
  const dir = acksDir(deps.baseDir, owner?.returnId);
  await mkdir(dir, { recursive: true });
  await writeFile(
    join(dir, `${ack.submissionId}.json`),
    JSON.stringify(record, null, 2),
  );
  await writeFile(join(dir, `${ack.submissionId}.xml`), ack.xml);
  return record;
}

async function storeAcks(
  result: AckResult,
  connection: Connection,
  deps: MefCommandDeps,
) {
  const retrievedAt = connection.now().toISOString();
  const stored: MefAckRecord[] = [];
  for (const ack of result.acknowledgements) {
    stored.push(await storeAck(ack, deps, retrievedAt));
  }
  return stored;
}

/** GetAck for one submission, or GetNewAcks until none remain; each ack is stored under its return. */
export async function mefAcksCommand(
  args: MefTarget & { readonly submissionId?: string; readonly new?: boolean },
  deps: MefCommandDeps,
) {
  if ((args.submissionId === undefined) === (args.new !== true)) {
    throw new Error("Pass exactly one of --submissionId <id> or --new");
  }
  const connection = await connect(args, deps);
  return await connection.client.withSession(async (client) => {
    if (args.submissionId !== undefined) {
      const result = await client.getAck(args.submissionId);
      return {
        messageId: result.messageId,
        acknowledgements: await storeAcks(result, connection, deps),
      };
    }
    const messageIds: string[] = [];
    const acknowledgements: MefAckRecord[] = [];
    // Pub 4164 §6.5: repeat while MoreAvailableInd is true; the message IDs
    // let GetAcksByMsgID recover a batch whose response was lost.
    for (let page = 0; page < 50; page++) {
      const result = await client.getNewAcks(100);
      messageIds.push(result.messageId);
      acknowledgements.push(...await storeAcks(result, connection, deps));
      if (!result.moreAvailable) break;
    }
    return { messageIds, acknowledgements };
  });
}

/** GetSubmissionStatus, recorded on the submission's transmission record. */
export async function mefStatusCommand(
  args: MefTarget & { readonly submissionId: string },
  deps: MefCommandDeps,
) {
  const connection = await connect(args, deps);
  const result = await connection.client.withSession((client) =>
    client.getSubmissionStatus(args.submissionId)
  );
  const record = result.records.find((r) =>
    r.submissionId === args.submissionId
  );
  const owner = await returnOfSubmission(deps.baseDir, args.submissionId);
  if (owner !== undefined && record !== undefined) {
    const updated: MefTransmissionRecord = {
      ...owner,
      status: {
        status: record.status,
        statusDate: record.statusDate,
        checkedAt: connection.now().toISOString(),
      },
    };
    await writeFile(
      join(
        submissionsDir(deps.baseDir, owner.returnId),
        `${args.submissionId}.json`,
      ),
      JSON.stringify(updated, null, 2),
    );
  }
  return {
    messageId: result.messageId,
    returnId: owner?.returnId,
    records: result.records,
    errors: result.errors,
  };
}

async function isAtsReturn(
  baseDir: string,
  returnId: string,
): Promise<boolean> {
  const inputs = await loadInputs(join(baseDir, returnId)).catch(() =>
    undefined
  );
  if (inputs === undefined) return false;
  const general = [
    ...(inputs.general ?? []).map((e) => e.fields),
    ...(inputs.start ?? []).map((e) =>
      (e.fields.general ?? {}) as Record<string, unknown>
    ),
  ];
  return general.some((fields) => fields.ats_test_submission === true);
}

export type AtsRunArgs = {
  readonly returnIds?: readonly string[];
  readonly pollSeconds: number;
  readonly maxPolls: number;
};

/**
 * Send every ATS test return in the store (or `returnIds`) that has no
 * accepted ack yet in one SendSubmissions, then poll GetAcks until each has
 * an acknowledgement or the polls run out.
 */
export async function mefAtsRunCommand(args: AtsRunArgs, deps: MefCommandDeps) {
  const connection = await connect({ production: false }, deps);
  const stored = args.returnIds !== undefined ? [] : (
    await Promise.all(
      (await listDir(deps.baseDir)).map(async (id) =>
        await isAtsReturn(deps.baseDir, id) ? [id] : []
      ),
    )
  ).flat().sort();
  // Without --returnId, an accepted or still-pending return is reported, not resent.
  const skipped: { returnId: string; submissionId: string; status: string }[] =
    [];
  for (const returnId of stored) {
    const outcome = await lastOutcome(deps.baseDir, returnId);
    if (
      outcome !== undefined &&
      outcome.ack?.status !== MefAcceptanceStatus.Rejected
    ) {
      skipped.push({
        returnId,
        submissionId: outcome.record.submissionId,
        status: outcome.ack?.status ?? "no ack yet",
      });
    }
  }
  const candidates = args.returnIds ??
    stored.filter((id) => !skipped.some((s) => s.returnId === id));
  if (candidates.length === 0) {
    if (skipped.length > 0) {
      return { messageId: undefined, submissions: [], skipped };
    }
    throw new Error(
      "No ATS test returns in the store; stage them with bun run ats:stage or pass --returnId",
    );
  }
  const prepared: Prepared[] = [];
  for (const returnId of candidates) {
    deps.progress?.(`preparing ${returnId}`);
    prepared.push({
      returnId,
      archive: await prepare(returnId, connection, deps),
    });
  }
  if (prepared.length > 100) {
    throw new Error(
      "ATS run holds at most 100 submissions per SendSubmissions",
    );
  }
  const sleep = deps.sleep ??
    ((ms: number) => new Promise((r) => setTimeout(r, ms)));
  return await connection.client.withSession(async (client) => {
    const records = await transmit(prepared, connection, deps, client);
    deps.progress?.(
      `sent ${records.length} submissions in message ${records[0].messageId}`,
    );
    const acks = new Map<string, MefAckRecord>();
    for (
      let poll = 0;
      poll < args.maxPolls && acks.size < records.length;
      poll++
    ) {
      await sleep(args.pollSeconds * 1000);
      const pending = records.map((r) => r.submissionId).filter((id) =>
        !acks.has(id)
      );
      const result = await client.getAcks(pending);
      for (const ack of await storeAcks(result, connection, deps)) {
        acks.set(ack.submissionId, ack);
      }
      deps.progress?.(
        `poll ${poll + 1}: ${acks.size} of ${records.length} acknowledged`,
      );
    }
    return {
      messageId: records[0].messageId,
      submissions: records.map((r) => {
        const ack = acks.get(r.submissionId);
        return {
          returnId: r.returnId,
          submissionId: r.submissionId,
          status: ack?.status ?? "no ack yet",
          rejections: ack?.errors.map((e) => e.ruleNumber ?? "") ?? [],
        };
      }),
      skipped,
    };
  });
}
