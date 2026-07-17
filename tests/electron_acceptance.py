from pathlib import Path
from playwright.sync_api import sync_playwright

artifact = Path(__file__).resolve().parents[2] / "artifacts" / "electron-home.png"

with sync_playwright() as playwright:
    browser = playwright.chromium.connect_over_cdp("http://127.0.0.1:9223")
    contexts = browser.contexts
    assert contexts, "Electron did not expose a browser context"
    pages = contexts[0].pages
    assert pages, "Electron did not create a window"
    page = pages[0]
    page.wait_for_load_state("networkidle")
    assert page.url.startswith("http://127.0.0.1:"), page.url
    assert page.get_by_role("heading", name="万世战线").is_visible()
    hero_images = page.locator(".portrait-rank img")
    assert hero_images.count() == 4
    assert hero_images.evaluate_all("images => images.every(image => image.complete && image.naturalWidth > 0)")
    page.screenshot(path=artifact, full_page=True)
    browser.close()
    print(f"Electron acceptance screenshot: {artifact}")
