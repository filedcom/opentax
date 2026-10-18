# Release artifact smoke check

The release workflow compiles five native assets and runs each asset on a
matching GitHub-hosted architecture before uploading it. The Linux ARM job uses
`ubuntu-24.04-arm`, macOS Intel uses `macos-15-intel`, macOS ARM uses `macos-15`,
and the remaining Linux x64 and Windows x64 jobs use their matching default
runners. A failed smoke step prevents that artifact from being uploaded and
prevents the dependent release job from publishing the set. A manual dispatch
with `dry_run: true` builds and smokes but does not create a release, even when
dispatched from a tag.
The release job writes `SHA256SUMS` from the five downloaded assets and
publishes it beside them. Reviewers can compare each downloaded file with its
recorded digest; the manifest alone does not establish a signature or publisher
identity.

`scripts/release/smoke-release-binary.ts` invokes the **compiled asset**, not the
source CLI, from a temporary working directory. It checks the injected
version, creates a synthetic TY2025 Single return, adds full filer and W-2
source facts, checks computed wages and withholding, requires CLI validation to
find no applicable rule failures, and exports finalized MeF XML with exactly one
`IRS1040` and one `IRSW2` document. It checks filer identity, filing status,
employer identity, wages, and withholding against the synthetic source in those
documents, then loads the exported PDF to require at least two pages, no live
form fields, and the actual flattened Form 1040 appearance text for the filer
name, line 1a wages, and line 25a W-2 withholding at their TY2025 template
positions. This uses the existing `pdf-lib` dependency and needs no PDF system
tool on the five runners. It never passes `--force` or `--draft`. The temporary
return, XML output, PDF, and downloaded IRS template cache are deleted after
the run. The compiled CLI may
also read or write its update-check cache in the runner's home directory at
`.opentax/update-check.json`; that cache is outside the temporary directory.

For a manually built native asset on a matching machine, run:

```sh
bun scripts/release/smoke-release-binary.ts ./opentax-linux-x64 1.2.3 [transcript.json]
```

Use the actual asset path and injected version. The optional third argument
records every call's output, masked only for return IDs, the temporary
directory and the MeF clock, so two builds can be compared byte for byte.
Cross-compiled assets must be
run on the corresponding architecture. This check proves only that one simple
source-backed return works through the packaged binary on that platform. It is
not the full test suite, TY2025 XSD validation, PDF visual inspection, tax-rule
coverage, malware/signature verification, or IRS ATS acceptance. Those remain
separate release gates. No smoke result is claimed until the workflow runs.

## Cutting a release

`cli/version.ts` stays `dev` in source; the release workflow injects the tag
version before compiling. The `package.json` version is separate from the CLI
release and is not changed by the workflow.

Build all five targets from the merged commit without publishing:

```sh
gh workflow run Release --ref main -f dry_run=true
gh run list --workflow Release --limit 3
```

Check the run's five build/smoke jobs and downloadable Actions artifacts; the
injected version is `0.0.0-dev` because the ref is `main`. Then tag the
verified merged commit and let the tag-push workflow publish:

```sh
git switch main
git pull --ff-only origin main
git tag vX.Y.Z
git push origin vX.Y.Z
gh release view vX.Y.Z --json tagName,assets,publishedAt
```

Expected release assets are `opentax-linux-x64`, `opentax-linux-arm64`,
`opentax-macos-x64`, `opentax-macos-arm64`, `opentax-windows-x64.exe` and
`SHA256SUMS`. The release job depends on all five build/smoke jobs, fails on a
missing upload, and requires exactly five nonempty binaries before writing
checksums. Verify each published digest against `SHA256SUMS`, then rerun the
smoke on the matching host binary:

```sh
bun scripts/release/smoke-release-binary.ts ./opentax-macos-arm64 X.Y.Z
```

The smoke does not establish IRS ATS acceptance; see
[the ATS plan](./ats/ty2025.md) and [A2A transmission](./mef/transmission.md).
