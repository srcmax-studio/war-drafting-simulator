import os
import re
import shutil
from pathlib import Path

from PIL import Image, ImageChops, ImageStat
from playwright.sync_api import sync_playwright


CLIENT_URL = os.environ.get("AEONFRONT_CLIENT_URL", "http://127.0.0.1:3100")
SERVER_URL = os.environ.get("AEONFRONT_SERVER_URL", "ws://127.0.0.1:3001")
UPDATE = os.environ.get("UPDATE_VISUAL_BASELINES") == "1"
PRACTICE_SEED = 20260717
ROOT = Path(__file__).resolve().parents[1]
BASELINES = ROOT / "tests" / "visual-baselines"
ACTUAL = ROOT.parent / "artifacts" / "visual"
BASELINES.mkdir(parents=True, exist_ok=True)
ACTUAL.mkdir(parents=True, exist_ok=True)

SETTINGS_SCRIPT = """
(() => {
  const settings = {
    serverUrl: 'ws://127.0.0.1:3001', playerName: '视觉校验', reducedMotion: true,
    highContrast: false, animationSpeed: 'instant', effectsQuality: 'low',
    audio: { enabled: false, masterVolume: 0.8, musicVolume: 0.55, sfxVolume: 0.8,
      interfaceVolume: 0.65, muteWhenUnfocused: true }
  };
  localStorage.setItem('aeonfront_settings_v2', JSON.stringify(settings));
})();
"""

STABLE_CSS = """
*, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; }
html { scroll-behavior: auto !important; }
"""


def context_for(browser, width=1440, height=900):
    context = browser.new_context(viewport={"width": width, "height": height}, device_scale_factor=1)
    context.add_init_script(SETTINGS_SCRIPT)
    return context


def capture(page, name):
    page.add_style_tag(content=STABLE_CSS)
    page.evaluate("document.fonts && document.fonts.ready")
    page.wait_for_timeout(100)
    actual = ACTUAL / f"{name}.png"
    baseline = BASELINES / f"{name}.png"
    page.screenshot(path=actual, animations="disabled")
    if UPDATE:
        shutil.copyfile(actual, baseline)
        return
    assert baseline.exists(), f"Missing visual baseline: {baseline}. Run with UPDATE_VISUAL_BASELINES=1 after review."
    expected_image = Image.open(baseline).convert("RGB")
    actual_image = Image.open(actual).convert("RGB")
    assert expected_image.size == actual_image.size, f"{name}: size changed from {expected_image.size} to {actual_image.size}"
    difference = ImageChops.difference(expected_image, actual_image)
    gray = difference.convert("L")
    histogram = gray.histogram()
    changed = sum(histogram[20:]) / max(1, expected_image.width * expected_image.height)
    mean_delta = sum(ImageStat.Stat(difference).mean) / 3
    if changed > 0.08 or mean_delta > 8:
        difference.save(ACTUAL / f"{name}-diff.png")
        raise AssertionError(f"{name}: visual delta changed={changed:.3%}, mean={mean_delta:.2f}")


def assert_page_ready(page):
    assert page.evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1")
    broken = page.locator("img").evaluate_all("images => images.filter(image => image.complete && image.naturalWidth === 0).map(image => image.src)")
    assert not broken, f"Broken images: {broken[:3]}"


def connect(page, name):
    page.goto(f"{CLIENT_URL}/online", wait_until="networkidle")
    page.get_by_label("WebSocket 地址").fill(SERVER_URL)
    page.get_by_label("玩家昵称").fill(name)
    page.get_by_role("button", name="连接并进入大厅", exact=True).click()
    page.wait_for_url(re.compile(r"/lobby$"))
    page.wait_for_selector(".lobby-command")


def plan_one(page):
    energy = int(page.locator(".orders strong").inner_text())
    cards = page.locator(".hand-row .card-tile")
    fronts = page.locator(".front-center:not([disabled])")
    for card_index in range(cards.count()):
        card = cards.nth(card_index)
        if int(card.locator(".card-cost").inner_text()) > energy:
            continue
        for front_index in range(fronts.count()):
            before = page.locator(".board-card.planned").count()
            card.click()
            fronts.nth(front_index).click()
            if page.locator(".board-card.planned").count() > before:
                return True
    return False


def lock_turn(page):
    page.get_by_role("button", name="锁定计划", exact=True).click()
    page.get_by_role("alertdialog", name="锁定本回合计划").get_by_role("button", name="锁定", exact=True).click()


def wait_for_turn(page, turn):
    page.wait_for_function("turn => document.querySelector('.turn-cluster strong')?.textContent?.includes(`${turn}/6`)", arg=turn)


def start_seeded_practice(page):
    page.evaluate(
        """seed => {
          window.__visualOriginalDateNow = Date.now;
          Date.now = () => seed;
        }""",
        PRACTICE_SEED,
    )
    try:
        page.get_by_role("button", name="开始演武", exact=True).click()
        page.wait_for_selector(".front-lane")
    finally:
        page.evaluate(
            """() => {
              Date.now = window.__visualOriginalDateNow;
              delete window.__visualOriginalDateNow;
            }"""
        )


def make_result_variants(page):
    page.evaluate("""
    () => {
      const key = 'aeonfront_match_history_v3';
      const history = JSON.parse(localStorage.getItem(key));
      const source = history[0];
      source.timestamp = 1784278400000;
      source.summary.startedAt = 1784278340000;
      source.summary.endedAt = 1784278400000;
      source.summary.durationMs = 60000;
      const opponent = source.summary.players.find(player => player.playerId !== source.playerId);
      const baseWinner = source.summary.winner || { reason: 'fronts', stake: 1, totals: {}, frontWins: {} };
      const victory = JSON.parse(JSON.stringify(source));
      victory.gameId = 'visual-victory';
      victory.summary.gameId = victory.gameId;
      victory.winner = { ...baseWinner, winnerId: source.playerId, reason: 'fronts' };
      victory.summary.winner = victory.winner;
      const defeat = JSON.parse(JSON.stringify(source));
      defeat.gameId = 'visual-defeat';
      defeat.summary.gameId = defeat.gameId;
      defeat.winner = { ...baseWinner, winnerId: opponent.playerId, reason: 'fronts' };
      defeat.summary.winner = defeat.winner;
      localStorage.setItem(key, JSON.stringify([victory, defeat]));
    }
    """)


def static_and_online_states(browser):
    first_context = context_for(browser)
    first = first_context.new_page()
    first.goto(CLIENT_URL, wait_until="networkidle")
    first.evaluate("localStorage.removeItem('aeonfront_match_history_v3')")
    first.reload(wait_until="networkidle")
    assert_page_ready(first)
    capture(first, "home-1440x900")

    first.goto(f"{CLIENT_URL}/online", wait_until="networkidle")
    assert_page_ready(first)
    capture(first, "server-browser-1440x900")
    connect(first, "视觉甲方")
    capture(first, "lobby-1440x900")

    first.get_by_role("button", name="创建房间", exact=True).click()
    create_dialog = first.get_by_role("dialog", name="建立对战房间")
    create_dialog.get_by_label("房间名").fill("视觉验收房")
    create_dialog.get_by_role("button", name="创建并进入", exact=True).click()
    first.wait_for_url(re.compile(r"/room/"))

    second_context = context_for(browser)
    second = second_context.new_page()
    connect(second, "视觉乙方")
    second.get_by_role("button", name="加入房间", exact=True).click()
    second.wait_for_url(re.compile(r"/room/"))
    first.wait_for_function("document.querySelectorAll('.player-slots article:not(.empty)').length === 2")
    first.locator(".room-chat time").evaluate_all("items => items.forEach(item => item.textContent = '00:00')")
    capture(first, "room-1440x900")
    second_context.close()
    first_context.close()


def catalog_and_battle_states(browser):
    context = context_for(browser)
    page = context.new_page()
    for route, selector, name in [
        ("/deck-builder", ".deck-page", "deck-builder-1440x900"),
        ("/collection", ".card-grid", "collection-1440x900"),
        ("/fronts", ".front-grid", "fronts-1440x900"),
    ]:
        page.goto(f"{CLIENT_URL}{route}", wait_until="networkidle")
        page.wait_for_selector(selector)
        assert_page_ready(page)
        capture(page, name)

    page.goto(f"{CLIENT_URL}/play", wait_until="networkidle")
    start_seeded_practice(page)
    capture(page, "battle-turn-1-1440x900")
    for turn in range(1, 3):
        plan_one(page)
        lock_turn(page)
        wait_for_turn(page, turn + 1)
    current_turn = 3
    while page.locator(".front-lane:not(.unrevealed)").count() < 3 and current_turn < 6:
        plan_one(page)
        lock_turn(page)
        current_turn += 1
        wait_for_turn(page, current_turn)
    assert page.locator(".front-lane:not(.unrevealed)").count() == 3
    capture(page, "battle-all-revealed-1440x900")
    for turn in range(current_turn, 6):
        plan_one(page)
        lock_turn(page)
        wait_for_turn(page, turn + 1)
    capture(page, "battle-final-turn-1440x900")
    plan_one(page)
    lock_turn(page)
    page.wait_for_url(re.compile(r"/result/"))
    make_result_variants(page)
    page.goto(f"{CLIENT_URL}/result/visual-victory", wait_until="networkidle")
    page.wait_for_selector(".result-page.victory")
    capture(page, "result-victory-1440x900")
    page.goto(f"{CLIENT_URL}/result/visual-defeat", wait_until="networkidle")
    page.wait_for_selector(".result-page.defeat")
    capture(page, "result-defeat-1440x900")
    context.close()


def mobile_battle_state(browser):
    context = context_for(browser, 390, 844)
    page = context.new_page()
    page.goto(f"{CLIENT_URL}/play", wait_until="networkidle")
    start_seeded_practice(page)
    assert_page_ready(page)
    assert page.locator(".front-scroll").evaluate("element => element.scrollWidth > element.clientWidth")
    capture(page, "battle-mobile-390x844")
    context.close()


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    static_and_online_states(browser)
    catalog_and_battle_states(browser)
    mobile_battle_state(browser)
    browser.close()
    action = "updated" if UPDATE else "matched"
    print(f"Visual baselines {action}: {BASELINES}")
