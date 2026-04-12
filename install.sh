#!/bin/sh
# Install or update OpenTax.
# Usage: curl -fsSL https://raw.githubusercontent.com/filedcom/opentax/main/install.sh | sh
set -e

REPO="filedcom/opentax"
INSTALL_DIR="/usr/local/bin"
BIN_NAME="opentax"

# Detect OS
case "$(uname -s)" in
  Darwin)  OS="macos" ;;
  Linux)   OS="linux" ;;
  MINGW*|MSYS*|CYGWIN*) OS="windows" ;;
  *) echo "Unsupported OS: $(uname -s)" >&2; exit 1 ;;
esac

# Detect architecture
case "$(uname -m)" in
  x86_64|amd64)  ARCH="x64" ;;
  arm64|aarch64)  ARCH="arm64" ;;
  *) echo "Unsupported architecture: $(uname -m)" >&2; exit 1 ;;
esac

if [ "$OS" = "windows" ]; then
  ASSET="opentax-windows-${ARCH}.exe"
else
  ASSET="opentax-${OS}-${ARCH}"
fi

URL="https://github.com/${REPO}/releases/latest/download/${ASSET}"

echo "Downloading ${ASSET}..."
if command -v curl >/dev/null 2>&1; then
  curl -fL --progress-bar -o "/tmp/${ASSET}" "$URL"
elif command -v wget >/dev/null 2>&1; then
  wget --show-progress -qO "/tmp/${ASSET}" "$URL"
else
  echo "Error: curl or wget required" >&2
  exit 1
fi

if [ "$OS" = "windows" ]; then
  DEST="${INSTALL_DIR}/${BIN_NAME}.exe"
else
  DEST="${INSTALL_DIR}/${BIN_NAME}"
fi

# Install -- use sudo if needed
if [ -w "$INSTALL_DIR" ]; then
  mv "/tmp/${ASSET}" "$DEST"
  chmod +x "$DEST"
else
  echo "Installing to ${INSTALL_DIR} (requires sudo)..."
  sudo mv "/tmp/${ASSET}" "$DEST"
  sudo chmod +x "$DEST"
fi

echo "Installed $(${DEST} version) to ${DEST}"
