import re
from pathlib import Path
from playwright.sync_api import sync_playwright

CLIENT_URL = "http://127.0.0.1:3100"
SERVER_URL = "ws://127.0.0.1:3001"
ARTIFACTS = Path(__file__).resolve().parents[2] / "artifacts"
ARTIFACTS.mkdir(exist_ok=True)


def attach_error_capture(page, errors):
    page.on("console", lambda message: errors.append(f"console:{message.type}:{message.text}") if message.type == "error" else None)
    page.on("pageerror", lambda error: errors.append(f"page:{error}"))


def create_custom_deck(page, name):
    page.goto(f"{CLIENT_URL}/deck-builder", wait_until="networkidle")
    page.get_by_role("button", name="新建").click()
    dialog = page.get_by_role("dialog", name="新建牌组")
    dialog.get_by_role("button", name="预设副本").click()
    dialog.get_by_label("名称").fill(name)
    dialog.get_by_role("button", name="创建").click()
    page.wait_for_function("() => document.querySelectorAll('[data-testid=selected-deck] li:not(.empty-slot)').length === 12")
    assert page.locator("[data-testid=selected-deck] li:not(.empty-slot)").count() == 12
    page.get_by_role("button", name="保存", exact=True).click()


def connect_online(page, player_name):
    page.goto(f"{CLIENT_URL}/online", wait_until="networkidle")
    page.get_by_label("WebSocket URL").fill(SERVER_URL)
    page.get_by_label("玩家名").fill(player_name)
    page.get_by_role("button", name="连接并准备").click()


def plan_one_affordable_card(page, energy):
    cards = page.locator(".hand-row .card-tile")
    fronts = page.locator(".front-brief:not([disabled])")
    for card_index in range(cards.count()):
        if int(cards.nth(card_index).locator(".card-cost").inner_text()) > energy:
            continue
        for front_index in range(fronts.count()):
            before = page.locator(".board-card.planned").count()
            cards.nth(card_index).click()
            fronts.nth(front_index).click()
            if page.locator(".board-card.planned").count() > before:
                return True
    return False


def wait_for_turn(page, turn):
    page.wait_for_function(
        "expected => document.querySelector('.battle-status')?.textContent.includes(`回合 ${expected}/6`)",
        arg=turn,
    )


def lock_both(first, second, turn):
    first.get_by_role("button", name=re.compile("锁定行动")).click()
    second.get_by_role("button", name=re.compile("锁定行动")).click()
    if turn < 6:
        wait_for_turn(first, turn + 1)
        wait_for_turn(second, turn + 1)
    else:
        first.wait_for_selector(".result-banner")
        second.wait_for_selector(".result-banner")


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    first_context = browser.new_context(viewport={"width": 1280, "height": 900})
    second_context = browser.new_context(viewport={"width": 1280, "height": 900})
    first = first_context.new_page()
    second = second_context.new_page()
    first_errors = []
    second_errors = []
    attach_error_capture(first, first_errors)
    attach_error_capture(second, second_errors)

    create_custom_deck(first, "联机甲队")
    create_custom_deck(second, "联机乙队")
    connect_online(first, "甲方")
    first.wait_for_selector(".room-preview")
    connect_online(second, "乙方")
    first.wait_for_url(re.compile(r"/game\?mode=online"))
    second.wait_for_url(re.compile(r"/game\?mode=online"))
    wait_for_turn(first, 1)
    wait_for_turn(second, 1)

    first_deployed = plan_one_affordable_card(first, 1)
    second_deployed = plan_one_affordable_card(second, 1)
    lock_both(first, second, 1)

    # Reloading reconstructs the connection from the persisted reconnect token.
    first.reload(wait_until="networkidle")
    first.wait_for_url(re.compile(r"/online$"))
    first.get_by_label("WebSocket URL").fill(SERVER_URL)
    first.get_by_label("玩家名").fill("甲方")
    first.get_by_role("button", name="连接并准备").click()
    first.wait_for_url(re.compile(r"/game\?mode=online"))
    wait_for_turn(first, 2)
    wait_for_turn(second, 2)

    first.get_by_role("button", name="举旗").click()
    first.wait_for_function("() => document.querySelector('.battle-status')?.textContent.includes('待生效')")
    for turn in range(2, 7):
        first_deployed = plan_one_affordable_card(first, turn) or first_deployed
        second_deployed = plan_one_affordable_card(second, turn) or second_deployed
        lock_both(first, second, turn)

    assert first_deployed and second_deployed, "Both custom decks should deploy at least one card"
    assert first.locator(".result-banner").is_visible()
    assert second.locator(".result-banner").is_visible()
    assert "联机甲队" in first.evaluate("localStorage.getItem('aeonfront_match_history_v2')")
    first.screenshot(path=ARTIFACTS / "online-result-first.png", full_page=True)
    second.screenshot(path=ARTIFACTS / "online-result-second.png", full_page=True)

    first.get_by_role("button", name="再来一局").click()
    second.get_by_role("button", name="再来一局").click()
    first.wait_for_selector(".result-banner", state="detached")
    second.wait_for_selector(".result-banner", state="detached")
    wait_for_turn(first, 1)
    wait_for_turn(second, 1)
    first.get_by_role("button", name="撤军").click()
    first.wait_for_selector(".result-banner")
    second.wait_for_selector(".result-banner")
    assert "撤军" in first.locator(".result-banner").inner_text()

    first.goto(f"{CLIENT_URL}/history", wait_until="networkidle")
    assert first.locator(".history-list button").count() == 2
    first.locator(".history-list button").first.click()
    assert first.locator(".replay-check.public").is_visible()
    assert "联机甲队" in first.locator(".history-detail").inner_text()
    first.screenshot(path=ARTIFACTS / "online-history.png", full_page=True)

    assert not first_errors, "First client errors: " + " | ".join(first_errors)
    assert not second_errors, "Second client errors: " + " | ".join(second_errors)
    first_context.close()
    second_context.close()
    browser.close()
    print(f"Online acceptance screenshots: {ARTIFACTS}")
