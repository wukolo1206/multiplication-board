"""e2e.spec.py —— 六頁端到端測試

執行：python run-tests.py        （會自動起 http server）
或：  python -m http.server 8899 --bind 127.0.0.1
      python e2e.spec.py 8899

不能用 file:// 開 —— 頁面用 <script src> 載入 multiplication-core.js。
"""
import sys
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')

PORT = sys.argv[1] if len(sys.argv) > 1 else '8899'
BASE = 'http://127.0.0.1:%s/' % PORT

failed = []


def ck(cond, name):
    print(('  PASS ' if cond else '  FAIL ') + name)
    if not cond:
        failed.append(name)


def msg(pg, sel='#qMsg'):
    return pg.eval_on_selector(sel, 'e=>e.textContent')


def run(pg, errs):
    # ═════════ index ═════════
    print('== index.html')
    pg.goto(BASE + 'index.html'); pg.wait_for_load_state('networkidle')
    links = pg.eval_on_selector_all('a.card', 'e=>e.map(x=>x.getAttribute("href"))')
    ck(links == ['steps.html', 'array.html', 'carry.html', 'fix.html', 'parcel.html'],
       '五張卡片連到正確頁面')

    # ═════════ steps ═════════
    print('== steps.html')
    pg.goto(BASE + 'steps.html'); pg.wait_for_load_state('networkidle')
    ck(pg.evaluate('typeof MulCore') == 'object', 'core 模組已載入')

    ck(pg.eval_on_selector_all('.bill', 'e=>e.length') == 3, '起始是 3 張一千元')
    txt = pg.eval_on_selector('#billLabel', 'e=>e.textContent')
    ck('張一千元' in txt, '具體物層級寫「張一千元」')
    ck('萬元' not in txt, '沒有誤寫成「萬元」（U1 踩過的坑）')
    pg.click('#billBtn'); pg.wait_for_timeout(200)
    ck(pg.eval_on_selector_all('.bill', 'e=>e.length') == 6, '存兩個月變成 6 張一千元')
    ck('6000' in msg(pg, '#billMsg'), '結論出現 6000')

    pg.click('#four div[data-i="3"]'); pg.wait_for_timeout(120)
    ck('3 個 0' in msg(pg, '#fourMsg'), '3000×2 說明補 0 的個數')

    pg.click('#tabQz'); pg.wait_for_timeout(120)
    for _ in range(4):
        pg.click('#qNextStep'); pg.wait_for_timeout(80)
    m = msg(pg)
    ck('4278' in m, '1426×3 逐步揭示後得 4278')
    ck('在十位上方記 1' in m or '在十位上方記 1' in pg.content(), '位值敘述照課本原文（上方）')
    ck(pg.eval_on_selector('#qNextStep', 'e=>e.disabled') is True, '走完後下一步停用')

    pg.click('#tabCh'); pg.wait_for_timeout(120)
    opts = pg.eval_on_selector_all('#chOpts .opt', 'e=>e.map(x=>x.textContent)')
    ck(opts == ['甲', '甲、丙', '乙、丁', '甲、乙、丁'], '108-11 選項照考卷原題')
    pg.click('#chOpts .opt[data-i="2"]'); pg.click('#pCh .btn'); pg.wait_for_timeout(120)
    ck('答對' in msg(pg, '#chMsg'), '108-11 正解為「乙、丁」')

    # ═════════ array ═════════
    print('== array.html')
    pg.goto(BASE + 'array.html'); pg.wait_for_load_state('networkidle')
    ck(pg.evaluate('typeof MulCore') == 'object', 'core 模組已載入')
    ck('古氏積木' in pg.content(), '探索頁有實體積木提示卡')

    # 階段一：四塊全部點過才能往下
    ck(pg.eval_on_selector('#b0', 'e=>e.disabled') is True, '未看完四塊時不能進下一階段')
    for n in ['1', '2', '3', '4']:
        pg.click('#s0 .blk[data-b="%s"]' % n); pg.wait_for_timeout(60)
    ck(pg.eval_on_selector('#b0', 'e=>e.disabled') is False, '四塊都看過後才解鎖')
    ck('288' in msg(pg, '#m0'), '四塊加起來是 288')

    # 階段二：必須自己圈選＋自己算，不是看動畫
    pg.click('#b0'); pg.wait_for_timeout(150)
    pg.click('#rect1 .blk[data-b="3"]'); pg.click('#rect1 .blk[data-b="4"]'); pg.wait_for_timeout(120)
    ck('不是 24×2' in msg(pg, '#m1'), '圈錯兩塊會被擋下')
    pg.click('#rect1 .blk[data-b="3"]'); pg.click('#rect1 .blk[data-b="4"]')
    pg.click('#rect1 .blk[data-b="1"]'); pg.click('#rect1 .blk[data-b="2"]'); pg.wait_for_timeout(120)
    ck(pg.eval_on_selector('#sumrow', 'e=>e.style.display') == 'flex', '圈對兩塊才出現輸入框')
    pg.fill('#sumin', '48'); pg.click('#sumrow .btn'); pg.wait_for_timeout(200)
    ck('48' in msg(pg, '#m1'), '學生自己算出 8+40=48')

    # 第二組：圈 ③④ 算 24×10（startMerge(1) 會清空圈選，要重新圈）
    pg.wait_for_timeout(1600)
    ck(pg.eval_on_selector('#sumrow', 'e=>e.style.display') == 'none',
       '進到第二組時輸入框重置')
    pg.click('#rect1 .blk[data-b="3"]'); pg.click('#rect1 .blk[data-b="4"]')
    pg.wait_for_timeout(150)
    pg.fill('#sumin', '240'); pg.click('#sumrow .btn'); pg.wait_for_timeout(150)
    ck(pg.eval_on_selector('#b1', 'e=>e.disabled') is False, '兩組都算完才能進階段三')
    pg.click('#b1'); pg.wait_for_timeout(150)
    pg.click('#s2 .vrow[data-r="1"]'); pg.wait_for_timeout(120)
    hi = pg.eval_on_selector_all('#rect2 .blk.hi', 'e=>e.map(x=>x.dataset.b).sort()')
    ck(hi == ['3', '4'], '點 240 亮起 ③④ 兩塊（2:1 對應）')

    # 練習 L3：沒有圖也要答得出來
    pg.click('#tabQz'); pg.wait_for_timeout(120)
    for need in [['1', '2'], ['3', '4'], ['1', '2']]:
        for n in need:
            pg.click('#qBody .blk[data-b="%s"]' % n)
        pg.click('#qBtn'); pg.wait_for_timeout(150)
        pg.click('#qNext'); pg.wait_for_timeout(150)
    ck(pg.eval_on_selector_all('#qBody .rect', 'e=>e.length') == 0, 'L3 沒有方格圖')
    opts = pg.eval_on_selector_all('#qBody .opt', 'e=>e.map(x=>x.textContent)')
    ck(opts == ['28 × 7', '20 × 70', '28 × 70'], 'L3 反思題選項正確')
    pg.click('#qBody .opt[data-i="2"]'); pg.click('#qBtn'); pg.wait_for_timeout(150)
    ck('答對' in msg(pg), '196 代表 28×70')
    ck('古氏積木' in pg.eval_on_selector('#qWarn', 'e=>e.textContent'), '結尾要求回到實體積木')

    # ═════════ carry ═════════
    print('== carry.html')
    pg.goto(BASE + 'carry.html'); pg.wait_for_load_state('networkidle')
    ck(pg.evaluate('typeof MulCore') == 'object', 'core 模組已載入')
    note = pg.eval_on_selector('#pEx .note', 'e=>e.textContent')
    # 真正的要求是「三處出處都列出來」，不是某個字串不出現
    ck('課本 p21' in note and '上方' in note, '列出課本 p21 記在上方')
    ck('課本 p25' in note and '心裡' in note, '列出課本 p25 教師註記')
    ck('教師手冊' in note and '下方' in note, '列出教師手冊建議記在下方')
    ck(len(pg.eval_on_selector_all('.toggle button', 'e=>e')) == 2, '兩種寫法都可切換')
    ck(pg.eval_on_selector('#tgUp', 'e=>e.className').find('on') >= 0, '預設用課本 p21 的上方')

    pg.click('#tabQz'); pg.wait_for_timeout(120)
    # 1426×3 全部填對
    for i, w in enumerate(['8', '7', '2', '4']):
        pg.fill('#wr%d' % i, w)
    for i, c in enumerate(['1', '0', '1']):
        pg.fill('#cy%d' % i, c)
    pg.click('#qBtn'); pg.wait_for_timeout(150)
    ck('4278' in msg(pg), '1426×3 全對')

    # 漏進位要被精準診斷
    pg.reload(); pg.wait_for_load_state('networkidle')
    pg.click('#tabQz'); pg.wait_for_timeout(120)
    for i, w in enumerate(['8', '6', '2', '4']):     # 十位漏加進位 → 6
        pg.fill('#wr%d' % i, w)
    for i, c in enumerate(['1', '0', '1']):
        pg.fill('#cy%d' % i, c)
    pg.click('#qBtn'); pg.wait_for_timeout(150)
    m = msg(pg)
    ck('忘記把進位的數字加上去' in m, '漏進位被診斷出來，不是只說「答案錯」')
    ck('十位' in m, '指出是哪一位')

    # ═════════ fix ═════════
    print('== fix.html')
    pg.goto(BASE + 'fix.html'); pg.wait_for_load_state('networkidle')
    ck(pg.evaluate('typeof MulCore') == 'object', 'core 模組已載入')
    pg.click('#tabQz'); pg.wait_for_timeout(120)
    ck('21' in pg.eval_on_selector('#qVert', 'e=>e.textContent'), '第 1 關是 21×43')
    pg.click('#qOpts .opt[data-i="0"]'); pg.click('#qBtn'); pg.wait_for_timeout(150)
    ck('找對了' in msg(pg), '第 1 關：同位對應相乘')
    pg.fill('#qFixIn', '903'); pg.click('#qFix .btn'); pg.wait_for_timeout(150)
    ck('訂正正確' in msg(pg), '21×43 訂正為 903')

    # 跳到第 4 關（列式結構）
    for _ in range(2):
        pg.click('#qNext'); pg.wait_for_timeout(120)
        i = pg.evaluate('qi')
        ans = pg.evaluate('LV[qi].ans')
        pg.click('#qOpts .opt[data-i="%d"]' % ans); pg.click('#qBtn'); pg.wait_for_timeout(120)
        pg.fill('#qFixIn', str(pg.evaluate('LV[qi].fixAns'))); pg.click('#qFix .btn')
        pg.wait_for_timeout(120)
    pg.click('#qNext'); pg.wait_for_timeout(150)
    ck(pg.evaluate('LV[qi].structural') is True, '第 4 關標記為列式結構題')
    qtext = pg.eval_on_selector('#qText', 'e=>e.textContent')
    ck('每一步都算對了' in qtext, '第 4 關不問「第幾步算錯」')
    ck('第幾步' not in qtext, '第 4 關題幹不含「第幾步」')

    # ═════════ parcel ═════════
    print('== parcel.html')
    pg.goto(BASE + 'parcel.html'); pg.wait_for_load_state('networkidle')
    ck(pg.evaluate('typeof MulCore') == 'object', 'core 模組已載入')
    rates = pg.eval_on_selector_all('td.rate', 'e=>e.map(x=>x.textContent)')
    ck(rates == ['65', '60', '75', '70'], '費率表數值照課本 p19')

    pg.fill('#wIn', '8'); pg.fill('#bIn', '4')
    pg.click('.picker .btn'); pg.wait_for_timeout(150)
    m = msg(pg, '#exMsg')
    ck('75' in m and '300' in m, '8 公斤 4 箱 → 每箱 75 元，共 300 元')
    ck(pg.eval_on_selector('#r10', 'e=>e.className').find('hit') >= 0, '正確格子被標示')

    pg.fill('#wIn', '12'); pg.click('.picker .btn'); pg.wait_for_timeout(150)
    ck('超過 9 公斤' in msg(pg, '#exMsg'), '超出表格範圍會說明，不硬算')

    pg.click('#tabQz'); pg.wait_for_timeout(120)
    pg.fill('#s1', '65'); pg.fill('#s2', '260')      # 查表就錯
    pg.click('#pQz .btn'); pg.wait_for_timeout(150)
    ck('第 1 步查表就不對' in msg(pg), '查表錯會先擋下，不讓乘法蓋過去')
    pg.fill('#s1', '75'); pg.fill('#s2', '300')
    pg.click('#pQz .btn'); pg.wait_for_timeout(150)
    ck('答對' in msg(pg), '兩步驟都對')

    pg.click('#tabCh'); pg.wait_for_timeout(120)
    ck('超出本單元範圍' in pg.eval_on_selector('#pCh .warnbox', 'e=>e.textContent'),
       '109-13 標示超出範圍但保留')
    pg.click('#chOpts .opt[data-i="2"]'); pg.click('#pCh .btn'); pg.wait_for_timeout(150)
    ck('25080' in msg(pg, '#chMsg'), '複名數解析先化聚再乘')

    # ═════════ 全站 ═════════
    print('== 全站')
    ck(not errs, 'console 沒有錯誤' + ('：' + '；'.join(errs[:3]) if errs else ''))


def main():
    errs = []
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={'width': 1100, 'height': 900})
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
        try:
            run(pg, errs)
        finally:
            b.close()
    print()
    print('=' * 52)
    if failed:
        print('  失敗 %d 項：' % len(failed))
        for f in failed:
            print('   - ' + f)
    else:
        print('  端到端全部通過')
    print('=' * 52)
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main())
