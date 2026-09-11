#!/usr/bin/env bash
# Installs the Remix Lab helper as a macOS LaunchAgent so it starts at login and
# restarts if it crashes. Re-run after moving the repo. Uninstall with:
#   launchctl bootout gui/$(id -u)/app.soundsauce.remix-helper
#   rm ~/Library/LaunchAgents/app.soundsauce.remix-helper.plist
set -euo pipefail

LABEL="app.soundsauce.remix-helper"
REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
NODE_BIN="$(command -v node)"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
LOG_DIR="$HOME/Library/Logs"

if [ -z "$NODE_BIN" ]; then echo "node not found on PATH"; exit 1; fi
mkdir -p "$HOME/Library/LaunchAgents" "$LOG_DIR"

cat > "$PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>$NODE_BIN</string>
    <string>$REPO_DIR/helper/remix-helper.mjs</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key><string>/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin</string>
  </dict>
  <key>WorkingDirectory</key><string>$REPO_DIR</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>$LOG_DIR/remix-helper.log</string>
  <key>StandardErrorPath</key><string>$LOG_DIR/remix-helper.log</string>
</dict>
</plist>
PLIST

launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
echo "Installed $LABEL — helper will run at login. Logs: $LOG_DIR/remix-helper.log"
echo "Check: curl -s http://localhost:7331/health"
