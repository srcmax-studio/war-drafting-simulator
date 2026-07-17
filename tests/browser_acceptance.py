import re
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE_URL = "http://127.0.0.1:3100"
ARTIFACTS = Path(__file__).resolve().parents[2] / "artifacts"
ARTIFACTS.mkdir(exist_ok=True)


def attach_error_capture(page, errors):
    page.on("console", lambda message: errors.append(f"console:{message.type}:{message.text}") if message.type == "error" else None)
    page.on("pageerror", lambda error: errors.append(f"page:{error}"))


def assert_images_loaded(page, selector, sample=8):
    images = page.locator(selector)
    assert images.count() > 0, f"No images matched {selector}"
    checked = min(sample, images.count())
    for index in range(checked):
        image = images.nth(index)
        image.scroll_into_view_if_needed()
        page.wait_for_function("img => img.complete", arg=image.element_handle())
        assert image.evaluate("img => img.naturalWidth > 0"), f"Image {index} failed to load"


def plan_one_affordable_card(page, energy):
    cards = page.locator(".hand-row .card-tile")
    fronts = page.locator(".front-brief:not([disabled])")
    for card_index in range(cards.count()):
        card = cards.nth(card_index)
        cost = int(card.locator(".card-cost").inner_text())
        if cost > energy:
            continue
        for front_index in range(fronts.count()):
            before = page.locator(".board-card.planned").count()
            card.click()
            fronts.nth(front_index).click()
            if page.locator(".board-card.planned").count() > before:
                return True
    return False


def desktop_flow(browser):
    context = browser.new_context(viewport={"width": 1440, "height": 1000}, device_scale_factor=1)
    page = context.new_page()
    errors = []
    attach_error_capture(page, errors)

    page.goto(BASE_URL, wait_until="networkidle")
    assert page.get_by_role("heading", name="万世战线").is_visible()
    assert_images_loaded(page, ".portrait-rank img", 4)
    page.screenshot(path=ARTIFACTS / "home-desktop.png", full_page=True)

    page.goto(f"{BASE_URL}/collection", wait_until="networkidle")
    page.wait_for_selector(".card-grid .card-tile")
    assert page.locator(".card-grid .card-tile").count() == 48
    assert_images_loaded(page, ".card-grid .card-art", 12)
    page.locator(".card-grid .card-tile").first.click()
    assert page.locator(".card-detail").is_visible()
    page.get_by_role("button", name="关闭").click()
    page.screenshot(path=ARTIFACTS / "collection-desktop.png", full_page=False)

    page.goto(f"{BASE_URL}/deck-builder", wait_until="networkidle")
    page.wait_for_selector(".card-grid .card-tile")
    selected_before = page.locator(".card-grid .card-tile.selected").count()
    if selected_before:
        page.locator(".card-grid .card-tile.selected").first.click()
        assert page.locator(".card-grid .card-tile.selected").count() == selected_before - 1
    page.screenshot(path=ARTIFACTS / "deck-builder-desktop.png", full_page=False)

    page.goto(f"{BASE_URL}/play", wait_until="networkidle")
    start_button = page.get_by_role("button", name=re.compile("开始"))
    assert start_button.is_enabled(), "Practice button is disabled"
    start_button.click()
    page.wait_for_timeout(750)
    assert "/game?mode=practice" in page.url, f"Practice navigation failed at {page.url}; errors={errors}"
    page.wait_for_selector(".front-lane")
    assert page.locator(".front-lane").count() == 3
    assert page.locator(".hand-row .card-tile").count() >= 4
    planned_any = plan_one_affordable_card(page, 1)
    page.screenshot(path=ARTIFACTS / "game-turn-one-desktop.png", full_page=True)

    for turn in range(1, 7):
        if turn > 1:
            planned_any = plan_one_affordable_card(page, turn) or planned_any
        page.get_by_role("button", name=re.compile("锁定行动")).click()
        if turn < 6:
            page.wait_for_function(
                "expected => document.querySelector('.battle-status')?.textContent.includes(`回合 ${expected}/6`)",
                arg=turn + 1,
            )
        else:
            page.wait_for_selector(".result-banner")
    assert planned_any, "No legal card was deployed during the six-turn acceptance match"
    assert "total_power" not in page.locator(".result-banner").inner_text()
    page.screenshot(path=ARTIFACTS / "game-result-desktop.png", full_page=True)

    page.goto(f"{BASE_URL}/history", wait_until="networkidle")
    page.locator(".history-list button").first.click()
    page.wait_for_selector(".replay-check.valid")
    assert "完全一致" in page.locator(".replay-check.valid").inner_text()
    page.screenshot(path=ARTIFACTS / "history-desktop.png", full_page=True)

    assert not errors, "Browser errors: " + " | ".join(errors)
    context.close()


def mobile_flow(browser):
    context = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True)
    page = context.new_page()
    errors = []
    attach_error_capture(page, errors)

    page.goto(BASE_URL, wait_until="networkidle")
    assert page.get_by_role("heading", name="万世战线").is_visible()
    assert page.evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1")
    page.screenshot(path=ARTIFACTS / "home-mobile.png", full_page=True)

    page.goto(f"{BASE_URL}/collection", wait_until="networkidle")
    page.wait_for_selector(".card-grid .card-tile")
    assert page.locator(".card-grid .card-tile").count() == 48
    assert page.locator(".card-copy").evaluate_all("els => els.every(el => el.scrollWidth <= el.clientWidth + 1)")
    page.screenshot(path=ARTIFACTS / "collection-mobile.png", full_page=False)

    page.goto(f"{BASE_URL}/play", wait_until="networkidle")
    start_button = page.get_by_role("button", name=re.compile("开始"))
    assert start_button.is_enabled(), "Mobile practice button is disabled"
    start_button.click()
    page.wait_for_selector(".front-lane")
    assert page.locator(".front-scroll").evaluate("el => el.scrollWidth > el.clientWidth")
    assert page.evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1")
    page.screenshot(path=ARTIFACTS / "game-mobile.png", full_page=True)

    assert not errors, "Mobile browser errors: " + " | ".join(errors)
    context.close()


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    desktop_flow(browser)
    mobile_flow(browser)
    browser.close()
    print(f"Browser acceptance screenshots: {ARTIFACTS}")
