import os
from pathlib import Path

from playwright.sync_api import sync_playwright


CLIENT_URL = os.environ.get("AEONFRONT_CLIENT_URL", "http://127.0.0.1:3100")
ARTIFACTS = Path(__file__).resolve().parents[2] / "artifacts" / "responsive"
ARTIFACTS.mkdir(parents=True, exist_ok=True)
VIEWPORTS = [
    (1920, 1080),
    (1440, 900),
    (1280, 720),
    (1024, 768),
    (768, 1024),
    (430, 932),
    (390, 844),
]

SETTINGS_SCRIPT = """
(() => {
  localStorage.setItem('aeonfront_settings_v2', JSON.stringify({
    serverUrl: 'ws://127.0.0.1:3001', playerName: '响应式校验',
    reducedMotion: true, highContrast: false, animationSpeed: 'instant',
    effectsQuality: 'low', audio: { enabled: false, masterVolume: 0.8,
      musicVolume: 0.55, sfxVolume: 0.8, interfaceVolume: 0.65,
      muteWhenUnfocused: true }
  }));
})();
"""


def assert_no_document_overflow(page, label):
    metrics = page.evaluate(
        """() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth
        })"""
    )
    assert metrics["scrollWidth"] <= metrics["clientWidth"] + 1, (
        f"{label}: document width {metrics['scrollWidth']} exceeds "
        f"viewport width {metrics['clientWidth']}"
    )


def assert_within_viewport(page, selectors, label):
    clipped = page.evaluate(
        """selectors => selectors.flatMap(selector =>
          [...document.querySelectorAll(selector)]
            .filter(element => {
              const style = getComputedStyle(element);
              const rect = element.getBoundingClientRect();
              return style.display !== 'none' && style.visibility !== 'hidden'
                && rect.width > 0 && rect.height > 0
                && (rect.left < -1 || rect.right > innerWidth + 1);
            })
            .map(element => ({ selector, text: element.textContent?.trim().slice(0, 40) }))
        )""",
        selectors,
    )
    assert not clipped, f"{label}: controls outside viewport: {clipped}"


def assert_images_loaded(page, selector, sample):
    images = page.locator(selector)
    assert images.count() >= sample
    for index in range(sample):
        image = images.nth(index)
        image.scroll_into_view_if_needed()
        page.wait_for_function("image => image.complete", arg=image.element_handle())
        assert image.evaluate("image => image.naturalWidth > 0")


def exercise_viewport(browser, width, height):
    context = browser.new_context(
        viewport={"width": width, "height": height},
        device_scale_factor=1,
        is_mobile=width <= 430,
    )
    context.add_init_script(SETTINGS_SCRIPT)
    page = context.new_page()
    errors = []
    page.on(
        "console",
        lambda message: errors.append(f"console:{message.type}:{message.text}")
        if message.type == "error"
        else None,
    )
    page.on("pageerror", lambda error: errors.append(f"page:{error}"))
    label = f"{width}x{height}"

    page.goto(CLIENT_URL, wait_until="networkidle")
    page.get_by_role("heading", name="万世战线", exact=True).wait_for()
    assert_no_document_overflow(page, f"{label} home")
    assert_within_viewport(page, [".app-header", ".hero-actions"], f"{label} home")

    page.goto(f"{CLIENT_URL}/collection", wait_until="networkidle")
    page.wait_for_selector(".card-grid .card-tile")
    assert page.locator(".card-grid .card-tile").count() == 48
    assert_no_document_overflow(page, f"{label} collection")
    assert_within_viewport(page, [".page-heading", ".collection-toolbar"], f"{label} collection")

    page.goto(f"{CLIENT_URL}/fronts", wait_until="networkidle")
    page.wait_for_selector(".front-grid .front-card")
    assert page.locator(".front-grid .front-card").count() == 72
    assert_images_loaded(page, ".front-grid .front-card img", 3)
    assert_no_document_overflow(page, f"{label} fronts")
    assert_within_viewport(page, [".page-heading", ".front-toolbar"], f"{label} fronts")

    page.goto(f"{CLIENT_URL}/play", wait_until="networkidle")
    page.get_by_role("button", name="开始演武", exact=True).click()
    page.wait_for_selector(".front-lane")
    assert page.locator(".front-lane").count() == 3
    assert page.locator(".front-lane.unrevealed .front-art").count() == 0
    assert_no_document_overflow(page, f"{label} battle")
    assert_within_viewport(
        page,
        [".battle-status", ".command-deck", ".command-actions"],
        f"{label} battle",
    )

    front_scroll = page.locator(".front-scroll")
    front_metrics = front_scroll.evaluate(
        "element => ({scrollWidth: element.scrollWidth, clientWidth: element.clientWidth})"
    )
    if width <= 768:
        assert front_metrics["scrollWidth"] > front_metrics["clientWidth"]
        front_scroll.evaluate("element => { element.scrollLeft = element.scrollWidth; }")
        assert page.locator(".front-lane").last.evaluate(
            "element => { const rect = element.getBoundingClientRect(); return rect.right > 0 && rect.left < innerWidth; }"
        )

    hand = page.locator(".hand-row")
    hand_metrics = hand.evaluate(
        "element => ({scrollWidth: element.scrollWidth, clientWidth: element.clientWidth})"
    )
    if hand_metrics["scrollWidth"] > hand_metrics["clientWidth"]:
        hand.evaluate("element => { element.scrollLeft = element.scrollWidth; }")
        assert page.locator(".hand-card-wrap").last.evaluate(
            "element => { const rect = element.getBoundingClientRect(); return rect.right > 0 && rect.left < innerWidth; }"
        )

    page.screenshot(path=ARTIFACTS / f"battle-{label}.png", animations="disabled")
    assert not errors, f"{label}: " + " | ".join(errors)
    context.close()


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    for viewport in VIEWPORTS:
        exercise_viewport(browser, *viewport)
    browser.close()
    print(f"Responsive acceptance screenshots: {ARTIFACTS}")
