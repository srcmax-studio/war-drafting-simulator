import os
import re
from pathlib import Path

from playwright.sync_api import sync_playwright


CLIENT_URL = os.environ.get("AEONFRONT_CLIENT_URL", "http://127.0.0.1:3100")
SERVER_URL = os.environ.get("AEONFRONT_SERVER_URL", "ws://127.0.0.1:3001")
AXE_SOURCE = (
    Path(__file__).resolve().parents[1] / "node_modules/axe-core/axe.min.js"
).read_text()
SETTINGS_SCRIPT = """
(() => {
  localStorage.setItem('aeonfront_settings_v2', JSON.stringify({
    serverUrl: 'ws://127.0.0.1:3001', playerName: '无障碍校验',
    reducedMotion: true, highContrast: false, animationSpeed: 'instant',
    effectsQuality: 'low', audio: { enabled: false, masterVolume: 0.8,
      musicVolume: 0.55, sfxVolume: 0.8, interfaceVolume: 0.65,
      muteWhenUnfocused: true }
  }));
})();
"""


def audit(page, name, failures):
    page.add_script_tag(content=AXE_SOURCE)
    results = page.evaluate(
        """async () => axe.run(document, {
          runOnly: { type: 'tag', values: [
            'wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa',
            'wcag22a', 'wcag22aa'
          ] },
          resultTypes: ['violations']
        })"""
    )
    for violation in results["violations"]:
        nodes = [
            {
                "target": node["target"],
                "summary": node.get("failureSummary", ""),
            }
            for node in violation["nodes"][:4]
        ]
        failures.append(
            {
                "page": name,
                "id": violation["id"],
                "impact": violation["impact"],
                "help": violation["help"],
                "nodes": nodes,
            }
        )


def wait_for_turn(page, turn):
    page.wait_for_function(
        "turn => document.querySelector('.turn-cluster strong')?.textContent?.includes(`${turn}/6`)",
        arg=turn,
    )


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1440, "height": 900})
    context.add_init_script(SETTINGS_SCRIPT)
    page = context.new_page()
    failures = []
    errors = []
    page.on(
        "console",
        lambda message: errors.append(f"console:{message.type}:{message.text}")
        if message.type == "error"
        else None,
    )
    page.on("pageerror", lambda error: errors.append(f"page:{error}"))

    routes = [
        ("home", "/", ".home-page"),
        ("play", "/play", ".play-page"),
        ("collection", "/collection", ".collection-toolbar"),
        ("fronts", "/fronts", ".fronts-page"),
        ("deck-builder", "/deck-builder", ".deck-page"),
        ("rules", "/rules", ".rules-page"),
        ("settings", "/settings", ".settings-page"),
        ("history", "/history", ".history-grid, .empty-state"),
        ("online", "/online", ".server-page"),
    ]
    for name, route, selector in routes:
        page.goto(f"{CLIENT_URL}{route}", wait_until="networkidle")
        page.wait_for_selector(selector)
        assert page.locator("html").get_attribute("lang") == "zh-CN"
        assert page.title() == "万世战线 Aeonfront"
        assert page.locator('meta[name="description"]').get_attribute("content")
        audit(page, name, failures)

    page.goto(f"{CLIENT_URL}/deck-builder", wait_until="networkidle")
    page.get_by_role("button", name="新建", exact=True).click()
    dialog = page.get_by_role("dialog", name="新建牌组")
    dialog.wait_for()
    page.wait_for_function(
        "element => element.contains(document.activeElement)",
        arg=dialog.element_handle(),
    )
    for _ in range(12):
        page.keyboard.press("Tab")
        assert dialog.evaluate("element => element.contains(document.activeElement)")
    page.keyboard.press("Escape")
    dialog.wait_for(state="detached")

    page.goto(f"{CLIENT_URL}/play", wait_until="networkidle")
    page.get_by_role("button", name="开始演武", exact=True).click()
    page.wait_for_selector(".front-lane")
    audit(page, "battle", failures)
    for turn in range(1, 7):
        page.get_by_role("button", name="锁定计划", exact=True).click()
        page.get_by_role("alertdialog", name="锁定本回合计划").get_by_role(
            "button", name="锁定", exact=True
        ).click()
        if turn < 6:
            wait_for_turn(page, turn + 1)
        else:
            page.wait_for_url(re.compile(r"/result/"))
    audit(page, "result", failures)
    page.get_by_role("link", name="完整回放", exact=True).click()
    page.wait_for_selector(".replay-controls")
    audit(page, "replay", failures)

    page.goto(f"{CLIENT_URL}/online", wait_until="networkidle")
    page.get_by_label("WebSocket 地址").fill(SERVER_URL)
    page.get_by_label("玩家昵称").fill("无障碍校验")
    page.get_by_role("button", name="连接并进入大厅", exact=True).click()
    page.wait_for_url(re.compile(r"/lobby$"))
    page.wait_for_selector(".lobby-command")
    audit(page, "lobby", failures)
    page.get_by_role("button", name="创建房间", exact=True).click()
    create_dialog = page.get_by_role("dialog", name="建立对战房间")
    create_dialog.get_by_label("房间名").fill("无障碍验收房")
    create_dialog.get_by_role("button", name="创建并进入", exact=True).click()
    page.wait_for_url(re.compile(r"/room/"))
    page.wait_for_selector(".room-page")
    audit(page, "room", failures)

    if failures:
        for failure in failures:
            print(failure)
    assert not failures, f"Accessibility violations: {len(failures)}"
    assert not errors, "Browser errors: " + " | ".join(errors)
    context.close()
    browser.close()
    print("Accessibility acceptance passed for 15 application states")
