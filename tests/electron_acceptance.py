import os
import socket
import subprocess
from pathlib import Path
from tempfile import TemporaryDirectory
from time import monotonic, sleep
from urllib.parse import urlsplit

from playwright.sync_api import Error, sync_playwright


ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "release/mac-arm64/Aeonfront.app/Contents/MacOS/Aeonfront"
ARTIFACTS = ROOT.parent / "artifacts"
ARTIFACTS.mkdir(parents=True, exist_ok=True)


def available_port():
    with socket.socket() as listener:
        listener.bind(("127.0.0.1", 0))
        return listener.getsockname()[1]


assert APP.is_file(), f"Electron application is missing: {APP}"
port = available_port()

with TemporaryDirectory(prefix="aeonfront-electron-") as user_data:
    process = subprocess.Popen(
        [
            str(APP),
            f"--remote-debugging-port={port}",
            f"--user-data-dir={user_data}",
            "--no-sandbox",
        ],
        cwd=ROOT,
        env={**os.environ, "ELECTRON_DISABLE_SECURITY_WARNINGS": "true"},
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )
    browser = None
    try:
        with sync_playwright() as playwright:
            deadline = monotonic() + 30
            last_error = None
            while browser is None:
                if process.poll() is not None:
                    output = process.stdout.read() if process.stdout else ""
                    raise RuntimeError(f"Electron exited before opening a window.\n{output}")
                try:
                    browser = playwright.chromium.connect_over_cdp(
                        f"http://127.0.0.1:{port}", timeout=1_000
                    )
                except Error as error:
                    last_error = error
                    if monotonic() >= deadline:
                        raise last_error
                    sleep(0.25)

            while monotonic() < deadline:
                contexts = browser.contexts
                pages = contexts[0].pages if contexts else []
                if pages:
                    break
                sleep(0.1)
            assert contexts, "Electron did not expose a browser context"
            assert pages, "Electron did not create a window"
            page = pages[0]
            errors = []
            page.on(
                "console",
                lambda message: errors.append(
                    f"console:{message.type}:{message.text}"
                )
                if message.type == "error"
                else None,
            )
            page.on("pageerror", lambda error: errors.append(f"page:{error}"))
            page.wait_for_load_state("networkidle")
            parsed = urlsplit(page.url)
            assert parsed.hostname == "127.0.0.1" and parsed.port, page.url
            origin = f"{parsed.scheme}://{parsed.hostname}:{parsed.port}"

            page.goto(origin, wait_until="networkidle")
            assert page.get_by_role("heading", name="万世战线").is_visible()
            hero_images = page.locator(".hero-fronts img")
            assert hero_images.count() == 3
            assert hero_images.evaluate_all(
                "images => images.every(image => image.complete && image.naturalWidth > 0)"
            )
            assert "72" in page.locator(".hero-metrics").inner_text()
            page.screenshot(path=ARTIFACTS / "electron-home.png", full_page=True)

            page.goto(f"{origin}/fronts", wait_until="networkidle")
            page.wait_for_selector(".front-grid .front-card")
            assert page.locator(".front-grid .front-card").count() == 72
            page.goto(f"{origin}/deck-builder", wait_until="networkidle")
            assert page.locator("[data-testid=selected-deck] li").count() == 12
            assert "CORE-2-" not in page.locator(".deck-page").inner_text()
            page.screenshot(
                path=ARTIFACTS / "electron-deck-builder.png", full_page=False
            )

            assert not errors, "Electron browser errors: " + " | ".join(errors)
            print(f"Electron acceptance screenshots: {ARTIFACTS}")
    finally:
        if browser is not None:
            try:
                browser.close()
            except Error:
                pass
        if process.poll() is None:
            process.terminate()
        try:
            process.communicate(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
            process.communicate()
