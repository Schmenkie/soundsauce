#!/usr/bin/env python3
"""
Remix Lab menubar app — a status dot for the local helper.

    ●  green   helper up, yt-dlp + ffmpeg healthy
    ●  yellow  helper up but missing yt-dlp / ffmpeg (or a job is running)
    ●  red     helper not reachable

It supervises `helper/remix-helper.mjs` (starts it, restarts it if it dies) and gives
you the two-click chores: open the Sources / Stems folders, update yt-dlp, restart.

Install once with `npm run menubar:install` (creates a venv with rumps and a login
item); run ad hoc with `npm run menubar`.
"""
import os
import subprocess
import sys
import time
import json
import urllib.request
import webbrowser
from pathlib import Path

import rumps

REPO_DIR = Path(os.environ.get("REMIX_REPO_DIR", Path(__file__).resolve().parents[2]))
HELPER = REPO_DIR / "helper" / "remix-helper.mjs"
HELPER_URL = os.environ.get("REMIX_HELPER_URL", "http://localhost:7331")
LAB_URL = "https://soundsauce.app"
NODE = os.environ.get("NODE_BIN") or "node"
LOG_PATH = Path.home() / "Library" / "Logs" / "remix-helper.log"
POLL_SECONDS = 10

DOT = {"ok": "🟢", "warn": "🟡", "down": "🔴"}


def brew_path():
    for p in ("/opt/homebrew/bin/brew", "/usr/local/bin/brew"):
        if os.path.exists(p):
            return p
    return "brew"


class RemixMenubar(rumps.App):
    def __init__(self):
        super().__init__("Remix Lab", title=DOT["down"], quit_button=None)
        self.proc = None
        self.health = None
        self.owns_helper = False
        self.status_item = rumps.MenuItem("Looking for the helper…")
        self.status_item.set_callback(None)
        self.version_item = rumps.MenuItem("")
        self.version_item.set_callback(None)
        self.menu = [
            self.status_item,
            self.version_item,
            None,
            rumps.MenuItem("Open the Lab", callback=self.open_lab),
            rumps.MenuItem("Open Sources folder", callback=self.open_sources),
            rumps.MenuItem("Open Stems folder", callback=self.open_stems),
            None,
            rumps.MenuItem("Update yt-dlp (brew)", callback=self.update_ytdlp),
            rumps.MenuItem("Restart helper", callback=self.restart_helper),
            rumps.MenuItem("Show log", callback=self.show_log),
            None,
            rumps.MenuItem("Quit", callback=self.quit),
        ]
        self.timer = rumps.Timer(self.tick, POLL_SECONDS)
        self.timer.start()
        self.tick(None)

    # ---- helper process -------------------------------------------------------

    def fetch_health(self):
        try:
            with urllib.request.urlopen(f"{HELPER_URL}/health", timeout=3) as res:
                return json.loads(res.read().decode("utf8"))
        except Exception:
            return None

    def start_helper(self):
        if self.proc and self.proc.poll() is None:
            return
        LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
        log = open(LOG_PATH, "ab")
        env = {**os.environ, "PATH": "/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:" + os.environ.get("PATH", "")}
        self.proc = subprocess.Popen([NODE, str(HELPER)], cwd=str(REPO_DIR), stdout=log, stderr=subprocess.STDOUT, env=env)
        self.owns_helper = True

    def stop_helper(self):
        if self.proc and self.proc.poll() is None:
            self.proc.terminate()
            try:
                self.proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self.proc.kill()
        self.proc = None

    def tick(self, _):
        health = self.fetch_health()
        if health is None and (self.proc is None or self.proc.poll() is not None):
            # Nothing answering and we aren't running one → start it (covers crashes too)
            self.start_helper()
            time.sleep(1.5)
            health = self.fetch_health()
        self.health = health
        self.render()

    def render(self):
        h = self.health
        if not h:
            self.title = DOT["down"]
            self.status_item.title = "Helper offline — starting…"
            self.version_item.title = str(HELPER)
            return
        if h.get("ok"):
            self.title = DOT["ok"]
            self.status_item.title = f"Helper running on {HELPER_URL.replace('http://', '')}"
        else:
            self.title = DOT["warn"]
            missing = [n for n, present in (("yt-dlp", h.get("ytdlp")), ("ffmpeg", h.get("ffmpeg"))) if not present]
            self.status_item.title = f"Missing: {', '.join(missing)} — brew install {' '.join(missing)}"
        self.version_item.title = f"yt-dlp {h.get('ytdlp') or '—'} · ffmpeg {'ok' if h.get('ffmpeg') else 'missing'}"

    # ---- menu actions ---------------------------------------------------------

    def open_lab(self, _):
        webbrowser.open(LAB_URL)

    def open_sources(self, _):
        folder = (self.health or {}).get("sourcesDir") or str(Path.home() / "Music" / "Remix Lab" / "Sources")
        subprocess.Popen(["open", folder])

    def open_stems(self, _):
        folder = (self.health or {}).get("stemsDir") or str(Path.home() / "Music" / "Remix Lab" / "Stems")
        subprocess.Popen(["open", folder])

    def update_ytdlp(self, _):
        self.status_item.title = "Updating yt-dlp…"
        self.title = DOT["warn"]
        try:
            out = subprocess.run([brew_path(), "upgrade", "yt-dlp"], capture_output=True, text=True, timeout=600)
            msg = (out.stdout + out.stderr).strip().splitlines()
            rumps.notification("Remix Lab", "yt-dlp update", msg[-1] if msg else "done")
        except Exception as err:  # noqa: BLE001
            rumps.notification("Remix Lab", "yt-dlp update failed", str(err))
        self.tick(None)

    def restart_helper(self, _):
        self.stop_helper()
        if not self.owns_helper:
            # Someone else (npm run dev:full, an old LaunchAgent) owns the port — ask it to go
            subprocess.run(["pkill", "-f", "remix-helper.mjs"], check=False)
            time.sleep(1)
        self.start_helper()
        time.sleep(2)
        self.tick(None)

    def show_log(self, _):
        subprocess.Popen(["open", "-a", "Console", str(LOG_PATH)])

    def quit(self, _):
        self.stop_helper()
        rumps.quit_application()


if __name__ == "__main__":
    if not HELPER.exists():
        print(f"helper not found at {HELPER} — set REMIX_REPO_DIR", file=sys.stderr)
        sys.exit(1)
    RemixMenubar().run()
