import json
import os
import re
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE_URL = os.environ.get("AEONFRONT_CLIENT_URL", "http://127.0.0.1:3100")
ARTIFACTS = Path(__file__).resolve().parents[2] / "artifacts"
ARTIFACTS.mkdir(exist_ok=True)
EXPORTED_DECK = ARTIFACTS / "acceptance-deck.json"


def attach_error_capture(page, errors):
    page.on("console", lambda message: errors.append(f"console:{message.type}:{message.text}") if message.type == "error" else None)
    page.on("pageerror", lambda error: errors.append(f"page:{error}"))


def assert_images_loaded(page, selector, sample=8):
    images = page.locator(selector)
    assert images.count() > 0, f"No images matched {selector}"
    for index in range(min(sample, images.count())):
        image = images.nth(index)
        image.scroll_into_view_if_needed()
        page.wait_for_function("img => img.complete", arg=image.element_handle())
        assert image.evaluate("img => img.naturalWidth > 0"), f"Image {index} failed to load"


def plan_one_affordable_card(page, energy):
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


def assert_no_document_overflow(page):
    assert page.evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1")


def drag_between(page, source, target):
    target.scroll_into_view_if_needed()
    source.scroll_into_view_if_needed()
    source_box = source.bounding_box()
    target_box = target.bounding_box()
    assert source_box and target_box
    viewport = page.viewport_size
    assert viewport

    def visible_center(box):
        left = max(0, box["x"])
        right = min(viewport["width"], box["x"] + box["width"])
        top = max(0, box["y"])
        bottom = min(viewport["height"], box["y"] + box["height"])
        assert right > left and bottom > top
        return (left + right) / 2, (top + bottom) / 2

    start_x, start_y = visible_center(source_box)
    end_x, end_y = visible_center(target_box)
    page.mouse.move(end_x, end_y)
    page.mouse.move(start_x, start_y, steps=8)
    page.mouse.down()
    page.mouse.move(start_x + 10, start_y + 10, steps=4)
    page.mouse.move(end_x, end_y, steps=16)
    page.mouse.up()


def create_blank_deck(page):
    page.get_by_role("button", name="新建").click()
    dialog = page.get_by_role("dialog", name="新建牌组")
    dialog.get_by_label("名称").fill("验收远征")
    dialog.get_by_label("描述").fill("浏览器验收使用的十二将自定义牌组")
    dialog.get_by_text("创建后收藏").click()
    dialog.get_by_role("button", name="创建").click()
    page.wait_for_function("() => document.querySelectorAll('[data-testid=selected-deck] li.empty-slot').length === 12")


def fill_twelve_cards(page):
    cards = page.locator(".deck-card-grid .card-tile")
    assert cards.count() == 30
    drag_between(page, cards.nth(0), page.locator(".deck-workbench"))
    assert page.locator("[data-testid=selected-deck] li:not(.empty-slot)").count() == 1
    for index in range(1, 12):
        cards.nth(index).click()
    page.wait_for_function("() => document.querySelectorAll('[data-testid=selected-deck] li:not(.empty-slot)').length === 12")
    assert page.locator(".deck-card-grid .card-tile.selected").count() == 12


def exercise_history_controls(page):
    slots = page.locator("[data-testid=selected-deck] li:not(.empty-slot)")
    drag_between(page, slots.nth(0), page.locator(".catalog-pane"))
    assert page.locator("[data-testid=selected-deck] li:not(.empty-slot)").count() == 11
    page.get_by_role("button", name="撤销").click()
    assert page.locator("[data-testid=selected-deck] li:not(.empty-slot)").count() == 12
    first_name = slots.nth(0).locator("strong").inner_text()
    second_name = slots.nth(1).locator("strong").inner_text()
    drag_between(page, slots.nth(0), slots.nth(1))
    assert slots.nth(0).locator("strong").inner_text() == second_name
    assert slots.nth(1).locator("strong").inner_text() == first_name
    slots.nth(0).locator(".remove-card").click()
    assert page.locator("[data-testid=selected-deck] li:not(.empty-slot)").count() == 11
    page.get_by_role("button", name="撤销").click()
    assert page.locator("[data-testid=selected-deck] li:not(.empty-slot)").count() == 12
    page.get_by_role("button", name="重做").click()
    assert page.locator("[data-testid=selected-deck] li:not(.empty-slot)").count() == 11
    page.get_by_role("button", name="撤销").click()
    assert page.locator("[data-testid=selected-deck] li:not(.empty-slot)").count() == 12


def import_json_file(page):
    page.get_by_role("button", name="导入", exact=True).click()
    page.locator("input[type=file]").set_input_files(EXPORTED_DECK)
    page.wait_for_selector(".import-preview")
    preview = page.locator(".import-preview")
    assert "验收远征" in preview.inner_text()
    preview.get_by_role("button", name="保存到牌组库").click()
    page.wait_for_selector(".import-preview", state="detached")


def import_deck_code(page, code):
    page.get_by_role("button", name="导入", exact=True).click()
    dialog = page.get_by_role("dialog", name="导入牌组")
    dialog.get_by_role("button", name="牌组码", exact=True).click()
    dialog.locator(".import-text").fill(code)
    dialog.get_by_role("button", name="校验并预览").click()
    page.wait_for_selector(".import-preview")
    page.locator(".import-preview").get_by_role("button", name="保存到牌组库").click()
    page.wait_for_selector(".import-preview", state="detached")


def desktop_flow(browser):
    context = browser.new_context(
        viewport={"width": 1440, "height": 1000},
        device_scale_factor=1,
        permissions=["clipboard-read", "clipboard-write"],
        accept_downloads=True,
    )
    page = context.new_page()
    errors = []
    attach_error_capture(page, errors)
    page.add_init_script("""
      window.__audioPlayLog = [];
      HTMLMediaElement.prototype.play = function () {
        window.__audioPlayLog.push(this.currentSrc || this.src || 'unresolved');
        return Promise.resolve();
      };
    """)

    page.goto(BASE_URL, wait_until="networkidle")
    page.evaluate("localStorage.clear()")
    page.reload(wait_until="networkidle")
    assert page.get_by_role("heading", name="万世战线").is_visible()
    assert page.evaluate("window.__audioPlayLog.length") == 0, "Audio played before user interaction"
    assert_images_loaded(page, ".hero-fronts img", 3)
    assert_images_loaded(page, ".featured-cards img", 4)
    assert_no_document_overflow(page)
    page.screenshot(path=ARTIFACTS / "home-desktop.png", full_page=True)
    page.mouse.click(900, 300)
    page.wait_for_function("window.__audioPlayLog.length > 0")

    page.goto(f"{BASE_URL}/collection", wait_until="networkidle")
    page.wait_for_selector(".card-grid .card-tile")
    assert page.locator(".card-grid .card-tile").count() == 48
    assert_images_loaded(page, ".card-grid .card-art", 12)
    page.locator(".collection-toolbar select").nth(0).select_option("6")
    page.locator(".card-grid .card-tile").first.click()
    detail = page.locator(".card-detail")
    assert detail.is_visible()
    assert detail.locator(".ability-block").count() >= 2
    ability_names = detail.locator(".ability-block h2").all_inner_texts()
    assert all(re.fullmatch(r"[\u3400-\u9fff]{4}", name) for name in ability_names)
    detail_text = detail.inner_text()
    assert not re.search(r"\b[a-z]+_[a-z_]+\b", detail_text)
    for internal_label in ("Card ID", "优先级", "预计总值", "CORE-2-"):
        assert internal_label not in detail_text
    page.screenshot(path=ARTIFACTS / "card-detail-desktop.png", full_page=False)
    page.get_by_role("button", name="关闭").click()
    page.screenshot(path=ARTIFACTS / "collection-desktop.png", full_page=False)
    page.locator(".search-field input").fill("绝不存在的角色")
    assert page.get_by_text("没有符合条件的角色", exact=True).is_visible()
    page.get_by_role("button", name="重置筛选").click()
    page.wait_for_selector(".card-grid .card-tile")

    page.goto(f"{BASE_URL}/fronts", wait_until="networkidle")
    page.wait_for_selector(".front-grid .front-card")
    assert page.locator(".front-grid .front-card").count() == 72
    assert_images_loaded(page, ".front-grid .front-card img", 15)
    archive_text = page.locator(".front-grid").inner_text()
    for front_id in ("central-muster", "phoenix-gate", "migrating-crown"):
        assert front_id not in archive_text
    for internal_label in ("effectId", "规则编号", "最低客户端", "内容包", "FRONT ARCHIVE"):
        assert internal_label not in archive_text
    assert not re.search(r"[A-Za-z]", archive_text)
    assert not re.search(r"\b[a-z]+_[a-z_]+\b", archive_text)
    assert page.locator(".front-grid .complexity-chaotic").count() >= 8
    page.locator(".front-card").first.click()
    front_dialog = page.get_by_role("dialog")
    front_text = front_dialog.inner_text()
    assert "规则类别" in front_text and "出现频率" in front_text
    assert not re.search(r"\b[a-z]+(?:-[a-z]+)+\b", front_text)
    front_dialog.get_by_role("button", name="关闭").last.click()
    page.screenshot(path=ARTIFACTS / "fronts-desktop.png", full_page=False)

    page.goto(f"{BASE_URL}/deck-builder", wait_until="networkidle")
    create_blank_deck(page)
    fill_twelve_cards(page)
    exercise_history_controls(page)
    page.get_by_role("button", name="设为默认").click()
    page.get_by_role("button", name="保存", exact=True).click()
    page.wait_for_function("() => !document.querySelector('.unsaved-dot')")
    assert "验收远征" in page.locator(".deck-inspector").inner_text()
    assert "12/12" in page.locator(".deck-page").inner_text()
    assert page.locator(".analysis-panel .metric-grid").is_visible()

    with page.expect_download() as download_info:
        page.get_by_role("button", name="导出文件", exact=True).click()
    download_info.value.save_as(EXPORTED_DECK)
    exported = json.loads(EXPORTED_DECK.read_text())
    assert exported["name"] == "验收远征"
    assert len(exported["cardIds"]) == 12

    page.get_by_role("button", name="牌组码", exact=True).click()
    code = page.evaluate("navigator.clipboard.readText()")
    assert re.fullmatch(r"AFD1\.[A-Za-z0-9_-]+\.[0-9a-f]{8}", code)
    page.get_by_role("button", name="分享", exact=True).click()
    share_url = page.evaluate("navigator.clipboard.readText()")
    assert "/deck-builder?deck=AFD1." in share_url

    page.get_by_role("button", name="删除", exact=True).click()
    page.get_by_role("alertdialog").get_by_role("button", name="删除", exact=True).click()
    assert "验收远征" not in page.locator(".deck-inspector select").first.inner_text()
    import_json_file(page)
    assert "验收远征" in page.locator(".deck-inspector select").first.inner_text()
    import_deck_code(page, code)
    assert "验收远征 (2)" in page.locator(".deck-inspector select").first.inner_text()

    before_share = page.evaluate("JSON.parse(localStorage.getItem('aeonfront_decks_v2')).decks.length")
    page.goto(share_url, wait_until="networkidle")
    preview_dialog = page.get_by_role("dialog", name="牌组预览")
    assert preview_dialog.is_visible()
    assert "验收远征" in preview_dialog.inner_text()
    after_share = page.evaluate("JSON.parse(localStorage.getItem('aeonfront_decks_v2')).decks.length")
    assert after_share == before_share, "Share preview saved a deck without confirmation"
    preview_dialog.get_by_role("button", name="取消").click()

    page.get_by_role("button", name="新建").click()
    create_dialog = page.get_by_role("dialog", name="新建牌组")
    create_dialog.get_by_role("button", name="预设副本").click()
    assert create_dialog.locator("select option").count() == 6
    create_dialog.get_by_role("button", name="自定义副本").click()
    assert create_dialog.locator("select option").count() >= 2
    create_dialog.get_by_role("button", name="随机合法").click()
    create_dialog.get_by_label("名称").fill("随机验收")
    create_dialog.get_by_role("button", name="创建").click()
    assert page.locator("[data-testid=selected-deck] li:not(.empty-slot)").count() == 12
    page.get_by_role("button", name="保存", exact=True).click()
    page.screenshot(path=ARTIFACTS / "deck-builder-desktop.png", full_page=True)

    page.goto(f"{BASE_URL}/settings", wait_until="networkidle")
    page.get_by_role("switch", name="减少动画").click()
    music_slider = page.locator(".volume-control").filter(has_text="音乐").locator("input")
    music_slider.fill("0.25")
    music_slider.press("ArrowRight")
    music_slider.press("ArrowLeft")
    page.get_by_role("button", name="保存", exact=True).click()
    page.reload(wait_until="networkidle")
    assert page.get_by_role("switch", name="减少动画").get_attribute("aria-checked") == "true"
    stored_settings = page.evaluate("JSON.parse(localStorage.getItem('aeonfront_settings_v2'))")
    assert stored_settings["audio"]["musicVolume"] == 0.25

    page.goto(f"{BASE_URL}/play", wait_until="networkidle")
    start_button = page.get_by_role("button", name="开始演武", exact=True)
    assert start_button.is_enabled(), "Practice button is disabled"
    start_button.click()
    page.wait_for_selector(".front-lane")
    assert "/game?mode=practice" in page.url
    assert page.locator(".front-lane").count() == 3
    assert page.locator(".hand-row .card-tile").count() >= 4
    assert page.locator(".front-lane.unrevealed .front-art").count() == 0
    assert "名称、场景与效果保持隐藏" in page.locator(".front-lane.unrevealed").first.inner_text()
    page.get_by_role("button", name="举旗").click()
    assert "待生效" in page.locator(".battle-status").inner_text()
    planned_any = False
    page.screenshot(path=ARTIFACTS / "game-turn-one-desktop.png", full_page=True)

    for turn in range(1, 7):
        planned_any = plan_one_affordable_card(page, turn) or planned_any
        lock_turn(page)
        if turn < 6:
            wait_for_turn(page, turn + 1)
        else:
            page.wait_for_url(re.compile(r"/result/"))
    assert planned_any, "No legal card was deployed during the six-turn acceptance match"
    page.wait_for_selector(".result-page")
    assert page.locator(".result-fronts article").count() == 3
    assert_images_loaded(page, ".result-fronts > article > img", 3)
    result_url = page.url
    page.get_by_role("button", name="统计", exact=True).click()
    assert page.locator(".stats-table > div").count() == 16
    page.get_by_role("button", name="关键人物与转折", exact=True).click()
    assert page.locator(".highlight-grid article").count() >= 1
    assert 1 <= page.locator(".turning-list li").count() <= 5
    page.get_by_role("button", name="时间轴", exact=True).click()
    timeline_text = page.locator(".timeline-view").inner_text()
    assert not re.search(r"\b[a-z]+_[a-z_]+\b", timeline_text)
    assert page.locator(".timeline-view li").count() > 0
    page.screenshot(path=ARTIFACTS / "game-result-desktop.png", full_page=True)

    page.goto(result_url, wait_until="networkidle")
    page.get_by_role("link", name="完整回放", exact=True).click()
    page.wait_for_selector(".replay-controls")
    assert page.locator(".replay-fronts article").count() == 3
    page.get_by_role("button", name="下一个事件").click()
    page.get_by_role("button", name="播放", exact=True).click()
    page.wait_for_timeout(200)
    page.get_by_role("button", name="暂停", exact=True).click()
    page.screenshot(path=ARTIFACTS / "replay-desktop.png", full_page=True)

    page.goto(f"{BASE_URL}/history", wait_until="networkidle")
    assert page.locator(".history-grid article").count() == 1
    assert "随机验收" in page.locator(".history-grid").inner_text()
    page.screenshot(path=ARTIFACTS / "history-desktop.png", full_page=True)
    page.get_by_role("link", name="查看结算", exact=True).click()
    page.get_by_role("button", name="再来一局", exact=True).click()
    page.wait_for_selector(".front-lane")
    page.get_by_role("button", name="撤军", exact=True).click()
    page.get_by_role("alertdialog", name="确认撤军").get_by_role("button", name="撤军", exact=True).click()
    page.wait_for_url(re.compile(r"/result/"))
    assert "我方撤军" in page.locator(".result-hero").inner_text()

    assert not errors, "Browser errors: " + " | ".join(errors)
    context.close()


def mobile_flow(browser):
    context = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True)
    page = context.new_page()
    errors = []
    attach_error_capture(page, errors)

    page.goto(BASE_URL, wait_until="networkidle")
    assert page.get_by_role("heading", name="万世战线").is_visible()
    assert_no_document_overflow(page)
    page.screenshot(path=ARTIFACTS / "home-mobile.png", full_page=True)

    page.goto(f"{BASE_URL}/collection", wait_until="networkidle")
    page.wait_for_selector(".card-grid .card-tile")
    assert page.locator(".card-grid .card-tile").count() == 48
    assert page.locator(".card-copy").evaluate_all("els => els.every(el => el.scrollWidth <= el.clientWidth + 1)")
    assert_no_document_overflow(page)
    page.screenshot(path=ARTIFACTS / "collection-mobile.png", full_page=False)

    page.goto(f"{BASE_URL}/deck-builder", wait_until="networkidle")
    assert page.locator(".selected-deck").evaluate("el => el.scrollWidth > el.clientWidth")
    assert_no_document_overflow(page)
    page.screenshot(path=ARTIFACTS / "deck-builder-mobile.png", full_page=False)

    page.goto(f"{BASE_URL}/play", wait_until="networkidle")
    page.get_by_role("button", name="开始演武", exact=True).click()
    page.wait_for_selector(".front-lane")
    assert page.locator(".front-scroll").evaluate("el => el.scrollWidth > el.clientWidth")
    assert_no_document_overflow(page)
    page.screenshot(path=ARTIFACTS / "game-mobile.png", full_page=True)

    assert not errors, "Mobile browser errors: " + " | ".join(errors)
    context.close()


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    desktop_flow(browser)
    mobile_flow(browser)
    browser.close()
    print(f"Browser acceptance screenshots: {ARTIFACTS}")
