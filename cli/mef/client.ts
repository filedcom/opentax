/**
 * MeF A2A session client. Login is signed with the strong-authentication
 * certificate and returns a SAML Security block and a JSESSIONID cookie;
 * every later call in the session sends both back, with the AppSysID as the
 * UsernameToken's only field, and no signature (STP guide §1.3.3, §1.4.3.3;
 * Pub 4164 §4.1.6). A SECURITY_ERROR fault mid-session (an expired or
 * invalidated assertion) gets one fresh Login and one retry.
 */
import { randomBytes } from "node:crypto";
import {
  buildMefHeaderXml,
  MefAction,
  mefMessageId,
  MefSessionKeyCd,
} from "../../forms/f1040/2025/mef/submissions/a2a-header.ts";
import type { MefTestCd } from "../../forms/f1040/2025/mef/submissions/submission-manifest.ts";
import {
  bodies,
  MefFaultError,
  mefOperation,
  MefProtocolError,
  MefService,
  type MefSoapResponse,
  MefTransportError,
  parseSoapResponse,
  SAML_NAMESPACE,
  soapEnvelope,
  WSSE_NAMESPACE,
} from "./protocol.ts";
import { redact } from "./config.ts";
import {
  binaryContent,
  decodeMultipart,
  encodeMtom,
  type MimePart,
  newContentId,
  parseContentType,
} from "./mtom.ts";
import {
  newWsuId,
  signedEnvelope,
  type SigningCredential,
} from "./wssecurity.ts";
import {
  type MefAcknowledgement,
  type MefReceipt,
  type MefStatusRecord,
  parseAcknowledgements,
  parseReceipts,
  parseStatusRecords,
} from "./attachments.ts";
import {
  child,
  childElements,
  descendants,
  localName,
  standaloneElementSource,
  textContent,
  type XmlElement,
} from "./xml.ts";

export type MefClientOptions = {
  readonly baseUrl: string;
  readonly testCd: MefTestCd;
  readonly etin: string;
  readonly appSysId: string;
  readonly credential: SigningCredential;
  readonly fetch: typeof fetch;
  readonly signTimestamp: boolean;
  readonly now?: () => Date;
};

type Session = {
  readonly security: string;
  readonly cookies: ReadonlyMap<string, string>;
  readonly samlValues: readonly string[];
};

type CallResult = {
  readonly response: MefSoapResponse;
  readonly parts: readonly MimePart[];
  readonly messageId: string;
  readonly setCookies: readonly string[];
};

export type SubmissionError = {
  readonly submissionId: string;
  readonly message: string;
  readonly classification: string | undefined;
  readonly code: string | undefined;
};

export type SendResult = {
  readonly messageId: string;
  readonly depositId: string | undefined;
  readonly receipts: readonly MefReceipt[];
};

export type AckResult = {
  readonly messageId: string;
  readonly acknowledgements: readonly MefAcknowledgement[];
  readonly errors: readonly SubmissionError[];
  readonly moreAvailable: boolean;
};

export type StatusResult = {
  readonly messageId: string;
  readonly records: readonly MefStatusRecord[];
  readonly errors: readonly SubmissionError[];
  readonly moreAvailable: boolean;
};

const LOWER_ALNUM = "abcdefghijklmnopqrstuvwxyz0123456789";

function messageSequence(): string {
  return Array.from(randomBytes(8), (b) => LOWER_ALNUM[b % 36]).join("");
}

function cookiePairs(setCookies: readonly string[]): [string, string][] {
  return setCookies.flatMap((line) => {
    const pair = line.split(";")[0];
    const eq = pair.indexOf("=");
    return eq > 0
      ? [[pair.slice(0, eq).trim(), pair.slice(eq + 1).trim()]]
      : [];
  });
}

function byLocal(element: XmlElement, name: string): XmlElement | undefined {
  return childElements(element).find((c) => localName(c.name) === name);
}

function submissionErrors(body: XmlElement): SubmissionError[] {
  const list = byLocal(body, "SubmissionErrorList");
  if (list === undefined) return [];
  return childElements(list).filter((c) =>
    localName(c.name) === "SubmissionError"
  )
    .map((error) => {
      const detail = byLocal(error, "ErrorClassificationDetail");
      const text = (el: XmlElement | undefined, name: string) => {
        const found = el && byLocal(el, name);
        return found === undefined ? undefined : textContent(found).trim();
      };
      return {
        submissionId: text(error, "SubmissionId") ?? "",
        message: text(detail, "ErrorMessageTxt") ?? "",
        classification: text(detail, "ErrorClassificationCd"),
        code: text(detail, "ErrorMessageCd"),
      };
    });
}

function moreAvailable(body: XmlElement): boolean {
  const found = byLocal(body, "MoreAvailableInd");
  return found !== undefined &&
    ["true", "1"].includes(textContent(found).trim());
}

function redacted(error: unknown, secrets: readonly string[]): unknown {
  if (!(error instanceof Error)) return error;
  const message = redact(error.message, secrets);
  if (message !== error.message) error.message = message;
  return error;
}

export class MefClient {
  private session: Session | undefined;

  constructor(private readonly options: MefClientOptions) {}

  private now(): Date {
    return this.options.now?.() ?? new Date();
  }

  /** Values that must never reach output: the SAML assertion and session cookies. */
  secrets(): string[] {
    return this.session === undefined
      ? []
      : [...this.session.cookies.values(), ...this.session.samlValues];
  }

  private header(
    action: MefAction,
    messageTs: Date,
    sequence: string,
    wsuId?: string,
  ) {
    return buildMefHeaderXml({
      etin: this.options.etin,
      appSysId: this.options.appSysId,
      messageTs,
      messageSequence: sequence,
      testCd: this.options.testCd,
      action,
      sessionKeyCd: action === MefAction.Logout
        ? MefSessionKeyCd.Close
        : MefSessionKeyCd.Open,
      wsuId,
    });
  }

  private async post(
    action: MefAction,
    envelope: string,
    attachments: readonly { contentId: string; bytes: Uint8Array }[],
    messageId: string,
  ): Promise<CallResult> {
    const operation = mefOperation(action);
    const encoded = operation.service === MefService.TransmitterMtom
      ? encodeMtom(envelope, attachments)
      : {
        body: new TextEncoder().encode(envelope),
        contentType: "text/xml; charset=UTF-8",
      };
    const headers: Record<string, string> = {
      "Content-Type": encoded.contentType,
      SOAPAction: `"${operation.soapAction}"`,
    };
    if (this.session !== undefined && this.session.cookies.size > 0) {
      headers.Cookie = [...this.session.cookies].map(([k, v]) => `${k}=${v}`)
        .join("; ");
    }
    const response = await this.options.fetch(
      `${this.options.baseUrl}${operation.path}`,
      { method: "POST", headers, body: encoded.body },
    );
    const bytes = new Uint8Array(await response.arrayBuffer());
    const contentType = response.headers.get("content-type") ?? "";
    const { root, parts } =
      parseContentType(contentType).type === "multipart/related"
        ? decodeMultipart(bytes, contentType)
        : {
          root: { bytes, headers: new Map(), contentId: undefined },
          parts: [],
        };
    const xml = new TextDecoder().decode(root.bytes);
    // SOAP 1.1 faults arrive as HTTP 500 with an envelope; parse before judging status.
    let parsed: MefSoapResponse;
    try {
      parsed = parseSoapResponse(action, xml, messageId);
    } catch (error) {
      if (error instanceof MefFaultError || response.ok) throw error;
      throw new MefTransportError(action, response.status, xml.slice(0, 200));
    }
    if (!response.ok) {
      throw new MefTransportError(
        action,
        response.status,
        "non-fault error response",
      );
    }
    return {
      response: parsed,
      parts,
      messageId,
      setCookies: response.headers.getSetCookie(),
    };
  }

  private sessionHeaderBlock(): string {
    if (this.session === undefined) {
      throw new MefProtocolError("MeF call needs a Login session");
    }
    return this.session.security;
  }

  /** Sign and send Login; keep the SAML Security block and cookies it returns. */
  async login(): Promise<void> {
    this.session = undefined;
    const now = this.now();
    const sequence = messageSequence();
    const headerId = newWsuId("id");
    const envelope = signedEnvelope({
      mefHeader: this.header(MefAction.Login, now, sequence, headerId),
      headerId,
      body: bodies.login(),
      now,
      credential: this.options.credential,
      timestamp: this.options.signTimestamp,
    });
    const messageId = this.messageId(now, sequence);
    const result = await this.post(MefAction.Login, envelope, [], messageId);
    const security = result.response.security;
    if (
      security === undefined ||
      descendants(security, SAML_NAMESPACE, "Assertion").length === 0
    ) {
      throw new MefProtocolError("MeF Login response has no SAML assertion");
    }
    this.session = {
      security: this.withUsername(
        standaloneElementSource(result.response.document, security),
        security,
      ),
      cookies: new Map(cookiePairs(result.setCookies)),
      samlValues: descendants(security, SAML_NAMESPACE, "AttributeValue").map((
        v,
      ) => textContent(v).trim()),
    };
  }

  /** The guide requires a UsernameToken holding only the AppSysID; add one if Login omitted it. */
  private withUsername(raw: string, security: XmlElement): string {
    const existing = child(security, WSSE_NAMESPACE, "UsernameToken");
    if (existing !== undefined) {
      const username = child(existing, WSSE_NAMESPACE, "Username");
      if (
        username === undefined ||
        textContent(username).trim() !== this.options.appSysId
      ) {
        throw new MefProtocolError(
          "MeF Login session is for a different AppSysID",
        );
      }
      return raw;
    }
    const close = raw.lastIndexOf("</");
    return `${
      raw.slice(0, close)
    }<wsse:UsernameToken xmlns:wsse="${WSSE_NAMESPACE}"><wsse:Username>${this.options.appSysId}</wsse:Username></wsse:UsernameToken>${
      raw.slice(close)
    }`;
  }

  private messageId(now: Date, sequence: string): string {
    return mefMessageId(this.options.etin, now, sequence);
  }

  async logout(): Promise<void> {
    if (this.session === undefined) return;
    try {
      await this.call(MefAction.Logout, bodies.logout(), [], false);
    } finally {
      this.session = undefined;
    }
  }

  /** Login, run `work`, and always Logout. */
  async withSession<T>(work: (client: MefClient) => Promise<T>): Promise<T> {
    try {
      await this.login();
      const result = await work(this);
      await this.logout();
      return result;
    } catch (error) {
      const secrets = this.secrets();
      await this.logout().catch(() => {});
      throw redacted(error, secrets);
    }
  }

  private async call(
    action: MefAction,
    body: string,
    attachments: readonly { contentId: string; bytes: Uint8Array }[] = [],
    retry = true,
  ): Promise<CallResult> {
    const now = this.now();
    const sequence = messageSequence();
    const envelope = soapEnvelope(
      [this.header(action, now, sequence), this.sessionHeaderBlock()],
      body,
    );
    try {
      const result = await this.post(
        action,
        envelope,
        attachments,
        this.messageId(now, sequence),
      );
      if (result.setCookies.length > 0 && this.session !== undefined) {
        this.session = {
          ...this.session,
          cookies: new Map([
            ...this.session.cookies,
            ...cookiePairs(result.setCookies),
          ]),
        };
      }
      return result;
    } catch (error) {
      if (retry && error instanceof MefFaultError && error.isSecurityError) {
        await this.login();
        return await this.call(action, body, attachments, false);
      }
      throw error;
    }
  }

  private attachment(result: CallResult, element: string): Uint8Array {
    const found = byLocal(result.response.body, element);
    return found === undefined
      ? new Uint8Array()
      : binaryContent(found, result.parts);
  }

  private bodyText(result: CallResult, element: string): string | undefined {
    const found = byLocal(result.response.body, element);
    return found === undefined ? undefined : textContent(found).trim();
  }

  /** SendSubmissions: the SubmissionDataList and its uncompressed container ZIP. */
  async sendSubmissions(
    submissionDataList: string,
    containerZip: Uint8Array,
  ): Promise<SendResult> {
    const contentId = newContentId(1);
    const result = await this.call(
      MefAction.SendSubmissions,
      bodies.sendSubmissions(submissionDataList, contentId),
      [{ contentId, bytes: containerZip }],
    );
    return {
      messageId: result.messageId,
      depositId: this.bodyText(result, "DepositId") ??
        this.bodyText(result, "DepositID"),
      receipts: parseReceipts(
        this.attachment(result, "SubmissionRcptListAttMTOM"),
      ),
    };
  }

  private ackResult(result: CallResult, element: string): AckResult {
    return {
      messageId: result.messageId,
      acknowledgements: parseAcknowledgements(this.attachment(result, element)),
      errors: submissionErrors(result.response.body),
      moreAvailable: moreAvailable(result.response.body),
    };
  }

  async getAck(submissionId: string): Promise<AckResult> {
    return this.ackResult(
      await this.call(MefAction.GetAck, bodies.getAck(submissionId)),
      "AcknowledgementAttMTOM",
    );
  }

  async getAcks(submissionIds: readonly string[]): Promise<AckResult> {
    return this.ackResult(
      await this.call(MefAction.GetAcks, bodies.getAcks(submissionIds)),
      "AcknowledgementListAttMTOM",
    );
  }

  /** New acks, up to `count` (Pub 4164 §6.5: at most 500 per request). */
  async getNewAcks(count: number): Promise<AckResult> {
    return this.ackResult(
      await this.call(
        MefAction.GetNewAcks,
        bodies.getNewAcks(Math.min(count, 500)),
      ),
      "AcknowledgementListAttMTOM",
    );
  }

  /** Acks a GetNewAcks with this Message ID returned, e.g. after a lost response. */
  async getAcksByMsgId(messageId: string): Promise<AckResult> {
    return this.ackResult(
      await this.call(
        MefAction.GetAcksByMsgID,
        bodies.getAcksByMsgId(messageId),
      ),
      "AcknowledgementListAttMTOM",
    );
  }

  private statusResult(result: CallResult): StatusResult {
    return {
      messageId: result.messageId,
      records: parseStatusRecords(
        this.attachment(result, "StatusRecordListAttMTOM"),
      ),
      errors: submissionErrors(result.response.body),
      moreAvailable: moreAvailable(result.response.body),
    };
  }

  async getSubmissionStatus(submissionId: string): Promise<StatusResult> {
    return this.statusResult(
      await this.call(
        MefAction.GetSubmissionStatus,
        bodies.getSubmissionStatus(submissionId),
      ),
    );
  }

  async getSubmissionsStatus(
    submissionIds: readonly string[],
  ): Promise<StatusResult> {
    return this.statusResult(
      await this.call(
        MefAction.GetSubmissionsStatus,
        bodies.getSubmissionsStatus(submissionIds),
      ),
    );
  }

  async etinStatus(etin: string): Promise<{ etin: string; status: string }> {
    const result = await this.call(
      MefAction.EtinStatus,
      bodies.etinStatus(etin),
    );
    return {
      etin: this.bodyText(result, "ETIN") ?? etin,
      status: this.bodyText(result, "StatusTxt") ?? "",
    };
  }
}
