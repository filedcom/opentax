# MeF documents

Start with [TY2025 readiness and evidence](./ty2025/README.md). [A2A transmission](./transmission.md) covers sending to the IRS: credentials, `opentax mef` commands, the first ATS run and what it must confirm. Its topic folders separate readiness, coverage inventories, source gaps, tax-domain evidence and deferred research.

## Transmitting with MeF A2A

`opentax mef` sends a return's submission ZIP to the IRS over MeF
Application-to-Application (WSDL 10.9) and stores the acknowledgements under the
return. ATS (the IRS test system) is the default; production needs separate
opt-ins.

```bash
opentax mef login-check                     # log in and out with the A2A certificate
opentax mef send --returnId a1b2c3          # build the submission ZIP and send it
opentax mef status --submissionId <id>      # IRS status record
opentax mef acks --submissionId <id>        # or --new for every pending ack
opentax mef ats-run                         # send every ATS test return in the store and poll for acks
```

It needs an ETIN, EFIN, Software ID, Application System ID and an IRS-approved
strong-authentication certificate. Setup, commands and the assumptions the
first live run must confirm are in
[transmission.md](./transmission.md).

## MeF readiness

|                      | State                                                                                                                                                      |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TY2025 ATS scenarios | 8 of 8 Form 1040 scenarios pass the offline check (`bun run check:ats`): no reject-level findings, packet values matched or documented as packet conflicts |
| TY2025 XML           | Built on the 2025v5.4 schema; validated against `Return1040.xsd` when `irs/` has the schemas                                                               |
| Submission ZIP       | Pub 4164 layout, manifest checked against the submission and transmission rules before it is written                                                       |
| A2A client           | Built and tested against a local mock IRS server; not yet run against the live IRS, which needs the credentials above                                      |
| TY2026               | Form 1040 on the 2026v1.0 schema, which ATS does not accept, for every TY2025 input. Form 4868 on 2026v1.0                                                  |
| TY2026 ATS scenarios | 2 of 9 Form 1040 packets pass the same offline check against 2026v1.0; `check:ats` names the findings and schema gaps that block the rest                  |

None of this is IRS acceptance or authorization of any product.
