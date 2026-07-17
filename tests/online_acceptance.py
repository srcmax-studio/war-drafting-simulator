import os
import re
from pathlib import Path

from playwright.sync_api import sync_playwright


CLIENT_URL = os.environ.get("AEONFRONT_CLIENT_URL", "http://127.0.0.1:3100")
SERVER_URL = os.environ.get("AEONFRONT_SERVER_URL", "ws://127.0.0.1:3001")
ARTIFACTS = Path(__file__).resolve().parents[2] / "artifacts"
ARTIFACTS.mkdir(exist_ok=True)

SETTINGS_SCRIPT = """
(() => {
  const settings = {
    serverUrl: 'ws://127.0.0.1:3001', playerName: '', reducedMotion: true,
    highContrast: false, animationSpeed: 'instant', effectsQuality: 'low',
    audio: { enabled: false, masterVolume: 0.8, musicVolume: 0.55, sfxVolume: 0.8,
      interfaceVolume: 0.65, muteWhenUnfocused: true }
  };
  localStorage.setItem('aeonfront_settings_v2', JSON.stringify(settings));
})();
"""


def attach_error_capture(page, errors):
    page.on(
        "console",
        lambda message: errors.append(f"console:{message.type}:{message.text}")
        if message.type == "error"
        else None,
    )
    page.on("pageerror", lambda error: errors.append(f"page:{error}"))


def assert_no_document_overflow(page):
    assert page.evaluate(
        "document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1"
    )


def create_custom_deck(page, name):
    page.goto(f"{CLIENT_URL}/deck-builder", wait_until="networkidle")
    page.get_by_role("button", name="新建", exact=True).click()
    dialog = page.get_by_role("dialog", name="新建牌组")
    dialog.get_by_role("button", name="预设副本", exact=True).click()
    dialog.get_by_label("名称").fill(name)
    dialog.get_by_role("button", name="创建", exact=True).click()
    page.wait_for_function(
        "document.querySelectorAll('[data-testid=selected-deck] li:not(.empty-slot)').length === 12"
    )
    first_card = page.locator(
        "[data-testid=selected-deck] li:not(.empty-slot) strong"
    ).first.inner_text()
    page.get_by_role("button", name="设为默认", exact=True).click()
    page.get_by_role("button", name="保存", exact=True).click()
    page.wait_for_function("!document.querySelector('.unsaved-dot')")
    assert name in page.locator(".deck-inspector").inner_text()
    return first_card


def connect_online(page, player_name):
    page.goto(f"{CLIENT_URL}/online", wait_until="networkidle")
    page.get_by_label("WebSocket 地址").fill(SERVER_URL)
    page.get_by_label("玩家昵称").fill(player_name)
    page.get_by_role("button", name="连接并进入大厅", exact=True).click()
    page.wait_for_url(re.compile(r"/lobby$"))
    page.wait_for_selector(".lobby-command")
    assert page.locator(".presence-list").get_by_text(player_name, exact=True).is_visible()
    assert "/game" not in page.url


def reconnect_to_game(page, player_name, turn):
    page.reload(wait_until="networkidle")
    page.wait_for_url(re.compile(r"/online$"))
    page.get_by_label("WebSocket 地址").fill(SERVER_URL)
    page.get_by_label("玩家昵称").fill(player_name)
    page.get_by_role("button", name="连接并进入大厅", exact=True).click()
    page.wait_for_url(re.compile(r"/game\?mode=online"))
    page.wait_for_selector(".front-lane")
    wait_for_turn(page, turn)


def send_lobby_chat(page, message):
    page.get_by_placeholder("发送大厅消息").fill(message)
    page.locator(".chat-box form").get_by_role("button", name="发送").click()


def send_room_chat(page, message):
    page.get_by_placeholder("发送房间消息").fill(message)
    page.locator(".room-chat form").get_by_role("button", name="发送").click()


def choose_room_deck(page, deck_name, player_name):
    selector = page.locator(".ready-controls select")
    target_label = f"自定义 · {deck_name} · 12/12"
    selector.select_option(label=target_label)
    selector.dispatch_event("change")
    self_slot = page.locator(".player-slots article").filter(has_text=player_name)
    self_slot.get_by_text(deck_name, exact=True).wait_for()
    self_slot.get_by_text("等待准备", exact=True).wait_for()


def plan_one_affordable_card(page):
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


def wait_for_turn(page, turn):
    page.wait_for_function(
        "expected => document.querySelector('.turn-cluster strong')?.textContent?.includes(`${expected}/6`)",
        arg=turn,
    )


def lock_turn(page):
    page.get_by_role("button", name="锁定计划", exact=True).click()
    dialog = page.get_by_role("alertdialog", name="锁定本回合计划")
    dialog.get_by_role("button", name="锁定", exact=True).click()


def lock_both(first, second, turn):
    lock_turn(first)
    lock_turn(second)
    if turn < 6:
        wait_for_turn(first, turn + 1)
        wait_for_turn(second, turn + 1)
    else:
        first.wait_for_url(re.compile(r"/result/"))
        second.wait_for_url(re.compile(r"/result/"))


def return_to_lobby(page):
    page.get_by_role("button", name="返回大厅", exact=True).click()
    page.wait_for_url(re.compile(r"/lobby$"))
    page.wait_for_selector(".lobby-command")


def enter_matchmaking(page):
    page.get_by_text("开始匹配", exact=True).click()
    page.wait_for_url(re.compile(r"/matchmaking$"))
    page.get_by_role("button", name="加入匹配", exact=True).click()


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    first_context = browser.new_context(viewport={"width": 1280, "height": 900})
    second_context = browser.new_context(viewport={"width": 1280, "height": 900})
    first_context.add_init_script(SETTINGS_SCRIPT)
    second_context.add_init_script(SETTINGS_SCRIPT)
    first = first_context.new_page()
    second = second_context.new_page()
    first_errors = []
    second_errors = []
    attach_error_capture(first, first_errors)
    attach_error_capture(second, second_errors)

    first_card_name = create_custom_deck(first, "联机甲队")
    second_card_name = create_custom_deck(second, "联机乙队")
    connect_online(first, "联机甲方")
    connect_online(second, "联机乙方")
    assert_no_document_overflow(first)
    assert_no_document_overflow(second)

    send_lobby_chat(first, "大厅链路已就绪")
    second.get_by_text("大厅链路已就绪", exact=True).wait_for()
    send_lobby_chat(second, "双方通信正常")
    first.get_by_text("双方通信正常", exact=True).wait_for()

    first.get_by_role("button", name="创建房间", exact=True).click()
    create_dialog = first.get_by_role("dialog", name="建立对战房间")
    create_dialog.get_by_label("房间名").fill("联机验收房")
    create_dialog.get_by_role("button", name="创建并进入", exact=True).click()
    first.wait_for_url(re.compile(r"/room/"))
    first.wait_for_selector(".room-page")

    room_card = second.locator(".room-card").filter(has_text="联机验收房")
    room_card.get_by_role("button", name="加入房间", exact=True).click()
    second.wait_for_url(re.compile(r"/room/"))
    second.wait_for_selector(".room-page")
    first.wait_for_function(
        "document.querySelectorAll('.player-slots article:not(.empty)').length === 2"
    )
    assert first_card_name not in second.locator(".room-page").inner_text()
    assert second_card_name not in first.locator(".room-page").inner_text()

    first.wait_for_timeout(1_000)
    send_room_chat(first, "房间链路隔离正常")
    second.get_by_text("房间链路隔离正常", exact=True).wait_for()
    choose_room_deck(first, "联机甲队", "联机甲方")
    choose_room_deck(second, "联机乙队", "联机乙方")
    assert_no_document_overflow(first)
    first.screenshot(path=ARTIFACTS / "online-room.png", full_page=True)

    first.get_by_role("button", name="准备出战", exact=True).click()
    first.locator(".player-slots article").filter(has_text="联机甲方").get_by_text(
        "已准备", exact=True
    ).wait_for()
    first.get_by_role("button", name="取消准备", exact=True).click()
    first.locator(".player-slots article").filter(has_text="联机甲方").get_by_text(
        "等待准备", exact=True
    ).wait_for()
    first.get_by_role("button", name="准备出战", exact=True).click()
    second.get_by_role("button", name="准备出战", exact=True).click()

    first.wait_for_url(re.compile(r"/game\?mode=online"))
    second.wait_for_url(re.compile(r"/game\?mode=online"))
    first.wait_for_selector(".front-lane")
    second.wait_for_selector(".front-lane")
    wait_for_turn(first, 1)
    wait_for_turn(second, 1)
    assert first.locator(".front-lane").count() == 3
    assert first.locator(".front-lane.unrevealed .front-art").count() == 0
    assert second.locator(".front-lane.unrevealed .front-art").count() == 0

    first_deployed = plan_one_affordable_card(first)
    second_deployed = plan_one_affordable_card(second)
    lock_both(first, second, 1)

    reconnect_key = f"aeonfront_reconnect_{SERVER_URL}"
    assert first.evaluate("key => Boolean(localStorage.getItem(key))", reconnect_key)
    reconnect_to_game(first, "联机甲方", 2)
    first.get_by_role("button", name="举旗", exact=True).click()
    first.wait_for_function(
        "document.querySelector('.battle-status')?.textContent?.includes('待生效')"
    )

    for turn in range(2, 7):
        first_deployed = plan_one_affordable_card(first) or first_deployed
        second_deployed = plan_one_affordable_card(second) or second_deployed
        lock_both(first, second, turn)

    assert first_deployed and second_deployed
    first.wait_for_selector(".result-page")
    second.wait_for_selector(".result-page")
    assert first.locator(".result-fronts article").count() == 3
    first.get_by_role("button", name="统计", exact=True).click()
    assert first.locator(".stats-table > div").count() == 16
    first.get_by_role("button", name="关键人物与转折", exact=True).click()
    assert first.locator(".highlight-grid article").count() >= 1
    assert 1 <= first.locator(".turning-list li").count() <= 5
    first.get_by_role("button", name="时间轴", exact=True).click()
    assert first.locator(".timeline-view li").count() > 0
    first.screenshot(path=ARTIFACTS / "online-six-turn-result.png", full_page=True)

    first_history = first.evaluate(
        "localStorage.getItem('aeonfront_match_history_v3')"
    )
    reconnect_token = first.evaluate("key => localStorage.getItem(key)", reconnect_key)
    assert "联机甲队" in first_history
    assert SERVER_URL not in first_history
    assert reconnect_token not in first_history
    assert "reconnectToken" not in first_history

    first_result_url = first.url
    first.get_by_role("button", name="再来一局", exact=True).click()
    first.get_by_role("button", name="等待对手", exact=True).wait_for()
    second.get_by_role("button", name="再来一局", exact=True).click()
    first.wait_for_url(re.compile(r"/game\?mode=online"))
    second.wait_for_url(re.compile(r"/game\?mode=online"))
    wait_for_turn(first, 1)
    wait_for_turn(second, 1)
    first.get_by_role("button", name="撤军", exact=True).click()
    first.get_by_role("alertdialog", name="确认撤军").get_by_role(
        "button", name="撤军", exact=True
    ).click()
    first.wait_for_url(re.compile(r"/result/"))
    second.wait_for_url(re.compile(r"/result/"))
    assert first.url != first_result_url

    return_to_lobby(first)
    return_to_lobby(second)
    first.get_by_text("开始匹配", exact=True).wait_for()
    second.get_by_text("开始匹配", exact=True).wait_for()

    enter_matchmaking(first)
    first.get_by_role("heading", name="正在搜索对手", exact=True).wait_for()
    enter_matchmaking(second)
    first.get_by_role("heading", name="已找到对手", exact=True).wait_for()
    second.get_by_role("heading", name="已找到对手", exact=True).wait_for()
    first.screenshot(path=ARTIFACTS / "online-match-found.png", full_page=True)
    first.get_by_role("button", name="接受匹配", exact=True).click()
    first.get_by_text("已确认", exact=True).wait_for()
    second.get_by_role("button", name="接受匹配", exact=True).click()

    first.wait_for_url(re.compile(r"/game\?mode=online"))
    second.wait_for_url(re.compile(r"/game\?mode=online"))
    wait_for_turn(first, 1)
    wait_for_turn(second, 1)
    reconnect_to_game(first, "联机甲方", 1)
    assert "重连中" not in first.locator(".battle-status").inner_text()
    first.screenshot(path=ARTIFACTS / "online-reconnected-game.png", full_page=True)

    first.get_by_role("button", name="撤军", exact=True).click()
    first.get_by_role("alertdialog", name="确认撤军").get_by_role(
        "button", name="撤军", exact=True
    ).click()
    first.wait_for_url(re.compile(r"/result/"))
    second.wait_for_url(re.compile(r"/result/"))
    assert "我方撤军" in first.locator(".result-hero").inner_text()
    assert "对手撤军" in second.locator(".result-hero").inner_text()
    second.screenshot(path=ARTIFACTS / "online-withdrawal-result.png", full_page=True)

    return_to_lobby(first)
    return_to_lobby(second)
    first.goto(f"{CLIENT_URL}/history", wait_until="networkidle")
    assert first.locator(".history-grid article").count() == 3
    assert "联机甲队" in first.locator(".history-grid").inner_text()
    first.screenshot(path=ARTIFACTS / "online-history.png", full_page=True)

    assert not first_errors, "First client errors: " + " | ".join(first_errors)
    assert not second_errors, "Second client errors: " + " | ".join(second_errors)
    first_context.close()
    second_context.close()
    browser.close()
    print(f"Online acceptance screenshots: {ARTIFACTS}")
