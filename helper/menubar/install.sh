#!/usr/bin/env bash
# Installs the Remix Lab menubar app: a venv with rumps under ~/Library/Application Support,
# plus a LaunchAgent so the status dot (and the helper it supervises) come up at login.
#
#   npm run menubar:install       # install / reinstall
#   npm run menubar               # run it in the foreground instead
#
# Uninstall:
#   launchctl bootout gui/$(id -u)/app.soundsauce.remix-menubar
#   rm ~/Library/LaunchAgents/app.soundsauce.remix-menubar.plist
#
# If the old helper-only LaunchAgent (app.soundsauce.remix-helper) is installed, this
# removes it — the menubar app starts the helper itself.
set -euo pipefail

LABEL="app.soundsauce.remix-menubar"
OLD_LABEL="app.soundsauce.remix-helper"
REPO_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
APP_DIR="$HOME/Library/Application Support/Remix Lab"
VENV="$APP_DIR/menubar-venv"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
LOG_DIR="$HOME/Library/Logs"
NODE_BIN="$(command -v node)"
PYTHON="$(command -v python3)"

if [ -z "$NODE_BIN" ]; then echo "node not found on PATH"; exit 1; fi
if [ -z "$PYTHON" ]; then echo "python3 not found — brew install python"; exit 1; fi
mkdir -p "$APP_DIR" "$HOME/Library/LaunchAgents" "$LOG_DIR"

if [ ! -x "$VENV/bin/python" ]; then
  echo "Creating venv at $VENV"
  "$PYTHON" -m venv "$VENV"
fi
"$VENV/bin/pip" install --quiet --upgrade rumps

# The helper-only login item would fight the menubar app for port 7331
if [ -f "$HOME/Library/LaunchAgents/$OLD_LABEL.plist" ]; then
  launchctl bootout "gui/$(id -u)/$OLD_LABEL" 2>/dev/null || true
  rm -f "$HOME/Library/LaunchAgents/$OLD_LABEL.plist"
  echo "Removed the old $OLD_LABEL login item (the menubar app runs the helper now)"
fi

cat > "$PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>$VENV/bin/python</string>
    <string>$REPO_DIR/helper/menubar/remix_menubar.py</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key><string>/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin</string>
    <key>NODE_BIN</key><string>$NODE_BIN</string>
    <key>REMIX_REPO_DIR</key><string>$REPO_DIR</string>
  </dict>
  <key>WorkingDirectory</key><string>$REPO_DIR</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>$LOG_DIR/remix-menubar.log</string>
  <key>StandardErrorPath</key><string>$LOG_DIR/remix-menubar.log</string>
</dict>
</plist>
PLIST

launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
echo "Installed $LABEL — look for the dot in the menu bar. Logs: $LOG_DIR/remix-menubar.log"
