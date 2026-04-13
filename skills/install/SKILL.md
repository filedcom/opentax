---
name: Install CLI
description: Downloads and installs the opentax CLI binary. Detects OS and architecture automatically.
---

# Install OpenTax CLI

Install the `opentax` CLI binary. This is a single binary with no dependencies.

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/filedcom/opentax/main/install.sh | sh
```

## Verify

```bash
opentax version
```

If the install script doesn't work (permissions, corporate firewall, etc.), download the binary manually:

| Platform | Command |
|----------|---------|
| Mac (Apple Silicon) | `curl -fL --progress-bar -o /usr/local/bin/opentax https://github.com/filedcom/opentax/releases/latest/download/opentax-macos-arm64 && chmod +x /usr/local/bin/opentax` |
| Mac (Intel) | `curl -fL --progress-bar -o /usr/local/bin/opentax https://github.com/filedcom/opentax/releases/latest/download/opentax-macos-x64 && chmod +x /usr/local/bin/opentax` |
| Linux (x64) | `curl -fL --progress-bar -o /usr/local/bin/opentax https://github.com/filedcom/opentax/releases/latest/download/opentax-linux-x64 && chmod +x /usr/local/bin/opentax` |
| Linux (ARM) | `curl -fL --progress-bar -o /usr/local/bin/opentax https://github.com/filedcom/opentax/releases/latest/download/opentax-linux-arm64 && chmod +x /usr/local/bin/opentax` |
| Windows | Download `opentax-windows-x64.exe` from https://github.com/filedcom/opentax/releases/latest and add to PATH |

Use `sudo` if `/usr/local/bin` requires elevated permissions.

## Update

To update an existing installation:

```bash
opentax update
```
