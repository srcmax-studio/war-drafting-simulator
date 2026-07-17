import gzip
import os
import socket
import subprocess
import sys
from pathlib import Path
from time import monotonic, sleep
from urllib.parse import unquote, urlsplit

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / ".output/public"
ELECTRON_APP = ROOT / "release/mac-arm64/Aeonfront.app"


def available_port():
    with socket.socket() as listener:
        listener.bind(("127.0.0.1", 0))
        return listener.getsockname()[1]


def output_file(url):
    path = unquote(urlsplit(url).path).lstrip("/") or "index.html"
    candidate = (OUTPUT / path).resolve()
    return candidate if candidate.is_file() and OUTPUT.resolve() in candidate.parents else None


assert (OUTPUT / "index.html").is_file(), "Run npm run generate before the performance audit."
port = available_port()
server = subprocess.Popen(
    [
        sys.executable,
        "-m",
        "http.server",
        str(port),
        "--bind",
        "127.0.0.1",
        "--directory",
        str(OUTPUT),
    ],
    stdout=subprocess.DEVNULL,
    stderr=subprocess.DEVNULL,
)
try:
    deadline = monotonic() + 10
    while monotonic() < deadline:
        if server.poll() is not None:
            raise RuntimeError("Static release server stopped unexpectedly.")
        try:
            with socket.create_connection(("127.0.0.1", port), timeout=0.25):
                break
        except OSError:
            sleep(0.1)
    else:
        raise RuntimeError("Static release server did not start.")

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()
        errors = []
        page.on(
            "console",
            lambda message: errors.append(f"console:{message.type}:{message.text}")
            if message.type == "error"
            else None,
        )
        page.on("pageerror", lambda error: errors.append(f"page:{error}"))
        page.goto(f"http://127.0.0.1:{port}", wait_until="networkidle")
        page.get_by_role("heading", name="万世战线", exact=True).wait_for()
        resources = page.evaluate(
            "performance.getEntriesByType('resource').map(entry => entry.name)"
        )
        timing = page.evaluate(
            """() => {
              const navigation = performance.getEntriesByType('navigation')[0];
              const paints = Object.fromEntries(performance.getEntriesByType('paint')
                .map(entry => [entry.name, Math.round(entry.startTime)]));
              return {
                domContentLoaded: Math.round(navigation.domContentLoadedEventEnd),
                load: Math.round(navigation.loadEventEnd),
                paints
              };
            }"""
        )

        files = {url: output_file(url) for url in resources}
        js_files = {path for url, path in files.items() if path and url.endswith(".js")}
        css_files = {path for url, path in files.items() if path and url.endswith(".css")}
        image_files = {
            path
            for url, path in files.items()
            if path and path.suffix.lower() in {".webp", ".png", ".jpg", ".jpeg", ".svg"}
        }
        js_gzip = sum(len(gzip.compress(path.read_bytes(), compresslevel=9)) for path in js_files)
        css_gzip = sum(len(gzip.compress(path.read_bytes(), compresslevel=9)) for path in css_files)
        largest_js_gzip = max(
            (len(gzip.compress(path.read_bytes(), compresslevel=9)) for path in js_files),
            default=0,
        )
        image_bytes = sum(path.stat().st_size for path in image_files)
        front_requests = [url for url in resources if "/assets/fronts/" in url]
        card_requests = [url for url in resources if "/assets/cards/" in url]
        audio_requests = [url for url in resources if "/assets/audio/" in url]

        print(
            "Initial resources: "
            f"JS {js_gzip} B gzip across {len(js_files)} files, "
            f"CSS {css_gzip} B gzip, images {image_bytes} B"
        )

        assert js_gzip <= 450 * 1024, f"Initial JavaScript gzip budget exceeded: {js_gzip}"
        assert largest_js_gzip <= 320 * 1024, f"JavaScript chunk gzip budget exceeded: {largest_js_gzip}"
        assert css_gzip <= 40 * 1024, f"Initial CSS gzip budget exceeded: {css_gzip}"
        assert image_bytes <= 4 * 1024 * 1024, f"Initial image budget exceeded: {image_bytes}"
        assert len(front_requests) <= 4, f"Too many fronts loaded on home: {len(front_requests)}"
        assert len(card_requests) <= 6, f"Too many cards loaded on home: {len(card_requests)}"
        assert not audio_requests, "Audio loaded before user interaction."
        assert not [url for url in resources if "/hd/" in url], "HD media loaded on home."
        assert not [url for url in resources if "/game." in url or "/_gameId_." in url]
        assert timing["domContentLoaded"] <= 4_000
        assert timing["load"] <= 4_000
        assert not errors, "Browser errors: " + " | ".join(errors)
        context.close()
        browser.close()

    audio_total = sum(
        path.stat().st_size
        for path in (ROOT / "public/assets/audio").rglob("*")
        if path.is_file()
    )
    assert audio_total <= 12 * 1024 * 1024
    electron_bytes = sum(
        path.lstat().st_size
        for path in ELECTRON_APP.rglob("*")
        if path.is_file() or path.is_symlink()
    )
    assert electron_bytes <= 400 * 1024 * 1024
    print(
        "Performance budgets passed: "
        f"JS {js_gzip} B gzip, CSS {css_gzip} B gzip, images {image_bytes} B, "
        f"FCP {timing['paints'].get('first-contentful-paint', 0)} ms, "
        f"Electron {electron_bytes} B"
    )
finally:
    if server.poll() is None:
        server.terminate()
    try:
        server.wait(timeout=5)
    except subprocess.TimeoutExpired:
        server.kill()
        server.wait()
