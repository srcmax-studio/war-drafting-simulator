from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright

artifacts = Path(__file__).resolve().parents[2] / "artifacts"
artifacts.mkdir(exist_ok=True)

with sync_playwright() as playwright:
    browser = playwright.chromium.connect_over_cdp("http://127.0.0.1:9223")
    contexts = browser.contexts
    assert contexts, "Electron did not expose a browser context"
    pages = contexts[0].pages
    assert pages, "Electron did not create a window"
    page = pages[0]
    errors = []
    page.on("console", lambda message: errors.append(f"console:{message.type}:{message.text}") if message.type == "error" else None)
    page.on("pageerror", lambda error: errors.append(f"page:{error}"))
    parsed = urlsplit(page.url)
    assert parsed.hostname == "127.0.0.1" and parsed.port, page.url
    origin = f"{parsed.scheme}://{parsed.hostname}:{parsed.port}"

    page.goto(origin, wait_until="networkidle")
    assert page.get_by_role("heading", name="万世战线").is_visible()
    hero_images = page.locator(".portrait-rank img")
    assert hero_images.count() == 4
    assert hero_images.evaluate_all("images => images.every(image => image.complete && image.naturalWidth > 0)")
    assert "72" in page.locator(".home-actions").inner_text()
    page.screenshot(path=artifacts / "electron-home.png", full_page=True)

    page.goto(f"{origin}/fronts", wait_until="networkidle")
    assert page.locator(".front-archive article").count() == 72
    page.goto(f"{origin}/deck-builder", wait_until="networkidle")
    assert page.locator("[data-testid=selected-deck] li").count() == 12
    assert "CORE-2-" in page.locator(".deck-page").inner_text()
    page.screenshot(path=artifacts / "electron-deck-builder.png", full_page=False)

    assert not errors, "Electron browser errors: " + " | ".join(errors)
    browser.close()
    print(f"Electron acceptance screenshots: {artifacts}")
